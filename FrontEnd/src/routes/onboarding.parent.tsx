import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { ChipGroup, Field, OnboardingShell, StepNav, StepProgress, TextField } from "@/components/onboarding/Stepper";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/parent")({
  head: () => ({
    meta: [
      { title: "Parent setup — Tribhashniya" },
      { name: "description", content: "Link your child so you can follow lessons, homework and progress." },
      { property: "og:title", content: "Parent setup — Tribhashniya" },
      { property: "og:description", content: "Follow your child's daily learning and teacher feedback." },
    ],
  }),
  component: ParentOnboarding,
});

function ParentOnboarding() {
  const { parent, set } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(parent);
  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <OnboardingShell>
      <StepProgress step={step} total={2} label={step === 1 ? "About you" : "About your child"} />
      <div className="mt-6 space-y-5">
        {step === 1 ? (
          <>
            <Field label="Your name">
              <TextField value={form.parentName} onChange={(v) => update({ parentName: v })} />
            </Field>
            <Field label="Relationship to child">
              <ChipGroup
                options={["Father", "Mother", "Guardian"]}
                single
                selected={[form.relationship]}
                onToggle={(v) => update({ relationship: v })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Child's name">
              <TextField value={form.childName} onChange={(v) => update({ childName: v })} />
            </Field>
            <Field label="Class">
              <ChipGroup
                options={["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]}
                single
                selected={[form.childClass]}
                onToggle={(v) => update({ childClass: v })}
              />
            </Field>
            <Field label="Section">
              <ChipGroup options={["A", "B", "C"]} single selected={[form.section]} onToggle={(v) => update({ section: v })} />
            </Field>
            <Field label="School">
              <TextField value={form.school} onChange={(v) => update({ school: v })} />
            </Field>
          </>
        )}
      </div>
      <StepNav
        backDisabled={step === 1}
        onBack={() => setStep(1)}
        onNext={() => {
          if (step === 2) {
            set({ parent: form, onboarded: true });
            toast.success("Child linked");
            navigate({ to: "/parent" });
          } else setStep(2);
        }}
        nextLabel={step === 2 ? "Open parent home" : "Continue"}
      />
    </OnboardingShell>
  );
}
