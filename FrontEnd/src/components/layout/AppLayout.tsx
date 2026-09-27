import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-state";
import { navForRole } from "./nav-config";
import type { Role } from "@/lib/types";
import { notifications } from "@/lib/mock/data";
import { AICopilot } from "@/components/ai/AICopilot";
import type { TeachingContext } from "@/lib/services/teaching-ai";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-display text-lg leading-none font-semibold text-primary-foreground">
        V
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold">Tribhashniya</span>
          <span className="block font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            AI Classroom Engine
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function ConnectivityBadge() {
  const { connectivity, set, sync } = useApp();
  const next = { online: "weak", weak: "offline", offline: "online" } as const;
  const tone =
    connectivity === "online"
      ? "bg-success/12 text-success"
      : connectivity === "weak"
        ? "bg-warning/18 text-warning"
        : "bg-muted text-muted-foreground";
  const label = connectivity === "online" ? "Online" : connectivity === "weak" ? "Low connectivity" : "Offline";
  return (
    <button
      onClick={() => set({ connectivity: next[connectivity] })}
      title="Demo toggle: switch network state"
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", tone)}
    >
      {connectivity === "offline" ? <WifiOff className="size-3" /> : <Wifi className="size-3" />}
      {label}
      {sync.length ? <span className="opacity-70">· {sync.length} queued</span> : null}
    </button>
  );
}

export function AppLayout({ role, children }: { role: Role; children: ReactNode }) {
  const { sidebar, bottom } = navForRole(role);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { teacher, institute, parent } = useApp();
  const unread = notifications.filter((n) => !n.read).length;

  const who =
    role === "teacher"
      ? { name: teacher.fullName, meta: teacher.school }
      : role === "institute"
        ? { name: institute.name, meta: institute.district }
        : { name: parent.parentName, meta: `Parent of ${parent.childName}` };

  const initials = who.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  /** The assistant knows where the teacher is, so they never repeat context. */
  const copilotContext: TeachingContext = {
    surface: pathname.includes("/classrooms/")
      ? "classroom"
      : pathname.includes("/translate") || pathname.includes("/language")
        ? "translator"
        : pathname.includes("/students/")
          ? "student"
          : pathname.includes("/planner")
            ? "plan"
            : "home",
    className: teacher.classes[0],
    subject: teacher.subjects[0],
  };


  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground lg:flex">
        <div className="px-2 text-sidebar-foreground">
          <Logo />
        </div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {sidebar.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(String(item.to) + "/"));
            return (
              <Link
                key={String(item.to)}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className={cn("size-[18px]", active ? "text-sidebar-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 rounded-2xl border border-sidebar-border bg-tint-sand p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Signed in</p>
          <p className="mt-1 truncate text-sm font-semibold">{who.name}</p>
          <p className="truncate text-xs text-muted-foreground">{who.meta}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="hidden lg:block">
              <ConnectivityBadge />
            </div>
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <ConnectivityBadge />
              </div>
              <Link
                to="/notifications"
                className="relative grid size-9 place-items-center rounded-full border border-border bg-card"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unread ? (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-card" />
                ) : null}
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-2.5 pl-1"
              >
                <span className="grid size-7 place-items-center rounded-full bg-secondary text-[11px] font-semibold">
                  {initials}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 lg:pb-12">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
          <div className="mx-auto max-w-md px-3 pb-3">
            <div className="flex items-center justify-between rounded-2xl bg-ink px-1.5 py-1.5 text-ink-foreground shadow-[var(--shadow-lift)]">
              {bottom.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={String(item.to)}
                    to={item.to}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition-colors",
                      active ? "bg-sidebar-accent text-ink-foreground" : "text-ink-foreground/60",
                    )}
                  >
                    <item.icon className={cn("size-[18px]", active && "text-primary")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {role === "teacher" ? <AICopilot context={copilotContext} /> : null}
    </div>
  );
}
