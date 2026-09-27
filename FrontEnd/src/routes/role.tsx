import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, GraduationCap, HeartHandshake, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/app-state";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/role")({
  head: () => ({
    meta: [
      { title: "Choose your role — Tribhashniya" },
      { name: "description", content: "Use Tribhashniya as a teacher, an institute or a parent." },
      { property: "og:title", content: "Choose your role — Tribhashniya" },
      { property: "og:description", content: "Teacher, institute or parent — pick how you will use the app." },
    ],
  }),
  component: RolePage,
});

const ROLES: {
  key: Role;
  title: string;
  body: string;
  icon: typeof GraduationCap;
  to: "/onboarding/teacher" | "/onboarding/institute" | "/onboarding/parent";
  primary?: boolean;
}[] = [
  {
    key: "teacher",
    title: "Teacher",
    body: "Teach, plan lessons and track classroom learning",
    icon: GraduationCap,
    to: "/onboarding/teacher",
    primary: true,
  },
  {
    key: "institute",
    title: "Institute",
    body: "Manage teachers, students, classes and performance",
    icon: Building2,
    to: "/onboarding/institute",
  },
  {
    key: "parent",
    title: "Parent",
    body: "Monitor your child's learning and progress",
    icon: HeartHandshake,
    to: "/onboarding/parent",
  },
];

function RolePage() {
  const { set } = useApp();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12">
      <p className="eyebrow">Step 1</p>
      <h1 className="mt-1 font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">
        How will you use Tribhashniya?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">You can change this later in settings.</p>

      <div className="mt-7 space-y-3">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => {
              set({ role: r.key });
              navigate({ to: r.to });
            }}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-shadow hover:shadow-[var(--shadow-lift)]",
              r.primary
                ? "border-transparent bg-ink text-ink-foreground"
                : "border-border bg-card shadow-[var(--shadow-card)]",
            )}
          >
            <span
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-xl",
                r.primary ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              <r.icon className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-display text-xl font-semibold">{r.title}</span>
                {r.primary ? (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] tracking-wider text-primary uppercase">
                    Primary
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-1 block text-sm",
                  r.primary ? "text-ink-foreground/70" : "text-muted-foreground",
                )}
              >
                {r.body}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
}
