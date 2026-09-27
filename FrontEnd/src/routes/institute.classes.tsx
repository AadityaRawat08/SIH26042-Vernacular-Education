import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricBar, PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { languageLabel } from "@/lib/services/ai";
import { instituteTeachers } from "@/lib/mock/data";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/institute/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Tribhashniya" },
      { name: "description", content: "All classes, sections and their syllabus coverage." },
      { property: "og:title", content: "Classes — Tribhashniya" },
      { property: "og:description", content: "Classes, teachers and coverage at a glance." },
    ],
  }),
  component: InstituteClassesPage,
});

function InstituteClassesPage() {
  const { classrooms } = useApp();
  return (
    <AppLayout role="institute">
      <PageHeader
        title="Classes"
        subtitle="Sections, teachers and coverage."
        action={
          <button onClick={() => toast.info("Class creation (simulated)")} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground">
            <Plus className="size-3.5" /> New class
          </button>
        }
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {classrooms.map((c, i) => {
          const teacher = instituteTeachers[i % instituteTeachers.length];
          const coverage = 45 + ((i * 17) % 40);
          return (
            <Surface key={c.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-semibold">{c.className} · {c.section} · {c.subject}</p>
                  <p className="text-xs text-muted-foreground">{teacher?.name} · {c.studentCount} students</p>
                </div>
                <Pill tone="primary">{c.understanding}%</Pill>
              </div>
              <div className="mt-3">
                <MetricBar label="Syllabus coverage" value={coverage} tone="primary" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="muted">{languageLabel(c.language)}</Pill>
                <Pill tone="muted">{c.academicYear}</Pill>
              </div>
              <Link to="/teacher/classrooms/$classroomId" params={{ classroomId: c.id }} className="mt-3 inline-block text-sm font-medium text-primary-deep underline">
                View classroom
              </Link>
            </Surface>
          );
        })}
      </div>
    </AppLayout>
  );
}
