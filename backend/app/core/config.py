"""
app/core/config.py
──────────────────
Central configuration loaded from environment variables via pydantic-settings.
All secrets and tunables live here; nothing is hardcoded elsewhere.

Adding a new config key:
  1. Add the field below with a sensible default.
  2. Add the corresponding line to .env.example.
  3. Import `settings` wherever needed.
"""

from __future__ import annotations

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings resolved from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # silently ignore unknown env vars
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_TITLE: str = "Disaster & Emergency Management API"
    APP_VERSION: str = "1.0.0"

    # ── Database ──────────────────────────────────────────────────────────────
    # Production: postgresql+psycopg://user:pass@host:port/dbname
    DATABASE_URL: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/disaster_mgmt"
    )
    # Test database (SQLite via aiosqlite — no PG required for CI)
    TEST_DATABASE_URL: str = "sqlite+aiosqlite:///./test_disaster.db"

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins, e.g.:
    #   CORS_ORIGINS=http://localhost:5173,https://myapp.com
    # Phase 4 React dev server defaults to http://localhost:5173.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Return CORS origins as a list, stripping whitespace."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── Incident defaults ─────────────────────────────────────────────────────
    # Phase 2 will replace DEFAULT_SEVERITY with AI classification output.
    DEFAULT_SEVERITY: str = "Medium"

    @field_validator("DEFAULT_SEVERITY")
    @classmethod
    def validate_default_severity(cls, v: str) -> str:
        allowed = {"Low", "Medium", "High"}
        if v not in allowed:
            raise ValueError(f"DEFAULT_SEVERITY must be one of {allowed}")
        return v

    # ── Phase 3: Notification settings ───────────────────────────────────────
    # Master switch — set to false to silence all notifications globally.
    NOTIFICATION_ENABLED: bool = True

    # Comma-separated list of severity levels that trigger an alert.
    # Default: only High incidents page responders.
    NOTIFY_ON_SEVERITIES: str = "High"

    # Comma-separated list of emergency responder groups to include in alerts.
    EMERGENCY_HANDLERS: str = "Police,Fire Department,Medical Response"

    @property
    def notify_severities_list(self) -> List[str]:
        """Return severities that trigger notifications as a list."""
        return [s.strip() for s in self.NOTIFY_ON_SEVERITIES.split(",") if s.strip()]

    @property
    def emergency_handlers_list(self) -> List[str]:
        """Return emergency handler names as a list."""
        return [h.strip() for h in self.EMERGENCY_HANDLERS.split(",") if h.strip()]

    # ── Phase 3: Twilio (optional — leave blank to use mock dispatcher) ───────
    # To enable real SMS, set all four variables and install: pip install twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""   # E.164 format, e.g. +15005550006
    TWILIO_TO_NUMBERS: str = ""    # Comma-separated E.164 numbers to notify

    @property
    def twilio_enabled(self) -> bool:
        """True only when all required Twilio credentials are configured."""
        return bool(
            self.TWILIO_ACCOUNT_SID
            and self.TWILIO_AUTH_TOKEN
            and self.TWILIO_FROM_NUMBER
            and self.TWILIO_TO_NUMBERS
        )

    @property
    def twilio_to_numbers_list(self) -> List[str]:
        """Return Twilio destination numbers as a list."""
        return [n.strip() for n in self.TWILIO_TO_NUMBERS.split(",") if n.strip()]


# Module-level singleton — import this everywhere
settings = Settings()
