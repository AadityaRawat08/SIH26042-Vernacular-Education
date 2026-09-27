import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiCallout, MetricBar, PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useAuth } from "@/lib/auth";
import { listClassrooms } from "@/lib/classrooms.functions";
import { getClassProgress } from "@/lib/teaching.functions";
import { CheckCircle2, Languages, Users } from "lucide-react";

export const Route = createFileRoute("/teacher/progress")({
  head: () => ({ meta: [
    { title: "Student progress — Tribhashniya" },
    { name: "description", content: "Understand concept learning and language support needs separately." },
    { property: "og:title", content: "Student progress — Tribhashniya" },
    { property: "og:description", content: "Teacher-friendly class progress without complex analytics." },
  ] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { session } = useAuth();
  const fetchClassrooms = useServerFn(listClassrooms);
  const fetchProgress = useServerFn(getClassProgress);
  const [classroomId, setClassroomId] = useState("");

  const roomsQuery = useQuery({
    queryKey: ["classrooms"],
    queryFn: () => fetchClassrooms(),
    enabled: Boolean(session),
  });
  const classrooms = roomsQuery.data ?? [];

  useEffect(() => {
    if (!classroomId && classrooms.length) setClassroomId(classrooms[0]!.id);
  }, [classroomId, classrooms]);

  const progressQuery = useQuery({
    queryKey: ["class-progress", classroomId],
    queryFn: () => fetchProgress({ data: { classroomId } }),
    enabled: Boolean(session && classroomId),
  });

  const classroom = classrooms.find((item) => item.id === classroomId);
  const students = progressQuery.data?.students ?? [];
  const topics = progressQuery.data?.topics ?? [];
  const weak = students.filter((student) => student.understanding < 60);
  const avg = progressQuery.data?.average ?? 0;
  const supportCount = progressQuery.data?.languageSupport ?? weak.length;
  const supportShare = students.length ? Math.round((supportCount / students.length) * 100) : 0;

  return <AppLayout role="teacher">
    <PageHeader title="Class progress" subtitle="What students understand, and where language support can help." action={<select value={classroomId} onChange={(event) => setClassroomId(event.target.value)} className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none">{classrooms.map((item) => <option key={item.id} value={item.id}>{item.className} {item.section}</option>)}</select>} />

    {roomsQuery.isLoading || progressQuery.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading your class…</p> : null}

    <section className="mt-6 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <p className="eyebrow">{classroom ? `${classroom.className} ${classroom.section}` : "Class"}</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div><p className="text-sm text-muted-foreground">Overall learning</p><p className="font-display text-6xl font-semibold text-success">{avg}%</p></div>
        <div className="space-y-3 text-sm">
          {topics.length > 1 ? <>
            <p className="flex items-center gap-2"><CheckCircle2 className="size-5 shrink-0 text-success" /> Strong in {[...topics].sort((a, b) => b.score - a.score)[0]!.topic}</p>
            <p className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">!</span> Needs practice in {[...topics].sort((a, b) => a.score - b.score)[0]!.topic}</p>
          </> : topics.length === 1 ? <p className="flex items-center gap-2"><CheckCircle2 className="size-5 shrink-0 text-success" /> Working on {topics[0]!.topic} ({topics[0]!.score}%)</p> : <p className="text-muted-foreground">Topic results will appear after the first assessment.</p>}
          <p className="flex items-center gap-2"><Languages className="size-5 shrink-0 text-primary-deep" /> {supportCount} students need additional language support</p>
        </div>
      </div>
    </section>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Surface><SectionTitle>Concept understanding</SectionTitle><div className="space-y-4">{topics.length ? topics.map((topic) => <MetricBar key={topic.topic} label={topic.topic} value={topic.score} tone={topic.score < 60 ? "warning" : "success"} />) : <p className="text-sm text-muted-foreground">No topic records yet for this class.</p>}</div></Surface>
      <Surface><SectionTitle>Language support need</SectionTitle><div className="space-y-4"><MetricBar label="Comfortable in teaching language" value={100 - supportShare} tone="success" /><MetricBar label="Needs mother-tongue bridge" value={supportShare} tone="primary" /></div><p className="mt-5 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">A student can understand the concept but still need help with the language used to explain it.</p></Surface>
    </div>

    <div className="mt-5"><AiCallout title={`${weak.length} students could benefit from a bilingual recap.`} body="The next AI plan can add a mother-tongue explanation and a hands-on practice block." actionLabel="Prepare recap" to="/teacher/planner" /></div>

    <Surface className="mt-5"><SectionTitle meta={`${students.length} students`}>Students</SectionTitle><div className="grid gap-2 sm:grid-cols-2">{students.map((student) => <Link key={student.id} to="/teacher/students/$studentId" params={{ studentId: student.id }} className="flex min-h-16 items-center gap-3 rounded-2xl bg-secondary p-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-card font-display text-xs font-semibold">{student.name.split(" ").map((part) => part[0]).join("")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{student.name}</p><p className="truncate text-xs text-muted-foreground">{student.weakArea ?? "No weak area noted"}</p></div><Pill tone={student.understanding < 55 ? "warning" : student.understanding < 75 ? "primary" : "success"}>{student.understanding}%</Pill></Link>)}</div><Link to="/parent" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"><Users className="size-4" /> Preview parent view</Link></Surface>
  </AppLayout>;
}
