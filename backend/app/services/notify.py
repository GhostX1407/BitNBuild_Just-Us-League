"""ResQGrid — Multi-Channel Notification Router.

Routes events to in-app (WebSocket), SMS (Twilio or mock), and Email (SMTP or mock).
Resilient: never raises an exception to the caller.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.events import bus
from app.db.models import Incident, Notification
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

TEMPLATES_PATH = Path(__file__).parent.parent / "data" / "templates.json"


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _load_templates() -> Dict[str, Any]:
    try:
        if TEMPLATES_PATH.exists():
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as exc:
        logger.warning("Failed to load templates.json: %s", exc)
    return {}


_TEMPLATES_CACHE = _load_templates()


def _format_message(event: str, incident: Optional[Incident], data: Dict[str, Any]) -> tuple[str, str]:
    """Generate subject and body for a notification event."""
    code = incident.code if incident else data.get("code", "INC-ALERT")
    area = incident.area if incident else data.get("area", "Vadodara")
    inc_type = (incident.type if incident else data.get("type", "Incident")).replace("_", " ").title()
    sev = incident.severity if incident else data.get("severity", 1)
    priority = incident.priority if incident else data.get("priority", "P3")
    msg = data.get("message") or data.get("alert", {}).get("message") or ""
    level = data.get("level", 1)
    status = data.get("status") or (incident.status if incident else "updated")

    if event == "incident.created":
        subject = f"New Emergency Incident: {code} ({priority})"
        body = f"A new {inc_type} incident has been reported in {area}. Severity: {sev}, Priority: {priority}."
    elif event == "incident.escalated":
        subject = f"CRITICAL ESCALATION: {code}"
        body = f"Incident {code} in {area} has escalated to Severity {sev}. Immediate reinforcement required."
    elif event == "assignment.created":
        subject = f"Emergency Dispatch Assignment: {code}"
        body = f"Response units have been dispatched to {code} in {area}. Please coordinate en-route."
    elif event == "status.changed":
        subject = f"Status Update: {code} is {status}"
        body = f"Incident {code} in {area} status changed to {status}."
    elif event == "alert.critical":
        subject = f"CRITICAL ALERT: {code} ({priority})"
        body = f"High priority alert for {code} in {area}: {msg}"
    elif event == "alert.delayed":
        subject = f"DELAYED RESPONSE WARNING: {code}"
        body = f"SLA response delay detected for {code}: {msg}"
    elif event == "alert.escalation":
        subject = f"ESCALATION LADDER (Level {level}): {code}"
        body = f"Incident {code} escalated to Level {level}: {msg}"
    elif event == "incident.resolved":
        subject = f"Incident Resolved: {code}"
        body = f"Incident {code} in {area} has been successfully resolved and closed."
    else:
        subject = f"ResQGrid Notification: {code}"
        body = msg or f"Update for incident {code} in {area}."

    return subject, body


async def _send_twilio_sms(to_phone: str, body: str) -> bool:
    """Send SMS via Twilio REST API with 1 retry."""
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM):
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    data = {"From": settings.TWILIO_FROM, "To": to_phone, "Body": body}

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, data=data, auth=auth)
                if res.status_code in (200, 201):
                    return True
                logger.warning("Twilio SMS attempt %d failed: %s", attempt + 1, res.text)
        except Exception as exc:
            logger.warning("Twilio SMS attempt %d error: %s", attempt + 1, exc)
        await asyncio.sleep(0.5)
    return False


def _send_smtp_email(to_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP with 1 retry."""
    if not (settings.SMTP_HOST and settings.SMTP_USER):
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.set_content(body)

    for attempt in range(2):
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                server.starttls()
                if settings.SMTP_PASS:
                    server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
                return True
        except Exception as exc:
            logger.warning("SMTP email attempt %d error: %s", attempt + 1, exc)
    return False


async def route(event: str, incident_id: Optional[str], data: Dict[str, Any]) -> None:
    """Route notification event to all configured channels (in-app, SMS, email).

    Guaranteed never to raise an exception.
    """
    try:
        templates = _TEMPLATES_CACHE or _load_templates()
        recipients_cfg = templates.get("recipients", {})
        escalation_cfg = templates.get("escalation", {})

        now = _now_utc()
        incident: Optional[Incident] = None

        # 1. Load incident if ID provided
        if incident_id:
            try:
                async with SessionLocal() as session:
                    incident = await session.get(Incident, incident_id)
            except Exception as exc:
                logger.debug("notify.route: failed to load incident: %s", exc)

        subject, body = _format_message(event, incident, data)

        # 2. Determine target role and recipients
        level = data.get("level", 0)
        target_role = "dispatcher"
        if level == 1:
            target_role = "shift_supervisor"
        elif level == 2:
            target_role = "district_commander"
        elif level >= 3:
            target_role = "state_authority"

        role_info = recipients_cfg.get(target_role, {})
        recipient_name = role_info.get("name", "Duty Operator")
        phone = role_info.get("phone", settings.DEFAULT_SMS_TO or "+91-98765-43210")
        email_addr = role_info.get("email", settings.DEFAULT_EMAIL_TO or "alerts@vadodara-resq.gov.in")

        notifications_to_add: List[Notification] = []

        # 3. Channel: In-App Notification (Always)
        inapp_notif = Notification(
            id=str(uuid4()),
            event=event,
            recipient=recipient_name,
            role=target_role,
            channel="inapp",
            subject=subject,
            body=body,
            status="sent",
            incident_id=incident_id,
            created_at=now,
        )
        notifications_to_add.append(inapp_notif)

        # 4. Channel: SMS (Real if configured, else Mock)
        has_twilio = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM)
        sms_status = "mock"
        if has_twilio and phone:
            sms_ok = await _send_twilio_sms(phone, f"{subject}\n{body}")
            sms_status = "sent" if sms_ok else "failed"

        sms_notif = Notification(
            id=str(uuid4()),
            event=event,
            recipient=phone,
            role=target_role,
            channel="sms",
            subject=subject,
            body=body,
            status=sms_status,
            incident_id=incident_id,
            created_at=now,
        )
        notifications_to_add.append(sms_notif)

        # 5. Channel: Email (Real if configured, else Mock)
        has_smtp = bool(settings.SMTP_HOST and settings.SMTP_USER)
        email_status = "mock"
        if has_smtp and email_addr:
            email_ok = await asyncio.to_thread(_send_smtp_email, email_addr, subject, body)
            email_status = "sent" if email_ok else "failed"

        email_notif = Notification(
            id=str(uuid4()),
            event=event,
            recipient=email_addr,
            role=target_role,
            channel="email",
            subject=subject,
            body=body,
            status=email_status,
            incident_id=incident_id,
            created_at=now,
        )
        notifications_to_add.append(email_notif)

        # 6. Persist notifications to DB
        async with SessionLocal() as session:
            for n in notifications_to_add:
                session.add(n)
            await session.commit()

        # 7. Broadcast in-app notification via EventBus
        notif_dict = {
            "id": inapp_notif.id,
            "event": inapp_notif.event,
            "recipient": inapp_notif.recipient,
            "role": inapp_notif.role,
            "channel": inapp_notif.channel,
            "subject": inapp_notif.subject,
            "body": inapp_notif.body,
            "status": inapp_notif.status,
            "incident_id": inapp_notif.incident_id,
            "created_at": inapp_notif.created_at.isoformat(),
        }
        await bus.publish("notification.new", notif_dict)

    except Exception as exc:
        logger.warning("notify.route failed (handled safely): %s", exc)
