"""
Lightweight MCP-style tool servers for the Readiness capability.

These run in-process (no separate transport) so the whole stack is easy to
run without extra containers, but each one is written as a discrete
"server" with its own named tools, exactly as it would look wired up over
the real MCP stdio/SSE transport (as the Planner capability's servers
actually are). Swap `call()` for a real `mcp.ClientSession` call and
nothing else in the codebase changes - the Agent/Orchestrator layer only
ever sees `MCPClient.call(server, tool, args)`.

Mock data by default; if the user uploads real docs via /uploads, docs_mcp
serves those instead (see uploaded_store).
"""
from __future__ import annotations

import time
from typing import Any

uploaded_store: dict[str, str] = {}

_MOCK_PROJECT_NOTES = """
Project "Incident Data Management" - a GenAI-powered enrichment layer that sits in front of
ServiceNow incident management for the Digital Workplace team at American Express.

When a colleague raises an issue (via the TechCare chatbot, the Slack bot, or a walk-in to the
Tech Concierge), an incident is logged on ServiceNow with an incident_description and
incident_short_description. Historically, service engineers manually triage these incidents to
find the root cause - averaging 14-15 hours per incident before resolution even begins.

This project enriches each incident with an AI-generated work note before it reaches a service
engineer: an incident summary, the colleague's device KPI summary (from Nexthink, hardware and
software), a probable root cause, and a predicted incident category - so the engineer starts with
a head start instead of a blank ticket.

Enrichment pipeline: a real-time service consumes incidents from a Kafka queue in batches, pulls
the caller's Nexthink device data from the team's Elastic DB (Colleague 360 space), sends it with
the issue description to the Enrichment Service (GPT-4.1, owned by Priyesh) for summarization,
then to the Categorization Service (also owned by Priyesh, RAG-based against historic categorized
incidents) to predict a category, and finally writes the assembled work note back to the
ServiceNow ticket. Every run is audited to a separate Elastic audit DB (also owned by Priyesh).
Nishant (Site Reliability Engineering) owns production uptime, alerting, and latency/throughput
monitoring for this real-time pipeline.

Current rollout: live for two assignment groups only - 1JS and Sussex House. Hina (Senior UX
Research) runs ongoing contextual research with service engineers in both groups - her most
recent finding is that engineers want the categorization confidence score visible in the work
note, not just the predicted category. Matthew (Digital Product Management) turns that research
into prioritized backlog items and coordinates governance approvals (MRMG, TMRC) and the rollout
roadmap. Next milestone: E3 production rollout, now that MRMG production approval has been
granted, before expanding to additional assignment groups.
"""

_MOCK_OPEN_ISSUES = [
    {"id": "DW-470", "title": "Asset data missing from Elastic - blocks a complete work note (device asset details not enriched)", "severity": "medium", "owner": "priyesh.dave"},
    {"id": "DW-512", "title": "Nexthink hardware KPI summary incomplete for a subset of devices during E3 load", "severity": "medium", "owner": "nishant.kumar"},
    {"id": "DW-518", "title": "Enrichment Service (GPT-4.1) intermittent timeouts under Kafka batch load spikes", "severity": "high", "owner": "priyesh.dave"},
    {"id": "DW-523", "title": "Categorization Service - 1JS engineers report occasional miscategorization (surfaced via UX research)", "severity": "medium", "owner": "priyesh.dave"},
    {"id": "DW-529", "title": "Categorization confidence score not surfaced in work note - UX-identified gap, pending backlog prioritization", "severity": "low", "owner": "matthew.salomons"},
]

_MOCK_DEPENDENCIES = [
    {"name": "MRMG production approval for Incident Data Management", "status": "done", "blocking": False},
    {"name": "Nexthink E3 environment data load and pipeline validation", "status": "in-progress", "blocking": True},
    {"name": "Data Engineering backfill of missing asset data into Elastic", "status": "not-started", "blocking": False},
    {"name": "ServiceNow work note formatting review", "status": "done", "blocking": False},
    {"name": "Assignment-group expansion approval beyond 1JS/Sussex House", "status": "not-started", "blocking": False},
]

_MOCK_TIMELINE = {
    "code_freeze": "2 days before E3 rollout",
    "launch_date": "E3 production rollout - MRMG approved, date being locked with Matthew",
    "go_no_go_meeting": "1 day before E3 rollout",
    "milestones": [
        {"name": "Nexthink E3 data load and validation complete", "due": "in 2 days"},
        {"name": "Asset data backfill from Data Engineering", "due": "in 2 weeks"},
        {"name": "Confidence-score UX enhancement - backlog prioritization decision", "due": "this sprint"},
        {"name": "Sprint review of 1JS/Sussex House research findings", "due": "end of this sprint"},
    ],
}


class MCPToolError(Exception):
    pass


class MCPClient:
    """Uniform entrypoint agents use to call any MCP server/tool."""

    async def call(self, server: str, tool: str, args: dict[str, Any] | None = None) -> tuple[Any, float]:
        args = args or {}
        start = time.perf_counter()

        if server == "docs_mcp" and tool == "get_project_notes":
            result: Any = _MOCK_PROJECT_NOTES.strip()
        elif server == "docs_mcp" and tool == "get_uploaded_docs":
            doc_ids: list[str] = args.get("doc_ids", [])
            result = "\n---\n".join(uploaded_store.get(d, "") for d in doc_ids) or "No documents uploaded."
        elif server == "tracker_mcp" and tool == "get_open_issues":
            result = _MOCK_OPEN_ISSUES
        elif server == "tracker_mcp" and tool == "get_dependencies":
            result = _MOCK_DEPENDENCIES
        elif server == "timeline_mcp" and tool == "get_project_timeline":
            result = _MOCK_TIMELINE
        else:
            raise MCPToolError(f"Unknown MCP tool: {server}.{tool}")

        latency_ms = (time.perf_counter() - start) * 1000
        return result, latency_ms


mcp_client = MCPClient()
