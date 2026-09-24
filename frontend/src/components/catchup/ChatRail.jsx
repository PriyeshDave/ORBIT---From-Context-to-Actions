import { useState, useRef, useEffect } from "react";
import { api } from "../../api/client";
import { useSession } from "../../context/SessionContext.jsx";
import { formatChatText } from "../../utils/formatChatText.jsx";

const SUGGESTIONS = [
  "What are the key decisions from this meeting?",
  "What are the action items from this meeting?",
  "Updates on the E3 deployment?",
];

export default function ChatRail({ meetingId }) {
  const { session } = useSession();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I've read this meeting. Ask me anything about the decisions, actions, or risks discussed.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text) {
    if (!text.trim() || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.catchup.chat(meetingId, text, session.sessionToken);
      setMessages((m) => [...m, { role: "assistant", text: res.reply, telemetry: res.telemetry }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Sorry, something went wrong: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        width: "var(--chat-rail-width)",
        borderLeft: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        background: "var(--surface-subtle)",
      }}
    >
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border-default)" }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Ask about this meeting</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Answers are grounded in this meeting only</div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? "var(--accent-primary)" : "var(--surface-card)",
              color: m.role === "user" ? "#fff" : "var(--text-primary)",
              border: m.role === "user" ? "none" : "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {formatChatText(m.text)}
            {m.telemetry && (
              <div style={{ marginTop: 6, fontSize: 10.5, opacity: 0.65 }}>
                {m.telemetry.latency_ms}ms · {m.telemetry.total_tokens} tokens · $
                {m.telemetry.cost_usd.toFixed(5)}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              fontSize: 13,
              color: "var(--text-tertiary)",
              padding: "10px 12px",
            }}
          >
            Thinking…
          </div>
        )}
      </div>

      <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            style={{
              fontSize: 11.5,
              border: "1px solid var(--border-default)",
              background: "var(--surface-card)",
              borderRadius: 14,
              padding: "4px 9px",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: 8, padding: "10px 16px 16px" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          style={{
            flex: 1,
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "9px 12px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            background: "var(--accent-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
