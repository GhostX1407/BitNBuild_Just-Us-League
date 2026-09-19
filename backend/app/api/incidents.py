"""
api/incidents.py
────────────────
FastAPI router for the /api/incidents resource.

Endpoints
─────────
POST   /api/incidents               — create a new incident
GET    /api/incidents               — list incidents (filtered, paginated)
GET    /api/incidents/{id}          — get single incident
PATCH  /api/incidents/{id}/status   — update incident status

The router contains no database logic — it delegates everything to
`incident_service`.  This makes the service independently testable and
allows Phase 3 to attach WebSocket event emission inside the service layer
without touching the router.
"""

from __future__ import annotations

import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.incident import (
    IncidentCreate,
    IncidentFilters,
    IncidentListResponse,
    IncidentResponse,
    IncidentStatusUpdate,
)
from app.services import incident_service

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


# ── POST /api/incidents ───────────────────────────────────────────────────────

@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a new incident",
    description=(
        "Create a new emergency incident report. "
        "If `severity` is omitted it is assigned the configured default value. "
        "Phase 2 will replace the default with an AI classifier."
    ),
)
async def create_incident(
    payload: IncidentCreate,
    db: AsyncSession = Depends(get_db),
) -> IncidentResponse:
    try:
        incident = await incident_service.create_incident(db, payload)
    except Exception as exc:
        # Unexpected DB errors — do not leak internals
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create incident. Please try again.",
        ) from exc

    return IncidentResponse.model_validate(incident)


# ── GET /api/incidents ────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=IncidentListResponse,
    summary="List incidents",
    description="Return a paginated list of incidents, optionally filtered by category, severity, or status.",
)
async def list_incidents(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    severity: Optional[str] = Query(default=None, description="Filter by severity"),
    status_filter: Optional[str] = Query(
        default=None, alias="status", description="Filter by status"
    ),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> IncidentListResponse:
    # Validate filter values via the schema (raises ValueError on bad input)
    try:
        filters = IncidentFilters(
            category=category,
            severity=severity,
            status=status_filter,
            page=page,
            page_size=page_size,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    items, total = await incident_service.list_incidents(db, filters)
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return IncidentListResponse(
        items=[IncidentResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── GET /api/incidents/{incident_id} ─────────────────────────────────────────

@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Get a single incident",
    responses={404: {"description": "Incident not found"}},
)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
) -> IncidentResponse:
    incident = await incident_service.get_incident_by_id(db, incident_id)
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )
    return IncidentResponse.model_validate(incident)


# ── PATCH /api/incidents/{incident_id}/status ─────────────────────────────────

@router.patch(
    "/{incident_id}/status",
    response_model=IncidentResponse,
    summary="Update incident status",
    description="Transition an incident to a new status (Pending → Assigned → Resolved).",
    responses={
        404: {"description": "Incident not found"},
        422: {"description": "Invalid status value"},
    },
)
async def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> IncidentResponse:
    incident = await incident_service.update_incident_status(db, incident_id, payload)
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found.",
        )
    return IncidentResponse.model_validate(incident)
