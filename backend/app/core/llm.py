"""ResQGrid — LLM client with Groq primary, Gemini fallback, cache, circuit breaker."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from collections import OrderedDict
from typing import Optional

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
_CB_THRESHOLD = 3
_CB_COOLDOWN_S = 60.0


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
    """Remove ```json ... ``` fences."""
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
    except json.JSONDecodeError:
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


async def _groq(prompt: str, system: str) -> Optional[dict]:
    """Call Groq OpenAI-compatible endpoint."""
    if not settings.GROQ_API_KEY:
        return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.GROQ_MODEL,
        "messages": [
            *(
                [{"role": "system", "content": system}]
                if system
                else []
            ),
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 512,
    }
    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S) as client:
        resp = await client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _extract_json(content)


async def _gemini(prompt: str, system: str) -> Optional[dict]:
    """Call Gemini generateContent REST endpoint."""
    if not settings.GEMINI_API_KEY:
        return None
    model = settings.GEMINI_MODEL
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={settings.GEMINI_API_KEY}"
    )
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
            "maxOutputTokens": 512,
        },
    }
    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S) as client:
        resp = await client.post(url, json=body)
        resp.raise_for_status()
        data = resp.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return _extract_json(content)


async def complete_json(
    prompt: str,
    system: str = "",
    cache_key: Optional[str] = None,
) -> Optional[dict]:
    """
    Send prompt to LLM and return parsed JSON dict, or None on any failure.

    Order: Groq → Gemini → None.
    4-second overall timeout (enforced by asyncio.wait_for inside each call).
    In-memory LRU cache (256 entries).
    Circuit breaker: after 3 consecutive failures, returns None for 60 s.

    Args:
        prompt: User-facing instruction/data (treated as untrusted data; never
                logged in full).
        system: System instructions telling the model the input is structured
                data, not commands.
        cache_key: Optional explicit cache key; defaults to hash of system+prompt.

    Returns:
        Parsed dict, or None on missing key / timeout / HTTP error / non-JSON.
    """
    global _cb_failures, _cb_open_until

    # Circuit breaker check
    now = time.monotonic()
    if _cb_open_until > now:
        logger.debug("LLM circuit breaker open; returning None")
        return None

    key = cache_key or _make_key(system, prompt)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    # Neither Groq nor Gemini key configured → fallback immediately
    if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
        return None

    result: Optional[dict] = None
    try:
        result = await asyncio.wait_for(
            _groq(prompt, system), timeout=settings.LLM_TIMEOUT_S
        )
    except Exception as exc:
        logger.debug("Groq failed: %s", type(exc).__name__)

    if result is None:
        try:
            result = await asyncio.wait_for(
                _gemini(prompt, system), timeout=settings.LLM_TIMEOUT_S
            )
        except Exception as exc:
            logger.debug("Gemini failed: %s", type(exc).__name__)

    if result is None:
        _cb_failures += 1
        if _cb_failures >= _CB_THRESHOLD:
            _cb_open_until = now + _CB_COOLDOWN_S
            logger.warning(
                "LLM circuit breaker opened after %d consecutive failures; "
                "will retry at %.0f",
                _cb_failures,
                _cb_open_until,
            )
    else:
        _cb_failures = 0
        _cache_set(key, result)

    return result
