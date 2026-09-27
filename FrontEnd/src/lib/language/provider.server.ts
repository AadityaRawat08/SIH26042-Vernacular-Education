/**
 * Language provider abstraction (Phase 4) — server only.
 *
 * LanguageProvider defines speechToText / translateText / textToSpeech /
 * speechToSpeech. MockLanguageProvider runs in demo mode; BhashiniProvider is
 * used automatically once BHASHINI credentials are configured as secrets.
 * No credential ever reaches the browser.
 */

import type { LanguageResult } from "./types";

export interface LanguageProvider {
  readonly name: string;
  speechToText(input: { audioBase64: string; sourceLanguage: string }): Promise<string>;
  translateText(input: { text: string; sourceLanguage: string; targetLanguage: string }): Promise<string>;
  textToSpeech(input: { text: string; language: string }): Promise<string | null>;
}

export class LanguageServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unauthorized"
      | "rate_limited"
      | "timeout"
      | "unavailable"
      | "unsupported_language"
      | "invalid_audio"
      | "empty_response",
  ) {
    super(message);
  }
}

const PHRASES: Record<string, Record<string, string>> = {
  hi: {
    "आज हम जोड़ सीखेंगे।": "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱡᱚᱲ ᱥᱮᱬᱟᱭ ᱞᱟᱹᱜᱤᱫ",
    "बैठ जाओ": "ᱫᱩᱲᱩᱵ ᱢᱮ",
    "ध्यान दो": "ᱮᱢ ᱥᱟᱸᱣᱛᱟ",
  },
};

function mockTranslate(text: string, source: string, target: string) {
  const known = PHRASES[source]?.[text.trim()];
  if (known && target === "sat") return known;
  if (source === target) return text;
  if (target === "sat") return `ᱥ: ${text}`;
  if (target === "hi") return `अनुवाद: ${text}`;
  return `Translation: ${text}`;
}

export class MockLanguageProvider implements LanguageProvider {
  readonly name = "demo";

  async speechToText({ audioBase64, sourceLanguage }: { audioBase64: string; sourceLanguage: string }) {
    if (!audioBase64 || audioBase64.length < 32) {
      throw new LanguageServiceError("Audio too short", "invalid_audio");
    }
    await new Promise((r) => setTimeout(r, 400));
    return sourceLanguage === "hi"
      ? "आज हम जोड़ सीखेंगे।"
      : sourceLanguage === "sat"
        ? "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱥᱮᱬᱟᱭ"
        : "Today we will learn addition.";
  }

  async translateText({ text, sourceLanguage, targetLanguage }: { text: string; sourceLanguage: string; targetLanguage: string }) {
    if (!text.trim()) throw new LanguageServiceError("Nothing to translate", "empty_response");
    await new Promise((r) => setTimeout(r, 300));
    return mockTranslate(text, sourceLanguage, targetLanguage);
  }

  async textToSpeech(_input: { text: string; language: string }) {
    // Demo mode has no audio file; the client speaks with the device voice.
    return null;
  }
}

export class BhashiniProvider implements LanguageProvider {
  readonly name = "bhashini";

  constructor(
    private readonly config: { baseUrl: string; apiKey: string; inferenceKey: string; userId: string },
  ) {}

  private async call(path: string, body: unknown) {
    let res: Response;
    try {
      res = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.config.inferenceKey,
          userID: this.config.userId,
          ulcaApiKey: this.config.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new LanguageServiceError("Language service unreachable", "unavailable");
    }
    if (res.status === 401 || res.status === 403) throw new LanguageServiceError("Rejected", "unauthorized");
    if (res.status === 429) throw new LanguageServiceError("Too many requests", "rate_limited");
    if (!res.ok) throw new LanguageServiceError(`Upstream ${res.status}`, "unavailable");
    return (await res.json()) as {
      pipelineResponse?: Array<{ output?: Array<{ source?: string; target?: string; audioContent?: string }> }>;
    };
  }

  private static task(taskType: string, source: string, target?: string) {
    return {
      taskType,
      config: { language: { sourceLanguage: source, ...(target ? { targetLanguage: target } : {}) } },
    };
  }

  async speechToText({ audioBase64, sourceLanguage }: { audioBase64: string; sourceLanguage: string }) {
    const json = await this.call("/services/inference/pipeline", {
      pipelineTasks: [BhashiniProvider.task("asr", sourceLanguage)],
      inputData: { audio: [{ audioContent: audioBase64 }] },
    });
    const text = json.pipelineResponse?.[0]?.output?.[0]?.source;
    if (!text) throw new LanguageServiceError("No transcript", "empty_response");
    return text;
  }

  async translateText({ text, sourceLanguage, targetLanguage }: { text: string; sourceLanguage: string; targetLanguage: string }) {
    const json = await this.call("/services/inference/pipeline", {
      pipelineTasks: [BhashiniProvider.task("translation", sourceLanguage, targetLanguage)],
      inputData: { input: [{ source: text }] },
    });
    const out = json.pipelineResponse?.[0]?.output?.[0]?.target;
    if (!out) throw new LanguageServiceError("No translation", "empty_response");
    return out;
  }

  async textToSpeech({ text, language }: { text: string; language: string }) {
    const json = await this.call("/services/inference/pipeline", {
      pipelineTasks: [BhashiniProvider.task("tts", language)],
      inputData: { input: [{ source: text }] },
    });
    const audio = json.pipelineResponse?.[0]?.output?.[0]?.audioContent;
    return audio ? `data:audio/wav;base64,${audio}` : null;
  }
}

export function getLanguageProvider(): LanguageProvider {
  const baseUrl = process.env["BHASHINI_BASE_URL"];
  const apiKey = process.env["BHASHINI_API_KEY"];
  const inferenceKey = process.env["BHASHINI_INFERENCE_KEY"];
  const userId = process.env["BHASHINI_USER_ID"];
  if (baseUrl && apiKey && inferenceKey && userId) {
    return new BhashiniProvider({ baseUrl, apiKey, inferenceKey, userId });
  }
  return new MockLanguageProvider();
}

/** Teacher-facing message for a technical failure. Details stay in server logs. */
export function friendlyLanguageError(error: unknown) {
  const code = error instanceof LanguageServiceError ? error.code : "unavailable";
  console.error("[language]", code, error instanceof Error ? error.message : error);
  switch (code) {
    case "unsupported_language":
      return "That language is not available yet.";
    case "invalid_audio":
      return "We could not hear that clearly. Please try again.";
    case "rate_limited":
      return "Too many requests right now. Please try again in a moment.";
    default:
      return "Translation service is temporarily unavailable. Please try again.";
  }
}

export type { LanguageResult };
