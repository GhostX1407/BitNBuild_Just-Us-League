"""
database/base.py
────────────────
Declarative base and shared ORM mixins.

TimestampMixin:
  Provides `created_at` and `updated_at` columns for any model that
  inherits from it.  All timestamps are stored in UTC; application code
  never relies on database-level timezone handling.

Adding future mixins (e.g. SoftDeleteMixin, AuditMixin) follows the same
pattern: define the mixin here and add it to the relevant model classes.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


class TimestampMixin:
    """
    Mixin that adds `created_at` and `updated_at` to any ORM model.

    - created_at: set once on INSERT, never changes.
    - updated_at: updated on every UPDATE via application logic (not a DB
      trigger) so async sessions handle it predictably across all drivers.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        nullable=False,
        index=True,          # useful for time-range queries in Phase 2
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )
