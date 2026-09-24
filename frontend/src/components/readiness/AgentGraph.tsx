import type { AgentName, TraceEvent } from "../../types";
import { AGENT_CSS_VAR, AGENT_LABELS } from "../../types";

interface NodePos {
  x: number;
  y: number;
}

const POSITIONS: Record<AgentName, NodePos> = {
  coordinator: { x: 340, y: 40 },
  research_agent: { x: 120, y: 160 },
  risk_agent: { x: 340, y: 160 },
  planning_agent: { x: 560, y: 160 },
  communication_agent: { x: 340, y: 280 },
};

// Static edges the system can traverse (drawn faint by default).
const EDGES: [AgentName, AgentName][] = [
  ["coordinator", "research_agent"],
  ["coordinator", "risk_agent"],
  ["research_agent", "planning_agent"],
  ["risk_agent", "planning_agent"],
  ["planning_agent", "communication_agent"],
];

function edgeKey(a: AgentName, b: AgentName) {
  return `${a}->${b}`;
}

export default function AgentGraph({ events }: { events: TraceEvent[] }) {
  const traveledEdges = new Set(
    events
      .filter((e) => e.event_type === "agent_message" && e.from_agent && e.to_agent)
      .map((e) => edgeKey(e.from_agent as AgentName, e.to_agent as AgentName))
  );

  const completedAgents = new Set(
    events.filter((e) => e.event_type === "agent_completed" && e.agent).map((e) => e.agent as AgentName)
  );
  const activeAgents = new Set(
    events
      .filter((e) => e.event_type === "agent_started" && e.agent)
      .map((e) => e.agent as AgentName)
      .filter((a) => !completedAgents.has(a))
  );

  return (
    <svg viewBox="0 0 700 340" width="100%" style={{ maxWidth: 700 }}>
      {EDGES.map(([from, to]) => {
        const p1 = POSITIONS[from];
        const p2 = POSITIONS[to];
        const traveled = traveledEdges.has(edgeKey(from, to));
        return (
          <line
            key={edgeKey(from, to)}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={traveled ? `var(${AGENT_CSS_VAR[to]})` : "var(--rd-border)"}
            strokeWidth={traveled ? 2.5 : 1.5}
            strokeDasharray={traveled ? undefined : "4 4"}
            style={{ transition: "all 300ms ease" }}
          />
        );
      })}

      {(Object.keys(POSITIONS) as AgentName[]).map((agent) => {
        const pos = POSITIONS[agent];
        const colorVar = AGENT_CSS_VAR[agent];
        const done = completedAgents.has(agent);
        const active = activeAgents.has(agent);
        return (
          <g key={agent} transform={`translate(${pos.x}, ${pos.y})`}>
            {active && (
              <circle r={34} fill="none" stroke={`var(${colorVar})`} strokeWidth={2} opacity={0.5}>
                <animate attributeName="r" values="24;40;24" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              r={26}
              fill={done || active ? `var(${colorVar})` : "var(--rd-bg)"}
              stroke={`var(${colorVar})`}
              strokeWidth={2}
            />
            {done && (
              <text textAnchor="middle" y={5} fontSize={16} fill="white" fontWeight={700}>
                ✓
              </text>
            )}
            <text
              textAnchor="middle"
              y={44}
              fontSize={12}
              fontWeight={600}
              fill="var(--rd-ink)"
              fontFamily="var(--rd-font-body)"
            >
              {AGENT_LABELS[agent]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
