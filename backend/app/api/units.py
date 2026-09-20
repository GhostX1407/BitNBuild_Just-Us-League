"""ResQGrid — Units, Facilities, Dispatch Operations & Snapshot API Router.

Mounted under /api by main.py auto-discovery.
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Alert,
    Assignment,
    AuditEvent,
    Facility,
    Incident,
    Notification,
    Report,
    Sensor,
    Shortage,
    Unit,
)
from app.db.session import get_session
from app.schemas.unit import (
    ApproveRequest,
    AssignmentOut,
    AssignmentStatusRequest,
    FacilityOut,
    FacilityPatch,
    RecommendPlanOut,
    Snapshot,
    SnapshotKPIs,
    SnapshotSim,
    UnitOut,
    UnitPatch,
)
from app.services import dispatch, recommend
from app.services.pipeline import serialize_incident

router = APIRouter(tags=["units"])


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ---------------------------------------------------------------------------
# Snapshot (Client Bootstrap)
# ---------------------------------------------------------------------------

@router.get("/snapshot", response_model=Snapshot)
async def get_snapshot(session: AsyncSession = Depends(get_session)) -> Dict[str, Any]:
    """Return active incidents, units, facilities, sensors, alerts, notifications, and KPIs."""
    now = _now_utc()
    cutoff_60m = now - datetime.timedelta(minutes=60)

    # 1. Incidents: active OR resolved in last 60 minutes, non-historic
    inc_query = (
        select(Incident)
        .where(Incident.is_historic == False)
        .where(
            (Incident.status != "resolved") |
            (Incident.resolved_at >= cutoff_60m)
        )
    )
    inc_res = await session.execute(inc_query)
    incidents_orm = inc_res.scalars().all()
    incidents_out = [await serialize_incident(session, inc) for inc in incidents_orm]

    # 2. Units
    u_res = await session.execute(select(Unit))
    units_orm = u_res.scalars().all()
    units_out = [UnitOut.model_validate(u) for u in units_orm]

    # 3. Facilities
    f_res = await session.execute(select(Facility))
    facs_orm = f_res.scalars().all()
    facs_out = [FacilityOut.model_validate(f) for f in facs_orm]

    # 4. Sensors
    s_res = await session.execute(select(Sensor))
    sensors_orm = s_res.scalars().all()
    sensors_out = [
        {
            "id": s.id,
            "kind": s.kind,
            "lat": s.lat,
            "lng": s.lng,
            "threshold": s.threshold,
            "unit": s.unit,
            "last_value": s.last_value,
            "last_at": s.last_at.isoformat() if s.last_at else None,
            "state": s.state,
        }
        for s in sensors_orm
    ]

    # 5. Alerts (open or ack)
    a_res = await session.execute(
        select(Alert).where(Alert.status.in_(["open", "ack"])).order_by(Alert.created_at.desc())
    )
    alerts_orm = a_res.scalars().all()
    alerts_out = [
        {
            "id": a.id,
            "incident_id": a.incident_id,
            "kind": a.kind,
            "rule": a.rule,
            "level": a.level,
            "message": a.message,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "ack_at": a.ack_at.isoformat() if a.ack_at else None,
        }
        for a in alerts_orm
    ]

    # 6. Notifications (last 50)
    n_res = await session.execute(
        select(Notification).order_by(Notification.created_at.desc()).limit(50)
    )
    notifs_orm = n_res.scalars().all()
    notifs_out = [
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
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs_orm
    ]

    # 7. KPIs
    active_count = len([i for i in incidents_orm if i.status != "resolved"])
    p1_count = len([i for i in incidents_orm if i.status != "resolved" and i.priority == "P1"])
    avail_units = len([u for u in units_orm if u.status == "available"])
    total_units = len(units_orm)

    # Average response minutes across resolved incidents
    delays_res = await session.execute(
        select(Incident.created_at, Incident.first_arrival_at)
        .where(Incident.first_arrival_at.is_not(None))
        .limit(100)
    )
    delay_rows = delays_res.all()
    avg_resp = 0.0
    if delay_rows:
        total_mins = sum(
            (arr - cre).total_seconds() / 60.0
            for cre, arr in delay_rows
            if arr and cre and arr >= cre
        )
        avg_resp = round(total_mins / len(delay_rows), 1)

    unmet_shortages = await session.scalar(
        select(func.count(Shortage.id)).where(Shortage.resolved_at.is_(None))
    ) or 0
    total_reps = await session.scalar(select(func.count(Report.id))) or 0
    total_incs = await session.scalar(select(func.count(Incident.id))) or 0

    kpis = SnapshotKPIs(
        active=active_count,
        p1=p1_count,
        avg_response_min=avg_resp,
        units_available=avail_units,
        units_total=total_units,
        open_alerts=len(alerts_out),
        unmet_requirements=unmet_shortages,
        reports_total=total_reps,
        incidents_total=total_incs,
    )

    # 8. Simulator state
    sim_state = SnapshotSim(running=False, scenario=None, message="Ready")
    try:
        from app.services.simulator import get_state
        current_sim = get_state()
        sim_state = SnapshotSim(
            running=current_sim.get("running", False),
            scenario=current_sim.get("scenario"),
            message=current_sim.get("message", "Ready"),
        )
    except Exception:
        pass

    return {
        "incidents": incidents_out,
        "units": units_out,
        "facilities": facs_out,
        "sensors": sensors_out,
        "alerts": alerts_out,
        "notifications": notifs_out,
        "kpis": kpis,
        "sim": sim_state,
    }


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------

@router.get("/units", response_model=List[UnitOut])
async def list_units(
    status: Optional[str] = None,
    kind: Optional[str] = None,
    category: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> List[UnitOut]:
    """List emergency response units with optional filters."""
    query = select(Unit)
    if status:
        query = query.where(Unit.status == status)
    if kind:
        query = query.where(Unit.kind == kind)
    if category:
        query = query.where(Unit.category == category)
    res = await session.execute(query)
    return [UnitOut.model_validate(u) for u in res.scalars().all()]


@router.get("/units/{unit_id}", response_model=UnitOut)
async def get_unit(unit_id: str, session: AsyncSession = Depends(get_session)) -> UnitOut:
    """Get single unit details."""
    unit = await session.get(Unit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return UnitOut.model_validate(unit)


@router.patch("/units/{unit_id}", response_model=UnitOut)
async def patch_unit(
    unit_id: str,
    patch: UnitPatch,
    session: AsyncSession = Depends(get_session),
) -> UnitOut:
    """Update unit status, location, fatigue, or assignment."""
    unit = await session.get(Unit, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    if patch.status is not None:
        unit.status = patch.status
    if patch.lat is not None:
        unit.lat = patch.lat
    if patch.lng is not None:
        unit.lng = patch.lng
    if patch.fatigue is not None:
        unit.fatigue = patch.fatigue
    if patch.current_incident_id is not None:
        unit.current_incident_id = patch.current_incident_id

    unit.updated_at = _now_utc()

    audit = AuditEvent(
        id=str(uuid4()),
        actor="system",
        action="unit.updated",
        entity="unit",
        entity_id=unit_id,
        data=patch.model_dump(exclude_unset=True),
        ts=_now_utc(),
    )
    session.add(audit)
    await session.commit()
    await session.refresh(unit)

    try:
        from app.core.events import bus
        await bus.publish("unit.update", UnitOut.model_validate(unit).model_dump())
    except Exception:
        pass

    return UnitOut.model_validate(unit)


# ---------------------------------------------------------------------------
# Facilities
# ---------------------------------------------------------------------------

@router.get("/facilities", response_model=List[FacilityOut])
async def list_facilities(
    kind: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> List[FacilityOut]:
    """List facilities with optional kind filter."""
    query = select(Facility)
    if kind:
        query = query.where(Facility.kind == kind)
    res = await session.execute(query)
    return [FacilityOut.model_validate(f) for f in res.scalars().all()]


@router.patch("/facilities/{facility_id}", response_model=FacilityOut)
async def patch_facility(
    facility_id: str,
    patch: FacilityPatch,
    session: AsyncSession = Depends(get_session),
) -> FacilityOut:
    """Update facility bed capacity, diversion status, or contact."""
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    if patch.beds_free is not None:
        facility.beds_free = patch.beds_free
    if patch.on_diversion is not None:
        facility.on_diversion = patch.on_diversion
    if patch.contact is not None:
        facility.contact = patch.contact

    facility.updated_at = _now_utc()
    await session.commit()
    await session.refresh(facility)
    return FacilityOut.model_validate(facility)


# ---------------------------------------------------------------------------
# Dispatch & Recommendations
# ---------------------------------------------------------------------------

@router.post("/incidents/{incident_id}/recommend", response_model=RecommendPlanOut)
async def recommend_for_incident(incident_id: str) -> Dict[str, Any]:
    """Compute/refresh resource recommendation plan for an incident."""
    plan = await recommend.plan(incident_id)
    return plan


@router.post("/incidents/{incident_id}/approve", response_model=List[AssignmentOut])
async def approve_incident_dispatch(
    incident_id: str,
    req: ApproveRequest,
) -> List[Dict[str, Any]]:
    """Dispatcher approves recommended assignments (all or selected IDs)."""
    approved = await dispatch.approve(
        incident_id=incident_id,
        assignment_ids=req.assignment_ids,
        all_assignments=bool(req.all),
    )
    return approved


@router.post("/assignments/{assignment_id}/accept", response_model=Optional[AssignmentOut])
async def accept_assignment(assignment_id: str) -> Any:
    """Field unit accepts assigned dispatch."""
    asgn = await dispatch.accept(assignment_id)
    if not asgn:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return asgn


@router.post("/assignments/{assignment_id}/reject")
async def reject_assignment(
    assignment_id: str,
    reason: Optional[str] = Query(default=""),
) -> Dict[str, str]:
    """Field unit rejects assignment; triggers automatic re-recommendation."""
    await dispatch.reject(assignment_id, reason=reason or "")
    return {"status": "rejected", "message": "Assignment rejected, re-recommendation triggered"}


@router.post("/assignments/{assignment_id}/status", response_model=Optional[AssignmentOut])
async def update_assignment_status(
    assignment_id: str,
    req: AssignmentStatusRequest,
) -> Any:
    """Update assignment and unit status (en_route, arrived, completed, cancelled)."""
    valid = ("en_route", "arrived", "completed", "cancelled")
    if req.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid}")
    asgn = await dispatch.set_status(assignment_id, req.status)
    if not asgn:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return asgn
