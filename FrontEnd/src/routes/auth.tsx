import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoWorkspace } from "@/lib/demo.functions";
import { homePathFor, useAuth, type AppRole } from "@/lib/auth";
import { useApp } from "@/lib/app-state";
import { ensureBackendSession } from "@/lib/api/bootstrap";
import { friendlyApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Tribhashniya" },
      { name: "description", content: "Sign in to Tribhashniya to plan lessons, teach in mother tongue and follow every child's progress." },
      { property: "og:title", content: "Sign in — Tribhashniya" },
      { property: "og:description", content: "Teacher, institute and parent accounts for Tribhashniya." },
    ],
  }),
  component: AuthPage,
});

const ROLES: { key: AppRole; label: string }[] = [
  { key: "teacher", label: "Teacher" },
  { key: "institute", label: "Institute" },
  { key: "parent", label: "Parent" },
];

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("teacher");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, primaryRole, loading, signInBackend } = useAuth();
  const { set: setAppState } = useApp();

  useEffect(() => {
    if (!loading && session && !busy) navigate({ to: homePathFor(primaryRole), replace: true });
  }, [loading, session, primaryRole, navigate, busy]);

  const afterSignIn = async (chosen: AppRole) => {
    if (chosen === "teacher") {
      try {
        await seedDemoWorkspace();
      } catch {
        /* demo content is optional; the account still works */
      }
      await queryClient.invalidateQueries();
    }
    navigate({ to: homePathFor(chosen), replace: true });
  };

  const submit = async () => {
    if (!email || password.length < 6) {
      toast.error("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      // The Spring Boot backend owns the translation/speech/OCR endpoints, so it
      // is always signed in first — that is the part the demo needs. The Supabase
      // account carries the workspace/role data on top of it.
      await signInBackend(email, password, fullName || undefined);
      // The Spring Boot session above is the app's real sign-in, and it is what
      // the route guards check (see `requireSession`). Recording it here is what
      // makes the session survive a refresh — and it must happen for *every*
      // successful login, including accounts that have no Supabase counterpart,
      // because that path deliberately carries on without a Supabase session.
      setAppState({ authenticated: true });

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName || email.split("@")[0], role },
          },
        });
        if (error) console.warn("[auth] workspace sign-up skipped:", error.message);
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        toast.success("Welcome to Tribhashniya");
        if (signInError) console.warn("[auth] workspace sign-in skipped:", signInError.message);
        await afterSignIn(role);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) console.warn("[auth] workspace sign-in skipped:", error.message);

      let chosen: AppRole = "teacher";
      if (!error) {
        const { data } = await supabase.auth.getUser();
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", data.user?.id ?? "");
        chosen = ((r ?? [])[0]?.role as AppRole | undefined) ?? "teacher";
      }

      toast.success("Signed in");
      await afterSignIn(chosen);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message.includes("Invalid login") ? "Email or password is not correct." : message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Starts the backend session from the local demo account and opens the
   * translator. This is the fastest path into the judge demo: no e-mail
   * confirmation, no workspace seeding, no sign-up step.
   */
  const openDemo = async () => {
    setBusy(true);
    try {
      const ok = await ensureBackendSession();
      if (!ok) {
        toast.error("The backend demo account is unavailable. Is the Spring Boot backend running?");
        return;
      }
      navigate({ to: "/teacher/translate" });
    } catch (err) {
      toast.error(friendlyApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="surface-card p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-primary font-display text-xl font-semibold text-primary-foreground">
            T
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to see today's class."
              : "Your classes, lessons and progress stay saved to your account."}
          </p>

          {mode === "signup" && (
            <>
              <label className="mt-6 block text-sm font-medium" htmlFor="name">Your name</label>
              <input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sunita Hansda"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

              <p className="mt-5 text-sm font-medium">I am a</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                      role === r.key ? "border-primary bg-primary/10 text-foreground" : "border-input bg-background",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="mt-5 block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.in"
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder="At least 6 characters"
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            disabled={busy}
            onClick={() => void submit()}
            className="mt-6 w-full rounded-full bg-ink py-3 text-[15px] font-semibold text-ink-foreground disabled:opacity-40"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => void openDemo()}
            disabled={busy}
            className="mt-3 w-full rounded-full border border-border bg-card py-3 text-[15px] font-semibold disabled:opacity-40"
          >
            Open the demo translator without signing in
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground underline"
          >
            {mode === "signin" ? "New here? Create an account" : "I already have an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
