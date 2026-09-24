import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import TopHeader from "./TopHeader.jsx";

export function Avatar({ name, color, size = 32, avatarUrl }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = avatarUrl && !imgFailed;

  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 600, fontSize: size * 0.38, flexShrink: 0, overflow: "hidden",
      }}
      title={name}
    >
      {showImage ? (
        <img
          src={avatarUrl} alt={name} width={size} height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  catchup: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-3-6.2" />
      <path d="M21 4v5h-5" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14l2 2 4-4" />
    </svg>
  ),
  readiness: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  assistant: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="12" rx="2" />
      <path d="M8 20l4-3 4 3" />
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  flow: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="2.4" />
      <circle cx="19" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M7 7l3 8M17 7l-3 8" />
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  ),
};

function NavIcon({ label, icon, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={onClick}
        style={{
          width: 44, height: 44, borderRadius: "var(--radius-md)",
          border: "none",
          background: active ? "var(--accent-primary-tint)" : "transparent",
          color: active ? "var(--accent-primary)" : "var(--text-secondary)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {ICONS[icon]}
      </button>
      {hovered && (
        <div
          style={{
            position: "absolute", left: "100%", top: "50%", transform: "translateY(-50%)",
            marginLeft: 8, background: "var(--text-primary)", color: "#fff",
            fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap", zIndex: 50, pointerEvents: "none",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const path = location.pathname;
  const inCatchupMeeting = path.startsWith("/catchup/meeting/");
  const onCatchupSystemFlow = path.endsWith("/system-flow") && inCatchupMeeting;
  const inPlanner = path.startsWith("/planner");
  const onPlannerSystemFlow = path === "/planner/system-flow";
  const inReadiness = path.startsWith("/readiness");
  const onReadinessFlow = path === "/readiness/flow";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Amex-blue accent strip */}
      <div style={{ height: 3, flexShrink: 0, background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))" }} />

      <TopHeader dense />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left nav rail */}
        <div
          style={{
            width: "var(--nav-width)", flexShrink: 0, borderRight: "1px solid var(--border-accent)",
            background: "var(--accent-primary-tint)",
            display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 8,
          }}
        >
          <NavIcon label="Home" icon="home" active={path === "/"} onClick={() => navigate("/")} />
          <NavIcon label="Catch Up" icon="catchup" active={path.startsWith("/catchup")} onClick={() => navigate("/catchup")} />
          <NavIcon label="Daily Plan" icon="plan" active={inPlanner} onClick={() => navigate("/planner")} />
          <NavIcon label="Readiness" icon="readiness" active={inReadiness} onClick={() => navigate("/readiness")} />
          {session?.hasSreDashboard && (
            <NavIcon label="Incidents" icon="pulse" active={path === "/sre"} onClick={() => navigate("/sre")} />
          )}

          {inCatchupMeeting && (
            <>
              <div style={{ height: 1, width: 28, background: "var(--border-strong)", margin: "4px 0" }} />
              <NavIcon label="Assistant" icon="assistant" active={!onCatchupSystemFlow} onClick={() => navigate(`/catchup/meeting/${params.meetingId}`)} />
              <NavIcon label="System Flow" icon="flow" active={onCatchupSystemFlow} onClick={() => navigate(`/catchup/meeting/${params.meetingId}/system-flow`)} />
            </>
          )}

          {inPlanner && (
            <>
              <div style={{ height: 1, width: 28, background: "var(--border-strong)", margin: "4px 0" }} />
              <NavIcon label="System Flow" icon="flow" active={onPlannerSystemFlow} onClick={() => navigate("/planner/system-flow")} />
            </>
          )}

          {inReadiness && (
            <>
              <div style={{ height: 1, width: 28, background: "var(--border-strong)", margin: "4px 0" }} />
              <NavIcon label="Flow" icon="flow" active={onReadinessFlow} onClick={() => navigate("/readiness/flow")} />
            </>
          )}

          <div style={{ flex: 1 }} />

          {session && (
            <div onClick={logout} title={`${session.name} - sign out`} style={{ cursor: "pointer" }}>
              <Avatar name={session.name} color={session.avatarColor} avatarUrl={`/avatars/${session.personaId}.jpg`} />
            </div>
          )}
        </div>

        {/* Main column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
