"""Pydantic models specific to the Catch Up capability."""
from typing import Optional, Literal
from pydantic import BaseModel

from app.shared.schemas import SecurityCheckResult, LLMCallTelemetry


class MeetingSearchResult(BaseModel):
    id: str
    title: str
    organizer_name: str
    date: str
    start_time: str
    end_time: str
    platform: str
    sensitivity_label: str


class MeetingSearchResponse(BaseModel):
    query: str
    results: list[MeetingSearchResult]
    result_count: int


class TranscriptSegment(BaseModel):
    time: str
    speaker: str
    text: str


class TranscriptResponse(BaseModel):
    meeting_id: str
    source: str
    segments: list[TranscriptSegment]


PipelineStepName = Literal[
    "security_check", "read_notes", "extract_decisions", "find_actions",
    "identify_risks", "prioritise_focus", "draft_followup",
]

StepStatus = Literal["pending", "running", "done", "error"]


class RunPipelineRequest(BaseModel):
    meeting_id: str


class PipelineStepEvent(BaseModel):
    step: PipelineStepName
    status: StepStatus
    label: str
    output: Optional[dict | list | str] = None
    telemetry: Optional[LLMCallTelemetry] = None
    security: Optional[SecurityCheckResult] = None
    error: Optional[str] = None


class RunSummary(BaseModel):
    meeting_id: str
    total_latency_ms: int
    total_wall_clock_ms: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost_usd: float
    langsmith_enabled: bool
    langsmith_project: Optional[str] = None


class RunLogResponse(BaseModel):
    meeting_id: str
    security: SecurityCheckResult
    steps: list[PipelineStepEvent]
    summary: RunSummary


class ChatRequest(BaseModel):
    meeting_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    telemetry: LLMCallTelemetry


class SendFollowupRequest(BaseModel):
    meeting_id: str
    message: str


class SendFollowupResponse(BaseModel):
    status: str
    sent_to: list[str]
