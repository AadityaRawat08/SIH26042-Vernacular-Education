import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricBar, PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { instituteTeachers } from "@/lib/mock/data";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/institute/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers — Tribhashniya" },
      { name: "description", content: "Teacher roster, workload and AI usage." },
      { property: "og:title", content: "Teachers — Tribhashniya" },
      { property: "og:description", content: "Who teaches what, and how it's going." },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <AppLayout role="institute">
      <PageHeader
        title="Teachers"
        subtitle="Roster, classes and planning activity."
        action={
          <button onClick={() => setShowAdd((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground">
            <UserPlus className="size-3.5" /> Add teacher
          </button>
        }
      />

      {showAdd ? (
        <Surface className="mt-5">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <input placeholder="Full name" className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none" />
            <input placeholder="Subjects (e.g. Maths, EVS)" className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none" />
            <input placeholder="Mobile number" className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none" />
          </div>
          <button onClick={() => { setShowAdd(false); toast.success("Invite sent (simulated)"); }} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground">
            Send invite
          </button>
        </Surface>
      ) : null}

      <div className="mt-5 space-y-3">
        {instituteTeachers.map((t) => (
          <Surface key={t.id} className="flex flex-wrap items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 font-display text-sm font-semibold text-primary-deep">
              {t.name.split(" ").map((p) => p[0]).join("")}
            </span>
            <div className="min-w-40 flex-1">
              <p className="font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.subjects} · Classes {t.classes}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.activity}</p>
            </div>
            <div className="w-36">
              <MetricBar label="Class avg" value={t.progress} tone={t.progress >= 75 ? "success" : "primary"} />
            </div>
            <Pill tone="success">Active</Pill>
          </Surface>
        ))}
      </div>
    </AppLayout>
  );
}
