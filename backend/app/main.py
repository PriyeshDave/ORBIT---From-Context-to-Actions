"""
Orbit - unified backend entrypoint.

Mounts three capability routers behind one login:
  /api/catchup/*   - RecapPilot: 7-step chained-reasoning meeting catch-up
  /api/planner/*   - FocusPilot: real-MCP tool fan-out + daily plan
  /api/readiness/* - ReadinessIQ: LangGraph multi-agent readiness check

Plus one new capability that doesn't exist in any of the three original
demos: /api/home/summary, which pulls a one-line status from each
capability so the Home dashboard can tell one coherent story instead of
three separate tabs.
"""
from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.shared.config import get_settings
from app.shared import auth as mock_auth
from app.shared.schemas import LoginRequest, LoginResponse, PersonaSummary

settings = get_settings()

# LangChain/LangGraph (used by the Readiness capability) read tracing config
# from process env vars - export from our own settings object at startup so
# .env stays the single source of truth.
os.environ["LANGCHAIN_TRACING_V2"] = str(settings.langchain_tracing_v2).lower()
os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint

app = FastAPI(
    title="Orbit - Digital Workplace Agentic AI Suite (Demo)",
    description=(
        "One colleague workspace, three agentic AI patterns: chained-reasoning "
        "meeting catch-up, MCP-powered daily planning, and LangGraph multi-agent "
        "project readiness checks - unified behind a single login for the "
        "Digital Workplace team at American Express."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _persona_from_header(x_session_token: str | None) -> str:
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Missing session token. Please log in.")
    persona_id = mock_auth.resolve_session(x_session_token)
    if not persona_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")
    return persona_id


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "env": settings.app_env,
        "model": settings.openai_model,
        "langsmith_enabled": settings.langsmith_enabled,
        "capabilities": ["catchup", "planner", "readiness"],
    }


# ---------------------------------------------------------------------------
# Unified auth - one login for all three capabilities
# ---------------------------------------------------------------------------

@app.get("/api/personas")
def personas():
    # Strip `password` before this ever reaches the frontend - the login
    # screen needs to show who's available, never their credentials.
    safe_personas = [
        {k: v for k, v in p.items() if k != "password"}
        for p in mock_auth.list_personas()
    ]
    return {"personas": safe_personas}


@app.post("/api/login", response_model=LoginResponse)
def login(req: LoginRequest):
    persona = mock_auth.get_persona(req.persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Unknown persona.")
    if not mock_auth.verify_password(req.persona_id, req.password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    token = mock_auth.create_session(persona["id"])
    from app.planner import sre as _sre
    return LoginResponse(
        session_token=token,
        persona_id=persona["id"],
        name=persona["name"],
        role=persona["role"],
        avatar_color=persona["avatar_color"],
        connected_tools=persona.get("connected_tools", []),
        has_sre_dashboard=_sre.has_sre_dashboard(persona["id"]),
    )


# ---------------------------------------------------------------------------
# Home dashboard aggregator - the piece that makes this ONE product
# ---------------------------------------------------------------------------

@app.get("/api/home/summary")
def home_summary(x_session_token: str | None = Header(default=None)):
    """
    Pulls a lightweight status from each capability so the Home dashboard
    can greet the colleague with one coherent story - "here's what you
    missed, here's what to focus on, here's the project you're watching" -
    instead of three unrelated tabs. Each section degrades gracefully if
    that capability hasn't been used yet (e.g. no plan run today).
    """
    persona_id = _persona_from_header(x_session_token)
    persona = mock_auth.get_persona(persona_id)

    # --- Catch Up: how many meetings can this persona see, any missed today? ---
    from app.catchup import state as catchup_state
    eligible_meetings = mock_auth.search_meetings("", persona_id)
    catchup_summary = {
        "eligible_meeting_count": len(eligible_meetings),
        "meetings": [
            {"id": m["id"], "title": m["title"], "date": m["date"],
             "has_run": catchup_state.get_last_run(m["id"]) is not None}
            for m in eligible_meetings
        ],
    }

    # --- Planner: has a plan been generated yet today, top priority if so ---
    # A single "Get My Plan" click now generates all three periods at once,
    # so stats are summed across whichever periods exist, and the headline
    # "top priority" prefers whichever period matches the real current
    # hour - falling back through morning -> afternoon -> evening for the
    # first period that's actually been generated and still has something
    # pending.
    from datetime import datetime
    from app.planner import state as planner_state
    all_runs = planner_state.get_all_runs(persona_id)

    top_priority_item = None
    completed_count = 0
    partly_done_count = 0
    plan_item_count = 0
    if all_runs:
        for run in all_runs.values():
            for item in run.plan:
                plan_item_count += 1
                if item.status == "done":
                    completed_count += 1
                elif item.status == "partly_done":
                    partly_done_count += 1

        hour = datetime.now().hour
        current_period = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"
        period_order = [current_period] + [p for p in ("morning", "afternoon", "evening") if p != current_period]
        for period in period_order:
            run = all_runs.get(period)
            if not run:
                continue
            remaining = sorted((i for i in run.plan if i.status != "done"), key=lambda i: i.rank)
            if remaining:
                top_priority_item = remaining[0]
                break

    planner_summary = {
        "has_plan": len(all_runs) > 0,
        "connected_tools": persona.get("connected_tools", []) if persona else [],
        "top_priority": top_priority_item.title if top_priority_item else None,
        "top_priority_item": top_priority_item.model_dump() if top_priority_item else None,
        "plan_item_count": plan_item_count,
        "completed_count": completed_count,
        "partly_done_count": partly_done_count,
    }

    # --- Readiness: static pointer to the one tracked project (no per-persona state) ---
    readiness_summary = {
        "tracked_project": "Incident Data Management",
        "milestone": "E3 production rollout - pending MRMG approval",
        "suggested_question": "Are we ready for the E3 production rollout?",
    }

    return {
        "persona": {"id": persona_id, "name": persona["name"] if persona else persona_id, "role": persona["role"] if persona else ""},
        "catchup": catchup_summary,
        "planner": planner_summary,
        "readiness": readiness_summary,
    }


# ---------------------------------------------------------------------------
# Mount the three capability routers
# ---------------------------------------------------------------------------

from app.catchup.router import router as catchup_router
from app.planner.router import router as planner_router
from app.readiness.router import router as readiness_router

app.include_router(catchup_router)
app.include_router(planner_router)
app.include_router(readiness_router)
