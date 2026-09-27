import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-1 text-3xl leading-tight font-semibold text-balance sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-prose text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="font-mono text-[11px] tracking-[0.2em] text-primary-deep uppercase">{children}</span>
      <span className="h-px flex-1 bg-border" />
      {meta ? <span className="font-mono text-[11px] text-muted-foreground">{meta}</span> : null}
    </div>
  );
}

export function Surface({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return <As className={cn("surface-card p-4 sm:p-5", className)}>{children}</As>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning" | "info";
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary-deep",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  }[tone];
  return (
    <div className="surface-card p-4">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 font-display text-3xl leading-none font-semibold", toneClass)}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function MetricBar({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "warning" | "info";
}) {
  const bar = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
  }[tone];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", bar)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "success" | "warning" | "info" | "ink";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary-deep",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/12 text-info",
    ink: "bg-ink text-ink-foreground",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium",
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AiBadge({ label = "AI generated" }: { label?: string }) {
  return (
    <Pill tone="primary">
      <Sparkles className="size-3" /> {label}
    </Pill>
  );
}

export function AiCallout({
  title,
  body,
  actionLabel,
  to,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-ink-foreground shadow-[var(--shadow-lift)]">
      <div className="p-5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-primary uppercase">
          <Sparkles className="size-3.5" /> AI recommendation
        </span>
        <h3 className="mt-2.5 font-display text-xl leading-snug font-medium text-pretty">{title}</h3>
        <p className="mt-2 text-sm text-ink-foreground/70">{body}</p>
        {actionLabel ? (
          to ? (
            <Link
              to={to}
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-card p-8 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function PrototypeNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
