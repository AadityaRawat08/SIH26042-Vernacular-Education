import { useEffect, useRef, useState } from "react";
import { Mic, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COPILOT_SUGGESTIONS,
  contextLabel,
  copilotReply,
  transcribeTeacherNote,
  type TeachingContext,
} from "@/lib/services/teaching-ai";

/**
 * Ask Tribhashniya — context-aware teaching assistant.
 * Demo mode: replies come from the simulated service. Swap `copilotReply`
 * for POST /ai/copilot to make it real; the context object is already the
 * payload a backend would need.
 */

interface Turn {
  role: "teacher" | "ai";
  text: string;
}

export function AICopilot({ context }: { context: TeachingContext }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"type" | "speak">("type");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [noteIndex, setNoteIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestions = COPILOT_SUGGESTIONS[context.surface] ?? COPILOT_SUGGESTIONS.home;

  useEffect(() => {
    if (open && mode === "type") inputRef.current?.focus();
  }, [open, mode]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setTurns((t) => [...t, { role: "teacher", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setTurns((t) => [...t, { role: "ai", text: copilotReply(q, context) }]);
      setThinking(false);
    }, 700);
  };

  const speak = () => {
    const spoken = transcribeTeacherNote(noteIndex);
    setNoteIndex((i) => i + 1);
    setInput(spoken);
    setMode("type");
  };

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-24 z-30 inline-flex items-center gap-2 rounded-full bg-violet-deep px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition-transform active:scale-95 lg:bottom-6"
        >
          <Sparkles className="size-4" /> Ask Tribhashniya
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex h-[85svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:h-[560px] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-border bg-tint-lavender px-5 py-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-display text-lg font-semibold text-violet-deep">
                  <Sparkles className="size-4" /> Ask Tribhashniya
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{contextLabel(context)}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!turns.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ask anything about your class. I already know where you are, so you don't need to repeat it.
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {turns.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                    t.role === "teacher"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-secondary text-foreground",
                  )}
                >
                  {t.text}
                </div>
              ))}
              {thinking ? <p className="text-sm text-muted-foreground">Thinking…</p> : null}
            </div>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex gap-1.5">
                {(["type", "speak"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => (m === "speak" ? (setMode("speak"), speak()) : setMode("type"))}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-medium",
                      mode === m ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {m === "type" ? "Type" : "Speak"}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  placeholder="Ask a question…"
                  className="min-h-12 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={speak}
                  aria-label="Speak your question"
                  className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-card"
                >
                  <Mic className="size-4" />
                </button>
                <button
                  onClick={() => ask(input)}
                  aria-label="Send question"
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-deep text-primary-foreground"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
