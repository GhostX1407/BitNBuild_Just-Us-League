"""ResQGrid — Live Emergency Simulator & Scenario Engine.

Provides:
    (a) Unit Mover: Interpolates en_route units toward incidents every 2s.
    (b) Autopilot: Auto-advances approved assignments (approved -> en_route -> arrived -> completed).
    (c) Ambient Feed: Ingests low-severity reports every 25-40s.
    (d) Scenarios: Scripted realistic scenarios (flood, chemical_fire, pileup).
    (e) Demo Controls: sensor-breach, duplicate-burst, fast-forward, reset.
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import math
import random
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import delete, select, update

from app.core.config import settings
from app.core.events import bus
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
from app.db.session import SessionLocal
from app.services import dispatch
from app.services.geo import haversine_km

logger = logging.getLogger(__name__)

# Simulator state
_sim_state: Dict[str, Any] = {
    "running": False,
    "scenario": None,
    "message": "Ready",
    "autopilot": True,
    "ambient": False,
}

_mover_task: Optional[asyncio.Task] = None
_ambient_task: Optional[asyncio.Task] = None
_scenario_task: Optional[asyncio.Task] = None


def get_state() -> Dict[str, Any]:
    return dict(_sim_state)


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ---------------------------------------------------------------------------
# Unit Mover & Autopilot Loop (every 2 seconds)
# ---------------------------------------------------------------------------

async def _mover_loop() -> None:
    logger.info("Unit mover loop started")
    while True:
        try:
            now = _now_utc()
            async with SessionLocal() as session:
                # 1. Autopilot: Auto-accept approved assignments after 3-5 seconds
                if _sim_state["autopilot"]:
                    appr_query = select(Assignment).where(
                        Assignment.status == "approved",
                        Assignment.approved_at.is_not(None),
                    )
                    appr_res = await session.execute(appr_query)
                    approved_asgns = appr_res.scalars().all()

                    for a in approved_asgns:
                        if a.approved_at:
                            elapsed = (now - a.approved_at).total_seconds()
                            if elapsed >= 3.0:
                                # Advance to en_route
                                asyncio.create_task(dispatch.set_status(a.id, "en_route"))

                # 2. Move en_route units toward incident coordinates
                enroute_query = (
                    select(Assignment, Unit, Incident)
                    .join(Unit, Assignment.unit_id == Unit.id)
                    .join(Incident, Assignment.incident_id == Incident.id)
                    .where(Assignment.status == "en_route")
                )
                enroute_res = await session.execute(enroute_query)
                enroute_triplets = enroute_res.all()

                for asgn, unit, inc in enroute_triplets:
                    if inc.lat and inc.lng and unit.lat and unit.lng:
                        dist = haversine_km(unit.lat, unit.lng, inc.lat, inc.lng)

                        # Speed: km/h -> km per second * 2s tick * speedup factor
                        speed = unit.speed_kmh or 45.0
                        step_km = (speed / 3600.0) * 2.0 * (1.0 / max(0.1, settings.SLA_TIME_SCALE))

                        if dist <= 0.15 or dist <= step_km:
                            # Arrived at incident!
                            unit.lat = inc.lat
                            unit.lng = inc.lng
                            await session.commit()
                            asyncio.create_task(dispatch.set_status(asgn.id, "arrived"))
                        else:
                            # Interpolate towards incident
                            ratio = min(1.0, step_km / dist)
                            unit.lat += (inc.lat - unit.lat) * ratio
                            unit.lng += (inc.lng - unit.lng) * ratio
                            unit.updated_at = now
                            await session.commit()

                            # Broadcast unit position update
                            u_dict = {
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
                            await bus.publish("unit.update", u_dict)

                # 3. Autopilot: Auto-complete arrived units after 20-30 seconds on-scene
                if _sim_state["autopilot"]:
                    arrived_query = select(Assignment).where(
                        Assignment.status == "arrived",
                        Assignment.arrived_at.is_not(None),
                    )
                    arrived_res = await session.execute(arrived_query)
                    arrived_asgns = arrived_res.scalars().all()

                    for a in arrived_asgns:
                        if a.arrived_at:
                            elapsed = (now - a.arrived_at).total_seconds()
                            if elapsed >= (25.0 * settings.SLA_TIME_SCALE):
                                asyncio.create_task(dispatch.set_status(a.id, "completed"))

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("Error in unit mover loop: %s", exc)

        await asyncio.sleep(2.0)


# ---------------------------------------------------------------------------
# Ambient Feed Loop
# ---------------------------------------------------------------------------

AMBIENT_REPORTS = [
    {"text": "Minor motorcycle skid near Alkapuri RC Dutt Road, rider has minor scrapes", "lat": 22.3119, "lng": 73.1723, "source": "citizen"},
    {"text": "Tree branch fallen on electricity wire in Gotri, minor sparks", "lat": 22.3385, "lng": 73.1580, "source": "citizen"},
    {"text": "Traffic slowdown near Panigate due to delivery truck breakdown", "lat": 22.3020, "lng": 73.2003, "source": "citizen"},
    {"text": "Small garbage fire on empty plot near Manjalpur, white smoke", "lat": 22.2736, "lng": 73.1917, "source": "citizen"},
    {"text": "Water leakage from municipal pipeline near Karelibaug water tank", "lat": 22.3246, "lng": 73.2025, "source": "citizen"},
]


async def _ambient_loop() -> None:
    logger.info("Ambient feed loop started")
    while True:
        try:
            if _sim_state["ambient"]:
                rep_data = random.choice(AMBIENT_REPORTS)
                from app.services.pipeline import ingest_report
                await ingest_report(rep_data["source"], {
                    "text": rep_data["text"],
                    "lat": rep_data["lat"] + random.uniform(-0.002, 0.002),
                    "lng": rep_data["lng"] + random.uniform(-0.002, 0.002),
                })
                logger.info("Ambient report ingested: %s", rep_data["text"][:40])
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("Error in ambient feed: %s", exc)

        await asyncio.sleep(random.uniform(25.0, 40.0))


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

async def _run_flood_scenario() -> None:
    """Scripted Flood Scenario: Vishwamitri River gauge breach + 6 citizen reports + 2 calls."""
    _sim_state["scenario"] = "flood"
    _sim_state["message"] = "Flood scenario running: Vishwamitri River gauge breach..."
    await bus.publish("sim.state", get_state())

    from app.services.pipeline import ingest_report

    # 1. Sensor breach at Vishwamitri
    async with SessionLocal() as session:
        sensor = await session.get(Sensor, "sensor-fld-001")
        if sensor:
            sensor.last_value = 9.4
            sensor.state = "breach"
            sensor.last_at = _now_utc()
            await session.commit()
            await bus.publish("sensor.update", {
                "id": sensor.id, "kind": sensor.kind, "last_value": 9.4, "state": "breach",
                "threshold": sensor.threshold, "unit": sensor.unit, "lat": sensor.lat, "lng": sensor.lng
            })

    # Sensor report
    await ingest_report("sensor", {
        "sensor_id": "sensor-fld-001",
        "kind": "flood_gauge",
        "value": 9.4,
        "unit": "m",
        "threshold": 8.0,
        "lat": 22.3102,
        "lng": 73.1888,
    })

    await asyncio.sleep(2.0)

    # 2. Citizen reports (within 300m to merge into 1 incident)
    reports = [
        "Water level in Vishwamitri river rising dangerously fast, water starting to enter ground floor homes near bridge!",
        "Vishwamitri riverside completely flooded, current is very strong and 4 cars are submerged!",
        "Water has breached embankments near Sayajibaug, families stranded on rooftops, need evacuation boats urgently!",
        "Severe flood inundation near Vishwamitri bridge, elderly people and children stuck inside house with water up to waist!",
        "Urgent: Water levels over 5 feet near riverside colony, people shouting for rescue!",
        "Flood water entering our society near Vishwamitri, electricity transformer sparking!",
    ]

    for text in reports:
        await ingest_report("citizen", {
            "text": text,
            "lat": 22.3100 + random.uniform(-0.0015, 0.0015),
            "lng": 73.1880 + random.uniform(-0.0015, 0.0015),
            "location_text": "Vishwamitri Riverside",
            "phone": "+91-98765-11223",
        })
        await asyncio.sleep(1.5)

    # 3. Emergency calls
    calls = [
        "Caller: Please help us! The river has overflowed into our lane near Sayajibaug, water is waist-deep and rising fast!",
        "Caller: We are 5 people trapped on the first floor near Vishwamitri bridge, current is too strong to swim, send boats!",
    ]
    for transcript in calls:
        await ingest_report("call", {
            "transcript": transcript,
            "caller_phone": "+91-98765-44332",
            "lat": 22.3105,
            "lng": 73.1882,
            "location_text": "Vishwamitri Bridge",
        })
        await asyncio.sleep(2.0)

    # 4. Field report
    await ingest_report("field", {
        "text": "Unit on scene at Vishwamitri North confirms major river breach, over 30 houses submerged, rescue boats and shelter required immediately.",
        "lat": 22.3100,
        "lng": 73.1880,
    })

    _sim_state["message"] = "Flood scenario complete: Reports merged into P1 Flood incident."
    await bus.publish("sim.state", get_state())


async def _run_chemical_fire_scenario() -> None:
    """Scripted Chemical Fire Scenario: Makarpura GIDC, exhausts HazMat capacity -> creates shortage & escalation."""
    _sim_state["scenario"] = "chemical_fire"
    _sim_state["message"] = "Chemical fire scenario running in Makarpura GIDC..."
    await bus.publish("sim.state", get_state())

    from app.services.pipeline import ingest_report

    # 1. Sensor breach
    async with SessionLocal() as session:
        s1 = await session.get(Sensor, "sensor-gas-001")
        s2 = await session.get(Sensor, "sensor-smk-001")
        if s1:
            s1.last_value = 85.0
            s1.state = "breach"
            s1.last_at = _now_utc()
        if s2:
            s2.last_value = 65.0
            s2.state = "breach"
            s2.last_at = _now_utc()
        await session.commit()

    await ingest_report("sensor", {
        "sensor_id": "sensor-gas-001", "kind": "gas", "value": 85.0, "unit": "ppm", "threshold": 50.0,
        "lat": 22.2510, "lng": 73.1889,
    })

    await asyncio.sleep(2.0)

    # 2. Citizen reports
    reports = [
        "Massive chemical explosion at industrial polymer plant in Makarpura GIDC! Thick toxic black smoke spreading!",
        "Toxic chemical fumes spreading from Makarpura factory fire, workers running out coughing and vomiting!",
        "Severe chemical fire with secondary explosions in Makarpura GIDC, multiple burn casualties on road!",
        "Toxic chemical gas cloud spreading towards residential area of Makarpura, urgent HazMat containment needed!",
        "Factory roof collapsed in flames at GIDC chemical unit, at least 8 workers trapped inside with toxic chemicals!",
    ]
    for text in reports:
        await ingest_report("citizen", {
            "text": text,
            "lat": 22.2510 + random.uniform(-0.001, 0.001),
            "lng": 73.1889 + random.uniform(-0.001, 0.001),
            "location_text": "Makarpura GIDC",
        })
        await asyncio.sleep(1.5)

    # 3. Emergency calls
    await ingest_report("call", {
        "transcript": "Caller: Emergency! Plant safety manager here. We have a major benzene and solvent fire at Makarpura Unit 4, multiple severe chemical burns, we need specialized HazMat team and burn ambulances immediately!",
        "caller_phone": "+91-98765-77889",
        "lat": 22.2512,
        "lng": 73.1890,
    })

    _sim_state["message"] = "Chemical fire complete: High HazMat & burn demand created shortage and escalation."
    await bus.publish("sim.state", get_state())


async def _run_pileup_scenario() -> None:
    """Scripted Highway Pileup Scenario on NH48 Bypass."""
    _sim_state["scenario"] = "pileup"
    _sim_state["message"] = "Highway pileup scenario running on NH48 Bypass..."
    await bus.publish("sim.state", get_state())

    from app.services.pipeline import ingest_report

    # Traffic sensor breach
    async with SessionLocal() as session:
        s = await session.get(Sensor, "sensor-trf-001")
        if s:
            s.last_value = 95.0
            s.state = "breach"
            s.last_at = _now_utc()
            await session.commit()

    reports = [
        "Multi-vehicle crash on NH48 Bypass near Makarpura flyover, luxury bus collided with oil tanker and 4 cars!",
        "Severe highway pileup on NH48, people crushed inside vehicles, fuel leaking onto the highway, need cutters!",
        "NH48 completely blocked both sides, heavy casualties in bus accident, ambulances needed immediately!",
        "Traffic at standstill on NH48 Vadodara bypass, multiple passengers severely injured, need crane to lift car!",
    ]
    for text in reports:
        await ingest_report("citizen", {
            "text": text,
            "lat": 22.2850 + random.uniform(-0.001, 0.001),
            "lng": 73.1600 + random.uniform(-0.001, 0.001),
            "location_text": "NH48 Bypass",
        })
        await asyncio.sleep(1.5)

    _sim_state["message"] = "Highway pileup complete: Road accident incident created."
    await bus.publish("sim.state", get_state())


# ---------------------------------------------------------------------------
# Demo Controls
# ---------------------------------------------------------------------------

def start_sim() -> Dict[str, Any]:
    _sim_state["running"] = True
    _sim_state["ambient"] = True
    _sim_state["autopilot"] = True
    _sim_state["message"] = "Simulator running (Ambient + Autopilot active)"
    asyncio.create_task(bus.publish("sim.state", get_state()))
    return get_state()


def stop_sim() -> Dict[str, Any]:
    _sim_state["running"] = False
    _sim_state["ambient"] = False
    _sim_state["message"] = "Simulator paused"
    asyncio.create_task(bus.publish("sim.state", get_state()))
    return get_state()


def run_scenario(name: str) -> Dict[str, Any]:
    global _scenario_task
    if name == "flood":
        _scenario_task = asyncio.create_task(_run_flood_scenario())
    elif name == "chemical_fire":
        _scenario_task = asyncio.create_task(_run_chemical_fire_scenario())
    elif name == "pileup":
        _scenario_task = asyncio.create_task(_run_pileup_scenario())
    else:
        return {"error": f"Unknown scenario: {name}"}

    return {"status": "started", "scenario": name}


async def trigger_sensor_breach(sensor_id: Optional[str] = None) -> Dict[str, Any]:
    """Force an IoT sensor into breach state and ingest report."""
    target_id = sensor_id or "sensor-fld-001"
    async with SessionLocal() as session:
        sensor = await session.get(Sensor, target_id)
        if not sensor:
            return {"error": "Sensor not found"}

        sensor.last_value = (sensor.threshold or 8.0) + 1.8
        sensor.state = "breach"
        sensor.last_at = _now_utc()
        await session.commit()

        s_dict = {
            "id": sensor.id,
            "kind": sensor.kind,
            "last_value": sensor.last_value,
            "state": sensor.state,
            "threshold": sensor.threshold,
            "unit": sensor.unit,
            "lat": sensor.lat,
            "lng": sensor.lng,
        }
        await bus.publish("sensor.update", s_dict)

    from app.services.pipeline import ingest_report
    await ingest_report("sensor", {
        "sensor_id": sensor.id,
        "kind": sensor.kind,
        "value": sensor.last_value,
        "unit": sensor.unit,
        "threshold": sensor.threshold,
        "lat": sensor.lat,
        "lng": sensor.lng,
    })

    return {"status": "breached", "sensor": s_dict}


async def trigger_duplicate_burst(incident_id: Optional[str] = None) -> Dict[str, Any]:
    """Inject 5 duplicate reports with varied phrasing within 200m."""
    from app.services.pipeline import ingest_report

    inc_lat = 22.3100
    inc_lng = 73.1880

    async with SessionLocal() as session:
        if incident_id:
            inc = await session.get(Incident, incident_id)
            if inc and inc.lat and inc.lng:
                inc_lat = inc.lat
                inc_lng = inc.lng

    texts = [
        "Duplicate report 1: Smoke and fire visible from building roof",
        "Duplicate report 2: Flames rising, people gathering outside",
        "Duplicate report 3: Fire incident confirmed at same location, fire engines needed",
        "Duplicate report 4: Black smoke billows from the exact same building",
        "Duplicate report 5: Multiple calls reporting the fire here",
    ]

    for t in texts:
        await ingest_report("citizen", {
            "text": t,
            "lat": inc_lat + random.uniform(-0.001, 0.001),
            "lng": inc_lng + random.uniform(-0.001, 0.001),
        })

    return {"status": "burst_injected", "count": len(texts)}


def fast_forward(scale: float = 0.2) -> Dict[str, Any]:
    """Temporarily shift SLA time scale for rapid demo testing."""
    settings.SLA_TIME_SCALE = scale
    return {"status": "fast_forward_active", "sla_time_scale": settings.SLA_TIME_SCALE}


async def reset_system() -> Dict[str, Any]:
    """Reset non-historic data and restore units/facilities/sensors."""
    async with SessionLocal() as session:
        # Delete non-historic incidents, reports, assignments, shortages, alerts, notifications, audit events
        await session.execute(delete(Report).where(Report.external_id.not_like("hist_%")))
        await session.execute(delete(Assignment).where(Assignment.status != "completed"))
        await session.execute(delete(Shortage).where(Shortage.resolved_at.is_not(None)))
        await session.execute(delete(Alert))
        await session.execute(delete(Notification))
        await session.execute(delete(AuditEvent))
        await session.execute(delete(Incident).where(Incident.is_historic == False))

        # Restore units to available
        await session.execute(
            update(Unit).values(
                status="available",
                current_incident_id=None,
                fatigue=0.0,
            )
        )

        # Restore facilities
        await session.execute(
            update(Facility).values(
                on_diversion=False,
            )
        )

        # Restore sensors to ok
        await session.execute(
            update(Sensor).values(
                state="ok",
            )
        )

        await session.commit()

    _sim_state["running"] = False
    _sim_state["scenario"] = None
    _sim_state["message"] = "System reset to initial seeded state."
    await bus.publish("sim.state", get_state())

    return {"status": "reset_complete"}


# ---------------------------------------------------------------------------
# Background Service Lifecycle
# ---------------------------------------------------------------------------

def start(app: Any) -> None:
    global _mover_task, _ambient_task
    if _mover_task is None or _mover_task.done():
        _mover_task = asyncio.create_task(_mover_loop())
    if _ambient_task is None or _ambient_task.done():
        _ambient_task = asyncio.create_task(_ambient_loop())
    logger.info("Simulator background tasks launched")


def stop() -> None:
    global _mover_task, _ambient_task, _scenario_task
    for t in (_mover_task, _ambient_task, _scenario_task):
        if t and not t.done():
            t.cancel()
    _mover_task = None
    _ambient_task = None
    _scenario_task = None
    logger.info("Simulator background tasks stopped")
