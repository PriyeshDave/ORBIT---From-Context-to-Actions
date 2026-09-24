from __future__ import annotations

from app.readiness.agents.llm import call_llm_json
from app.readiness.mcp.servers import mcp_client
from app.readiness.schemas import AgentResult, AgentName, ToolCallRecord


async def run_planning_agent(research_output: dict, risk_output: dict) -> tuple[AgentResult, list[ToolCallRecord]]:
    tool_calls: list[ToolCallRecord] = []

    timeline, timeline_latency = await mcp_client.call("timeline_mcp", "get_project_timeline")
    tool_calls.append(ToolCallRecord(tool_name="get_project_timeline", mcp_server="timeline_mcp", output_preview=str(timeline)[:160], latency_ms=timeline_latency))

    parsed, usage, latency_ms, model = await call_llm_json("planning_agent.system", research_output=str(research_output), risk_output=str(risk_output), timeline=str(timeline))

    result = AgentResult(agent=AgentName.PLANNING, summary=f"Recommendation: {parsed.get('recommended_go_no_go', 'unknown')}", details=parsed, token_usage=usage, latency_ms=latency_ms)
    return result, tool_calls
