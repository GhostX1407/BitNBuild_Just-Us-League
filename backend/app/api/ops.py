"""ResQGrid v2 — Audit trail, Handover, Post-incident Review APIs."""
from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import require_roles
from app.db.models import AuditEvent, Incident
from app.db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["audit-handover"], dependencies=[Depends(require_roles("dispatcher"))])


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------

@router.get("/audit", response_model=List[Dict[str, Any]])
async def get_audit(
    entity: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Paginated audit trail with optional entity/action filters."""
    stmt = select(AuditEvent).order_by(AuditEvent.ts.desc()).limit(limit)
    if entity:
        stmt = stmt.where(AuditEvent.entity == entity)
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id)
    if action:
        stmt = stmt.where(AuditEvent.action.contains(action))
    res = await session.execute(stmt)
    rows = res.scalars().all()
    return [
        {
            "id": r.id,
            "ts": _iso(r.ts),
            "actor": r.actor,
            "action": r.action,
            "entity": r.entity,
            "entity_id": r.entity_id,
            "data": r.data or {},
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Handover notes
# ---------------------------------------------------------------------------

class HandoverBody(BaseModel):
    outgoing: str  # dispatcher name
    incoming: str  # dispatcher name
    notes: str
    critical_incidents: Optional[List[str]] = None  # incident IDs


@router.post("/handover", response_model=Dict[str, Any])
async def create_handover(
    body: HandoverBody,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Record shift handover notes and AI-generate a situation brief."""
    # AI summarization of current situation for handover doc
    brief: Optional[str] = None
    try:
        from app.core.llm import complete_json
        # Build context from critical incidents
        inc_summaries = []
        for inc_id in (body.critical_incidents or []):
            inc = await session.get(Incident, inc_id)
            if inc:
                inc_summaries.append(f"[{inc.code}] {inc.title} — {inc.status} (P{inc.priority}): {inc.summary[:150]}")

        ctx = "\n".join(inc_summaries) if inc_summaries else "No critical incidents flagged."
        result = await complete_json(
            prompt=f"Write a concise shift handover brief for an emergency operations dispatcher.\n"
                   f"Outgoing: {body.outgoing}\nIncoming: {body.incoming}\n"
                   f"Handover notes: {body.notes}\nCritical incidents:\n{ctx}\n"
                   f"Return JSON: {{\"brief\": \"<2-3 sentences>\", \"watch_items\": [\"<item1>\", \"<item2>\"]}}",
            system="Emergency operations shift handover assistant.",
        )
        if result:
            brief = result.get("brief")
            watch = result.get("watch_items", [])
        else:
            watch = []
    except Exception as exc:
        logger.warning("Handover AI brief failed: %s", exc)
        watch = []
        brief = body.notes

    now = _now_utc()
    audit = AuditEvent(
        actor=body.outgoing,
        action="handover.shift",
        entity="system",
        entity_id="handover",
        data={
            "outgoing": body.outgoing,
            "incoming": body.incoming,
            "notes": body.notes,
            "brief": brief,
            "watch_items": watch,
            "critical_incidents": body.critical_incidents or [],
            "ts": now.isoformat(),
        },
    )
    session.add(audit)
    await session.commit()

    try:
        from app.core.events import bus
        await bus.publish("handover.shift", {
            "outgoing": body.outgoing,
            "incoming": body.incoming,
            "brief": brief,
            "watch_items": watch,
            "ts": now.isoformat(),
        })
    except Exception:
        pass

    return {
        "outgoing": body.outgoing,
        "incoming": body.incoming,
        "notes": body.notes,
        "brief": brief,
        "watch_items": watch,
        "ts": now.isoformat(),
    }


# ---------------------------------------------------------------------------
# Post-incident review
# ---------------------------------------------------------------------------

class ReviewBody(BaseModel):
    reviewer: str
    what_went_well: Optional[str] = None
    what_went_wrong: Optional[str] = None
    recommendations: Optional[str] = None


@router.post("/incidents/{incident_id}/review", response_model=Dict[str, Any])
async def post_incident_review(
    incident_id: str,
    body: ReviewBody,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """Attach a post-incident review with AI lesson-learned summary."""
    incident = await session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident.status not in ("resolved", "closed"):
        raise HTTPException(status_code=422, detail="Incident must be resolved or closed for review")

    # AI-generate lesson learned
    lessons: Optional[str] = None
    try:
        from app.core.llm import complete_json
        result = await complete_json(
            prompt=f"Generate a 2-sentence lesson learned for this post-incident review.\n"
                   f"Incident: {incident.title} ({incident.type}, P{incident.priority})\n"
                   f"What went well: {body.what_went_well or 'N/A'}\n"
                   f"What went wrong: {body.what_went_wrong or 'N/A'}\n"
                   f"Return JSON: {{\"lesson\": \"<text>\", \"improvement_area\": \"<one word>\"}}",
            system="Emergency response after-action review assistant.",
        )
        if result:
            lessons = result.get("lesson")
    except Exception:
        pass

    review_data = {
        "reviewer": body.reviewer,
        "what_went_well": body.what_went_well,
        "what_went_wrong": body.what_went_wrong,
        "recommendations": body.recommendations,
        "ai_lessons": lessons,
        "ts": _now_utc().isoformat(),
    }

    incident.review = review_data
    audit = AuditEvent(
        actor=body.reviewer,
        action="incident.review",
        entity="incident",
        entity_id=incident_id,
        data=review_data,
    )
    session.add(audit)
    await session.commit()
    await session.refresh(incident)

    return review_data
