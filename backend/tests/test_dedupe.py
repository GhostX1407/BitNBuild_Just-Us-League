"""ResQGrid — Tests for dedupe, pipeline idempotency, merging, and sensor handling."""
from __future__ import annotations

import asyncio
import datetime
import pytest
import pytest_asyncio
from unittest.mock import patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Base, Incident, Report
from app.services.dedupe import find_candidates, MERGE_T, RELATED_T, _type_score, _time_score


# ---------------------------------------------------------------------------
# Type score unit tests
# ---------------------------------------------------------------------------

def test_type_score_same():
    assert _type_score("fire", "fire") == 1.0


def test_type_score_related():
    assert _type_score("fire", "industrial_hazard") == 0.5
    assert _type_score("industrial_hazard", "gas_leak") == 0.5


def test_type_score_unrelated():
    assert _type_score("flood", "fire") == 0.0


# ---------------------------------------------------------------------------
# Time score tests
# ---------------------------------------------------------------------------

def test_time_score_fresh():
    now = datetime.datetime.now(datetime.timezone.utc)
    score = _time_score(now)
    assert score > 0.99


def test_time_score_30min():
    t = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=30)
    score = _time_score(t)
    assert 0.45 < score < 0.55


def test_time_score_expired():
    t = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=61)
    score = _time_score(t)
    assert score == 0.0


# ---------------------------------------------------------------------------
# Dedupe integration tests (in-memory DB)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def populated_session(session):
    """Session with one pre-existing fire incident near Makarpura GIDC."""
    import uuid
    unique_id = uuid.uuid4().hex[:8].upper()
    incident = Incident(
        code=f"FIX-{unique_id}",
        type="fire",
        title="Fire near Makarpura GIDC",
        summary="Industrial fire near Makarpura GIDC, 3 people trapped",
        severity=4,
        priority="P2",
        confidence=0.8,
        status="triaged",
        lat=22.2510,
        lng=73.1889,
        area="Makarpura",
        people_affected=3,
        hazards=["fire"],
        report_count=1,
        sources=["citizen"],
        triaged_at=datetime.datetime.now(datetime.timezone.utc),
        sla_due_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5),
        track_id=f"TRK{unique_id}",
        decision_log=[],
    )
    session.add(incident)
    report = Report(
        source="citizen",
        text="Industrial fire near Makarpura GIDC, 3 people trapped",
        lat=22.2510,
        lng=73.1889,
        reliability=0.6,
        incident_id=None,
    )
    session.add(report)
    await session.commit()
    # Link report
    report.incident_id = incident.id
    await session.commit()
    return session, incident, report



@pytest.mark.asyncio
async def test_dedupe_merge(populated_session):
    """Similar report near same location and type should score >= MERGE_T."""
    session, incident, _ = populated_session
    report_dict = {
        "lat": 22.2512,  # very close
        "lng": 73.1891,
        "text": "Factory fire near GIDC, workers trapped inside",
        "source": "citizen",
    }
    classification = {"type": "fire", "severity": 3}
    candidates = await find_candidates(session, report_dict, classification)
    assert len(candidates) > 0, "Expected at least one candidate"
    top_inc, top_score = candidates[0]
    assert top_inc.id == incident.id
    assert top_score >= MERGE_T, f"Expected merge score >= {MERGE_T}, got {top_score:.3f}"


@pytest.mark.asyncio
async def test_dedupe_far_apart(populated_session):
    """Far-away report of the same type should not match."""
    session, incident, _ = populated_session
    report_dict = {
        "lat": 22.3119,  # Alkapuri — ~7 km away
        "lng": 73.1723,
        "text": "Fire in Alkapuri area",
        "source": "citizen",
    }
    classification = {"type": "fire", "severity": 3}
    candidates = await find_candidates(session, report_dict, classification)
    merge_candidates = [(inc, s) for inc, s in candidates if s >= MERGE_T]
    assert len(merge_candidates) == 0, "Far-away incident should not merge"


@pytest.mark.asyncio
async def test_dedupe_type_mismatch(populated_session):
    """Different type in the same location should score lower."""
    session, incident, _ = populated_session
    report_dict = {
        "lat": 22.2510,
        "lng": 73.1889,
        "text": "Flood in the area",
        "source": "citizen",
    }
    classification = {"type": "flood", "severity": 3}
    candidates = await find_candidates(session, report_dict, classification)
    # Type mismatch (fire vs flood) — score should be reduced
    for inc, score in candidates:
        if inc.id == incident.id:
            # Should either not appear or score below merge threshold
            # since type component is 0 (fire vs flood = unrelated)
            assert score < MERGE_T, f"Type-mismatched report should not hit merge threshold: {score:.3f}"


@pytest.mark.asyncio
async def test_dedupe_related(populated_session):
    """Industrial hazard report near fire incident should be related."""
    session, incident, _ = populated_session
    report_dict = {
        "lat": 22.2515,
        "lng": 73.1895,
        "text": "Chemical fire at industrial unit near GIDC",
        "source": "citizen",
    }
    classification = {"type": "industrial_hazard", "severity": 3}
    candidates = await find_candidates(session, report_dict, classification)
    # industrial_hazard ↔ fire is a related pair (score 0.5)
    assert len(candidates) > 0, "Related incident should appear as candidate"
    _, score = candidates[0]
    assert score >= RELATED_T, f"Expected related score >= {RELATED_T}, got {score:.3f}"


@pytest.mark.asyncio
async def test_dedupe_resolved_excluded(session):
    """Resolved incidents should not appear as candidates."""
    resolved = Incident(
        code="FIX-9999",
        type="fire",
        title="Resolved fire",
        summary="Resolved fire test",
        severity=3,
        priority="P3",
        confidence=0.7,
        status="resolved",  # <-- resolved
        lat=22.2510,
        lng=73.1889,
        area="Makarpura",
        report_count=1,
        sources=["citizen"],
        created_at=datetime.datetime.now(datetime.timezone.utc),
        track_id="TRACKRES",
        decision_log=[],
        hazards=[],
    )
    session.add(resolved)
    await session.commit()

    report_dict = {
        "lat": 22.2510,
        "lng": 73.1889,
        "text": "More fire at GIDC",
        "source": "citizen",
    }
    classification = {"type": "fire"}
    candidates = await find_candidates(session, report_dict, classification)
    ids = [inc.id for inc, _ in candidates]
    assert resolved.id not in ids, "Resolved incident should be excluded from candidates"


# ---------------------------------------------------------------------------
# Pipeline tests (idempotency, merge, severity, sensor)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_post_pipeline():
    with patch("app.services.pipeline._post_pipeline") as mock:
        yield mock

@pytest.mark.asyncio
async def test_pipeline_new_incident():
    """Citizen fire report → new incident."""
    from app.services.pipeline import ingest_report
    from app.db.session import SessionLocal

    result = await ingest_report("citizen", {
        "text": "Fire in a factory near Makarpura GIDC, 3 people trapped",
        "lat": 22.2510,
        "lng": 73.1889,
        "external_id": "test-pipeline-new-001",
    })
    assert result["action"] in ("new", "related", "merged")
    assert result["incident_id"] is not None
    assert result["track_id"] is not None
    assert result["classification"]["type"] in ("fire", "industrial_hazard")
    assert result["classification"]["severity"] >= 3


@pytest.mark.asyncio
async def test_pipeline_idempotency():
    """Same (source, external_id) twice → same report_id."""
    from app.services.pipeline import ingest_report

    payload = {
        "text": "Idempotency test fire report",
        "lat": 22.31,
        "lng": 73.18,
        "external_id": "test-idempotency-001",
    }
    r1 = await ingest_report("citizen", payload)
    r2 = await ingest_report("citizen", payload)
    assert r1["report_id"] == r2["report_id"], "Idempotent: same external_id should return same report"
    assert r1["incident_id"] == r2["incident_id"]


@pytest.mark.asyncio
async def test_pipeline_sensor_below_threshold():
    """Sensor reading below threshold → action=ignored."""
    from app.services.pipeline import ingest_report

    result = await ingest_report("sensor", {
        "sensor_id": "G-1",
        "kind": "flood_gauge",
        "value": 2.0,
        "unit": "m",
        "threshold": 3.5,
        "lat": 22.31,
        "lng": 73.19,
    })
    assert result["action"] == "ignored"
    assert result["report_id"] is None
    assert result["incident_id"] is None


@pytest.mark.asyncio
async def test_pipeline_sensor_above_threshold():
    """Sensor reading above threshold → flood incident created."""
    from app.services.pipeline import ingest_report

    result = await ingest_report("sensor", {
        "sensor_id": "G-3",
        "kind": "flood_gauge",
        "value": 4.2,
        "unit": "m",
        "threshold": 3.5,
        "lat": 22.31,
        "lng": 73.18,
        "external_id": "test-sensor-breach-001",
    })
    assert result["action"] in ("new", "merged", "related")
    assert result["classification"]["type"] == "flood"


@pytest.mark.asyncio
async def test_pipeline_severity_never_decreases_on_merge():
    """Merging a lower-severity report should not decrease incident severity."""
    from app.services.pipeline import ingest_report
    from app.db.session import SessionLocal
    from app.db.models import Incident as IncModel

    # Create high-severity incident first
    r1 = await ingest_report("citizen", {
        "text": "Major explosion at GSFC chemical plant, 10 workers trapped, toxic gas",
        "lat": 22.338,
        "lng": 73.211,
        "external_id": "test-severity-high-001",
    })
    incident_id = r1["incident_id"]

    # Get severity of first incident
    async with SessionLocal() as s:
        inc = await s.get(IncModel, incident_id)
        initial_severity = inc.severity if inc else 0

    # Now ingest a near-identical but lower-severity description
    r2 = await ingest_report("citizen", {
        "text": "There is some smoke at the industrial area",
        "lat": 22.339,
        "lng": 73.212,
        # No external_id — allow natural pipeline
    })

    # If it merged with the first incident, check severity didn't drop
    if r2["incident_id"] == incident_id:
        async with SessionLocal() as s:
            inc = await s.get(IncModel, incident_id)
            assert inc.severity >= initial_severity, \
                f"Severity decreased: {initial_severity} → {inc.severity}"
