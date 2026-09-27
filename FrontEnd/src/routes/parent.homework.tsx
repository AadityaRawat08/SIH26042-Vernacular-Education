import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";

export const Route = createFileRoute("/parent/homework")({
  head: () => ({ meta: [
    { title: "Homework — Tribhashniya" },
    { name: "description", content: "See your child's homework and completion status." },
    { property: "og:title", content: "Homework — Tribhashniya" },
    { property: "og:description", content: "Simple homework updates for families." },
  ] }),
  component: HomeworkPage,
});

function HomeworkPage() {
  return <AppLayout role="parent"><PageHeader title="Homework" subtitle="What to practise at home this week." /><div className="mt-5 space-y-3">{[
    ["Addition within 20", "Mathematics", "Done"],
    ["Read the water cycle story", "EVS", "Due tomorrow"],
    ["Five new words", "Hindi", "In progress"],
  ].map(([title, subject, status]) => <Surface key={title} className="flex items-center justify-between gap-3"><div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{subject}</p></div><Pill tone={status === "Done" ? "success" : "warning"}>{status}</Pill></Surface>)}</div></AppLayout>;
}