"""ResQGrid — SQLAlchemy 2 declarative models (all 10 tables).

All timestamps are timezone-aware UTC via UTCDateTime TypeDecorator.
JSON list/dict columns must be reassigned (not mutated in place) to trigger
SQLAlchemy change detection.
"""
from __future__ import annotations

import datetime
import json
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Float,
    Index,
    Integer,
    String,
    Text,
    TypeDecorator,
    types,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ---------------------------------------------------------------------------
# UTC-aware datetime type decorator
# ---------------------------------------------------------------------------

class UTCDateTime(TypeDecorator):
    """Stores datetimes as UTC; always returns tz-aware UTC datetimes.

    SQLite returns naive datetimes even for timezone=True columns, so we
    handle the conversion explicitly.
    """

    impl = types.DateTime
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, datetime.datetime):
            if value.tzinfo is not None:
                value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
            return value
        return value

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, datetime.datetime) and value.tzinfo is None:
            return value.replace(tzinfo=datetime.timezone.utc)
        return value


# ---------------------------------------------------------------------------
# JSON column helper (stores as TEXT in SQLite)
# ---------------------------------------------------------------------------

class JSONColumn(TypeDecorator):
    """Stores Python list/dict as JSON text; loads on read."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        return json.dumps(value, default=str)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value


def _uuid() -> str:
    return str(uuid4())


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

class Report(Base):
    """Normalised inbound report from any source."""

    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    raw: Mapped[Optional[Dict]] = mapped_column(JSONColumn, nullable=True)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reporter_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reporter_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_text: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    location_conf: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reliability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc, index=True
    )
    incident_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )
    classification: Mapped[Optional[Dict]] = mapped_column(JSONColumn, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    verification: Mapped[Optional[Dict]] = mapped_column(JSONColumn, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    translated_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_reports_source_ext", "source", "external_id"),
    )


# ---------------------------------------------------------------------------
# Incident
# ---------------------------------------------------------------------------

class Incident(Base):
    """Central incident record; aggregates reports."""

    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(16), nullable=False, unique=True, index=True)
    type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    priority: Mapped[str] = mapped_column(String(4), nullable=False, default="P4", index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="new", index=True)
    escalated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    escalation_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    area: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    people_affected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hazards: Mapped[List] = mapped_column(JSONColumn, nullable=False, default=list)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    sources: Mapped[List] = mapped_column(JSONColumn, nullable=False, default=list)
    decision_log: Mapped[List] = mapped_column(JSONColumn, nullable=False, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc, index=True
    )
    triaged_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    first_assigned_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    first_arrival_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    sla_due_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    track_id: Mapped[Optional[str]] = mapped_column(String(16), nullable=True, unique=True, index=True)

    # Contract additions
    is_historic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    region_key: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(32), nullable=False, default="needs_verification")
    review: Mapped[Optional[Dict]] = mapped_column(JSONColumn, nullable=True)


# ---------------------------------------------------------------------------
# Unit
# ---------------------------------------------------------------------------

class Unit(Base):
    """Emergency response unit (team or vehicle)."""

    __tablename__ = "units"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="vehicle")
    agency: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    capabilities: Mapped[List] = mapped_column(JSONColumn, nullable=False, default=list)
    equipment: Mapped[Dict] = mapped_column(JSONColumn, nullable=False, default=dict)
    crew_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="available", index=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    station_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    speed_kmh: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    fatigue: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    current_incident_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)


# ---------------------------------------------------------------------------
# Facility
# ---------------------------------------------------------------------------

class Facility(Base):
    """Hospital, shelter, fire station, police station, or equipment depot."""

    __tablename__ = "facilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    capabilities: Mapped[List] = mapped_column(JSONColumn, nullable=False, default=list)
    beds_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    beds_free: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    on_diversion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    contact: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    meta: Mapped[Dict] = mapped_column(JSONColumn, nullable=False, default=dict)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)


# ---------------------------------------------------------------------------
# Assignment
# ---------------------------------------------------------------------------

class Assignment(Base):
    """Recommended / approved / accepted dispatch assignment."""

    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    incident_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    unit_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    facility_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    requirement_key: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    score_breakdown: Mapped[Optional[Dict]] = mapped_column(JSONColumn, nullable=True)
    eta_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="recommended", index=True)

    # Nullable timestamps (back AssignmentOut)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True, default=_now_utc)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    approved_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    accepted_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    en_route_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    arrived_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)

    # Resolved display names for serialisation
    target_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    kind: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)


# ---------------------------------------------------------------------------
# Shortage
# ---------------------------------------------------------------------------

class Shortage(Base):
    """Unresolved resource shortage for an incident."""

    __tablename__ = "shortages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    incident_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    subtype: Mapped[str] = mapped_column(String(64), nullable=False)
    qty_missing: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc
    )
    resolved_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)


# ---------------------------------------------------------------------------
# Alert
# ---------------------------------------------------------------------------

class Alert(Base):
    """SLA / escalation / sensor breach alert."""

    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    incident_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    rule: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="critical")
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open", index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc
    )
    ack_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ack_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification(Base):
    """Outbound notification record (in-app, SMS, email)."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    event: Mapped[str] = mapped_column(String(64), nullable=False)
    recipient: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    channel: Mapped[str] = mapped_column(String(16), nullable=False, default="inapp")
    subject: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="sent")
    incident_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc
    )


# ---------------------------------------------------------------------------
# Sensor
# ---------------------------------------------------------------------------

class Sensor(Base):
    """IoT sensor (flood gauge, smoke, gas, seismic, traffic)."""

    __tablename__ = "sensors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    last_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="ok")


# ---------------------------------------------------------------------------
# AuditEvent
# ---------------------------------------------------------------------------

class AuditEvent(Base):
    """Immutable audit trail row written on every state change."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    ts: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc, index=True
    )
    actor: Mapped[str] = mapped_column(String(64), nullable=False, default="system")
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    data: Mapped[Optional[Dict]] = mapped_column(JSONColumn, nullable=True)


# ---------------------------------------------------------------------------
# Broadcast
# ---------------------------------------------------------------------------

class Broadcast(Base):
    """Public-safety broadcast message."""

    __tablename__ = "broadcasts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    body_hi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_gu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="info")  # info|warning|critical
    area: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc, index=True
    )
    expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)


# ---------------------------------------------------------------------------
# MutualAid
# ---------------------------------------------------------------------------

class MutualAid(Base):
    """Inter-agency mutual aid request."""

    __tablename__ = "mutual_aid"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    incident_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    agency: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="requested")  # requested|approved|declined|arrived
    requested_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    decided_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        UTCDateTime, nullable=False, default=_now_utc, index=True
    )
    decided_at: Mapped[Optional[datetime.datetime]] = mapped_column(UTCDateTime, nullable=True)
