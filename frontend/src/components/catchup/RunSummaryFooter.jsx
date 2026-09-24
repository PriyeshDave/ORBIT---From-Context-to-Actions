export default function RunSummaryFooter({ summary }) {
  if (!summary) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "14px 18px",
        background: "var(--surface-subtle)",
      }}
    >
      <Metric label="Total wall-clock time" value={`${summary.total_wall_clock_ms} ms`} />
      <Metric label="Sum of step latencies" value={`${summary.total_latency_ms} ms`} />
      <Metric label="Total tokens" value={summary.total_tokens.toLocaleString()} />
      <Metric label="Total cost" value={`$${summary.total_cost_usd.toFixed(5)}`} />
      <Metric
        label="LangSmith"
        value={summary.langsmith_enabled ? "Enabled" : "Not configured"}
        link={summary.langsmith_project}
      />
    </div>
  );
}

function Metric({ label, value, link }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer">
            {value} ↗
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
