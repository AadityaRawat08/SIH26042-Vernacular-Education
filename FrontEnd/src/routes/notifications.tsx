import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { notifications } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Tribhashniya" },
      { name: "description", content: "Reminders, results and updates in one place." },
      { property: "og:title", content: "Notifications — Tribhashniya" },
      { property: "og:description", content: "What needs your attention today." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { role } = useApp();
  const [read, setRead] = useState<Record<string, boolean>>({});

  return (
    <AppLayout role={role ?? "teacher"}>
      <PageHeader
        title="Notifications"
        subtitle="Everything that needs your attention."
        action={
          <button onClick={() => setRead(Object.fromEntries(notifications.map((n) => [n.id, true])))} className="rounded-full bg-secondary px-4 py-2 text-xs font-medium">
            Mark all read
          </button>
        }
      />
      <div className="mt-6 space-y-2.5">
        {notifications.map((n) => {
          const isRead = read[n.id] ?? n.read;
          return (
            <button
              key={n.id}
              onClick={() => setRead((r) => ({ ...r, [n.id]: true }))}
              className={cn("surface-card block w-full p-4 text-left sm:p-5", !isRead && "ring-1 ring-primary/25")}
            >
              <span className="flex items-start gap-3">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", isRead ? "bg-border" : "bg-primary")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{n.kind} · {n.time}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </AppLayout>
  );
}
