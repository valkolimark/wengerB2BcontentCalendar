"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp, AlertCircle } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "When's the next email for Prop 28?",
  "What's the UTM for the Prop 28 secondary campaign?",
  "What Salesforce campaign does it report into?",
];

/**
 * Slide-in chat panel for the read-only assistant. Conversation lives here
 * (no server persistence); each send posts the prior turns + the new message to
 * /api/assistant and streams the answer back. Available to all authenticated
 * roles — external users simply get scrubbed answers (no write affordances
 * exist here).
 */
export function AssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!open) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const prior = messages;
    setMessages([...prior, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: prior, message: q }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = prev.slice();
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (e) {
      // Drop the empty assistant placeholder and surface the error.
      setMessages((prev) => prev.slice(0, -1));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-[rgba(20,18,14,.34)]"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-[440px] max-w-[94vw] flex-col bg-surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="AI assistant"
      >
        <div className="flex items-center justify-between border-b border-hair px-4 py-3.5">
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold">
            <Sparkles size={15} className="text-navy" />
            Assistant
            <span className="rounded-md bg-[var(--color-hover)] px-1.5 py-px text-[10.5px] font-medium text-muted2">
              read-only
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mt-2">
              <div className="text-[13px] text-ink-muted">
                Ask about your campaigns, UTMs, Salesforce codes, or what&apos;s
                coming up. I answer from your live tracker data and can&apos;t
                change anything yet.
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => send(ex)}
                    className="rounded-[10px] border border-line bg-[var(--color-surface-2)] px-3 py-2 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-[var(--color-hover)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <Bubble key={i} turn={m} busy={busy && i === messages.length - 1} />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#e7c9c2] bg-[#fbeee9] px-3 py-2 text-[12.5px] text-[#8a3b2b]">
              <AlertCircle size={14} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <form
          className="border-t border-hair p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-[12px] border border-line bg-[var(--color-surface-2)] px-3 py-2 focus-within:border-[#cfcbc0]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask a question…"
              className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition-colors hover:bg-navy-dark disabled:opacity-40"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

/** A single message. Lines that carry a UTM/code render in IBM Plex Mono. */
function Bubble({ turn, busy }: { turn: Turn; busy: boolean }) {
  const isUser = turn.role === "user";
  if (isUser) {
    return (
      <div className="self-end max-w-[85%] rounded-[12px] rounded-br-[4px] bg-selected px-3 py-2 text-[13px] text-ink">
        {turn.content}
      </div>
    );
  }
  return (
    <div className="self-start max-w-[92%] rounded-[12px] rounded-bl-[4px] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-ink-soft">
      {turn.content ? <RichText text={turn.content} /> : busy ? <Dots /> : null}
    </div>
  );
}

const isCodey = (line: string) =>
  /utm_|\?utm|https?:\/\//i.test(line);

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1 whitespace-pre-wrap break-words">
      {lines.map((ln, i) =>
        isCodey(ln) ? (
          <code key={i} className="font-mono text-[12px] text-ink">
            {ln}
          </code>
        ) : (
          <span key={i}>{ln}</span>
        )
      )}
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1 py-0.5" aria-label="Thinking">
      <span className="size-1.5 animate-bounce rounded-full bg-faint [animation-delay:-200ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-faint [animation-delay:-100ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-faint" />
    </span>
  );
}
