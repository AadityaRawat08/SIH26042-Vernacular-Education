import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClassrooms } from "@/lib/classrooms.functions";
import { listSavedPlans, savePeriodPlan } from "@/lib/plans.functions";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { ChipGroup, Field, TextField } from "@/components/onboarding/Stepper";
import { useApp } from "@/lib/app-state";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, RESOURCE_OPTIONS, curriculum } from "@/lib/mock/data";
import { GENERATION_STAGES, generatePeriodPlan } from "@/lib/services/ai";
import type { Connectivity, LanguageCode, PlanBlock, StudentLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/teacher/planner/")({
  head: () => ({
    meta: [
      { title: "AI Period Planner — Tribhashniya" },
      {
        name: "description",
        content: "Choose class, topic, language, duration and classroom conditions — AI generates the whole period plan.",
      },
      { property: "og:title", content: "AI Period Planner — Tribhashniya" },
      {
        property: "og:description",
        content: "Generate what to teach in a period and exactly how to teach it.",
      },
    ],
  }),
  component: PlannerPage,
});

const BLOCKS: { key: PlanBlock; label: string }[] = [
  { key: "explanation", label: "Explanation" },
  { key: "script", label: "Teacher script" },
  { key: "examples", label: "Examples" },
  { key: "localExamples", label: "Local examples" },
  { key: "activity", label: "Activity" },
  { key: "story", label: "Story" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
  { key: "visuals", label: "Visuals" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "questions", label: "Questions" },
  { key: "worksheet", label: "Worksheet" },
  { key: "assessment", label: "Assessment" },
  { key: "homework", label: "Homework" },
  { key: "remedial", label: "Remedial activity" },
  { key: "advanced", label: "Advanced activity" },
  { key: "blackboard", label: "Blackboard plan" },
];

const STEPS = [
  "Class",
  "Section",
  "Subject",
  "Chapter",
  "Topic",
  "Language",
  "Duration",
  "Contents",
  "Classroom",
];

function PlannerPage() {
  const { savePlan, teacher } = useApp();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [classroomId, setClassroomId] = useState<string>("");
  const savePlanToDb = useServerFn(savePeriodPlan);
  const { session } = useAuth();
  const fetchClassrooms = useServerFn(listClassrooms);
  const fetchSavedPlans = useServerFn(listSavedPlans);

  const { data: classrooms = [] } = useQuery({
    queryKey: ["classrooms"],
    queryFn: () => fetchClassrooms(),
    enabled: Boolean(session),
  });
  const { data: savedPlans = [] } = useQuery({
    queryKey: ["saved-plans"],
    queryFn: () => fetchSavedPlans(),
    enabled: Boolean(session),
  });


  const [form, setForm] = useState({
    className: "Class 2",
    section: "A",
    subject: "Mathematics",
    chapter: "Chapter 3 — Adding numbers",
    topic: "Addition",
    language: "sat" as LanguageCode,
    durationMin: 40,
    blocks: ["explanation", "script", "activity", "audio", "vocabulary", "questions", "assessment", "blackboard"] as PlanBlock[],
    resources: ["Blackboard", "Chalk", "Notebook", "Classroom objects", "Teacher smartphone"],
    internet: "weak" as Connectivity,
    studentLevel: "mixed" as StudentLevel,
    note: "Students are weak in addition. Use simple examples and physical activities.",
  });
  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const chapters = curriculum.filter((c) => c.className === form.className);
  const topics = chapters.flatMap((c) => c.lessons.flatMap((l) => l.topics));

  // Keep the form pointed at a real saved classroom.
  useEffect(() => {
    if (classroomId || classrooms.length === 0) return;
    const first = classrooms[0];
    if (!first) return;
    setClassroomId(first.id);
    setForm((f) => ({ ...f, className: first.className, section: first.section, subject: first.subject }));
  }, [classrooms, classroomId]);

  const selectClassroom = (id: string) => {
    const room = classrooms.find((c) => c.id === id);
    if (!room) return;
    setClassroomId(id);
    update({ className: room.className, section: room.section, subject: room.subject });
  };

  const run = () => {
    setGenerating(true);
    setStage(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setStage(i);
      if (i >= GENERATION_STAGES.length) {
        clearInterval(timer);
        const generated = generatePeriodPlan(form);
        savePlan(generated);
        if (!classroomId) {
          toast.error("Add a class first, then generate a plan.");
          setTimeout(() => navigate({ to: "/teacher/planner/plan", search: { id: undefined } }), 400);
          return;
        }
        savePlanToDb({
          data: {
            classroomId,
            chapter: form.chapter,
            topic: form.topic,
            language: form.language,
            durationMin: form.durationMin,
            resources: form.resources,
            requirements: form.blocks,
            studentLevel: form.studentLevel,
            teacherNote: form.note,
            plan: generated,
          },
        })
          .then((res) => navigate({ to: "/teacher/planner/plan", search: { id: res.id } }))
          .catch(() => {
            toast.error("Could not save the plan. Showing it anyway.");
            navigate({ to: "/teacher/planner/plan", search: { id: undefined } });
          });
      }
    }, 420);
  };

  if (generating) {
    return (
      <AppLayout role="teacher">
        <div className="mx-auto max-w-lg py-10">
          <Surface className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-6 animate-pulse" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold">Generating your teaching plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.className} · Section {form.section} · {form.topic} · {form.durationMin} min
            </p>
            <ul className="mt-6 space-y-2 text-left">
              {GENERATION_STAGES.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    i < stage ? "text-foreground" : "text-muted-foreground/50",
                    i === stage && "bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      i < stage ? "bg-success text-success-foreground" : "bg-muted",
                    )}
                  >
                    {i < stage ? <Check className="size-3" /> : null}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(stage / GENERATION_STAGES.length) * 100}%` }}
              />
            </div>
          </Surface>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="teacher">
      <PageHeader
        eyebrow="AI Period Planner"
        title="What should I teach this period?"
        subtitle="AI reads the approved curriculum, your class history and your classroom conditions, then writes the whole period — explanation, script, activity, language support and assessment."
      />

      <div className="mt-5 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <Pill key={s}>
            {i + 1}. {s}
          </Pill>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Surface className="space-y-5">
            <SectionTitle meta="Steps 1–5">Curriculum</SectionTitle>
            <Field label="Which class?" hint="Your saved classes">
              <div className="flex flex-wrap gap-2">
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectClassroom(c.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm",
                      classroomId === c.id ? "border-transparent bg-ink text-ink-foreground" : "border-border bg-card",
                    )}
                  >
                    {c.className} · {c.section} <span className="opacity-70">{c.subject}</span>
                  </button>
                ))}
                {classrooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add a class first to save plans.</p>
                ) : null}
              </div>
            </Field>
            <Field label="Chapter / Lesson">
              <ChipGroup
                options={chapters.length ? chapters.map((c) => c.chapter) : [form.chapter]}
                single
                selected={[form.chapter]}
                onToggle={(v) => update({ chapter: v })}
              />
            </Field>
            <Field label="Topic">
              <ChipGroup
                options={topics.length ? Array.from(new Set(topics)) : [form.topic]}
                single
                selected={[form.topic]}
                onToggle={(v) => update({ topic: v })}
              />
            </Field>
          </Surface>

          <Surface className="space-y-5">
            <SectionTitle meta="Steps 6–7">Language and duration</SectionTitle>
            <Field label="Teaching language" hint="More languages are being added — Ho and Mundari are coming.">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    disabled={!l.available}
                    onClick={() => update({ language: l.code })}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm",
                      form.language === l.code ? "border-transparent bg-ink text-ink-foreground" : "border-border bg-card",
                      !l.available && "opacity-40",
                    )}
                  >
                    {l.label} <span className="opacity-70">{l.nativeLabel}</span>
                    {!l.available ? <span className="ml-1 text-[10px] uppercase">soon</span> : null}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Period duration">
              <ChipGroup
                options={["20 min", "30 min", "40 min", "45 min", "60 min"]}
                single
                selected={[`${form.durationMin} min`]}
                onToggle={(v) => update({ durationMin: parseInt(v, 10) })}
              />
            </Field>
          </Surface>

          <Surface>
            <SectionTitle meta="Step 8">What should this period include?</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BLOCKS.map((b) => {
                const active = form.blocks.includes(b.key);
                return (
                  <button
                    key={b.key}
                    onClick={() =>
                      update({
                        blocks: active ? form.blocks.filter((x) => x !== b.key) : [...form.blocks, b.key],
                      })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      active ? "border-primary bg-primary/10 font-medium" : "border-border bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {active ? <Check className="size-3" /> : null}
                    </span>
                    {b.label}
                  </button>
                );
              })}
            </div>
          </Surface>

          <Surface className="space-y-5">
            <SectionTitle meta="Step 9">Classroom conditions</SectionTitle>
            <Field label="Available in the classroom">
              <ChipGroup
                options={RESOURCE_OPTIONS}
                selected={form.resources}
                onToggle={(v) =>
                  update({
                    resources: form.resources.includes(v)
                      ? form.resources.filter((r) => r !== v)
                      : [...form.resources, v],
                  })
                }
              />
            </Field>
            <Field label="Internet">
              <ChipGroup
                options={["Available", "Weak", "Offline"]}
                single
                selected={[form.internet === "online" ? "Available" : form.internet === "weak" ? "Weak" : "Offline"]}
                onToggle={(v) => update({ internet: v === "Available" ? "online" : v === "Weak" ? "weak" : "offline" })}
              />
            </Field>
            <Field label="Student level">
              <ChipGroup
                options={["Beginner", "Average", "Advanced", "Mixed"]}
                single
                selected={[form.studentLevel.charAt(0).toUpperCase() + form.studentLevel.slice(1)]}
                onToggle={(v) => update({ studentLevel: v.toLowerCase() as StudentLevel })}
              />
            </Field>
            <Field label="What else should AI consider?" hint="Optional">
              <textarea
                value={form.note}
                onChange={(e) => update({ note: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </Surface>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Surface>
            <SectionTitle>Summary</SectionTitle>
            <dl className="space-y-2 text-sm">
              <Row label="Class / Section" value={`${form.className} · ${form.section}`} />
              <Row label="Subject" value={form.subject} />
              <Row label="Topic" value={form.topic} />
              <Row label="Duration" value={`${form.durationMin} min`} />
              <Row label="Language" value={LANGUAGES.find((l) => l.code === form.language)?.label ?? ""} />
              <Row label="Contents" value={`${form.blocks.length} sections`} />
              <Row label="Internet" value={form.internet} />
              <Row label="Level" value={form.studentLevel} />
            </dl>
            <button
              onClick={run}
              className="mt-4 w-full rounded-full bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground"
            >
              Generate AI teaching plan
            </button>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Uses your saved profile: {teacher.teachingStyle.toLowerCase()}.
            </p>
          </Surface>

          {savedPlans.length ? (
            <Surface className="mt-4">
              <SectionTitle>Your saved plans</SectionTitle>
              <ul className="space-y-2">
                {savedPlans.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/teacher/planner/plan"
                      search={{ id: p.id }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                    >
                      <span className="font-medium">{p.topic}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.className} · {p.section}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Surface>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}
