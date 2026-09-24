from __future__ import annotations

from app.readiness.agents.llm import call_llm_json
from app.readiness.schemas import AgentResult, AgentName


async def run_communication_agent(planning_output: dict) -> AgentResult:
    parsed, usage, latency_ms, model = await call_llm_json("comms_agent.system", planning_output=str(planning_output))

    result = AgentResult(agent=AgentName.COMMUNICATION, summary=parsed.get("subject_line", ""), details=parsed, token_usage=usage, latency_ms=latency_ms)
    return result
