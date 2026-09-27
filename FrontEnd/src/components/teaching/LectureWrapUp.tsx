import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Mic, Sparkles, X } from "lucide-react";
import type { LectureSummary } from "@/lib/services/teaching-ai";
import { transcribeTeacherNote } from "@/lib/services/teaching-ai";

/**
 * End of class: automatic lecture summary + a very small teacher feedback
 * panel. The saved summary is what Previous Lectures shows later.
 */

const IMPROVE_OPTIONS = [
  "Too difficult",
  "Too long",
  "Needed more examples",
  "Language needed improvement",
  "Activity worked well",
];

export function LectureWrapUp({
  summary,
  onSave,
  onClose,
}: {
  summary: LectureSummary;
  onSave: (feedback: { rating: string; tags: string[]; comment: string }) => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-tint-mint px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Class finished</p>
            <h2 className="font-display text-xl font-semibold">Lecture summary</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full border border-border bg-card">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
          <div className="surface-card p-4">
            <p className="font-display text-lg font-semibold">{summary.topic}</p>
            <p className="text-sm text-muted-foreground">
              {summary.classLabel} · {summary.subject} · {summary.durationMin} minutes
            </p>
          </div>

          <Block label="What was taught">{summary.taught}</Block>
          <Block label="Activities completed">
            <ul className="space-y-1">{summary.activities.map((a) => <li key={a}>• {a}</li>)}</ul>
          </Block>
          <Block label="Assessment result">{summary.assessment}</Block>
          <Block label="Attendance">{summary.attendance}</Block>
          <Block label="Student participation">{summary.participation}</Block>
          <Block label="Language support used">{summary.languageSupport}</Block>
          <Block label="Teacher notes">
            {summary.notes.length ? (
              <ul className="space-y-1">{summary.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
            ) : (
              <span className="text-muted-foreground">No notes recorded.</span>
            )}
          </Block>
          <Block label="Students needing attention">
            {summary.needAttention.length ? summary.needAttention.join(", ") : "None flagged this period."}
          </Block>

          <div className="ai-surface p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-deep">
              <Sparkles className="size-3.5" /> AI next step
            </p>
            <p className="mt-1.5 text-sm">{summary.nextStep}</p>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="font-display text-base font-semibold">Was this lesson useful?</p>
            <div className="mt-2 flex gap-2">
              {["👍 Yes", "😐 Partly", "👎 No"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={cn(
                    "flex-1 rounded-2xl px-3 py-3 text-sm font-medium",
                    rating === r ? "bg-ink text-ink-foreground" : "border border-border bg-card",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground">What should improve?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {IMPROVE_OPTIONS.map((o) => {
                const on = tags.includes(o);
                return (
                  <button
                    key={o}
                    onClick={() => setTags((s) => (on ? s.filter((x) => x !== o) : [...s, o]))}
                    className={cn("rounded-full px-3.5 py-2 text-xs font-medium", on ? "bg-primary text-primary-foreground" : "border border-border bg-card")}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setComment(transcribeTeacherNote(1))}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium"
            >
              <Mic className="size-3.5" /> Add comment
            </button>
            {comment ? <p className="mt-2 rounded-xl bg-secondary p-3 text-sm">{comment}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
          <button
            onClick={() => {
              onSave({ rating, tags, comment });
              toast.success("Lecture saved to Previous Lectures");
            }}
            className="col-span-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
          >
            Save lecture
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
