import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { LiveBlackboard } from "@/components/blackboard/LiveBlackboard";
import { useApp } from "@/lib/app-state";
import { generateBlackboard, type BoardSession } from "@/lib/services/blackboard";

export const Route = createFileRoute("/teacher/blackboard")({
  head: () => ({
    meta: [
      { title: "Blackboard history — Tribhashniya" },
      { name: "description", content: "Open the blackboard you used in an earlier class, replay it step by step, or reuse it with another section." },
      { property: "og:title", content: "Blackboard history — Tribhashniya" },
      { property: "og:description", content: "Replay and reuse saved classroom blackboards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlackboardHistory,
});

function BlackboardHistory() {
  const { boards, classrooms } = useApp();
  const saved = boards ?? [];
  const [open, setOpen] = useState<BoardSession | null>(null);
  const [step, setStep] = useState(0);

  return (
    <AppLayout role="teacher">
      <div className="space-y-4">
        {open ? (
          <Surface>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">
                {open.topic} · {open.className} {open.section}
              </h2>
              <button onClick={() => setOpen(null)} className="rounded-full border border-border px-4 py-2 text-xs font-medium">
                Close
              </button>
            </div>
            <div className="mt-3">
              <LiveBlackboard session={open} onSessionChange={setOpen} stepIndex={step} onStepChange={setStep} />
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Reuse this blackboard</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    setStep(0);
                    toast.info("Replaying from step 1");
                  }}
                  className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground"
                >
                  Replay lesson
                </button>
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setOpen(
                        generateBlackboard({
                          className: c.className,
                          section: c.section,
                          subject: c.subject,
                          topic: open.topic,
                          templateId: open.templateId,
                        }),
                      );
                      setStep(0);
                      toast.success(`Blackboard prepared for ${c.className} ${c.section}`);
                    }}
                    className="rounded-full border border-border px-4 py-2 text-xs font-medium"
                  >
                    Reuse for {c.className} {c.section}
                  </button>
                ))}
              </div>
            </div>
          </Surface>
        ) : null}

        <section>
          <SectionTitle meta={`${saved.length} saved`}>Previous blackboards</SectionTitle>
          <div className="space-y-2.5">
            {saved.map((b) => (
              <button
                key={b.takenAt}
                onClick={() => {
                  setOpen(b.session);
                  setStep(0);
                }}
                className="card-lift w-full rounded-2xl border border-border bg-card p-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-base font-semibold">{b.topic}</p>
                  <Pill tone="primary">
                    {b.className} {b.section}
                  </Pill>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(b.takenAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.stepsShown} of {b.totalSteps} steps shown · {b.questionsAsked.length} questions · {b.annotations} annotations
                </p>
              </button>
            ))}
            {!saved.length ? (
              <p className="surface-card p-5 text-sm text-muted-foreground">
                No saved blackboards yet. Finish a live class and the final board is stored here for review and reuse.{" "}
                <Link to="/teacher/live" className="font-semibold text-primary">
                  Start a class
                </Link>
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
