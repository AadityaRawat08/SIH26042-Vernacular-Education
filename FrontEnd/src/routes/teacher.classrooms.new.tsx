import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/ui-kit";
import { createClassroom } from "@/lib/classrooms.functions";
import { toast } from "sonner";
import type { LanguageCode } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/teacher/classrooms/new")({
  head: () => ({ meta: [
    { title: "Add a classroom — Tribhashniya" },
    { name: "description", content: "Create a classroom in five clear steps." },
    { property: "og:title", content: "Add a classroom — Tribhashniya" },
    { property: "og:description", content: "A quick, guided classroom setup." },
  ] }),
  component: NewClassroom,
});

const steps = ["Class", "Section", "Subjects", "Students", "Teaching", "Support"];
const classes = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
const sections = ["A", "B", "C"];
const subjects = ["Mathematics", "EVS", "Hindi", "English"];
const languages: Array<{ code: LanguageCode; label: string }> = [{ code: "hi", label: "Hindi" }, { code: "sat", label: "Santhali" }, { code: "en", label: "English" }, { code: "ho", label: "Ho" }, { code: "mun", label: "Mundari" }];

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("relative min-h-20 rounded-2xl border p-4 text-left text-base font-semibold transition active:scale-[0.98]", selected ? "border-primary bg-primary/12 text-foreground shadow-[var(--shadow-card)]" : "border-border bg-card hover:border-primary/50")}>
    {children}{selected ? <Check className="absolute right-3 top-3 size-4" /> : null}
  </button>;
}

function NewClassroom() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addClassroom = useServerFn(createClassroom);
  const { loading, session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ className: "Class 2", section: "A", subjects: ["Mathematics", "EVS", "Hindi"], studentCount: 24, teachingLanguage: "hi" as LanguageCode, supportLanguage: "sat" as LanguageCode });
  const update = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));
  const create = async () => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    try {
      const created = await addClassroom({
        data: {
          className: form.className,
          section: form.section,
          subject: form.subjects.join(" • "),
          studentCount: form.studentCount,
          language: form.teachingLanguage,
          supportLanguage: form.supportLanguage,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["classrooms"] });
      toast.success("Classroom created");
      navigate({ to: "/teacher/classrooms/$classroomId", params: { classroomId: created.id } });
    } catch {
      toast.error("Could not create the classroom. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return <AppLayout role="teacher">
    <Link to="/teacher/classrooms" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" /> Back to Classes</Link>
    <PageHeader eyebrow={`Step ${step + 1} of ${steps.length}`} title="Add a Classroom" subtitle="Make one simple choice at a time." />

    <div className="mt-6 flex gap-2" aria-label="Setup progress">{steps.map((label, i) => <div key={label} className="min-w-0 flex-1"><div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-secondary")} /><p className={cn("mt-2 truncate text-[11px]", i === step ? "font-semibold" : "text-muted-foreground")}>{label}</p></div>)}</div>

    <section className="mx-auto mt-8 max-w-3xl rounded-4xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-8">
      {step === 0 ? <><h2 className="font-display text-2xl font-semibold">Which class?</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{classes.map((item) => <Choice key={item} selected={form.className === item} onClick={() => update({ className: item })}>{item}</Choice>)}</div></> : null}
      {step === 1 ? <><h2 className="font-display text-2xl font-semibold">Which section?</h2><div className="mt-5 grid grid-cols-3 gap-3">{sections.map((item) => <Choice key={item} selected={form.section === item} onClick={() => update({ section: item })}><span className="block text-center text-2xl">{item}</span></Choice>)}</div></> : null}
      {step === 2 ? <><h2 className="font-display text-2xl font-semibold">What will you teach?</h2><p className="mt-1 text-sm text-muted-foreground">Choose one or more subjects.</p><div className="mt-5 grid grid-cols-2 gap-3">{subjects.map((item) => <Choice key={item} selected={form.subjects.includes(item)} onClick={() => update({ subjects: form.subjects.includes(item) ? form.subjects.filter((s) => s !== item) : [...form.subjects, item] })}>{item}</Choice>)}</div></> : null}
      {step === 3 ? <><h2 className="font-display text-2xl font-semibold">How many students?</h2><div className="mt-8 flex items-center justify-center gap-6"><button onClick={() => update({ studentCount: Math.max(1, form.studentCount - 1) })} className="grid size-14 place-items-center rounded-full bg-secondary" aria-label="Remove student"><Minus className="size-5" /></button><div className="min-w-28 text-center"><p className="font-display text-6xl font-semibold">{form.studentCount}</p><p className="text-sm text-muted-foreground">students</p></div><button onClick={() => update({ studentCount: form.studentCount + 1 })} className="grid size-14 place-items-center rounded-full bg-ink text-ink-foreground" aria-label="Add student"><Plus className="size-5" /></button></div></> : null}
      {step === 4 ? <><h2 className="font-display text-2xl font-semibold">Teaching language</h2><p className="mt-1 text-sm text-muted-foreground">Which language will you mainly teach in?</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{languages.map((item) => <Choice key={item.code} selected={form.teachingLanguage === item.code} onClick={() => update({ teachingLanguage: item.code })}>{item.label}</Choice>)}</div></> : null}
      {step === 5 ? <><h2 className="font-display text-2xl font-semibold">Support language</h2><p className="mt-1 text-sm text-muted-foreground">Choose the language that helps students understand.</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{languages.map((item) => <Choice key={item.code} selected={form.supportLanguage === item.code} onClick={() => update({ supportLanguage: item.code })}>{item.label}</Choice>)}</div></> : null}

      <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] gap-3 sm:flex sm:justify-between">
        <button onClick={() => step === 0 ? navigate({ to: "/teacher/classrooms" }) : setStep((s) => s - 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"><ArrowLeft className="size-4" /> Back</button>
        <button disabled={saving || loading || (step === 2 && form.subjects.length === 0)} onClick={() => step === steps.length - 1 ? void create() : setStep((s) => s + 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-ink-foreground disabled:opacity-50">{step === steps.length - 1 ? (saving ? "Creating…" : "Create classroom") : "Continue"}<ArrowRight className="size-4" /></button>
      </div>
    </section>
  </AppLayout>;
}
