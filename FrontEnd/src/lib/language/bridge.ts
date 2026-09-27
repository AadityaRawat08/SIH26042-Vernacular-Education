/**
 * Browser-side language bridge.
 *
 * This is the single orchestrator behind all four translation modes. The UI
 * never talks to a language vendor, and never to a Python service directly:
 * every call goes through the Spring Boot backend, which owns the AI
 * translation service, the voice service and the Bhashini key.
 *
 *   text → text    POST /api/translations
 *   voice → text   POST /api/speech/transcribe  →  POST /api/translations
 *   text → voice   POST /api/translations       →  POST /api/speech/synthesize/audio
 *   voice → voice  POST /api/speech/transcribe  →  POST /api/translations
 *                                               →  POST /api/speech/synthesize/audio
 *
 * Results are plain data — no secrets, no provider keys, nothing that could not
 * be shown to a teacher.
 */

import { friendlyApiErrorMessage } from "@/lib/api/client";
import { synthesizeSpeechAudio, transcribeSpeech } from "@/lib/api/speech";
import { translateText, type TranslationResponse } from "@/lib/api/translations";
import { ensureBackendSession } from "@/lib/api/bootstrap";
import type { TranslateMode } from "./types";

export interface BridgeResult {
  transcript: string;
  translatedText: string;
  /** Object URL of the synthesized audio, when the backend produced real audio. */
  audioUrl: string | null;
  /** True when the caller should speak the text with the device voice instead. */
  speakLocally: boolean;
  provider: string;
  processingMs: number;
}

/** Raised when the input for the selected mode is missing or unusable. */
export class BridgeInputError extends Error {}

export interface BridgeInput {
  mode: TranslateMode;
  sourceLanguage: string;
  targetLanguage: string;
  text?: string;
  /** Raw microphone recording (16 kHz mono WAV — see lib/audio/recorder.ts). */
  audio?: Blob;
}

/** Calls the backend, guaranteeing an authenticated session first. */
async function withSession<T>(run: () => Promise<T>): Promise<T> {
  const ok = await ensureBackendSession();
  if (!ok) {
    throw new BridgeInputError(
      "The demo account could not sign in to the backend. Please sign in and try again.",
    );
  }
  return run();
}

/**
 * Synthesizes audio for the translated text through the backend.
 *
 * Returns null (instead of failing the whole translation) when the voice
 * service cannot synthesize — the caller then falls back to the device voice,
 * which is why a Text → Speech request still shows a result.
 */
async function synthesizeOrNull(text: string, language: string, failures: string[]): Promise<string | null> {
  try {
    const audio = await synthesizeSpeechAudio(text, language);
    if (audio.size === 0) return null;
    return URL.createObjectURL(audio);
  } catch (error) {
    console.warn("[bridge] speech synthesis unavailable, using the device voice instead", error);
    failures.push(friendlyApiErrorMessage(error));
    return null;
  }
}

/** Runs one of the four translation modes end to end. */
export async function runLanguageBridge(input: BridgeInput): Promise<BridgeResult> {
  const started = Date.now();
  const needsSpeechIn = input.mode === "voice_voice" || input.mode === "voice_text";
  const needsSpeechOut = input.mode === "voice_voice" || input.mode === "text_voice";

  let transcript = (input.text ?? "").trim();
  const speechFailures: string[] = [];

  if (needsSpeechIn) {
    if (!input.audio || input.audio.size === 0) {
      throw new BridgeInputError("No recording was captured. Please try recording again.");
    }

    const speech = await withSession(() =>
      transcribeSpeech(input.audio as Blob, "recording.wav", input.sourceLanguage),
    );

    if (speech.status === "FAILED" || !speech.outputText?.trim()) {
      throw new BridgeInputError(
        "We could not hear that clearly. Please move closer to the microphone and try again.",
      );
    }
    transcript = speech.outputText.trim();
  }

  if (!transcript) {
    throw new BridgeInputError("Please enter some text to translate.");
  }

  const translation: TranslationResponse = await withSession(() =>
    translateText({
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      text: transcript,
    }),
  );

  if (translation.status === "FAILED" || !translation.translatedText) {
    throw new BridgeInputError(
      "The translation service could not translate that text. Please try again in a moment.",
    );
  }

  const translatedText = translation.translatedText;
  let audioUrl: string | null = null;

  if (needsSpeechOut) {
    audioUrl = await synthesizeOrNull(translatedText, input.targetLanguage, speechFailures);
  }

  return {
    transcript,
    translatedText,
    audioUrl,
    speakLocally: needsSpeechOut && !audioUrl,
    provider: translation.provider,
    processingMs: Date.now() - started,
  };
}