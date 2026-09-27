import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { previousLectures, upcomingLectures } from "@/lib/mock/data";
import { Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/lessons")({
  head: () => ({
    meta: [
      { title: "Lessons — Tribhashniya" },
      { name: "description", content: "What your child learned and what's coming next." },
      { property: "og:title", content: "Lessons — Tribhashniya" },
      { property: "og:description", content: "Every lesson, in plain words." },
    ],
  }),
  component: ParentLessonsPage,
});

function ParentLessonsPage() {
  return (
    <AppLayout role="parent">
      <PageHeader title="Lessons" subtitle="What Anita's class has covered — and what's next." />

      <div className="mt-6 space-y-3">
        {previousLectures.slice(0, 3).map((l) => (
          <Surface key={l.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{l.topic}</p>
                <p className="text-xs text-muted-foreground">{l.date} · {l.chapter}</p>
              </div>
              <Pill tone={l.understanding >= 70 ? "success" : "primary"}>Understood {l.understanding}%</Pill>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{l.aiSummary}</p>
            <button
              onClick={() => toast.success("Playing 2-minute audio summary in Santhali (simulated)")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium"
            >
              <Play className="size-3.5" /> Listen to summary (Santhali)
            </button>
          </Surface>
        ))}
      </div>

      <p className="mt-6 mb-3 font-mono text-[11px] tracking-[0.18em] text-primary-deep uppercase">Coming up</p>
      <div className="space-y-2.5">
        {upcomingLectures.slice(0, 2).map((l) => (
          <Surface key={l.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{l.topic}</p>
              <p className="text-xs text-muted-foreground">{l.date} · {l.durationMin} min</p>
            </div>
            <Pill tone="muted">Planned</Pill>
          </Surface>
        ))}
      </div>
    </AppLayout>
  );
}
