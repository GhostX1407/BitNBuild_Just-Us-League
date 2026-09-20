"""ResQGrid — Public track endpoint (sanitised, no internal data)."""
from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.db.models import Assignment, Incident
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/track", tags=["track"])

# Assignment statuses that imply a unit is en-route or closer
_ACTIVE_ASGN_STATUSES = {"approved", "accepted", "en_route"}


def _iso(dt: Optional[datetime.datetime]) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


def _citizen_updates(incident: Incident) -> List[Dict[str, Any]]:
    """Generate citizen-friendly update messages from incident state."""
    updates: List[Dict[str, Any]] = []

    if incident.created_at:
        updates.append({"ts": _iso(incident.created_at), "text": "Report received"})

    if incident.triaged_at:
        updates.append({"ts": _iso(incident.triaged_at), "text": "Emergency assessed and classified"})

    if incident.first_assigned_at:
        updates.append({"ts": _iso(incident.first_assigned_at), "text": "Emergency services assigned"})

    if incident.first_arrival_at:
        updates.append({"ts": _iso(incident.first_arrival_at), "text": "Team arrived on scene"})

    if incident.status == "resolved":
        updates.append({"ts": _iso(incident.resolved_at or incident.first_arrival_at), "text": "Incident resolved"})
    elif incident.status == "closed":
        updates.append({"ts": _iso(incident.resolved_at), "text": "Incident closed"})

    # Sort chronologically
    updates.sort(key=lambda x: x["ts"])
    return updates


@router.get("/{track_id}")
async def track_incident(track_id: str) -> Dict[str, Any]:
    """Public sanitised status view for an incident.

    Returns:
        {code, type, status, area, eta_min, updates:[{ts, text}]}

    Never exposes: phone numbers, raw reports, reporter names,
    internal scores, or decision_log text.
    """
    async with SessionLocal() as session:
        result = await session.execute(
            select(Incident).where(Incident.track_id == track_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=404, detail="Track ID not found")

        # ETA from earliest active assignment
        asgn_result = await session.execute(
            select(Assignment)
            .where(Assignment.incident_id == incident.id)
            .where(Assignment.status.in_(list(_ACTIVE_ASGN_STATUSES)))
        )
        assignments = asgn_result.scalars().all()
        eta_min: Optional[float] = None
        if assignments:
            etas = [a.eta_min for a in assignments if a.eta_min is not None]
            if etas:
                eta_min = min(etas)

        return {
            "code": incident.code,
            "type": incident.type,
            "status": incident.status,
            "area": incident.area,
            "eta_min": eta_min,
            "updates": _citizen_updates(incident),
        }
