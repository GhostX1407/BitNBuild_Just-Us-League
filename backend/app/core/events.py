"""ResQGrid — Real-time EventBus and WebSocket ConnectionManager.

Provides:
    bus: EventBus singleton with async publish(type, payload) and subscribe(cb)
    manager: ConnectionManager singleton managing WebSocket connections and broadcasts
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
from typing import Any, Awaitable, Callable, Dict, List, Union
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


def _json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime.datetime, datetime.date)):
        if isinstance(obj, datetime.datetime) and obj.tzinfo is None:
            obj = obj.replace(tzinfo=datetime.timezone.utc)
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    if hasattr(obj, "dict") and callable(obj.dict):
        return obj.dict()
    if hasattr(obj, "model_dump") and callable(obj.model_dump):
        return obj.model_dump()
    raise TypeError(f"Type {type(obj)} not serializable")


def dumps_json(data: Any) -> str:
    """Serialize data to JSON string supporting datetimes, UUIDs, and Pydantic models."""
    return json.dumps(data, default=_json_serial)


class ConnectionManager:
    """Manages active WebSocket connections and broadcasting."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept incoming connection and add to active list."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info("WebSocket connected. Active connections: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove connection from active list."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket disconnected. Active connections: %d", len(self.active_connections))

    async def broadcast(self, message: Union[Dict[str, Any], str]) -> None:
        """Broadcast JSON message to all active WebSocket clients, dropping dead sockets."""
        if isinstance(message, dict):
            text_data = dumps_json(message)
        else:
            text_data = message

        dead_connections: List[WebSocket] = []

        async with self._lock:
            connections = list(self.active_connections)

        for ws in connections:
            try:
                await ws.send_text(text_data)
            except Exception as exc:
                logger.debug("Failed sending to WebSocket, marking for removal: %s", exc)
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for dead in dead_connections:
                    if dead in self.active_connections:
                        self.active_connections.remove(dead)
            logger.debug("Cleaned up %d dead WebSocket connection(s)", len(dead_connections))


class EventBus:
    """In-process and WebSocket event publisher."""

    def __init__(self, connection_manager: ConnectionManager) -> None:
        self.manager = connection_manager
        self._subscribers: List[Callable[[str, Dict[str, Any]], Union[Awaitable[None], None]]] = []

    def subscribe(
        self, callback: Callable[[str, Dict[str, Any]], Union[Awaitable[None], None]]
    ) -> None:
        """Register an in-process listener callback: cb(type: str, payload: dict)."""
        if callback not in self._subscribers:
            self._subscribers.append(callback)

    def unsubscribe(
        self, callback: Callable[[str, Dict[str, Any]], Union[Awaitable[None], None]]
    ) -> None:
        """Unregister an in-process listener callback."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def publish(self, event_type: str, payload: Dict[str, Any]) -> None:
        """Publish an event to all connected WebSocket clients and in-process subscribers.

        Args:
            event_type: Event identifier (e.g. 'incident.upsert', 'unit.update', 'alert.new')
            payload: Event data dictionary
        """
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        envelope = {
            "type": event_type,
            "ts": now,
            "payload": payload,
        }

        # 1. Broadcast to WebSockets
        try:
            await self.manager.broadcast(envelope)
        except Exception as exc:
            logger.warning("EventBus WS broadcast failed: %s", exc)

        # 2. Notify in-process subscribers
        for sub in list(self._subscribers):
            try:
                res = sub(event_type, payload)
                if asyncio.iscoroutine(res):
                    asyncio.create_task(res)
            except Exception as exc:
                logger.warning("EventBus subscriber %s raised error: %s", sub, exc)


# Singletons
manager = ConnectionManager()
bus = EventBus(manager)
