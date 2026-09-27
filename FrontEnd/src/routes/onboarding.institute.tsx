import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { BOARDS } from "@/lib/mock/data";
import { ChipGroup, Field, OnboardingShell, StepNav, StepProgress, TextField } from "@/components/onboarding/Stepper";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/institute")({
  head: () => ({
    meta: [
      { title: "Institute setup — Tribhashniya" },
      { name: "description", content: "Register your school: board, classes, sections, teachers and infrastructure." },
      { property: "og:title", content: "Institute setup — Tribhashniya" },
      { property: "og:description", content: "Set up your school before managing teachers and classes." },
    ],
  }),
  component: InstituteOnboarding,
});

const LABELS = ["Institute details", "Classes and people", "Infrastructure"];

function InstituteOnboarding() {
  const { institute, set } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(institute);
  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key: "classes" | "sections" | "infrastructure", v: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  return (
    <OnboardingShell>
      <StepProgress step={step} total={3} label={LABELS[step - 1] ?? ""} />
      <div className="mt-6 space-y-5">
        {step === 1 ? (
          <>
            <Field label="Institute name">
              <TextField value={form.name} onChange={(v) => update({ name: v, logoText: v.slice(0, 3).toUpperCase() })} />
            </Field>
            <Field label="Logo" hint="Upload is simulated — initials are used for now">
              <span className="grid size-14 place-items-center rounded-xl bg-ink font-display text-lg font-semibold text-ink-foreground">
                {form.logoText}
              </span>
            </Field>
            <Field label="Board">
              <ChipGroup options={BOARDS} single selected={[form.board]} onToggle={(v) => update({ board: v })} />
            </Field>
            <Field label="Address">
              <TextField value={form.address} onChange={(v) => update({ address: v })} />
            </Field>
            <Field label="District">
              <TextField value={form.district} onChange={(v) => update({ district: v })} />
            </Field>
            <Field label="School type">
              <ChipGroup
                options={["Government Primary", "Government Upper Primary", "Aided", "Private"]}
                single
                selected={[form.schoolType]}
                onToggle={(v) => update({ schoolType: v })}
              />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="Classes available">
              <ChipGroup
                options={["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]}
                selected={form.classes}
                onToggle={(v) => toggle("classes", v)}
              />
            </Field>
            <Field label="Sections">
              <ChipGroup options={["A", "B", "C", "D"]} selected={form.sections} onToggle={(v) => toggle("sections", v)} />
            </Field>
            <Field label="Number of teachers">
              <TextField value={String(form.teacherCount)} onChange={(v) => update({ teacherCount: Number(v) || 0 })} />
            </Field>
            <Field label="Number of students">
              <TextField value={String(form.studentCount)} onChange={(v) => update({ studentCount: Number(v) || 0 })} />
            </Field>
            <Field label="Academic year">
              <TextField value={form.academicYear} onChange={(v) => update({ academicYear: v })} />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <Field label="Available infrastructure">
            <ChipGroup
              options={[
                "Blackboard",
                "Speaker",
                "Projector",
                "Smart board",
                "Library corner",
                "Computer lab",
                "Mid-day meal kitchen",
                "Playground",
              ]}
              selected={form.infrastructure}
              onToggle={(v) => toggle("infrastructure", v)}
            />
          </Field>
        ) : null}
      </div>

      <StepNav
        backDisabled={step === 1}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onNext={() => {
          if (step === 3) {
            set({ institute: form, onboarded: true });
            toast.success("Institute registered");
            navigate({ to: "/institute" });
          } else setStep((s) => s + 1);
        }}
        nextLabel={step === 3 ? "Open institute dashboard" : "Continue"}
      />
    </OnboardingShell>
  );
}
