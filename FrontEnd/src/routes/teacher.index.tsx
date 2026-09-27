import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { ClassPulseCard } from "@/components/teaching/ClassPulseCard";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getTeacherHome } from "@/lib/teaching.functions";
import { ArrowRight, BarChart3, ClipboardCheck, Globe, Languages, Plus, Radio, Sparkles } from "lucide-react";

export const Route = createFileRoute("/teacher/")({
  head: () => ({
    meta: [
      { title: "Today's teaching — Tribhashniya" },
      {
        name: "description",
        content: "See today's class, prepare the lesson, start class and check learning — all from one calm home screen.",
      },
      { property: "og:title", content: "Today's teaching — Tribhashniya" },
      { property: "og:description", content: "Open. See today's class. Teach. Translate. Check. Improve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherDashboard,
});

const QUICK_ACTIONS = [
  {
    to: "/teacher/planner",
    label: "Prepare lesson",
    hint: "AI lesson plan",
    icon: Sparkles,
    tint: "border-violet-deep/20 bg-tint-lavender",
    icons: "bg-violet-deep/15 text-violet-deep",
  },
  {
    to: "/teacher/live",
    label: "Start class",
    hint: "Teach live",
    icon: Radio,
    tint: "border-coral-deep/20 bg-tint-coral",
    icons: "bg-coral-deep/15 text-coral-deep",
  },
  {
    to: "/teacher/translate",
    label: "Translate",
    hint: "Speech or text",
    icon: Globe,
    tint: "border-teal-deep/20 bg-tint-teal",
    icons: "bg-teal-deep/15 text-teal-deep",
  },
  {
    to: "/teacher/assessments",
    label: "Check learning",
    hint: "Quick test",
    icon: ClipboardCheck,
    tint: "border-amber-deep/20 bg-tint-amber",
    icons: "bg-amber-deep/15 text-amber-deep",
  },
  {
    to: "/teacher/progress",
    label: "Student progress",
    hint: "Who needs help",
    icon: BarChart3,
    tint: "border-info/20 bg-tint-sky",
    icons: "bg-info/15 text-info",
  },
] as const;

/** Same pastel order as the classrooms page, so a class looks the same everywhere. */
const HOME_CLASS_TINTS = [
  "border-info/20 bg-tint-sky",
  "border-success/20 bg-tint-mint",
  "border-violet-deep/20 bg-tint-lavender",
  "border-amber-deep/20 bg-tint-sand",
  "border-teal-deep/20 bg-tint-teal",
  "border-coral-deep/20 bg-tint-coral",
] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function TeacherDashboard() {
  const { session } = useAuth();
  const [offline, setOffline] = useState<"idle" | "downloading" | "ready">("idle");
  const fetchHome = useServerFn(getTeacherHome);
  const query = useQuery({ queryKey: ["teacher-home"], queryFn: () => fetchHome(), enabled: Boolean(session) });
  const home = query.data;
  const classrooms = home?.classrooms ?? [];
  const todays = home?.todays ?? [];
  const previous = home?.previous ?? [];
  const firstName = (home?.teacherName ?? "Teacher").split(" ")[0];
  const nextLesson = home?.nextLesson ?? null;
  const rec = home?.recommendation ?? null;
  const attention = home?.attentionCount ?? 0;
  const nextRoom = classrooms.find((c) => c.id === nextLesson?.classroomId);

  return (
    <AppLayout role="teacher">
      <div className="space-y-7">
        {/* GREETING */}
        <div className="rounded-3xl border border-border bg-tint-sand px-5 py-5 sm:px-6">
          <h1 className="font-display text-2xl leading-tight font-semibold sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Ready for today's classes?</p>
        </div>

        {/* TODAY'S CLASS — the hero card */}
        <section className="relative overflow-hidden rounded-3xl p-6 text-ink-foreground shadow-[var(--shadow-lift)] [background-image:var(--gradient-ink)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-14 size-56 rounded-full bg-primary/25 blur-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-20 size-44 rounded-full border border-ink-foreground/15"
          />
          <div className="relative">
            <p className="text-xs font-semibold tracking-wide opacity-75">Today's class</p>
            {query.isLoading ? (
              <p className="mt-4 text-base opacity-80">Loading your day…</p>
            ) : nextLesson ? (
              <>
                <p className="mt-3 font-display text-3xl font-semibold">{nextLesson.classLabel}</p>
                <p className="mt-1 text-base opacity-90">{nextLesson.subject}</p>
                <p className="mt-3 font-display text-xl font-semibold">{nextLesson.topic}</p>
                <p className="mt-1 text-sm opacity-80">
                  {formatTime(nextLesson.scheduledAt)} · {nextLesson.durationMin} minutes
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-foreground/15 px-3 py-1 text-xs font-medium">
                  <Sparkles className="size-3.5" /> AI lesson ready
                </p>
                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Link
                    to="/teacher/live"
                    className="flex-1 rounded-2xl bg-primary px-5 py-4 text-center text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.99]"
                  >
                    Start class
                  </Link>
                  <Link
                    to="/teacher/classrooms/$classroomId"
                    params={{ classroomId: nextLesson.classroomId }}
                    className="flex-1 rounded-2xl border border-ink-foreground/30 px-5 py-4 text-center text-base font-semibold transition-colors hover:bg-ink-foreground/10"
                  >
                    View lesson
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-2xl font-semibold">No class scheduled today</p>
                <p className="mt-1 text-sm opacity-80">You're all caught up. Prepare a lesson and it will appear here.</p>
                <Link
                  to="/teacher/planner"
                  className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.99]"
                >
                  Prepare a lesson
                </Link>
              </>
            )}
            {nextRoom ? <p className="mt-4 text-xs opacity-70">{nextRoom.studentCount} students in this class</p> : null}
          </div>
        </section>

        {/* TODAY'S PLAN — every class, in order */}
        <section>
          <SectionTitle meta={`${todays.length || classrooms.length} classes`}>Today's plan</SectionTitle>
          <div className="space-y-2.5">
            {(todays.length ? todays : []).map((l) => {
              const room = classrooms.find((c) => c.id === l.classroomId);
              const needsSupport = (room?.understanding ?? 100) < 60;
              return (
                <Link
                  key={l.id}
                  to="/teacher/classrooms/$classroomId"
                  params={{ classroomId: l.classroomId }}
                  className="card-lift flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="w-14 shrink-0 font-mono text-sm font-semibold text-primary-deep">
                    {formatTime(l.scheduledAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">
                      {l.classLabel} · {l.subject}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">{l.topic}</span>
                    <span className="mt-1.5 block">
                      {l.status === "completed" ? (
                        <Pill tone="success">Done</Pill>
                      ) : needsSupport ? (
                        <Pill tone="warning">Some students need language support</Pill>
                      ) : (
                        <Pill tone="success">Lesson ready</Pill>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{l.durationMin} min</span>
                </Link>
              );
            })}
            {!query.isLoading && !todays.length ? (
              <p className="surface-card p-5 text-sm text-muted-foreground">
                No classes scheduled today. Prepare a lesson and it will appear here in order.
              </p>
            ) : null}
          </div>
        </section>

        {/* CLASS PULSE + OFFLINE TODAY */}
        <section className="grid gap-3 sm:grid-cols-2">
          <ClassPulseCard
            average={
              classrooms.length
                ? Math.round(classrooms.reduce((s, c) => s + (c.understanding ?? 0), 0) / classrooms.length)
                : 0
            }
            languageSupport={attention}
            practice={Math.max(0, attention - 1)}
          />
          <div className="rounded-2xl border border-border bg-tint-sand p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Today's class</p>
            <p className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
              <span className={cn("size-2.5 rounded-full", offline === "ready" ? "bg-success" : "bg-border")} />
              {offline === "ready" ? "Available offline" : offline === "downloading" ? "Downloading…" : "Not downloaded yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Lesson plan, audio, saved translations, worksheets, activities, assessment and blackboard plan.
            </p>
            <button
              onClick={() => {
                if (offline === "ready") return;
                setOffline("downloading");
                setTimeout(() => setOffline("ready"), 1600);
              }}
              className="mt-3 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-ink-foreground"
            >
              {offline === "ready" ? "✓ Ready offline" : "Download today's class"}
            </button>
          </div>
        </section>

        {/* TRANSLATE ANYTIME */}
        <section>
          <Link
            to="/teacher/translate"
            className="card-lift group relative block overflow-hidden rounded-3xl border border-teal-deep/25 bg-tint-teal p-6"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-8 size-40 rounded-full bg-teal-deep/10 blur-xl"
            />
            <div className="relative">
              <span className="grid size-12 place-items-center rounded-2xl bg-teal-deep text-primary-foreground">
                <Globe className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold text-teal-deep">Translate</h2>
              <p className="mt-1 text-sm text-muted-foreground">Speak or type. Translate naturally.</p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-teal-deep px-5 py-3 text-sm font-semibold text-primary-foreground">
                Open Translator <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <SectionTitle>Quick actions</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className={cn("card-lift flex flex-col gap-3 rounded-2xl border p-5", a.tint)}
              >
                <span className={cn("grid size-11 place-items-center rounded-xl", a.icons)}>
                  <a.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-base font-semibold">{a.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{a.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>


        {/* MY CLASSROOMS */}
        <section>
          <SectionTitle meta="tap to open">My classrooms</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {classrooms.map((c, i) => (
              <Link
                key={c.id}
                to="/teacher/classrooms/$classroomId"
                params={{ classroomId: c.id }}
                className={cn("card-lift rounded-2xl border p-5", HOME_CLASS_TINTS[i % HOME_CLASS_TINTS.length])}
              >
                <p className="font-display text-xl font-semibold">{c.className}</p>
                <p className="text-sm font-medium text-muted-foreground">Section {c.section}</p>
                <p className="mt-3 text-sm">{c.studentCount} students</p>
              </Link>
            ))}
            <Link
              to="/teacher/classrooms/new"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <Plus className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">Add classroom</span>
            </Link>
          </div>
        </section>


        {/* AI SUGGESTION */}
        <section>
          <SectionTitle>AI suggestion</SectionTitle>
          <div className="ai-surface p-5 sm:p-6">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-deep">
              <Sparkles className="size-3.5" /> Suggested for you
            </p>
            <p className="mt-2 font-display text-lg font-semibold">{rec?.title ?? "Your teaching assistant is ready"}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {rec?.body ?? "Prepare a lesson and I will suggest what to teach next, based on how your class did."}
            </p>
            <Link
              to="/teacher/planner"
              className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.99]"
            >
              {rec?.action_label ?? "Use suggestion"}
            </Link>
          </div>
        </section>

        {/* STUDENTS NEED ATTENTION */}
        <section>
          <SectionTitle>Students who need attention</SectionTitle>
          <Surface className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-semibold">{attention}</span>
              <span className="text-sm text-muted-foreground">students need extra practice or mother-tongue support</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/teacher/progress" className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground">
                View students
              </Link>
              <Link
                to="/teacher/translate"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
              >
                <Languages className="size-4" /> Speak & translate
              </Link>
            </div>
          </Surface>
        </section>

        {/* RECENT ACTIVITY */}
        <section>
          <SectionTitle>Recent activity</SectionTitle>
          <div className="space-y-2.5">
            {todays.filter((l) => l.status === "completed").slice(0, 2).map((l) => (
              <div key={l.id} className="surface-card flex items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">Class finished · {l.topic}</span>
                  <span className="block text-xs text-muted-foreground">{l.classLabel}</span>
                </span>
                <Pill tone="success">Done</Pill>
              </div>
            ))}
            {previous.slice(0, 3).map((l) => (
              <div key={l.id} className="surface-card flex items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{l.topic}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(l.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {l.classLabel}
                  </span>
                </span>
                <Pill tone={(l.understanding ?? 0) < 60 ? "warning" : "success"}>{l.understanding ?? 0}%</Pill>
              </div>
            ))}
            {!query.isLoading && !previous.length && !todays.length ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Your finished classes will show up here.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
