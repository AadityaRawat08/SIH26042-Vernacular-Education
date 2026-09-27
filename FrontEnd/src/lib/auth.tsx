import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureBackendSession, signInToBackend, signOutOfBackend } from "./api/bootstrap";
import { isAppStateAuthenticated, useApp } from "./app-state";

export type AppRole = "teacher" | "institute" | "parent" | "student" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  photo_url: string | null;
  school_id: string | null;
  interface_language: string;
  teaching_language: string;
}

interface AuthValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  /**
   * True when the app holds a usable Spring Boot session, i.e. the translation,
   * speech and OCR endpoints can be called. The backend issues the token; the
   * role/workspace data above still comes from the Supabase side of the app.
   */
  backendReady: boolean;
  /** Signs in to the Spring Boot backend (registering the account on first use). */
  signInBackend: (email: string, password: string, displayName?: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [backendReady, setBackendReady] = useState(false);

  const loadAccount = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile | null) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };

  useEffect(() => {
    let active = true;

    // --- Spring Boot session -------------------------------------------------
    // The translation, speech and OCR endpoints are JWT-protected, so the app
    // obtains a backend session as soon as it loads. Failures here are NOT fatal:
    // the backend may simply not be running, and the pages that need it surface
    // their own, clearer error.
    void ensureBackendSession()
      .then((ok) => {
        if (active) setBackendReady(ok);
      })
      .catch((error) => {
        console.warn("[auth] backend session unavailable", error);
        if (active) setBackendReady(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      // Defer Supabase calls out of the callback to avoid deadlocks.
      setTimeout(() => void loadAccount(next?.user?.id), 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadAccount(data.session?.user?.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      primaryRole: roles[0] ?? null,
      backendReady,
      signInBackend: async (email: string, password: string, displayName?: string) => {
        await signInToBackend(email, password, email.split("@")[0], displayName);
        setBackendReady(true);
      },
      refresh: () => loadAccount(session?.user?.id),
      signOut: async () => {
        // Revoke the Spring Boot refresh token and drop the stored JWT pair.
        // `signOutOfBackend` clears localStorage in a `finally`, so the backend
        // session is forgotten even when the server cannot be reached.
        try {
          await signOutOfBackend();
        } finally {
          setBackendReady(false);
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.warn("[auth] supabase sign-out failed", error);
          }
          // Never leave the UI signed in, even if the call above failed.
          setSession(null);
          setProfile(null);
          setRoles([]);
        }
      },
    }),
    [loading, session, profile, roles, backendReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function homePathFor(role: AppRole | null): "/teacher" | "/institute" | "/parent" {
  if (role === "institute") return "/institute";
  if (role === "parent") return "/parent";
  return "/teacher";
}

/**
 * Paths that are intentionally reachable without a signed-in session.
 *
 * `/` is the public splash, `/auth` the sign-in screen, `/login` its legacy
 * redirect, `/help` is linked from the splash, and `/teacher/translate` backs
 * the "Open the demo translator without signing in" button.
 */
const PUBLIC_AUTH_PATHS = new Set(["/", "/auth", "/login", "/help"]);

/** True when `pathname` does not require a signed-in session. */
export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.has(pathname) || pathname.startsWith("/teacher/translate");
}

/**
 * Route guard for client-side navigations, wired up as the root route's
 * `beforeLoad`.
 *
 * Any non-public path needs a session, otherwise the visitor is redirected to
 * `/auth` with `replace: true` so Back cannot walk into a signed-out app.
 *
 * "A session" is deliberately the *same* condition the sign-in form establishes
 * and Sign out tears down, which is not Supabase alone: the app signs in to the
 * Spring Boot backend first (that is what the translation/speech/OCR endpoints
 * need) and treats the Supabase workspace account as optional enrichment — the
 * sign-in page explicitly continues when Supabase reports an error. Gating on
 * Supabase alone therefore locked out every backend-only account, so the app's
 * own persisted `authenticated` flag is the primary signal here and Supabase is
 * the fallback for visitors who signed in through a workspace account.
 *
 * It only runs in the browser: during SSR there is no browser storage to read a
 * session from, so the server always renders. Hydration of a server-rendered
 * document does *not* re-run `beforeLoad`, which is why `SessionGuard` below
 * covers the hard-refresh / pasted-URL case.
 */
export async function requireSession({ location }: { location: { pathname: string } }) {
  if (typeof window === "undefined") return;
  if (isPublicAuthPath(location.pathname)) return;
  if (isAppStateAuthenticated()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw redirect({ to: "/auth", replace: true });
}

/**
 * Hydration-safe companion to `requireSession`.
 *
 * TanStack Start does not re-run the root `beforeLoad` when the client hydrates
 * a server-rendered document, so a hard refresh or a pasted URL would slip past
 * the guard above. This component lives inside `AuthProvider` *and*
 * `AppStateProvider`, renders on every route, and redirects once both stores
 * have actually resolved — covering direct entry, refresh and client-side
 * navigation alike.
 */
export function SessionGuard() {
  const { session, loading } = useAuth();
  const { authenticated, hydrated } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both stores before judging: `authenticated` is `false` and
    // `session` is `null` on the first render of a signed-in visitor, and
    // redirecting on that guess is exactly what would bounce them back to the
    // sign-in page after a successful login or a refresh.
    if (loading || !hydrated) return;
    if (session || authenticated) return;
    if (isPublicAuthPath(location.pathname)) return;
    void navigate({ to: "/auth", replace: true });
  }, [loading, hydrated, session, authenticated, location.pathname, navigate]);

  return null;
}
