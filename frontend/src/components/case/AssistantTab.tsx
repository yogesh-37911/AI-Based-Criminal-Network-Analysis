"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Badges";

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: any[];
  label?: string;
  engine?: string;
  isError?: boolean;
};

const SUGGESTIONS = [
  "Summarize the evidence collected so far.",
  "Which IP addresses and domains appear in this case?",
  "List all suspects, victims, and their connections.",
  "Find any anomalies, malware, or unusual activity.",
  "What accounts, wallets, or transactions were involved?",
  "What forensic tools should I use to investigate this case?",
];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-2 w-2 rounded-full animate-bounce"
          style={{
            background: "#3FD0DC",
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.8s",
          }}
        />
      ))}
      <span className="text-[11px] font-mono text-cyan ml-1.5 animate-pulse">
        Analyzing forensic records…
      </span>
    </span>
  );
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-xs sm:text-sm font-mono leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Markdown headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-xs font-bold text-cyan mt-3 mb-1 uppercase tracking-wider">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-cyan mt-3 mb-1.5 uppercase tracking-wider border-b border-[#1E293B] pb-1">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={idx} className="text-base font-bold text-cyan mt-4 mb-2">
              {trimmed.slice(2)}
            </h2>
          );
        }

        // Bullet point
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.slice(2);
          const parts = text.split(/(\*\*[^*]+\*\*)/g);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-cyan font-bold">•</span>
              <div className="text-[#E2E8F0] flex-1">
                {parts.map((p, j) =>
                  p.startsWith("**") && p.endsWith("**") ? (
                    <strong key={j} className="text-cyan font-bold">
                      {p.slice(2, -2)}
                    </strong>
                  ) : (
                    p
                  )
                )}
              </div>
            </div>
          );
        }

        // Table row or standard text
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={idx} className={line === "" ? "h-2" : "text-[#E2E8F0]"}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**") ? (
                <strong key={j} className="text-cyan font-bold">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                p
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

function MessageBubble({ msg, onRetry }: { msg: Msg; onRetry?: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5`}>
      {!isUser && (
        <div
          className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-mono mt-1 shadow-md shadow-cyan/10"
          style={{
            background: "linear-gradient(135deg, #071322, #0A2638)",
            border: "1px solid rgba(63,208,220,0.4)",
            color: "#3FD0DC",
          }}
        >
          AI
        </div>
      )}

      <div className="max-w-[85%] space-y-2">
        <div
          className="rounded-2xl px-4 py-3 shadow-lg"
          style={
            isUser
              ? {
                  background: "rgba(63,208,220,0.14)",
                  border: "1px solid rgba(63,208,220,0.3)",
                  color: "#E8EBF0",
                  borderBottomRightRadius: 4,
                }
              : msg.isError
              ? {
                  background: "rgba(225,89,79,0.1)",
                  border: "1px solid rgba(225,89,79,0.3)",
                  color: "#E8EBF0",
                  borderBottomLeftRadius: 4,
                }
              : {
                  background: "rgba(10,16,26,0.92)",
                  border: "1px solid #1E293B",
                  color: "#E8EBF0",
                  borderBottomLeftRadius: 4,
                }
          }
        >
          <FormattedContent content={msg.content} />

          {msg.isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-danger/20 hover:bg-danger/30 text-danger text-xs font-mono border border-danger/40 transition-colors"
            >
              ⟲ Retry Question
            </button>
          )}
        </div>

        {/* Confidence badge + citations */}
        {msg.role === "assistant" && !msg.isError && (
          <div className="space-y-1.5 px-1">
            {msg.label && <ConfidenceBadge label={msg.label} />}
            {msg.citations && msg.citations.length > 0 && (
              <div className="space-y-1 mt-1">
                {msg.citations.slice(0, 3).map((c: any, j: number) => (
                  <div
                    key={j}
                    className="rounded-lg px-3 py-2 text-[10px] font-mono"
                    style={{
                      background: "rgba(63,208,220,0.04)",
                      border: "1px solid rgba(63,208,220,0.12)",
                      color: "#64748B",
                    }}
                  >
                    <span style={{ color: "#3FD0DC" }}>
                      Evidence {c.evidence_id ? String(c.evidence_id).slice(0, 8) : "—"}…
                    </span>{" "}
                    · {(c.relevance_score * 100).toFixed(0)}% relevant
                    <div className="mt-1 italic truncate text-[#94A3B8]">
                      "{c.excerpt?.slice(0, 110)}…"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-mono mt-1 bg-cyan/15 border border-cyan/30 text-cyan"
        >
          You
        </div>
      )}
    </div>
  );
}

export default function AssistantTab({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    const userMsg: Msg = { role: "user", content: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Build history from prior turns (exclude the message we just added)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const result = await api.post("/ai/query", {
        case_id: caseId,
        question: q,
        history,
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.answer,
          citations: result.citations,
          label: result.confidence_label,
          engine: result.engine,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Something went wrong: ${e.message ?? "Unknown error"}. Check that the backend is running.`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content;
  const activeEngine = [...messages].reverse().find((m) => m.role === "assistant")?.engine;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[#1A2235]"
      style={{
        height: 690,
        background: "radial-gradient(ellipse at 50% 20%, #07101E 0%, #04060A 100%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 shrink-0 bg-panel/70 backdrop-blur border-b hairline"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-2.5 w-2.5 rounded-full animate-pulse"
            style={{ background: "#3FD0DC", boxShadow: "0 0 10px #3FD0DC" }}
          />
          <span className="text-xs font-mono font-bold tracking-widest text-cyan">
            FORGE AI INVESTIGATION COPILOT
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan/10 border border-cyan/20 text-cyan"
          >
            {activeEngine || "Evidence-grounded"}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[10px] font-mono text-muted hover:text-danger px-2 py-1 rounded transition-colors"
          >
            ✕ Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-6">
            <div className="text-center">
              <div
                className="text-4xl mb-2"
                style={{ filter: "drop-shadow(0 0 20px rgba(63,208,220,0.5))" }}
              >
                🛡️
              </div>
              <p className="text-sm font-head font-bold text-text">
                SHERLOCK-X
              </p>
              <p className="text-xs font-mono text-muted mt-1 max-w-sm">
                Ask anything about this case — evidence synthesis, suspect networks, timeline analysis, or IOC correlation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs font-mono rounded-xl px-3.5 py-3 transition-all bg-panel2/60 border border-hairline hover:border-cyan/40 hover:bg-cyan/10 text-muted hover:text-cyan"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            msg={m}
            onRetry={m.isError && lastUserMsg ? () => send(lastUserMsg) : undefined}
          />
        ))}

        {loading && (
          <div className="flex justify-start gap-2.5">
            <div
              className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-mono mt-1"
              style={{
                background: "linear-gradient(135deg, #071322, #0A2638)",
                border: "1px solid rgba(63,208,220,0.4)",
                color: "#3FD0DC",
              }}
            >
              AI
            </div>
            <div
              className="rounded-2xl px-4 py-3 text-sm bg-panel/90 border hairline shadow-lg"
            >
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <div
        className="px-5 py-3.5 shrink-0 bg-panel/70 backdrop-blur border-t hairline"
      >
        <div
          className="flex items-end gap-2.5 rounded-xl p-2.5 bg-panel2/80 border hairline focus-within:border-cyan/50 transition-colors"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this investigation… (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-transparent resize-none outline-none text-xs sm:text-sm font-mono leading-relaxed text-text placeholder:text-muted"
            style={{
              minHeight: 36,
              maxHeight: 120,
              overflowY: "auto",
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 bg-cyan/20 border border-cyan/40 hover:bg-cyan/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FD0DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] font-mono mt-1.5 text-center text-muted">
          Case evidence is cited where available · Verify findings against original records
        </p>
      </div>
    </div>
  );
}
