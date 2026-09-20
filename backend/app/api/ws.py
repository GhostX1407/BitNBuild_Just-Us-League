"""ResQGrid — WebSocket real-time event router.

Mounted at /api/ws by auto-discovery in main.py.
Handles connection lifecycle, initial hello handshake, and 20s keepalive ping/pong.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.events import dumps_json, manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, role: Optional[str] = None):
    """Real-time event stream WebSocket endpoint.

    On connection:
        1. Accepts connection and registers with ConnectionManager.
        2. Sends initial 'connection.established' hello message.
        3. Loops with 20s timeout sending keepalive pings and handling client messages.
        4. Cleans up on disconnect.
    """
    client_role = role or websocket.query_params.get("role", "dispatcher")
    await manager.connect(websocket)

    # 1. Hello message
    hello_msg = {
        "type": "connection.established",
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "payload": {
            "message": "Connected to ResQGrid realtime event stream",
            "role": client_role,
        },
    }
    try:
        await websocket.send_text(dumps_json(hello_msg))
    except Exception as exc:
        logger.debug("Failed to send hello message to WebSocket client: %s", exc)
        manager.disconnect(websocket)
        return

    # 2. Main loop with 20-second keepalive ping
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=20.0)
                # Handle client ping or messages
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    try:
                        parsed = json.loads(data)
                        if isinstance(parsed, dict) and parsed.get("type") == "ping":
                            pong = {
                                "type": "pong",
                                "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                "payload": {},
                            }
                            await websocket.send_text(dumps_json(pong))
                    except Exception:
                        pass
            except asyncio.TimeoutError:
                # Send periodic keepalive ping
                ping_msg = {
                    "type": "ping",
                    "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "payload": {},
                }
                await websocket.send_text(dumps_json(ping_msg))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.debug("WebSocket connection terminated: %s", exc)
        manager.disconnect(websocket)
