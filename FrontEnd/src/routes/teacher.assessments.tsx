import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiBadge, MetricBar, PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { studentsOf } from "@/lib/mock/selectors";
import { languageLabel } from "@/lib/services/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";

export const Route = createFileRoute("/teacher/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments — Tribhashniya" },
      { name: "description", content: "Create AI quizzes, review attempts and track understanding." },
      { property: "og:title", content: "Assessments — Tribhashniya" },
      { property: "og:description", content: "Lightweight assessments with AI generation and class-level insight." },
    ],
  }),
  component: AssessmentsPage,
});

const GENERATED = [
  { q: "2 + 3 = ?", options: ["4", "5", "6", "7"], answer: 1 },
  { q: "ᱵᱟᱨ ᱟᱨ ᱯᱮ ᱡᱚᱲᱟᱣ ᱞᱮ ᱪᱮᱫ ᱦᱩᱭᱩᱜᱼᱟ?", options: ["ᱯᱩᱱ", "ᱢᱚᱬᱮ", "ᱛᱩᱨᱩᱭ", "ᱟᱨᱮ"], answer: 1 },
  { q: "Which is more: 4 + 1 or 3 + 3?", options: ["4 + 1", "3 + 3", "Both equal", "Neither"], answer: 2 },
  { q: "6 + 2 = ?", options: ["7", "8", "9", "10"], answer: 1 },
  { q: "Make 10 using two groups.", options: ["5 + 4", "6 + 4", "7 + 2", "3 + 3"], answer: 1 },
];

function AssessmentsPage() {
  const { classrooms, upcoming } = useApp();
  void upcoming;
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { assessmentsOf } = { assessmentsOf: (id: string) => ASSESSMENT_DATA.filter((a) => a.classroomId === id) };
  const list = useMemo(() => assessmentsOf(classroomId), [classroomId]);
  const students = studentsOf(classroomId);
  const classroom = classrooms.find((c) => c.id === classroomId);

  const generate = () => {
    setCreating(true);
    setTimeout(() => {
      setGenerated(true);
      setCreating(false);
      toast.success("5-question quiz generated (simulated)");
    }, 1500);
  };

  return (
    <AppLayout role="teacher">
      <PageHeader
        title="Assessments"
        subtitle="Generate quizzes from what you taught and see who understood."
        action={
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none">
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.className} {c.section} · {c.subject}</option>
            ))}
          </select>
        }
      />

      <Surface className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Create assessment</h2>
          <AiBadge />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["5 questions", "10 questions", "Quiz", "Worksheet"].map((x, i) => (
            <div key={x} className={cn("rounded-xl px-3 py-2.5 text-center text-sm font-medium", i === 0 ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground")}>{x}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["Easy", "Mixed", "Hard", `${languageLabel(classroom?.language ?? "hi")} + English`].map((x, i) => (
            <div key={x} className={cn("rounded-xl px-3 py-2.5 text-center text-sm font-medium", i === 1 ? "bg-primary/15 text-primary-deep ring-1 ring-primary/30" : "bg-secondary text-muted-foreground")}>{x}</div>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={creating}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> {creating ? "Generating…" : "Generate from recent lessons"}
        </button>

        {generated ? (
          <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Generated quiz · {classroom?.currentTopic} ({classroom?.className} {classroom?.section})</p>
            <ol className="mt-2 space-y-2">
              {GENERATED.map((q, i) => (
                <li key={q.q} className="rounded-lg bg-card p-3 text-sm">
                  <p className="font-medium">{i + 1}. {q.q}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.options.map((o, j) => (
                      <span key={o} className={cn("rounded-full px-2.5 py-0.5 text-xs", j === q.answer ? "bg-success/15 font-medium text-success" : "bg-secondary")}>{o}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <button onClick={() => toast.success(`Quiz assigned to ${classroom?.className} ${classroom?.section} (simulated)`)} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground">Assign to class</button>
              <button onClick={() => toast.success("Downloaded for offline use (simulated)")} className="rounded-full border border-border px-4 py-2 text-xs font-medium"><Download className="mr-1 inline size-3.5" /> Offline copy</button>
            </div>
          </div>
        ) : null}
      </Surface>

      <div className="mt-6 space-y-3">
        {list.map((a) => (
          <Surface key={a.id}>
            <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="flex w-full items-start justify-between gap-3 text-left">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{a.type} · {a.questionCount} questions · {a.date}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Pill tone={a.averageScore >= 70 ? "success" : a.averageScore >= 55 ? "primary" : "warning"}>{a.averageScore >= 70 ? "Evaluated" : "Needs review"}</Pill>
                <span className="font-display text-lg font-semibold">{a.averageScore}%</span>
              </div>
            </button>
            {expanded === a.id ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Student results ({a.attempted}/{students.length} attempted)</p>
                <div className="mt-2 space-y-2.5">
                  {students.slice(0, 8).map((s) => (
                    <MetricBar
                      key={s.id}
                      label={s.name}
                      value={s.lastAssessment}
                      tone={s.lastAssessment < 55 ? "warning" : s.lastAssessment < 70 ? "primary" : "success"}
                    />
                  ))}
                </div>
                <p className="mt-3 rounded-lg bg-primary/8 px-3 py-2 text-xs text-muted-foreground">
                  AI insight (simulated): students below 60% mostly missed the second question — revisit it with a concrete-object example in the mother tongue.
                </p>
              </div>
            ) : null}
          </Surface>
        ))}
        {list.length === 0 ? (
          <Surface className="text-center">
            <p className="text-sm text-muted-foreground">No assessments for this classroom yet. Generate your first quiz above.</p>
          </Surface>
        ) : null}
      </div>

      <Link to="/teacher/progress" className="mt-6 inline-block text-sm font-medium text-primary-deep underline">
        Open full progress view
      </Link>
    </AppLayout>
  );
}

import { assessments as ASSESSMENT_DATA } from "@/lib/mock/data";
