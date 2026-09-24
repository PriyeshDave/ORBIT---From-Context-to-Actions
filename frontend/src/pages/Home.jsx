import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../context/SessionContext.jsx";
import { ToolIcon, toolLabel } from "../components/ToolIcon.jsx";

const ALL_TOOLS = ["outlook", "teams", "slack", "tracker"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatTile({ label, value, accent, notRun }) {
  return (
    <div style={{ flex: 1, border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", padding: "16px 18px" }}>
      <div style={{ fontSize: notRun ? 13 : 22, fontWeight: notRun ? 600 : 800, color: notRun ? "var(--text-tertiary)" : accent, lineHeight: 1.2, fontStyle: notRun ? "italic" : "normal" }}>
        {notRun ? "Not run yet" : value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>{label}</div>
    </div>
  );
}

function ToolsStatTile({ connectedTools }) {
  return (
    <div style={{ flex: 1, border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", padding: "16px 18px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {ALL_TOOLS.map((tool) => {
          const connected = connectedTools.includes(tool);
          return (
            <div key={tool} title={`${toolLabel(tool)} - ${connected ? "connected" : "not connected"}`} style={{ opacity: connected ? 1 : 0.25 }}>
              <ToolIcon tool={tool} size={20} />
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--accent-secondary)" }}>{connectedTools.length}/4</strong> tools connected to Daily Plan
      </div>
    </div>
  );
}

function Card({ title, accent, children, cta, onCta }) {
  return (
    <div style={{ border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: 24, background: "var(--surface-card)", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
      </div>
      <div style={{ flex: 1, fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{children}</div>
      <button
        onClick={onCta}
        style={{ alignSelf: "flex-start", background: accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        {cta}
      </button>
    </div>
  );
}

const URGENCY_COLOR = { critical: "var(--urgency-critical)", high: "var(--urgency-high)", medium: "var(--urgency-medium)", low: "var(--urgency-low)" };

function TopPriorityHero({ summary }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const unrunMeetings = summary.catchup.meetings.filter((m) => !m.has_run).length;

  let topPriority = null;
  const planItem = summary.planner.top_priority_item;
  if (summary.planner.has_plan && planItem) {
    topPriority = { text: planItem.title, source: "Daily Plan", cta: "View details", expandable: true, item: planItem };
  } else if (unrunMeetings > 0) {
    const m = summary.catchup.meetings.find((mm) => !mm.has_run);
    topPriority = { text: `Catch up on "${m.title}"`, source: "Catch Up", cta: "Open Catch Up", to: "/catchup" };
  } else {
    topPriority = { text: summary.readiness.suggested_question, source: "Readiness", cta: "Ask Readiness", to: "/readiness" };
  }

  return (
    <div style={{ borderRadius: "var(--radius-lg)", marginBottom: 24, background: "linear-gradient(90deg, var(--accent-primary-tint), var(--surface-canvas))", border: "1px solid var(--border-accent)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px" }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
            Focus for right now · {topPriority.source}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{topPriority.text}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
            {topPriority.source === "Daily Plan" ? "This is your top priority today." : "This is what needs your attention most right now."}
          </div>
        </div>
        <button
          onClick={() => (topPriority.expandable ? setExpanded((v) => !v) : navigate(topPriority.to))}
          style={{ flexShrink: 0, background: "var(--accent-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          {topPriority.expandable ? (expanded ? "Hide details ▲" : `${topPriority.cta} ▼`) : `${topPriority.cta} →`}
        </button>
      </div>

      {topPriority.expandable && expanded && (
        <div style={{ padding: "0 22px 20px", borderTop: "1px solid var(--border-accent)", marginTop: 4, paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ToolIcon tool={topPriority.item.source_tool} size={16} />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{toolLabel(topPriority.item.source_tool)}</span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: URGENCY_COLOR[topPriority.item.urgency],
              background: "#fff", padding: "2px 8px", borderRadius: 20,
            }}>
              {topPriority.item.urgency}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 10, lineHeight: 1.6 }}>
            <strong>Why this matters: </strong>{topPriority.item.why}
          </div>
          {topPriority.item.due_context && (
            <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 8, fontWeight: 600 }}>⏰ {topPriority.item.due_context}</div>
          )}
          {topPriority.item.blocked_info && (
            <div style={{ fontSize: 13, color: "#B5651D", marginBottom: 8, fontWeight: 600 }}>🚧 {topPriority.item.blocked_info}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-primary)" }}>{topPriority.item.suggested_action}</span>
            <button
              onClick={() => navigate("/planner")}
              style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-primary)", background: "none", border: "none", cursor: "pointer" }}
            >
              Open in Daily Plan →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.homeSummary(session.sessionToken).then(setSummary).catch((e) => setError(e.message));
  }, [session.sessionToken]);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>
        Signed in as <strong>{session.name}</strong> · {session.role}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>{greeting()}, {session.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 24px" }}>
        One workspace for catching up, planning your day, and checking project readiness.
      </p>

      {error && (
        <div style={{ background: "var(--danger-tint)", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {!summary && !error && <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading your day...</div>}

      {summary && (
        <>
          {/* At a glance */}
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatTile label="Meetings you can catch up on" value={summary.catchup.eligible_meeting_count} accent="var(--accent-primary)" />
            <ToolsStatTile connectedTools={summary.planner.connected_tools} />
            <StatTile label="Plan items today" value={summary.planner.plan_item_count} accent="var(--success)" notRun={!summary.planner.has_plan} />
            <StatTile label="Plans completed" value={summary.planner.completed_count} accent="var(--accent-secondary)" notRun={!summary.planner.has_plan} />
          </div>

          <TopPriorityHero summary={summary} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            <Card title="Catch Up" accent="var(--accent-primary)" cta="Open Catch Up" onCta={() => navigate("/catchup")}>
              <p style={{ margin: "0 0 8px" }}>
                You're on the invite list for <strong>{summary.catchup.eligible_meeting_count}</strong> meeting
                {summary.catchup.eligible_meeting_count === 1 ? "" : "s"}.
              </p>
              {summary.catchup.meetings.slice(0, 3).map((m) => (
                <div key={m.id} style={{ fontSize: 12.5, marginBottom: 3 }}>
                  {m.has_run ? "✓" : "•"} {m.title}
                </div>
              ))}
            </Card>

            <Card
              title="Daily Plan"
              accent="var(--accent-secondary)"
              cta={summary.planner.has_plan ? "View Plan" : "Build Today's Plan"}
              onCta={() => navigate("/planner")}
            >
              <p style={{ margin: "0 0 8px" }}>
                <strong>{summary.planner.connected_tools.length}/4</strong> tools connected.
              </p>
              {summary.planner.has_plan ? (
                <>
                  <p style={{ margin: "0 0 4px" }}>
                    <strong>{summary.planner.completed_count}</strong> done ·{" "}
                    <strong>{summary.planner.partly_done_count}</strong> partly done ·{" "}
                    <strong>{summary.planner.plan_item_count - summary.planner.completed_count - summary.planner.partly_done_count}</strong> pending
                  </p>
                  {summary.planner.top_priority && <p style={{ margin: 0 }}>Top priority: <strong>{summary.planner.top_priority}</strong></p>}
                </>
              ) : (
                <p style={{ margin: 0, fontStyle: "italic" }}>No plan generated yet today.</p>
              )}
            </Card>

            <Card title="Readiness" accent="var(--danger)" cta="Ask Readiness" onCta={() => navigate("/readiness")}>
              <p style={{ margin: "0 0 8px" }}>
                Tracking: <strong>{summary.readiness.tracked_project}</strong>
              </p>
              <p style={{ margin: 0 }}>{summary.readiness.milestone}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
