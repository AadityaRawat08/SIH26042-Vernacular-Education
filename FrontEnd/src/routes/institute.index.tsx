import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiCallout, MetricBar, PageHeader, Pill, SectionTitle, StatCard, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { instituteTeachers } from "@/lib/mock/data";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/institute/")({
  head: () => ({
    meta: [
      { title: "Institute dashboard — Tribhashniya" },
      { name: "description", content: "School-wide view of teachers, classes, syllabus coverage and usage." },
      { property: "og:title", content: "Institute dashboard — Tribhashniya" },
      { property: "og:description", content: "One calm view of the whole school." },
    ],
  }),
  component: InstituteDashboard,
});

const USAGE = [
  { week: "W1", plans: 18 }, { week: "W2", plans: 24 }, { week: "W3", plans: 31 },
  { week: "W4", plans: 28 }, { week: "W5", plans: 36 }, { week: "W6", plans: 42 },
];

function InstituteDashboard() {
  const { institute, classrooms } = useApp();
  const avg = Math.round(classrooms.reduce((a, c) => a + c.understanding, 0) / classrooms.length);
  return (
    <AppLayout role="institute">
      <PageHeader
        eyebrow="Institute"
        title={institute.name}
        subtitle={`${institute.district} · ${institute.board} · ${institute.classes.length} classes on Tribhashniya`}
        action={
          <Link to="/institute/teachers" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground">
            <Plus className="size-3.5" /> Add teacher
          </Link>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Teachers" value={institute.teacherCount} hint="+2 this term" />
        <StatCard label="Students" value={institute.studentCount} hint={`across ${institute.classes.length} classes`} />
        <StatCard label="Syllabus covered" value="64%" tone="primary" hint="on track" />
        <StatCard label="Avg understanding" value={`${avg}%`} tone="success" hint="+5 pts in 6 weeks" />
      </div>

      <Surface className="mt-5">
        <SectionTitle>AI plans generated per week</SectionTitle>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={USAGE} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="plans" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionTitle>Class performance</SectionTitle>
          <div className="space-y-3">
            {classrooms.map((c) => (
              <MetricBar
                key={c.id}
                label={`${c.className} ${c.section} · ${c.subject}`}
                value={c.understanding}
                tone={c.understanding >= 75 ? "success" : c.understanding >= 60 ? "primary" : "warning"}
              />
            ))}
          </div>
        </Surface>
        <div className="space-y-4">
          <AiCallout
            title="Classes with mother-tongue plans improved 9 points faster."
            body="Sections taught with Santhali-supported plans are outpacing Hindi-only sections. Encourage the remaining teachers to add mother-tongue support."
            actionLabel="View teachers"
            to="/institute/teachers"
          />
          <Surface>
            <SectionTitle>Quick links</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/institute/teachers" className="rounded-xl bg-secondary px-3.5 py-3 text-sm font-medium">Teachers →</Link>
              <Link to="/institute/students" className="rounded-xl bg-secondary px-3.5 py-3 text-sm font-medium">Students →</Link>
              <Link to="/institute/analytics" className="rounded-xl bg-secondary px-3.5 py-3 text-sm font-medium">Analytics →</Link>
              <Link to="/institute/reports" className="rounded-xl bg-secondary px-3.5 py-3 text-sm font-medium">Reports →</Link>
            </div>
          </Surface>
        </div>
      </div>

      <Surface className="mt-5">
        <SectionTitle>Teacher activity today</SectionTitle>
        <div className="space-y-2">
          {instituteTeachers.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-secondary px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.subjects} · {t.classes}</p>
              </div>
              <Pill tone="muted">{t.activity}</Pill>
            </div>
          ))}
        </div>
      </Surface>
    </AppLayout>
  );
}
