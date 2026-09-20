"""ResQGrid — Analytics & Reporting API Router.

Mounted under /api by main.py auto-discovery.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.analytics import (
    AnalyticsDelays,
    AnalyticsHotspotItem,
    AnalyticsOverview,
    AnalyticsShortageItem,
    AnalyticsSourceItem,
    AnalyticsTimeseriesItem,
    AnalyticsTypeItem,
)
from app.services import analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Get high-level emergency analytics overview."""
    return await analytics.get_overview(session)


@router.get("/types", response_model=List[AnalyticsTypeItem])
async def get_types(
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Get breakdown of incidents by emergency type."""
    return await analytics.get_types(session)


@router.get("/delays", response_model=AnalyticsDelays)
async def get_delays(
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Get response and arrival delays broken down by type and priority."""
    return await analytics.get_delays(session)


@router.get("/shortages", response_model=List[AnalyticsShortageItem])
async def get_shortages(
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Get resource shortage demand vs available counts."""
    return await analytics.get_shortages(session)


@router.get("/hotspots", response_model=List[AnalyticsHotspotItem])
async def get_hotspots(
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Get geographic incident hotspots with normalized density weights."""
    return await analytics.get_hotspots(session)


@router.get("/timeseries", response_model=List[AnalyticsTimeseriesItem])
async def get_timeseries(
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Get 90-day incident trend timeseries."""
    return await analytics.get_timeseries(session)


@router.get("/sources", response_model=List[AnalyticsSourceItem])
async def get_sources(
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Get incident report source channel distribution."""
    return await analytics.get_sources(session)
