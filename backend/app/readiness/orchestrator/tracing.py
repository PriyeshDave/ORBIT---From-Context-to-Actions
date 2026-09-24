"""
LangSmith wiring. LangChain/LangGraph pick up tracing automatically from the
LANGCHAIN_TRACING_V2 / LANGCHAIN_API_KEY / LANGCHAIN_PROJECT env vars (set in
.env and exported in main.py at startup) - this module just builds the
shareable trace URL attached to each TraceEvent for the /flow page.
"""
from __future__ import annotations

from app.shared.config import get_settings

settings = get_settings()


def langsmith_run_url(run_id: str) -> str | None:
    if not settings.langchain_tracing_v2 or not settings.langchain_api_key:
        return None
    project = settings.langchain_project
    return f"https://smith.langchain.com/o/-/projects/p/{project}?peek={run_id}"
