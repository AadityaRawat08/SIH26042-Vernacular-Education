import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { KeyValue, MetricBar, PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { studentById } from "@/lib/mock/selectors";

export const Route = createFileRoute("/parent/child")({
  head: () => ({
    meta: [
      { title: "My child — Tribhashniya" },
      { name: "description", content: "Your child's profile, subjects and how they're doing." },
      { property: "og:title", content: "My child — Tribhashniya" },
      { property: "og:description", content: "Everything about your child's class." },
    ],
  }),
  component: ChildPage,
});

function ChildPage() {
  const { parent } = useApp();
  const child = studentById("c-2a-s1");

  return (
    <AppLayout role="parent">
      <PageHeader title={parent.childName} subtitle={`${parent.childClass} · Section ${parent.section} · ${parent.school}`} />

      <Surface className="mt-5">
        <SectionTitle>Details</SectionTitle>
        <KeyValue label="Class teacher" value="Reeta Murmu" />
        <KeyValue label="Main subject focus" value="Mathematics" />
        <KeyValue label="Classroom language" value="Hindi + Santhali support" />
        <KeyValue label="Attendance" value="94% this month" />
      </Surface>

      {child ? (
        <>
          <Surface className="mt-5">
            <SectionTitle>Subjects</SectionTitle>
            <div className="space-y-4">
              {child.topicScores.map((t) => (
                <MetricBar key={t.topic} label={t.topic} value={t.score} tone={t.score < 55 ? "warning" : t.score < 70 ? "primary" : "success"} />
              ))}
            </div>
          </Surface>
          <Surface className="mt-5">
            <SectionTitle>Teacher's note</SectionTitle>
            <p className="text-sm text-muted-foreground">{child.teacherNotes[0] ?? "Doing well."}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone="warning">Practice at home: {child.weakArea}</Pill>
            </div>
          </Surface>
        </>
      ) : null}
    </AppLayout>
  );
}
