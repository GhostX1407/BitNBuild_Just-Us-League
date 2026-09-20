"""ResQGrid — Simulator & Demo Control API Router.

Mounted under /api by main.py auto-discovery.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Body
from pydantic import BaseModel

from app.services import simulator

router = APIRouter(prefix="/sim", tags=["simulator"])


class SensorBreachRequest(BaseModel):
    sensor_id: Optional[str] = None


class DuplicateBurstRequest(BaseModel):
    incident_id: Optional[str] = None


class FastForwardRequest(BaseModel):
    scale: float = 0.2


@router.get("/state")
async def get_simulator_state() -> Dict[str, Any]:
    """Get current simulator state."""
    return simulator.get_state()


@router.post("/start")
async def start_simulator() -> Dict[str, Any]:
    """Start ambient low-severity feed and autopilot mode."""
    return simulator.start_sim()


@router.post("/stop")
async def stop_simulator() -> Dict[str, Any]:
    """Stop ambient feed and autopilot mode."""
    return simulator.stop_sim()


@router.post("/scenario/{name}")
async def trigger_scenario(name: str) -> Dict[str, Any]:
    """Trigger scripted scenario: 'flood', 'chemical_fire', or 'pileup'."""
    return simulator.run_scenario(name)


@router.post("/sensor-breach")
async def trigger_sensor_breach(
    req: Optional[SensorBreachRequest] = None,
) -> Dict[str, Any]:
    """Inject IoT sensor breach."""
    sid = req.sensor_id if req else None
    return await simulator.trigger_sensor_breach(sid)


@router.post("/duplicate-burst")
async def trigger_duplicate_burst(
    req: Optional[DuplicateBurstRequest] = None,
) -> Dict[str, Any]:
    """Inject duplicate report burst to trigger duplicate cluster alert."""
    iid = req.incident_id if req else None
    return await simulator.trigger_duplicate_burst(iid)


@router.post("/fast-forward")
async def fast_forward_sla(
    req: Optional[FastForwardRequest] = None,
) -> Dict[str, Any]:
    """Fast-forward SLA scale (e.g. 0.2 for rapid demo evaluation)."""
    scale = req.scale if req else 0.2
    return simulator.fast_forward(scale)


@router.post("/reset")
async def reset_system() -> Dict[str, Any]:
    """Reset system to clean state, restoring units, facilities, and sensors."""
    return await simulator.reset_system()
