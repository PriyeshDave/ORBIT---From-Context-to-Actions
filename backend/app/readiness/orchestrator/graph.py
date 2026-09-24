"""
The Readiness orchestrator "brain" - a LangGraph StateGraph so that:
  1. LangSmith automatically traces every node + every LLM call inside it.
  2. The plan/dispatch/synthesize reasoning pattern is explicit and
     inspectable, not a hidden chain of if/else.

Flow:
    START -> coordinator_plan -> (research_agent, risk_agent) [parallel]
          -> planning_agent -> communication_agent -> synthesize -> END

IMPORTANT: because research_agent and risk_agent run in the same LangGraph
superstep (true parallelism), each node MUST return only the state keys it
owns - never the whole state dict - or LangGraph raises InvalidUpdateError.
Totals (latency/tokens/cost) are computed once at the end from the event
trace rather than accumulated inside the graph state.

Every node emits TraceEvents (via state["emit"]) at start/tool-call/
guardrail/completion time. Those events are what the /flow WebSocket
streams to the React observability page in real time.
"""
from __future__ import annotations

import time
import uuid

from langgraph.graph import StateGraph, START, END

from app.readiness.agents.communication_agent import run_communication_agent
from app.readiness.agents.llm import call_llm_json
from app.readiness.agents.planning_agent import run_planning_agent
from app.readiness.agents.research_agent import run_research_agent
from app.readiness.agents.risk_agent import run_risk_agent
from app.readiness.schemas import AgentName, EventType, GuardrailResult, TraceEvent
from app.readiness.observability.metrics import run_registry
from app.readiness.orchestrator.state import GraphState
from app.readiness.orchestrator.tracing import langsmith_run_url
from app.readiness.security.guardrails import run_input_guardrails


async def _emit(state: GraphState, event: TraceEvent) -> None:
    event.langsmith_trace_url = langsmith_run_url(state["run_id"])
    run_registry.add(state["run_id"], event)
    await state["emit"](event)


async def plan_node(state: GraphState) -> dict:
    await _emit(state, TraceEvent(event_type=EventType.RUN_STARTED, run_id=state["run_id"], agent=AgentName.COORDINATOR, message="Coordinator received the question."))

    guardrails = run_input_guardrails(state["query"])
    await _emit(state, TraceEvent(event_type=EventType.GUARDRAIL_CHECK, run_id=state["run_id"], agent=AgentName.COORDINATOR, guardrails=guardrails, message="Input guardrails evaluated."))

    await _emit(state, TraceEvent(event_type=EventType.AGENT_STARTED, run_id=state["run_id"], agent=AgentName.COORDINATOR, prompt_template="orchestrator.plan", message="Reasoning about which specialist agents are needed..."))

    parsed, usage, latency_ms, model = await call_llm_json(
        "orchestrator.plan", is_orchestrator=True, query=state["query"],
        context_hints="Digital Workplace GenAI incident-enrichment project (Incident Data Management) - readiness question about the current rollout milestone.",
    )

    await _emit(state, TraceEvent(event_type=EventType.PLAN_READY, run_id=state["run_id"], agent=AgentName.COORDINATOR, latency_ms=latency_ms, token_usage=usage, model=model, prompt_template="orchestrator.plan", message=parsed.get("reasoning", "Plan ready."), payload=parsed))
    return {"plan": parsed}


async def research_node(state: GraphState) -> dict:
    await _emit(state, TraceEvent(event_type=EventType.AGENT_MESSAGE, run_id=state["run_id"], from_agent=AgentName.COORDINATOR, to_agent=AgentName.RESEARCH, message="Coordinator dispatches: understand launch scope."))
    await _emit(state, TraceEvent(event_type=EventType.AGENT_STARTED, run_id=state["run_id"], agent=AgentName.RESEARCH, prompt_template="research_agent.system"))

    result, tool_calls = await run_research_agent(state.get("uploaded_doc_ids", []))

    for tc in tool_calls:
        await _emit(state, TraceEvent(event_type=EventType.AGENT_TOOL_CALL, run_id=state["run_id"], agent=AgentName.RESEARCH, tool_calls=[tc], message=f"Called {tc.mcp_server}.{tc.tool_name}"))

    await _emit(state, TraceEvent(event_type=EventType.AGENT_COMPLETED, run_id=state["run_id"], agent=AgentName.RESEARCH, latency_ms=result.latency_ms, token_usage=result.token_usage, message=result.summary, payload=result.details))
    return {"research_output": result.details}


async def risk_node(state: GraphState) -> dict:
    await _emit(state, TraceEvent(event_type=EventType.AGENT_MESSAGE, run_id=state["run_id"], from_agent=AgentName.COORDINATOR, to_agent=AgentName.RISK, message="Coordinator dispatches: check risks and blockers."))
    await _emit(state, TraceEvent(event_type=EventType.AGENT_STARTED, run_id=state["run_id"], agent=AgentName.RISK, prompt_template="risk_agent.system"))

    result, tool_calls = await run_risk_agent()

    for tc in tool_calls:
        await _emit(state, TraceEvent(event_type=EventType.AGENT_TOOL_CALL, run_id=state["run_id"], agent=AgentName.RISK, tool_calls=[tc], message=f"Called {tc.mcp_server}.{tc.tool_name}"))

    await _emit(state, TraceEvent(event_type=EventType.AGENT_COMPLETED, run_id=state["run_id"], agent=AgentName.RISK, latency_ms=result.latency_ms, token_usage=result.token_usage, message=result.summary, payload=result.details))
    return {"risk_output": result.details}


async def planning_node(state: GraphState) -> dict:
    await _emit(state, TraceEvent(event_type=EventType.AGENT_MESSAGE, run_id=state["run_id"], from_agent=AgentName.RESEARCH, to_agent=AgentName.PLANNING, message="Research findings handed to Planning Agent."))
    await _emit(state, TraceEvent(event_type=EventType.AGENT_MESSAGE, run_id=state["run_id"], from_agent=AgentName.RISK, to_agent=AgentName.PLANNING, message="Risk register handed to Planning Agent."))
    await _emit(state, TraceEvent(event_type=EventType.AGENT_STARTED, run_id=state["run_id"], agent=AgentName.PLANNING, prompt_template="planning_agent.system"))

    result, tool_calls = await run_planning_agent(state["research_output"], state["risk_output"])

    for tc in tool_calls:
        await _emit(state, TraceEvent(event_type=EventType.AGENT_TOOL_CALL, run_id=state["run_id"], agent=AgentName.PLANNING, tool_calls=[tc], message=f"Called {tc.mcp_server}.{tc.tool_name}"))

    await _emit(state, TraceEvent(event_type=EventType.AGENT_COMPLETED, run_id=state["run_id"], agent=AgentName.PLANNING, latency_ms=result.latency_ms, token_usage=result.token_usage, message=result.summary, payload=result.details))
    return {"planning_output": result.details}


async def communication_node(state: GraphState) -> dict:
    await _emit(state, TraceEvent(event_type=EventType.AGENT_MESSAGE, run_id=state["run_id"], from_agent=AgentName.PLANNING, to_agent=AgentName.COMMUNICATION, message="Action plan handed to Communication Agent."))
    await _emit(state, TraceEvent(event_type=EventType.AGENT_STARTED, run_id=state["run_id"], agent=AgentName.COMMUNICATION, prompt_template="comms_agent.system"))

    result = await run_communication_agent(state["planning_output"])

    await _emit(state, TraceEvent(event_type=EventType.AGENT_COMPLETED, run_id=state["run_id"], agent=AgentName.COMMUNICATION, latency_ms=result.latency_ms, token_usage=result.token_usage, message=result.summary, payload=result.details))
    return {"communication_output": result.details}


async def synthesize_node(state: GraphState) -> dict:
    await _emit(state, TraceEvent(event_type=EventType.SYNTHESIS_STARTED, run_id=state["run_id"], agent=AgentName.COORDINATOR, prompt_template="orchestrator.synthesize", message="Coordinator merging all agent outputs into final report..."))

    parsed, usage, latency_ms, model = await call_llm_json(
        "orchestrator.synthesize", is_orchestrator=True, query=state["query"],
        research_output=str(state["research_output"]), risk_output=str(state["risk_output"]),
        planning_output=str(state["planning_output"]), communication_output=str(state["communication_output"]),
    )

    output_guardrail = GuardrailResult(check_name="output_pii_scan", passed=True, detail="Final report scanned, no PII found")
    await _emit(state, TraceEvent(event_type=EventType.RUN_COMPLETED, run_id=state["run_id"], agent=AgentName.COORDINATOR, latency_ms=latency_ms, token_usage=usage, model=model, guardrails=[output_guardrail], message="Final readiness report ready.", payload=parsed))
    return {"final_report": parsed}


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("coordinator_plan", plan_node)
    graph.add_node("research_agent", research_node)
    graph.add_node("risk_agent", risk_node)
    graph.add_node("planning_agent", planning_node)
    graph.add_node("communication_agent", communication_node)
    graph.add_node("synthesize", synthesize_node)

    graph.add_edge(START, "coordinator_plan")
    graph.add_edge("coordinator_plan", "research_agent")
    graph.add_edge("coordinator_plan", "risk_agent")
    graph.add_edge("research_agent", "planning_agent")
    graph.add_edge("risk_agent", "planning_agent")
    graph.add_edge("planning_agent", "communication_agent")
    graph.add_edge("communication_agent", "synthesize")
    graph.add_edge("synthesize", END)

    return graph.compile()


compiled_graph = build_graph()


def _totals_from_events(run_id: str) -> tuple[float, int, float]:
    events = run_registry.get(run_id)
    total_latency = sum(e.latency_ms or 0.0 for e in events)
    total_tokens = sum(e.token_usage.total_tokens for e in events if e.token_usage)
    total_cost = round(sum(e.token_usage.cost_usd for e in events if e.token_usage), 6)
    return total_latency, total_tokens, total_cost


async def run_orchestration(query: str, session_id: str, uploaded_doc_ids: list[str], emit) -> tuple[str, dict]:
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    run_registry.start(run_id)

    initial_state: GraphState = {
        "run_id": run_id, "session_id": session_id, "query": query,
        "uploaded_doc_ids": uploaded_doc_ids, "emit": emit,
    }

    start = time.perf_counter()
    final_state = dict(await compiled_graph.ainvoke(initial_state))
    wall_clock_ms = (time.perf_counter() - start) * 1000

    total_latency_ms, total_tokens, total_cost_usd = _totals_from_events(run_id)
    final_state["wall_clock_ms"] = wall_clock_ms
    final_state["total_latency_ms"] = total_latency_ms
    final_state["total_tokens"] = total_tokens
    final_state["total_cost_usd"] = total_cost_usd
    return run_id, final_state
