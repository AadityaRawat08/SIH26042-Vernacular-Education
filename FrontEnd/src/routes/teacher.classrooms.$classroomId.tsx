import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiCallout, EmptyState, MetricBar, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useApp } from "@/lib/app-state";
import { useAuth } from "@/lib/auth";
import { getClassroomDetail } from "@/lib/classrooms.functions";
import { topicPerformance } from "@/lib/mock/selectors";
import { curriculum } from "@/lib/mock/data";
import { languageLabel } from "@/lib/services/ai";
import { cn } from "@/lib/utils";
import type { LanguageCode } from "@/lib/types";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Languages, Lock, MoveRight, Play, Radio, RefreshCw, Sparkles, SquarePen, Users } from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type View = "home" | "previous" | "upcoming" | "live" | "syllabus" | "assessments" | "progress";

export const Route = createFileRoute("/teacher/classrooms/$classroomId")({
  head: () => ({ meta: [
    { title: "Classroom — Tribhashniya" },
    { name: "description", content: "Today's class, lessons, assessments, syllabus and progress in one clear classroom." },
    { property: "og:title", content: "Classroom — Tribhashniya" },
    { property: "og:description", content: "A classroom-first teaching workspace." },
  ] }),
  component: ClassroomDashboard,
});

const features: Array<{ key: View; title: string; body: string; icon: ComponentType<{ className?: string }>; priority: string }> = [
  { key: "live", title: "Live Class", body: "Start today’s class", icon: Radio, priority: "primary" },
  { key: "upcoming", title: "Upcoming Lectures", body: "See what’s next", icon: CalendarDays, priority: "secondary" },
  { key: "previous", title: "Previous Lectures", body: "View what was taught", icon: BookOpen, priority: "secondary" },
  { key: "assessments", title: "Assessments", body: "Check learning", icon: ClipboardCheck, priority: "standard" },
  { key: "progress", title: "Progress", body: "See class progress", icon: BarChart3, priority: "standard" },
  { key: "syllabus", title: "Syllabus", body: "View curriculum", icon: CheckCircle2, priority: "standard" },
];

function ClassroomDashboard() {
  const { classroomId } = useParams({ from: "/teacher/classrooms/$classroomId" });
  const { plan } = useApp();
  const { session } = useAuth();
  const fetchDetail = useServerFn(getClassroomDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["classroom", classroomId],
    queryFn: () => fetchDetail({ data: { classroomId } }),
    enabled: Boolean(session),
  });
  const [view, setView] = useState<View>("home");
  const [expandedLecture, setExpandedLecture] = useState<string | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  if (isLoading || !session) return <AppLayout role="teacher"><p className="text-sm text-muted-foreground">Loading classroom…</p></AppLayout>;
  if (!data) return <AppLayout role="teacher"><EmptyState title="Classroom not found" body="It may have been removed. Go back to My Classrooms." /></AppLayout>;

  const { classroom, previous, upcoming, assessments, students: roster, recommendation } = data;
  const attention = [...roster].filter((s) => s.understanding < 60).sort((a, b) => a.understanding - b.understanding);
  const nextLesson = upcoming[0];
  const prepared = Boolean(plan && plan.request.className === classroom.className && plan.request.section === classroom.section);
  const title = view === "home" ? null : features.find((item) => item.key === view)?.title;

  return <AppLayout role="teacher">
    {view === "home" ? (
      <Link to="/teacher/classrooms" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Back to Classes</Link>
    ) : (
      <button onClick={() => setView("home")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Back to {classroom.className} {classroom.section}</button>
    )}

    <header className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{title ?? "Classroom"}</p>
        <h1 className="mt-2 truncate font-display text-3xl font-semibold sm:text-4xl">{title ?? `${classroom.className} · Section ${classroom.section}`}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{classroom.studentCount} Students · Teaching language: {languageLabel(classroom.language as LanguageCode)} · Support language: {languageLabel(classroom.supportLanguage as LanguageCode)}</p>
      </div>
      {view !== "home" ? <button onClick={() => setView("home")} className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary" aria-label="Classroom home"><BookOpen className="size-4" /></button> : null}
    </header>

    {view === "home" ? <>
      <section className="relative mt-7 overflow-hidden rounded-4xl bg-ink p-6 text-ink-foreground shadow-[var(--shadow-lift)] sm:p-8">
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 text-primary"><span className="size-2 rounded-full bg-primary" /><span className="text-xs font-semibold uppercase tracking-wider">{nextLesson ? `${formatDay(nextLesson.scheduledAt)} · ${formatTime(nextLesson.scheduledAt)}` : "No lesson scheduled"}</span></div>
          <p className="mt-5 text-sm text-ink-foreground/65">{classroom.subject}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{nextLesson?.topic ?? classroom.currentTopic}</h2>
          <p className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink-foreground/70"><span className="flex items-center gap-1.5"><Clock3 className="size-4" />{nextLesson?.durationMin ?? 40} minutes</span><span>{nextLesson ? `Starts ${formatTime(nextLesson.scheduledAt)}` : "Not scheduled"}</span><span className="flex items-center gap-1.5"><Sparkles className="size-4" />{prepared ? "AI lesson plan ready" : "AI can prepare your lesson"}</span></p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={prepared ? "/teacher/live" : "/teacher/planner"} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"><Play className="size-4" />{prepared ? "Start Class" : "Prepare Class"}</Link>
            <Link to={prepared ? "/teacher/planner/plan" : "/teacher/planner"} className="inline-flex min-h-12 items-center rounded-full border border-ink-foreground/20 px-6 text-sm font-semibold">View Lesson</Link>
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map(({ key, title: featureTitle, body, icon: Icon, priority }) => <button key={key} onClick={() => setView(key)} className={cn("group min-h-48 rounded-4xl border p-6 text-left shadow-[var(--shadow-card)] transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]", priority === "primary" ? "border-primary bg-primary/14 sm:col-span-2 xl:col-span-1" : priority === "secondary" ? "border-border bg-card" : "border-border bg-secondary/45")}>
          <div className="flex h-full flex-col">
             <span className={cn("grid size-14 place-items-center rounded-2xl", priority === "primary" ? "bg-ink text-ink-foreground" : "bg-card text-foreground")}><Icon className="size-6" /></span>
            <h2 className="mt-5 font-display text-2xl font-semibold">{featureTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{body}</p>
            <span className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold">Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
        </button>)}
      </div>
    </> : null}

    {view === "live" ? <section className="mt-7 rounded-3xl bg-primary/12 p-6 sm:p-8"><span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Radio className="size-6" /></span><p className="mt-5 eyebrow">Today’s class</p><h2 className="mt-2 font-display text-3xl font-semibold">{nextLesson?.topic ?? classroom.currentTopic}</h2><p className="mt-2 text-sm text-muted-foreground">{classroom.subject}{nextLesson ? ` · ${formatTime(nextLesson.scheduledAt)} · ${nextLesson.durationMin} minutes` : ""}</p><p className="mt-5 max-w-xl text-sm">{prepared ? "Your lesson plan, bilingual script, activities and quick assessment are ready." : "Create the AI teaching plan first, then return here to run the live class."}</p><Link to={prepared ? "/teacher/live" : "/teacher/planner"} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-ink-foreground"><Play className="size-4" />{prepared ? "Start Class" : "Create Lesson Plan"}</Link></section> : null}

    {view === "previous" ? <div className="mt-7 space-y-4">{previous.map((lecture) => <article key={lecture.id} className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4"><div className="min-w-0"><h2 className="truncate font-display text-2xl font-semibold">{lecture.topic}</h2><p className="mt-1 text-sm text-muted-foreground">{formatDay(lecture.scheduledAt)} · {lecture.durationMin} min</p></div><Pill tone={(lecture.understanding ?? 0) < 60 ? "warning" : "success"}>{lecture.understanding ?? 0}% understood</Pill></div><div className="mt-5 grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Language support</p><p className="mt-1 text-sm font-semibold"><Languages className="mr-1.5 inline size-4" />{lecture.languageSupport}</p></div><div><p className="text-xs text-muted-foreground">Class understanding</p><MetricBar label="Understanding" value={lecture.understanding ?? 0} tone={(lecture.understanding ?? 0) < 60 ? "warning" : "success"} /></div></div><button onClick={() => setExpandedLecture(expandedLecture === lecture.id ? null : lecture.id)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold">View Lecture <ChevronDown className={cn("size-4 transition", expandedLecture === lecture.id && "rotate-180")} /></button>{expandedLecture === lecture.id ? <div className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2"><p><span className="block text-xs text-muted-foreground">Objective</span>{lecture.objective}</p><p><span className="block text-xs text-muted-foreground">Activities</span>{lecture.activities.join(" · ")}</p><p><span className="block text-xs text-muted-foreground">Teacher notes</span>{lecture.teacherNotes}</p><p><span className="block text-xs text-muted-foreground">AI summary</span>{lecture.aiSummary}</p></div> : null}</article>)}</div> : null}

    {view === "upcoming" ? <div className="mt-7 space-y-4">{upcoming.map((lecture, index) => <article key={lecture.id} className={cn("rounded-3xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6", index === 0 ? "border-primary" : "border-border")}><div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4"><div className={cn("grid size-14 shrink-0 place-items-center rounded-2xl text-center text-xs font-semibold", index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary")}>{formatDay(lecture.scheduledAt)}</div><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-display text-2xl font-semibold">{lecture.topic}</h2><p className="text-sm text-muted-foreground">{lecture.durationMin} min · {lecture.chapter}</p></div><Pill tone={lecture.status === "ai-adjusted" ? "primary" : lecture.status === "locked" ? "ink" : "muted"}>{lecture.status === "ai-adjusted" ? "AI recommended" : lecture.status}</Pill></div>{lecture.objective ? <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm">{lecture.objective}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><Link to="/teacher/planner" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground">View Plan</Link><button onClick={() => toast.info("Edit lecture in planner (simulated)")} className="grid size-11 place-items-center rounded-full border border-border" aria-label="Edit lecture"><SquarePen className="size-4" /></button><button onClick={() => toast.success("Lecture regenerated (simulated)")} className="grid size-11 place-items-center rounded-full border border-border" aria-label="Regenerate lecture"><RefreshCw className="size-4" /></button><button onClick={() => toast.success("Lecture locked (simulated)")} className="grid size-11 place-items-center rounded-full border border-border" aria-label="Lock lecture"><Lock className="size-4" /></button><button onClick={() => toast.info("Moved to next week (simulated)")} className="grid size-11 place-items-center rounded-full border border-border" aria-label="Move lecture"><MoveRight className="size-4" /></button></div></div></div></article>)}</div> : null}

    {view === "syllabus" ? <div className="mt-7 space-y-4">{curriculum.filter((chapter) => chapter.className === classroom.className || chapter.subject === classroom.subject).map((chapter, index) => <article key={chapter.id} className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4"><div><p className="eyebrow">Chapter {index + 1}</p><h2 className="mt-2 font-display text-2xl font-semibold">{chapter.chapter}</h2></div><Pill tone={index === 0 ? "primary" : "muted"}>{index === 0 ? "In progress" : "Upcoming"}</Pill></div><div className="mt-5 space-y-2">{chapter.lessons.map((lesson, lessonIndex) => <div key={lesson.title} className="flex min-h-12 items-center gap-3 rounded-xl bg-secondary/60 px-4"><span className={cn("grid size-6 shrink-0 place-items-center rounded-full", lessonIndex === 0 ? "bg-success text-success-foreground" : lessonIndex === 1 ? "border-2 border-primary" : "border border-border")} >{lessonIndex === 0 ? <Check className="size-3.5" /> : null}</span><p className="min-w-0 flex-1 truncate text-sm font-medium">{lesson.title}</p><span className="text-xs text-muted-foreground">{lessonIndex === 0 ? "Completed" : lessonIndex === 1 ? "In progress" : "Upcoming"}</span></div>)}</div></article>)}<Link to="/teacher/curriculum" className="inline-flex min-h-12 items-center rounded-full border border-border px-5 text-sm font-semibold">Open full syllabus</Link></div> : null}

    {view === "assessments" ? <div className="mt-7 space-y-4">{assessments.map((assessment) => <article key={assessment.id} className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4"><div><h2 className="font-display text-2xl font-semibold">{assessment.title}</h2><p className="mt-1 text-sm text-muted-foreground">{assessment.questionCount} questions · {classroom.studentCount} students</p></div><Pill tone={assessment.averageScore < 60 ? "warning" : "success"}>{assessment.averageScore}% average</Pill></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 font-display text-2xl font-semibold">{assessment.attempted} / {classroom.studentCount}</p></div><div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Average</p><p className="mt-1 font-display text-2xl font-semibold">{assessment.averageScore}%</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Link to="/teacher/assessments" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground">View Results</Link><Link to="/teacher/assessments" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold">Create Assessment</Link></div></article>)}</div> : null}

    {view === "progress" ? <div className="mt-7 space-y-5"><section className="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]"><p className="eyebrow">{classroom.className}{classroom.section}</p><p className="mt-2 text-sm text-muted-foreground">Overall learning</p><p className="font-display text-5xl font-semibold text-success">{classroom.understanding}%</p><div className="mt-6 space-y-3 text-sm"><p className="flex items-center gap-2"><CheckCircle2 className="size-5 shrink-0 text-success" /> Strong in Addition</p><p className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">!</span> Needs practice in Subtraction</p><p className="flex items-center gap-2"><Languages className="size-5 shrink-0 text-primary-deep" /> {attention.length} students need additional language support</p></div></section><div className="grid gap-4 sm:grid-cols-2"><Surface><SectionTitle>Concept understanding</SectionTitle><div className="space-y-4">{topicPerformance.map((topic) => <MetricBar key={topic.topic} label={topic.topic} value={topic.score} tone={topic.score < 60 ? "warning" : "success"} />)}</div></Surface><Surface><SectionTitle>Language support need</SectionTitle><div className="space-y-4"><MetricBar label="Understands in teaching language" value={74} tone="success" /><MetricBar label={`${languageLabel(classroom.supportLanguage as LanguageCode)} bridge needed`} value={26} tone="primary" /></div><p className="mt-4 text-sm text-muted-foreground">Concept knowledge and language confidence are tracked separately.</p></Surface></div><Surface><SectionTitle meta={`${attention.length} students`}>Needs your support</SectionTitle><div className="space-y-2">{attention.map((student) => <Link key={student.id} to="/teacher/students/$studentId" params={{ studentId: student.id }} className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-secondary px-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{student.name}</p><p className="truncate text-xs text-muted-foreground">{student.weakArea}</p></div><Pill tone="warning">{student.understanding}%</Pill></Link>)}</div><Link to="/teacher/progress" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold">View all {roster.length} students</Link></Surface></div> : null}

    {view !== "home" ? <div className="mt-7"><AiCallout title={`AI recommendation for ${classroom.className}${classroom.section}`} body={recommendation?.body ?? (classroom.understanding < 60 ? "Re-teach the previous concept with classroom objects and a mother-tongue bridge before moving ahead." : "Understanding is steady. The next lesson can introduce a new concept with a short physical activity.")} actionLabel={recommendation?.action_label ?? "Generate next lesson"} to="/teacher/planner" /></div> : null}
  </AppLayout>;
}
