"""
Lightweight guardrails run around every LLM/agent call. Each check produces
a GuardrailResult streamed to the /flow observability page.
"""
from __future__ import annotations

import re

from app.readiness.schemas import GuardrailResult

_PROMPT_INJECTION_PATTERNS = [
    r"ignore (all|any|previous) instructions",
    r"disregard (the|your) (system|previous) prompt",
    r"you are now",
    r"reveal (the|your) system prompt",
    r"act as if you have no (restrictions|rules)",
]

_PII_PATTERNS = {
    "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "phone": r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
    "ssn_like": r"\b\d{3}-\d{2}-\d{4}\b",
}

ALLOWED_MCP_TOOLS = {
    ("docs_mcp", "get_project_notes"),
    ("docs_mcp", "get_uploaded_docs"),
    ("tracker_mcp", "get_open_issues"),
    ("tracker_mcp", "get_dependencies"),
    ("timeline_mcp", "get_project_timeline"),
}


def check_prompt_injection(text: str) -> GuardrailResult:
    lowered = text.lower()
    for pattern in _PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, lowered):
            return GuardrailResult(check_name="prompt_injection_scan", passed=False, detail=f"Matched suspicious pattern: '{pattern}'")
    return GuardrailResult(check_name="prompt_injection_scan", passed=True, detail="No injection patterns found")


def check_pii(text: str) -> GuardrailResult:
    hits = []
    for label, pattern in _PII_PATTERNS.items():
        if re.search(pattern, text):
            hits.append(label)
    if hits:
        return GuardrailResult(check_name="pii_scan", passed=False, detail=f"Potential PII detected: {', '.join(hits)} (redact before external send)")
    return GuardrailResult(check_name="pii_scan", passed=True, detail="No PII patterns found")


def check_tool_allowlist(server: str, tool: str) -> GuardrailResult:
    allowed = (server, tool) in ALLOWED_MCP_TOOLS
    return GuardrailResult(check_name="tool_allowlist", passed=allowed, detail=f"{server}.{tool} {'is' if allowed else 'is NOT'} on the allow-list")


def redact_pii(text: str) -> str:
    redacted = text
    for label, pattern in _PII_PATTERNS.items():
        redacted = re.sub(pattern, f"[REDACTED_{label.upper()}]", redacted)
    return redacted


def run_input_guardrails(text: str) -> list[GuardrailResult]:
    return [check_prompt_injection(text), check_pii(text)]
