/**
 * OCR API client — mirrors OcrController:
 * POST /api/ocr (multipart file), GET /api/ocr, GET /api/ocr/{id},
 * POST /api/ocr/{id}/translate, DELETE /api/ocr/{id}.
 */

import { apiFetch } from "./client";
import type { TranslationResponse } from "./translations";

export interface OcrResponse {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  extractedText: string;
  detectedLanguageCode?: string | null;
  status: "COMPLETED" | "FAILED";
  provider: string;
  createdAt: string;
}

export interface OcrHistoryResponse {
  content: OcrResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * POST /api/ocr — upload an image as multipart `file` and extract text.
 * Accepted content types: image/jpeg, image/png, image/webp.
 */
export async function processOcr(file: Blob, fileName: string, language?: string): Promise<OcrResponse> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<OcrResponse>(`/api/ocr${query}`, { method: "POST", formData });
}

/** GET /api/ocr — the authenticated user's OCR history, newest first. */
export async function listOcrHistory(page = 0, size = 20): Promise<OcrHistoryResponse> {
  return apiFetch<OcrHistoryResponse>(`/api/ocr?page=${page}&size=${size}`);
}

/** GET /api/ocr/{id} — a single OCR record owned by the caller. */
export async function getOcr(id: string): Promise<OcrResponse> {
  return apiFetch<OcrResponse>(`/api/ocr/${encodeURIComponent(id)}`);
}

/** DELETE /api/ocr/{id} — removes one OCR record owned by the caller. */
export async function deleteOcr(id: string): Promise<void> {
  await apiFetch<void>(`/api/ocr/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * POST /api/ocr/{id}/translate — translates the extracted text through the
 * existing translation service, so the image, its text and its translation stay
 * linked server-side.
 */
export async function translateOcr(
  id: string,
  targetLanguage: string,
  sourceLanguage?: string,
): Promise<TranslationResponse> {
  return apiFetch<TranslationResponse>(`/api/ocr/${encodeURIComponent(id)}/translate`, {
    method: "POST",
    body: { targetLanguage, ...(sourceLanguage ? { sourceLanguage } : {}) },
    timeoutMs: 60_000,
  });
}