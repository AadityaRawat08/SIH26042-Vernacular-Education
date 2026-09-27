import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AiBadge, PageHeader, Pill, StatCard, Surface } from "@/components/common/ui-kit";
import { corrections, vocabulary } from "@/lib/mock/data";
import { toast } from "sonner";
import { Check, Edit3, Languages, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/language")({
  head: () => ({
    meta: [
      { title: "Language library — Tribhashniya" },
      { name: "description", content: "Vocabulary, corrections and verified translations your classes rely on." },
      { property: "og:title", content: "Language library — Tribhashniya" },
      { property: "og:description", content: "Your verified words and corrections, growing with every class." },
    ],
  }),
  component: LanguagePage,
});

function LanguagePage() {
  const [tab, setTab] = useState<"vocab" | "corrections">("vocab");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const verifiedCount = vocabulary.filter((v) => v.verified).length;

  return (
    <AppLayout role="teacher">
      <PageHeader
        title="Language library"
        subtitle="Every correction you make improves the next translation."
        action={<AiBadge label="Learns from you" />}
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard label="Words saved" value={vocabulary.length * 34} />
        <StatCard label="Verified" value={`${Math.round((verifiedCount / vocabulary.length) * 100)}%`} tone="success" />
        <StatCard label="Corrections" value={corrections.length + 41} tone="primary" />
      </div>

      <div className="mt-5 flex gap-1.5">
        {([["vocab", "Vocabulary"], ["corrections", "Corrections"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", tab === t ? "bg-ink text-ink-foreground" : "bg-card text-muted-foreground")}>{label}</button>
        ))}
      </div>

      {tab === "vocab" ? (
        <div className="mt-4 space-y-2.5">
          {vocabulary.map((v) => (
            <Surface key={v.id} className="flex items-center gap-3 py-3.5">
              <button onClick={() => toast.success("Playing pronunciation (simulated)")} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary-deep" aria-label={`Play ${v.en}`}>
                <Play className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{v.en} · {v.hi}</p>
                <p className="text-xs text-muted-foreground">{v.sat} · <span className="font-mono">{v.pronunciation}</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground italic">“{v.example}”</p>
              </div>
              <Pill tone={v.verified ? "success" : "warning"}>{v.verified ? "Verified" : "Needs review"}</Pill>
            </Surface>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {corrections.map((c) => {
            const isVerified = verified[c.id] ?? c.status === "verified";
            return (
              <Surface key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Term: “{c.term}” · {c.language}</p>
                    <p className="mt-1 text-xs text-muted-foreground">AI translation: <span className="line-through">{c.aiOutput}</span></p>
                    {editing === c.id ? (
                      <div className="mt-2 flex gap-2">
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder={c.suggestion} />
                        <button onClick={() => { setEditing(null); setVerified((v) => ({ ...v, [c.id]: true })); toast.success("Correction saved (simulated)"); }} className="rounded-lg bg-ink px-3 text-xs font-semibold text-ink-foreground">Save</button>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-sm text-success">Corrected: {c.suggestion}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">by {c.submittedBy}</p>
                  </div>
                  <Pill tone={isVerified ? "success" : "warning"}>{isVerified ? "Verified" : "Pending"}</Pill>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setEditing(c.id); setDraft(c.suggestion); }} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium"><Edit3 className="mr-1 inline size-3.5" /> Edit</button>
                  <button onClick={() => { setVerified((v) => ({ ...v, [c.id]: true })); toast.success("Marked correct"); }} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium"><Check className="mr-1 inline size-3.5" /> Mark correct</button>
                </div>
              </Surface>
            );
          })}
          <Surface className="text-center">
            <Languages className="mx-auto size-6 text-primary-deep" />
            <p className="mt-2 text-sm text-muted-foreground">
              Corrections sync when you're online and improve future translations for your subjects.
            </p>
          </Surface>
        </div>
      )}
    </AppLayout>
  );
}
