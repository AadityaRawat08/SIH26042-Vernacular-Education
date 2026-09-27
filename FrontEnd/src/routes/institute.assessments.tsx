import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { assessments } from "@/lib/mock/data";
import { languageLabel } from "@/lib/services/ai";

export const Route = createFileRoute("/institute/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments — Tribhashniya" },
      { name: "description", content: "School-wide assessment activity and averages." },
      { property: "og:title", content: "Assessments — Tribhashniya" },
      { property: "og:description", content: "Every quiz, every class, one list." },
    ],
  }),
  component: InstituteAssessmentsPage,
});

function InstituteAssessmentsPage() {
  const { classrooms } = useApp();
  return (
    <AppLayout role="institute">
      <PageHeader title="Assessments" subtitle="Everything teachers have assigned, school-wide." />
      <div className="mt-5 space-y-3">
        {assessments.map((a) => {
          const c = classrooms.find((x) => x.id === a.classroomId);
          return (
            <Surface key={a.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {c?.className} {c?.section} · {c?.subject} · {a.type} · {languageLabel(a.language)}
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{a.attempted}/{c?.studentCount ?? 30} attempted</span>
              <span className="font-display text-lg font-semibold">{a.averageScore}%</span>
              <Pill tone={a.averageScore >= 70 ? "success" : a.averageScore >= 55 ? "primary" : "warning"}>
                {a.averageScore >= 70 ? "On track" : "Needs review"}
              </Pill>
            </Surface>
          );
        })}
      </div>
    </AppLayout>
  );
}
