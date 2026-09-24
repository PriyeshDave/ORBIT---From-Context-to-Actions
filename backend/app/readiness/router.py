"""
Readiness capability routes: the /ws/readiness/chat WebSocket (multi-agent
run, streamed live), plus REST endpoints for replaying a completed run
(/flow) and uploading real project docs.

Unlike Catch Up and Planner, Readiness has no per-persona ACL in this demo -
it's a shared, team-wide readiness assistant rather than a personalized
one. It still sits behind Orbit's single login at the app level (the
frontend won't reach this page without a session), but individual calls
here don't re-check a session token the way the other two capabilities do -
this matches the original standalone demo's scope.
"""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.shared.config import get_settings
from app.readiness.schemas import EventType, TraceEvent
from app.readiness.orchestrator.graph import run_orchestration
from app.readiness.observability.metrics import run_registry
from app.readiness.mcp.servers import uploaded_store

router = APIRouter(prefix="/api/readiness", tags=["readiness"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".txt", ".md"}


@router.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        request = json.loads(raw)
        query = request.get("query", "").strip()
        session_id = request.get("session_id", "sess-default")
        uploaded_doc_ids = request.get("uploaded_doc_ids", [])

        if not query:
            await websocket.send_json(TraceEvent(event_type=EventType.ERROR, run_id="n/a", message="Empty query.").model_dump(mode="json"))
            return

        async def emit(event: TraceEvent) -> None:
            await websocket.send_json(event.model_dump(mode="json"))

        await run_orchestration(query, session_id, uploaded_doc_ids, emit)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json(TraceEvent(event_type=EventType.ERROR, run_id="n/a", message=str(exc)).model_dump(mode="json"))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/flow/runs")
async def list_runs() -> dict:
    return {"run_ids": run_registry.all_run_ids()}


@router.get("/flow/runs/{run_id}")
async def get_run(run_id: str) -> dict:
    events = run_registry.get(run_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"No trace found for run_id={run_id}")
    return {"run_id": run_id, "event_count": len(events), "events": [e.model_dump(mode="json") for e in events]}


@router.post("/uploads")
async def upload_doc(file: UploadFile = File(...)) -> dict:
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Only {ALLOWED_EXTENSIONS} files are supported in this demo")

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_mb}MB limit")

    doc_id = f"doc-{uuid.uuid4().hex[:10]}"
    uploaded_store[doc_id] = content.decode("utf-8", errors="ignore")
    return {"doc_id": doc_id, "filename": file.filename, "size_bytes": len(content)}
