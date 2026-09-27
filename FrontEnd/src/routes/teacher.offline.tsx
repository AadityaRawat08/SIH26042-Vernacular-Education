import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { offlinePacks } from "@/lib/mock/data";
import { toast } from "sonner";
import { CloudOff, Download, RefreshCw, Trash2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/offline")({
  head: () => ({
    meta: [
      { title: "Offline & sync — Tribhashniya" },
      { name: "description", content: "Download lessons for low-connectivity days and sync when you're back online." },
      { property: "og:title", content: "Offline & sync — Tribhashniya" },
      { property: "og:description", content: "Teach without the internet; sync when it returns." },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  const { connectivity, set, sync, clearSync } = useApp();
  const offline = connectivity === "offline";
  const usedMb = offlinePacks.filter((p) => p.downloaded).reduce((a, p) => a + p.sizeMb, 0);

  return (
    <AppLayout role="teacher">
      <PageHeader title="Offline & sync" subtitle="Download before you leave network range. Everything else waits patiently." />

      <Surface className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", offline ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
              {offline ? <CloudOff className="size-5" /> : <Wifi className="size-5" />}
            </span>
            <div>
              <p className="font-semibold capitalize">{connectivity === "weak" ? "Low connectivity" : connectivity === "offline" ? "You are offline" : "You are online"}</p>
              <p className="text-xs text-muted-foreground">{offline ? "Saved lessons work fully. Sync is paused." : "All features available."}</p>
            </div>
          </div>
          <button
            onClick={() => {
              set({ connectivity: offline ? "online" : "offline" });
              toast(offline ? "Back online (simulated)" : "Offline mode (simulated)");
            }}
            className={cn("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", offline ? "bg-ink text-ink-foreground" : "bg-secondary")}
          >
            Go {offline ? "online" : "offline"}
          </button>
        </div>
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Prototype toggle — simulates low-connectivity days so you can try every offline flow. The badge in the top bar cycles all three states.
        </p>
      </Surface>

      <Surface className="mt-5">
        <div className="flex items-center justify-between">
          <SectionTitle>Downloaded packs</SectionTitle>
          <span className="font-mono text-xs text-muted-foreground">{usedMb} MB used</span>
        </div>
        <div className="space-y-2.5">
          {offlinePacks.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-secondary p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card">
                <Download className={cn("size-4", p.downloaded ? "text-success" : "text-muted-foreground")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.sizeMb} MB · {p.includes.join(", ")}</p>
              </div>
              <Pill tone={p.downloaded ? "success" : "muted"}>{p.downloaded ? "Offline ready" : "Not downloaded"}</Pill>
              <button onClick={() => toast.info(p.downloaded ? "Pack removed (simulated)" : "Download started (simulated)")} className="grid size-8 shrink-0 place-items-center rounded-full bg-card" aria-label={p.downloaded ? `Delete ${p.label}` : `Download ${p.label}`}>
                {p.downloaded ? <Trash2 className="size-3.5 text-muted-foreground" /> : <Download className="size-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="mt-5">
        <SectionTitle>Sync queue</SectionTitle>
        {sync.length ? (
          <>
            <div className="space-y-2">
              {sync.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.kind} · {s.createdAt}</p>
                  </div>
                  <Pill tone="warning">Queued</Pill>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  if (offline) {
                    toast.warning("You're offline — sync will resume when you're back online.");
                    return;
                  }
                  toast.success("Everything synced (simulated)");
                  clearSync();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground"
              >
                <RefreshCw className="size-4" /> Sync now
              </button>
              <button onClick={() => { clearSync(); toast.info("Queue cleared"); }} className="rounded-full border border-border px-4 py-2 text-xs font-medium">Clear</button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing waiting. Attendance, assessments and corrections appear here when made offline.</p>
        )}
      </Surface>
    </AppLayout>
  );
}
