"""ResQGrid — Alerts & Escalation Management API Router.

Mounted under /api by main.py auto-discovery.
"""
from __future__ import annotations

import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import bus
from app.db.models import Alert, AuditEvent, Incident
from app.db.session import get_session
from app.schemas.alert import AlertAckRequest, AlertEscalateRequest, AlertOut
from app.services.sla import _serialize_alert

router = APIRouter(tags=["alerts"])


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


@router.get("/alerts", response_model=List[AlertOut])
async def list_alerts(
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> List[AlertOut]:
    """List alerts with optional status filter (open, ack, resolved)."""
    query = select(Alert).order_by(Alert.created_at.desc())
    if status:
        query = query.where(Alert.status == status)
    res = await session.execute(query)
    alerts = res.scalars().all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.post("/alerts/{alert_id}/ack", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: str,
    req: AlertAckRequest,
    session: AsyncSession = Depends(get_session),
) -> AlertOut:
    """Acknowledge an alert to stop automated escalation."""
    alert = await session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = _now_utc()
    alert.status = "ack"
    alert.ack_by = req.ack_by or "dispatcher"
    alert.ack_at = now

    audit = AuditEvent(
        id=str(uuid4()),
        actor=req.ack_by or "dispatcher",
        action="alert.ack",
        entity="alert",
        entity_id=alert_id,
        data={"incident_id": alert.incident_id, "rule": alert.rule},
        ts=now,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(alert)

    alert_dict = _serialize_alert(alert)
    await bus.publish("alert.ack", alert_dict)

    return AlertOut.model_validate(alert)


@router.post("/alerts/{alert_id}/escalate", response_model=AlertOut)
async def escalate_alert(
    alert_id: str,
    req: AlertEscalateRequest,
    session: AsyncSession = Depends(get_session),
) -> AlertOut:
    """Manually escalate an alert to the next escalation tier (up to L3)."""
    alert = await session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = _now_utc()
    new_level = min(3, alert.level + 1)
    alert.level = new_level

    if alert.incident_id:
        incident = await session.get(Incident, alert.incident_id)
        if incident:
            incident.escalation_level = max(incident.escalation_level, new_level)
            incident.escalated = True

    audit = AuditEvent(
        id=str(uuid4()),
        actor="dispatcher",
        action="alert.escalated_manually",
        entity="alert",
        entity_id=alert_id,
        data={"new_level": new_level, "reason": req.reason},
        ts=now,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(alert)

    alert_dict = _serialize_alert(alert)
    await bus.publish("alert.new", alert_dict)

    try:
        from app.services.notify import route as notify_route
        await notify_route("alert.escalation", alert.incident_id, {
            "message": alert.message,
            "level": new_level,
            "reason": req.reason,
        })
    except Exception:
        pass

    return AlertOut.model_validate(alert)
