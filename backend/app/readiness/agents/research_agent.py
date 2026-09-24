from __future__ import annotations

from app.readiness.agents.llm import call_llm_json
from app.readiness.mcp.servers import mcp_client
from app.readiness.schemas import AgentResult, AgentName, ToolCallRecord


async def run_research_agent(uploaded_doc_ids: list[str]) -> tuple[AgentResult, list[ToolCallRecord]]:
    tool_calls: list[ToolCallRecord] = []

    notes, notes_latency = await mcp_client.call("docs_mcp", "get_project_notes")
    tool_calls.append(ToolCallRecord(tool_name="get_project_notes", mcp_server="docs_mcp", output_preview=str(notes)[:160], latency_ms=notes_latency))

    docs, docs_latency = await mcp_client.call("docs_mcp", "get_uploaded_docs", {"doc_ids": uploaded_doc_ids})
    tool_calls.append(ToolCallRecord(tool_name="get_uploaded_docs", mcp_server="docs_mcp", input={"doc_ids": uploaded_doc_ids}, output_preview=str(docs)[:160], latency_ms=docs_latency))

    parsed, usage, latency_ms, model = await call_llm_json("research_agent.system", project_notes=str(notes), uploaded_docs=str(docs))

    result = AgentResult(agent=AgentName.RESEARCH, summary=parsed.get("scope_summary", ""), details=parsed, token_usage=usage, latency_ms=latency_ms)
    return result, tool_calls
