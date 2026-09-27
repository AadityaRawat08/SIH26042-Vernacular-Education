// src/lib/language.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LanguageResult, LanguageServiceStatus, SupportedLanguage, TranslateMode } from "./language/types";

const SUPPORTED: SupportedLanguage[] = ["hi", "en", "sat"];

export interface TranslateInput {
  mode: TranslateMode;
  sourceLanguage: string;
  targetLanguage: string;
  text?: string;
  audioBase64?: string;
  classroomId?: string | null;
}

export const getLanguageStatus = createServerFn({ method: "GET" }).handler(async (): Promise<LanguageServiceStatus> => {
  const { getLanguageProvider } = await import("./language/provider.server");
  const provider = getLanguageProvider();
  return { mode: provider.name === "demo" ? "demo" : "live", provider: provider.name, languages: SUPPORTED };
});

/**
 * One shared entry point for all four translation modes.
 * Frontend never talks to a language vendor directly.
 */
export const runTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TranslateInput) => input)
  .handler(async ({ data, context }): Promise<LanguageResult> => {
    const { getLanguageProvider, friendlyLanguageError, LanguageServiceError } = await import("./language/provider.server");
    const started = Date.now();
    const provider = getLanguageProvider();

    if (!SUPPORTED.includes(data.sourceLanguage as SupportedLanguage) || !SUPPORTED.includes(data.targetLanguage as SupportedLanguage)) {
      throw new Error("That language is not available yet.");
    }

    try {
      const needsSpeechIn = data.mode === "voice_voice" || data.mode === "voice_text";
      const needsSpeechOut = data.mode === "voice_voice" || data.mode === "text_voice";

      let transcript = (data.text ?? "").trim();
      if (needsSpeechIn) {
        if (!data.audioBase64) throw new LanguageServiceError("No audio", "invalid_audio");
        transcript = await provider.speechToText({
          audioBase64: data.audioBase64,
          sourceLanguage: data.sourceLanguage,
        });
      }
      if (!transcript) throw new LanguageServiceError("Empty input", "empty_response");

      const translatedText = await provider.translateText({
        text: transcript,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
      });

      let audioUrl: string | null = null;
      if (needsSpeechOut) {
        audioUrl = await provider.textToSpeech({ text: translatedText, language: data.targetLanguage });
      }

      await context.supabase.from("translations").insert({
        user_id: context.userId,
        classroom_id: data.classroomId ?? null,
        mode: data.mode,
        provider: provider.name,
        source_language: data.sourceLanguage,
        target_language: data.targetLanguage,
        source_text: transcript,
        translated_text: translatedText,
        audio_url: audioUrl,
      });

      return {
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        transcript,
        translatedText,
        audioUrl,
        speakLocally: needsSpeechOut && !audioUrl,
        processingMs: Date.now() - started,
        provider: provider.name,
        status: "ok",
      };
    } catch (error) {
      throw new Error(friendlyLanguageError(error));
    }
  });

export const saveTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sourceText: string; translatedText: string; sourceLanguage: string; targetLanguage: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("translations").insert({
      user_id: context.userId,
      mode: "text_text",
      provider: "saved",
      saved: true,
      source_language: data.sourceLanguage,
      target_language: data.targetLanguage,
      source_text: data.sourceText,
      translated_text: data.translatedText,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listSavedTranslations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("translations")
      .select("id, source_text, translated_text, source_language, target_language, created_at")
      .eq("user_id", context.userId)
      .eq("saved", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });

export const deleteTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("translations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
