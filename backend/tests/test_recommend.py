"""ResQGrid — Tests for Resource Recommendation & Dispatch Operations."""
import pytest
import datetime
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from unittest.mock import patch

from app.db.models import Base, Incident, Unit, Facility, Assignment, Shortage
from app.services import recommend, dispatch


@pytest.fixture
async def test_session():
    """Create in-memory SQLite database and yield an async session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    with patch("app.services.recommend.SessionLocal", Session), \
         patch("app.services.dispatch.SessionLocal", Session):
        async with Session() as session:
            yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_recommend_proximity_and_capability(test_session):
    """Test that recommendation selects matching capabilities and ranks closer units higher."""
    # 1. Create Incident at Vadodara city centre (22.30, 73.19)
    inc = Incident(
        id=str(uuid4()),
        code="INC-T001",
        type="fire",
        title="Fire near Alkapuri",
        severity=2,  # req: 1 engine, 1 ambulance (optional)
        priority="P2",
        status="triaged",
        lat=22.3119,
        lng=73.1723,
    )
    test_session.add(inc)

    # 2. Add units:
    # Far engine (10 km away)
    far_engine = Unit(
        id="u-eng-far",
        name="Far Fire Engine",
        kind="engine",
        status="available",
        lat=22.2510,
        lng=73.1889,
        speed_kmh=45.0,
        fatigue=0.0,
    )
    # Near engine (1 km away)
    near_engine = Unit(
        id="u-eng-near",
        name="Near Fire Engine",
        kind="engine",
        status="available",
        lat=22.3150,
        lng=73.1710,
        speed_kmh=45.0,
        fatigue=0.0,
    )
    # Non-matching unit (boat)
    boat = Unit(
        id="u-boat",
        name="Rescue Boat",
        kind="boat",
        status="available",
        lat=22.3120,
        lng=73.1720,
        speed_kmh=25.0,
    )
    test_session.add_all([far_engine, near_engine, boat])
    await test_session.commit()

    # 3. Run recommendation
    plan = await recommend.plan(inc.id)
    assert len(plan["items"]) >= 1

    engine_item = next(item for item in plan["items"] if item["requirement"]["subtype"] == "engine")
    assert len(engine_item["matches"]) == 1
    # Near engine should be picked over far engine
    picked = engine_item["matches"][0]
    assert picked["unit_id"] == "u-eng-near"
    assert picked["score"] > 0.8
    assert "proximity" in picked["breakdown"]
    assert "capability" in picked["breakdown"]


@pytest.mark.asyncio
async def test_recommend_shortage_creation(test_session):
    """Test that shortage rows are created when required resources exceed availability."""
    # Incident requiring 4 engines and 2 hazmat (severity 5 fire)
    inc = Incident(
        id=str(uuid4()),
        code="INC-T002",
        type="industrial_hazard",
        severity=4,  # requires 2 hazmat, 3 engines, etc.
        priority="P1",
        status="triaged",
        lat=22.2510,
        lng=73.1889,
    )
    test_session.add(inc)

    # Only 1 hazmat available
    haz = Unit(
        id="u-haz-1",
        name="HazMat Team 1",
        kind="hazmat",
        status="available",
        lat=22.2520,
        lng=73.1870,
    )
    test_session.add(haz)
    await test_session.commit()

    plan = await recommend.plan(inc.id)
    haz_item = next(item for item in plan["items"] if item["requirement"]["subtype"] == "hazmat")
    # Needs 2 hazmat, but only 1 available -> shortage = 1
    assert haz_item["shortage"] == 1
    assert len(haz_item["matches"]) == 1


@pytest.mark.asyncio
async def test_hospital_eligibility(test_session):
    """Test that hospitals on diversion or without free beds are excluded."""
    inc = Incident(
        id=str(uuid4()),
        code="INC-T003",
        type="road_accident",
        severity=3,  # requires 1 trauma facility
        priority="P2",
        status="triaged",
        lat=22.30,
        lng=73.19,
    )
    test_session.add(inc)

    # Hospital 1: On diversion
    hosp_div = Facility(
        id="fac-hosp-div",
        name="Diverted Hospital",
        kind="hospital",
        capabilities=["trauma", "icu"],
        beds_total=200,
        beds_free=50,
        on_diversion=True,
        lat=22.301,
        lng=73.191,
    )
    # Hospital 2: No free beds
    hosp_full = Facility(
        id="fac-hosp-full",
        name="Full Hospital",
        kind="hospital",
        capabilities=["trauma", "icu"],
        beds_total=200,
        beds_free=0,
        on_diversion=False,
        lat=22.302,
        lng=73.192,
    )
    # Hospital 3: Eligible
    hosp_ok = Facility(
        id="fac-hosp-ok",
        name="Available Hospital",
        kind="hospital",
        capabilities=["trauma", "icu"],
        beds_total=200,
        beds_free=25,
        on_diversion=False,
        lat=22.305,
        lng=73.195,
    )
    test_session.add_all([hosp_div, hosp_full, hosp_ok])
    await test_session.commit()

    plan = await recommend.plan(inc.id)
    trauma_item = next(item for item in plan["items"] if item["requirement"]["subtype"] == "trauma")
    assert len(trauma_item["matches"]) == 1
    assert trauma_item["matches"][0]["facility_id"] == "fac-hosp-ok"


@pytest.mark.asyncio
async def test_dispatch_lifecycle(test_session):
    """Test approve -> accept -> en_route -> arrived -> completed lifecycle."""
    inc = Incident(
        id=str(uuid4()),
        code="INC-T004",
        type="fire",
        severity=2,
        priority="P2",
        status="triaged",
        lat=22.30,
        lng=73.19,
    )
    unit = Unit(
        id="u-eng-lifecycle",
        name="Lifecycle Engine",
        kind="engine",
        status="available",
        lat=22.30,
        lng=73.19,
    )
    test_session.add_all([inc, unit])
    await test_session.commit()

    # 1. Recommend
    await recommend.plan(inc.id)

    # 2. Approve
    approved = await dispatch.approve(inc.id, all_assignments=True)
    assert len(approved) >= 1
    asgn_id = approved[0]["id"]
    assert approved[0]["status"] == "approved"

    # Verify unit is now assigned
    await test_session.refresh(unit)
    assert unit.status == "assigned"
    assert unit.current_incident_id == inc.id

    # 3. Accept
    accepted = await dispatch.accept(asgn_id)
    assert accepted["status"] == "accepted"

    # 4. En route
    en_route = await dispatch.set_status(asgn_id, "en_route")
    assert en_route["status"] == "en_route"
    await test_session.refresh(unit)
    assert unit.status == "en_route"

    # 5. Arrived
    arrived = await dispatch.set_status(asgn_id, "arrived")
    assert arrived["status"] == "arrived"
    await test_session.refresh(unit)
    assert unit.status == "on_scene"

    # 6. Completed
    completed = await dispatch.set_status(asgn_id, "completed")
    assert completed["status"] == "completed"
    await test_session.refresh(unit)
    assert unit.status == "available"
    assert unit.current_incident_id is None
