"""
services/incident_service.py
──────────────────────────────
All database interaction for incidents lives here.
Routes call these functions; they never touch SQLAlchemy directly.

Design principles
─────────────────
• Every function is `async` — compatible with Phase 3 WebSocket handlers
  and background tasks that will run in the same event loop.
• Severity defaulting lives here (not in the route) so Phase 2 can inject
  an AI classifier result at a single, clearly marked location.
• Geographic utilities are imported from geo_utils — not inlined — so
  Phase 2 can swap to PostGIS without editing this file.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentFilters, IncidentStatusUpdate

# ── Helpers ───────────────────────────────────────────────────────────────────


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


from app.services import ai_service, duplicate_service

# ── CRUD operations ───────────────────────────────────────────────────────────


async def create_incident(
    db: AsyncSession,
    payload: IncidentCreate,
) -> Incident:
    """
    Persist a new incident and return the ORM object.
    
    Phase 2 Integration:
    - Automatically classifies severity based on the description text.
    - Checks for an active duplicate incident in the same area.
    """
    # ── Phase 2: AI severity classification ──────────────────────────────
    ai_severity, ai_reason = await ai_service.classify_severity(payload.description)
    
    # ── Phase 2: Duplicate detection ─────────────────────────────────────
    duplicate = await duplicate_service.detect_duplicate(db, payload)
    
    is_duplicate = False
    duplicate_of_id = None
    
    if duplicate:
        is_duplicate = True
        duplicate_of_id = duplicate.id

    incident = Incident(
        title=payload.title,
        description=payload.description,
        latitude=float(payload.latitude),
        longitude=float(payload.longitude),
        category=payload.category,
        severity=ai_severity,
        classification_reason=ai_reason,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
        status="Pending",
        reporter_info=payload.reporter_info,
    )

    db.add(incident)
    await db.flush()   # get DB-assigned id without full commit
    await db.refresh(incident)
    return incident


async def get_incident_by_id(
    db: AsyncSession,
    incident_id: int,
) -> Optional[Incident]:
    """Return a single incident or None."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    return result.scalar_one_or_none()


async def list_incidents(
    db: AsyncSession,
    filters: IncidentFilters,
) -> Tuple[list[Incident], int]:
    """
    Return a paginated list of incidents and the total count.

    Returns
    -------
    (items, total)
        items: the page slice.
        total: total matching rows (before pagination).
    """
    query = select(Incident)

    # Apply optional filters
    if filters.category:
        query = query.where(Incident.category == filters.category)
    if filters.severity:
        query = query.where(Incident.severity == filters.severity)
    if filters.status:
        query = query.where(Incident.status == filters.status)

    # Count before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total: int = (await db.execute(count_query)).scalar_one()

    # Apply ordering and pagination
    offset = (filters.page - 1) * filters.page_size
    query = (
        query
        .order_by(Incident.created_at.desc())
        .offset(offset)
        .limit(filters.page_size)
    )

    result = await db.execute(query)
    items = list(result.scalars().all())
    return items, total


async def update_incident_status(
    db: AsyncSession,
    incident_id: int,
    payload: IncidentStatusUpdate,
) -> Optional[Incident]:
    """
    Update the status of an existing incident.

    Returns the updated incident, or None if not found.
    updated_at is set explicitly here (in addition to the ORM onupdate)
    to ensure it is refreshed even if no other columns change.
    """
    incident = await get_incident_by_id(db, incident_id)
    if incident is None:
        return None

    incident.status = payload.status
    incident.updated_at = _utcnow()

    await db.flush()
    await db.refresh(incident)
    return incident
