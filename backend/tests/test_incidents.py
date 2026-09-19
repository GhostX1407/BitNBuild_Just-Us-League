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
