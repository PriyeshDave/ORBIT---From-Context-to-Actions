import { PIPELINE_STEPS } from "./pipelineSteps.js";

export default function LLMCallTable({ events }) {
  const rows = PIPELINE_STEPS.filter((s) => s.key !== "security_check")
    .map((s) => ({ step: s, telem: events[s.key]?.telemetry }))
    .filter((r) => r.telem);

  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No model calls yet.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border-default)" }}>
            <th style={th}>Step</th>
            <th style={th}>Model</th>
            <th style={th}>Prompt tok</th>
            <th style={th}>Completion tok</th>
            <th style={th}>Latency</th>
            <th style={th}>Cost</th>
            <th style={th}>LangSmith</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ step, telem }) => (
            <tr key={step.key} style={{ borderBottom: "1px solid var(--border-default)" }}>
              <td style={td}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: step.color }} />
                  {step.label}
                </span>
              </td>
              <td style={{ ...td, fontFamily: "var(--font-mono)" }}>{telem.model}</td>
              <td style={td}>{telem.prompt_tokens}</td>
              <td style={td}>{telem.completion_tokens}</td>
              <td style={td}>{telem.latency_ms} ms</td>
              <td style={td}>${telem.cost_usd.toFixed(5)}</td>
              <td style={td}>
                {telem.langsmith_trace_url ? (
                  <a href={telem.langsmith_trace_url} target="_blank" rel="noreferrer">
                    View trace ↗
                  </a>
                ) : (
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {telem.langsmith_enabled ? "No trace" : "Not configured"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "8px 10px", fontWeight: 600 };
const td = { padding: "8px 10px" };
