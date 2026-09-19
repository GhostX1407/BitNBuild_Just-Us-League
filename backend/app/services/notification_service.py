"""
services/notification_service.py
──────────────────────────────────
Phase 3: Instant Notification System.

Dispatch strategy
─────────────────
1. If TWILIO_* credentials are fully configured → SMS via Twilio.
2. Otherwise → Mock/console dispatcher (default for dev/CI).

All public functions are `async` and swallow exceptions internally so
that a notification failure NEVER breaks the incident-creation response.

Adding a new dispatcher (e.g., email, push, WebSocket):
  1. Write an `async def _<name>_dispatch(incident)` function.
  2. Add a branch in `dispatch_alert` to call it.
  3. No other files need changing.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.models.incident import Incident

logger = logging.getLogger(__name__)

# ── Public entry point ────────────────────────────────────────────────────────


async def dispatch_alert(incident: Incident) -> None:
    """
    Trigger an emergency notification for the given incident.

    Called as a FastAPI BackgroundTask — must never raise; all errors
    are caught and logged so the API response is unaffected.
    """
    if not settings.NOTIFICATION_ENABLED:
        logger.debug("Notifications disabled (NOTIFICATION_ENABLED=false). Skipping.")
        return

    try:
        if settings.twilio_enabled:
            await _twilio_dispatch(incident)
        else:
            await _mock_dispatch(incident)
    except Exception:
        logger.exception(
            "Notification dispatch failed for incident %s. "
            "Incident was saved successfully — this error is non-fatal.",
            incident.id,
        )


# ── Mock dispatcher (default) ─────────────────────────────────────────────────


async def _mock_dispatch(incident: Incident) -> None:
    """
    Console / log-based mock dispatcher.

    Prints a formatted alert block and logs it at WARNING level so it
    is visible in standard server output without extra configuration.
    """
    recipients = ", ".join(settings.emergency_handlers_list) or "N/A"
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    alert = (
        "\n"
        "╔══════════════════════════════════════════════════════╗\n"
        "║           🚨  EMERGENCY ALERT DISPATCHED  🚨          ║\n"
        "╠══════════════════════════════════════════════════════╣\n"
        f"║  Incident ID  : INC-{incident.id:<34} ║\n"
        f"║  Category     : {incident.category:<38} ║\n"
        f"║  Severity     : {incident.severity:<38} ║\n"
        f"║  Description  : {str(incident.description or '')[:38]:<38} ║\n"
        f"║  Recipients   : {recipients[:38]:<38} ║\n"
        f"║  Timestamp    : {timestamp:<38} ║\n"
        "║  Status       : MOCK_SENT                            ║\n"
        "╚══════════════════════════════════════════════════════╝"
    )

    # Print directly so it always appears in the console (even when log
    # level is set higher than WARNING in production).
    print(alert, flush=True)
    logger.warning(
        "MOCK alert dispatched for incident INC-%s (severity=%s, category=%s)",
        incident.id,
        incident.severity,
        incident.category,
    )


# ── Twilio dispatcher (optional) ─────────────────────────────────────────────


async def _twilio_dispatch(incident: Incident) -> None:
    """
    Send SMS alerts via Twilio to all configured TO numbers.

    Requires: pip install twilio
    Env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
              TWILIO_FROM_NUMBER, TWILIO_TO_NUMBERS

    If the `twilio` package is not installed this function falls back
    to the mock dispatcher gracefully.
    """
    try:
        from twilio.rest import Client  # type: ignore[import]
    except ImportError:
        logger.warning(
            "Twilio credentials are set but the `twilio` package is not installed. "
            "Falling back to mock dispatcher. Run: pip install twilio"
        )
        await _mock_dispatch(incident)
        return

    recipients = ", ".join(settings.emergency_handlers_list)
    body = (
        f"🚨 EMERGENCY ALERT\n"
        f"INC-{incident.id} | {incident.category} | {incident.severity}\n"
        f"{incident.description or 'No description'}\n"
        f"Notify: {recipients}"
    )

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    for to_number in settings.twilio_to_numbers_list:
        try:
            message = client.messages.create(
                body=body,
                from_=settings.TWILIO_FROM_NUMBER,
                to=to_number,
            )
            logger.info(
                "Twilio SMS sent to %s for incident INC-%s. SID: %s",
                to_number,
                incident.id,
                message.sid,
            )
        except Exception:
            logger.exception(
                "Twilio SMS failed for number %s, incident INC-%s.",
                to_number,
                incident.id,
            )
