"""
Shared data contracts between the orchestrator, agents, WebSocket layer, and
the frontend. These types are the "shape" of every event streamed to the
observability page.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class AgentName(str, Enum):
    COORDINATOR = "coordinator"
    RESEARCH = "research_agent"
    RISK = "risk_agent"
    PLANNING = "planning_agent"
    COMMUNICATION = "communication_agent"


class EventType(str, Enum):
    RUN_STARTED = "run_started"
    PLAN_READY = "plan_ready"
    AGENT_STARTED = "agent_started"
    AGENT_TOOL_CALL = "agent_tool_call"
    AGENT_MESSAGE = "agent_message"
    AGENT_COMPLETED = "agent_completed"
    GUARDRAIL_CHECK = "guardrail_check"
    SYNTHESIS_STARTED = "synthesis_started"
    RUN_COMPLETED = "run_completed"
    ERROR = "error"


class ChatRequest(BaseModel):
    query: str
    session_id: str = Field(default_factory=lambda: "sess-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"))
    uploaded_doc_ids: list[str] = Field(default_factory=list)


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0


class GuardrailResult(BaseModel):
    check_name: str
    passed: bool
    detail: str = ""


class ToolCallRecord(BaseModel):
    tool_name: str
    mcp_server: str
    input: dict[str, Any] = Field(default_factory=dict)
    output_preview: str = ""
    latency_ms: float = 0.0


class TraceEvent(BaseModel):
    event_type: EventType
    run_id: str
    agent: Optional[AgentName] = None
    from_agent: Optional[AgentName] = None
    to_agent: Optional[AgentName] = None
    timestamp: str = Field(default_factory=_now)
    latency_ms: Optional[float] = None
    token_usage: Optional[TokenUsage] = None
    guardrails: list[GuardrailResult] = Field(default_factory=list)
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    langsmith_trace_url: Optional[str] = None
    model: Optional[str] = None
    prompt_template: Optional[str] = None
    message: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    agent: AgentName
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    latency_ms: float = 0.0


class ReadinessReport(BaseModel):
    run_id: str
    session_id: str
    readiness_summary: str
    risks: list[str]
    action_plan: list[dict[str, str]]
    owner_followups: list[str]
    communication_draft: str
    total_latency_ms: float
    total_cost_usd: float
    total_tokens: int
