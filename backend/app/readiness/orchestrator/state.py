from __future__ import annotations

from typing import Any, Awaitable, Callable, TypedDict

from app.readiness.schemas import TraceEvent


class GraphState(TypedDict, total=False):
    run_id: str
    session_id: str
    query: str
    uploaded_doc_ids: list[str]

    plan: dict[str, Any]
    research_output: dict[str, Any]
    risk_output: dict[str, Any]
    planning_output: dict[str, Any]
    communication_output: dict[str, Any]
    final_report: dict[str, Any]

    emit: Callable[[TraceEvent], Awaitable[None]]
