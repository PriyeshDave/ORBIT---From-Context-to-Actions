import { PIPELINE_STEPS } from "./pipelineSteps.js";

/**
 * events: { [stepKey]: { status, telemetry, security } }
 */
export default function PipelineGraph({ events }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        overflowX: "auto",
        padding: "8px 4px 16px",
      }}
    >
      {PIPELINE_STEPS.map((step, idx) => {
        const ev = events[step.key];
        const status = ev?.status || "pending";
        const telem = ev?.telemetry;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div
              style={{
                width: 168,
                border: `1.5px solid ${status === "pending" ? "var(--border-default)" : step.color}`,
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                background:
                  status === "done"
                    ? `${step.color}0f`
                    : status === "running"
                    ? "var(--surface-subtle)"
                    : status === "error"
                    ? "var(--danger-tint)"
                    : "var(--surface-card)",
                transition: "all 200ms ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <Dot status={status} color={step.color} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{step.short}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginBottom: 4 }}>
                {status === "pending" && "Waiting…"}
                {status === "running" && "Calling model…"}
                {status === "error" && "Blocked"}
                {status === "done" && "Complete"}
              </div>
              {telem && (
                <div style={{ fontSize: 10.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                  <div>{telem.latency_ms} ms</div>
                  <div>
                    {telem.prompt_tokens}→{telem.completion_tokens} tok
                  </div>
                  <div>${telem.cost_usd.toFixed(5)}</div>
                </div>
              )}
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <Arrow active={status === "done"} color={step.color} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dot({ status, color }) {
  const base = { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 };
  if (status === "running")
    return (
      <span
        style={{
          ...base,
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
          animation: "spin 800ms linear infinite",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  if (status === "done") return <span style={{ ...base, background: color }} />;
  if (status === "error") return <span style={{ ...base, background: "var(--danger)" }} />;
  return <span style={{ ...base, border: "2px solid var(--border-strong)" }} />;
}

function Arrow({ active, color }) {
  return (
    <div style={{ width: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
        <line x1="0" y1="6" x2="16" y2="6" stroke={active ? color : "var(--border-default)"} strokeWidth="1.5" />
        <path d={`M14 2 L20 6 L14 10`} stroke={active ? color : "var(--border-default)"} strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}
