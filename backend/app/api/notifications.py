"""ResQGrid — Notification Outbox API Router.

Mounted under /api by main.py auto-discovery.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import require_roles
from app.db.models import Notification
from app.db.session import get_session
from app.schemas.alert import NotificationOut

router = APIRouter(tags=["notifications"], dependencies=[Depends(require_roles("dispatcher", "team", "hospital"))])


@router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(
    incident_id: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> List[NotificationOut]:
    """List outbound notifications (outbox) with optional filters."""
    query = select(Notification).order_by(Notification.created_at.desc())
    if incident_id:
        query = query.where(Notification.incident_id == incident_id)
    if channel:
        query = query.where(Notification.channel == channel)
    if status:
        query = query.where(Notification.status == status)

    query = query.limit(limit)
    res = await session.execute(query)
    notifs = res.scalars().all()
    return [NotificationOut.model_validate(n) for n in notifs]
