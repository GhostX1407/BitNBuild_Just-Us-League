"""ResQGrid — Pydantic v2 schemas for Incident output shapes."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AssignmentOut(BaseModel):
    """Assignment output shape per frozen contract."""

    id: str
    incident_id: str
    unit_id: Optional[str] = None
    facility_id: Optional[str] = None
    target_name: Optional[str] = None
    kind: Optional[str] = None
    requirement_key: Optional[str] = None
    score: float
    score_breakdown: Optional[Dict[str, Any]] = None
    eta_min: Optional[float] = None
    status: str


class ShortageOut(BaseModel):
    subtype: str
    qty_missing: int


class ReportOut(BaseModel):
    """Report output shape."""

    id: str
    source: str
    text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_text: Optional[str] = None
    reliability: Optional[float] = None
    created_at: datetime
    incident_id: Optional[str] = None
    classification: Optional[Dict[str, Any]] = None
    photo_url: Optional[str] = None
    verification: Optional[Dict[str, Any]] = None
    language: Optional[str] = None
    translated_text: Optional[str] = None


class AlertOut(BaseModel):
    id: str
    incident_id: Optional[str] = None
    kind: str
    rule: Optional[str] = None
    level: int
    message: str
    status: str
    created_at: datetime
    ack_at: Optional[datetime] = None


class NotificationOut(BaseModel):
    id: str
    event: str
    recipient: Optional[str] = None
    role: Optional[str] = None
    channel: str
    subject: Optional[str] = None
    body: Optional[str] = None
    status: str
    incident_id: Optional[str] = None
    created_at: datetime


class IncidentOut(BaseModel):
    """Main incident list-view shape per frozen contract."""

    id: str
    code: str
    type: str
    title: str
    summary: str
    severity: int
    priority: str
    confidence: float
    status: str
    escalated: bool
    escalation_level: int
    lat: Optional[float] = None
    lng: Optional[float] = None
    area: Optional[str] = None
    people_affected: int
    hazards: List[str]
    report_count: int
    sources: List[str]
    created_at: datetime
    triaged_at: Optional[datetime] = None
    first_assigned_at: Optional[datetime] = None
    first_arrival_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    sla_due_at: Optional[datetime] = None
    track_id: Optional[str] = None
    decision_log: List[Any]
    assignments: List[AssignmentOut]
    shortages: List[ShortageOut]
    verification_status: str = "needs_verification"
    review: Optional[Dict[str, Any]] = None


class RelatedIncident(BaseModel):
    incident_id: str
    code: str
    score: float


class IncidentDetail(IncidentOut):
    """Full incident detail including reports, related, alerts, notifications."""

    reports: List[ReportOut] = []
    related: List[RelatedIncident] = []
    alerts: List[AlertOut] = []
    notifications: List[NotificationOut] = []


class IncidentPatch(BaseModel):
    """Body for PATCH /incidents/{id}."""

    model_config = {"extra": "ignore"}

    severity: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    escalated: Optional[bool] = None
    verified: Optional[bool] = None


class MergeBody(BaseModel):
    other_id: str


class SplitBody(BaseModel):
    report_id: str


class TrackOut(BaseModel):
    """Public sanitised tracking response."""

    code: str
    type: str
    status: str
    area: Optional[str] = None
    eta_min: Optional[float] = None
    updates: List[Dict[str, Any]]
