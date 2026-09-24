export const PIPELINE_STEPS = [
  { key: "security_check", label: "Check access", color: "#605e5c", short: "Security" },
  { key: "read_notes", label: "Read notes", color: "var(--step-read-notes)", short: "Notes" },
  { key: "extract_decisions", label: "Extract decisions", color: "var(--step-decisions)", short: "Decisions" },
  { key: "find_actions", label: "Find actions", color: "var(--step-actions)", short: "Actions" },
  { key: "identify_risks", label: "Identify risks", color: "var(--step-risks)", short: "Risks" },
  { key: "prioritise_focus", label: "Prioritise focus", color: "var(--step-priorities)", short: "Priorities" },
  { key: "draft_followup", label: "Draft follow-up", color: "var(--step-followup)", short: "Follow-up" },
];

export const CONTENT_STEPS = PIPELINE_STEPS.filter((s) => s.key !== "security_check");
