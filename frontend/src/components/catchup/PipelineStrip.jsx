import { PIPELINE_STEPS } from "./pipelineSteps.js";

/**
 * statusByStep: { [stepKey]: "pending" | "running" | "done" | "error" }
 */
export default function PipelineStrip({ statusByStep }) {
  return (
    <div style={{ display: "flex", alignItems: "center", overflowX: "auto", padding: "4px 0" }}>
      {PIPELINE_STEPS.map((step, idx) => {
        const status = statusByStep[step.key] || "pending";
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${status === "pending" ? "var(--border-default)" : step.color}`,
                background:
                  status === "done"
                    ? `${step.color}14`
                    : status === "running"
                    ? "var(--surface-subtle)"
                    : status === "error"
                    ? "var(--danger-tint)"
                    : "var(--surface-card)",
                minWidth: 128,
                transition: "all 200ms ease",
              }}
            >
              <StatusDot status={status} color={step.color} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: status === "pending" ? "var(--text-tertiary)" : "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {step.short}
              </span>
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                style={{
                  width: 20,
                  height: 2,
                  background: status === "done" ? step.color : "var(--border-default)",
                  flexShrink: 0,
                  transition: "background 200ms ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusDot({ status, color }) {
  if (status === "running") {
    return (
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
          animation: "spin 800ms linear infinite",
          flexShrink: 0,
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  }
  if (status === "done") {
    return (
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
    );
  }
  if (status === "error") {
    return (
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: "var(--danger)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        border: "2px solid var(--border-strong)",
        flexShrink: 0,
      }}
    />
  );
}
