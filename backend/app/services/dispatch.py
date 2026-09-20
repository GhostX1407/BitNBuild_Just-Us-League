"""ResQGrid — Dispatch Operations Service.

Handles assignment approval, unit acceptance, rejection (with automatic rerouting),
status transitions (en_route, arrived, completed, cancelled), and audit logging.
"""
from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import select

from app.core.events import bus
from app.db.models import Assignment, AuditEvent, Incident, Unit
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _serialize_unit(unit: Unit) -> Dict[str, Any]:
    return {
        "id": unit.id,
        "name": unit.name,
        "kind": unit.kind,
        "category": unit.category,
        "agency": unit.agency,
        "capabilities": unit.capabilities or [],
        "equipment": unit.equipment or {},
        "crew_size": unit.crew_size,
        "status": unit.status,
        "lat": unit.lat,
        "lng": unit.lng,
        "station_id": unit.station_id,
        "current_incident_id": unit.current_incident_id,
        "speed_kmh": unit.speed_kmh,
        "fatigue": unit.fatigue,
        "phone": unit.phone,
    }


def _serialize_assignment(asgn: Assignment) -> Dict[str, Any]:
    return {
        "id": asgn.id,
        "incident_id": asgn.incident_id,
        "unit_id": asgn.unit_id,
        "facility_id": asgn.facility_id,
        "target_name": asgn.target_name,
        "kind": asgn.kind,
        "requirement_key": asgn.requirement_key,
        "score": asgn.score,
        "score_breakdown": asgn.score_breakdown,
        "eta_min": asgn.eta_min,
        "status": asgn.status,
    }


async def approve(
    incident_id: str,
    assignment_ids: Optional[List[str]] = None,
    all_assignments: bool = False,
) -> List[Dict[str, Any]]:
    """Approve recommended assignments and transition units to assigned."""
    now = _now_utc()
    approved_assignments: List[Assignment] = []
    units_to_update: List[Unit] = []

    async with SessionLocal() as session:
        incident = await session.get(Incident, incident_id)
        if not incident:
            logger.warning("approve: Incident %s not found", incident_id)
            return []

        # Find assignments to approve
        query = select(Assignment).where(
            Assignment.incident_id == incident_id,
            Assignment.status == "recommended",
        )
        if not all_assignments and assignment_ids:
            query = query.where(Assignment.id.in_(assignment_ids))

        res = await session.execute(query)
        assignments = res.scalars().all()

        for asgn in assignments:
            asgn.status = "approved"
            asgn.approved_at = now
            asgn.updated_at = now
            approved_assignments.append(asgn)

            if asgn.unit_id:
                unit = await session.get(Unit, asgn.unit_id)
                if unit:
                    unit.status = "assigned"
                    unit.current_incident_id = incident_id
                    unit.updated_at = now
                    units_to_update.append(unit)

        # Update incident status
        if incident.status in ("new", "triaged"):
            incident.status = "dispatched"
        if not incident.first_assigned_at:
            incident.first_assigned_at = now

        # Audit event
        audit = AuditEvent(
            id=str(uuid4()),
            actor="dispatcher",
            action="assignments.approved",
            entity="incident",
            entity_id=incident_id,
            data={
                "assignment_ids": [a.id for a in approved_assignments],
                "units": [u.id for u in units_to_update],
            },
            ts=now,
        )
        session.add(audit)
        await session.commit()

        # Serialize results before session closes
        serialized_assignments = [_serialize_assignment(a) for a in approved_assignments]
        serialized_units = [_serialize_unit(u) for u in units_to_update]

    # Broadcast updates
    for u_dict in serialized_units:
        await bus.publish("unit.update", u_dict)

    # Route notifications
    try:
        from app.services.notify import route as notify_route
        await notify_route("assignment.created", incident_id, {
            "assignment_ids": [a["id"] for a in serialized_assignments]
        })
    except Exception as exc:
        logger.debug("approve: notify_route failed: %s", exc)

    # Publish incident and KPI updates
    try:
        from app.services.pipeline import publish_incident
        await publish_incident(incident_id)
    except Exception as exc:
        logger.debug("approve: publish_incident failed: %s", exc)

    return serialized_assignments


async def accept(assignment_id: str) -> Optional[Dict[str, Any]]:
    """Field unit accepts assignment."""
    now = _now_utc()
    serialized_unit: Optional[Dict[str, Any]] = None
    serialized_asgn: Optional[Dict[str, Any]] = None
    incident_id: Optional[str] = None

    async with SessionLocal() as session:
        asgn = await session.get(Assignment, assignment_id)
        if not asgn:
            logger.warning("accept: Assignment %s not found", assignment_id)
            return None

        asgn.status = "accepted"
        asgn.accepted_at = now
        asgn.updated_at = now
        incident_id = asgn.incident_id

        if asgn.unit_id:
            unit = await session.get(Unit, asgn.unit_id)
            if unit:
                unit.status = "assigned"
                unit.updated_at = now
                serialized_unit = _serialize_unit(unit)

        audit = AuditEvent(
            id=str(uuid4()),
            actor="field_team",
            action="assignment.accepted",
            entity="assignment",
            entity_id=assignment_id,
            data={"unit_id": asgn.unit_id, "incident_id": incident_id},
            ts=now,
        )
        session.add(audit)
        await session.commit()
        serialized_asgn = _serialize_assignment(asgn)

    if serialized_unit:
        await bus.publish("unit.update", serialized_unit)

    if incident_id:
        try:
            from app.services.pipeline import publish_incident
            await publish_incident(incident_id)
        except Exception as exc:
            logger.debug("accept: publish_incident failed: %s", exc)

    return serialized_asgn


async def reject(assignment_id: str, reason: str = "") -> None:
    """Field unit rejects assignment; triggers automatic re-recommendation excluding this unit."""
    now = _now_utc()
    incident_id: Optional[str] = None
    rejected_unit_id: Optional[str] = None
    serialized_unit: Optional[Dict[str, Any]] = None

    async with SessionLocal() as session:
        asgn = await session.get(Assignment, assignment_id)
        if not asgn:
            logger.warning("reject: Assignment %s not found", assignment_id)
            return

        asgn.status = "rejected"
        asgn.updated_at = now
        incident_id = asgn.incident_id
        rejected_unit_id = asgn.unit_id

        if asgn.unit_id:
            unit = await session.get(Unit, asgn.unit_id)
            if unit:
                unit.status = "available"
                unit.current_incident_id = None
                unit.fatigue = min(1.0, (unit.fatigue or 0.0) + 0.05)
                unit.updated_at = now
                serialized_unit = _serialize_unit(unit)

        audit = AuditEvent(
            id=str(uuid4()),
            actor="field_team",
            action="assignment.rejected",
            entity="assignment",
            entity_id=assignment_id,
            data={"unit_id": rejected_unit_id, "reason": reason},
            ts=now,
        )
        session.add(audit)
        await session.commit()

    if serialized_unit:
        await bus.publish("unit.update", serialized_unit)

    # Re-run recommendation excluding rejected unit
    if incident_id and rejected_unit_id:
        try:
            from app.services.recommend import plan as recommend_plan
            await recommend_plan(incident_id, exclude_unit_ids=[rejected_unit_id])
        except Exception as exc:
            logger.warning("reject: recommend_plan reroute failed: %s", exc)


async def set_status(assignment_id: str, status: str) -> Optional[Dict[str, Any]]:
    """Update assignment status (en_route, arrived, completed, cancelled) and sync incident/unit."""
    now = _now_utc()
    serialized_unit: Optional[Dict[str, Any]] = None
    serialized_asgn: Optional[Dict[str, Any]] = None
    incident_id: Optional[str] = None

    async with SessionLocal() as session:
        asgn = await session.get(Assignment, assignment_id)
        if not asgn:
            logger.warning("set_status: Assignment %s not found", assignment_id)
            return None

        incident_id = asgn.incident_id
        incident = await session.get(Incident, incident_id)
        asgn.status = status
        asgn.updated_at = now

        unit: Optional[Unit] = None
        if asgn.unit_id:
            unit = await session.get(Unit, asgn.unit_id)

        if status == "en_route":
            asgn.en_route_at = now
            if unit:
                unit.status = "en_route"
                unit.updated_at = now
            if incident and incident.status in ("new", "triaged", "dispatched"):
                incident.status = "en_route"

        elif status == "arrived":
            asgn.arrived_at = now
            if unit:
                unit.status = "on_scene"
                unit.updated_at = now
            if incident:
                if not incident.first_arrival_at:
                    incident.first_arrival_at = now
                incident.status = "on_scene"

        elif status == "completed":
            asgn.completed_at = now
            if unit:
                unit.status = "available"
                unit.current_incident_id = None
                unit.fatigue = min(1.0, (unit.fatigue or 0.0) + 0.1)
                unit.updated_at = now

            # Check if all assignments for this incident are completed
            all_asgns_res = await session.execute(
                select(Assignment).where(Assignment.incident_id == incident_id)
            )
            all_asgns = all_asgns_res.scalars().all()
            if all_asgns and all(a.status in ("completed", "cancelled", "rejected") for a in all_asgns):
                if incident:
                    incident.status = "resolved"
                    incident.resolved_at = now

        elif status == "cancelled":
            if unit:
                unit.status = "available"
                unit.current_incident_id = None
                unit.updated_at = now

        if unit:
            serialized_unit = _serialize_unit(unit)

        audit = AuditEvent(
            id=str(uuid4()),
            actor="system",
            action=f"assignment.{status}",
            entity="assignment",
            entity_id=assignment_id,
            data={"status": status, "incident_id": incident_id},
            ts=now,
        )
        session.add(audit)
        await session.commit()
        serialized_asgn = _serialize_assignment(asgn)

    if serialized_unit:
        await bus.publish("unit.update", serialized_unit)

    if incident_id:
        try:
            from app.services.pipeline import publish_incident
            await publish_incident(incident_id)
        except Exception as exc:
            logger.debug("set_status: publish_incident failed: %s", exc)

    return serialized_asgn
