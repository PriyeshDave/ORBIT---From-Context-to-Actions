import type { AgentName, TraceEvent } from "../../types";
import { AGENT_CSS_VAR, AGENT_LABELS } from "../../types";

interface AgentMetric {
  agent: AgentName;
  latency_ms: number;
  tokens: number;
  cost_usd: number;
  model?: string | null;
}

function aggregate(events: TraceEvent[]): AgentMetric[] {
  const byAgent = new Map<AgentName, AgentMetric>();
  for (const e of events) {
    if (!e.agent) continue;
    const existing = byAgent.get(e.agent) ?? { agent: e.agent, latency_ms: 0, tokens: 0, cost_usd: 0, model: e.model };
    existing.latency_ms += e.latency_ms ?? 0;
    existing.tokens += e.token_usage?.total_tokens ?? 0;
    existing.cost_usd += e.token_usage?.cost_usd ?? 0;
    existing.model = existing.model ?? e.model;
    byAgent.set(e.agent, existing);
  }
  return Array.from(byAgent.values());
}

export default function MetricsPanel({ events }: { events: TraceEvent[] }) {
  const metrics = aggregate(events);
  const totalLatency = metrics.reduce((s, m) => s + m.latency_ms, 0);
  const totalCost = metrics.reduce((s, m) => s + m.cost_usd, 0);
  const totalTokens = metrics.reduce((s, m) => s + m.tokens, 0);
  const maxLatency = Math.max(...metrics.map((m) => m.latency_ms), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <StatBox label="Total latency" value={`${totalLatency.toFixed(0)} ms`} />
        <StatBox label="Total tokens" value={totalTokens.toLocaleString()} />
        <StatBox label="Total cost" value={`$${totalCost.toFixed(4)}`} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {metrics.map((m) => (
          <div key={m.agent} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 130, fontSize: 12.5, fontWeight: 600, color: `var(${AGENT_CSS_VAR[m.agent]})` }}>
              {AGENT_LABELS[m.agent]}
            </div>
            <div style={{ flex: 1, background: "var(--rd-bg-subtle)", borderRadius: 999, height: 8, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(m.latency_ms / maxLatency) * 100}%`,
                  height: "100%",
                  background: `var(${AGENT_CSS_VAR[m.agent]})`,
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ width: 68, fontSize: 12, color: "var(--rd-ink-soft)", textAlign: "right" }}>
              {m.latency_ms.toFixed(0)} ms
            </div>
            <div style={{ width: 80, fontSize: 11.5, color: "var(--rd-ink-faint)", fontFamily: "var(--rd-font-mono)" }}>
              {m.tokens} tok
            </div>
            <div style={{ width: 70, fontSize: 11.5, color: "var(--rd-ink-faint)", fontFamily: "var(--rd-font-mono)" }}>
              ${m.cost_usd.toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        border: "1px solid var(--rd-border)",
        borderRadius: 10,
        padding: "10px 14px",
        background: "var(--rd-bg-subtle)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--rd-ink-faint)", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--rd-font-mono)", marginTop: 2 }}>{value}</div>
    </div>
  );
}
