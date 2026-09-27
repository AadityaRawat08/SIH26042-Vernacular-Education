/**
 * Translation API client — mirrors TranslationController:
 * POST /api/translations, GET /api/translations.
 */

import { apiFetch } from "./client";

export interface TranslationResponse {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string | null;
  provider: string;
  status: "COMPLETED" | "FAILED";
  createdAt: string;
}

export interface TranslateInput {
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
}

/** POST /api/translations — translates text and persists the result. */
export async function translateText(input: TranslateInput): Promise<TranslationResponse> {
  return apiFetch<TranslationResponse>("/api/translations", { method: "POST", body: input });
}

/** GET /api/translations — the authenticated user's history, newest first. */
export async function listTranslations(page = 0, size = 20): Promise<TranslationResponse[]> {
  return apiFetch<TranslationResponse[]>(`/api/translations?page=${page}&size=${size}`);
}

/** DELETE /api/translations/{id} — removes one translation owned by the caller. */
export async function deleteTranslation(id: string): Promise<void> {
  await apiFetch<void>(`/api/translations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * Translation pipeline status — mirrors `GET /api/health/translation`.
 *
 * Read-only and credential-free: it reports which engine can translate right
 * now (`live` = Bhashini, `demo` = the AI service's isolated local development
 * translator, `local-mock` = the backend mock provider, `unavailable` = the AI
 * service is down). The UI shows it so nobody mistakes a demo result for a
 * Bhashini result.
 */
export interface TranslationPipelineStatus {
  configuredProvider: string;
  aiServiceUrl: string;
  aiServiceReachable: boolean;
  translationReady: boolean;
  demoFallbackActive: boolean;
  mode: "live" | "demo" | "unavailable" | "local-mock";
  supportedLanguages: string[];
  detail: string;
}

export async function getTranslationPipelineStatus(): Promise<TranslationPipelineStatus> {
  return apiFetch<TranslationPipelineStatus>("/api/health/translation", { timeoutMs: 8_000 });
}