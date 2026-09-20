"""ResQGrid — AI assist API endpoints."""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_assist import get_summary, get_sop, get_brief, query as ai_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])


class QueryBody(BaseModel):
    q: str


@router.post("/incident/{incident_id}/summary")
async def incident_summary(incident_id: str) -> Dict[str, Any]:
    """AI-generated summary, timeline, risks, and questions for an incident."""
    result = await get_summary(incident_id)
    if result.get("summary") == "Incident not found.":
        raise HTTPException(status_code=404, detail="Incident not found")
    return result


@router.post("/incident/{incident_id}/sop")
async def incident_sop(incident_id: str) -> Dict[str, Any]:
    """SOP checklist tailored to the incident type."""
    try:
        return await get_sop(incident_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("SOP error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/brief")
async def global_brief() -> Dict[str, Any]:
    """Global situation brief with top risks and reinforcement recommendations."""
    return await get_brief()


@router.post("/query")
async def nl_query(body: QueryBody) -> Dict[str, Any]:
    """Answer a natural-language question about the current situation."""
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    return await ai_query(body.q)
