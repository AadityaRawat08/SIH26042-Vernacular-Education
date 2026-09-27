/**
 * Spring Boot session bootstrap.
 *
 * The backend protects `/api/translations`, `/api/speech` and `/api/ocr` with
 * JWT authentication, so the demo flows need a session even when the visitor has
 * not signed in. This module is the single place that obtains one:
 *
 *   1. a still-valid stored session is reused (verified against `/api/auth/me`);
 *   2. otherwise the local demo account is signed in;
 *   3. if that account does not exist yet, it is registered once, then signed in.
 *
 * No security is weakened: the app authenticates through the existing
 * `/api/auth/*` endpoints exactly like a real user, and never bypasses them.
 * Set `VITE_DEMO_ACCOUNT_ENABLED=false` to turn the bootstrap off.
 */

import { ApiError, apiFetch } from "./client";
import { clearSession, getAccessToken } from "./session";
import { login, register, fetchMe } from "./auth";

const DEMO_ENABLED = (import.meta.env["VITE_DEMO_ACCOUNT_ENABLED"] as string | undefined) !== "false";
const DEMO_EMAIL =
  (import.meta.env["VITE_DEMO_ACCOUNT_EMAIL"] as string | undefined) ?? "demo.teacher@tribhashniya.local";
const DEMO_PASSWORD = (import.meta.env["VITE_DEMO_ACCOUNT_PASSWORD"] as string | undefined) ?? "";
const DEMO_USERNAME = (import.meta.env["VITE_DEMO_ACCOUNT_USERNAME"] as string | undefined) ?? "demo_teacher";

/** Concurrent callers share one bootstrap so a burst of calls signs in once. */
let inFlight: Promise<boolean> | null = null;

/** True when a session is stored locally (it may still have expired). */
export function hasBackendSession(): boolean {
  return Boolean(getAccessToken());
}

/** Clears the local session — used when the backend rejects it. */
export function clearBackendSession(): void {
  clearSession();
}

function isAuthRejection(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404);
}

async function currentSessionIsUsable(): Promise<boolean> {
  if (!getAccessToken()) return false;
  try {
    await fetchMe();
    return true;
  } catch (error) {
    if (isAuthRejection(error)) {
      clearSession();
      return false;
    }
    // Backend unreachable or a server error: keep the stored session and let the
    // caller surface the real failure.
    throw error;
  }
}

async function demoSignIn(): Promise<boolean> {
  if (!DEMO_ENABLED || !DEMO_PASSWORD) return false;

  try {
    const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (session.accessToken) return true;
  } catch (error) {
    if (!isAuthRejection(error)) throw error;
    // Unknown account (or a stale password) — try to create it below.
  }

  try {
    await register({
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: "Demo Teacher",
      preferredLanguage: "hi",
    });
  } catch (error) {
    // Already registered (422) is expected on later runs; anything else is fatal.
    if (!(error instanceof ApiError) || error.status !== 422) throw error;
  }

  const session = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  return Boolean(session.accessToken);
}

/**
 * Guarantees a usable backend session.
 *
 * @returns true when the app can call the authenticated backend endpoints.
 * @throws when the backend itself is unreachable (a real error the UI must show)
 */
export async function ensureBackendSession(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (await currentSessionIsUsable()) return true;
    return demoSignIn();
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Signs the app in to the backend with the credentials the user typed. */
export async function signInToBackend(email: string, password: string, username?: string, displayName?: string) {
  try {
    return await login({ email, password });
  } catch (error) {
    if (!isAuthRejection(error)) throw error;
    // First time this person uses the tool: create the account, then sign in.
    await register({
      username: username ?? email.split("@")[0] ?? "teacher",
      email,
      password,
      ...(displayName ? { displayName } : {}),
      preferredLanguage: "hi",
    });
    return login({ email, password });
  }
}

/** Revokes the backend session (best effort) and forgets it locally. */
export async function signOutOfBackend(): Promise<void> {
  try {
    await apiFetch<void>("/api/auth/logout", { method: "POST", timeoutMs: 5_000 });
  } catch {
    /* the local session is cleared regardless */
  } finally {
    clearSession();
  }
}
