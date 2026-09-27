import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSavedPlan, setPlanStatus } from "@/lib/plans.functions";
import type { PeriodPlan } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiBadge, PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { languageLabel } from "@/lib/services/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown, Download, Edit3, Headphones, Play, Printer, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/teacher/planner/plan")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search['id'] === "string" ? (search['id'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Generated teaching plan — Tribhashniya" },
      { name: "description", content: "The complete AI-generated period plan: script, timeline, vocabulary, activity, blackboard plan and assessment." },
      { property: "og:title", content: "Generated teaching plan — Tribhashniya" },
      { property: "og:description", content: "A complete, ready-to-teach period plan with mother-tongue support." },
    ],
  }),
  component: PlanPage,
});

function Block({ num, title, children }: { num: number; title: string; children: ReactNode }) {
  return (
    <Surface>
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs font-medium">
          {num}
        </span>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </Surface>
  );
}

function PlanPage() {
  const { plan: localPlan, savePlan, approvePlan } = useApp();
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const updateStatus = useServerFn(setPlanStatus);

  // A saved plan (from the database) wins; otherwise show the last generated one.
  const { data: saved } = useQuery({
    queryKey: ["saved-plan", id],
    queryFn: () => getSavedPlan({ data: { id: id as string } }),
    enabled: Boolean(id),
  });
  const plan = ((saved?.plan as PeriodPlan | undefined) ?? localPlan) as PeriodPlan | null;
  const approvedInDb = saved?.status === "approved" || saved?.status === "taught";
  const [lang, setLang] = useState<"hi" | "sat" | "en">("sat");
  const [showWhy, setShowWhy] = useState(false);

  if (!plan) {
    return (
      <AppLayout role="teacher">
        <PageHeader title="No plan generated yet" subtitle="Create a teaching plan first — it only takes a minute." />
        <Link
          to="/teacher/planner"
          className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ink-foreground"
        >
          Open the AI Period Planner
        </Link>
      </AppLayout>
    );
  }

  const { request: r } = plan;
  const isApproved = plan.approved || approvedInDb;
  const script = plan.scriptTranslations[lang] ?? plan.script;

  return (
    <AppLayout role="teacher">
      <div className="space-y-4">
        <div className="rounded-2xl bg-ink p-5 text-ink-foreground">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">
                {r.className} · Section {r.section} · {r.subject}
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                Topic: {r.topic} — {r.durationMin} minutes
              </h1>
              <p className="mt-1.5 text-sm text-ink-foreground/70">
                Language: {languageLabel(r.language)} support
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <AiBadge label="AI generated" />
              <Pill tone={isApproved ? "success" : "muted"}>{isApproved ? "Teacher approved" : "Pending approval"}</Pill>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowWhy((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-medium"
        >
          Why did AI recommend this plan?
          <ChevronDown className={cn("size-4 transition-transform", showWhy && "rotate-180")} />
        </button>
        {showWhy ? (
          <Surface>
            <SectionTitle>Why this was recommended</SectionTitle>
            <ul className="space-y-2 text-sm">
              {plan.rationale.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {x}
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}

        <Block num={1} title="Learning objective">
          <ul className="space-y-1.5 text-sm">
            {plan.objective.map((o) => (
              <li key={o} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                {o}
              </li>
            ))}
          </ul>
        </Block>

        <Block num={2} title="What to teach">
          <p className="text-sm leading-relaxed">{plan.whatToTeach}</p>
        </Block>

        <Block num={3} title="Teaching timeline">
          <ol className="space-y-0">
            {plan.timeline.map((t, i) => (
              <li key={t.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn("mt-1 size-3 rounded-full", i < 2 ? "bg-success" : "bg-primary")} />
                  {i < plan.timeline.length - 1 ? <span className="my-0.5 w-px flex-1 bg-border" /> : null}
                </div>
                <div className="pb-4">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {t.from}–{t.to} min
                  </p>
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-sm text-muted-foreground">{t.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        <Block num={4} title="Teacher script">
          <div className="flex flex-wrap gap-1.5">
            {(["hi", "sat", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  lang === l ? "bg-ink text-ink-foreground" : "bg-secondary text-secondary-foreground",
                )}
              >
                {languageLabel(l)}
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-secondary/70 p-4 font-display text-base leading-relaxed">{script}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => toast.info("Read-aloud view opened (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">Read</button>
            <button onClick={() => toast.success("Playing audio (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">
              <Headphones className="mr-1 inline size-3.5" /> Listen
            </button>
            <button onClick={() => toast.info("Script editor opened (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">
              <Edit3 className="mr-1 inline size-3.5" /> Edit
            </button>
          </div>
        </Block>

        <Block num={5} title="Simple explanation">
          <p className="text-sm leading-relaxed">{plan.explanation}</p>
        </Block>

        <Block num={6} title="Vocabulary">
          <div className="divide-y divide-border/70">
            {plan.vocabulary.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold">
                    {v.en} · <span className="font-normal">{v.hi}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.sat} · <span className="font-mono">{v.pronunciation}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={v.verified ? "success" : "warning"}>{v.verified ? "Verified" : "Unverified"}</Pill>
                  <button onClick={() => toast.success(`Playing "${v.sat}" (simulated)`)} className="grid size-8 place-items-center rounded-full bg-secondary" aria-label={`Play ${v.en}`}>
                    <Play className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Block>

        <div className="grid gap-4 lg:grid-cols-2">
          <Block num={7} title="Local examples">
            <ul className="space-y-1.5 text-sm">
              {plan.localExamples.map((e) => (
                <li key={e} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {e}
                </li>
              ))}
            </ul>
          </Block>

          <Block num={8} title="Classroom activity">
            <p className="text-sm font-medium">{plan.activity.objective}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Materials: {plan.activity.materials.join(", ")} · {plan.activity.timeMin} min
            </p>
            <ol className="mt-3 space-y-2 text-sm">
              {plan.activity.steps.map((s, i) => (
                <li key={s} className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[10px]">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
              Expected outcome: {plan.activity.outcome}
            </p>
          </Block>
        </div>

        <Block num={9} title="Video recommendations">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {plan.videos.map((v) => (
              <div key={v.id} className="rounded-xl bg-secondary/60 p-3">
                <div className="flex h-20 items-center justify-center rounded-lg bg-ink text-ink-foreground">
                  <Play className="size-6" />
                </div>
                <p className="mt-2 text-sm font-semibold">{v.title}</p>
                <p className="text-xs text-muted-foreground">
                  {v.durationMin} min · {v.language} · relevance {v.relevance}%
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground uppercase">Demo video</p>
              </div>
            ))}
          </div>
        </Block>

        <div className="grid gap-4 lg:grid-cols-2">
          <Block num={10} title="Visual material">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {plan.visuals.map((v) => (
                <div key={v.title} className="rounded-xl border border-dashed border-border p-3">
                  <div className="flex h-16 items-center justify-center rounded-lg bg-secondary font-mono text-[10px] text-muted-foreground uppercase">
                    Illustration
                  </div>
                  <p className="mt-2 text-sm font-semibold">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.caption}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block num={11} title="Blackboard plan">
            <div className="rounded-xl bg-ink p-4 font-mono text-sm text-ink-foreground">
              {plan.blackboard.map((line) => (
                <p key={line} className="border-b border-ink-foreground/10 py-1.5 last:border-0">
                  {line}
                </p>
              ))}
            </div>
          </Block>
        </div>

        <Block num={12} title="Questions">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Easy", plan.questions.easy, "success"],
                ["Medium", plan.questions.medium, "primary"],
                ["Challenge", plan.questions.challenge, "warning"],
              ] as const
            ).map(([label, qs, tone]) => (
              <div key={label} className="rounded-xl bg-secondary/60 p-3">
                <Pill tone={tone}>{label}</Pill>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {qs.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Block>

        <Block num={13} title="Worksheet">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-display text-base font-semibold">{plan.worksheet.title}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {plan.worksheet.items.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => toast.success("Worksheet regenerated (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">Generate</button>
            <button onClick={() => toast.info("Worksheet editor (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">Edit</button>
            <button onClick={() => toast.success("Sent to print queue (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">
              <Printer className="mr-1 inline size-3.5" /> Print
            </button>
            <button onClick={() => toast.success("Downloaded for offline use (simulated)")} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">
              <Download className="mr-1 inline size-3.5" /> Download
            </button>
          </div>
        </Block>

        <div className="grid gap-4 lg:grid-cols-2">
          <Block num={14} title="Assessment">
            <p className="text-sm font-medium">{plan.assessment.title}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {plan.assessment.items.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </Block>
          <Block num={15} title="Homework">
            <ul className="space-y-1.5 text-sm">
              {plan.homework.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          </Block>
          <Block num={16} title="Remedial activity">
            <ul className="space-y-1.5 text-sm">
              {plan.remedial.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </Block>
          <Block num={17} title="Advanced activity">
            <ul className="space-y-1.5 text-sm">
              {plan.advanced.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </Block>
        </div>

        <Block num={18} title="Teacher notes">
          <ul className="space-y-1.5 text-sm">
            {plan.teacherNotes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        </Block>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <button
            onClick={() => navigate({ to: "/teacher/planner" })}
            className="rounded-full border border-border bg-card py-3 text-sm font-medium"
          >
            Edit plan
          </button>
          <button
            onClick={() => {
              savePlan({ ...plan, id: `plan-${Date.now()}` });
              toast.success("Plan regenerated (simulated)");
            }}
            className="rounded-full border border-border bg-card py-3 text-sm font-medium"
          >
            <RefreshCw className="mr-1 inline size-4" /> Regenerate
          </button>
          <button
            onClick={() => {
              savePlan(plan);
              if (id) void updateStatus({ data: { id, status: "generated" } });
              toast.success("Plan saved");
            }}
            className="rounded-full border border-border bg-card py-3 text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={() => {
              approvePlan();
              if (id) void updateStatus({ data: { id, status: "approved" } });
              toast.success("Plan approved — starting live lecture");
              navigate({ to: "/teacher/live" });
            }}
            className="rounded-full bg-ink py-3 text-sm font-semibold text-ink-foreground"
          >
            Approve & start class
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
