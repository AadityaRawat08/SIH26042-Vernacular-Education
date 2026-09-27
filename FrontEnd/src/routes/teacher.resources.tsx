import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { resources } from "@/lib/mock/data";
import type { ResourceItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Download, FileText, HelpCircle, Image, Languages, Layers, Music, Play, Search } from "lucide-react";

export const Route = createFileRoute("/teacher/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Tribhashniya" },
      { name: "description", content: "Videos, audio, images, worksheets and stories matched to your topics." },
      { property: "og:title", content: "Resources — Tribhashniya" },
      { property: "og:description", content: "A teaching resource library with offline downloads." },
    ],
  }),
  component: ResourcesPage,
});

const CATEGORIES = ["all", "video", "audio", "image", "activity", "worksheet", "story", "vocabulary"] as const;
const ICONS: Record<ResourceItem["category"], typeof Play> = {
  video: Play,
  audio: Music,
  image: Image,
  activity: Layers,
  worksheet: FileText,
  story: HelpCircle,
  vocabulary: Languages,
};

function ResourcesPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const list = useMemo(
    () =>
      resources.filter(
        (r) =>
          (cat === "all" || r.category === cat) &&
          (query === "" || (r.title + r.subject + r.className).toLowerCase().includes(query.toLowerCase())),
      ),
    [query, cat],
  );

  return (
    <AppLayout role="teacher">
      <PageHeader title="Resource library" subtitle="Materials matched to your chapters — save them for class or offline." />

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topic, subject…" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium capitalize", cat === c ? "bg-ink text-ink-foreground" : "bg-card text-muted-foreground")}>
            {c}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => {
          const Icon = ICONS[r.category] ?? FileText;
          const isSaved = saved[r.id] ?? false;
          return (
            <Surface key={r.id} className="flex flex-col">
              <div className="flex h-24 items-center justify-center rounded-xl bg-secondary">
                <Icon className="size-7 text-primary-deep" />
              </div>
              <p className="mt-3 text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{r.category} · {r.subject} · {r.className}</p>
              <p className="text-xs text-muted-foreground">{r.language} · {r.duration} · {r.sizeMb} MB</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSaved((s) => ({ ...s, [r.id]: !isSaved }));
                    toast.success(isSaved ? "Removed from saved" : "Saved to your library");
                  }}
                  className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium", isSaved ? "bg-success/15 text-success" : "bg-secondary")}
                >
                  {isSaved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button onClick={() => toast.success("Downloaded for offline (simulated)")} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                  <Download className="size-3.5" /> Offline
                </button>
                <Pill tone="muted">{r.sizeMb} MB</Pill>
              </div>
            </Surface>
          );
        })}
      </div>
      {list.length === 0 ? <p className="mt-8 text-center text-sm text-muted-foreground">Nothing matches that search yet.</p> : null}
    </AppLayout>
  );
}
