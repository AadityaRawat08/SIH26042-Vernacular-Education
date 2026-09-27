import { Check, Keyboard, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

/** The four language-bridge modes, used by home, teacher bridge and student response. */
export type TranslationMode = "voice-to-voice" | "voice-to-text" | "text-to-voice" | "text-to-text";

/** Each mode carries its own calm colour identity, related but distinguishable. */
export type ModeTone = "teal" | "sky" | "indigo" | "amber";

const TONE: Record<ModeTone, { activeCard: string; activeIcon: string; check: string; title: string }> = {
  teal: {
    activeCard: "border-teal-deep/50 bg-tint-teal",
    activeIcon: "bg-teal-deep text-primary-foreground",
    check: "bg-teal-deep text-primary-foreground",
    title: "text-teal-deep",
  },
  sky: {
    activeCard: "border-info/50 bg-tint-sky",
    activeIcon: "bg-info text-info-foreground",
    check: "bg-info text-info-foreground",
    title: "text-info",
  },
  indigo: {
    activeCard: "border-violet-deep/50 bg-tint-lavender",
    activeIcon: "bg-violet-deep text-primary-foreground",
    check: "bg-violet-deep text-primary-foreground",
    title: "text-violet-deep",
  },
  amber: {
    activeCard: "border-amber-deep/50 bg-tint-amber",
    activeIcon: "bg-amber-deep text-primary-foreground",
    check: "bg-amber-deep text-primary-foreground",
    title: "text-amber-deep",
  },
};

export const TRANSLATION_MODES: {
  id: TranslationMode;
  name: string;
  description: string;
  kind: "voice" | "text";
  tone: ModeTone;
}[] = [
  { id: "voice-to-voice", name: "Voice → Voice", description: "Speak and hear the translation", kind: "voice", tone: "teal" },
  { id: "voice-to-text", name: "Voice → Text", description: "Speak and read the translation", kind: "voice", tone: "sky" },
  { id: "text-to-voice", name: "Text → Voice", description: "Type and hear the translation", kind: "text", tone: "indigo" },
  { id: "text-to-text", name: "Text → Text", description: "Type and read the translation", kind: "text", tone: "amber" },
];

export function ModeCard({
  name,
  description,
  kind,
  tone,
  active,
  onClick,
}: {
  name: string;
  description: string;
  kind: "voice" | "text";
  tone: ModeTone;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = kind === "voice" ? Mic : Keyboard;
  const t = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex min-h-[112px] flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all duration-200 sm:p-4",
        active
          ? cn("border-2 shadow-[var(--shadow-card)]", t.activeCard)
          : "border-border bg-card hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        "active:translate-y-0 active:scale-[0.99]",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl transition-colors",
          active ? t.activeIcon : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className={cn("font-display text-sm leading-tight font-semibold sm:text-base", active && t.title)}>
        {name}
      </span>
      <span className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{description}</span>
      {active ? (
        <span className={cn("absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full", t.check)}>
          <Check className="size-3.5" />
        </span>
      ) : null}
    </button>
  );
}

export function TranslationModeSelector({
  value,
  onChange,
  idPrefix,
}: {
  value: TranslationMode;
  onChange: (mode: TranslationMode) => void;
  idPrefix?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Translation mode"
      data-selector={idPrefix}
      className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
    >
      {TRANSLATION_MODES.map((m) => (
        <ModeCard
          key={m.id}
          name={m.name}
          description={m.description}
          kind={m.kind}
          tone={m.tone}
          active={value === m.id}
          onClick={() => onChange(m.id)}
        />
      ))}
    </div>
  );
}
