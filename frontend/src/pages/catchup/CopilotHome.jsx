import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";

const SUGGESTED_QUERIES = [
  "Updates from the standup today",
  "ServiceNow Incident Data Management",
  "Sentiment Analytics Review",
];

const PRIORITY_STYLE = {
  Critical: { color: "var(--danger)", tint: "var(--danger-tint)" },
  "Action Required": { color: "#B5651D", tint: "#FBEEE3" },
  Info: { color: "var(--accent-primary)", tint: "var(--accent-primary-tint)" },
  Recommended: { color: "var(--accent-primary)", tint: "var(--accent-primary-tint)" },
  Optional: { color: "var(--text-secondary)", tint: "var(--surface-sunken)" },
};

const MEETINGS_ACCENT = "#0F9D8C";

export default function CopilotHome() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [notifications, setNotifications] = useState(null);

  async function handleAcknowledge(notificationId) {
    await api.catchup.acknowledgeNotification(notificationId, session.sessionToken);
    setNotifications((prev) => {
      if (!prev) return prev;
      const mark = (list) => list.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      return { critical_notices: mark(prev.critical_notices), training_events: mark(prev.training_events) };
    });
  }
  const [myMeetings, setMyMeetings] = useState(null);

  useEffect(() => {
    api.catchup.getNotifications(session.sessionToken).then(setNotifications).catch(() => {});
    api.catchup.searchMeetings("", session.sessionToken).then((res) => setMyMeetings(res.results)).catch(() => {});
  }, [session.sessionToken]);

  async function runSearch(q) {
    setSearching(true);
    setError(null);
    try {
      const res = await api.catchup.searchMeetings(q, session.sessionToken);
      setResults(res.results);
    } catch (e) {
      setError(e.message);
      setResults([]);
    } finally {
      setSearching(false);
      setSearchedOnce(true);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(query);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", width: "100%", padding: "56px 24px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>
            Signed in as <strong style={{ color: "var(--text-secondary)" }}>{session.name}</strong>
            {" · "}
            {session.role}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 8px" }}>Ask about a meeting</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: 0 }}>
            Search for a Teams meeting to get decisions, actions, risks, and a draft follow-up.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: 16, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "6px 8px 6px 18px", boxShadow: "var(--shadow-sm)", gap: 10 }}>
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. credit risk committee meeting today"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "10px 0", background: "transparent", color: "var(--text-primary)" }}
            />
            <button type="submit" disabled={searching} style={{ background: "var(--accent-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32, maxWidth: 720, marginLeft: "auto", marginRight: "auto", justifyContent: "center" }}>
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); runSearch(q); }}
              style={{ fontSize: 13, border: "1px solid var(--border-default)", background: "var(--surface-subtle)", borderRadius: 20, padding: "6px 12px", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              {q}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "var(--danger-tint)", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {searchedOnce && !searching && results && results.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-lg)", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>No results found</div>
            <div style={{ fontSize: 13, maxWidth: 380, margin: "0 auto" }}>
              We couldn't find a meeting matching that search. This may be because the meeting doesn't exist, or because it hasn't been shared with you.
            </div>
          </div>
        )}

        {results && results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {results.map((m) => <MeetingRow key={m.id} m={m} onClick={() => navigate(`/catchup/meeting/${m.id}`)} />)}
          </div>
        )}

        {!searchedOnce && myMeetings && myMeetings.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 36, border: `1px solid ${MEETINGS_ACCENT}44`, background: `${MEETINGS_ACCENT}08`, borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <CalendarIcon color={MEETINGS_ACCENT} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: MEETINGS_ACCENT }}>Your Outlook Meetings</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myMeetings.map((m) => <MeetingRow key={m.id} m={m} onClick={() => navigate(`/catchup/meeting/${m.id}`)} compact />)}
            </div>
          </div>
        )}

        {!searchedOnce && notifications && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Inbox Digest</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Mail that's easy to miss in a busy week - org announcements, and training worth knowing about.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <NotificationColumn title="Org Announcements & Notifications" accent="var(--danger)" items={notifications.critical_notices} onAcknowledge={handleAcknowledge} />
              <NotificationColumn title="Training & Events" accent="var(--accent-primary)" items={notifications.training_events} onAcknowledge={handleAcknowledge} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingRow({ m, onClick, compact }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
        padding: compact ? "12px 14px" : "16px 18px", background: "var(--surface-card)", cursor: "pointer",
        boxShadow: compact ? "none" : "var(--shadow-sm)", width: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: compact ? 13.5 : 15, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
          <div style={{ fontSize: compact ? 12 : 13, color: "var(--text-secondary)" }}>
            {m.platform} · {m.date} · {m.start_time}–{m.end_time} · Organized by {m.organizer_name}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-primary)", background: "var(--accent-primary-tint)", padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", marginLeft: 12, flexShrink: 0 }}>
          {m.sensitivity_label}
        </span>
      </div>
    </button>
  );
}

function NotificationColumn({ title, accent, items, onAcknowledge }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
        <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((n) => <NotificationCard key={n.id} n={n} onAcknowledge={onAcknowledge} />)}
      </div>
    </div>
  );
}

function NotificationCard({ n, onAcknowledge }) {
  const [busy, setBusy] = useState(false);
  const style = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.Info;

  async function handleAcknowledge() {
    setBusy(true);
    try {
      await onAcknowledge(n.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)",
        background: "var(--surface-card)", overflow: "hidden",
      }}
    >
      <div style={{ width: 4, flexShrink: 0, background: style.color }} />
      <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{n.subject}</div>
          <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: style.color, background: style.tint, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
            {n.priority}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-tertiary)", marginBottom: 5, flexWrap: "wrap" }}>
          <span>{n.sender} · {new Date(n.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", padding: "1px 7px", borderRadius: 20,
            color: n.read ? "var(--text-tertiary)" : "var(--accent-primary)",
            background: n.read ? "var(--surface-sunken)" : "var(--accent-primary-tint)",
          }}>
            {n.read ? "Read" : "Unread"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: n.read ? 0 : 8 }}>{n.summary}</div>
        {!n.read && (
          <button
            onClick={handleAcknowledge}
            disabled={busy}
            style={{
              fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 20, cursor: busy ? "default" : "pointer",
              border: "1px solid var(--accent-primary)", background: "var(--accent-primary-tint)", color: "var(--accent-primary)",
            }}
          >
            {busy ? "Marking…" : "✓ Mark as read"}
          </button>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CalendarIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
