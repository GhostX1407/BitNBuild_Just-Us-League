"""ResQGrid — Database seed module.

Populates facilities, units, sensors, and ~300 historic incidents across Vadodara
to power analytics, maps, and demo metrics on a fresh startup.
Idempotent: skips if facilities already exist.
"""
from __future__ import annotations

import datetime
import json
import logging
import random
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from sqlalchemy import func, select

from app.core.config import settings
from app.db.models import (
    Assignment,
    Facility,
    Incident,
    Report,
    Sensor,
    Shortage,
    Unit,
)
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent

# Fallback locations if gazetteer.json is missing or empty
DEFAULT_LOCATIONS = [
    {"name": "Makarpura GIDC", "lat": 22.2510, "lng": 73.1889, "ward": "Makarpura", "kind": "industrial"},
    {"name": "Vishwamitri Riverside", "lat": 22.3100, "lng": 73.1880, "ward": "Vishwamitri", "kind": "river"},
    {"name": "NH48 Bypass", "lat": 22.2850, "lng": 73.1600, "ward": "Bypass", "kind": "highway"},
    {"name": "Old City (Panigate)", "lat": 22.3020, "lng": 73.2003, "ward": "Old City", "kind": "ward"},
    {"name": "Alkapuri", "lat": 22.3119, "lng": 73.1723, "ward": "Alkapuri", "kind": "ward"},
    {"name": "Gotri", "lat": 22.3385, "lng": 73.1580, "ward": "Gotri", "kind": "ward"},
    {"name": "Karelibaug", "lat": 22.3246, "lng": 73.2025, "ward": "Karelibaug", "kind": "ward"},
    {"name": "Manjalpur", "lat": 22.2736, "lng": 73.1917, "ward": "Manjalpur", "kind": "ward"},
    {"name": "Sayajigunj", "lat": 22.3073, "lng": 73.1812, "ward": "Sayajigunj", "kind": "ward"},
    {"name": "Wadi Refinery", "lat": 22.3490, "lng": 73.2030, "ward": "Wadi", "kind": "industrial"},
]


def _load_json(filename: str) -> List[Dict[str, Any]]:
    path = DATA_DIR / filename
    if not path.exists():
        logger.warning("Seed file %s not found", path)
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as exc:
        logger.warning("Failed to load %s: %s", filename, exc)
        return []


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


async def seed_if_empty() -> None:
    """Seed initial facilities, units, sensors, and ~300 historic incidents if DB is empty."""
    async with SessionLocal() as session:
        # 1. Check if already seeded
        facility_count = await session.scalar(select(func.count(Facility.id)))
        if facility_count and facility_count > 0:
            logger.info("Database already seeded (%d facilities found); skipping seed.", facility_count)
            return

        logger.info("Database is empty. Starting ResQGrid data seeding...")

        # 2. Seed Facilities
        facilities_data = _load_json("facilities.json")
        facilities: List[Facility] = []
        for d in facilities_data:
            facility = Facility(
                id=d.get("id", str(uuid4())),
                name=d["name"],
                kind=d["kind"],
                lat=d.get("lat"),
                lng=d.get("lng"),
                capabilities=d.get("capabilities", []),
                beds_total=d.get("beds_total", 0),
                beds_free=d.get("beds_free", 0),
                on_diversion=d.get("on_diversion", False),
                contact=d.get("contact"),
                updated_at=_now_utc(),
            )
            session.add(facility)
            facilities.append(facility)

        # 3. Seed Units
        units_data = _load_json("units.json")
        units: List[Unit] = []
        for d in units_data:
            unit = Unit(
                id=d.get("id", str(uuid4())),
                name=d["name"],
                kind=d["kind"],
                category=d.get("category", "vehicle"),
                agency=d.get("agency", ""),
                capabilities=d.get("capabilities", []),
                equipment=d.get("equipment", {}),
                crew_size=d.get("crew_size", 1),
                status=d.get("status", "available"),
                lat=d.get("lat"),
                lng=d.get("lng"),
                station_id=d.get("station_id"),
                speed_kmh=d.get("speed_kmh", 40.0),
                fatigue=d.get("fatigue", 0.0),
                phone=d.get("phone"),
                updated_at=_now_utc(),
            )
            session.add(unit)
            units.append(unit)

        # 4. Seed Sensors
        sensors_data = _load_json("sensors.json")
        for d in sensors_data:
            sensor = Sensor(
                id=d.get("id", str(uuid4())),
                kind=d["kind"],
                lat=d.get("lat"),
                lng=d.get("lng"),
                threshold=d.get("threshold"),
                unit=d.get("unit"),
                last_value=d.get("last_value"),
                last_at=_now_utc(),
                state=d.get("state", "ok"),
            )
            session.add(sensor)

        await session.flush()
        logger.info(
            "Seeded %d facilities, %d units, and %d sensors.",
            len(facilities_data),
            len(units_data),
            len(sensors_data),
        )

        # 5. Load Gazetteer for Hotspots
        gazetteer = _load_json("gazetteer.json") or DEFAULT_LOCATIONS

        # Group gazetteer by category for realistic hotspot allocation
        flood_locations = [g for g in gazetteer if g.get("kind") == "river" or "Vishwamitri" in g.get("name", "")] or gazetteer[:3]
        industrial_locations = [g for g in gazetteer if g.get("kind") == "industrial" or "GIDC" in g.get("name", "")] or gazetteer[2:5]
        highway_locations = [g for g in gazetteer if g.get("kind") == "highway" or "Bypass" in g.get("name", "") or "Road" in g.get("name", "")] or gazetteer[4:8]
        urban_locations = [g for g in gazetteer if g.get("kind") in ("ward", "landmark")] or gazetteer

        incident_types = [
            ("fire", urban_locations + industrial_locations),
            ("flood", flood_locations),
            ("road_accident", highway_locations),
            ("medical", urban_locations),
            ("industrial_hazard", industrial_locations),
            ("building_collapse", urban_locations),
            ("gas_leak", industrial_locations),
            ("other", urban_locations),
        ]

        # 6. Seed ~300 Historic Incidents over 90 days
        now = _now_utc()
        target_historic_count = 300
        sources_pool = ["citizen", "call", "sensor", "field", "hospital", "department"]

        for i in range(1, target_historic_count + 1):
            inc_type, loc_pool = random.choice(incident_types)
            loc = random.choice(loc_pool)

            # Severity distribution: 1 (15%), 2 (30%), 3 (30%), 4 (15%), 5 (10%)
            sev_weights = [0.15, 0.30, 0.30, 0.15, 0.10]
            severity = random.choices([1, 2, 3, 4, 5], weights=sev_weights)[0]

            # Priority derived deterministically
            if severity >= 5:
                priority = "P1"
            elif severity == 4:
                priority = random.choice(["P1", "P2"])
            elif severity == 3:
                priority = "P2"
            elif severity == 2:
                priority = "P3"
            else:
                priority = "P4"

            # SLA base minutes
            sla_mins = {"P1": 2.0, "P2": 5.0, "P3": 10.0, "P4": 20.0}[priority] * settings.SLA_TIME_SCALE

            # Distributed over the past 90 days
            days_ago = random.uniform(0.1, 90.0)
            created_at = now - datetime.timedelta(days=days_ago)

            triaged_at = created_at + datetime.timedelta(seconds=random.randint(30, 180))
            first_assigned_at = triaged_at + datetime.timedelta(seconds=random.randint(60, 360))

            sla_due_at = created_at + datetime.timedelta(minutes=sla_mins)

            # 88% SLA compliance, 12% breach
            breach = random.random() < 0.12
            if breach:
                # Arrival exceeded SLA
                arrival_delay_mins = sla_mins + random.uniform(2.0, 15.0)
            else:
                # Arrival within SLA
                arrival_delay_mins = max(1.0, sla_mins * random.uniform(0.3, 0.9))

            first_arrival_at = created_at + datetime.timedelta(minutes=arrival_delay_mins)
            resolved_at = first_arrival_at + datetime.timedelta(minutes=random.uniform(20.0, 120.0))

            area_name = loc.get("ward") or loc.get("name", "Vadodara")
            lat = loc.get("lat", 22.30) + random.uniform(-0.005, 0.005)
            lng = loc.get("lng", 73.19) + random.uniform(-0.005, 0.005)

            report_count = random.choices([1, 2, 3, 4, 5], weights=[0.4, 0.3, 0.15, 0.1, 0.05])[0]
            sources_used = random.sample(sources_pool, k=min(report_count, len(sources_pool)))

            people_affected = random.randint(0, 8) if severity <= 3 else random.randint(5, 40)
            hazards_list = []
            if inc_type in ("fire", "industrial_hazard"):
                hazards_list = ["smoke", "flammable_materials"]
            elif inc_type == "flood":
                hazards_list = ["high_water", "submerged_roads"]
            elif inc_type == "gas_leak":
                hazards_list = ["toxic_vapour", "inhalation_risk"]

            code = f"INC-H{i:04d}"
            track_id = f"TRK{i:05d}"
            title = f"{inc_type.replace('_', ' ').title()} in {area_name}"
            summary = f"Historic {inc_type.replace('_', ' ')} incident recorded in {area_name} near {loc.get('name')}."

            incident = Incident(
                code=code,
                type=inc_type,
                title=title,
                summary=summary,
                severity=severity,
                priority=priority,
                confidence=round(random.uniform(0.85, 0.99), 2),
                status="resolved",
                escalated=breach or (severity >= 4),
                escalation_level=1 if breach else 0,
                lat=lat,
                lng=lng,
                area=area_name,
                people_affected=people_affected,
                hazards=hazards_list,
                report_count=report_count,
                sources=sources_used,
                decision_log=[
                    {"stage": "create", "reason": "Historic incident generated for analytics baseline"},
                    {"stage": "resolved", "reason": "Response completed"},
                ],
                created_at=created_at,
                triaged_at=triaged_at,
                first_assigned_at=first_assigned_at,
                first_arrival_at=first_arrival_at,
                resolved_at=resolved_at,
                sla_due_at=sla_due_at,
                track_id=track_id,
                is_historic=True,
                region_key=f"ward_{area_name.lower().replace(' ', '_')}",
            )
            session.add(incident)
            await session.flush()

            # Create Reports for this historic incident
            for r_idx in range(report_count):
                src = sources_used[r_idx % len(sources_used)]
                rep_time = created_at + datetime.timedelta(seconds=r_idx * random.randint(10, 60))
                rep = Report(
                    source=src,
                    external_id=f"hist_rep_{i}_{r_idx}",
                    text=f"Report #{r_idx+1} for {title}",
                    lat=lat + random.uniform(-0.001, 0.001),
                    lng=lng + random.uniform(-0.001, 0.001),
                    location_text=area_name,
                    reliability=0.9 if src in ("sensor", "field") else 0.65,
                    created_at=rep_time,
                    incident_id=incident.id,
                    classification={
                        "type": inc_type,
                        "severity": severity,
                        "priority": priority,
                        "confidence": 0.9,
                    },
                )
                session.add(rep)

            # Create Assignments for this historic incident
            # Assign 1 or 2 units and maybe 1 hospital
            matched_units = random.sample(units, k=min(2, len(units))) if units else []
            for u in matched_units:
                asgn = Assignment(
                    incident_id=incident.id,
                    unit_id=u.id,
                    requirement_key=u.kind,
                    score=round(random.uniform(0.75, 0.95), 2),
                    score_breakdown={
                        "proximity": round(random.uniform(0.35, 0.45), 2),
                        "capability": 0.25,
                        "readiness": 0.15,
                        "load": round(random.uniform(0.10, 0.15), 2),
                    },
                    eta_min=round(arrival_delay_mins, 1),
                    status="completed",
                    created_at=first_assigned_at,
                    approved_at=first_assigned_at,
                    accepted_at=first_assigned_at + datetime.timedelta(seconds=20),
                    en_route_at=first_assigned_at + datetime.timedelta(seconds=40),
                    arrived_at=first_arrival_at,
                    completed_at=resolved_at,
                    target_name=u.name,
                    kind=u.kind,
                )
                session.add(asgn)

            # Create Shortages for ~12% of incidents (mostly severe ones)
            if severity >= 4 and random.random() < 0.4:
                shortage_subtype = random.choice(["hazmat", "boat", "burn", "crane"])
                shortage = Shortage(
                    incident_id=incident.id,
                    subtype=shortage_subtype,
                    qty_missing=1,
                    created_at=first_assigned_at,
                    resolved_at=first_arrival_at,  # resolved during incident
                )
                session.add(shortage)

        await session.commit()
        logger.info("Successfully seeded %d historic incidents with reports and assignments.", target_historic_count)
