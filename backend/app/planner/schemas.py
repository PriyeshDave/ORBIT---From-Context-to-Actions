"""Pydantic models specific to the Planner (Daily Plan) capability."""
from typing import Optional, Literal
from pydantic import BaseModel

from app.shared.schemas import LLMCallTelemetry, ToolKey

TimeOfDay = Literal["morning", "afternoon", "evening"]


class ToolStatus(BaseModel):
    tool: ToolKey
    connected: bool


class ToolsStatusResponse(BaseModel):
    persona_id: str
    tools: list[ToolStatus]


class DiscoveredTool(BaseModel):
    name: str
    description: str
    input_schema: dict


class MCPServerDiscovery(BaseModel):
    tool: ToolKey
    connected: bool
    server_name: Optional[str] = None
    tools: list[DiscoveredTool] = []


class MCPDiscoveryResponse(BaseModel):
    persona_id: str
    servers: list[MCPServerDiscovery]


class RunPlanRequest(BaseModel):
    time_of_day: TimeOfDay
    free_text: Optional[str] = None


StepStatus = Literal["pending", "running", "done", "error", "skipped"]


class MCPCallTelemetry(BaseModel):
    tool: ToolKey
    tool_name: str
    latency_ms: int
    connected: bool


class ConnectorEvent(BaseModel):
    kind: Literal["connector"] = "connector"
    tool: ToolKey
    status: StepStatus
    telemetry: Optional[MCPCallTelemetry] = None
    error: Optional[str] = None


class ReasoningEvent(BaseModel):
    kind: Literal["reasoning"] = "reasoning"
    status: StepStatus
    output: Optional[list[dict]] = None
    telemetry: Optional[LLMCallTelemetry] = None
    error: Optional[str] = None


class PlanItem(BaseModel):
    rank: int
    title: str
    why: str
    source_tool: ToolKey
    urgency: Literal["critical", "high", "medium", "low"]
    suggested_action: str
    due_context: Optional[str] = None
    blocked_info: Optional[str] = None
    status: Literal["pending", "done", "partly_done"] = "pending"
    progress_note: Optional[str] = None


class PlanStatusRequest(BaseModel):
    time_of_day: TimeOfDay
    item_title: str
    status: Literal["done", "partly_done"]
    note: Optional[str] = None


class PlanRunSummary(BaseModel):
    persona_id: str
    time_of_day: TimeOfDay
    tools_connected: int
    tools_total: int
    total_wall_clock_ms: int
    total_mcp_latency_ms: int
    total_llm_latency_ms: int
    total_tokens: int
    total_cost_usd: float
    langsmith_enabled: bool
    langsmith_project: Optional[str] = None


class PlanRunLogResponse(BaseModel):
    persona_id: str
    time_of_day: TimeOfDay
    connectors: list[ConnectorEvent]
    reasoning: ReasoningEvent
    plan: list[PlanItem]
    summary: PlanRunSummary
    last_feedback: Optional[str] = None


class PlanFeedbackRequest(BaseModel):
    time_of_day: TimeOfDay
    item_title: str
    feedback: Literal["not_relevant", "prioritize"]
    note: Optional[str] = None


class SREIncidentActionRequest(BaseModel):
    note: str


class SREIncidentActionResponse(BaseModel):
    message: str


class ChatRequest(BaseModel):
    message: str
    time_of_day: Optional[TimeOfDay] = None


class ChatResponse(BaseModel):
    reply: str
    telemetry: LLMCallTelemetry
