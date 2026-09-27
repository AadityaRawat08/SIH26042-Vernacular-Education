import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — Tribhashniya" },
      { name: "description", content: "Answers to common questions about plans, languages and offline use." },
      { property: "og:title", content: "Help — Tribhashniya" },
      { property: "og:description", content: "Quick answers, in plain words." },
    ],
  }),
  component: HelpPage,
});

const FAQS = [
  { q: "How does the AI Period Planner work?", a: "Tell it the class, subject, chapter and topic. It builds a 9-part plan — objectives, timeline, script, vocabulary, activity, blackboard plan, questions, worksheet and assessment — matched to your students' level and languages." },
  { q: "Which languages are supported?", a: "Hindi, Santhali and English in this prototype. More Indian languages (Ho, Mundari and others) are planned via BHASHINI integration." },
  { q: "Can I use it without internet?", a: "Yes. Download lesson packs from Offline & Sync. Plans, scripts, worksheets and recordings work offline; attendance and corrections sync when you reconnect." },
  { q: "The translation sounds wrong. What do I do?", a: "Open Language library → Corrections. Edit the translation and mark it correct. Your correction is remembered and improves future translations." },
  { q: "Is my students' data safe?", a: "In this prototype everything stays on your device. In the production app, data would be encrypted and only you and your institute would see it." },
];

function HelpPage() {
  const { role } = useApp();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <AppLayout role={role ?? "teacher"}>
      <PageHeader title="Help & support" subtitle="Short answers, no jargon." />
      <div className="mt-6 space-y-2.5">
        {FAQS.map((f, i) => (
          <Surface key={f.q} className="p-0">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <p className="text-sm font-semibold">{f.q}</p>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i ? <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p> : null}
          </Surface>
        ))}
      </div>
      <Surface className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">Still stuck? In the full app you'd reach a real person here.</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">support@tribhashniya.demo</p>
      </Surface>
    </AppLayout>
  );
}
