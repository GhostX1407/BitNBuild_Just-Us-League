"""ResQGrid — Resource Recommendation Engine.

Matches incidents to available units and facilities using requirement templates
and multi-factor scoring:
    score = 0.45 * proximity + 0.25 * capability + 0.15 * readiness + 0.15 * load_balance
Exposes:
    plan(incident_id: str, exclude_unit_ids: Optional[List[str]] = None) -> dict
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import delete, select

from app.core.config import settings
from app.db.models import Assignment, Facility, Incident, Shortage, Unit
from app.db.session import SessionLocal
from app.services.geo import eta_minutes, haversine_km

logger = logging.getLogger(__name__)

TEMPLATES_PATH = Path(__file__).parent.parent / "data" / "templates.json"


def _load_templates() -> Dict[str, Any]:
    try:
        if TEMPLATES_PATH.exists():
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as exc:
        logger.warning("Failed to load templates.json: %s", exc)
    return {}


_TEMPLATES_CACHE = _load_templates()


def _is_unit_match(unit: Unit, subtype: str) -> bool:
    """Check if a unit matches a requirement subtype."""
    if unit.kind == subtype:
        return True
    if subtype in (unit.capabilities or []):
        return True
    # Aliases
    if subtype == "fire_crew" and unit.kind in ("engine", "fire_crew"):
        return True
    if subtype == "police" and unit.kind in ("police", "traffic"):
        return True
    return False


def _is_facility_match(facility: Facility, subtype: str) -> bool:
    """Check if a facility matches a requirement subtype."""
    if facility.kind == subtype:
        return True
    if subtype in (facility.capabilities or []):
        return True
    return False


async def plan(incident_id: str, exclude_unit_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Generate or update resource recommendation plan for an incident.

    Creates/refreshes Assignment rows (status='recommended') and Shortage rows.
    Returns:
        {"items": [{"requirement": {...}, "matches": [...], "shortage": int}]}
    """
    templates = _TEMPLATES_CACHE or _load_templates()
    requirements_cfg = templates.get("requirements", {})

    async with SessionLocal() as session:
        incident = await session.get(Incident, incident_id)
        if not incident:
            logger.warning("recommend.plan: Incident %s not found", incident_id)
            return {"items": []}

        inc_lat = incident.lat or settings.DEFAULT_CITY_LAT
        inc_lng = incident.lng or settings.DEFAULT_CITY_LNG

        # 1. Get requirements for incident type and severity
        type_reqs = requirements_cfg.get(incident.type, {})
        req_list = type_reqs.get(str(incident.severity), [])

        # Fallback if no specific template found
        if not req_list:
            req_list = [
                {"kind": "vehicle", "subtype": "ambulance", "qty": 1, "mandatory": True},
                {"kind": "team", "subtype": "police", "qty": 1, "mandatory": False},
            ]

        # 2. Clear previous 'recommended' assignments and shortages for this incident
        await session.execute(
            delete(Assignment)
            .where(Assignment.incident_id == incident.id)
            .where(Assignment.status == "recommended")
        )
        await session.execute(
            delete(Shortage)
            .where(Shortage.incident_id == incident.id)
            .where(Shortage.resolved_at.is_(None))
        )

        # Query all available units
        unit_query = select(Unit).where(Unit.status == "available")
        if exclude_unit_ids:
            unit_query = unit_query.where(Unit.id.not_in(exclude_unit_ids))
        avail_units_res = await session.execute(unit_query)
        all_available_units = avail_units_res.scalars().all()

        # Query all facilities
        fac_res = await session.execute(select(Facility))
        all_facilities = fac_res.scalars().all()

        items_out: List[Dict[str, Any]] = []
        assigned_unit_ids_this_run: set[str] = set()

        # 3. Match resources per requirement
        for req in req_list:
            kind = req.get("kind", "vehicle")
            subtype = req.get("subtype", "")
            qty = req.get("qty", 1)
            mandatory = req.get("mandatory", True)

            matched_records: List[Dict[str, Any]] = []

            if kind in ("team", "vehicle"):
                # Filter matching units
                candidate_units = [
                    u for u in all_available_units
                    if u.id not in assigned_unit_ids_this_run and _is_unit_match(u, subtype)
                ]

                # Score each candidate
                scored_units = []
                for u in candidate_units:
                    u_lat = u.lat or settings.DEFAULT_CITY_LAT
                    u_lng = u.lng or settings.DEFAULT_CITY_LNG
                    dist_km = haversine_km(inc_lat, inc_lng, u_lat, u_lng)

                    # Proximity score (0 to 1, max radius 30 km)
                    prox_score = max(0.0, 1.0 - (dist_km / 30.0))

                    # Capability score
                    cap_score = 1.0 if u.kind == subtype else 0.85

                    # Readiness score
                    readiness_score = max(0.0, 1.0 - (u.fatigue or 0.0))

                    # Load balance
                    load_score = 0.85

                    total_score = (
                        0.45 * prox_score +
                        0.25 * cap_score +
                        0.15 * readiness_score +
                        0.15 * load_score
                    )

                    speed = u.speed_kmh or 40.0
                    eta = eta_minutes(dist_km, speed)

                    breakdown = {
                        "proximity": round(prox_score, 3),
                        "capability": round(cap_score, 3),
                        "readiness": round(readiness_score, 3),
                        "load": round(load_score, 3),
                    }
                    scored_units.append((total_score, dist_km, eta, breakdown, u))

                # Sort by highest score, then lowest ETA
                scored_units.sort(key=lambda x: (-x[0], x[2]))

                picked = scored_units[:qty]
                for sc, dist, eta, bdown, u in picked:
                    assigned_unit_ids_this_run.add(u.id)
                    asgn = Assignment(
                        id=str(uuid4()),
                        incident_id=incident.id,
                        unit_id=u.id,
                        requirement_key=subtype,
                        score=round(sc, 3),
                        score_breakdown=bdown,
                        eta_min=round(eta, 1),
                        status="recommended",
                        target_name=u.name,
                        kind=u.kind,
                    )
                    session.add(asgn)

                    matched_records.append({
                        "unit_id": u.id,
                        "facility_id": None,
                        "name": u.name,
                        "eta_min": round(eta, 1),
                        "dist_km": round(dist, 2),
                        "score": round(sc, 3),
                        "breakdown": bdown,
                    })

                shortage_count = max(0, qty - len(picked))
                if shortage_count > 0:
                    sh = Shortage(
                        id=str(uuid4()),
                        incident_id=incident.id,
                        subtype=subtype,
                        qty_missing=shortage_count,
                    )
                    session.add(sh)

                items_out.append({
                    "requirement": req,
                    "matches": matched_records,
                    "shortage": shortage_count,
                })

            elif kind == "facility":
                # Filter eligible facilities
                eligible_facs = [
                    f for f in all_facilities
                    if not f.on_diversion and f.beds_free > 0 and _is_facility_match(f, subtype)
                ]

                scored_facs = []
                for f in eligible_facs:
                    f_lat = f.lat or settings.DEFAULT_CITY_LAT
                    f_lng = f.lng or settings.DEFAULT_CITY_LNG
                    dist_km = haversine_km(inc_lat, inc_lng, f_lat, f_lng)

                    prox_score = max(0.0, 1.0 - (dist_km / 30.0))
                    cap_score = 1.0 if subtype in (f.capabilities or []) else 0.8
                    readiness_score = min(1.0, f.beds_free / max(1, f.beds_total))
                    load_score = 0.8

                    total_score = (
                        0.45 * prox_score +
                        0.25 * cap_score +
                        0.15 * readiness_score +
                        0.15 * load_score
                    )
                    eta = eta_minutes(dist_km, 50.0)

                    breakdown = {
                        "proximity": round(prox_score, 3),
                        "capability": round(cap_score, 3),
                        "readiness": round(readiness_score, 3),
                        "load": round(load_score, 3),
                    }
                    scored_facs.append((total_score, dist_km, eta, breakdown, f))

                scored_facs.sort(key=lambda x: (-x[0], x[2]))

                picked_facs = scored_facs[:qty]
                for sc, dist, eta, bdown, f in picked_facs:
                    asgn = Assignment(
                        id=str(uuid4()),
                        incident_id=incident.id,
                        facility_id=f.id,
                        requirement_key=subtype,
                        score=round(sc, 3),
                        score_breakdown=bdown,
                        eta_min=round(eta, 1),
                        status="recommended",
                        target_name=f.name,
                        kind=f.kind,
                    )
                    session.add(asgn)

                    matched_records.append({
                        "unit_id": None,
                        "facility_id": f.id,
                        "name": f.name,
                        "eta_min": round(eta, 1),
                        "dist_km": round(dist, 2),
                        "score": round(sc, 3),
                        "breakdown": bdown,
                    })

                shortage_count = max(0, qty - len(picked_facs))
                if shortage_count > 0:
                    sh = Shortage(
                        id=str(uuid4()),
                        incident_id=incident.id,
                        subtype=subtype,
                        qty_missing=shortage_count,
                    )
                    session.add(sh)

                items_out.append({
                    "requirement": req,
                    "matches": matched_records,
                    "shortage": shortage_count,
                })

        await session.commit()

    # 4. Handle AUTO_DISPATCH_P1
    if settings.AUTO_DISPATCH_P1 and incident.priority == "P1":
        try:
            from app.services.dispatch import approve
            await approve(incident_id=incident.id, all_assignments=True)
            logger.info("AUTO_DISPATCH_P1 triggered for P1 incident %s", incident.code)
        except Exception as exc:
            logger.warning("AUTO_DISPATCH_P1 failed: %s", exc)

    # 5. Broadcast updated incident state via pipeline
    try:
        from app.services.pipeline import publish_incident
        await publish_incident(incident_id)
    except Exception as exc:
        logger.debug("recommend.plan: publish_incident failed: %s", exc)

    return {"items": items_out}
