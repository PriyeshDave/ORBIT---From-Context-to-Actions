export default function SecurityPanel({ security }) {
  if (!security) {
    return (
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
        Run the pipeline to see the access check.
      </div>
    );
  }

  const allowed = security.decision === "ALLOWED";

  return (
    <div
      style={{
        border: `1px solid ${allowed ? "var(--success)" : "var(--danger)"}33`,
        background: allowed ? "var(--success-tint)" : "var(--danger-tint)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            color: allowed ? "var(--success)" : "var(--danger)",
            background: "#ffffffaa",
            padding: "3px 9px",
            borderRadius: 20,
          }}
        >
          {security.decision}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{security.persona_name}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>{security.reason}</div>
      {security.sensitivity_label && (
        <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
          Sensitivity label: <strong>{security.sensitivity_label}</strong>
        </div>
      )}
    </div>
  );
}
