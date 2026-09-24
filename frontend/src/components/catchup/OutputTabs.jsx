import { useState } from "react";
import { formatChatText } from "../../utils/formatChatText.jsx";
import { useSession } from "../../context/SessionContext.jsx";

function Card({ children }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-accent)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        background: "var(--surface-card)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div style={{ color: "var(--text-tertiary)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
      {label}
    </div>
  );
}

/**
 * Builds a short "what happened so far" narrative from the already-
 * extracted structured data (decisions/actions/risks/priorities), rather
 * than showing the full speaker-by-speaker normalized notes, which can
 * feel almost as long as the raw transcript for a short meeting. No extra
 * LLM call - everything here is already sitting in `outputs` by the time
 * the pipeline finishes.
 */
function buildSummary(decisions, actions, risks, priorities) {
  const parts = [];

  if (decisions.length > 0) {
    parts.push(
      `${decisions.length} decision${decisions.length === 1 ? " was" : "s were"} made this meeting` +
        (decisions[0]?.decision ? `, including: ${decisions[0].decision}` : "") +
        (decisions.length > 1 ? ` (and ${decisions.length - 1} more).` : ".")
    );
  } else {
    parts.push("No formal decisions were recorded in this meeting.");
  }

  if (actions.length > 0) {
    const owners = [...new Set(actions.map((a) => a.owner).filter(Boolean))];
    parts.push(
      `${actions.length} action item${actions.length === 1 ? "" : "s"} came out of it` +
        (owners.length ? `, split across ${owners.length === 1 ? owners[0] : `${owners.length} people`}.` : ".")
    );
  }

  if (risks.length > 0) {
    parts.push(
      `${risks.length} blocker${risks.length === 1 ? "" : "s"} flagged` +
        (risks[0]?.title ? ` - top of mind: "${risks[0].title}".` : ".")
    );
  }

  if (priorities.length > 0 && priorities[0]?.title) {
    parts.push(`Top priority going forward: ${priorities[0].title}.`);
  }

  return parts.join(" ");
}

export function OverviewTab({ outputs }) {
  const notes = outputs.read_notes;
  const decisions = outputs.extract_decisions?.decisions || [];
  const actions = outputs.find_actions?.actions || [];
  const risks = outputs.identify_risks?.risks || [];
  const priorities = outputs.prioritise_focus?.priorities || [];
  const [showFullNotes, setShowFullNotes] = useState(false);

  if (!notes) return <EmptyState label="Run the assistant to see a meeting overview here." />;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <StatPill label="Decisions Made" value={decisions.length} color="var(--step-decisions)" />
        <StatPill label="Action Items" value={actions.length} color="var(--step-actions)" />
        <StatPill label="Blockers" value={risks.length} color="var(--step-risks)" />
      </div>

      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-primary)", marginBottom: 12 }}>
        {buildSummary(decisions, actions, risks, priorities)}
      </div>

      <button
        onClick={() => setShowFullNotes((v) => !v)}
        style={{
          background: "none", border: "none", color: "var(--accent-primary)",
          fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0,
        }}
      >
        {showFullNotes ? "Hide full meeting notes" : "Show full meeting notes"}
      </button>

      {showFullNotes && (
        <div
          style={{
            fontSize: 13, lineHeight: 1.8, marginTop: 12,
            paddingTop: 12, borderTop: "1px solid var(--border-default)",
          }}
        >
          {formatChatText(notes)}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div
      style={{
        border: `1px solid ${color}33`,
        background: `${color}10`,
        borderRadius: "var(--radius-md)",
        padding: "8px 14px",
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}

export function TranscriptTab({ transcript }) {
  if (!transcript) return <EmptyState label="Loading transcript…" />;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginBottom: 10 }}>
        Source: {transcript.source}
      </div>
      {transcript.segments.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 13 }}>
          <div style={{ color: "var(--text-tertiary)", width: 46, flexShrink: 0 }}>{s.time}</div>
          <div>
            <strong>{s.speaker}:</strong> {s.text}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Splits a supporting-transcript excerpt into one entry per [HH:MM]
 * statement, regardless of whether the model separated them with
 * newlines or ran them together on one line - makes multi-speaker
 * excerpts render clearly instead of as one dense paragraph.
 */
function splitTranscriptExcerpt(text) {
  if (!text) return [];
  const parts = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?=\[\d{1,2}:\d{2}\])/))
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

export function DecisionsTab({ outputs }) {
  const decisions = outputs.extract_decisions?.decisions;
  if (!decisions) return <EmptyState label="Run the assistant to extract decisions." />;
  if (decisions.length === 0) return <EmptyState label="No decisions were identified in this meeting." />;
  return (
    <div>
      {decisions.map((d, i) => (
        <Card key={i}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--step-decisions)", marginBottom: 4 }}>
            {d.subject}
          </div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>{d.decision}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{d.detail}</div>
          {d.supporting_transcript && (
            <div
              style={{
                marginTop: 10, paddingLeft: 12, borderLeft: "3px solid var(--border-strong)",
                fontSize: 12, fontStyle: "italic", color: "var(--text-tertiary)", lineHeight: 1.7,
              }}
            >
              {splitTranscriptExcerpt(d.supporting_transcript).map((line, li) => (
                <div key={li} style={{ marginBottom: li === splitTranscriptExcerpt(d.supporting_transcript).length - 1 ? 0 : 6 }}>
                  "{line}"
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/**
 * Picks a contextually relevant micro-action for an action item based on
 * keywords in the task text - e.g. a task about a document gets "Open
 * document", one about approval gets "Request approval", etc. Falls back
 * to a generic Slack ping. Nothing here actually sends anything (this is
 * a demo), but each button produces a short, specific confirmation
 * message so it reads as a real, contextual interaction rather than a
 * generic "done" toast.
 */
function inferAction(task) {
  const t = (task || "").toLowerCase();
  if (/\baccess\b|\bpermission|\bentitlement/.test(t)) return { icon: "🔐", label: "Raise an IIQ", confirm: (owner) => `IIQ access request raised for ${owner}.` };
  if (/\bemail\b/.test(t)) return { icon: "📧", label: "Send email reminder", confirm: (owner) => `Email reminder sent to ${owner}.` };
  if (/\bapprov|sign[- ]?off\b/.test(t)) return { icon: "✅", label: "Request approval", confirm: (owner) => `Approval request sent to ${owner}.` };
  if (/\breview\b/.test(t)) return { icon: "👀", label: "Request review", confirm: (owner) => `Review request sent to ${owner}.` };
  if (/\bdashboard\b/.test(t)) return { icon: "📊", label: "Open dashboard", confirm: () => `Opening the dashboard…` };
  if (/\b(doc|document|form|plot|plots|report)\b/.test(t)) return { icon: "📄", label: "Open document", confirm: () => `Opening the document…` };
  if (/\bticket|DW-\d+/.test(t)) return { icon: "🎫", label: "Open Jira ticket", confirm: () => `Opening the Jira ticket…` };
  if (/\btest|backfill|data\b/.test(t)) return { icon: "🛠️", label: "Raise Jira ticket", confirm: (owner) => `Raised a Jira ticket, assigned to ${owner}.` };
  return { icon: "💬", label: "Ping on Slack", confirm: (owner) => `Pinged ${owner} on Slack about this.` };
}

export function ActionsTab({ outputs }) {
  const actions = outputs.find_actions?.actions;
  const { session } = useSession();
  const [confirmations, setConfirmations] = useState({});
  const [expanded, setExpanded] = useState(null);

  if (!actions) return <EmptyState label="Run the assistant to find action items." />;
  if (actions.length === 0) return <EmptyState label="No action items were identified." />;

  const grouped = {};
  actions.forEach((a, i) => {
    const owner = a.owner || "Unassigned";
    if (!grouped[owner]) grouped[owner] = [];
    grouped[owner].push({ ...a, _idx: i });
  });
  const owners = Object.keys(grouped);

  // Default-expand the signed-in colleague's own section, if they own any items here.
  const activeOwner = expanded !== null ? expanded : owners.find((o) => o === session?.name) || null;

  function handleClick(i, action, owner) {
    setConfirmations((prev) => ({ ...prev, [i]: action.confirm(owner) }));
    setTimeout(() => setConfirmations((prev) => ({ ...prev, [i]: null })), 3000);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {owners.map((owner) => {
          const isYou = owner === session?.name;
          const isActive = activeOwner === owner;
          return (
            <button
              key={owner}
              onClick={() => setExpanded(isActive ? "__none__" : owner)}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                border: isActive ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                background: isActive ? "var(--accent-primary-tint)" : "var(--surface-card)",
                color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
              }}
            >
              {owner}{isYou && " (you)"}
              <span
                style={{
                  fontSize: 10.5, fontWeight: 700, background: isActive ? "var(--accent-primary)" : "var(--border-strong)",
                  color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {grouped[owner].length}
              </span>
            </button>
          );
        })}
      </div>

      {!activeOwner && (
        <div style={{ color: "var(--text-tertiary)", fontSize: 12.5, padding: "12px 0" }}>
          Select a colleague above to see their action items.
        </div>
      )}

      {activeOwner && grouped[activeOwner] && (
        <div>
          {grouped[activeOwner].map((a) => {
            const action = inferAction(a.task);
            const i = a._idx;
            return (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.task}</div>
                  <button
                    onClick={() => handleClick(i, action, a.owner)}
                    style={{
                      fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                      background: "var(--accent-primary-tint)", color: "var(--accent-primary)",
                      border: "1px solid var(--accent-primary)", borderRadius: 20, padding: "5px 12px", cursor: "pointer",
                    }}
                  >
                    {action.icon} {action.label}
                  </button>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                  Related to: {a.related_decision}
                </div>
                {confirmations[i] && (
                  <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6 }}>✓ {confirmations[i]}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CATEGORY_COLOR = {
  "Data/Privacy": "var(--danger)",
  Governance: "var(--accent-secondary)",
  Dependency: "#B5651D",
  Delivery: "var(--accent-primary)",
  Operational: "#0F7B6C",
};
const CATEGORY_TINT = {
  "Data/Privacy": "var(--danger-tint)",
  Governance: "#E7E9F5",
  Dependency: "#FBEEE3",
  Delivery: "var(--accent-primary-tint)",
  Operational: "#E3F5F1",
};

export function RisksTab({ outputs }) {
  const risks = outputs.identify_risks?.risks;
  if (!risks) return <EmptyState label="Run the assistant to identify blockers." />;
  if (risks.length === 0) return <EmptyState label="No blockers were identified." />;
  return (
    <div>
      {risks.map((r, i) => {
        const color = CATEGORY_COLOR[r.category] || "var(--text-secondary)";
        const tint = CATEGORY_TINT[r.category] || "var(--surface-sunken)";
        return (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, color, background: tint,
                  padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
                }}
              >
                {r.category || "Uncategorized"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>{r.detail}</div>
          </Card>
        );
      })}
    </div>
  );
}

/** Smoothly interpolates from red (rank 1) to light orange (last rank), regardless of list length. */
function priorityColor(rank, total) {
  const start = [196, 49, 75]; // --danger
  const end = [247, 199, 155]; // light orange
  const t = total > 1 ? (rank - 1) / (total - 1) : 0;
  const rgb = start.map((s, i) => Math.round(s + (end[i] - s) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function PrioritiesTab({ outputs }) {
  const priorities = outputs.prioritise_focus?.priorities;
  if (!priorities) return <EmptyState label="Run the assistant to see prioritised focus areas." />;
  const sorted = priorities.slice().sort((a, b) => a.rank - b.rank);
  return (
    <div>
      {sorted.map((p, i) => (
        <Card key={i}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: priorityColor(p.rank, sorted.length),
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}
            >
              {p.rank}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{p.why}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function FollowupTab({ outputs, draft, setDraft, onSend, sendStatus }) {
  const followup = outputs.draft_followup;
  if (!followup) return <EmptyState label="Run the assistant to generate a draft follow-up." />;

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>Subject</div>
      <div
        style={{
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "9px 12px",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 14,
          background: "var(--surface-card)",
        }}
      >
        {typeof followup === "string" ? "Recap" : followup.subject}
      </div>

      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>Message (editable)</div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={10}
        style={{
          width: "100%",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: 12,
          fontSize: 13.5,
          lineHeight: 1.6,
          fontFamily: "inherit",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button
          onClick={onSend}
          style={{
            background: "var(--accent-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "9px 18px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send follow-up
        </button>
        {sendStatus && <span style={{ fontSize: 12.5, color: "var(--success)" }}>{sendStatus}</span>}
      </div>
    </div>
  );
}
