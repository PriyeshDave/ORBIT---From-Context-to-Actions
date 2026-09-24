"""
The Planner orchestration "brain" - discover which tools are connected,
fan out real MCP calls to each connected tool in parallel, feed everything
gathered into ONE reasoning LLM call that produces a prioritized,
time-of-day-aware plan.

Not a multi-agent system: one orchestrator, one reasoning call, N parallel
tool calls via the real MCP protocol. The parallelism comes essentially
for free because of MCP's uniform interface - no bespoke code per tool.
"""
import asyncio
import json
import time
from pathlib import Path
from typing import AsyncGenerator

from app.shared import auth as mock_auth
from app.planner.schemas import (
    ConnectorEvent, MCPCallTelemetry, PlanItem, PlanRunLogResponse, PlanRunSummary, ReasoningEvent,
)
from app.planner import state as run_state
from app.planner.mcp_client_manager import query_connector
from app.shared.telemetry import build_telemetry, langsmith_project_url, wrap_traceable
from app.shared.openai_client import call_llm

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

ALL_TOOLS = ["outlook", "teams", "slack", "tracker"]

SYSTEM_PROMPT = (
    "You are a precise, factual work-planning assistant. You never invent facts not "
    "present in the provided tool data. When asked for JSON, you return ONLY valid JSON "
    "with no markdown code fences and no extra commentary."
)


def _load_clock() -> dict:
    with open(DATA_DIR / "simulated_clock.json", "r", encoding="utf-8") as f:
        return json.load(f)


def _load_prompt(name: str) -> str:
    with open(PROMPTS_DIR / f"{name}.txt", "r", encoding="utf-8") as f:
        return f.read()


def _safe_json_parse(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"plan": [], "_parse_warning": "Model output could not be parsed as JSON."}


async def run_plan(persona_id: str, time_of_day: str, free_text: str | None = None) -> AsyncGenerator[ConnectorEvent | ReasoningEvent, None]:
    wall_clock_start = time.perf_counter()

    connected = set(mock_auth.connected_tools(persona_id))
    clock = _load_clock()
    as_of = clock["as_of"][time_of_day]

    connector_events: list[ConnectorEvent] = []
    tool_data: dict[str, dict] = {}
    total_mcp_latency_ms = 0

    tasks: dict[str, asyncio.Task] = {}
    for tool in ALL_TOOLS:
        if tool not in connected:
            ev = ConnectorEvent(tool=tool, status="skipped")
            connector_events.append(ev)
            yield ev
            continue
        yield ConnectorEvent(tool=tool, status="running")
        tasks[tool] = asyncio.create_task(query_connector(tool, persona_id, as_of))

    for tool, task in tasks.items():
        try:
            data, latency_ms, tool_names_called = await task
            tool_data[tool] = data
            total_mcp_latency_ms += latency_ms
            telem = MCPCallTelemetry(tool=tool, tool_name=tool_names_called, latency_ms=latency_ms, connected=True)
            ev = ConnectorEvent(tool=tool, status="done", telemetry=telem)
        except Exception as e:  # noqa: BLE001 - demo-grade: surface any MCP failure to the UI
            ev = ConnectorEvent(tool=tool, status="error", error=str(e))
        connector_events.append(ev)
        yield ev

    yield ReasoningEvent(status="running")

    optional_free_text_instruction = (
        f'The user also asked, in their own words: "{free_text}". Take this into account when ranking and framing the plan.'
        if free_text else ""
    )
    progress_instruction = _build_progress_instruction(persona_id)
    combined_instruction = " ".join(p for p in [optional_free_text_instruction, progress_instruction] if p)

    plan_items, reasoning_event, telem = _reason_over_tool_data(as_of, time_of_day, tool_data, combined_instruction)
    yield reasoning_event

    # Cache everything needed to re-reason from human feedback without
    # re-spawning the MCP subprocess servers.
    run_state.save_context(
        persona_id, time_of_day,
        run_state.PlanContext(
            persona_id=persona_id, time_of_day=time_of_day, as_of=as_of, connected=connected,
            tool_data=tool_data, connector_events=connector_events, total_mcp_latency_ms=total_mcp_latency_ms,
        ),
    )

    wall_clock_ms = int((time.perf_counter() - wall_clock_start) * 1000)
    summary = PlanRunSummary(
        persona_id=persona_id, time_of_day=time_of_day,
        tools_connected=len(connected), tools_total=len(ALL_TOOLS),
        total_wall_clock_ms=wall_clock_ms, total_mcp_latency_ms=total_mcp_latency_ms,
        total_llm_latency_ms=telem.latency_ms, total_tokens=telem.total_tokens,
        total_cost_usd=telem.cost_usd, langsmith_enabled=telem.langsmith_enabled,
        langsmith_project=langsmith_project_url(),
    )
    run_state.save_run(
        persona_id, time_of_day,
        PlanRunLogResponse(
            persona_id=persona_id, time_of_day=time_of_day,
            connectors=connector_events, reasoning=reasoning_event,
            plan=plan_items, summary=summary,
        ),
    )


def _build_progress_instruction(persona_id: str) -> str:
    """
    Carries done/partly-done status forward from any earlier-generated
    period today (morning and/or afternoon) into a new or regenerated
    period - so marking something "done" in the morning means it doesn't
    reappear in the afternoon plan, and a "partly done" item reappears
    reflecting only what's actually left, not the whole original task.
    Returns "" if nothing has been marked yet, so a first-ever run is
    unaffected.
    """
    all_runs = run_state.get_all_runs(persona_id)
    if not all_runs:
        return ""

    done_titles: list[str] = []
    partly_done: list[tuple[str, str]] = []
    for run in all_runs.values():
        for item in run.plan:
            if item.status == "done":
                done_titles.append(item.title)
            elif item.status == "partly_done" and item.progress_note:
                partly_done.append((item.title, item.progress_note))

    if not done_titles and not partly_done:
        return ""

    parts = ["The colleague already checked in on their plan earlier today. Take this into account:"]
    if done_titles:
        done_list = "; ".join(done_titles)
        parts.append(f"These items are now FULLY DONE - do not include them again unless new tool data shows a genuinely new, separate issue: {done_list}.")
    for title, note in partly_done:
        parts.append(
            f'"{title}" was marked PARTLY DONE with this note from the colleague: "{note}". '
            f"If this is still relevant, include an item reflecting only the remaining work described in that note, "
            f"not the original task as a whole."
        )
    return " ".join(parts)


def _reason_over_tool_data(as_of: str, time_of_day: str, tool_data: dict, extra_instruction: str = ""):
    """Shared reasoning call used by both the initial plan run and
    feedback-triggered adjustments - same prompt, same schema, just a
    different extra instruction appended."""
    prompt = _load_prompt("synthesize_plan").format(
        as_of=as_of, time_of_day=time_of_day,
        optional_free_text_instruction=extra_instruction,
        tool_data_json=json.dumps(tool_data, indent=2),
    )

    def _inner():
        return call_llm(system_prompt=SYSTEM_PROMPT, user_prompt=prompt)

    traced = wrap_traceable(name="synthesize_plan", fn=_inner)
    result = traced()

    parsed = _safe_json_parse(result.text)
    raw_plan = parsed.get("plan", [])
    telem = build_telemetry("synthesize_plan", result)

    plan_items: list[PlanItem] = []
    for item in raw_plan:
        try:
            plan_items.append(PlanItem(**item))
        except Exception:  # noqa: BLE001 - skip malformed individual items rather than fail the run
            continue

    reasoning_event = ReasoningEvent(status="done", output=raw_plan, telemetry=telem)
    return plan_items, reasoning_event, telem


def adjust_plan(persona_id: str, time_of_day: str, item_title: str, feedback: str, note: str | None) -> PlanRunLogResponse:
    """
    Human-in-the-loop re-rank: a colleague reacts to one item in one
    period's plan (mark it not relevant, or bump it to the top), and the
    agent re-reasons over the SAME already-gathered tool data for that
    period with the feedback folded in - no re-querying the MCP
    connectors, so it's fast, but it's a genuine second LLM reasoning
    pass, not a client-side reorder.
    """
    context = run_state.get_context(persona_id, time_of_day)
    if context is None:
        raise ValueError(f"No {time_of_day} plan has been run yet for this persona - build a plan first.")

    if feedback == "not_relevant":
        instruction = (
            f'The colleague just reviewed their plan and marked "{item_title}" as NOT relevant right now '
            f"(they may have already handled it, or it doesn't apply). Remove it from the plan entirely, "
            f"or replace it with the next most relevant item from the tool data if one exists. "
            f"Re-rank the remaining items accordingly."
        )
    else:  # prioritize
        instruction = (
            f'The colleague just reviewed their plan and said "{item_title}" should be their TOP priority '
            f"right now, ahead of everything else. Move it to rank 1 and re-rank the rest below it, "
            f"adjusting urgency levels if that reprioritization changes how the other items should be framed."
        )
    if note:
        instruction += f' They also added this note: "{note}".'

    plan_items, reasoning_event, telem = _reason_over_tool_data(context.as_of, context.time_of_day, context.tool_data, instruction)

    summary = PlanRunSummary(
        persona_id=persona_id, time_of_day=context.time_of_day,
        tools_connected=len(context.connected), tools_total=len(ALL_TOOLS),
        total_wall_clock_ms=telem.latency_ms, total_mcp_latency_ms=context.total_mcp_latency_ms,
        total_llm_latency_ms=telem.latency_ms, total_tokens=telem.total_tokens,
        total_cost_usd=telem.cost_usd, langsmith_enabled=telem.langsmith_enabled,
        langsmith_project=langsmith_project_url(),
    )
    updated_run = PlanRunLogResponse(
        persona_id=persona_id, time_of_day=context.time_of_day,
        connectors=context.connector_events, reasoning=reasoning_event,
        plan=plan_items, summary=summary,
        last_feedback=f'Adjusted because you marked "{item_title}" as {"not relevant" if feedback == "not_relevant" else "top priority"}.',
    )
    run_state.save_run(persona_id, time_of_day, updated_run)
    return updated_run
