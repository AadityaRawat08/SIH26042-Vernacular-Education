import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          Step {step} of {total}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">{Math.round((step / total) * 100)}%</p>
      </div>
      <div className="mt-2 flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i < step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>
      <h1 className="mt-4 font-display text-2xl leading-tight font-semibold sm:text-3xl">{label}</h1>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

export function ChipGroup({
  options,
  selected,
  onToggle,
  single = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-transparent bg-ink text-ink-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            {active && !single ? <Check className="size-3.5" /> : null}
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-5 py-10">
      <div className="surface-card p-5 sm:p-7">{children}</div>
    </div>
  );
}

export function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  backDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <button
        onClick={onBack}
        disabled={backDisabled}
        className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium disabled:opacity-40"
      >
        Back
      </button>
      <button
        onClick={onNext}
        className="flex-1 rounded-full bg-ink py-3 text-[15px] font-semibold text-ink-foreground"
      >
        {nextLabel}
      </button>
    </div>
  );
}
