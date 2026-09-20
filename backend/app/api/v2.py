"""ResQGrid v2 — Weather feed, Incident replay, Cascading-risk, Verification,
Evacuation/Shelter routing, Unit re-allocation APIs."""
from __future__ import annotations

import datetime
import logging
import math
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import require_roles
from app.db.models import AuditEvent, Facility, Incident, Report, Unit
from app.db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["v2"], dependencies=[Depends(require_roles("dispatcher"))])


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two lat/lng points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# 1. Weather feed (Open-Meteo — free, no API key)
# ---------------------------------------------------------------------------

@router.get("/weather", response_model=Dict[str, Any])
async def get_weather(
    lat: float = Query(22.30),
    lng: float = Query(73.19),
) -> Dict[str, Any]:
    """Current + 24 h forecast from Open-Meteo for the specified location."""
    try:
        import httpx
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code"
            f"&hourly=temperature_2m,precipitation_probability,wind_speed_10m"
            f"&forecast_days=1&timezone=Asia%2FKolkata"
        )
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        # Parse weather_code → risk hint
        wc = data.get("current", {}).get("weather_code", 0)
        if wc >= 95:
            risk = "high"  # thunderstorm
        elif wc >= 61:
            risk = "moderate"  # rain
        elif wc >= 51:
            risk = "low"  # drizzle
        else:
            risk = "none"

        current = data.get("current", {})
        hourly = data.get("hourly", {})

        return {
            "lat": lat,
            "lng": lng,
            "current": {
                "temp_c": current.get("temperature_2m"),
                "humidity_pct": current.get("relative_humidity_2m"),
                "wind_kmh": current.get("wind_speed_10m"),
                "precip_mm": current.get("precipitation"),
                "weather_code": wc,
                "risk": risk,
            },
            "hourly": {
                "times": (hourly.get("time") or [])[:24],
                "temp_c": (hourly.get("temperature_2m") or [])[:24],
                "precip_prob_pct": (hourly.get("precipitation_probability") or [])[:24],
                "wind_kmh": (hourly.get("wind_speed_10m") or [])[:24],
            },
            "fetched_at": _now_utc().isoformat(),
        }
    except Exception as exc:
        logger.warning("Weather fetch failed: %s", exc)
        # Return degraded mock
        return {
            "lat": lat,
            "lng": lng,
            "current": {"temp_c": 32, "humidity_pct": 65, "wind_kmh": 12, "precip_mm": 0, "weather_code": 0, "risk": "none"},
            "hourly": {},
            "fetched_at": _now_utc().isoformat(),
            "degraded": True,
        }


# ---------------------------------------------------------------------------
# 2. Incident replay (historical snapshot sequence)
# ---------------------------------------------------------------------------

@router.get("/incidents/{incident_id}/replay", response_model=Dict[str, Any])
async def incident_replay(
    incident_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Return an ordered sequence of state snapshots for timeline replay."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Fetch audit events for this incident
    res = await session.execute(
        select(AuditEvent)
        .where(AuditEvent.entity_id == incident_id)
        .order_by(AuditEvent.ts.asc())
        .limit(200)
    )
    audit_rows = res.scalars().all()

    # Fetch reports linked to this incident
    rep_res = await session.execute(
        select(Report)
        .where(Report.incident_id == incident_id)
        .order_by(Report.created_at.asc())
    )
    reports = rep_res.scalars().all()

    snapshots = []

    # Seed snapshot from creation
    snapshots.append({
        "ts": _iso(incident.created_at),
        "event": "incident.created",
        "actor": "system",
        "data": {
            "code": incident.code,
            "type": incident.type,
            "severity": incident.severity,
            "status": "new",
            "lat": incident.lat,
            "lng": incident.lng,
        },
    })

    for r in reports:
        snapshots.append({
            "ts": _iso(r.created_at),
            "event": "report.ingested",
            "actor": r.source,
            "data": {
                "source": r.source,
                "text": (r.text or "")[:120],
                "lat": r.lat,
                "lng": r.lng,
            },
        })

    for a in audit_rows:
        if a.action not in ("incident.created",):  # avoid duplicate creation
            snapshots.append({
                "ts": _iso(a.ts),
                "event": a.action,
                "actor": a.actor,
                "data": a.data or {},
            })

    # Sort by timestamp
    snapshots.sort(key=lambda x: x["ts"] or "")

    return {
        "incident_id": incident_id,
        "code": incident.code,
        "title": incident.title,
        "snapshots": snapshots,
        "total": len(snapshots),
    }


# ---------------------------------------------------------------------------
# 3. Cascading-risk analysis
# ---------------------------------------------------------------------------

@router.post("/incidents/{incident_id}/cascade", response_model=Dict[str, Any])
async def cascade_risk(
    incident_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """AI-generated cascading risk analysis for an incident."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Find nearby incidents (within 3 km radius) for context
    nearby = []
    radius_km = 3.0
    if incident.lat and incident.lng:
        res = await session.execute(
            select(Incident)
            .where(Incident.id != incident_id)
            .where(Incident.status.notin_(["resolved", "closed"]))
            .limit(50)
        )
        for other in res.scalars().all():
            if other.lat and other.lng:
                d = _haversine(incident.lat, incident.lng, other.lat, other.lng)
                if d <= radius_km:
                    nearby.append(f"[{other.code}] {other.type} — {other.status} ({d:.1f}km away)")

    nearby_ctx = "\n".join(nearby) if nearby else "None"

    try:
        from app.core.llm import complete_json
        result = await complete_json(
            prompt=(
                f"Analyze cascading risks for this emergency incident.\n"
                f"Incident: {incident.title}\nType: {incident.type}\nSeverity: {incident.severity}/5\n"
                f"Hazards: {incident.hazards or []}\nNearby active incidents:\n{nearby_ctx}\n"
                f"Return JSON: {{\"risks\": [{{\"risk\": \"<desc>\", \"probability\": \"high|medium|low\", "
                f"\"mitigation\": \"<action>\"}}], \"overall_cascade_level\": \"high|medium|low\", "
                f"\"immediate_action\": \"<one sentence>\"}}"
            ),
            system="You are an emergency risk assessment AI. Identify cascading failure modes.",
        )
    except Exception:
        result = None

    if not result:
        result = {
            "risks": [{"risk": "Secondary ignition from primary fire", "probability": "medium", "mitigation": "Establish fire perimeter"}],
            "overall_cascade_level": "medium",
            "immediate_action": "Monitor adjacent structures and utilities.",
        }

    result["incident_id"] = incident_id
    result["nearby_active_count"] = len(nearby)

    # Log to audit
    try:
        audit = AuditEvent(
            actor="ai",
            action="incident.cascade_analysis",
            entity="incident",
            entity_id=incident_id,
            data={"cascade_level": result.get("overall_cascade_level")},
        )
        session.add(audit)
        await session.commit()
    except Exception:
        pass

    return result


# ---------------------------------------------------------------------------
# 4. AI Verification badge
# ---------------------------------------------------------------------------

@router.post("/reports/{report_id}/verify", response_model=Dict[str, Any])
async def verify_report(
    report_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """AI verification of a report (text + optional photo). Updates incident verification_status."""
    report = await session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    verification: Dict[str, Any] = {"method": "text_only", "confidence": 0.5, "status": "unverified"}

    # Phase 1: Photo vision analysis (if photo_url set)
    if report.photo_url:
        try:
            import httpx
            from app.core.llm import complete_json_vision
            # Fetch the photo
            photo_url = report.photo_url
            if not photo_url.startswith("http"):
                # Local path — read from uploads
                from pathlib import Path
                uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
                fname = photo_url.lstrip("/").replace("api/uploads/", "")
                fpath = uploads_dir / fname
                if fpath.exists():
                    img_bytes = fpath.read_bytes()
                    mime = "image/jpeg"
                else:
                    img_bytes = None
                    mime = "image/jpeg"
            else:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    r = await client.get(photo_url)
                    img_bytes = r.content
                    mime = r.headers.get("content-type", "image/jpeg")

            if img_bytes:
                result = await complete_json_vision(
                    prompt=(
                        f"This photo was submitted with an emergency report claiming: '{(report.text or '')[:300]}'. "
                        f"Analyze the image for emergency validity.\n"
                        f"Return JSON: {{\"authentic\": true/false, \"emergency_type\": \"<type or none>\", "
                        f"\"confidence\": 0.0-1.0, \"notes\": \"<brief observation>\"}}"
                    ),
                    image_bytes=img_bytes,
                    mime=mime,
                )
                if result:
                    auth = result.get("authentic", False)
                    conf = float(result.get("confidence", 0.5))
                    verification = {
                        "method": "vision_ai",
                        "authentic": auth,
                        "confidence": conf,
                        "emergency_type": result.get("emergency_type"),
                        "notes": result.get("notes"),
                        "status": "verified" if (auth and conf >= 0.6) else "suspicious",
                    }
        except Exception as exc:
            logger.warning("Vision verification failed: %s", exc)

    # Phase 2: Text credibility analysis
    if verification["method"] == "text_only" and report.text:
        try:
            from app.core.llm import complete_json
            result = await complete_json(
                prompt=(
                    f"Assess emergency report credibility.\nSource: {report.source}\n"
                    f"Text: {(report.text or '')[:400]}\n"
                    f"Return JSON: {{\"credible\": true/false, \"confidence\": 0.0-1.0, "
                    f"\"reason\": \"<brief>\", \"verification_status\": \"verified|needs_more_info|suspicious\"}}"
                ),
                system="Emergency report credibility analyst.",
            )
            if result:
                verification = {
                    "method": "text_ai",
                    "credible": result.get("credible", True),
                    "confidence": float(result.get("confidence", 0.6)),
                    "reason": result.get("reason"),
                    "status": result.get("verification_status", "verified"),
                }
        except Exception:
            verification["status"] = "needs_more_info"

    # Save verification to report
    report.verification = verification
    # Update incident verification status
    v_status = verification.get("status", "needs_verification")
    if report.incident_id:
        incident = await session.get(Incident, report.incident_id)
        if incident:
            incident.verification_status = v_status
            _audit_row = AuditEvent(
                actor="ai",
                action="report.verified",
                entity="report",
                entity_id=report_id,
                data={"method": verification["method"], "status": v_status, "confidence": verification.get("confidence")},
            )
            session.add(_audit_row)

    await session.commit()
    return {"report_id": report_id, "verification": verification}


# ---------------------------------------------------------------------------
# 5. Evacuation / Shelter routing
# ---------------------------------------------------------------------------

@router.get("/evacuation/shelters", response_model=Dict[str, Any])
async def nearest_shelters(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(10.0),
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Find nearest open shelters and hospitals with available capacity."""
    shelter_kinds = {"shelter", "hospital"}
    res = await session.execute(
        select(Facility).where(Facility.kind.in_(shelter_kinds))
    )
    facilities = res.scalars().all()

    results = []
    for f in facilities:
        if f.lat is None or f.lng is None:
            continue
        dist = _haversine(lat, lng, f.lat, f.lng)
        if dist <= radius_km:
            results.append({
                "id": f.id,
                "name": f.name,
                "kind": f.kind,
                "lat": f.lat,
                "lng": f.lng,
                "distance_km": round(dist, 2),
                "beds_free": f.beds_free,
                "on_diversion": f.on_diversion,
                "contact": f.contact,
                "available": f.beds_free > 0 and not f.on_diversion,
            })

    results.sort(key=lambda x: x["distance_km"])

    return {
        "lat": lat,
        "lng": lng,
        "radius_km": radius_km,
        "shelters": results,
        "total": len(results),
    }


# ---------------------------------------------------------------------------
# 6. Unit re-allocation
# ---------------------------------------------------------------------------

class ReallocateBody(BaseModel):
    unit_id: str
    from_incident_id: str
    to_incident_id: str
    reason: Optional[str] = None
    actor: Optional[str] = None


@router.post("/reallocate", response_model=Dict[str, Any])
async def reallocate_unit(
    body: ReallocateBody,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Re-allocate a unit from one incident to another with audit log."""
    unit = await session.get(Unit, body.unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    from_inc = await session.get(Incident, body.from_incident_id)
    to_inc = await session.get(Incident, body.to_incident_id)
    if not to_inc:
        raise HTTPException(status_code=404, detail="Target incident not found")

    # Update unit's current assignment
    unit.current_incident_id = body.to_incident_id
    unit.updated_at = _now_utc()

    # Update assignment records
    from app.db.models import Assignment
    # Mark old assignment as completed
    old_asgn_res = await session.execute(
        select(Assignment)
        .where(Assignment.incident_id == body.from_incident_id)
        .where(Assignment.unit_id == body.unit_id)
        .where(Assignment.status.notin_(["completed", "cancelled"]))
    )
    for asgn in old_asgn_res.scalars().all():
        asgn.status = "completed"
        asgn.completed_at = _now_utc()

    audit = AuditEvent(
        actor=body.actor or "dispatcher",
        action="unit.reallocated",
        entity="unit",
        entity_id=body.unit_id,
        data={
            "unit_name": unit.name,
            "from_incident": body.from_incident_id,
            "to_incident": body.to_incident_id,
            "reason": body.reason,
        },
    )
    session.add(audit)
    await session.commit()

    # Publish WS events
    try:
        from app.core.events import bus
        await bus.publish("unit.reallocated", {
            "unit_id": body.unit_id,
            "from_incident_id": body.from_incident_id,
            "to_incident_id": body.to_incident_id,
        })
        from app.services.pipeline import publish_incident
        if from_inc:
            await publish_incident(body.from_incident_id)
        await publish_incident(body.to_incident_id)
    except Exception:
        pass

    return {
        "unit_id": body.unit_id,
        "unit_name": unit.name,
        "from_incident_id": body.from_incident_id,
        "to_incident_id": body.to_incident_id,
        "to_incident_code": to_inc.code if to_inc else None,
        "reason": body.reason,
        "ts": _now_utc().isoformat(),
    }
