import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricBar, PageHeader, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { studentById } from "@/lib/mock/selectors";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/parent/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Tribhashniya" },
      { name: "description", content: "Your child's learning over the weeks, simply explained." },
      { property: "og:title", content: "Progress — Tribhashniya" },
      { property: "og:description", content: "Watch your child grow, week by week." },
    ],
  }),
  component: ParentProgressPage,
});

function ParentProgressPage() {
  const { parent } = useApp();
  const child = studentById("c-2a-s1");
  const trendData = (child?.assessmentHistory ?? []).map((a) => ({ label: a.date, score: a.score })).reverse();

  return (
    <AppLayout role="parent">
      <PageHeader title={`${parent.childName}'s progress`} subtitle="Simple numbers, no jargon." />

      <Surface className="mt-5">
        <SectionTitle>Recent assessments</SectionTitle>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      {child ? (
        <Surface className="mt-5">
          <SectionTitle>Topic by topic</SectionTitle>
          <div className="space-y-4">
            {child.topicScores.map((t) => (
              <MetricBar key={t.topic} label={t.topic} value={t.score} tone={t.score < 55 ? "warning" : t.score < 70 ? "primary" : "success"} />
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {parent.childName.split(" ")[0]} is improving steadily. A little practice with {child.weakArea.toLowerCase()} at home will help.
          </p>
        </Surface>
      ) : null}
    </AppLayout>
  );
}
