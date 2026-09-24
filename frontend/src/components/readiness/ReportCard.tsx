import type { FinalReport } from "../../types";

export default function ReportCard({ report }: { report: FinalReport }) {
  return (
    <div
      style={{
        border: "1px solid var(--rd-border)",
        borderRadius: "var(--rd-radius-lg)",
        padding: 20,
        background: "var(--rd-bg-panel)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--rd-coordinator)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Readiness Summary
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.55 }}>{report.readiness_summary}</p>
      </div>

      {report.risks?.length > 0 && (
        <Section title="Risks" color="var(--rd-risk)">
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {report.risks.map((r, i) => (
              <li key={i} style={{ fontSize: 14 }}>{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {report.action_plan?.length > 0 && (
        <Section title="Action Plan" color="var(--rd-planning)">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {report.action_plan.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--rd-bg)",
                  border: "1px solid var(--rd-border)",
                }}
              >
                <span>{step.step}</span>
                <span style={{ color: "var(--rd-ink-soft)", fontSize: 13 }}>
                  {step.owner} · due {step.due}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.owner_followups?.length > 0 && (
        <Section title="Owner Follow-ups" color="var(--rd-research)">
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {report.owner_followups.map((f, i) => (
              <li key={i} style={{ fontSize: 14 }}>{f}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Communication Draft (for your review)" color="var(--rd-communication)">
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            padding: 12,
            borderRadius: 8,
            background: "var(--rd-communication-soft)",
            fontStyle: "italic",
          }}
        >
          {report.communication_draft}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
