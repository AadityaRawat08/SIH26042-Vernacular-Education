import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiBadge, PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { toast } from "sonner";
import { Download, Printer, Wand2 } from "lucide-react";

export const Route = createFileRoute("/teacher/worksheets")({
  head: () => ({
    meta: [
      { title: "Worksheets — Tribhashniya" },
      { name: "description", content: "Generate, edit and print worksheets in two languages." },
      { property: "og:title", content: "Worksheets — Tribhashniya" },
      { property: "og:description", content: "Printable, bilingual worksheets generated from your lessons." },
    ],
  }),
  component: WorksheetsPage,
});

const SAVED = [
  { id: "w1", title: "Understanding roots — practice", cls: "6A · Science", lang: "Santhali + English", items: 8, created: "2 days ago" },
  { id: "w2", title: "Soil around us — fill in the blanks", cls: "5B · EVS", lang: "Hindi + English", items: 10, created: "1 week ago" },
  { id: "w3", title: "Fractions with mangoes", cls: "5B · Maths", lang: "Hindi + English", items: 6, created: "2 weeks ago" },
];

function WorksheetsPage() {
  const { plan } = useApp();
  const [generating, setGenerating] = useState(false);
  const [fresh, setFresh] = useState(false);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setFresh(true);
      toast.success("Worksheet generated (simulated)");
    }, 1400);
  };

  return (
    <AppLayout role="teacher">
      <PageHeader title="Worksheets" subtitle="Printable practice sheets, in the languages your class understands." />

      <Surface className="mt-6">
        <div className="flex items-center justify-between">
          <SectionTitle>Generate new</SectionTitle>
          <AiBadge />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["From last lesson", "From topic", "8 questions", "Bilingual"].map((x, i) => (
            <div key={x} className={`rounded-xl px-3 py-2.5 text-center text-sm font-medium ${i === 0 ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"}`}>{x}</div>
          ))}
        </div>
        <button onClick={generate} disabled={generating} className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-60">
          <Wand2 className="size-4" /> {generating ? "Generating…" : "Generate worksheet"}
        </button>
        {fresh && plan ? (
          <div className="mt-4 rounded-xl border border-primary/25 bg-card p-4">
            <p className="font-display text-base font-semibold">{plan.worksheet.title}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {plan.worksheet.items.map((w) => <li key={w}>{w}</li>)}
            </ol>
          </div>
        ) : null}
      </Surface>

      <div className="mt-6 space-y-3">
        {SAVED.map((w) => (
          <Surface key={w.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{w.title}</p>
              <p className="text-xs text-muted-foreground">{w.cls} · {w.lang} · {w.items} items · {w.created}</p>
            </div>
            <Pill tone="success">Ready</Pill>
            <button onClick={() => toast.success("Sent to print queue (simulated)")} className="grid size-9 place-items-center rounded-full bg-secondary" aria-label="Print worksheet"><Printer className="size-4" /></button>
            <button onClick={() => toast.success("Downloaded (simulated)")} className="grid size-9 place-items-center rounded-full bg-secondary" aria-label="Download worksheet"><Download className="size-4" /></button>
          </Surface>
        ))}
      </div>
    </AppLayout>
  );
}
