"""ResQGrid — Tests for SLA Monitoring, Escalation, and Notification Routing."""
import pytest
import datetime
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from unittest.mock import patch, AsyncMock

import sys
import importlib
from sqlalchemy.pool import StaticPool
from app.db.models import Base, Incident, Alert, Assignment, Shortage, Notification

# Ensure real modules in sys.modules
def _restore_modules():
    for mod_name in ("app.core.events", "app.services.recommend", "app.services.dispatch", "app.services.sla", "app.services.notify"):
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            if hasattr(mod, "_mock_return_value") or type(mod).__name__ == "MagicMock":
                del sys.modules[mod_name]
                importlib.import_module(mod_name)

_restore_modules()

from app.services import sla, notify


@pytest.fixture(autouse=True)
def ensure_real_modules_before_each_test():
    _restore_modules()
    yield
    _restore_modules()


@pytest.fixture
async def test_session():
    """Create in-memory SQLite database and yield an async session."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    with patch("app.services.sla.SessionLocal", Session), \
         patch("app.services.notify.SessionLocal", Session):
        async with Session() as session:
            yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_p1_critical_alert_generation(test_session):
    """Test that a P1 incident immediately generates a critical alert upon evaluate_incident."""
    inc = Incident(
        id=str(uuid4()),
        code="INC-SLA-001",
        type="industrial_hazard",
        title="Chemical Explosion",
        severity=5,
        priority="P1",
        status="triaged",
        lat=22.25,
        lng=73.18,
    )
    test_session.add(inc)
    await test_session.commit()

    # Immediate evaluation
    await sla.evaluate_incident(inc.id)

    # Check alert was created
    await test_session.refresh(inc)
    assert inc.escalated is True

    from sqlalchemy import select
    alert_res = await test_session.execute(
        select(Alert).where(Alert.incident_id == inc.id)
    )
    alerts = alert_res.scalars().all()
    assert len(alerts) == 1
    assert alerts[0].kind == "critical"
    assert alerts[0].rule == "R0_P1_CRITICAL"
    assert alerts[0].level == 0


@pytest.mark.asyncio
async def test_sla_rules_triggers(test_session):
    """Test that SLA rules (R1 unassigned, R5 shortage, R8 duplicate cluster) trigger alerts."""
    now = datetime.datetime.now(datetime.timezone.utc)
    past_due = now - datetime.timedelta(minutes=10)

    # 1. Incident unassigned past due (R1)
    inc1 = Incident(
        id=str(uuid4()),
        code="INC-SLA-R1",
        type="fire",
        severity=3,
        priority="P2",
        status="triaged",
        sla_due_at=past_due,
        report_count=6,  # triggers R8 as well
        lat=22.30,
        lng=73.19,
    )
    test_session.add(inc1)

    # 2. Add open shortage for inc1 (R5)
    sh = Shortage(
        id=str(uuid4()),
        incident_id=inc1.id,
        subtype="tanker",
        qty_missing=2,
    )
    test_session.add(sh)
    await test_session.commit()

    # Run SLA evaluation
    await sla._run_sla_checks()

    # Verify alerts created
    from sqlalchemy import select
    alert_res = await test_session.execute(
        select(Alert).where(Alert.incident_id == inc1.id)
    )
    alerts = alert_res.scalars().all()
    rules = [a.rule for a in alerts]

    assert "R1_UNASSIGNED_SLA" in rules
    assert "R5_SHORTAGE_tanker" in rules
    assert "R8_DUPLICATE_CLUSTER" in rules


@pytest.mark.asyncio
async def test_escalation_ladder_and_ack(test_session):
    """Test that unacknowledged alerts escalate levels and acknowledging stops escalation."""
    now = datetime.datetime.now(datetime.timezone.utc)
    old_time = now - datetime.timedelta(minutes=12)  # older than 10 min -> should reach level 2

    inc = Incident(
        id=str(uuid4()),
        code="INC-SLA-ESC",
        type="flood",
        severity=3,
        priority="P2",
        status="triaged",
        lat=22.31,
        lng=73.18,
    )
    test_session.add(inc)

    alert = Alert(
        id=str(uuid4()),
        incident_id=inc.id,
        rule="TEST_RULE",
        kind="delayed",
        level=0,
        message="Test alert for escalation",
        status="open",
        created_at=old_time,
    )
    test_session.add(alert)
    await test_session.commit()

    # Run SLA check -> should escalate to level 2
    await sla._run_sla_checks()

    await test_session.refresh(alert)
    assert alert.level == 2

    # Acknowledge alert
    alert.status = "ack"
    alert.ack_by = "dispatcher"
    alert.ack_at = now
    await test_session.commit()

    # Run check again -> should NOT escalate further because status != "open"
    await sla._run_sla_checks()
    await test_session.refresh(alert)
    assert alert.level == 2


@pytest.mark.asyncio
async def test_notify_routing(test_session):
    """Test that notification routing creates in-app and mock SMS/email outbox records."""
    inc = Incident(
        id=str(uuid4()),
        code="INC-NOTIF-001",
        type="road_accident",
        title="Highway pile-up",
        severity=4,
        priority="P1",
        status="dispatched",
        lat=22.28,
        lng=73.16,
    )
    test_session.add(inc)
    await test_session.commit()

    await notify.route("alert.critical", inc.id, {"message": "Critical crash detected", "level": 1})

    from sqlalchemy import select
    res = await test_session.execute(
        select(Notification).where(Notification.incident_id == inc.id)
    )
    notifs = res.scalars().all()
    assert len(notifs) >= 3  # inapp, sms, email

    channels = {n.channel for n in notifs}
    assert "inapp" in channels
    assert "sms" in channels
    assert "email" in channels

    inapp = next(n for n in notifs if n.channel == "inapp")
    assert inapp.status == "sent"
