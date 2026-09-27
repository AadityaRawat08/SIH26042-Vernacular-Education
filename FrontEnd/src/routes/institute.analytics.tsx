import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiCallout, MetricBar, PageHeader, SectionTitle, StatCard, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { subjectAverages, topicPerformance, trend } from "@/lib/mock/selectors";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/institute/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Tribhashniya" },
      { name: "description", content: "Learning trends, subject performance and language impact across the school." },
      { property: "og:title", content: "Analytics — Tribhashniya" },
      { property: "og:description", content: "What the whole school's data says." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { classrooms } = useApp();
  return (
    <AppLayout role="institute">
      <PageHeader title="Analytics" subtitle="Learning trends across the school, updated after every assessment." />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avg understanding" value="74%" tone="success" hint="+5 pts in 6 weeks" />
        <StatCard label="Assessments this month" value="23" tone="primary" />
        <StatCard label="Students below 55%" value="14%" tone="warning" hint="down from 21%" />
        <StatCard label="Mother-tongue classes" value={`${classrooms.filter((c) => c.language === "sat").length}/${classrooms.length}`} tone="info" />
      </div>

      <Surface className="mt-5">
        <SectionTitle>School understanding trend</SectionTitle>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionTitle>By subject</SectionTitle>
          <div className="space-y-4">
            {subjectAverages.map((s, i) => (
              <MetricBar key={s.subject} label={s.subject} value={s.score} tone={i % 3 === 0 ? "primary" : i % 3 === 1 ? "success" : "info"} />
            ))}
          </div>
        </Surface>
        <Surface>
          <SectionTitle>By topic (Mathematics)</SectionTitle>
          <div className="space-y-4">
            {topicPerformance.map((t) => (
              <MetricBar key={t.topic} label={t.topic} value={t.score} tone={t.score < 60 ? "warning" : "primary"} />
            ))}
          </div>
        </Surface>
      </div>

      <div className="mt-5">
        <AiCallout
          title="Subtraction is the school's weakest topic this month."
          body="Every section scores below 60% on subtraction. A shared remedial worksheet bank in Hindi and Santhali is ready to assign."
          actionLabel="Open assessments"
          to="/institute/assessments"
        />
      </div>
    </AppLayout>
  );
}
