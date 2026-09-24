/**
 * Shared top header - appears on the Login page and on every logged-in
 * page (via AppShell), for consistent branding across the whole app.
 * Uses the actual American Express logo asset provided for this project.
 */
export default function TopHeader({ dense = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: dense ? "10px 24px" : "16px 32px",
        borderBottom: "1px solid var(--border-accent)",
        background: "var(--surface-canvas)",
        flexShrink: 0,
      }}
    >
      {/* Left: Amex logo + team credit */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img
          src="/branding/amex-logo.png"
          alt="American Express"
          style={{ height: dense ? 26 : 32, width: dense ? 26 : 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        />
        <div
          style={{
            fontSize: dense ? 11.5 : 13, color: "var(--text-tertiary)", fontWeight: 700,
            letterSpacing: 0.4, borderLeft: "1px solid var(--border-default)", paddingLeft: 12,
            textTransform: "uppercase",
          }}
        >
          The Orchestrators
        </div>
      </div>

      {/* Center-ish: Orbit brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src="/branding/orbit-logo.png"
          alt="Orbit"
          style={{ height: dense ? 22 : 28, width: dense ? 22 : 28, borderRadius: "50%", objectFit: "cover" }}
        />
        <span style={{ fontSize: dense ? 14 : 16, fontWeight: 700, letterSpacing: 0.3 }}>ORBIT</span>
      </div>

      {/* Right: Growth Hack badge */}
      <div
        style={{
          background: "var(--accent-primary-tint)",
          color: "var(--accent-primary-hover)",
          fontSize: dense ? 10.5 : 11.5,
          fontWeight: 700,
          padding: dense ? "4px 10px" : "6px 12px",
          borderRadius: 999,
          letterSpacing: 0.3,
          border: "1px solid var(--accent-primary)",
        }}
      >
        Growth Hack 2026
      </div>
    </div>
  );
}
