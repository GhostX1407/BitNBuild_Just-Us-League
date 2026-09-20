"""ResQGrid — Incidents CRUD API."""
from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.roles import require_roles
from app.db.models import Alert, AuditEvent, Incident, Notification, Report
from app.db.session import get_session
from app.schemas.incident import (
    IncidentDetail,
    IncidentOut,
    IncidentPatch,
    MergeBody,
    SplitBody,
)
from app.services.pipeline import publish_incident, serialize_incident
from app.services.priority import compute_priority

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/incidents", tags=["incidents"])

VALID_STATUSES = {
    "new", "triaged", "dispatched", "en_route",
    "on_scene", "contained", "resolved", "closed",
}
VALID_TYPES = {
    "fire", "flood", "road_accident", "medical",
    "industrial_hazard", "building_collapse", "gas_leak", "other",
}


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


def _audit(
    session, actor: str, action: str, entity: str, entity_id: str, data: Any
) -> AuditEvent:
    row = AuditEvent(actor=actor, action=action, entity=entity, entity_id=entity_id, data=data)
    session.add(row)
    return row


# ---------------------------------------------------------------------------
# List incidents
# ---------------------------------------------------------------------------

@router.get("", dependencies=[Depends(require_roles("dispatcher"))])
async def list_incidents(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    include_historic: bool = Query(False),
    limit: int = Query(200, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """List incidents with optional filters, sorted by priority then age."""
    stmt = select(Incident)
    if not include_historic:
        stmt = stmt.where(Incident.is_historic == False)  # noqa: E712
    if status:
        stmt = stmt.where(Incident.status == status)
    if type:
        stmt = stmt.where(Incident.type == type)
    if priority:
        stmt = stmt.where(Incident.priority == priority)
    if area:
        stmt = stmt.where(Incident.area == area)

    result = await session.execute(stmt.limit(limit))
    incidents = result.scalars().all()

    # Sort by priority (P1 first) then by created_at asc
    priority_order = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}
    incidents = sorted(
        incidents,
        key=lambda i: (priority_order.get(i.priority, 9), i.created_at),
    )

    # Filter by source if requested (check sources JSON list)
    if source:
        incidents = [i for i in incidents if source in (i.sources or [])]

    out = []
    for inc in incidents:
        out.append(await serialize_incident(session, inc))
    return out


# ---------------------------------------------------------------------------
# Incident detail
# ---------------------------------------------------------------------------

@router.get("/{incident_id}", dependencies=[Depends(require_roles("dispatcher", "team", "hospital"))])
async def get_incident(
    incident_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Full incident detail including reports, related incidents, alerts, notifications."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    base = await serialize_incident(session, incident)

    # Reports (newest first)
    rep_result = await session.execute(
        select(Report)
        .where(Report.incident_id == incident_id)
        .order_by(Report.created_at.desc())
    )
    reports = rep_result.scalars().all()
    base["reports"] = [
        {
            "id": r.id,
            "source": r.source,
            "text": r.text,
            "lat": r.lat,
            "lng": r.lng,
            "location_text": r.location_text,
            "reliability": r.reliability,
            "created_at": _iso(r.created_at),
            "incident_id": r.incident_id,
            "classification": r.classification,
            "photo_url": getattr(r, "photo_url", None),
            "verification": getattr(r, "verification", None),
            "language": getattr(r, "language", None),
            "translated_text": getattr(r, "translated_text", None),
        }
        for r in reports
    ]

    # Related — from latest dedupe entry in decision_log
    related: List[Dict] = []
    for entry in reversed(incident.decision_log or []):
        if entry.get("stage") == "dedupe" and entry.get("related"):
            related = entry["related"]
            break
    base["related"] = related

    # Alerts
    alert_result = await session.execute(
        select(Alert).where(Alert.incident_id == incident_id)
        .order_by(Alert.created_at.desc())
    )
    alerts = alert_result.scalars().all()
    base["alerts"] = [
        {
            "id": a.id,
            "incident_id": a.incident_id,
            "kind": a.kind,
            "rule": a.rule,
            "level": a.level,
            "message": a.message,
            "status": a.status,
            "created_at": _iso(a.created_at),
            "ack_at": _iso(a.ack_at),
        }
        for a in alerts
    ]

    # Notifications
    notif_result = await session.execute(
        select(Notification).where(Notification.incident_id == incident_id)
        .order_by(Notification.created_at.desc())
    )
    notifs = notif_result.scalars().all()
    base["notifications"] = [
        {
            "id": n.id,
            "event": n.event,
            "recipient": n.recipient,
            "role": n.role,
            "channel": n.channel,
            "subject": n.subject,
            "body": n.body,
            "status": n.status,
            "incident_id": n.incident_id,
            "created_at": _iso(n.created_at),
        }
        for n in notifs
    ]

    return base


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------

@router.post("/{incident_id}/merge", dependencies=[Depends(require_roles("dispatcher"))])
async def merge_incidents(
    incident_id: str,
    body: MergeBody,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Move all reports from other_id into incident_id; close the other."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Target incident not found")
    other = await session.get(Incident, body.other_id)
    if not other:
        raise HTTPException(status_code=404, detail="Source incident not found")
    if incident.id == other.id:
        raise HTTPException(status_code=400, detail="Cannot merge incident with itself")

    # Move reports
    rep_result = await session.execute(
        select(Report).where(Report.incident_id == other.id)
    )
    other_reports = rep_result.scalars().all()
    for r in other_reports:
        r.incident_id = incident.id

    # Recompute incident
    incident.report_count = (incident.report_count or 0) + (other.report_count or 0)
    incident.sources = list(set(list(incident.sources or []) + list(other.sources or [])))
    incident.severity = max(incident.severity, other.severity)
    incident.people_affected = max(incident.people_affected, other.people_affected)
    incident.hazards = list(set(list(incident.hazards or []) + list(other.hazards or [])))
    incident.confidence = min(0.99, incident.confidence + 0.05)

    new_priority, sla_base = compute_priority(
        incident.severity, incident.people_affected,
        incident.hazards, incident.report_count, incident.sources
    )
    incident.priority = new_priority

    now = _now_utc()
    incident.decision_log = [*(incident.decision_log or []), {
        "ts": now.isoformat(),
        "stage": "merge",
        "reason": f"Manual merge: absorbed {other.code}",
        "absorbed_incident": other.code,
    }]

    # Close the other incident
    other.status = "closed"
    other.decision_log = [*(other.decision_log or []), {
        "ts": now.isoformat(),
        "stage": "merge",
        "reason": f"Merged into {incident.code}",
    }]

    _audit(session, "dispatcher", "incidents.merged", "incident", incident.id, {
        "absorbed": other.id, "absorbed_code": other.code,
    })
    await session.commit()

    await publish_incident(incident.id)
    await publish_incident(other.id)
    return await _get_fresh(incident.id)


# ---------------------------------------------------------------------------
# Split
# ---------------------------------------------------------------------------

@router.post("/{incident_id}/split", dependencies=[Depends(require_roles("dispatcher"))])
async def split_incident(
    incident_id: str,
    body: SplitBody,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Create a new incident from a specific report; recompute both."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    report = await session.get(Report, body.report_id)
    if not report or report.incident_id != incident_id:
        raise HTTPException(status_code=404, detail="Report not found in this incident")

    # Create new incident from the report
    from app.services.pipeline import _get_next_incident_code, _random_track_id
    from app.services.pipeline import _build_title
    clf = report.classification or {}
    sev = clf.get("severity", 2)
    people = (clf.get("extracted") or {}).get("people_affected", 0)
    hazards = (clf.get("extracted") or {}).get("hazards", [])
    src = [report.source]
    new_priority, sla_base = compute_priority(sev, people, hazards, 1, src)

    now = _now_utc()
    async with session.begin_nested():
        code = await _get_next_incident_code(session)
        new_inc = Incident(
            code=code,
            type=clf.get("type", incident.type),
            title=_build_title(clf.get("type", incident.type), incident.area, sev),
            summary=f"Split from {incident.code}",
            severity=sev,
            priority=new_priority,
            confidence=report.reliability or 0.5,
            status="triaged",
            lat=report.lat,
            lng=report.lng,
            area=incident.area,
            people_affected=people,
            hazards=hazards,
            report_count=1,
            sources=[report.source],
            triaged_at=now,
            sla_due_at=now + datetime.timedelta(minutes=sla_base * settings.SLA_TIME_SCALE),
            track_id=_random_track_id(),
            decision_log=[{
                "ts": now.isoformat(),
                "stage": "create",
                "reason": f"Split from {incident.code}",
            }],
        )
        session.add(new_inc)
        await session.flush()

        report.incident_id = new_inc.id
        incident.report_count = max(1, (incident.report_count or 1) - 1)
        incident.decision_log = [*(incident.decision_log or []), {
            "ts": now.isoformat(),
            "stage": "split",
            "reason": f"Report {report.id} split into {new_inc.code}",
        }]

        _audit(session, "dispatcher", "incident.split", "incident", incident.id, {
            "new_incident": new_inc.id, "new_code": new_inc.code, "report_id": report.id,
        })

    await session.commit()
    await publish_incident(incident.id)
    await publish_incident(new_inc.id)
    return {"original": await _get_fresh(incident.id), "new": await _get_fresh(new_inc.id)}


# ---------------------------------------------------------------------------
# PATCH (override)
# ---------------------------------------------------------------------------

@router.patch("/{incident_id}", dependencies=[Depends(require_roles("dispatcher"))])
async def patch_incident(
    incident_id: str,
    body: IncidentPatch,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Human override of severity, type, status, or escalated flag."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if body.type is not None and body.type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid type: {body.type}")
    if body.status is not None and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status: {body.status}")
    if body.severity is not None and not (1 <= body.severity <= 5):
        raise HTTPException(status_code=422, detail="Severity must be 1-5")

    changes: Dict[str, Any] = {}
    now = _now_utc()

    if body.severity is not None:
        changes["severity"] = (incident.severity, body.severity)
        incident.severity = body.severity
    if body.type is not None:
        changes["type"] = (incident.type, body.type)
        incident.type = body.type
    if body.status is not None:
        changes["status"] = (incident.status, body.status)
        incident.status = body.status
        if body.status == "resolved" and incident.resolved_at is None:
            incident.resolved_at = now
    if body.escalated is not None:
        changes["escalated"] = (incident.escalated, body.escalated)
        incident.escalated = body.escalated
    if body.verified is not None:
        new_vstatus = "verified" if body.verified else "needs_verification"
        changes["verification_status"] = (getattr(incident, "verification_status", "needs_verification"), new_vstatus)
        incident.verification_status = new_vstatus

    # Re-run priority
    new_priority, _ = compute_priority(
        incident.severity, incident.people_affected,
        incident.hazards, incident.report_count, incident.sources,
    )
    incident.priority = new_priority

    incident.decision_log = [*(incident.decision_log or []), {
        "ts": now.isoformat(),
        "stage": "override",
        "actor": "dispatcher",
        "changes": changes,
        "new_priority": new_priority,
    }]

    _audit(session, "dispatcher", "incident.overridden", "incident", incident.id, {
        "changes": changes, "new_priority": new_priority,
    })
    await session.commit()
    await publish_incident(incident.id)
    return await _get_fresh(incident.id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_fresh(incident_id: str) -> Dict[str, Any]:
    """Load a fresh session to return serialized incident."""
    from app.db.session import SessionLocal
    async with SessionLocal() as s:
        inc = await s.get(Incident, incident_id)
        if not inc:
            return {"id": incident_id}
        return await serialize_incident(s, inc)
