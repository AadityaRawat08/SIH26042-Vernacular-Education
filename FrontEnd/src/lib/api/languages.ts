/**
 * Language catalogue API client — mirrors LanguageController:
 * GET /api/languages, /api/languages/code/{code}, /{id}/dialects, /{id}/scripts.
 */

import { apiFetch } from "./client";

export interface LanguageResponse {
  id: string;
  name: string;
  nativeName: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DialectResponse {
  id: string;
  name: string;
  languageCode: string;
}

export interface ScriptResponse {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

/** GET /api/languages — active languages; optional case-insensitive search. */
export async function listLanguages(search?: string): Promise<LanguageResponse[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<LanguageResponse[]>(`/api/languages${query}`);
}

/** GET /api/languages/code/{code} — a single language by standard code (e.g. `hi`). */
export async function getLanguageByCode(code: string): Promise<LanguageResponse> {
  return apiFetch<LanguageResponse>(`/api/languages/code/${encodeURIComponent(code)}`);
}

/** GET /api/languages/{languageId}/dialects — dialects of a language. */
export async function listDialects(languageId: string): Promise<DialectResponse[]> {
  return apiFetch<DialectResponse[]>(`/api/languages/${encodeURIComponent(languageId)}/dialects`);
}

/** GET /api/languages/{languageId}/scripts — writing systems of a language. */
export async function listScripts(languageId: string): Promise<ScriptResponse[]> {
  return apiFetch<ScriptResponse[]>(`/api/languages/${encodeURIComponent(languageId)}/scripts`);
}