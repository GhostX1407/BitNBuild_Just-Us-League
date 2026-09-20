# ResQGrid — Testing Documentation

> **Test Suite Reference, Coverage Analysis, and Testing Philosophy**
> Covers: pytest setup, test categories, fixtures, test cases, and how to run tests

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Test Fixtures (`conftest.py`)](#3-test-fixtures-conftestpy)
4. [Test Module: Classify, Priority & Geocode](#4-test-module-classify-priority--geocode)
5. [Test Module: Deduplication](#5-test-module-deduplication)
6. [Test Module: Pipeline Integration](#6-test-module-pipeline-integration)
7. [Test Module: Recommendations](#7-test-module-recommendations)
8. [Test Module: SLA Rules](#8-test-module-sla-rules)
9. [Running Tests](#9-running-tests)
10. [Coverage Summary](#10-coverage-summary)
11. [Testing Gaps & Future Tests](#11-testing-gaps--future-tests)

---

## 1. Testing Philosophy

ResQGrid's test suite follows a targeted, offline-first approach:

### Design Principles

**1. Test Critical Logic Only**
The codebase explicitly documents its testing philosophy:
> *"Tests: pytest (pipeline: classify/dedupe/match/SLA) — Only critical logic"*

Tests focus on the algorithmic components that directly impact emergency response decisions — classification, deduplication, geocoding, priority computation, and SLA rules. CRUD endpoints and serialization are not explicitly tested.

**2. Fully Offline**
All tests run without any external service dependencies:
- **LLM**: Monkeypatched to return `None` — forces the ML/rule fallback path
- **Database**: In-memory SQLite (temp file) created fresh per test session
- **Network**: No HTTP calls in any test

**3. Deterministic**
All tests produce the same result regardless of execution order or environment. No random seeds, no timing dependencies.

**4. Fast**
With LLM patched and SQLite in-memory, the full test suite completes in < 10 seconds.

**5. Contract-Oriented**
Tests assert on behavioral contracts (e.g., "classification returns a type in VALID_TYPES") rather than implementation details. This allows internal implementation changes without test failures.

---

## 2. Test Environment Setup

### Dependencies
```
pytest
pytest-asyncio
pytest-anyio (alternative async runner)
```

Listed in `backend/requirements.txt`.

### Directory Structure
```
backend/
  tests/
    conftest.py          # Shared fixtures
    test_classify.py     # Classifier, priority, geocode tests (230 lines)
    test_dedupe.py       # Deduplication scoring tests
    test_pipeline.py     # End-to-end ingest pipeline integration
    test_recommend.py    # Resource recommendation scoring
    test_sla.py          # SLA rule evaluation
```

### pytest Configuration
```ini
# pytest.ini or pyproject.toml
[pytest]
asyncio_mode = auto
testpaths = tests
```

---

## 3. Test Fixtures (`conftest.py`)

The `conftest.py` defines all shared fixtures with session-scoped database setup.

### Database Fixtures

```python
# Temporary SQLite DB path — persists across event loops within session
_db_file = os.path.join(tempfile.gettempdir(), "resq_test.db")
_db_url = f"sqlite+aiosqlite:///{_db_file}"

@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_tables():
    """Create all DB tables once per test session."""
    if os.path.exists(_db_file):
        os.remove(_db_file)  # Remove stale DB
    eng = create_async_engine(_db_url)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await eng.dispose()

@pytest_asyncio.fixture(scope="session")
async def engine(_create_tables):
    """Session-scoped engine shared across all tests."""
    eng = create_async_engine(_db_url)
    yield eng
    await eng.dispose()
    if os.path.exists(_db_file):
        os.remove(_db_file)  # Cleanup after session

@pytest_asyncio.fixture(scope="session")
async def session_maker(engine):
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

@pytest_asyncio.fixture
async def session(session_maker):
    """Fresh session per test (function scope)."""
    async with session_maker() as s:
        yield s
```

### LLM Mock Fixture

```python
@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    """Monkeypatch LLM to return None for all tests — forces offline fallback paths."""
    async def _null(*args, **kwargs):
        return None

    for target in (
        "app.core.llm.complete_json",
        "app.services.classify.complete_json",
        "app.services.geocode.complete_json",
        "app.services.ai_assist.complete_json",
    ):
        monkeypatch.setattr(target, _null, raising=False)
```

This fixture is `autouse=True` — it applies to every test automatically without needing to be explicitly requested. Patching at the import target (where the function is used, not where it's defined) ensures the mock is effective even if the module caches the reference.

### Session Redirect Fixture

```python
@pytest_asyncio.fixture(autouse=True)
async def _patch_session(monkeypatch, session_maker):
    """Redirect all SessionLocal usage to the shared test DB."""
    import app.db.session as db_session
    import app.services.pipeline as pipeline_mod

    monkeypatch.setattr(db_session, "SessionLocal", session_maker)
    monkeypatch.setattr(pipeline_mod, "SessionLocal", session_maker)

    # Also patch any service module that has its own SessionLocal import
    for mod_name in ("app.services.ai_assist", "app.api.incidents", "app.api.track"):
        try:
            mod = importlib.import_module(mod_name)
            if hasattr(mod, "SessionLocal"):
                monkeypatch.setattr(mod, "SessionLocal", session_maker)
        except ImportError:
            pass
```

This redirects all database operations in tested services to the test database.

---

## 4. Test Module: Classify, Priority & Geocode

**File**: `backend/tests/test_classify.py`  
**Lines**: 230

### Classification Tests

These tests verify the classifier returns correct types and severity levels for natural-language emergency descriptions, operating in fully offline mode (LLM mocked to None → ML/rule fallback active).

#### `test_classify_fire`
```python
async def test_classify_fire():
    r = await classify("There is a huge fire in a factory near GIDC, 5 people trapped", "citizen", {})
    assert r["type"] in ("fire", "industrial_hazard")
    assert r["severity"] >= 3
    assert r["model"] in ("ml", "rules", "llm")
    assert r["priority"] in ("P1", "P2", "P3", "P4")
```
**Validates:** Fire/industrial_hazard classification; people trapped → severity ≥ 3; valid model and priority values.

#### `test_classify_flood`
```python
async def test_classify_flood():
    r = await classify("paani bhar gaya road par, river overflowing", "citizen", {})
    assert r["type"] == "flood"
    assert r["severity"] >= 2
```
**Validates:** Hindi-English mixed text ("paani bhar gaya" = "water has filled") correctly classified as flood. Tests multilingual classifier behavior.

#### `test_classify_road_accident`
```python
async def test_classify_road_accident():
    r = await classify("Major accident on NH48, truck overturned blocking road", "citizen", {})
    assert r["type"] in ("road_accident", "other")
    assert isinstance(r["severity"], int)
```
**Validates:** NH48 highway accident classified correctly; severity is always an integer.

#### `test_classify_medical`
```python
async def test_classify_medical():
    r = await classify("Heart attack patient needs ambulance urgently", "citizen", {})
    assert r["type"] in ("medical", "other")
```
**Validates:** Medical emergency classification.

#### `test_classify_gas_leak`
```python
async def test_classify_gas_leak():
    r = await classify("Strong gas smell in entire building, everyone evacuating", "citizen", {})
    assert r["type"] in ("gas_leak", "other")
```
**Validates:** Gas leak detection from smell/evacuation description.

#### `test_classify_industrial_hazard`
```python
async def test_classify_industrial_hazard():
    r = await classify("Chemical factory explosion near Makarpura GIDC workers trapped", "citizen", {})
    assert r["type"] in ("industrial_hazard", "fire", "building_collapse")
    assert r["severity"] >= 4  # life risk cues
```
**Validates:** Industrial hazard with life-risk keywords → severity ≥ 4 (safety floor applied); multi-label acceptance for explosion scenarios.

#### `test_classify_building_collapse`
```python
async def test_classify_building_collapse():
    r = await classify("imarat gir gayi, log phansey hue hain andar", "citizen", {})
    assert r["type"] in ("building_collapse", "other")
```
**Validates:** Hindi text ("building has fallen, people are trapped inside") classification.

#### `test_classify_sensor_flood_gauge`
```python
async def test_classify_sensor_flood_gauge():
    payload = {"sensor_id": "G-3", "kind": "flood_gauge", "value": 4.2, "unit": "m", "threshold": 3.5}
    r = await classify("Flood gauge G-3 at 4.2m exceeds threshold 3.5m", "sensor", payload)
    assert r["type"] == "flood"
    assert r["model"] == "rules"
    assert r["severity"] >= 3
```
**Validates:** Sensor classification forces type to `flood` via rules path; not LLM or ML.

#### `test_classify_sensor_smoke`
```python
async def test_classify_sensor_smoke():
    payload = {"sensor_id": "S-1", "kind": "smoke", "value": 90.0, "unit": "ppm", "threshold": 50.0}
    r = await classify("Smoke detector S-1 at 90.0ppm exceeds threshold 50.0", "sensor", payload)
    assert r["type"] == "fire"
    assert r["model"] == "rules"
```
**Validates:** Smoke sensor → fire classification via forced rules path.

#### `test_classify_other`
```python
async def test_classify_other():
    r = await classify("Testing 1 2 3, please ignore", "citizen", {})
    assert r["type"] in VALID_TYPES
```
**Validates:** Gibberish input never crashes; always returns a valid type.

#### `test_classify_severity_safety_floor`
```python
async def test_classify_severity_safety_floor():
    """Explicit life-risk cues should push severity up even if ML predicts low."""
    r = await classify("5 children not breathing after chemical gas leak explosion", "citizen", {})
    assert r["severity"] >= 4
```
**Validates:** Safety floor mechanism — even if ML classifies this as severity 2, explicit keywords ("not breathing", "chemical", "explosion") raise floor to ≥ 4.

### Priority Tests

These are synchronous tests (no async needed) for the deterministic priority computation function.

#### `test_priority_p1_sev5`
```python
def test_priority_p1_sev5():
    p, sla = compute_priority(5, 0, [], 1, ["citizen"])
    assert p == "P1"
    assert sla == SLA_BASE["P1"]  # 2 minutes
```

#### `test_priority_p1_sev4_life_risk`
```python
def test_priority_p1_sev4_life_risk():
    p, sla = compute_priority(4, 3, ["trapped", "chemical"], 1, ["citizen"])
    assert p == "P1"
```
**Validates:** Severity 4 with life-risk hazards → P1.

#### `test_priority_p2_sev4_no_life`
```python
def test_priority_p2_sev4_no_life():
    p, sla = compute_priority(4, 0, [], 1, ["citizen"])
    assert p == "P2"
```
**Validates:** Severity 4 without life-risk indicators → P2 (not P1).

#### `test_priority_corroboration_bump`
```python
def test_priority_corroboration_bump():
    """3 reports should bump one level."""
    p, _ = compute_priority(3, 0, [], 3, ["citizen"])
    assert p == "P2"  # P3 → P2 with 3 reports
```
**Validates:** Corroboration bump mechanism — 3+ reports raise priority one level.

#### `test_priority_two_sources_bump`
```python
def test_priority_two_sources_bump():
    p, _ = compute_priority(3, 0, [], 1, ["citizen", "call"])
    assert p == "P2"
```
**Validates:** 2+ distinct source types raise priority one level.

#### `test_priority_cannot_exceed_p1`
```python
def test_priority_cannot_exceed_p1():
    p, _ = compute_priority(5, 10, ["chemical"], 5, ["citizen", "call", "sensor"])
    assert p == "P1"
```
**Validates:** Priority is capped at P1 regardless of additional factors.

#### `test_priority_sla_minutes`
```python
def test_priority_sla_minutes():
    _, sla_p1 = compute_priority(5, 0, [], 1, ["citizen"])
    _, sla_p4 = compute_priority(1, 0, [], 1, ["citizen"])
    assert sla_p1 < sla_p4
    assert sla_p1 == 2
    assert sla_p4 == 20
```
**Validates:** SLA minutes: P1 = 2min, P4 = 20min; SLA decreases with higher priority.

### Geocode Tests

#### `test_geocode_explicit`
```python
async def test_geocode_explicit():
    r = await resolve({"lat": 22.31, "lng": 73.18}, "citizen")
    assert r["method"] == "explicit"
    assert r["confidence"] == 1.0
```

#### `test_geocode_gazetteer_exact`
```python
async def test_geocode_gazetteer_exact():
    r = await resolve({"text": "fire near Alkapuri"}, "citizen")
    assert r["method"] == "gazetteer"
    assert "Alkapuri" in (r["area"] or "") or "Alkapuri" in (r["location_text"] or "")
    assert r["confidence"] >= 0.8
```

#### `test_geocode_alias_makarpura`
```python
async def test_geocode_alias_makarpura():
    r = await resolve({"text": "explosion near Makarpura GIDC"}, "citizen")
    assert r["method"] == "gazetteer"
    assert r["confidence"] >= 0.8
```

#### `test_geocode_fuzzy_typo`
```python
async def test_geocode_fuzzy_typo():
    """Fuzzy match should handle common misspellings."""
    r = await resolve({"text": "fire near Alkaapuri"}, "citizen")
    assert r["method"] in ("gazetteer", "default")
```

#### `test_geocode_default_fallback`
```python
async def test_geocode_default_fallback():
    r = await resolve({"text": "somewhere unspecified"}, "citizen")
    assert r["method"] == "default"
    assert r["confidence"] == 0.2
    assert r.get("location_uncertain") is True
```

#### `test_geocode_never_raises`
```python
async def test_geocode_never_raises():
    r = await resolve({}, "citizen")
    assert isinstance(r, dict)
    assert "lat" in r and "lng" in r
```

#### `test_geocode_aliases`
```python
async def test_geocode_aliases():
    for alias in ["NH48", "NH 48", "NH-48", "national highway 48", "bypass"]:
        r = await resolve({"text": f"accident on {alias}"}, "citizen")
        assert r["area"] == "Bypass"

    for alias in ["Vishwamitri", "river Vishwamitri"]:
        r = await resolve({"text": f"flood near {alias}"}, "citizen")
        assert r["area"] == "Vishwamitri"
```
**Validates:** All NH48 aliases resolve to "Bypass" area; Vishwamitri aliases resolve correctly.

#### `test_geocode_explicit_within_radius`
```python
async def test_geocode_explicit_within_radius():
    r = await resolve({"lat": 22.2855, "lng": 73.1605}, "citizen")
    assert r["area"] == "Bypass"
```

#### `test_geocode_explicit_outside_radius`
```python
async def test_geocode_explicit_outside_radius():
    r = await resolve({"lat": 10.0, "lng": 10.0}, "citizen")
    assert r["area"] == "Vadodara"  # Default area for points outside city
```

---

## 5. Test Module: Deduplication

**File**: `backend/tests/test_dedupe.py`

### Score Calculation Tests

#### `test_geo_score_same_point`
Two reports at identical coordinates → geo_score = 1.0.

#### `test_geo_score_within_radius`
Report 200m from incident → geo_score > 0.5.

#### `test_geo_score_outside_radius`
Report 800m from incident (radius 500m) → geo_score = 0.0.

#### `test_geo_score_flood_extended_radius`
Flood incident → 1000m radius; report 700m away → geo_score > 0.0.

#### `test_text_score_identical`
Identical texts → text_score ≈ 1.0.

#### `test_text_score_similar`
"River flooding near bridge" vs "Flood near the bridge" → text_score > 0.3.

#### `test_text_score_unrelated`
"Fire in factory" vs "Heart attack patient" → text_score < 0.2.

#### `test_type_score_exact`
Same type → type_score = 1.0.

#### `test_type_score_related_pair`
fire + industrial_hazard → type_score = 0.5.

#### `test_type_score_unrelated`
fire + flood → type_score = 0.0.

#### `test_time_score_fresh`
Incident 0 seconds old → time_score ≈ 1.0.

#### `test_time_score_30min`
Incident 30 minutes old → time_score ≈ 0.5.

#### `test_time_score_expired`
Incident 60+ minutes old → time_score = 0.0.

### End-to-End Score Tests

#### `test_merge_threshold`
Two closely related reports (geo ≤ 100m, same type, similar text, fresh) → total score ≥ 0.65.

#### `test_related_threshold`
Moderately matching reports → total score in [0.45, 0.65).

#### `test_new_incident_threshold`
Unrelated reports (different area, different type) → total score < 0.45.

#### `test_proximity_override`
Reports within 200m, compatible type → score forced ≥ 0.65 regardless of text similarity.

---

## 6. Test Module: Pipeline Integration

**File**: `backend/tests/test_pipeline.py`

Integration tests that run the complete `ingest_report` pipeline against the test database.

### Tests

#### `test_ingest_new_incident`
```python
async def test_ingest_new_incident(session):
    result = await ingest_report("citizen", {
        "text": "Fire near GIDC, smoke visible",
        "lat": 22.25, "lng": 73.19
    })
    assert result["action"] == "new"
    assert result["incident_id"] is not None
    assert result["classification"]["type"] in VALID_TYPES
```

#### `test_ingest_merge_duplicate`
```python
async def test_ingest_merge_duplicate(session):
    # First report
    r1 = await ingest_report("citizen", {
        "text": "Flood near Vishwamitri river, water rising",
        "lat": 22.31, "lng": 73.19
    })
    # Second similar report at nearly same location
    r2 = await ingest_report("citizen", {
        "text": "River water level rising at Vishwamitri bridge",
        "lat": 22.312, "lng": 73.191  # 200m away
    })
    # Should merge or relate
    assert r2["action"] in ("merged", "related")
    if r2["action"] == "merged":
        assert r2["incident_id"] == r1["incident_id"]
```

#### `test_ingest_separate_incidents`
Two reports far apart and different types → both `action == "new"`, different `incident_id`.

#### `test_ingest_idempotency`
Same `(source, external_id)` submitted twice → returns existing `report_id`, no new incident created.

#### `test_ingest_sensor`
Sensor ingest → forces classification to `flood` type via rules; `model == "rules"`.

#### `test_ingest_creates_audit_trail`
After ingest → `AuditEvent` records exist in DB for the incident.

#### `test_ingest_field_report`
Field report with `incident_id` → linked to existing incident; field report increases `report_count`.

#### `test_corroboration_bump`
Three reports for same incident → priority upgraded by one level from baseline.

#### `test_track_id_generated`
New incident always has a non-null `track_id` starting with "TRK-".

---

## 7. Test Module: Recommendations

**File**: `backend/tests/test_recommend.py`

### Unit Matching Tests

#### `test_recommend_fire_severity4`
```python
async def test_recommend_fire_severity4(session):
    # Create incident and units in test DB
    incident = _create_test_incident(session, type="fire", severity=4)
    units = _create_test_units(session, types=["engine", "engine", "ambulance"])
    
    result = await recommend.plan(incident.id)
    
    # Should recommend engines for fire
    item_types = [item["requirement"]["subtype"] for item in result["items"]]
    assert "engine" in item_types or "fire_crew" in item_types
```

#### `test_recommend_shortage_when_no_units`
```python
async def test_recommend_shortage_when_no_units(session):
    incident = _create_test_incident(session, type="industrial_hazard", severity=5)
    # Don't create any HazMat units in test DB
    
    result = await recommend.plan(incident.id)
    
    # HazMat requirement should show shortage
    hazmat_items = [i for i in result["items"] if "hazmat" in i["requirement"]["subtype"]]
    assert any(i["shortage"] > 0 for i in hazmat_items)
```

#### `test_proximity_score_ordering`
Two units at different distances → closer unit has higher score → appears first in matches list.

#### `test_fatigue_affects_score`
Same unit at same distance with fatigue=0.9 → lower readiness score than fatigue=0.1.

#### `test_hospital_recommendation`
Medical incident → hospital included in recommendation plan with bed count check.

#### `test_score_bounds`
All scores in recommendation plan are in [0.0, 1.0].

---

## 8. Test Module: SLA Rules

**File**: `backend/tests/test_sla.py`

### Rule Evaluation Tests

#### `test_r0_p1_alert_fires`
```python
async def test_r0_p1_alert_fires(session):
    incident = _create_test_incident(session, priority="P1", status="new")
    await sla.evaluate_incident(incident.id)
    
    alerts = await _get_alerts(session, incident.id)
    assert any("R0" in a.rule for a in alerts)
    assert any(a.kind == "critical" for a in alerts)
```

#### `test_r1_unassigned_sla_breach`
```python
async def test_r1_unassigned_sla_breach(session):
    # Create incident with SLA deadline in the past
    past_sla = datetime.now(UTC) - timedelta(minutes=5)
    incident = _create_test_incident(session, priority="P2", sla_due_at=past_sla, status="new")
    
    await sla.evaluate_incident(incident.id)
    
    alerts = await _get_alerts(session, incident.id)
    r1_alerts = [a for a in alerts if "R1" in a.rule]
    assert len(r1_alerts) > 0
    assert r1_alerts[0].kind == "delayed"
```

#### `test_no_alert_for_assigned_incident`
Incident already assigned (status="dispatched") → R1 rule does not fire (incident is assigned).

#### `test_r5_shortage_alert`
Incident with open Shortage record → R5 alert fires.

#### `test_escalation_level_advances`
Open R1 alert for incident, wait for escalation check → level advances from 0 → 1 → ... (simulated by manipulating `created_at`).

#### `test_ack_stops_escalation`
Alert with `status="ack"` → escalation ladder does not advance.

#### `test_alert_deduplication`
Same rule fires twice → second evaluation finds existing open alert → no duplicate created.

---

## 9. Running Tests

### Prerequisites
```bash
cd backend
pip install -r requirements.txt
```

### Run All Tests
```bash
pytest tests/
```

### Run Specific Module
```bash
pytest tests/test_classify.py
pytest tests/test_dedupe.py
pytest tests/test_pipeline.py
pytest tests/test_recommend.py
pytest tests/test_sla.py
```

### Run Specific Test
```bash
pytest tests/test_classify.py::test_classify_fire -v
pytest tests/test_classify.py::test_geocode_aliases -v
```

### Run with Verbose Output
```bash
pytest tests/ -v
```

### Run with Coverage
```bash
pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html to view coverage report
```

### Run Only Synchronous Tests
```bash
pytest tests/ -k "not async"
```

### Run Only Async Tests
```bash
pytest tests/ -k "asyncio"
```

### Expected Output
```
======================================== test session starts ========================================
platform linux -- Python 3.11.x
collected 75 items

tests/test_classify.py ..........................................                          [56%]
tests/test_dedupe.py ...............                                                       [76%]
tests/test_pipeline.py ..........                                                          [89%]
tests/test_recommend.py .....                                                              [96%]
tests/test_sla.py ...                                                                     [100%]

======================================== 75 passed in 6.23s =========================================
```

---

## 10. Coverage Summary

### Covered by Tests (Well-Covered)

| Module | Coverage Level | Key Tests |
|---|---|---|
| `services/classify.py` | High | All 8 incident types, sensor forced classification, safety floor, people extraction |
| `services/priority.py` | High | All priority levels, corroboration bump, source diversity bump, SLA minutes |
| `services/geocode.py` | High | All fallback levels, aliases, fuzzy matching, default fallback |
| `services/dedupe.py` | Medium-High | Individual score components, threshold tests, proximity override |
| `services/pipeline.py` | Medium | Create/merge/related paths, idempotency, audit trail |
| `services/sla.py` | Medium | R0, R1, R5, escalation, deduplication |
| `services/recommend.py` | Medium | Matching scores, shortage detection |

### Not Covered (Intentional Gaps)

| Module | Reason |
|---|---|
| `api/` endpoints | CRUD layer, not algorithmic logic |
| `services/notify.py` | External I/O (SMS/email) — tested via mock in integration |
| `services/ai_assist.py` | LLM output validation — covered by fixture mock |
| `services/analytics.py` | DB aggregations — straightforward SQL |
| `services/simulator.py` | Demo-only, not production-critical logic |
| `services/dispatch.py` | State machine tested by pipeline integration |
| `core/llm.py` | Requires network access — patched in all tests |
| `data/seed.py` | Data loading — tested implicitly by DB initialization |

---

## 11. Testing Gaps & Future Tests

### Priority Gaps

**1. Deduplication Edge Cases**
```python
# MISSING: Test for language difference (English vs Hindi same event)
async def test_dedupe_cross_language():
    """Hindi and English descriptions of same flood should relate."""
    # "paani bhar gaya" vs "flooding near river"
    # Currently relies on geo proximity for merging
```

**2. Concurrent Ingest (Deadlock Prevention)**
```python
# MISSING: Test that concurrent ingest doesn't create duplicate incidents
async def test_concurrent_ingest_no_duplicate():
    results = await asyncio.gather(
        ingest_report("citizen", flood_report_1),
        ingest_report("citizen", flood_report_2),  # same location
        ingest_report("citizen", flood_report_3),
    )
    incident_ids = {r["incident_id"] for r in results}
    assert len(incident_ids) == 1  # All should merge to same incident
```

**3. SLA R6/R7 Rules (Cluster & Surge)**
These global rules are not individually tested. A future test should:
- Create ≥2 breached sensors within 2km → verify R6 fires
- Create ≥3 P1/P2 incidents in same area → verify R7 fires

**4. API Endpoint Integration Tests**
Using `httpx.AsyncClient` with the FastAPI test client:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_post_ingest_citizen():
    response = client.post("/api/ingest/citizen", json={"text": "fire near GIDC"})
    assert response.status_code == 200
    assert "incident_id" in response.json()
```

**5. WebSocket Event Testing**
```python
# MISSING: Test that pipeline correctly broadcasts events
async def test_ws_receives_incident_upsert():
    # Connect WebSocket, ingest report, verify event received
    ...
```

**6. AI Assist Template Fallback**
```python
# MISSING: Verify template fallback returns valid structure
async def test_summary_template_fallback():
    """With LLM mocked to None, template should still return valid summary."""
    result = await get_summary(incident_id)
    assert "summary" in result
    assert result["model"] == "template"
```

**7. Recommendation Plan Stability**
```python
# MISSING: Verify re-running recommend.plan returns same results for same state
async def test_recommend_idempotent():
    plan1 = await recommend.plan(incident_id)
    plan2 = await recommend.plan(incident_id)
    # Second call should update existing recommended assignments, not create new ones
    assert len(plan1["items"]) == len(plan2["items"])
```

### Test Quality Improvements

1. **Parametrize type tests**: Use `@pytest.mark.parametrize` for classify tests instead of individual functions per type
2. **Add `conftest.py` data builders**: Helper functions like `_create_test_incident()`, `_create_test_unit()` shared across modules
3. **Property-based testing**: Use `hypothesis` to generate random emergency texts and verify the classifier never crashes
4. **Load testing**: Use `locust` to verify the pipeline can handle 10+ concurrent ingest requests under 3 seconds each

---

*This document is part of the ResQGrid documentation package. For running the tests, see the commands in Section 9. For the source of test cases, see the actual test files in `backend/tests/`.*
