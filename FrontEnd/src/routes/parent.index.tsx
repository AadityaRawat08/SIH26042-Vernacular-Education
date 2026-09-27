import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricBar, PageHeader, Pill, SectionTitle, StatCard, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { studentById } from "@/lib/mock/selectors";
import { Bell, BookOpen } from "lucide-react";

export const Route = createFileRoute("/parent/")({
  head: () => ({
    meta: [
      { title: "Parent home — Tribhashniya" },
      { name: "description", content: "Your child's school day, progress and homework in your own language." },
      { property: "og:title", content: "Parent home — Tribhashniya" },
      { property: "og:description", content: "Stay close to your child's learning." },
    ],
  }),
  component: ParentHome,
});

function ParentHome() {
  const { parent } = useApp();
  const child = studentById("c-2a-s1");

  return (
    <AppLayout role="parent">
      <PageHeader
        title={`Namaste, ${parent.parentName.split(" ")[0]}`}
        subtitle={`${parent.childName} · ${parent.childClass} ${parent.section} · ${parent.school}`}
        eyebrow="Parent"
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard label="Attendance" value="94%" tone="success" />
        <StatCard label="Homework done" value={`${child?.homeworkDone ?? 8}/${child?.homeworkTotal ?? 10}`} tone="primary" />
        <StatCard label="This week" value={`${child?.understanding ?? 76}%`} tone="info" hint="understanding" />
      </div>

      <Surface className="mt-5">
        <SectionTitle>This week at school</SectionTitle>
        <div className="space-y-2.5 text-sm">
          <p>• {parent.childName} learned addition up to 20 with sticks and stones.</p>
          <p>• Scored {child?.lastAssessment ?? 74}% in the oral drill.</p>
          <p>• Needs a little practice with carrying numbers.</p>
        </div>
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Written in simple language · also available in Santhali audio (simulated).
        </p>
      </Surface>

      {child ? (
        <Surface className="mt-5">
          <SectionTitle>{parent.childName}'s understanding</SectionTitle>
          <MetricBar label="Overall" value={child.understanding} tone="primary" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill tone="warning">Practice: {child.weakArea}</Pill>
          </div>
        </Surface>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link to="/parent/lessons" className="surface-card flex items-center gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary"><BookOpen className="size-4" /></span>
          <span className="text-sm font-medium">Today's lessons</span>
        </Link>
        <Link to="/parent/feedback" className="surface-card flex items-center gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary"><Bell className="size-4" /></span>
          <span className="text-sm font-medium">Message teacher</span>
        </Link>
      </div>
    </AppLayout>
  );
}
