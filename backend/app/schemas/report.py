"""ResQGrid — Pydantic v2 schemas for ingest report bodies."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CitizenReportBody(BaseModel):
    """Body for POST /ingest/citizen."""

    model_config = {"extra": "ignore"}

    text: str = Field(..., min_length=1)
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_text: Optional[str] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None
    photo_b64: Optional[str] = None
    external_id: Optional[str] = None


class CallReportBody(BaseModel):
    """Body for POST /ingest/call (emergency-call transcript)."""

    model_config = {"extra": "ignore"}

    caller_phone: str
    transcript: str = Field(..., min_length=1)
    location_text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    external_id: Optional[str] = None


class SensorReportBody(BaseModel):
    """Body for POST /ingest/sensor."""

    model_config = {"extra": "ignore"}

    sensor_id: str
    kind: str  # flood_gauge|smoke|gas|seismic|traffic
    value: float
    unit: str
    lat: float
    lng: float
    threshold: Optional[float] = None
    external_id: Optional[str] = None


class FieldReportBody(BaseModel):
    """Body for POST /ingest/field (field team report)."""

    model_config = {"extra": "ignore"}

    unit_id: str
    incident_id: Optional[str] = None
    text: str = Field(..., min_length=1)
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None
    external_id: Optional[str] = None


class HospitalReportBody(BaseModel):
    """Body for POST /ingest/hospital."""

    model_config = {"extra": "ignore"}

    facility_id: str
    text: str = Field(..., min_length=1)
    beds_free: Optional[int] = None
    incoming_patients: Optional[int] = None
    external_id: Optional[str] = None


class DepartmentReportBody(BaseModel):
    """Body for POST /ingest/department."""

    model_config = {"extra": "ignore"}

    agency: str
    text: str = Field(..., min_length=1)
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_text: Optional[str] = None
    external_id: Optional[str] = None


class GenericIngestBody(BaseModel):
    """Body for POST /ingest (generic)."""

    model_config = {"extra": "ignore"}

    source: str
    payload: dict
