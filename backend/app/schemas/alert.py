"""ResQGrid — Pydantic v2 schemas for alerts and notifications."""
from __future__ import annotations

import datetime
from typing import Optional, Union
from pydantic import BaseModel, ConfigDict, field_serializer


class AlertOut(BaseModel):
    id: str
    incident_id: Optional[str] = None
    kind: str
    rule: Optional[str] = None
    level: int = 0
    message: str
    status: str
    created_at: Optional[Union[str, datetime.datetime]] = None
    ack_at: Optional[Union[str, datetime.datetime]] = None
    ack_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "ack_at")
    def serialize_dt(self, dt: Optional[Union[str, datetime.datetime]]) -> Optional[str]:
        if isinstance(dt, (datetime.datetime, datetime.date)):
            return dt.isoformat()
        return dt


class AlertAckRequest(BaseModel):
    ack_by: Optional[str] = "dispatcher"


class AlertEscalateRequest(BaseModel):
    reason: Optional[str] = ""


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
    created_at: Optional[Union[str, datetime.datetime]] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_dt(self, dt: Optional[Union[str, datetime.datetime]]) -> Optional[str]:
        if isinstance(dt, (datetime.datetime, datetime.date)):
            return dt.isoformat()
        return dt
