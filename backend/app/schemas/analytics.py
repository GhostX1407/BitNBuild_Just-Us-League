"""ResQGrid — Pydantic v2 schemas for the Analytics Engine."""
from __future__ import annotations

from typing import List
from pydantic import BaseModel, ConfigDict


class AnalyticsOverview(BaseModel):
    total_incidents: int
    total_reports: int
    dedupe_ratio: float
    avg_response_min: float
    sla_compliance_pct: float
    open_alerts: int
    top_type: str

    model_config = ConfigDict(from_attributes=True)


class AnalyticsTypeItem(BaseModel):
    type: str
    count: int
    percentage: float

    model_config = ConfigDict(from_attributes=True)


class DelayByTypeItem(BaseModel):
    type: str
    avg_assign_min: float
    avg_arrival_min: float

    model_config = ConfigDict(from_attributes=True)


class DelayByPriorityItem(BaseModel):
    priority: str
    avg_assign_min: float
    avg_arrival_min: float
    sla_pct: float

    model_config = ConfigDict(from_attributes=True)


class AnalyticsDelays(BaseModel):
    by_type: List[DelayByTypeItem]
    by_priority: List[DelayByPriorityItem]

    model_config = ConfigDict(from_attributes=True)


class AnalyticsShortageItem(BaseModel):
    subtype: str
    demand: int
    available: int
    unmet_count: int

    model_config = ConfigDict(from_attributes=True)


class AnalyticsHotspotItem(BaseModel):
    area: str
    lat: float
    lng: float
    count: int
    weight: float

    model_config = ConfigDict(from_attributes=True)


class AnalyticsTimeseriesItem(BaseModel):
    bucket: str
    count: int
    p1: int

    model_config = ConfigDict(from_attributes=True)


class AnalyticsSourceItem(BaseModel):
    source: str
    count: int
    percentage: float

    model_config = ConfigDict(from_attributes=True)
