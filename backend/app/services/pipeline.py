"""ResQGrid — Core ingest pipeline.

Exposed:
    ingest_report(source, payload) -> dict
    publish_incident(incident_id) -> None
    serialize_incident(session, incident) -> dict
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import random
import string
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select

from app.db.models import (
    Assignment,
    AuditEvent,
    Incident,
    Report,
    Shortage,
)
from app.db.session import SessionLocal
from app.services.priority import compute_priority, SLA_BASE
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level lock for idempotency / unique code generation
_ingest_lock = asyncio.Lock()

# Source → reliability weight
_RELIABILITY: Dict[str, float] = {
    "citizen": 0.6,
    "call": 0.8,
    "sensor": 0.9,
    "field": 0.95,
    "department": 0.9,
    "hospital": 0.85,  # assumed per prompt spec
}


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


def _random_track_id() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


# ---------------------------------------------------------------------------
# Normalise payload → text
# ---------------------------------------------------------------------------

def _normalise_text(source: str, payload: Dict[str, Any]) -> str:
    """Extract a single canonical text string from any source payload."""
    if source == "sensor":
        sid = payload.get("sensor_id", "?")
        value = payload.get("value", "?")
        unit = payload.get("unit", "")
        threshold = payload.get("threshold", "?")
        kind = payload.get("kind", "sensor")
        kind_label = {
            "flood_gauge": "Flood gauge",
            "smoke": "Smoke detector",
            "gas": "Gas sensor",
            "seismic": "Seismic sensor",
            "traffic": "Traffic sensor",
        }.get(kind, kind.title())
        return f"{kind_label} {sid} at {value}{unit} exceeds threshold {threshold}"
    if source == "call":
        return payload.get("transcript") or payload.get("text") or ""
    return payload.get("text") or ""


async def _get_next_incident_code(session) -> str:
    """Generate next INC-#### code (max existing numeric + 1, across all incidents)."""
    from sqlalchemy import cast, Integer
    result = await session.execute(
        select(func.max(cast(func.substr(Incident.code, 5), Integer))).where(Incident.code.like("INC-%"))
    )
    max_num: Optional[int] = result.scalar()
    num = (max_num + 1) if max_num else 1
    return f"INC-{num:04d}"


def _weighted_confidence(existing_conf: float, new_rel: float, report_count: int) -> float:
    """Merge confidence: diminishing returns, capped at 0.99."""
    boost = new_rel * 0.05 / max(1, report_count)
    return min(0.99, existing_conf + boost)


def _build_title(inc_type: str, area: Optional[str], severity: int) -> str:
    type_labels = {
        "fire": "Fire",
        "flood": "Flooding",
        "road_accident": "Road accident",
        "medical": "Medical emergency",
        "industrial_hazard": "Industrial hazard",
        "building_collapse": "Building collapse",
        "gas_leak": "Gas leak",
        "other": "Incident",
    }
    label = type_labels.get(inc_type, inc_type.replace("_", " ").title())
    location = f" near {area}" if area and area not in ("Vadodara",) else f" in {area or 'Vadodara'}"
    return f"{label}{location}"


def _audit(session, actor: str, action: str, entity: str, entity_id: str, data: Any) -> AuditEvent:
    row = AuditEvent(
        actor=actor,
        action=action,
        entity=entity,
        entity_id=entity_id,
        data=data if isinstance(data, dict) else {"value": data},
    )
    session.add(row)
    return row


# ---------------------------------------------------------------------------
# serialize_incident
# ---------------------------------------------------------------------------

async def serialize_incident(session, incident: Incident) -> Dict[str, Any]:
    """Produce IncidentOut-compatible dict from an Incident ORM object.

    Args:
        session: AsyncSession (used to load assignments, shortages).
        incident: Incident ORM instance.

    Returns:
        Dict matching the IncidentOut shape.
    """
    # Load assignments
    asgn_result = await session.execute(
        select(Assignment).where(Assignment.incident_id == incident.id)
    )
    assignments = asgn_result.scalars().all()

    # Load shortages (unresolved only)
    shortage_result = await session.execute(
        select(Shortage)
        .where(Shortage.incident_id == incident.id)
        .where(Shortage.resolved_at.is_(None))
    )
    shortages = shortage_result.scalars().all()

    # Resolve target_name / kind for assignments missing them
    asgn_out = []
    for a in assignments:
        target_name = a.target_name
        kind = a.kind
        if (not target_name or not kind) and (a.unit_id or a.facility_id):
            if a.unit_id:
                from app.db.models import Unit
                u_res = await session.get(Unit, a.unit_id)
                if u_res:
                    target_name = target_name or u_res.name
                    kind = kind or u_res.kind
            elif a.facility_id:
                from app.db.models import Facility
                f_res = await session.get(Facility, a.facility_id)
                if f_res:
                    target_name = target_name or f_res.name
                    kind = kind or f_res.kind

        asgn_out.append({
            "id": a.id,
            "incident_id": a.incident_id,
            "unit_id": a.unit_id,
            "facility_id": a.facility_id,
            "target_name": target_name,
            "kind": kind,
            "requirement_key": a.requirement_key,
            "score": a.score,
            "score_breakdown": a.score_breakdown,
            "eta_min": a.eta_min,
            "status": a.status,
        })

    shortage_out = [
        {"subtype": s.subtype, "qty_missing": s.qty_missing}
        for s in shortages
    ]

    return {
        "id": incident.id,
        "code": incident.code,
        "type": incident.type,
        "title": incident.title,
        "summary": incident.summary,
        "severity": incident.severity,
        "priority": incident.priority,
        "confidence": incident.confidence,
        "status": incident.status,
        "escalated": incident.escalated,
        "escalation_level": incident.escalation_level,
        "lat": incident.lat,
        "lng": incident.lng,
        "area": incident.area,
        "people_affected": incident.people_affected,
        "hazards": incident.hazards or [],
        "report_count": incident.report_count,
        "sources": incident.sources or [],
        "created_at": _iso(incident.created_at),
        "triaged_at": _iso(incident.triaged_at),
        "first_assigned_at": _iso(incident.first_assigned_at),
        "first_arrival_at": _iso(incident.first_arrival_at),
        "resolved_at": _iso(incident.resolved_at),
        "sla_due_at": _iso(incident.sla_due_at),
        "track_id": incident.track_id,
        "decision_log": incident.decision_log or [],
        "assignments": asgn_out,
        "shortages": shortage_out,
    }


# ---------------------------------------------------------------------------
# publish_incident
# ---------------------------------------------------------------------------

async def publish_incident(incident_id: str) -> None:
    """Load incident and broadcast incident.upsert via the event bus.

    Args:
        incident_id: UUID of the incident to publish.
    """
    try:
        async with SessionLocal() as session:
            incident = await session.get(Incident, incident_id)
            if not incident:
                logger.debug("publish_incident: incident %s not found", incident_id)
                return
            payload = await serialize_incident(session, incident)

        try:
            from app.core.events import bus  # lazy import; BE2 may not exist yet
            await bus.publish("incident.upsert", payload)
        except ImportError:
            logger.debug("app.core.events not available; skipping WS publish")
        except Exception as exc:
            logger.debug("bus.publish failed: %s", exc)
    except Exception as exc:
        logger.warning("publish_incident failed: %s", exc)


# ---------------------------------------------------------------------------
# ingest_report
# ---------------------------------------------------------------------------

async def ingest_report(source: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Main intake pipeline.

    Args:
        source: One of citizen|call|sensor|field|hospital|department.
        payload: Raw ingest body dict.

    Returns:
        {report_id, incident_id, action, classification, track_id}
        action is one of: new|merged|related|ignored.
    """
    from app.services.geocode import resolve as geocode_resolve
    from app.services.classify import classify
    from app.services.dedupe import find_candidates, MERGE_T, RELATED_T

    # ── Sensor below-threshold → ignore ────────────────────────────────────
    if source == "sensor":
        threshold = payload.get("threshold")
        value = payload.get("value")
        if threshold is not None and value is not None:
            if float(value) < float(threshold):
                return {
                    "report_id": None,
                    "incident_id": None,
                    "action": "ignored",
                    "classification": None,
                    "track_id": None,
                }

    # ── Normalise text ──────────────────────────────────────────────────────
    text = _normalise_text(source, payload)

    # ── Pre-lock: geocode + classify (expensive / LLM calls) ───────────────
    geo = await geocode_resolve(payload, source)
    classification = await classify(text, source, payload)

    reliability = _RELIABILITY.get(source, 0.7)
    report_lat = geo.get("lat")
    report_lng = geo.get("lng")
    location_uncertain = geo.get("location_uncertain", False)

    report_dict = {
        "lat": report_lat,
        "lng": report_lng,
        "text": text,
        "source": source,
        "location_uncertain": location_uncertain,
    }

    # ── Critical section: idempotency + dedupe + create/merge (under lock) ─
    async with _ingest_lock:
        async with SessionLocal() as session:
            # Idempotency check
            external_id = payload.get("external_id")
            if external_id and source != "sensor":
                from sqlalchemy import and_
                existing_stmt = select(Report).where(
                    and_(Report.source == source, Report.external_id == external_id)
                )
                existing_result = await session.execute(existing_stmt)
                existing_report = existing_result.scalar_one_or_none()
                if existing_report:
                    # Return original result
                    incident_id = existing_report.incident_id
                    track_id = None
                    action = "new"
                    if incident_id:
                        inc = await session.get(Incident, incident_id)
                        if inc:
                            track_id = inc.track_id
                            # Determine original action by checking if it's the first report
                            from sqlalchemy import asc
                            first_rep = await session.execute(
                                select(Report)
                                .where(Report.incident_id == incident_id)
                                .order_by(asc(Report.created_at))
                                .limit(1)
                            )
                            fr = first_rep.scalar_one_or_none()
                            if fr and fr.id != existing_report.id:
                                action = "merged"
                            else:
                                # It was the creator. Check if it was "related"
                                audit_res = await session.execute(
                                    select(AuditEvent).where(
                                        AuditEvent.entity_id == incident_id,
                                        AuditEvent.action == "incident.created"
                                    )
                                )
                                ca = audit_res.scalar_one_or_none()
                                if ca and ca.data.get("action") == "related":
                                    action = "related"

                    return {
                        "report_id": existing_report.id,
                        "incident_id": incident_id,
                        "action": action,
                        "classification": existing_report.classification,
                        "track_id": track_id,
                        "idempotent": True,
                    }

            now = _now_utc()
            log_entry_base = {"ts": now.isoformat()}

            # Create Report row
            reporter_phone = payload.get("phone") or payload.get("caller_phone")
            reporter_name = payload.get("name")

            # For field reports with an explicit incident_id, skip dedupe
            explicit_incident_id = payload.get("incident_id") if source == "field" else None

            # For hospital reports, try to resolve facility lat/lng
            if source == "hospital" and (report_lat is None or report_lat == settings.DEFAULT_CITY_LAT):
                facility_id = payload.get("facility_id")
                if facility_id:
                    try:
                        from app.db.models import Facility
                        fac = await session.get(Facility, facility_id)
                        if fac and fac.lat:
                            report_lat = fac.lat
                            report_lng = fac.lng
                            geo["lat"] = report_lat
                            geo["lng"] = report_lng
                    except Exception:
                        pass

            # For field reports without lat/lng, try unit position
            if source == "field" and report_lat is None:
                unit_id = payload.get("unit_id")
                if unit_id:
                    try:
                        from app.db.models import Unit
                        unit = await session.get(Unit, unit_id)
                        if unit and unit.lat:
                            report_lat = unit.lat
                            report_lng = unit.lng
                    except Exception:
                        pass

            report = Report(
                source=source,
                external_id=external_id,
                raw=payload,
                text=text,
                reporter_name=reporter_name,
                reporter_phone=reporter_phone,
                lat=report_lat,
                lng=report_lng,
                location_text=geo.get("location_text"),
                location_conf=geo.get("confidence"),
                reliability=reliability,
                classification=classification,
            )
            session.add(report)
            await session.flush()  # get report.id

            decision_log: List[Dict[str, Any]] = []
            decision_log.append({
                **log_entry_base,
                "stage": "geocode",
                "method": geo.get("method"),
                "confidence": geo.get("confidence"),
                "area": geo.get("area"),
                "reason": f"Geocoded via {geo.get('method')} (conf={geo.get('confidence', 0):.2f})",
            })
            decision_log.append({
                **log_entry_base,
                "stage": "classify",
                "type": classification["type"],
                "severity": classification["severity"],
                "model": classification["model"],
                "reason": classification.get("reasoning", ""),
            })

            sev = classification["severity"]
            people = classification["extracted"]["people_affected"]
            hazards = classification["extracted"]["hazards"]

            # ── Field report with explicit incident_id ──────────────────────
            action = "new"
            incident: Optional[Incident] = None

            if explicit_incident_id:
                incident = await session.get(Incident, explicit_incident_id)
                if incident:
                    action = "merged"
                    decision_log.append({
                        **log_entry_base,
                        "stage": "dedupe",
                        "reason": "Explicit incident reference from field report",
                        "incident_id": incident.id,
                        "code": incident.code,
                        "score": 1.0,
                    })
                else:
                    incident = None  # fall through to normal flow

            # ── Normal dedupe ───────────────────────────────────────────────
            related_list: List[Dict[str, Any]] = []
            if incident is None:
                candidates = await find_candidates(session, report_dict, classification)
                if candidates:
                    top_incident, top_score = candidates[0]
                    if top_score >= MERGE_T:
                        incident = top_incident
                        action = "merged"
                    elif top_score >= RELATED_T:
                        action = "related"
                        # Store related links for multiple candidates
                        related_list = [
                            {"incident_id": c.id, "code": c.code, "score": round(s, 3)}
                            for c, s in candidates[:5]
                        ]
                        decision_log.append({
                            **log_entry_base,
                            "stage": "dedupe",
                            "related": related_list,
                        })

            # ── Merge or create ─────────────────────────────────────────────
            escalated_severity = False

            if action == "merged" and incident is not None:
                old_sev = incident.severity
                new_sev = max(old_sev, sev)  # severity only escalates
                escalated_severity = new_sev > old_sev

                # Update incident fields
                incident.report_count += 1
                incident.sources = list(set(list(incident.sources or []) + [source]))
                incident.severity = new_sev
                incident.confidence = _weighted_confidence(incident.confidence, reliability, incident.report_count)
                incident.people_affected = max(incident.people_affected, people)
                if hazards:
                    incident.hazards = list(set(list(incident.hazards or []) + hazards))

                # Re-compute priority
                new_priority, sla_base = compute_priority(
                    incident.severity, incident.people_affected,
                    incident.hazards, incident.report_count, incident.sources,
                )
                incident.priority = new_priority
                incident.sla_due_at = incident.triaged_at + datetime.timedelta(
                    minutes=sla_base * settings.SLA_TIME_SCALE
                ) if incident.triaged_at else (
                    _now_utc() + datetime.timedelta(minutes=sla_base * settings.SLA_TIME_SCALE)
                )

                # Refresh title/summary from highest-reliability report
                incident.summary = (
                    f"{classification['type'].replace('_', ' ').title()} in {geo.get('area', 'Vadodara')}: "
                    f"{text[:200]}"
                )

                decision_log_entry = {
                    **log_entry_base,
                    "stage": "merge",
                    "reason": f"Merged report into {incident.code} (score={top_score:.2f})",
                    "report_count": incident.report_count,
                    "severity": incident.severity,
                    "priority": incident.priority,
                }
                incident.decision_log = [*(incident.decision_log or []), *decision_log, decision_log_entry]

                report.incident_id = incident.id
                _audit(session, "system", "report.merged", "incident", incident.id, {
                    "report_id": report.id,
                    "source": source,
                    "score": top_score if candidates else 1.0,
                })

            elif action == "related":
                # Create new incident, store related links in its decision_log
                code = await _get_next_incident_code(session)
                track_id = _random_track_id()
                sla_base = SLA_BASE.get(classification["priority"], 20)
                sla_due = _now_utc() + datetime.timedelta(minutes=sla_base * settings.SLA_TIME_SCALE)

                incident = Incident(
                    code=code,
                    type=classification["type"],
                    title=_build_title(classification["type"], geo.get("area"), sev),
                    summary=f"{classification['type'].replace('_', ' ').title()} in {geo.get('area', 'Vadodara')}: {text[:200]}",
                    severity=sev,
                    priority=classification["priority"],
                    confidence=reliability * classification["confidence"],
                    status="triaged",
                    lat=report_lat,
                    lng=report_lng,
                    area=geo.get("area"),
                    people_affected=people,
                    hazards=hazards,
                    report_count=1,
                    sources=[source],
                    triaged_at=_now_utc(),
                    sla_due_at=sla_due,
                    track_id=track_id,
                    decision_log=[
                        *decision_log,
                        {**log_entry_base, "stage": "dedupe", "related": related_list},
                        {**log_entry_base, "stage": "create", "reason": f"New incident {code} (related to existing)"},
                    ],
                )
                session.add(incident)
                await session.flush()
                report.incident_id = incident.id
                _audit(session, "system", "incident.created", "incident", incident.id, {
                    "code": code, "source": source, "action": "related",
                })
                action = "related"  # keep action as related

            else:
                # New incident
                priority_computed, sla_base = compute_priority(
                    sev, people, hazards, 1, [source]
                )
                classification["priority"] = priority_computed
                code = await _get_next_incident_code(session)
                track_id = _random_track_id()
                sla_due = _now_utc() + datetime.timedelta(minutes=sla_base * settings.SLA_TIME_SCALE)

                incident = Incident(
                    code=code,
                    type=classification["type"],
                    title=_build_title(classification["type"], geo.get("area"), sev),
                    summary=f"{classification['type'].replace('_', ' ').title()} in {geo.get('area', 'Vadodara')}: {text[:200]}",
                    severity=sev,
                    priority=priority_computed,
                    confidence=reliability * classification["confidence"],
                    status="triaged",
                    lat=report_lat,
                    lng=report_lng,
                    area=geo.get("area"),
                    people_affected=people,
                    hazards=hazards,
                    report_count=1,
                    sources=[source],
                    triaged_at=_now_utc(),
                    sla_due_at=sla_due,
                    track_id=track_id,
                    decision_log=[
                        *decision_log,
                        {**log_entry_base, "stage": "create", "reason": f"New incident {code}",
                         "priority": priority_computed, "sla_minutes": sla_base},
                    ],
                )
                session.add(incident)
                await session.flush()
                report.incident_id = incident.id
                _audit(session, "system", "incident.created", "incident", incident.id, {
                    "code": code, "source": source,
                })

            await session.commit()

            result = {
                "report_id": report.id,
                "incident_id": incident.id,
                "action": action,
                "classification": classification,
                "track_id": incident.track_id,
            }

        # ── Post-pipeline: lazy calls (never raise, never break ingest) ────
        incident_id = incident.id
        is_new = action in ("new", "related")

        asyncio.ensure_future(_post_pipeline(incident_id, is_new, escalated_severity))

        return result


async def _post_pipeline(incident_id: str, is_new: bool, escalated_severity: bool) -> None:
    """Fire-and-forget post-ingest calls to BE2 services."""
    # recommend.plan
    if is_new or escalated_severity:
        try:
            from app.services.recommend import plan as recommend_plan  # type: ignore
            await recommend_plan(incident_id)
        except ImportError:
            pass
        except Exception as exc:
            logger.debug("recommend.plan failed: %s", exc)

    # sla.evaluate_incident
    try:
        from app.services.sla import evaluate_incident  # type: ignore
        await evaluate_incident(incident_id)
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("sla.evaluate_incident failed: %s", exc)

    # notify
    try:
        from app.services.notify import route as notify_route  # type: ignore
        event = "incident.created" if is_new else ("incident.escalated" if escalated_severity else None)
        if event:
            await notify_route(event, incident_id, {})
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("notify.route failed: %s", exc)

    # publish WS
    await publish_incident(incident_id)

    # publish report.new
    try:
        from app.core.events import bus  # type: ignore
        # minimal broadcast — full shape not available here
        await bus.publish("report.new", {"incident_id": incident_id})
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("bus.publish report.new failed: %s", exc)
