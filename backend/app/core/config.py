"""ResQGrid — application configuration (pydantic-settings)."""
from __future__ import annotations

from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configurable settings; missing keys fall back to empty string → mock mode."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./resq.db"

    # LLM — Groq (primary)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # LLM — Gemini (fallback)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM: str = ""
    DEFAULT_SMS_TO: str = ""

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    DEFAULT_EMAIL_TO: str = ""

    # SLA & dispatch
    SLA_TIME_SCALE: float = 1.0
    AUTO_DISPATCH_P1: bool = False

    # CORS — accepts comma-separated string or a list
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173"

    # Geography defaults (Vadodara city centre)
    DEFAULT_CITY_LAT: float = 22.30
    DEFAULT_CITY_LNG: float = 73.19

    # LLM tuning
    LLM_TIMEOUT_S: float = 4.0

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: object) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return list(v)  # type: ignore[arg-type]

    def cors_list(self) -> List[str]:
        """Return CORS origins as a list (always)."""
        origins = self.CORS_ORIGINS
        if isinstance(origins, str):
            return [o.strip() for o in origins.split(",") if o.strip()]
        return list(origins)


settings = Settings()
