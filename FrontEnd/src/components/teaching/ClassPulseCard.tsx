import { useState } from "react";
import { cn } from "@/lib/utils";
import { classPulse } from "@/lib/services/teaching-ai";
import { ChevronDown } from "lucide-react";

/** Class Learning Pulse — a teaching-support indicator, not a diagnosis. */
export function ClassPulseCard({
  average,
  languageSupport,
  practice,
  className,
}: {
  average: number;
  languageSupport: number;
  practice: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pulse = classPulse(average, languageSupport, practice);
  const tone = {
    "on-track": "border-success/25 bg-tint-mint text-success",
    reinforce: "border-amber-deep/25 bg-tint-amber text-amber-deep",
    support: "border-coral-deep/25 bg-tint-coral text-coral-deep",
  }[pulse.level];
  const dot = { "on-track": "bg-success", reinforce: "bg-amber-deep", support: "bg-coral-deep" }[pulse.level];

  return (
    <div className={cn("rounded-2xl border p-4", tone, className)}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Class pulse</span>
          <span className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
            <span className={cn("size-2.5 rounded-full", dot)} /> {pulse.label}
          </span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul className="mt-3 space-y-1.5 text-sm text-foreground">
          {pulse.points.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
