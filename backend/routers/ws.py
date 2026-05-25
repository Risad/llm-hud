"""WebSocket endpoint — broadcasts usage updates to connected browser clients."""
from __future__ import annotations
import json
import logging
from collections import defaultdict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

# workspace_id → set of connected WebSockets
_connections: dict[str, set[WebSocket]] = defaultdict(set)


@router.websocket("/ws/{workspace_id}")
async def ws_endpoint(websocket: WebSocket, workspace_id: str):
    await websocket.accept()
    _connections[workspace_id].add(websocket)
    logger.debug("WS connected: workspace=%s total=%d", workspace_id, len(_connections[workspace_id]))
    try:
        while True:
            # Keep connection alive; client pings can come here too
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        _connections[workspace_id].discard(websocket)
        logger.debug("WS disconnected: workspace=%s", workspace_id)


async def broadcast(workspace_id: str, payload: dict) -> None:
    message = json.dumps(payload)
    dead: set[WebSocket] = set()
    for ws in list(_connections.get(workspace_id, [])):
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _connections[workspace_id].discard(ws)
