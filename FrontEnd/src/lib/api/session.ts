/**
 * Auth session persistence for the centralized API client.
 *
 * The access token is stored so every API request can attach
 * `Authorization: Bearer <token>`. Backed by localStorage and guarded against
 * server-side (SSR) execution where localStorage does not exist.
 */

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  role: string;
  preferredLanguage?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: ApiUser;
}

const SESSION_KEY = "vpai.auth.session.v1";

export function loadSession(): AuthSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    return typeof parsed?.accessToken === "string" && typeof parsed?.refreshToken === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — in-memory session still lives for this page load */
  }
}

export function clearSession(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  return loadSession()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return loadSession()?.refreshToken ?? null;
}