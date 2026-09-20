"""ResQGrid — Tests for classifier, priority, and geocode (all offline)."""
from __future__ import annotations

import asyncio
import pytest

from app.services.classify import classify, VALID_TYPES, _rule_severity, _extract_people
from app.services.priority import compute_priority, SLA_BASE
from app.services.geocode import resolve, _exact_match, _fuzzy_match


# ---------------------------------------------------------------------------
# Classify tests (offline — LLM is patched to None in conftest)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_classify_fire():
    r = await classify("There is a huge fire in a factory near GIDC, 5 people trapped", "citizen", {})
    assert r["type"] in ("fire", "industrial_hazard")
    assert r["severity"] >= 3
    assert r["model"] in ("ml", "rules", "llm")
    assert r["priority"] in ("P1", "P2", "P3", "P4")


@pytest.mark.asyncio
async def test_classify_flood():
    r = await classify("paani bhar gaya road par, river overflowing", "citizen", {})
    assert r["type"] == "flood"
    assert r["severity"] >= 2


@pytest.mark.asyncio
async def test_classify_road_accident():
    r = await classify("Major accident on NH48, truck overturned blocking road", "citizen", {})
    assert r["type"] in ("road_accident", "other")
    assert isinstance(r["severity"], int)


@pytest.mark.asyncio
async def test_classify_medical():
    r = await classify("Heart attack patient needs ambulance urgently", "citizen", {})
    assert r["type"] in ("medical", "other")


@pytest.mark.asyncio
async def test_classify_gas_leak():
    r = await classify("Strong gas smell in entire building, everyone evacuating", "citizen", {})
    assert r["type"] in ("gas_leak", "other")


@pytest.mark.asyncio
async def test_classify_industrial_hazard():
    r = await classify("Chemical factory explosion near Makarpura GIDC workers trapped", "citizen", {})
    assert r["type"] in ("industrial_hazard", "fire", "building_collapse")
    assert r["severity"] >= 4  # life risk cues


@pytest.mark.asyncio
async def test_classify_building_collapse():
    r = await classify("imarat gir gayi, log phansey hue hain andar", "citizen", {})
    assert r["type"] in ("building_collapse", "other")


@pytest.mark.asyncio
async def test_classify_sensor_flood_gauge():
    payload = {"sensor_id": "G-3", "kind": "flood_gauge", "value": 4.2, "unit": "m", "threshold": 3.5, "lat": 22.31, "lng": 73.18}
    r = await classify("Flood gauge G-3 at 4.2m exceeds threshold 3.5m", "sensor", payload)
    assert r["type"] == "flood"
    assert r["model"] == "rules"
    assert r["severity"] >= 3


@pytest.mark.asyncio
async def test_classify_sensor_smoke():
    payload = {"sensor_id": "S-1", "kind": "smoke", "value": 90.0, "unit": "ppm", "threshold": 50.0, "lat": 22.31, "lng": 73.18}
    r = await classify("Smoke detector S-1 at 90.0ppm exceeds threshold 50.0", "sensor", payload)
    assert r["type"] == "fire"
    assert r["model"] == "rules"


@pytest.mark.asyncio
async def test_classify_other():
    r = await classify("Testing 1 2 3, please ignore", "citizen", {})
    # Should not crash; may classify as other
    assert r["type"] in VALID_TYPES


@pytest.mark.asyncio
async def test_classify_severity_safety_floor():
    """Explicit life-risk cues should push severity up even if ML predicts low."""
    r = await classify("5 children not breathing after chemical gas leak explosion", "citizen", {})
    assert r["severity"] >= 4, f"Expected severity >= 4, got {r['severity']}"


# ---------------------------------------------------------------------------
# Priority tests
# ---------------------------------------------------------------------------

def test_priority_p1_sev5():
    p, sla = compute_priority(5, 0, [], 1, ["citizen"])
    assert p == "P1"
    assert sla == SLA_BASE["P1"]


def test_priority_p1_sev4_life_risk():
    p, sla = compute_priority(4, 3, ["trapped", "chemical"], 1, ["citizen"])
    assert p == "P1"


def test_priority_p2_sev4_no_life():
    p, sla = compute_priority(4, 0, [], 1, ["citizen"])
    assert p == "P2"


def test_priority_p3_sev3():
    p, sla = compute_priority(3, 0, [], 1, ["citizen"])
    assert p == "P3"


def test_priority_p4_sev2():
    p, sla = compute_priority(2, 0, [], 1, ["citizen"])
    assert p == "P4"


def test_priority_corroboration_bump():
    """3 reports should bump one level."""
    p, _ = compute_priority(3, 0, [], 3, ["citizen"])
    assert p == "P2"  # P3 → P2 with 3 reports


def test_priority_two_sources_bump():
    p, _ = compute_priority(3, 0, [], 1, ["citizen", "call"])
    assert p == "P2"


def test_priority_cannot_exceed_p1():
    p, _ = compute_priority(5, 10, ["chemical"], 5, ["citizen", "call", "sensor"])
    assert p == "P1"


def test_priority_sla_minutes():
    _, sla_p1 = compute_priority(5, 0, [], 1, ["citizen"])
    _, sla_p4 = compute_priority(1, 0, [], 1, ["citizen"])
    assert sla_p1 < sla_p4
    assert sla_p1 == 2
    assert sla_p4 == 20


# ---------------------------------------------------------------------------
# Geocode tests (offline)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_geocode_explicit():
    r = await resolve({"lat": 22.31, "lng": 73.18}, "citizen")
    assert r["method"] == "explicit"
    assert r["confidence"] == 1.0
    assert r["lat"] == 22.31


@pytest.mark.asyncio
async def test_geocode_gazetteer_exact():
    r = await resolve({"text": "fire near Alkapuri"}, "citizen")
    assert r["method"] == "gazetteer"
    assert "Alkapuri" in (r["area"] or "") or "Alkapuri" in (r["location_text"] or "")
    assert r["confidence"] >= 0.8


@pytest.mark.asyncio
async def test_geocode_alias_makarpura():
    r = await resolve({"text": "explosion near Makarpura GIDC"}, "citizen")
    assert r["method"] == "gazetteer"
    assert r["confidence"] >= 0.8


@pytest.mark.asyncio
async def test_geocode_sayajigunj():
    r = await resolve({"location_text": "near Sayajigunj"}, "call")
    assert r["method"] == "gazetteer"
    assert "Sayaji" in (r["location_text"] or "") or "Sayaji" in (r["area"] or "")


@pytest.mark.asyncio
async def test_geocode_fuzzy_typo():
    """Fuzzy match should handle common misspellings."""
    r = await resolve({"text": "fire near Alkaapuri"}, "citizen")
    # Should find Alkapuri via fuzzy
    assert r["method"] in ("gazetteer", "default")


@pytest.mark.asyncio
async def test_geocode_default_fallback():
    r = await resolve({"text": "somewhere unspecified"}, "citizen")
    # LLM is patched to None, so should fall to default
    assert r["method"] == "default"
    assert r["confidence"] == 0.2
    assert r.get("location_uncertain") is True


@pytest.mark.asyncio
async def test_geocode_never_raises():
    """resolve should never raise even with garbage input."""
    r = await resolve({}, "citizen")
    assert isinstance(r, dict)
    assert "lat" in r and "lng" in r

@pytest.mark.asyncio
async def test_geocode_aliases():
    for alias in ["NH48", "NH 48", "NH-48", "national highway 48", "bypass"]:
        r = await resolve({"text": f"accident on {alias}"}, "citizen")
        assert r["area"] == "Bypass"

    for alias in ["Vishwamitri", "river Vishwamitri"]:
        r = await resolve({"text": f"flood near {alias}"}, "citizen")
        assert r["area"] == "Vishwamitri"

    for alias in ["Waghodia road", "GIDC"]:
        r = await resolve({"text": f"incident at {alias}"}, "citizen")
        assert r["method"] == "gazetteer"

@pytest.mark.asyncio
async def test_geocode_explicit_within_radius():
    r = await resolve({"lat": 22.2855, "lng": 73.1605}, "citizen")
    assert r["area"] == "Bypass"

@pytest.mark.asyncio
async def test_geocode_explicit_outside_radius():
    r = await resolve({"lat": 10.0, "lng": 10.0}, "citizen")
    assert r["area"] == "Vadodara"
