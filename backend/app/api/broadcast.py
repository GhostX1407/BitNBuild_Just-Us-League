"""ResQGrid v2 — Broadcast (public-safety alerts) API."""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import require_roles
from app.db.models import Broadcast
from app.db.session import get_session

router = APIRouter(prefix="/broadcasts", tags=["broadcasts"])


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


def _ser(b: Broadcast) -> Dict[str, Any]:
    return {
        "id": b.id,
        "title": b.title,
        "body": b.body,
        "body_hi": b.body_hi,
        "body_gu": b.body_gu,
        "severity": b.severity,
        "area": b.area,
        "active": b.active,
        "created_by": b.created_by,
        "created_at": _iso(b.created_at),
        "expires_at": _iso(b.expires_at),
    }


class BroadcastCreate(BaseModel):
    title: str
    body: str
    severity: str = "info"  # info|warning|critical
    area: Optional[str] = None
    created_by: Optional[str] = None
    expires_minutes: Optional[int] = None


class BroadcastTranslateBody(BaseModel):
    broadcast_id: str


@router.get("", response_model=List[Dict[str, Any]])
async def list_broadcasts(
    active_only: bool = Query(True),
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """List broadcasts (active by default)."""
    stmt = select(Broadcast).order_by(Broadcast.created_at.desc()).limit(100)
    if active_only:
        now = _now_utc()
        stmt = stmt.where(Broadcast.active == True)  # noqa: E712
    res = await session.execute(stmt)
    return [_ser(b) for b in res.scalars().all()]


@router.post("", dependencies=[Depends(require_roles("dispatcher"))], response_model=Dict[str, Any])
async def create_broadcast(
    body: BroadcastCreate,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Create and publish a public-safety broadcast. AI translates to Hindi + Gujarati."""
    expires_at = None
    if body.expires_minutes:
        expires_at = _now_utc() + datetime.timedelta(minutes=body.expires_minutes)

    # Try AI translation
    body_hi: Optional[str] = None
    body_gu: Optional[str] = None
    try:
        from app.core.llm import complete_json
        tl_result = await complete_json(
            prompt=f"Translate this emergency broadcast to Hindi and Gujarati.\nBroadcast: {body.body}\nReturn JSON: {{\"hi\": \"<hindi>\", \"gu\": \"<gujarati>\"}}",
            system="You are an emergency alert translation assistant. Translate accurately and concisely.",
        )
        if tl_result:
            body_hi = tl_result.get("hi")
            body_gu = tl_result.get("gu")
    except Exception:
        pass

    bc = Broadcast(
        title=body.title,
        body=body.body,
        body_hi=body_hi,
        body_gu=body_gu,
        severity=body.severity,
        area=body.area,
        created_by=body.created_by or "dispatcher",
        expires_at=expires_at,
    )
    session.add(bc)
    await session.commit()
    await session.refresh(bc)

    # Publish to WS
    try:
        from app.core.events import bus
        await bus.publish("broadcast.new", _ser(bc))
    except Exception:
        pass

    return _ser(bc)


@router.patch("/{broadcast_id}/deactivate", dependencies=[Depends(require_roles("dispatcher"))], response_model=Dict[str, Any])
async def deactivate_broadcast(
    broadcast_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Deactivate (expire) a broadcast."""
    bc = await session.get(Broadcast, broadcast_id)
    if not bc:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    bc.active = False
    await session.commit()
    await session.refresh(bc)
    return _ser(bc)
