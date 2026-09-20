"""ResQGrid — Pydantic v2 schemas for units, facilities, assignments, recommendations, and snapshot."""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScoreBreakdown(BaseModel):
    proximity: float = Field(..., description="Proximity factor score (0-1)")
    capability: float = Field(..., description="Capability match score (0-1)")
    readiness: float = Field(..., description="Readiness score based on fatigue (0-1)")
    load: float = Field(..., description="Load balance score (0-1)")


class AssignmentOut(BaseModel):
    id: str
    incident_id: str
    unit_id: Optional[str] = None
    facility_id: Optional[str] = None
    target_name: Optional[str] = None
    kind: Optional[str] = None
    requirement_key: Optional[str] = None
    score: float = 0.0
    score_breakdown: Optional[Dict[str, float]] = None
    eta_min: Optional[float] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class ShortageOut(BaseModel):
    subtype: str
    qty_missing: int

    model_config = ConfigDict(from_attributes=True)


class UnitOut(BaseModel):
    id: str
    name: str
    kind: str
    category: str
    agency: str
    capabilities: List[str] = Field(default_factory=list)
    equipment: Dict[str, Any] = Field(default_factory=dict)
    crew_size: int = 1
    status: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    station_id: Optional[str] = None
    speed_kmh: float = 40.0
    fatigue: float = 0.0
    phone: Optional[str] = None
    current_incident_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UnitPatch(BaseModel):
    status: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    fatigue: Optional[float] = None
    current_incident_id: Optional[str] = None


class FacilityOut(BaseModel):
    id: str
    name: str
    kind: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    capabilities: List[str] = Field(default_factory=list)
    beds_total: int = 0
    beds_free: int = 0
    on_diversion: bool = False
    contact: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FacilityPatch(BaseModel):
    beds_free: Optional[int] = None
    on_diversion: Optional[bool] = None
    contact: Optional[str] = None


class RecommendMatch(BaseModel):
    unit_id: Optional[str] = None
    facility_id: Optional[str] = None
    name: str
    eta_min: float
    dist_km: float
    score: float
    breakdown: Dict[str, float]


class RecommendRequirement(BaseModel):
    kind: str
    subtype: str
    qty: int
    mandatory: bool = True


class RecommendItem(BaseModel):
    requirement: Dict[str, Any]
    matches: List[RecommendMatch] = Field(default_factory=list)
    shortage: int = 0


class RecommendPlanOut(BaseModel):
    items: List[RecommendItem] = Field(default_factory=list)


class ApproveRequest(BaseModel):
    all: Optional[bool] = False
    assignment_ids: Optional[List[str]] = None


class AssignmentStatusRequest(BaseModel):
    status: str


class SnapshotKPIs(BaseModel):
    active: int = 0
    p1: int = 0
    avg_response_min: float = 0.0
    units_available: int = 0
    units_total: int = 0
    open_alerts: int = 0
    unmet_requirements: int = 0
    reports_total: int = 0
    incidents_total: int = 0


class SnapshotSim(BaseModel):
    running: bool = False
    scenario: Optional[str] = None
    message: str = "Idle"


class Snapshot(BaseModel):
    incidents: List[Dict[str, Any]] = Field(default_factory=list)
    units: List[UnitOut] = Field(default_factory=list)
    facilities: List[FacilityOut] = Field(default_factory=list)
    sensors: List[Dict[str, Any]] = Field(default_factory=list)
    alerts: List[Dict[str, Any]] = Field(default_factory=list)
    notifications: List[Dict[str, Any]] = Field(default_factory=list)
    kpis: SnapshotKPIs = Field(default_factory=SnapshotKPIs)
    sim: SnapshotSim = Field(default_factory=SnapshotSim)
