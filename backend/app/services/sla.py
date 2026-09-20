"""ResQGrid — SLA Monitoring & Escalation Ladder Engine.

Evaluates rules R1–R8 on active incidents, manages escalation tiers L0→L3,
and triggers alerts & notifications.
Exposes:
    evaluate_incident(incident_id: str) -> None
    start(app) -> None
    stop() -> None
"""
from __future__ import annotations

import asyncio
import datetime
import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import func, select

from app.core.config import settings
from app.core.events import bus
from app.db.models import Alert, Assignment, Incident, Sensor, Shortage
from app.db.session import SessionLocal
from app.services.geo import haversine_km

logger = logging.getLogger(__name__)

_sla_task: Optional[asyncio.Task] = None


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _serialize_alert(alert: Alert) -> Dict[str, Any]:
    return {
        "id": alert.id,
        "incident_id": alert.incident_id,
        "kind": alert.kind,
        "rule": alert.rule,
        "level": alert.level,
        "message": alert.message,
        "status": alert.status,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "ack_at": alert.ack_at.isoformat() if alert.ack_at else None,
        "ack_by": alert.ack_by,
    }


async def evaluate_incident(incident_id: str) -> None:
    """Immediate SLA evaluation for a single incident (called upon creation or update)."""
    try:
        async with SessionLocal() as session:
            incident = await session.get(Incident, incident_id)
            if not incident:
                return

            now = _now_utc()

            # Rule R0: Immediate Critical Alert for P1 or Severity 5
            if incident.priority == "P1" or incident.severity >= 5:
                # Check if alert already exists
                existing = await session.execute(
                    select(Alert).where(
                        Alert.incident_id == incident.id,
                        Alert.rule == "R0_P1_CRITICAL",
                        Alert.status.in_(["open", "ack"]),
                    )
                )
                if not existing.scalar_one_or_none():
                    alert = Alert(
                        id=str(uuid4()),
                        incident_id=incident.id,
                        rule="R0_P1_CRITICAL",
                        kind="critical",
                        level=0,
                        message=f"Critical {incident.priority} emergency {incident.code}: {incident.title}",
                        status="open",
                        created_at=now,
                    )
                    session.add(alert)
                    incident.escalated = True
                    await session.commit()

                    alert_dict = _serialize_alert(alert)
                    await bus.publish("alert.new", alert_dict)

                    try:
                        from app.services.notify import route as notify_route
                        await notify_route("alert.critical", incident.id, {"message": alert.message, "level": 0})
                    except Exception as exc:
                        logger.debug("evaluate_incident: notify_route failed: %s", exc)
    except Exception as exc:
        logger.warning("evaluate_incident failed: %s", exc)


async def _run_sla_checks() -> None:
    """Execute evaluation of all SLA rules across active incidents."""
    now = _now_utc()
    scale = settings.SLA_TIME_SCALE

    async with SessionLocal() as session:
        # Load active, non-historic incidents
        inc_res = await session.execute(
            select(Incident)
            .where(Incident.is_historic == False)
            .where(Incident.status.not_in(["resolved", "closed"]))
        )
        active_incidents = inc_res.scalars().all()

        for inc in active_incidents:
            # Helper to upsert alert
            async def _upsert_alert(rule: str, kind: str, message: str) -> Optional[Alert]:
                existing_res = await session.execute(
                    select(Alert).where(
                        Alert.incident_id == inc.id,
                        Alert.rule == rule,
                        Alert.status.in_(["open", "ack"]),
                    )
                )
                existing = existing_res.scalar_one_or_none()
                if not existing:
                    new_alert = Alert(
                        id=str(uuid4()),
                        incident_id=inc.id,
                        rule=rule,
                        kind=kind,
                        level=0,
                        message=message,
                        status="open",
                        created_at=now,
                    )
                    session.add(new_alert)
                    inc.escalated = True
                    return new_alert
                return None

            new_alerts: List[Alert] = []

            # ── R1: Unassigned beyond SLA ──────────────────────────────────
            if inc.status in ("new", "triaged") and inc.sla_due_at and now > inc.sla_due_at:
                a = await _upsert_alert(
                    "R1_UNASSIGNED_SLA",
                    "delayed",
                    f"Incident {inc.code} unassigned beyond SLA due time ({inc.priority})",
                )
                if a:
                    new_alerts.append(a)

            # ── R2 & R3: Assignments SLA checks ────────────────────────────
            asgn_res = await session.execute(
                select(Assignment).where(Assignment.incident_id == inc.id)
            )
            assignments = asgn_res.scalars().all()

            for asgn in assignments:
                # R2: Approved but not en-route within 2 min * scale
                if asgn.status == "approved" and asgn.approved_at:
                    elapsed_min = (now - asgn.approved_at).total_seconds() / 60.0
                    if elapsed_min > (2.0 * scale):
                        a = await _upsert_alert(
                            f"R2_ASSIGNED_NOT_ENROUTE_{asgn.id}",
                            "delayed",
                            f"Unit {asgn.target_name or 'resource'} approved for {inc.code} not en-route after {elapsed_min:.1f}m",
                        )
                        if a:
                            new_alerts.append(a)

                # R3: ETA overrun > 50%
                if asgn.status == "en_route" and asgn.en_route_at and asgn.eta_min:
                    elapsed_min = (now - asgn.en_route_at).total_seconds() / 60.0
                    if elapsed_min > (asgn.eta_min * 1.5):
                        a = await _upsert_alert(
                            f"R3_ETA_OVERRUN_{asgn.id}",
                            "delayed",
                            f"Unit {asgn.target_name or 'resource'} en-route to {inc.code} has exceeded ETA by >50% ({elapsed_min:.1f}m vs {asgn.eta_min:.1f}m)",
                        )
                        if a:
                            new_alerts.append(a)

            # ── R4: Severity 4 or 5 ────────────────────────────────────────
            if inc.severity >= 4:
                a = await _upsert_alert(
                    "R4_HIGH_SEVERITY",
                    "escalation",
                    f"High-severity incident {inc.code} (Severity {inc.severity}) active in {inc.area or 'Vadodara'}",
                )
                if a:
                    new_alerts.append(a)

            # ── R5: Open Resource Shortage ──────────────────────────────────
            sh_res = await session.execute(
                select(Shortage).where(
                    Shortage.incident_id == inc.id,
                    Shortage.resolved_at.is_(None),
                )
            )
            shortages = sh_res.scalars().all()
            for sh in shortages:
                a = await _upsert_alert(
                    f"R5_SHORTAGE_{sh.subtype}",
                    "escalation",
                    f"Resource shortage for {inc.code}: {sh.subtype} (missing {sh.qty_missing})",
                )
                if a:
                    new_alerts.append(a)

            # ── R8: Duplicate cluster (>= 5 reports) ────────────────────────
            if inc.report_count >= 5:
                a = await _upsert_alert(
                    "R8_DUPLICATE_CLUSTER",
                    "cluster",
                    f"High-volume duplicate cluster ({inc.report_count} reports) linked to {inc.code}",
                )
                if a:
                    new_alerts.append(a)

            # Commit new alerts
            if new_alerts:
                await session.commit()
                for a in new_alerts:
                    alert_dict = _serialize_alert(a)
                    await bus.publish("alert.new", alert_dict)
                    try:
                        from app.services.notify import route as notify_route
                        await notify_route("alert.delayed" if a.kind == "delayed" else "alert.escalation", inc.id, {
                            "message": a.message,
                            "level": a.level,
                        })
                    except Exception:
                        pass

        # ── R6: Sensor breach clusters (>= 2 breaches within 2 km) ──────────
        sensor_res = await session.execute(
            select(Sensor).where(Sensor.state == "breach")
        )
        breached_sensors = sensor_res.scalars().all()
        if len(breached_sensors) >= 2:
            for i, s1 in enumerate(breached_sensors):
                for s2 in breached_sensors[i + 1:]:
                    if s1.lat and s1.lng and s2.lat and s2.lng:
                        dist = haversine_km(s1.lat, s1.lng, s2.lat, s2.lng)
                        if dist <= 2.0:
                            # Sensor cluster alert
                            existing_s = await session.execute(
                                select(Alert).where(
                                    Alert.rule == f"R6_SENSOR_CLUSTER_{s1.id}_{s2.id}",
                                    Alert.status.in_(["open", "ack"]),
                                )
                            )
                            if not existing_s.scalar_one_or_none():
                                s_alert = Alert(
                                    id=str(uuid4()),
                                    incident_id=None,
                                    rule=f"R6_SENSOR_CLUSTER_{s1.id}_{s2.id}",
                                    kind="sensor",
                                    level=1,
                                    message=f"Sensor breach cluster detected: {s1.kind} and {s2.kind} within {dist:.1f}km",
                                    status="open",
                                    created_at=now,
                                )
                                session.add(s_alert)
                                await session.commit()
                                await bus.publish("alert.new", _serialize_alert(s_alert))

        # ── R7: Regional surge (>= 3 P1/P2 in same area) ────────────────────
        area_counts: Dict[str, int] = {}
        for inc in active_incidents:
            if inc.priority in ("P1", "P2") and inc.area:
                area_counts[inc.area] = area_counts.get(inc.area, 0) + 1

        for area, count in area_counts.items():
            if count >= 3:
                existing_surge = await session.execute(
                    select(Alert).where(
                        Alert.rule == f"R7_SURGE_{area}",
                        Alert.status.in_(["open", "ack"]),
                    )
                )
                if not existing_surge.scalar_one_or_none():
                    surge_alert = Alert(
                        id=str(uuid4()),
                        incident_id=None,
                        rule=f"R7_SURGE_{area}",
                        kind="cluster",
                        level=2,
                        message=f"Regional emergency surge: {count} high-priority incidents in {area}",
                        status="open",
                        created_at=now,
                    )
                    session.add(surge_alert)
                    await session.commit()
                    await bus.publish("alert.new", _serialize_alert(surge_alert))

        # ── Escalation Ladder Progression ──────────────────────────────────
        open_alerts_res = await session.execute(
            select(Alert).where(Alert.status == "open")
        )
        open_alerts = open_alerts_res.scalars().all()

        for a in open_alerts:
            elapsed_min = (now - a.created_at).total_seconds() / 60.0
            new_level = a.level

            if elapsed_min >= (15.0 * scale):
                new_level = max(a.level, 3)
            elif elapsed_min >= (10.0 * scale):
                new_level = max(a.level, 2)
            elif elapsed_min >= (5.0 * scale):
                new_level = max(a.level, 1)

            if new_level > a.level:
                a.level = new_level
                if a.incident_id:
                    inc = await session.get(Incident, a.incident_id)
                    if inc:
                        inc.escalation_level = max(inc.escalation_level, new_level)
                        inc.escalated = True

                await session.commit()
                alert_dict = _serialize_alert(a)
                await bus.publish("alert.new", alert_dict)

                try:
                    from app.services.notify import route as notify_route
                    await notify_route("alert.escalation", a.incident_id, {
                        "message": a.message,
                        "level": new_level,
                    })
                except Exception:
                    pass


async def _sla_loop() -> None:
    """Periodic loop evaluating SLA rules every 5 seconds."""
    logger.info("SLA monitoring background loop started")
    while True:
        try:
            await _run_sla_checks()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("Error in SLA monitoring loop: %s", exc)
        await asyncio.sleep(5.0)


def start(app: Any) -> None:
    """Start background SLA monitoring loop."""
    global _sla_task
    if _sla_task is None or _sla_task.done():
        _sla_task = asyncio.create_task(_sla_loop())
        logger.info("SLA background task launched")


def stop() -> None:
    """Stop background SLA monitoring loop."""
    global _sla_task
    if _sla_task and not _sla_task.done():
        _sla_task.cancel()
        _sla_task = None
        logger.info("SLA background task stopped")
