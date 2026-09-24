"""
Models genuinely shared across two or more capabilities. Each capability's
own schemas.py holds everything specific to it - this file only holds the
handful of things (auth, persona, LLM telemetry) that are identical
regardless of which capability is calling them.
"""
from typing import Optional, Literal
from pydantic import BaseModel

ToolKey = Literal["outlook", "teams", "slack", "tracker"]


class LoginRequest(BaseModel):
    persona_id: str
    password: str


class LoginResponse(BaseModel):
    session_token: str
    persona_id: str
    name: str
    role: str
    avatar_color: str
    connected_tools: list[ToolKey] = []
    has_sre_dashboard: bool = False


class PersonaSummary(BaseModel):
    id: str
    name: str
    role: str
    avatar_color: str
    connected_tools: list[ToolKey] = []
    note: Optional[str] = None


class SecurityCheckResult(BaseModel):
    persona_id: str
    persona_name: str
    meeting_id: str
    decision: Literal["ALLOWED", "DENIED"]
    reason: str
    sensitivity_label: Optional[str] = None


class LLMCallTelemetry(BaseModel):
    label: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    cost_usd: float
    langsmith_trace_url: Optional[str] = None
    langsmith_enabled: bool = False
