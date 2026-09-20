"""ResQGrid — LLM client with Groq primary, Gemini fallback, vision support, and metrics."""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import re
import time
from collections import OrderedDict
from io import BytesIO
from typing import Any, Dict, Optional, Tuple

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory LRU cache
# ---------------------------------------------------------------------------
_CACHE_MAX = 256
_cache: OrderedDict[str, dict] = OrderedDict()

# ---------------------------------------------------------------------------
# Circuit breaker state
# ---------------------------------------------------------------------------
_cb_failures = 0
_cb_open_until = 0.0
_CB_THRESHOLD = 5
_CB_COOLDOWN_S = 30.0

# ---------------------------------------------------------------------------
# Metrics & counters
# ---------------------------------------------------------------------------
_stats: Dict[str, Any] = {
    "groq_calls": 0,
    "groq_ok": 0,
    "groq_errors": 0,
    "gemini_calls": 0,
    "gemini_ok": 0,
    "gemini_errors": 0,
    "vision_calls": 0,
    "vision_ok": 0,
    "vision_errors": 0,
}


def stats() -> Dict[str, Any]:
    """Return runtime LLM counters."""
    return dict(_stats)


def _cache_get(key: str) -> Optional[dict]:
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    return None


def _cache_set(key: str, value: dict) -> None:
    _cache[key] = value
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


def _make_key(system: str, prompt: str) -> str:
    raw = system + "\x00" + prompt
    return hashlib.sha256(raw.encode()).hexdigest()


def _strip_fences(text: str) -> str:
    """Remove ```json ... ``` fences and whitespace."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json(text: str) -> Optional[dict]:
    """Try json.loads; fall back to extracting first {...} block."""
    text = _strip_fences(text)
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except (json.JSONDecodeError, TypeError):
        pass

    # Greedy scan for first balanced {}
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    obj = json.loads(text[start : i + 1])
                    if isinstance(obj, dict):
                        return obj
                except json.JSONDecodeError:
                    return None
    return None


# ---------------------------------------------------------------------------
# Provider: Groq
# ---------------------------------------------------------------------------

async def _groq_complete(prompt: str, system: str = "") -> Tuple[Optional[dict], float, Optional[str]]:
    """Call Groq OpenAI-compatible endpoint. Returns (dict, ms, error)."""
    if not settings.GROQ_API_KEY:
        return None, 0.0, "GROQ_API_KEY not configured"

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    body = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 768,
    }

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S) as client:
            resp = await client.post(url, headers=headers, json=body)
            ms = round((time.monotonic() - t0) * 1000, 1)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = _extract_json(content)
            if parsed is not None:
                return parsed, ms, None
            return None, ms, f"Non-JSON response: {content[:100]}"
    except Exception as exc:
        ms = round((time.monotonic() - t0) * 1000, 1)
        return None, ms, str(exc)


# ---------------------------------------------------------------------------
# Provider: Gemini
# ---------------------------------------------------------------------------

async def _gemini_complete(prompt: str, system: str = "") -> Tuple[Optional[dict], float, Optional[str]]:
    """Call Gemini generateContent endpoint. Returns (dict, ms, error)."""
    if not settings.GEMINI_API_KEY:
        return None, 0.0, "GEMINI_API_KEY not configured"

    model = settings.GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"

    parts = []
    if system:
        parts.append({"text": f"[SYSTEM]\n{system}\n[/SYSTEM]\n\n{prompt}"})
    else:
        parts.append({"text": prompt})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
            "maxOutputTokens": 768,
        },
    }

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S) as client:
            resp = await client.post(url, json=body)
            ms = round((time.monotonic() - t0) * 1000, 1)
            resp.raise_for_status()
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None, ms, "No candidates returned"
            content = candidates[0]["content"]["parts"][0]["text"]
            parsed = _extract_json(content)
            if parsed is not None:
                return parsed, ms, None
            return None, ms, f"Non-JSON response: {content[:100]}"
    except Exception as exc:
        ms = round((time.monotonic() - t0) * 1000, 1)
        return None, ms, str(exc)


# ---------------------------------------------------------------------------
# Text completion chain: Groq → Gemini → None
# ---------------------------------------------------------------------------

async def complete_json(
    prompt: str,
    system: str = "",
    cache_key: Optional[str] = None,
) -> Optional[dict]:
    """Send prompt to LLM and return parsed JSON dict, or None on failure.

    Chain: Groq → Gemini → None.
    Logs each invocation: 'AI provider=… model=… ms=… ok=…'.
    Updates stats(). Injects '_model' attribute on successful responses.
    """
    global _cb_failures, _cb_open_until

    now = time.monotonic()
    if _cb_open_until > now:
        logger.debug("LLM circuit breaker open; returning None")
        return None

    key = cache_key or _make_key(system, prompt)
    cached = _cache_get(key)
    if cached is not None:
        return dict(cached)

    if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
        return None

    # 1. Try Groq
    if settings.GROQ_API_KEY:
        _stats["groq_calls"] += 1
        res, ms, err = await _groq_complete(prompt, system)
        ok = res is not None
        logger.info("AI provider=groq model=%s ms=%.1f ok=%s%s",
                    settings.GROQ_MODEL, ms, ok, f" err={err}" if err else "")
        if ok:
            _stats["groq_ok"] += 1
            _cb_failures = 0
            res["_model"] = f"groq:{settings.GROQ_MODEL}"
            _cache_set(key, res)
            return dict(res)
        _stats["groq_errors"] += 1

    # 2. Try Gemini
    if settings.GEMINI_API_KEY:
        _stats["gemini_calls"] += 1
        res, ms, err = await _gemini_complete(prompt, system)
        ok = res is not None
        logger.info("AI provider=gemini model=%s ms=%.1f ok=%s%s",
                    settings.GEMINI_MODEL, ms, ok, f" err={err}" if err else "")
        if ok:
            _stats["gemini_ok"] += 1
            _cb_failures = 0
            res["_model"] = f"gemini:{settings.GEMINI_MODEL}"
            _cache_set(key, res)
            return dict(res)
        _stats["gemini_errors"] += 1

    # Failure
    _cb_failures += 1
    if _cb_failures >= _CB_THRESHOLD:
        _cb_open_until = now + _CB_COOLDOWN_S
        logger.warning("LLM circuit breaker opened after %d failures; retry in %.0fs",
                       _cb_failures, _CB_COOLDOWN_S)

    return None


# ---------------------------------------------------------------------------
# Vision completion: Gemini inline_data → Groq image_url fallback → None
# ---------------------------------------------------------------------------

async def complete_json_vision(
    prompt: str,
    image_bytes: bytes,
    mime: str = "image/jpeg",
) -> Optional[dict]:
    """Call vision model with image and prompt, return parsed strict JSON dict.

    Primary: Gemini generateContent with inline_data base64.
    Fallback: Groq vision model with data URL.
    """
    _stats["vision_calls"] += 1
    b64_data = base64.b64encode(image_bytes).decode("ascii")

    # 1. Try Gemini Vision (primary)
    if settings.GEMINI_API_KEY:
        model = settings.GEMINI_VISION_MODEL
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
        body = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime, "data": b64_data}},
                ]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
                "maxOutputTokens": 1024,
            },
        }

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S * 2) as client:
                resp = await client.post(url, json=body)
                ms = round((time.monotonic() - t0) * 1000, 1)
                resp.raise_for_status()
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = _extract_json(content)
                if parsed is not None:
                    _stats["vision_ok"] += 1
                    logger.info("AI provider=gemini model=%s ms=%.1f ok=True", model, ms)
                    parsed["_model"] = f"gemini:{model}"
                    return parsed
                logger.info("AI provider=gemini model=%s ms=%.1f ok=False err=non-json", model, ms)
        except Exception as exc:
            ms = round((time.monotonic() - t0) * 1000, 1)
            logger.info("AI provider=gemini model=%s ms=%.1f ok=False err=%s", model, ms, exc)

    # 2. Try Groq Vision (fallback)
    if settings.GROQ_API_KEY and settings.GROQ_VISION_MODEL:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        data_url = f"data:{mime};base64,{b64_data}"
        body = {
            "model": settings.GROQ_VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 1024,
        }

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S * 2) as client:
                resp = await client.post(url, headers=headers, json=body)
                ms = round((time.monotonic() - t0) * 1000, 1)
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = _extract_json(content)
                if parsed is not None:
                    _stats["vision_ok"] += 1
                    logger.info("AI provider=groq model=%s ms=%.1f ok=True", settings.GROQ_VISION_MODEL, ms)
                    parsed["_model"] = f"groq:{settings.GROQ_VISION_MODEL}"
                    return parsed
                logger.info("AI provider=groq model=%s ms=%.1f ok=False err=non-json", settings.GROQ_VISION_MODEL, ms)
        except Exception as exc:
            ms = round((time.monotonic() - t0) * 1000, 1)
            logger.info("AI provider=groq model=%s ms=%.1f ok=False err=%s", settings.GROQ_VISION_MODEL, ms, exc)

    _stats["vision_errors"] += 1
    return None


# ---------------------------------------------------------------------------
# Health check helper
# ---------------------------------------------------------------------------

import struct
import zlib


def _generate_tiny_png() -> bytes:
    """Generate minimal valid 64x64 PNG in memory without PIL dependency."""
    width, height, color = 64, 64, (255, 100, 50)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", zlib.crc32(b"IHDR" + ihdr_data) & 0xFFFFFFFF)
    ihdr = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc
    raw_row = b"\x00" + bytes(color) * width
    compressed = zlib.compress(raw_row * height)
    idat_crc = struct.pack(">I", zlib.crc32(b"IDAT" + compressed) & 0xFFFFFFFF)
    idat = struct.pack(">I", len(compressed)) + b"IDAT" + compressed + idat_crc
    iend_crc = struct.pack(">I", zlib.crc32(b"IEND") & 0xFFFFFFFF)
    iend = struct.pack(">I", 0) + b"IEND" + iend_crc
    return sig + ihdr + idat + iend


async def check_health(image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    """Execute live 1-token text probe to Groq & Gemini + tiny vision check."""
    report: Dict[str, Any] = {
        "groq": {"ok": False, "ms": 0.0, "model": settings.GROQ_MODEL},
        "gemini": {"ok": False, "ms": 0.0, "model": settings.GEMINI_MODEL},
        "vision": {"ok": False, "ms": 0.0, "model": settings.GEMINI_VISION_MODEL},
    }

    # 1. Groq 1-token probe
    if settings.GROQ_API_KEY:
        t0 = time.monotonic()
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
            body = {
                "model": settings.GROQ_MODEL,
                "messages": [{"role": "user", "content": "1"}],
                "max_tokens": 1,
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, headers=headers, json=body)
                ms = round((time.monotonic() - t0) * 1000, 1)
                if resp.status_code == 200:
                    report["groq"] = {"ok": True, "ms": ms, "model": settings.GROQ_MODEL}
                else:
                    report["groq"] = {"ok": False, "ms": ms, "model": settings.GROQ_MODEL, "error": f"HTTP {resp.status_code}"}
        except Exception as exc:
            ms = round((time.monotonic() - t0) * 1000, 1)
            report["groq"] = {"ok": False, "ms": ms, "model": settings.GROQ_MODEL, "error": str(exc)}
    else:
        report["groq"]["error"] = "No API key configured"

    # 2. Gemini 1-token probe
    if settings.GEMINI_API_KEY:
        t0 = time.monotonic()
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            body = {
                "contents": [{"parts": [{"text": "1"}]}],
                "generationConfig": {"maxOutputTokens": 1},
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, json=body)
                ms = round((time.monotonic() - t0) * 1000, 1)
                if resp.status_code == 200:
                    report["gemini"] = {"ok": True, "ms": ms, "model": settings.GEMINI_MODEL}
                else:
                    report["gemini"] = {"ok": False, "ms": ms, "model": settings.GEMINI_MODEL, "error": f"HTTP {resp.status_code}"}
        except Exception as exc:
            ms = round((time.monotonic() - t0) * 1000, 1)
            report["gemini"] = {"ok": False, "ms": ms, "model": settings.GEMINI_MODEL, "error": str(exc)}
    else:
        report["gemini"]["error"] = "No API key configured"

    # 3. Vision probe
    test_img = image_bytes or _generate_tiny_png()
    t0 = time.monotonic()
    try:
        vis_res = await complete_json_vision(
            prompt="Analyze this emergency image. Return JSON: {\"category\":\"not_emergency\",\"confidence\":0.9}",
            image_bytes=test_img,
            mime="image/png",
        )
        ms = round((time.monotonic() - t0) * 1000, 1)
        if vis_res:
            active_model = vis_res.get("_model", settings.GEMINI_VISION_MODEL)
            report["vision"] = {"ok": True, "ms": ms, "model": active_model}
        else:
            report["vision"] = {"ok": False, "ms": ms, "model": settings.GEMINI_VISION_MODEL, "error": "No response"}
    except Exception as exc:
        ms = round((time.monotonic() - t0) * 1000, 1)
        report["vision"] = {"ok": False, "ms": ms, "model": settings.GEMINI_VISION_MODEL, "error": str(exc)}

    return report
