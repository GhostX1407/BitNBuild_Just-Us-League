"""ResQGrid — Ingest API endpoints (6 sources + generic)."""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.schemas.report import (
    CitizenReportBody,
    CallReportBody,
    SensorReportBody,
    FieldReportBody,
    HospitalReportBody,
    DepartmentReportBody,
    GenericIngestBody,
)
from app.services.pipeline import ingest_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])


async def _run(source: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Thin wrapper that converts unexpected exceptions to HTTP 500."""
    try:
        return await ingest_report(source, payload)
    except Exception as exc:
        logger.exception("Ingest error source=%s: %s", source, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/citizen")
async def ingest_citizen(body: CitizenReportBody) -> Dict[str, Any]:
    """Ingest a citizen report."""
    return await _run("citizen", body.model_dump())


@router.post("/call")
async def ingest_call(body: CallReportBody) -> Dict[str, Any]:
    """Ingest an emergency-call transcript."""
    return await _run("call", body.model_dump())


@router.post("/sensor")
async def ingest_sensor(body: SensorReportBody) -> Dict[str, Any]:
    """Ingest a sensor breach reading."""
    return await _run("sensor", body.model_dump())


@router.post("/field")
async def ingest_field(body: FieldReportBody) -> Dict[str, Any]:
    """Ingest a field team report."""
    return await _run("field", body.model_dump())


@router.post("/hospital")
async def ingest_hospital(body: HospitalReportBody) -> Dict[str, Any]:
    """Ingest a hospital situation report."""
    return await _run("hospital", body.model_dump())


@router.post("/department")
async def ingest_department(body: DepartmentReportBody) -> Dict[str, Any]:
    """Ingest a department / agency report."""
    return await _run("department", body.model_dump())


@router.post("")
async def ingest_generic(body: GenericIngestBody) -> Dict[str, Any]:
    """Generic ingest endpoint (source + payload dict)."""
    return await _run(body.source, body.payload)
