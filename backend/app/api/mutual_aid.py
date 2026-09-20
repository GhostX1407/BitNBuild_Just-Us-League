"""ResQGrid v2 — Mutual Aid requests API."""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import require_roles
from app.db.models import AuditEvent, MutualAid
from app.db.session import get_session

router = APIRouter(prefix="/mutual-aid", tags=["mutual-aid"], dependencies=[Depends(require_roles("dispatcher"))])


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


def _ser(m: MutualAid) -> Dict[str, Any]:
    return {
        "id": m.id,
        "incident_id": m.incident_id,
        "agency": m.agency,
        "resource_type": m.resource_type,
        "qty": m.qty,
        "status": m.status,
        "requested_by": m.requested_by,
        "decided_by": m.decided_by,
        "note": m.note,
        "created_at": _iso(m.created_at),
        "decided_at": _iso(m.decided_at),
    }


class MutualAidCreate(BaseModel):
    incident_id: Optional[str] = None
    agency: str
    resource_type: str
    qty: int = 1
    requested_by: Optional[str] = None
    note: Optional[str] = None


class MutualAidDecide(BaseModel):
    status: str  # approved|declined|arrived
    decided_by: Optional[str] = None
    note: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
async def list_mutual_aid(session: AsyncSession = Depends(get_session)) -> List[Dict[str, Any]]:
    res = await session.execute(select(MutualAid).order_by(MutualAid.created_at.desc()).limit(200))
    return [_ser(m) for m in res.scalars().all()]


@router.post("", response_model=Dict[str, Any])
async def request_mutual_aid(
    body: MutualAidCreate,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Submit a mutual-aid resource request to another agency."""
    m = MutualAid(
        incident_id=body.incident_id,
        agency=body.agency,
        resource_type=body.resource_type,
        qty=body.qty,
        requested_by=body.requested_by or "dispatcher",
        note=body.note,
    )
    session.add(m)
    audit = AuditEvent(
        actor=body.requested_by or "dispatcher",
        action="mutual_aid.requested",
        entity="mutual_aid",
        entity_id="pending",
        data={"agency": body.agency, "resource_type": body.resource_type, "qty": body.qty},
    )
    session.add(audit)
    await session.commit()
    await session.refresh(m)
    audit.entity_id = m.id
    await session.commit()

    try:
        from app.core.events import bus
        await bus.publish("mutual_aid.new", _ser(m))
    except Exception:
        pass

    return _ser(m)


@router.patch("/{aid_id}/decide", response_model=Dict[str, Any])
async def decide_mutual_aid(
    aid_id: str,
    body: MutualAidDecide,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Approve, decline, or mark arrived for a mutual-aid request."""
    valid = {"approved", "declined", "arrived"}
    if body.status not in valid:
        raise HTTPException(status_code=422, detail=f"status must be one of {valid}")

    m = await session.get(MutualAid, aid_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mutual aid request not found")

    m.status = body.status
    m.decided_by = body.decided_by or "dispatcher"
    m.decided_at = _now_utc()
    if body.note:
        m.note = body.note

    audit = AuditEvent(
        actor=body.decided_by or "dispatcher",
        action=f"mutual_aid.{body.status}",
        entity="mutual_aid",
        entity_id=aid_id,
        data={"status": body.status},
    )
    session.add(audit)
    await session.commit()
    await session.refresh(m)
    return _ser(m)
