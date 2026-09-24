import type { AgentName, TraceEvent } from "../../types";
import { AGENT_CSS_VAR, AGENT_LABELS } from "../../types";

const AGENT_ORDER: AgentName[] = [
  "coordinator",
  "research_agent",
  "risk_agent",
  "planning_agent",
  "communication_agent",
];

function agentState(agent: AgentName, events: TraceEvent[]): "idle" | "active" | "done" {
  const relevant = events.filter((e) => e.agent === agent);
  if (relevant.some((e) => e.event_type === "agent_completed" || e.event_type === "run_completed")) return "done";
  if (relevant.some((e) => e.event_type === "agent_started" || e.event_type === "plan_ready")) return "active";
  return "idle";
}

export default function AgentStatusRow({ events }: { events: TraceEvent[] }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {AGENT_ORDER.map((agent) => {
        const state = agentState(agent, events);
        const colorVar = AGENT_CSS_VAR[agent];
        return (
          <div
            key={agent}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${state === "idle" ? "var(--rd-border)" : `var(${colorVar})`}`,
              color: state === "idle" ? "var(--rd-ink-faint)" : `var(${colorVar})`,
              background: state === "idle" ? "var(--rd-bg-subtle)" : `var(${colorVar}-soft, var(--rd-bg-subtle))`,
              opacity: state === "idle" ? 0.6 : 1,
              transition: "all 200ms ease",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: `var(${colorVar})`,
                opacity: state === "idle" ? 0.3 : 1,
                animation: state === "active" ? "pulse 1.1s ease-in-out infinite" : "none",
              }}
            />
            {AGENT_LABELS[agent]}
            {state === "done" && <span style={{ fontSize: 11 }}>✓</span>}
          </div>
        );
      })}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
