import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KeyValue, PageHeader, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/mock/data";
import { languageLabel } from "@/lib/services/ai";
import type { LanguageCode } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Tribhashniya" },
      { name: "description", content: "Profile, languages, notifications and app preferences." },
      { property: "og:title", content: "Settings — Tribhashniya" },
      { property: "og:description", content: "Make the app yours." },
    ],
  }),
  component: SettingsPage,
});

function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint?: string }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-left">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-success" : "bg-border")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-card shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function SettingsPage() {
  const { role, teacher, institute, parent, logout, interfaceLanguage, set } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({ notifications: true, autoDownload: true, lowData: false, dark: false });

  /**
   * Real sign-out.
   *
   * The button used to call only `useApp().logout()`, which resets the local
   * prototype store (`vpai.state.v1`) and leaves the actual Supabase session and
   * the Spring Boot JWT pair untouched — so `/auth` still saw a signed-in
   * session and bounced straight back to the dashboard. We now tear down the
   * real auth first, and always land in a logged-out state even if a server
   * call fails.
   */
  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      logout(); // clear the prototype session (role, demo workspace state)
      toast.success("Signed out");
      navigate({ to: "/auth", replace: true });
    }
  };

  const name = role === "institute" ? institute.name : role === "parent" ? parent.parentName : teacher.fullName;
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <AppLayout role={role ?? "teacher"}>
      <PageHeader title="Settings" subtitle="Profile, languages and how the app behaves." />

      <Surface className="mt-6">
        <SectionTitle>Profile</SectionTitle>
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 font-display text-lg font-semibold text-primary-deep">
            {initials}
          </span>
          <div>
            <p className="font-display text-lg font-semibold">{name}</p>
            <p className="text-sm capitalize text-muted-foreground">{role ?? "teacher"} account</p>
          </div>
        </div>
        <div className="mt-3">
          {role === "institute" ? (
            <>
              <KeyValue label="District" value={institute.district} />
              <KeyValue label="Board" value={institute.board} />
              <KeyValue label="Academic year" value={institute.academicYear} />
            </>
          ) : role === "parent" ? (
            <>
              <KeyValue label="Child" value={`${parent.childName} · ${parent.childClass} ${parent.section}`} />
              <KeyValue label="School" value={parent.school} />
            </>
          ) : (
            <>
              <KeyValue label="School" value={teacher.school} />
              <KeyValue label="Board" value={teacher.board} />
              <KeyValue label="Phone" value={teacher.mobile} />
            </>
          )}
        </div>
        <button onClick={() => toast.info("Profile editing (simulated)")} className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-medium">Edit profile</button>
      </Surface>

      <Surface className="mt-5">
        <SectionTitle>Interface language</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.filter((l) => l.available).map((l) => (
            <button
              key={l.code}
              onClick={() => { set({ interfaceLanguage: l.code as LanguageCode }); toast.success(`Interface set to ${l.label} (simulated)`); }}
              className={cn("rounded-full px-4 py-2 text-sm font-medium", interfaceLanguage === l.code ? "bg-ink text-ink-foreground" : "bg-secondary")}
            >
              {l.nativeLabel} · {languageLabel(l.code)}
            </button>
          ))}
        </div>
      </Surface>

      <Surface className="mt-5">
        <SectionTitle>Preferences</SectionTitle>
        <div className="space-y-2">
          <Toggle on={prefs.notifications} onToggle={() => { setPrefs((p) => ({ ...p, notifications: !p.notifications })); toast.success("Preference saved"); }} label="Notifications" hint="Plan reminders, assessment results" />
          <Toggle on={prefs.autoDownload} onToggle={() => { setPrefs((p) => ({ ...p, autoDownload: !p.autoDownload })); toast.success("Preference saved"); }} label="Auto-download tomorrow's lessons" hint="When on Wi-Fi" />
          <Toggle on={prefs.lowData} onToggle={() => { setPrefs((p) => ({ ...p, lowData: !p.lowData })); toast.success("Preference saved"); }} label="Low-data mode" hint="Smaller videos, fewer images" />
          <Toggle on={prefs.dark} onToggle={() => { setPrefs((p) => ({ ...p, dark: !p.dark })); toast.info("Dark theme applies on next load (simulated)"); }} label="Dark appearance" hint="Easier on the eyes at night" />
        </div>
      </Surface>

      <Surface className="mt-5">
        <SectionTitle>Prototype</SectionTitle>
        <p className="text-sm text-muted-foreground">
          This is a frontend prototype. Data is stored on this device only; AI responses are simulated.
        </p>
        <button
          onClick={() => void handleSignOut()}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-xs font-medium text-destructive"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </Surface>
    </AppLayout>
  );
}
