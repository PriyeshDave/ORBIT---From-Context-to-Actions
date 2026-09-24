export type AgentName =
  | "coordinator"
  | "research_agent"
  | "risk_agent"
  | "planning_agent"
  | "communication_agent";

export type EventType =
  | "run_started"
  | "plan_ready"
  | "agent_started"
  | "agent_tool_call"
  | "agent_message"
  | "agent_completed"
  | "guardrail_check"
  | "synthesis_started"
  | "run_completed"
  | "error";

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface GuardrailResult {
  check_name: string;
  passed: boolean;
  detail: string;
}

export interface ToolCallRecord {
  tool_name: string;
  mcp_server: string;
  input: Record<string, unknown>;
  output_preview: string;
  latency_ms: number;
}

export interface TraceEvent {
  event_type: EventType;
  run_id: string;
  agent?: AgentName | null;
  from_agent?: AgentName | null;
  to_agent?: AgentName | null;
  timestamp: string;
  latency_ms?: number | null;
  token_usage?: TokenUsage | null;
  guardrails: GuardrailResult[];
  tool_calls: ToolCallRecord[];
  langsmith_trace_url?: string | null;
  model?: string | null;
  prompt_template?: string | null;
  message: string;
  payload: Record<string, unknown>;
}

export interface FinalReport {
  readiness_summary: string;
  risks: string[];
  action_plan: { step: string; owner: string; due: string }[];
  owner_followups: string[];
  communication_draft: string;
}

export const AGENT_LABELS: Record<AgentName, string> = {
  coordinator: "Coordinator",
  research_agent: "Research Agent",
  risk_agent: "Risk Agent",
  planning_agent: "Planning Agent",
  communication_agent: "Communication Agent",
};

export const AGENT_CSS_VAR: Record<AgentName, string> = {
  coordinator: "--rd-coordinator",
  research_agent: "--rd-research",
  risk_agent: "--rd-risk",
  planning_agent: "--rd-planning",
  communication_agent: "--rd-communication",
};
