import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { students } from "@/lib/mock/data";
import { Search } from "lucide-react";

export const Route = createFileRoute("/institute/students")({
  head: () => ({
    meta: [
      { title: "Students — Tribhashniya" },
      { name: "description", content: "Enrolment overview across all classes." },
      { property: "og:title", content: "Students — Tribhashniya" },
      { property: "og:description", content: "Every learner, every class." },
    ],
  }),
  component: InstituteStudentsPage,
});

function InstituteStudentsPage() {
  const { institute, classrooms } = useApp();
  const [query, setQuery] = useState("");
  const list = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const classOf = (id: string) => classrooms.find((c) => c.id === id);

  return (
    <AppLayout role="institute">
      <PageHeader title="Students" subtitle={`${institute.studentCount} enrolled · showing a sample register`} />
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students…" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="mt-4 space-y-2">
        {list.slice(0, 20).map((s) => {
          const c = classOf(s.classroomId);
          return (
            <Surface key={s.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{c?.className} {c?.section} · {c?.subject} · Roll {s.roll}</p>
              </div>
              <span className="font-mono text-xs">{s.understanding}%</span>
              <Pill tone={s.understanding >= 75 ? "success" : s.understanding >= 55 ? "primary" : "warning"}>
                {s.understanding >= 75 ? "Strong" : s.understanding >= 55 ? "Developing" : "Support"}
              </Pill>
            </Surface>
          );
        })}
      </div>
      <Link to="/institute/analytics" className="mt-5 inline-block text-sm font-medium text-primary-deep underline">Open analytics</Link>
    </AppLayout>
  );
}
