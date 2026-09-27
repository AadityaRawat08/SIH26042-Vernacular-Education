/**
 * Browser-safe language service contracts (Phase 4).
 *
 * The UI only ever talks to these shapes. The actual provider
 * (mock today, BHASHINI once credentials exist) lives server-side in
 * `src/lib/language/provider.server.ts`.
 */

export type TranslateMode = "voice_voice" | "voice_text" | "text_voice" | "text_text";

export type SupportedLanguage = "hi" | "en" | "sat";

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "en", label: "English", native: "English" },
  { code: "sat", label: "Santhali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
];

export interface LanguageResult {
  sourceLanguage: string;
  targetLanguage: string;
  transcript: string | null;
  translatedText: string | null;
  audioUrl: string | null;
  /** True when the caller should speak the text with the device voice. */
  speakLocally: boolean;
  processingMs: number;
  provider: string;
  status: "ok";
}

export interface LanguageServiceStatus {
  mode: "demo" | "live";
  provider: string;
  languages: SupportedLanguage[];
}

export function languageLabel(code: string) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
