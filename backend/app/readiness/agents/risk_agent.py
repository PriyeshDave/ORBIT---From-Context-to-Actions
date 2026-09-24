from __future__ import annotations

from app.readiness.agents.llm import call_llm_json
from app.readiness.mcp.servers import mcp_client
from app.readiness.schemas import AgentResult, AgentName, ToolCallRecord


async def run_risk_agent() -> tuple[AgentResult, list[ToolCallRecord]]:
    tool_calls: list[ToolCallRecord] = []

    issues, issues_latency = await mcp_client.call("tracker_mcp", "get_open_issues")
    tool_calls.append(ToolCallRecord(tool_name="get_open_issues", mcp_server="tracker_mcp", output_preview=str(issues)[:160], latency_ms=issues_latency))

    deps, deps_latency = await mcp_client.call("tracker_mcp", "get_dependencies")
    tool_calls.append(ToolCallRecord(tool_name="get_dependencies", mcp_server="tracker_mcp", output_preview=str(deps)[:160], latency_ms=deps_latency))

    parsed, usage, latency_ms, model = await call_llm_json("risk_agent.system", open_issues=str(issues), dependencies=str(deps))

    result = AgentResult(agent=AgentName.RISK, summary=f"Risk level: {parsed.get('risk_level', 'unknown')}", details=parsed, token_usage=usage, latency_ms=latency_ms)
    return result, tool_calls
