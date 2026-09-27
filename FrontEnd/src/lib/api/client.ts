/**
 * Centralized HTTP client for the Spring Boot backend.
 *
 * Every API call in the app goes through `apiFetch` so the base URL lives in
 * exactly one place (read from the VITE_API_BASE_URL env var, see `.env`),
 * the Bearer token is attached automatically, the backend envelope is unwrapped,
 * and expired access tokens trigger a single refresh-token rotation.
 */

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  loadSession,
  saveSession,
  type AuthSession,
} from "./session";

/** Backend base URL. Override via VITE_API_BASE_URL in FrontEnd/.env. */
export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8080";

/** Error thrown for every non-2xx API response, carrying the backend's contract. */
export class ApiError extends Error {
  readonly status: number;
  readonly path: string | null;
  readonly fieldErrors: Record<string, string> | null;

  constructor(status: number, message: string, fieldErrors: Record<string, string> | null, path: string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.path = path;
  }
}

/** Success envelope produced by every backend controller. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp?: string;
}

/** Error envelope produced by the GlobalExceptionHandler / security entry points. */
interface ErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string> | null;
}

/** Emitted when the session can no longer be renewed (401 + refresh failed). */
export const UNAUTHORIZED_EVENT = "vpai:auth-unauthorized";

export function notifyUnauthorized(): void {
  clearSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  /** Abort the request after this many milliseconds (default 30s). */
  timeoutMs?: number;
}

/** Default request timeout. Translation/speech/OCR calls can override it. */
const DEFAULT_TIMEOUT_MS = 30_000;

let refreshing: Promise<boolean> | null = null;

/**
 * Rotates the refresh token once. Concurrent callers share a single in-flight
 * refresh so a burst of 401s triggers only one rotation.
 */
async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const envelope = (await response.json()) as ApiEnvelope<AuthSession>;
      if (!envelope?.data?.accessToken) return false;
      saveSession(envelope.data);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function authExcluded(path: string): boolean {
  return path.startsWith("/api/auth/login") || path.startsWith("/api/auth/refresh") || path.startsWith("/api/auth/register");
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | null = null;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
    });
  } catch (error) {
    // Network failure, DNS failure, server down, or the timeout above.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "The request took too long. Please try again.", null, path);
    }
    throw new ApiError(
      0,
      `Cannot reach the backend at ${API_BASE_URL}. Make sure the Spring Boot backend is running.`,
      null,
      path,
    );
  } finally {
    clearTimeout(timer);
  }

  // Expired access token → try one silent refresh, then replay the request once.
  if (response.status === 401 && getRefreshToken() && !authExcluded(path)) {
    if (await refreshSession()) {
      return apiFetch<T>(path, options);
    }
    notifyUnauthorized();
  }

  const text = await response.text();

  if (!response.ok) {
    let errorBody: ErrorBody | null = null;
    if (text) {
      try {
        const parsed = JSON.parse(text) as ErrorBody;
        if (typeof parsed?.message === "string") errorBody = parsed;
      } catch {
        /* non-JSON error body — fall back to status text below */
      }
    }
    throw new ApiError(
      response.status,
      errorBody?.message || `Request failed with status ${response.status}`,
      errorBody?.fieldErrors ?? null,
      errorBody?.path ?? null,
    );
  }

  if (response.status === 204 || !text) return undefined as T;

  const envelope = JSON.parse(text) as ApiEnvelope<T>;
  if (typeof envelope === "object" && envelope && "data" in envelope) {
    return envelope.data;
  }
  return undefined as T;
}

/**
 * Turns any thrown API/network error into one short sentence safe to show a
 * teacher. Backend messages are already written for humans (the Spring Boot
 * `GlobalExceptionHandler` never leaks stack traces), so they are used when
 * they add information; everything else falls back to a generic sentence.
 *
 * Raw details stay in the browser console for development.
 */
export function friendlyApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    console.error(`[api] ${error.status} ${error.path ?? ""} — ${error.message}`);

    const fieldMessage = error.fieldErrors ? Object.values(error.fieldErrors)[0] : undefined;
    if (error.status === 400) return fieldMessage ?? error.message ?? "Please check what you entered.";
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 403) return "You do not have access to do that.";
    if (error.status === 404) return error.message || "That was not found. Please refresh and try again.";
    if (error.status === 408) return "The service took too long to answer. Please try again.";
    if (error.status === 413) return "That file is too large. Please choose a smaller one.";
    if (error.status === 415) return "That file type is not supported here.";
    if (error.status === 422) return error.message || "That could not be processed. Please try again.";
    if (error.status === 429) return "Too many requests right now. Please try again in a moment.";
    if (error.status === 0) return error.message;
    if (error.status >= 500) return "Something went wrong on the server. Please try again.";
    return error.message || "Something went wrong. Please try again.";
  }

  console.error("[api]", error);
  return "Something went wrong. Please try again.";
}
