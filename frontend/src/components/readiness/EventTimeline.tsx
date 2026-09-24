import type { TraceEvent } from "../../types";
import { AGENT_CSS_VAR, AGENT_LABELS } from "../../types";

export default function EventTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {events.map((e, i) => {
        const colorVar = e.agent ? AGENT_CSS_VAR[e.agent] : "--rd-coordinator";
        return (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--rd-border)" }}>
            <div style={{ width: 90, fontSize: 11, color: "var(--rd-ink-faint)", fontFamily: "var(--rd-font-mono)", paddingTop: 2 }}>
              {new Date(e.timestamp).toLocaleTimeString(undefined, { hour12: false })}
            </div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: `var(${colorVar})`,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>
                <span style={{ fontWeight: 600, color: `var(${colorVar})` }}>
                  {e.agent ? AGENT_LABELS[e.agent] : "System"}
                </span>{" "}
                <span style={{ color: "var(--rd-ink-faint)" }}>· {e.event_type}</span>
                {e.latency_ms != null && (
                  <span style={{ color: "var(--rd-ink-faint)" }}> · {e.latency_ms.toFixed(0)} ms</span>
                )}
                {e.token_usage && (
                  <span style={{ color: "var(--rd-ink-faint)" }}>
                    {" "}
                    · {e.token_usage.total_tokens} tok · ${e.token_usage.cost_usd.toFixed(4)}
                  </span>
                )}
              </div>
              {e.message && <div style={{ fontSize: 13, marginTop: 2 }}>{e.message}</div>}
              {e.langsmith_trace_url && (
                <a
                  href={e.langsmith_trace_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11.5, color: "var(--rd-accent)", fontWeight: 600 }}
                >
                  View in LangSmith →
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
