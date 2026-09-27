import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { ACTIVITY_TYPES, BOARDS, LANGUAGES, RESOURCE_OPTIONS } from "@/lib/mock/data";
import { ChipGroup, Field, OnboardingShell, StepNav, StepProgress, TextField } from "@/components/onboarding/Stepper";
import { toast } from "sonner";
import type { LanguageCode } from "@/lib/types";

export const Route = createFileRoute("/onboarding/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher setup — Tribhashniya" },
      { name: "description", content: "Set up your teaching profile, languages, classroom resources and preferences." },
      { property: "og:title", content: "Teacher setup — Tribhashniya" },
      { property: "og:description", content: "Four quick steps to personalise every generated period plan." },
    ],
  }),
  component: TeacherOnboarding,
});

const STEP_LABELS = [
  "Tell us about you",
  "Your teaching work",
  "Languages in your classroom",
  "Classroom and preferences",
];

function TeacherOnboarding() {
  const { teacher, set, mobile } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...teacher, mobile: mobile || teacher.mobile });

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key: "subjects" | "classes" | "sections" | "skills" | "resources" | "activityTypes", v: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v],
    }));
  const toggleLang = (code: LanguageCode) =>
    setForm((f) => ({
      ...f,
      spokenLanguages: f.spokenLanguages.includes(code)
        ? f.spokenLanguages.filter((c) => c !== code)
        : [...f.spokenLanguages, code],
    }));

  const finish = () => {
    set({ teacher: form, onboarded: true });
    toast.success("Profile saved");
    navigate({ to: "/teacher" });
  };

  return (
    <OnboardingShell>
      <StepProgress step={step} total={4} label={STEP_LABELS[step - 1] ?? ""} />

      <div className="mt-6 space-y-5">
        {step === 1 ? (
          <>
            <Field label="Full name">
              <TextField value={form.fullName} onChange={(v) => update({ fullName: v })} />
            </Field>
            <Field label="Mobile number">
              <TextField value={form.mobile} onChange={(v) => update({ mobile: v })} />
            </Field>
            <Field label="Profile photo" hint="Optional — upload is simulated in this prototype">
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-full bg-secondary font-display text-lg font-semibold">
                  {form.fullName.slice(0, 1)}
                </span>
                <button
                  onClick={() => toast.info("Photo upload will be wired to storage later")}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm"
                >
                  Upload photo
                </button>
              </div>
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="School / Institute name">
              <TextField value={form.school} onChange={(v) => update({ school: v })} />
            </Field>
            <Field label="Board">
              <ChipGroup options={BOARDS} selected={[form.board]} single onToggle={(v) => update({ board: v })} />
            </Field>
            <Field label="Teaching experience (years)">
              <TextField
                value={String(form.experienceYears)}
                onChange={(v) => update({ experienceYears: Number(v) || 0 })}
              />
            </Field>
            <Field label="Qualification">
              <TextField value={form.qualification} onChange={(v) => update({ qualification: v })} />
            </Field>
            <Field label="Subjects">
              <ChipGroup
                options={["Mathematics", "EVS", "Hindi", "English", "Science"]}
                selected={form.subjects}
                onToggle={(v) => toggle("subjects", v)}
              />
            </Field>
            <Field label="Classes taught">
              <ChipGroup
                options={["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]}
                selected={form.classes}
                onToggle={(v) => toggle("classes", v)}
              />
            </Field>
            <Field label="Sections taught">
              <ChipGroup options={["A", "B", "C"]} selected={form.sections} onToggle={(v) => toggle("sections", v)} />
            </Field>
            <Field label="Skills">
              <ChipGroup
                options={[
                  "Multi-grade teaching",
                  "Mother-tongue instruction",
                  "Activity based learning",
                  "Remedial teaching",
                ]}
                selected={form.skills}
                onToggle={(v) => toggle("skills", v)}
              />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label="Languages you can speak">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    disabled={!l.available}
                    onClick={() => toggleLang(l.code)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      form.spokenLanguages.includes(l.code)
                        ? "border-transparent bg-ink text-ink-foreground"
                        : "border-border bg-card"
                    } ${!l.available ? "opacity-40" : ""}`}
                  >
                    {l.label} <span className="text-xs opacity-70">{l.nativeLabel}</span>
                    {!l.available ? <span className="ml-1 text-[10px]">soon</span> : null}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Preferred interface language">
              <ChipGroup
                options={["English", "Hindi", "Santhali"]}
                single
                selected={[{ en: "English", hi: "Hindi", sat: "Santhali", ho: "Ho", mun: "Mundari" }[form.interfaceLanguage]]}
                onToggle={(v) =>
                  update({ interfaceLanguage: (v === "Hindi" ? "hi" : v === "Santhali" ? "sat" : "en") as LanguageCode })
                }
              />
            </Field>
            <Field label="Language you normally teach in">
              <ChipGroup
                options={["English", "Hindi", "Santhali"]}
                single
                selected={[{ en: "English", hi: "Hindi", sat: "Santhali", ho: "Ho", mun: "Mundari" }[form.teachingLanguage]]}
                onToggle={(v) =>
                  update({ teachingLanguage: (v === "Hindi" ? "hi" : v === "Santhali" ? "sat" : "en") as LanguageCode })
                }
              />
            </Field>
            <Field label="Can you teach in the students' mother tongue?">
              <ChipGroup
                options={["Yes", "Partly", "No"]}
                single
                selected={[form.motherTongueCapable ? "Yes" : "No"]}
                onToggle={(v) => update({ motherTongueCapable: v !== "No" })}
              />
            </Field>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Field label="Number of students (largest class)">
              <TextField value={String(form.studentCount)} onChange={(v) => update({ studentCount: Number(v) || 0 })} />
            </Field>
            <Field label="Available classroom resources">
              <ChipGroup options={RESOURCE_OPTIONS} selected={form.resources} onToggle={(v) => toggle("resources", v)} />
            </Field>
            <Field label="Internet availability">
              <ChipGroup
                options={["Available", "Weak", "Mostly offline"]}
                single
                selected={[form.internet === "online" ? "Available" : form.internet === "weak" ? "Weak" : "Mostly offline"]}
                onToggle={(v) =>
                  update({ internet: v === "Available" ? "online" : v === "Weak" ? "weak" : "offline" })
                }
              />
            </Field>
            <Field label="Preferred teaching style">
              <ChipGroup
                options={["Activity first, then explanation", "Explain then practice", "Story based", "Drill based"]}
                single
                selected={[form.teachingStyle]}
                onToggle={(v) => update({ teachingStyle: v })}
              />
            </Field>
            <Field label="Typical period duration">
              <ChipGroup
                options={["20 min", "30 min", "40 min", "45 min", "60 min"]}
                single
                selected={[`${form.periodDuration} min`]}
                onToggle={(v) => update({ periodDuration: parseInt(v, 10) })}
              />
            </Field>
            <Field label="Preferred activity types">
              <ChipGroup
                options={ACTIVITY_TYPES}
                selected={form.activityTypes}
                onToggle={(v) => toggle("activityTypes", v)}
              />
            </Field>
            <div className="flex gap-2">
              <ChipGroup
                options={["Audio support", "Video support"]}
                selected={[
                  ...(form.audioEnabled ? ["Audio support"] : []),
                  ...(form.videoEnabled ? ["Video support"] : []),
                ]}
                onToggle={(v) =>
                  v === "Audio support"
                    ? update({ audioEnabled: !form.audioEnabled })
                    : update({ videoEnabled: !form.videoEnabled })
                }
              />
            </div>
          </>
        ) : null}
      </div>

      <StepNav
        backDisabled={step === 1}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onNext={() => (step === 4 ? finish() : setStep((s) => s + 1))}
        nextLabel={step === 4 ? "Finish setup" : "Continue"}
      />
      <p className="mt-4 text-center text-xs text-muted-foreground">You can edit all of this later in Settings.</p>
    </OnboardingShell>
  );
}
