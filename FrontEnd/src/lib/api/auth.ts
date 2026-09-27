/**
 * Authentication API client — mirrors the Spring Boot AuthController contract:
 * POST /api/auth/login, /register, /logout, GET /api/auth/me.
 */

import { apiFetch } from "./client";
import { clearSession, saveSession, type ApiUser, type AuthSession } from "./session";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  preferredLanguage?: string;
}

/** POST /api/auth/login → full token pair; persists the session for later calls. */
export async function login(payload: LoginPayload): Promise<AuthSession> {
  const session = await apiFetch<AuthSession>("/api/auth/login", { method: "POST", body: payload });
  saveSession(session);
  return session;
}

/** POST /api/auth/register → safe user view (role is always forced to USER server-side). */
export async function register(payload: RegisterPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/auth/register", { method: "POST", body: payload });
}

/** GET /api/auth/me → safe profile of the authenticated user. */
export async function fetchMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/auth/me");
}

/** POST /api/auth/logout → revokes all refresh tokens, then clears the local session. */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}