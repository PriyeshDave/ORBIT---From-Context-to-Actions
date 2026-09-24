/**
 * Simple, recognizable icon marks for the four connected tools. These are
 * original geometric renderings evocative of each product's brand color
 * and general shape (an envelope for mail, a chat bubble for messaging,
 * a hash mark for Slack, a stylized diamond for Jira) - not reproductions
 * of the actual trademarked logo artwork for Microsoft Outlook, Microsoft
 * Teams, Slack, or Atlassian Jira. Good enough to be instantly readable
 * in context (always paired with a text label) without copying anyone's
 * registered mark.
 */
const ICONS = {
  outlook: (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path d="M5 8.2 12 13l7-4.8V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8.2z" fill="#fff" />
      <path d="M5 8.2 12 13l7-4.8" stroke="#0A66C2" strokeWidth="0.6" fill="none" />
    </svg>
  ),
  teams: (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="5" fill="#5B5FC7" />
      <circle cx="9.5" cy="9" r="3" fill="#fff" />
      <path d="M4 18c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5" fill="#fff" />
      <circle cx="16.5" cy="8" r="2.2" fill="#fff" opacity="0.75" />
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="5" fill="#4A154B" />
      <rect x="9" y="4" width="2.4" height="7" rx="1.2" fill="#36C5F0" />
      <rect x="13" y="4" width="2.4" height="7" rx="1.2" fill="#2EB67D" />
      <rect x="9" y="13" width="2.4" height="7" rx="1.2" fill="#ECB22E" />
      <rect x="13" y="13" width="2.4" height="7" rx="1.2" fill="#E01E5A" />
    </svg>
  ),
  tracker: (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="5" fill="#0052CC" />
      <path d="M12 4 18 10 12 16 6 10z" fill="#fff" />
      <path d="M12 9 15 12 12 15 9 12z" fill="#2684FF" />
    </svg>
  ),
  confluence: (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="5" fill="#172B4D" />
      <path d="M4 16c3-6 6-8 9-8 2 0 4 1 7 4-3 1-6 1-9 1-3 0-5-1-7 3z" fill="#2684FF" />
      <path d="M20 8c-3 6-6 8-9 8-2 0-4-1-7-4 3-1 6-1 9-1 3 0 5 1 7-3z" fill="#2684FF" opacity="0.6" />
    </svg>
  ),
  servicenow: (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <rect width="24" height="24" rx="5" fill="#293E40" />
      <circle cx="12" cy="12" r="6.5" fill="#62D84E" />
      <circle cx="12" cy="12" r="2.6" fill="#293E40" />
    </svg>
  ),
};

const LABELS = {
  outlook: "Outlook", teams: "Teams", slack: "Slack", tracker: "Jira",
  confluence: "Confluence", servicenow: "ServiceNow",
};

export function ToolIcon({ tool, size = 20, style }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: size * 0.22, overflow: "hidden", ...style }}>
      {ICONS[tool] || null}
    </div>
  );
}

export function toolLabel(tool) {
  return LABELS[tool] || tool;
}
