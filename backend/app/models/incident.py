"""
models/incident.py
──────────────────
SQLAlchemy ORM model for the `incidents` table.

Extensibility notes (for future phases)
────────────────────────────────────────
Phase 2 — Duplicate detection & AI classification:
  • Add `duplicate_of_id: Mapped[Optional[int]]` FK → incidents.id
  • Add `ai_severity: Mapped[Optional[str]]`         (AI classifier output)
  • Add `ai_category: Mapped[Optional[str]]`         (AI classifier output)
  • Add `is_consolidated: Mapped[bool]`              (master report flag)

Phase 3 — Responder assignment:
  • Add a `responders` relationship via a join table (incidents_responders).

Phase 4 — Audit history:
  • Add an `AuditLog` model referencing `incident_id`.

None of the above require renaming or dropping existing columns.
"""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Incident(Base, TimestampMixin):
    """
    Represents a single emergency incident report.

    Geographic storage
    ──────────────────
    latitude and longitude are stored as NUMERIC(10, 7), giving 7 decimal
    places (~1 cm precision).  This type is compatible with PostGIS geometry
    columns so a Phase 2 migration can add a geometry column alongside these
    without dropping them.

    Enum columns
    ────────────
    category, severity, and status are VARCHAR columns constrained by
    CheckConstraints rather than PostgreSQL native ENUM types.  This makes
    adding new enum values a simple ALTER TABLE (no DROP/RECREATE needed).
    """

    __tablename__ = "incidents"

    # ── Primary key ───────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── Core fields ───────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Geography — NUMERIC(10,7) for ~1 cm precision ─────────────────────────
    # Phase 2: add a `location` geometry column via GeoAlchemy2 alongside these.
    latitude: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=7), nullable=False
    )
    longitude: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=7), nullable=False
    )

    # ── Classification ────────────────────────────────────────────────────────
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Pending", index=True
    )

    # ── Optional reporter information ──────────────────────────────────────────
    reporter_info: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Table-level constraints & composite indexes ───────────────────────────
    __table_args__ = (
        CheckConstraint(
            "category IN ('Fire', 'Flood', 'Medical', 'Accident', 'Other')",
            name="ck_incidents_category",
        ),
        CheckConstraint(
            "severity IN ('High', 'Medium', 'Low')",
            name="ck_incidents_severity",
        ),
        CheckConstraint(
            "status IN ('Pending', 'Assigned', 'Resolved')",
            name="ck_incidents_status",
        ),
        CheckConstraint(
            "latitude BETWEEN -90 AND 90",
            name="ck_incidents_latitude_range",
        ),
        CheckConstraint(
            "longitude BETWEEN -180 AND 180",
            name="ck_incidents_longitude_range",
        ),
        # Composite index: common dashboard query — active high-severity incidents
        Index("ix_incidents_status_severity", "status", "severity"),
        # Composite index: geographic bounding-box queries (Phase 2)
        Index("ix_incidents_lat_lon", "latitude", "longitude"),
    )

    def __repr__(self) -> str:
        return (
            f"<Incident id={self.id} title={self.title!r} "
            f"status={self.status} severity={self.severity}>"
        )
