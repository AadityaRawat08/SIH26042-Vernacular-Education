import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricBar, PageHeader, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { curriculum } from "@/lib/mock/data";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/institute/curriculum")({
  head: () => ({
    meta: [
      { title: "Curriculum — Tribhashniya" },
      { name: "description", content: "Board syllabus, uploaded textbooks and school-wide coverage." },
      { property: "og:title", content: "Curriculum — Tribhashniya" },
      { property: "og:description", content: "One syllabus, tracked across every class." },
    ],
  }),
  component: InstituteCurriculumPage,
});

function InstituteCurriculumPage() {
  const { classrooms, institute } = useApp();
  return (
    <AppLayout role="institute">
      <PageHeader
        title="Curriculum"
        subtitle={`${institute.board} · uploaded once, used by every teacher.`}
        action={
          <button onClick={() => toast.info("Curriculum upload (simulated)")} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground">
            <Upload className="size-3.5" /> Upload syllabus
          </button>
        }
      />
      <Surface className="mt-5">
        <SectionTitle>Coverage by class</SectionTitle>
        <div className="space-y-4">
          {classrooms.map((c, i) => {
            const pct = 48 + ((i * 19) % 40);
            return (
              <MetricBar
                key={c.id}
                label={`${c.className} ${c.section} · ${c.subject}`}
                value={pct}
                tone={pct >= 70 ? "success" : "primary"}
              />
            );
          })}
        </div>
      </Surface>
      <Surface className="mt-5">
        <SectionTitle>Board documents</SectionTitle>
        <div className="space-y-2.5">
          {curriculum.flatMap((ch) =>
            ch.documents.map((d) => (
              <div key={`${ch.id}-${d.title}`} className="flex items-center justify-between rounded-xl bg-secondary px-3.5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{ch.className} · {ch.subject} · {d.sizeMb} MB</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground capitalize">{d.kind}</span>
              </div>
            )),
          )}
        </div>
      </Surface>
    </AppLayout>
  );
}
