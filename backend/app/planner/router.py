"""Planner (Daily Plan) capability routes, mounted under /api/planner by main.py."""
import json
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.shared import auth as mock_auth
from app.shared.telemetry import build_telemetry
from app.shared.openai_client import call_llm
from app.planner import brain
from app.planner import sre
from app.planner import state as run_state
from app.planner.mcp_client_manager import discover_server
from app.planner.schemas import (
    ChatRequest, ChatResponse, MCPDiscoveryResponse, MCPServerDiscovery,
    PlanFeedbackRequest, PlanRunLogResponse, PlanStatusRequest, SREIncidentActionRequest,
    SREIncidentActionResponse, ToolsStatusResponse, ToolStatus,
)

router = APIRouter(prefix="/api/planner", tags=["planner"])

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
ALL_TOOLS = ["outlook", "teams", "slack", "tracker"]
ALL_PERIODS = ["morning", "afternoon", "evening"]


def _persona_from_header(x_session_token: str | None) -> str:
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Missing session token. Please log in.")
    persona_id = mock_auth.resolve_session(x_session_token)
    if not persona_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")
    return persona_id


@router.get("/tools/status", response_model=ToolsStatusResponse)
def tools_status(x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    connected = set(mock_auth.connected_tools(persona_id))
    tools = [ToolStatus(tool=t, connected=t in connected) for t in ALL_TOOLS]
    return ToolsStatusResponse(persona_id=persona_id, tools=tools)


@router.get("/mcp/discovery", response_model=MCPDiscoveryResponse)
async def mcp_discovery(x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    connected = set(mock_auth.connected_tools(persona_id))
    servers: list[MCPServerDiscovery] = []
    for tool in ALL_TOOLS:
        servers.append(await discover_server(tool, tool in connected))
    return MCPDiscoveryResponse(persona_id=persona_id, servers=servers)


@router.get("/plan/run-stream")
async def run_plan_stream(time_of_day: str, free_text: str | None = None, x_session_token: str | None = None):
    """
    Streams the build of ONE period's plan (morning, afternoon, or
    evening). "Get My Plan" on the frontend calls this three times in a
    row - once per period - rather than this endpoint building all three
    itself, so progress for each period streams back as it completes
    instead of the whole request blocking until all three are done.
    """
    persona_id = _persona_from_header(x_session_token)
    if time_of_day not in ALL_PERIODS:
        raise HTTPException(status_code=400, detail="time_of_day must be morning, afternoon, or evening.")

    async def event_generator():
        async for event in brain.run_plan(persona_id, time_of_day, free_text):
            yield {"event": event.kind, "data": event.model_dump_json()}
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


@router.post("/plan/status", response_model=PlanRunLogResponse)
def update_plan_status(req: PlanStatusRequest, x_session_token: str | None = Header(default=None)):
    """
    Marks one plan item done or partly-done, for one specific period's
    plan. This mutates the persisted run in place (the single source of
    truth for "what does today's plan look like right now") rather than a
    separate status store - so the Home dashboard, this page, and any
    later-regenerated period all read the same state. A partly-done item
    requires a note describing what's left, since that note is what
    carries forward into the next plan run.
    """
    persona_id = _persona_from_header(x_session_token)
    if req.status == "partly_done" and not (req.note and req.note.strip()):
        raise HTTPException(status_code=400, detail="A note describing what's left is required for a partly-done item.")

    run = run_state.get_run(persona_id, req.time_of_day)
    if not run:
        raise HTTPException(status_code=404, detail=f"No {req.time_of_day} plan has been run yet for this persona.")

    item = next((i for i in run.plan if i.title == req.item_title), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"No plan item titled '{req.item_title}' in the {req.time_of_day} plan.")

    item.status = req.status
    item.progress_note = req.note if req.status == "partly_done" else None
    run_state.save_run(persona_id, req.time_of_day, run)
    return run


@router.get("/plan/run-log", response_model=PlanRunLogResponse)
def get_run_log(time_of_day: str, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    if time_of_day not in ALL_PERIODS:
        raise HTTPException(status_code=400, detail="time_of_day must be morning, afternoon, or evening.")
    run = run_state.get_run(persona_id, time_of_day)
    if not run:
        raise HTTPException(status_code=404, detail=f"No {time_of_day} plan has been run yet for this persona.")
    return run


@router.post("/plan/feedback", response_model=PlanRunLogResponse)
def submit_feedback(req: PlanFeedbackRequest, x_session_token: str | None = Header(default=None)):
    """
    Human-in-the-loop: the colleague reacts to one item in one period's
    plan (not relevant / top priority) and the agent re-reasons over that
    period's already-gathered tool data with the feedback folded in - a
    real second LLM pass, not a client-side reorder, but fast since it
    skips re-querying the connectors.
    """
    persona_id = _persona_from_header(x_session_token)
    try:
        updated = brain.adjust_plan(persona_id, req.time_of_day, req.item_title, req.feedback, req.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return updated


@router.get("/sre/dashboard")
def get_sre_dashboard(x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    dashboard = sre.get_dashboard(persona_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="No SRE dashboard is configured for this persona.")
    return dashboard


@router.post("/sre/incidents/{incident_id}/action", response_model=SREIncidentActionResponse)
def sre_incident_action(incident_id: str, req: SREIncidentActionRequest, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)
    try:
        message = sre.apply_action(persona_id, incident_id, req.note)
    except sre.SREValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return SREIncidentActionResponse(message=message)


@router.post("/plan/chat", response_model=ChatResponse)
def chat(req: ChatRequest, x_session_token: str | None = Header(default=None)):
    persona_id = _persona_from_header(x_session_token)

    if req.time_of_day:
        run = run_state.get_run(persona_id, req.time_of_day)
        plan_context = json.dumps([p.model_dump() for p in run.plan], indent=2) if run else f"No {req.time_of_day} plan has been generated yet for this user."
    else:
        all_runs = run_state.get_all_runs(persona_id)
        if all_runs:
            plan_context = json.dumps({tod: [p.model_dump() for p in r.plan] for tod, r in all_runs.items()}, indent=2)
        else:
            plan_context = "No plan has been generated yet for this user."

    with open(PROMPTS_DIR / "chat_followup.txt", "r", encoding="utf-8") as f:
        template = f.read()
    prompt = template.format(plan_context=plan_context, message=req.message)

    result = call_llm(system_prompt="You are a precise, helpful work-planning assistant. Answer only from the given plan context.", user_prompt=prompt)
    telem = build_telemetry("chat_followup", result)
    return ChatResponse(reply=result.text, telemetry=telem)
