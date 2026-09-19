"""
tests/test_incidents.py
────────────────────────
Automated tests for the Phase 1 incident management API.

Test coverage
─────────────
1.  POST /api/incidents — successful creation, returns 201
2.  POST /api/incidents — invalid latitude (out of range)
3.  POST /api/incidents — invalid longitude (out of range)
4.  POST /api/incidents — invalid category value
5.  POST /api/incidents — invalid severity value
6.  POST /api/incidents — severity defaults when omitted
7.  GET  /api/incidents — returns list, supports pagination
8.  GET  /api/incidents — category filter
9.  GET  /api/incidents/{id} — returns correct incident
10. GET  /api/incidents/{id} — 404 for nonexistent incident
11. PATCH /api/incidents/{id}/status — updates status
12. PATCH /api/incidents/{id}/status — 404 for nonexistent incident
13. PATCH /api/incidents/{id}/status — invalid status value
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

# ── Helpers ───────────────────────────────────────────────────────────────────

VALID_PAYLOAD = {
    "title": "Building fire on Elm Street",
    "description": "Multi-story residential building on fire. Occupants trapped.",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "category": "Fire",
    "severity": "High",
    "reporter_info": "Jane Doe, 555-1234",
}


async def _create_incident(client: AsyncClient, overrides: dict | None = None) -> dict:
    """Helper: POST a valid incident, return the JSON response."""
    payload = {**VALID_PAYLOAD, **(overrides or {})}
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# ── Test 1: Successful creation ───────────────────────────────────────────────

async def test_create_incident_success(client: AsyncClient):
    data = await _create_incident(client)

    assert data["id"] is not None
    assert data["title"] == VALID_PAYLOAD["title"]
    assert data["category"] == "Fire"
    assert data["severity"] == "High"
    assert data["status"] == "Pending"
    assert "created_at" in data
    assert "updated_at" in data


# ── Test 2: Invalid latitude ──────────────────────────────────────────────────

async def test_create_incident_invalid_latitude(client: AsyncClient):
    response = await client.post(
        "/api/incidents", json={**VALID_PAYLOAD, "latitude": 95.0}
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("latitude" in str(e).lower() for e in errors)


# ── Test 3: Invalid longitude ─────────────────────────────────────────────────

async def test_create_incident_invalid_longitude(client: AsyncClient):
    response = await client.post(
        "/api/incidents", json={**VALID_PAYLOAD, "longitude": 200.0}
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("longitude" in str(e).lower() for e in errors)


# ── Test 4: Invalid category ──────────────────────────────────────────────────

async def test_create_incident_invalid_category(client: AsyncClient):
    response = await client.post(
        "/api/incidents", json={**VALID_PAYLOAD, "category": "Earthquake"}
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("category" in str(e).lower() for e in errors)


# ── Test 5: Invalid severity ──────────────────────────────────────────────────

async def test_create_incident_invalid_severity(client: AsyncClient):
    response = await client.post(
        "/api/incidents", json={**VALID_PAYLOAD, "severity": "Critical"}
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("severity" in str(e).lower() for e in errors)


# ── Test 6: Default severity when omitted ─────────────────────────────────────

async def test_create_incident_default_severity(client: AsyncClient):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "severity"}
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    # The default is configurable — just verify it's a valid severity
    assert data["severity"] in {"High", "Medium", "Low"}


# ── Test 7: List incidents with pagination ────────────────────────────────────

async def test_list_incidents_pagination(client: AsyncClient):
    # Create 3 incidents
    for i in range(3):
        await _create_incident(client, {"title": f"Incident {i} on Main St"})

    # First page of 2
    response = await client.get("/api/incidents?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()

    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total"] == 3
    assert data["total_pages"] == 2
    assert len(data["items"]) == 2


# ── Test 8: Category filter ───────────────────────────────────────────────────

async def test_list_incidents_category_filter(client: AsyncClient):
    await _create_incident(client, {"category": "Fire"})
    await _create_incident(client, {"category": "Flood", "title": "Flood on River Rd"})

    response = await client.get("/api/incidents?category=Flood")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["category"] == "Flood"


# ── Test 9: Get single incident ───────────────────────────────────────────────

async def test_get_incident_by_id(client: AsyncClient):
    created = await _create_incident(client)
    incident_id = created["id"]

    response = await client.get(f"/api/incidents/{incident_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == incident_id
    assert data["title"] == created["title"]


# ── Test 10: Get nonexistent incident → 404 ───────────────────────────────────

async def test_get_incident_not_found(client: AsyncClient):
    response = await client.get("/api/incidents/999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ── Test 11: Update status ────────────────────────────────────────────────────

async def test_update_incident_status(client: AsyncClient):
    created = await _create_incident(client)
    incident_id = created["id"]

    response = await client.patch(
        f"/api/incidents/{incident_id}/status",
        json={"status": "Assigned"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Assigned"
    # updated_at must have changed
    assert data["updated_at"] >= created["updated_at"]


# ── Test 12: Update status for nonexistent incident → 404 ────────────────────

async def test_update_status_not_found(client: AsyncClient):
    response = await client.patch(
        "/api/incidents/999999/status",
        json={"status": "Resolved"},
    )
    assert response.status_code == 404


# ── Test 13: Update with invalid status → 422 ────────────────────────────────

async def test_update_status_invalid(client: AsyncClient):
    created = await _create_incident(client)
    response = await client.patch(
        f"/api/incidents/{created['id']}/status",
        json={"status": "Cancelled"},
    )
    assert response.status_code == 422


# ── Phase 2 Tests ────────────────────────────────────────────────────────────

async def test_ai_severity_classification_high(client: AsyncClient):
    payload = {
        "title": "Explosion downtown",
        "description": "Massive explosion with multiple casualties",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "category": "Other",
    }
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["severity"] == "High"
    assert "multiple casualties" in data["classification_reason"].lower() or "explosion" in data["classification_reason"].lower()


async def test_ai_severity_classification_low_fallback(client: AsyncClient):
    payload = {
        "title": "Kitten in a tree",
        "description": "A very small cat is stuck.",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "category": "Other",
    }
    response = await client.post("/api/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["severity"] == "Low"


async def test_duplicate_detection(client: AsyncClient):
    # 1. Create initial incident
    payload1 = {
        "title": "Water main break",
        "description": "Large water main break flooding the street.",
        "latitude": 34.0522,
        "longitude": -118.2437,
        "category": "Other",
    }
    res1 = await client.post("/api/incidents", json=payload1)
    assert res1.status_code == 201
    orig_incident = res1.json()
    assert orig_incident["is_duplicate"] is False

    # 2. Create second identical incident right next to it (10 meters away)
    payload2 = {
        "title": "Water main broke",
        "description": "Huge water main break flooding the entire street.",
        "latitude": 34.0523, # Slightly different
        "longitude": -118.2437,
        "category": "Other",
    }
    res2 = await client.post("/api/incidents", json=payload2)
    assert res2.status_code == 201
    dup_incident = res2.json()
    
    assert dup_incident["is_duplicate"] is True
    assert dup_incident["duplicate_of_id"] == orig_incident["id"]


# ── Phase 3 Tests — Notification System ──────────────────────────────────────

async def test_notification_triggered_for_high_severity(client: AsyncClient):
    """
    Test 1 — High-severity incident triggers dispatch_alert exactly once.
    """
    from unittest.mock import AsyncMock, patch

    with patch(
        "app.services.notification_service.dispatch_alert",
        new_callable=AsyncMock,
    ) as mock_dispatch:
        payload = {
            "title": "Major building collapse",
            "description": "People trapped under debris. Building collapse.",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "category": "Other",
        }
        response = await client.post("/api/incidents", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["severity"] == "High"
        assert data["is_duplicate"] is False

    # BackgroundTasks execute synchronously in the HTTPX test client
    mock_dispatch.assert_awaited_once()


async def test_notification_not_triggered_for_low_medium_severity(client: AsyncClient):
    """
    Test 2 — Low/Medium incidents must NOT trigger a notification.
    """
    from unittest.mock import AsyncMock, patch

    with patch(
        "app.services.notification_service.dispatch_alert",
        new_callable=AsyncMock,
    ) as mock_dispatch:
        payload = {
            "title": "Minor road blockage",
            "description": "A small pothole causing minor traffic disruption.",
            "latitude": 28.6140,
            "longitude": 77.2091,
            "category": "Other",
        }
        response = await client.post("/api/incidents", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["severity"] == "Low"

    mock_dispatch.assert_not_awaited()


async def test_notification_not_triggered_for_duplicate(client: AsyncClient):
    """
    Test 3 — Duplicate High-severity report must NOT send a second alert.
    """
    from unittest.mock import AsyncMock, patch

    # Create the original (should trigger one notification)
    original_payload = {
        "title": "Gas pipeline explosion",
        "description": "Massive explosion near the gas pipeline. People trapped.",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "category": "Other",
    }
    res1 = await client.post("/api/incidents", json=original_payload)
    assert res1.status_code == 201
    assert res1.json()["is_duplicate"] is False

    # Now submit a near-identical duplicate and assert no second alert
    with patch(
        "app.services.notification_service.dispatch_alert",
        new_callable=AsyncMock,
    ) as mock_dispatch:
        duplicate_payload = {
            "title": "Gas pipeline blast",
            "description": "Huge explosion near the gas pipeline. People trapped under rubble.",
            "latitude": 19.0761,  # ~11 m away
            "longitude": 72.8777,
            "category": "Other",
        }
        res2 = await client.post("/api/incidents", json=duplicate_payload)
        assert res2.status_code == 201
        dup_data = res2.json()
        assert dup_data["is_duplicate"] is True

    # Duplicate → no alert should have fired
    mock_dispatch.assert_not_awaited()


async def test_notification_failure_does_not_break_incident_creation(client: AsyncClient):
    """
    Test 4 — If the internal dispatcher raises an exception, dispatch_alert
    catches it, the incident is still saved, and the API returns 201.

    We patch `_mock_dispatch` (the inner function) so that dispatch_alert's
    own try/except swallows the error — mirroring real production behaviour
    where a downstream SMS gateway might fail.
    """
    from unittest.mock import AsyncMock, patch

    async def _boom(incident):
        raise RuntimeError("Simulated notification failure")

    with patch(
        "app.services.notification_service._mock_dispatch",
        side_effect=_boom,
    ):
        payload = {
            "title": "Catastrophic flood",
            "description": "Rapidly spreading flood trapping residents in buildings.",
            "latitude": 22.5726,
            "longitude": 88.3639,
            "category": "Flood",
        }
        response = await client.post("/api/incidents", json=payload)

    # Incident must be saved even though the internal dispatcher exploded
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["severity"] == "High"
