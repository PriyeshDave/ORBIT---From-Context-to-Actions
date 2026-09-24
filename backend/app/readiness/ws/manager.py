from __future__ import annotations

from fastapi import WebSocket

from app.readiness.schemas import TraceEvent


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, run_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(run_id, []).append(ws)

    def disconnect(self, run_id: str, ws: WebSocket) -> None:
        if run_id in self._connections and ws in self._connections[run_id]:
            self._connections[run_id].remove(ws)

    async def broadcast(self, run_id: str, event: TraceEvent) -> None:
        for ws in list(self._connections.get(run_id, [])):
            try:
                await ws.send_json(event.model_dump(mode="json"))
            except Exception:
                self.disconnect(run_id, ws)


manager = ConnectionManager()
