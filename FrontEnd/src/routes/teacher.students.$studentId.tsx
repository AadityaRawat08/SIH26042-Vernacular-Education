import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiCallout, KeyValue, MetricBar, PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useAuth } from "@/lib/auth";
import { getStudentDetail } from "@/lib/teaching.functions";
import { languageLabel } from "@/lib/services/ai";
import type { LanguageCode } from "@/lib/types";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/teacher/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student profile — Tribhashniya" },
      { name: "description", content: "One student's attendance, understanding history, weak topics and AI suggestions." },
      { property: "og:title", content: "Student profile — Tribhashniya" },
      { property: "og:description", content: "A complete picture of one learner." },
    ],
  }),
  component: StudentPage,
});

function StudentPage() {
  const { studentId } = Route.useParams();
  const { session } = useAuth();
  const fetchStudent = useServerFn(getStudentDetail);

  const query = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudent({ data: { studentId } }),
    enabled: Boolean(session),
  });

  if (query.isLoading) {
    return (
      <AppLayout role="teacher">
        <p className="mt-8 text-sm text-muted-foreground">Loading student…</p>
      </AppLayout>
    );
  }

  const detail = query.data;
  if (!detail) {
    return (
      <AppLayout role="teacher">
        <PageHeader title="Student not found" />
        <Link to="/teacher/progress" className="mt-4 inline-block text-sm font-medium text-primary-deep underline">Back to progress</Link>
      </AppLayout>
    );
  }

  const { student, classroom, topics, history, observations, gaps } = detail;
  const level = student.understanding >= 75 ? "Strong" : student.understanding >= 55 ? "Developing" : "Needs support";

  return (
    <AppLayout role="teacher">
      <Link to="/teacher/progress" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> All students
      </Link>

      <div className="mt-3 rounded-2xl bg-ink p-5 text-ink-foreground">
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/20 font-display text-lg font-semibold text-primary">
            {student.name.split(" ").map((p) => p[0]).join("")}
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">{student.name}</h1>
            <p className="text-sm text-ink-foreground/70">{classroom?.className} {classroom?.section} · {classroom?.subject} · Roll {student.roll}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-ink-foreground/10 p-2.5"><p className="font-display text-xl font-semibold">{student.understanding}%</p><p className="text-[10px] uppercase tracking-wider text-ink-foreground/60">Understanding</p></div>
          <div className="rounded-xl bg-ink-foreground/10 p-2.5"><p className="font-display text-xl font-semibold">{detail.lastAssessment}%</p><p className="text-[10px] uppercase tracking-wider text-ink-foreground/60">Last test</p></div>
          <div className="rounded-xl bg-ink-foreground/10 p-2.5"><p className="font-display text-xl font-semibold">{detail.attendance}%</p><p className="text-[10px] uppercase tracking-wider text-ink-foreground/60">Attendance</p></div>
        </div>
      </div>

      <Surface className="mt-5">
        <SectionTitle>Assessment history</SectionTitle>
        {history.length ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No test results yet for this student.</p>
        )}
      </Surface>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Surface>
          <SectionTitle>Topic mastery</SectionTitle>
          <div className="space-y-4">
            {topics.length ? topics.map((t) => (
              <MetricBar key={t.topic} label={t.topic} value={t.score} tone={t.score < 55 ? "warning" : t.score < 70 ? "primary" : "success"} />
            )) : <p className="text-sm text-muted-foreground">Topic records appear after the first lessons.</p>}
          </div>
        </Surface>
        <Surface>
          <SectionTitle>Details</SectionTitle>
          <KeyValue label="Weak area" value={student.weakArea ?? "—"} />
          <KeyValue label="Mother tongue" value={languageLabel(student.motherTongue as LanguageCode)} />
          <KeyValue label="Language support" value={detail.languageSupportNeeded ? "Needs mother-tongue bridge" : "Comfortable in class language"} />
          <KeyValue label="Teacher notes" value={student.notes ?? observations[0] ?? "—"} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone={level === "Strong" ? "success" : level === "Developing" ? "primary" : "warning"}>{level}</Pill>
            {gaps.map((gap) => <Pill key={`${gap.topic}-${gap.kind}`} tone="muted">{gap.topic}</Pill>)}
          </div>
        </Surface>
      </div>

      <div className="mt-5">
        <AiCallout
          title={gaps[0]?.detail ?? `${student.name.split(" ")[0]}: ${level.toLowerCase()} in this subject.`}
          body={student.weakArea ? `Recommended action: revise ${student.weakArea} with a mother-tongue example and short practice.` : "Recommended action: keep the current pace and add one challenge question."}
          actionLabel="Plan a remedial block"
          to="/teacher/planner"
        />
      </div>
    </AppLayout>
  );
}
