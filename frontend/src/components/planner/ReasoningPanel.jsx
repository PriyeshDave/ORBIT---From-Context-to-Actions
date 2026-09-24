export default function ReasoningPanel({ reasoning }) {
  if (!reasoning || !reasoning.telemetry) {
    return <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Waiting for the reasoning call…</div>;
  }
  const t = reasoning.telemetry;
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        background: "var(--surface-card)",
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Model</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{t.model}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Prompt → Completion tokens</div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
          {t.prompt_tokens} → {t.completion_tokens}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Latency</div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.latency_ms} ms</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Cost</div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>${t.cost_usd.toFixed(5)}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>LangSmith</div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
          {t.langsmith_trace_url ? (
            <a href={t.langsmith_trace_url} target="_blank" rel="noreferrer">
              View trace ↗
            </a>
          ) : (
            <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>{t.langsmith_enabled ? "No trace" : "Not configured"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
