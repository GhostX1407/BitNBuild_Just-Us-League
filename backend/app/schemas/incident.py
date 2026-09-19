"""
schemas/incident.py
────────────────────
Pydantic v2 schemas used for request validation and response serialisation.

Schema hierarchy
────────────────
IncidentBase          — shared fields (title, description, geo, category…)
  ├── IncidentCreate  — POST /api/incidents   (severity optional → default)
  ├── IncidentUpdate  — PATCH status field only
  └── IncidentResponse — response model (adds id, timestamps)

IncidentListResponse  — paginated list wrapper

Extensibility
─────────────
Phase 2: add `ai_severity`, `ai_category`, `duplicate_of_id` to IncidentResponse.
Phase 3: nothing schema-level needed.
Phase 4: these schemas are reused by the React dashboard as-is.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

# ── Enum literals (mirrors the ORM check constraints) ─────────────────────────
VALID_CATEGORIES = {"Fire", "Flood", "Medical", "Accident", "Other"}
VALID_SEVERITIES = {"High", "Medium", "Low"}
VALID_STATUSES = {"Pending", "Assigned", "Resolved"}


# ── Shared base ───────────────────────────────────────────────────────────────

class IncidentBase(BaseModel):
    """Fields shared between create and response schemas."""

    title: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Short incident title",
        examples=["Building fire on Main St"],
    )
    description: str = Field(
        ...,
        min_length=10,
        description="Detailed description of the emergency",
        examples=["Multi-story residential building fire, occupants trapped on 3rd floor."],
    )
    latitude: float = Field(
        ...,
        description="Geographic latitude (-90 to 90)",
        examples=[37.7749],
    )
    longitude: float = Field(
        ...,
        description="Geographic longitude (-180 to 180)",
        examples=[-122.4194],
    )
    category: str = Field(
        ...,
        description=f"Incident category. Allowed: {sorted(VALID_CATEGORIES)}",
        examples=["Fire"],
    )
    reporter_info: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional reporter contact / name",
        examples=["John Doe, +1-555-0100"],
    )

    # ── Validators ────────────────────────────────────────────────────────────

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError("latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError("longitude must be between -180 and 180")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(
                f"category must be one of {sorted(VALID_CATEGORIES)}, got '{v}'"
            )
        return v


# ── Create request ────────────────────────────────────────────────────────────

class IncidentCreate(IncidentBase):
    """
    Request body for POST /api/incidents.

    severity is optional.  If omitted, the service layer assigns
    settings.DEFAULT_SEVERITY.  Phase 2 will replace this with AI
    classification output.
    """

    severity: Optional[str] = Field(
        default=None,
        description=(
            f"Incident severity. Allowed: {sorted(VALID_SEVERITIES)}. "
            "Defaults to the configured DEFAULT_SEVERITY when omitted."
        ),
        examples=["High"],
    )

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_SEVERITIES:
            raise ValueError(
                f"severity must be one of {sorted(VALID_SEVERITIES)}, got '{v}'"
            )
        return v


# ── Status-update request ─────────────────────────────────────────────────────

class IncidentStatusUpdate(BaseModel):
    """Request body for PATCH /api/incidents/{id}/status."""

    status: str = Field(
        ...,
        description=f"New status. Allowed: {sorted(VALID_STATUSES)}",
        examples=["Assigned"],
    )

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(
                f"status must be one of {sorted(VALID_STATUSES)}, got '{v}'"
            )
        return v


# ── Response ──────────────────────────────────────────────────────────────────

class IncidentResponse(IncidentBase):
    """
    Full incident representation returned by GET and POST endpoints.

    Phase 2 additions (do not add yet):
      - ai_severity: Optional[str]
      - ai_category: Optional[str]
      - duplicate_of_id: Optional[int]
      - is_consolidated: bool
    """

    id: int
    severity: str
    status: str
    is_duplicate: bool
    duplicate_of_id: Optional[int] = None
    classification_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}  # replaces orm_mode=True in v2


# ── Paginated list response ───────────────────────────────────────────────────

class IncidentListResponse(BaseModel):
    """Paginated list of incidents."""

    items: List[IncidentResponse]
    total: int = Field(description="Total matching incidents (before pagination)")
    page: int
    page_size: int
    total_pages: int


# ── Query filter params (used by the service, not a Pydantic model) ───────────
# Kept here for co-location with other schema definitions.

class IncidentFilters(BaseModel):
    """Optional query-string filters for GET /api/incidents."""

    category: Optional[str] = Field(default=None)
    severity: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    page: int = Field(default=1, ge=1, description="1-indexed page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")

    @field_validator("category")
    @classmethod
    def validate_filter_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"category filter must be one of {sorted(VALID_CATEGORIES)}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_filter_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_SEVERITIES:
            raise ValueError(f"severity filter must be one of {sorted(VALID_SEVERITIES)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_filter_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"status filter must be one of {sorted(VALID_STATUSES)}")
        return v
