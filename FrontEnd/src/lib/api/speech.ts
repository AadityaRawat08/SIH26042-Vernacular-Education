/**
 * Speech API client — mirrors SpeechController:
 * POST /api/speech/transcribe (multipart file), POST /api/speech/synthesize,
 * GET /api/speech, GET/DELETE /api/speech/{id}.
 */

import { ApiError, API_BASE_URL, apiFetch } from "./client";
import { getAccessToken } from "./session";
import type { TranslationResponse } from "./translations";

export type SpeechOperation = "SPEECH_TO_TEXT" | "TEXT_TO_SPEECH";
export type SpeechStatus = "COMPLETED" | "FAILED";

export interface SpeechResponse {
  id: string;
  operation: SpeechOperation;
  originalFileName?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  inputText?: string | null;
  outputText?: string | null;
  languageCode?: string | null;
  status: SpeechStatus;
  provider: string;
  createdAt: string;
}

export interface SpeechHistoryResponse {
  content: SpeechResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * POST /api/speech/transcribe — upload an audio file as multipart `file`.
 * Accepted content types: audio/wav, audio/x-wav, audio/mpeg, audio/mp4,
 * audio/ogg, audio/webm.
 */
export async function transcribeSpeech(file: Blob, fileName: string, language?: string): Promise<SpeechResponse> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<SpeechResponse>(`/api/speech/transcribe${query}`, { method: "POST", formData });
}

/** POST /api/speech/synthesize — text-to-speech { text, language }. */
export async function synthesizeSpeech(text: string, language: string): Promise<SpeechResponse> {
  return apiFetch<SpeechResponse>("/api/speech/synthesize", { method: "POST", body: { text, language } });
}

/**
 * POST /api/speech/synthesize/audio — text-to-speech that returns the audio.
 *
 * Same request body as `/synthesize`, but the response is the synthesized WAV
 * itself, so Text → Speech and Speech → Speech modes can actually play the
 * audio that the voice service produced.
 */
export async function synthesizeSpeechAudio(text: string, language: string): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/speech/synthesize/audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `Speech synthesis failed (${response.status})`;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message, null, "/api/speech/synthesize/audio");
  }

  return response.blob();
}

/** GET /api/speech — the authenticated user's speech history, newest first. */
export async function listSpeechHistory(page = 0, size = 20): Promise<SpeechHistoryResponse> {
  return apiFetch<SpeechHistoryResponse>(`/api/speech?page=${page}&size=${size}`);
}

/**
 * POST /api/speech/{id}/translate — translates the transcribed text of a
 * speech-to-text record through the existing translation service, so the
 * speech record and its translation stay linked server-side.
 */
export async function translateSpeech(
  id: string,
  targetLanguage: string,
  sourceLanguage?: string,
): Promise<TranslationResponse> {
  return apiFetch<TranslationResponse>(`/api/speech/${encodeURIComponent(id)}/translate`, {
    method: "POST",
    body: { targetLanguage, ...(sourceLanguage ? { sourceLanguage } : {}) },
    timeoutMs: 60_000,
  });
}