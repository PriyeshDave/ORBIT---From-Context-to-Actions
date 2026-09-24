import { useState } from "react";
import { ToolIcon, toolLabel } from "../ToolIcon.jsx";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";

const FILTERS = ["All", "Critical", "High", "Medium"];

const URGENCY_COLOR = {
  critical: "var(--urgency-critical)", high: "var(--urgency-high)",
  medium: "var(--urgency-medium)", low: "var(--urgency-low)",
};
const URGENCY_TINT = {
  critical: "var(--danger-tint)", high: "#ffe9dc",
  medium: "var(--warning-tint)", low: "var(--success-tint)",
};

export default function PlanCards({ plan, timeOfDay, onFeedback, onStatusChange, adjusting }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [filter, setFilter] = useState("All");

  if (!plan || plan.length === 0) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
        Choose a time of day and ask for your plan to see prioritized items here.
      </div>
    );
  }

  const sorted = plan.slice().sort((a, b) => a.rank - b.rank);
  const filtered = filter === "All" ? sorted : sorted.filter((item) => item.urgency?.toLowerCase() === filter.toLowerCase());

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {FILTERS.map((f) => {
          const count = f === "All" ? sorted.length : sorted.filter((i) => i.urgency?.toLowerCase() === f.toLowerCase()).length;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                border: active ? `1px solid ${f === "All" ? "var(--accent-primary)" : URGENCY_COLOR[f.toLowerCase()]}` : "1px solid var(--border-default)",
                background: active ? (f === "All" ? "var(--accent-primary-tint)" : URGENCY_TINT[f.toLowerCase()]) : "var(--surface-card)",
                color: active ? (f === "All" ? "var(--accent-primary)" : URGENCY_COLOR[f.toLowerCase()]) : "var(--text-secondary)",
              }}
            >
              {f}
              <span style={{
                fontSize: 10.5, fontWeight: 700, background: active ? "rgba(0,0,0,0.12)" : "var(--border-strong)",
                color: active ? "inherit" : "#fff", borderRadius: "50%", width: 18, height: 18,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "var(--text-tertiary)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
          No {filter.toLowerCase()} priority items right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((item, i) => (
            <PlanCard
              key={`${item.title}-${i}`}
              item={item}
              timeOfDay={timeOfDay}
              hovered={hoveredIdx === i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFeedback={onFeedback}
              onStatusChange={onStatusChange}
              adjusting={adjusting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ item, timeOfDay, hovered, onMouseEnter, onMouseLeave, onFeedback, onStatusChange, adjusting }) {
  const { session } = useSession();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [partlyNoteOpen, setPartlyNoteOpen] = useState(false);
  const [partlyNote, setPartlyNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isDone = item.status === "done";
  const isPartlyDone = item.status === "partly_done";

  async function markDone() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.planner.updatePlanStatus(timeOfDay, item.title, "done", null, session.sessionToken);
      onStatusChange(updated);
    } catch (e) {
      setError(e.message || "Could not update this item.");
    } finally {
      setBusy(false);
    }
  }

  async function markPartlyDone() {
    if (!partlyNote.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.planner.updatePlanStatus(timeOfDay, item.title, "partly_done", partlyNote, session.sessionToken);
      onStatusChange(updated);
      setPartlyNoteOpen(false);
      setPartlyNote("");
    } catch (e) {
      setError(e.message || "Could not update this item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        border: `1px solid ${isDone ? "var(--border-default)" : "var(--border-accent)"}`,
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        background: isDone ? "var(--surface-sunken)" : "var(--surface-card)",
        boxShadow: isDone ? "none" : "var(--shadow-sm)",
        opacity: adjusting ? 0.6 : isDone ? 0.7 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: isDone ? "var(--success)" : "var(--surface-sunken)",
              color: isDone ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {isDone ? "✓" : item.rank}
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-tertiary)" : "var(--text-primary)" }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}>{item.why}</div>
            {item.due_context && !isDone && (
              <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4, fontWeight: 600 }}>⏰ {item.due_context}</div>
            )}
            {item.blocked_info && !isDone && (
              <div style={{ fontSize: 11.5, color: "#B5651D", marginTop: 3, fontWeight: 600 }}>🚧 {item.blocked_info}</div>
            )}
            {isPartlyDone && item.progress_note && (
              <div style={{ fontSize: 11.5, color: "var(--accent-primary)", marginTop: 4, fontStyle: "italic" }}>
                🟡 Partly done - {item.progress_note}
              </div>
            )}
          </div>
        </div>
        {!isDone && (
          <span
            style={{
              fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
              color: URGENCY_COLOR[item.urgency] || "var(--text-secondary)",
              background: URGENCY_TINT[item.urgency] || "var(--surface-sunken)",
              padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {item.urgency}
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingLeft: 34, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)" }}>
          <ToolIcon tool={item.source_tool} size={15} />
          {toolLabel(item.source_tool)}
        </span>

        {!isDone && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={busy}
              onClick={markDone}
              style={{
                fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: busy ? "default" : "pointer",
                border: "1px solid var(--success)", background: "var(--success-tint)", color: "var(--success)",
              }}
            >
              ✅ Done
            </button>
            <button
              disabled={busy}
              onClick={() => setPartlyNoteOpen((v) => !v)}
              style={{
                fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: busy ? "default" : "pointer",
                border: "1px solid var(--warning)", background: "var(--warning-tint)", color: "#8a6d00",
              }}
            >
              🟡 Partly Done
            </button>
          </div>
        )}
      </div>

      {partlyNoteOpen && !isDone && (
        <div style={{ paddingLeft: 34, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
            Required: what's done, and what's still pending? (this carries into your next plan)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={partlyNote}
              onChange={(e) => setPartlyNote(e.target.value)}
              placeholder={`e.g. "Identified root cause, fix still needs deploying"`}
              style={{ flex: 1, fontSize: 12, padding: "6px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}
            />
            <button
              disabled={busy || !partlyNote.trim()}
              onClick={markPartlyDone}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: "var(--radius-md)", border: "none",
                background: "var(--warning)", color: "#3a2e00", cursor: busy || !partlyNote.trim() ? "default" : "pointer",
                opacity: !partlyNote.trim() ? 0.6 : 1,
              }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, paddingLeft: 34 }}>{error}</div>}

      {/* Human-in-the-loop re-rank feedback - only shown on hover so the card list stays clean */}
      {onFeedback && !isDone && (
        <div style={{ paddingLeft: 34, maxHeight: hovered || noteOpen ? 60 : 0, overflow: "hidden", transition: "all 150ms ease" }}>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              disabled={adjusting}
              onClick={() => onFeedback(item.title, "not_relevant", note || null)}
              style={{
                fontSize: 11.5, padding: "4px 10px", borderRadius: 20, cursor: adjusting ? "default" : "pointer",
                border: "1px solid var(--border-strong)", background: "var(--surface-canvas)", color: "var(--text-secondary)",
              }}
            >
              👎 Not relevant
            </button>
            <button
              disabled={adjusting}
              onClick={() => onFeedback(item.title, "prioritize", note || null)}
              style={{
                fontSize: 11.5, padding: "4px 10px", borderRadius: 20, cursor: adjusting ? "default" : "pointer",
                border: "1px solid var(--accent-primary)", background: "var(--accent-primary-tint)", color: "var(--accent-primary)",
              }}
            >
              ⬆ Make this top priority
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
