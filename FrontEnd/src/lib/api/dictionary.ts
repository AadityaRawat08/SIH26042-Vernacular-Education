/**
 * Dictionary API client — mirrors DictionaryController:
 * GET /api/dictionary/search?language=..&word=..&page=..&size=..
 */

import { apiFetch } from "./client";

export interface DictionaryEntryResponse {
  id: string;
  languageCode: string;
  languageName: string;
  word: string;
  pronunciation?: string | null;
  definition: string;
  partOfSpeech?: string | null;
  exampleSentence?: string | null;
  translation?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/dictionary/search — search entries for a language.
 * `language` (ISO 639 code) is required; `word` is optional.
 */
export async function searchDictionary(
  language: string,
  word?: string,
  page = 0,
  size = 20,
): Promise<DictionaryEntryResponse[]> {
  const params = new URLSearchParams({ language, page: String(page), size: String(size) });
  if (word) params.set("word", word);
  return apiFetch<DictionaryEntryResponse[]>(`/api/dictionary/search?${params.toString()}`);
}