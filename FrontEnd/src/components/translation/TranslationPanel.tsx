import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft, Copy, Loader2, Mic, RotateCcw, Save, Send, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { friendlyApiErrorMessage } from "@/lib/api/client";
import { ensureBackendSession } from "@/lib/api/bootstrap";
import { BridgeInputError, runLanguageBridge } from "@/lib/language/bridge";
import { WavRecorder } from "@/lib/audio/recorder";
import { SUPPORTED_LANGUAGES, languageLabel, type TranslateMode } from "@/lib/language/types";
import { TranslationModeSelector, type TranslationMode } from "./TranslationModeSelector";

const SERVER_MODE: Record<TranslationMode, TranslateMode> = {
  "voice-to-voice": "voice_voice",
  "voice-to-text": "voice_text",
  "text-to-voice": "text_voice",
  "text-to-text": "text_text",
};

/** Which option names the language the target text is spoken in. */
const SPEECH_LOCALE: Record<string, string> = {
  hi: "hi-IN",
  en: "en-IN",
  // Santhali has no device text-to-speech voice, so the closest Indic voice is
  // used. The translation itself is Santhali; only the playback voice is Hindi.
  sat: "hi-IN",
};

export interface TranslationResultState {
  transcript: string;
  translated: string;
  audioUrl: string | null;
}

export function LanguageSelector({
  from,
  to,
  onFrom,
  onTo,
  onSwap,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onSwap: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <label className="min-w-0 flex-1 text-sm">
        <span className="mb-1 block text-[11px] tracking-wide text-muted-foreground uppercase">From</span>
        <select
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-3 text-base"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label} · {l.native}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onSwap}
        aria-label="Swap languages"
        className="mb-1 grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card"
      >
        <ArrowRightLeft className="size-4" />
      </button>
      <label className="min-w-0 flex-1 text-sm">
        <span className="mb-1 block text-[11px] tracking-wide text-muted-foreground uppercase">To</span>
        <select
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-3 text-base"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label} · {l.native}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function VoiceRecorder({
  recording,
  busy,
  label,
  onStart,
  onStop,
}: {
  recording: boolean;
  busy: boolean;
  label: string;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-4">
      <button
        type="button"
        onClick={recording ? onStop : onStart}
        className={cn(
          "grid size-28 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-lift)] transition-colors",
          recording ? "animate-pulse bg-destructive" : "bg-primary",
        )}
        aria-label={recording ? "Stop recording" : label}
      >
        {busy ? (
          <Loader2 className="size-9 animate-spin" />
        ) : recording ? (
          <Square className="size-9" />
        ) : (
          <Mic className="size-10" />
        )}
      </button>
      <p className="text-sm font-semibold">
        {recording ? "🔴 Listening…" : busy ? "Processing…" : label}
      </p>
    </div>
  );
}

export function TranslationOutput({
  sourceLabel,
  sourceText,
  targetLabel,
  targetText,
}: {
  sourceLabel: string;
  sourceText: string;
  targetLabel: string;
  targetText: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{sourceLabel}</p>
        <p className="mt-1 text-base font-medium">{sourceText}</p>
      </div>
      <p className="text-center text-muted-foreground">↓</p>
      <div className="rounded-xl bg-secondary/70 p-3">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{targetLabel}</p>
        <p className="mt-1 font-display text-lg font-semibold">{targetText}</p>
      </div>
    </div>
  );
}

export function AudioPlayer({
  label,
  onPlay,
  onStop,
}: {
  label: string;
  onPlay: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onPlay}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground"
      >
        <Volume2 className="size-4" /> {label}
      </button>
      <button
        type="button"
        onClick={onPlay}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium"
      >
        <RotateCcw className="size-4" /> Replay
      </button>
      <button
        type="button"
        onClick={onStop}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium"
      >
        <Square className="size-4" /> Stop
      </button>
    </div>
  );
}

function speakLocal(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LOCALE[lang] ?? "en-IN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export type PanelVariant = "home" | "teacher" | "student";

const COPY: Record<PanelVariant, { micLabel: string; playLabel: string; youSaid: string; theyHear: string }> = {
  home: { micLabel: "Tap to Speak", playLabel: "Play Translation", youSaid: "You said", theyHear: "Translation" },
  teacher: { micLabel: "Speak to Students", playLabel: "Play for Students", youSaid: "Teacher said", theyHear: "Student language" },
  student: { micLabel: "Student speaks", playLabel: "Play for Teacher", youSaid: "Student said", theyHear: "Teacher hears" },
};

/**
 * One translation panel that renders a different interface for each of the
 * four modes. Used on Home (Instant Translator), in the Teacher Language
 * Bridge and in Student Response — each with its own independent state.
 */
export function TranslationPanel({
  variant,
  defaultFrom,
  defaultTo,
  onSend,
  onSaved,
}: {
  variant: PanelVariant;
  defaultFrom: string;
  defaultTo: string;
  onSend?: ((text: string) => void) | undefined;
  onSaved?: (() => void) | undefined;
}) {
  const copy = COPY[variant];
  const recorder = useRef<WavRecorder | null>(null);

  const [mode, setMode] = useState<TranslationMode>("voice-to-voice");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<TranslationResultState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isVoiceIn = mode === "voice-to-voice" || mode === "voice-to-text";
  const isVoiceOut = mode === "voice-to-voice" || mode === "text-to-voice";

  const run = useMutation({
    mutationFn: async (input: { text?: string; audio?: Blob }) => {
      const outcome = await runLanguageBridge({
        mode: SERVER_MODE[mode],
        sourceLanguage: from,
        targetLanguage: to,
        ...input,
      });
      return {
        transcript: outcome.transcript,
        translated: outcome.translatedText,
        audioUrl: outcome.audioUrl,
      } satisfies TranslationResultState;
    },
    onMutate: () => setError(null),
    onSuccess: (res) => {
      setResult(res);
      if (isVoiceOut) play(res);
    },
    onError: (err) => {
      // A real failure is reported as a real failure — the UI never invents a
      // translation to look like it worked.
      const message =
        err instanceof BridgeInputError ? err.message : friendlyApiErrorMessage(err);
      setError(message);
      setResult(null);
      toast.error(message);
    },
  });

  const play = (res: TranslationResultState | null = result) => {
    if (!res) return;
    if (res.audioUrl) void new Audio(res.audioUrl).play();
    else speakLocal(res.translated, to);
  };

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const startRecording = async () => {
    setError(null);
    const recorderInstance = new WavRecorder();
    try {
      await recorderInstance.start();
      recorder.current = recorderInstance;
      setRecording(true);
    } catch {
      recorderInstance.cancel();
      recorder.current = null;

      // No microphone permission or no supported capture path: only the
      // voice-input modes are blocked, and the UI says so instead of pretending
      // to have heard something.
      const message = isVoiceIn
        ? "Microphone access is needed for the voice modes. Allow it in your browser, or switch to Text → Text / Text → Voice."
        : "Microphone access was refused.";
      setRecording(false);
      setError(message);
    }
  };

  const stopRecording = () => {
    const recorderInstance = recorder.current;
    setRecording(false);
    if (!recorderInstance) return;
    recorder.current = null;

    const { blob, durationMs } = recorderInstance.stop();
    if (durationMs < 500 || blob.size === 0) {
      setError("That was too short to understand. Please hold the mic and speak a full sentence.");
      return;
    }
    run.mutate({ audio: blob });
  };

  const copyOut = () => {
    void navigator.clipboard.writeText(result?.translated ?? "");
    toast.success("Copied");
  };

  const save = async () => {
    if (!result) return;
    try {
      // Every translation is already persisted server-side by
      // POST /api/translations (the backend records it in the user's history the
      // moment it is produced), so saving means confirming the session and
      // showing the row in "Recent translations" — not issuing a second,
      // duplicate translation.
      await ensureBackendSession();
      onSaved?.();
      if (variant === "home") {
        toast.success("Saved to your translations on the server");
      } else {
        toast.success("Saved");
      }
    } catch (err) {
      toast.error(friendlyApiErrorMessage(err));
    }
  };


  const reset = () => {
    setResult(null);
    setText("");
    setError(null);
  };

  return (
    <div className="space-y-4">
      <LanguageSelector
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        onSwap={() => {
          setFrom(to);
          setTo(from);
          reset();
        }}
      />

      <TranslationModeSelector
        value={mode}
        idPrefix={variant}
        onChange={(m) => {
          setMode(m);
          reset();
        }}
      />

      <div className="rounded-2xl border border-border bg-card/60 p-3.5 sm:p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          {languageLabel(from)} → {languageLabel(to)}
        </p>

        {isVoiceIn ? (
          <VoiceRecorder
            recording={recording}
            busy={run.isPending}
            label={mode === "voice-to-text" ? `${copy.micLabel}` : copy.micLabel}
            onStart={startRecording}
            onStop={stopRecording}
          />
        ) : (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={mode === "text-to-text" ? 4 : 3}
              placeholder="Type what you want to translate…"
              className="w-full rounded-xl border border-border bg-card p-3 text-base"
            />
            <button
              type="button"
              disabled={!text.trim() || run.isPending}
              onClick={() => run.mutate({ text })}
              className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-50"
            >
              {run.isPending
                ? "Translating…"
                : mode === "text-to-voice"
                  ? variant === "teacher"
                    ? "Translate & Play"
                    : "Translate & Speak"
                  : "Translate"}
            </button>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-4 space-y-3">
            <TranslationOutput
              sourceLabel={copy.youSaid}
              sourceText={result.transcript}
              targetLabel={copy.theyHear}
              targetText={result.translated}
            />

            {isVoiceOut && result.audioUrl ? (
              <p className="text-[11px] text-muted-foreground">
                Spoken audio synthesized by the voice service.
              </p>
            ) : null}

            {isVoiceOut && !result.audioUrl ? (
              <p className="text-[11px] text-muted-foreground">
                Spoken with this device's voice — the voice service could not return audio.
              </p>
            ) : null}

            {isVoiceOut ? <AudioPlayer label={`🔊 ${copy.playLabel}`} onPlay={() => play()} onStop={stopAudio} /> : null}

            <div className="flex flex-wrap gap-2">
              {isVoiceIn ? (
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    void startRecording();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
                >
                  <Mic className="size-4" /> Speak Again
                </button>
              ) : null}
              {!isVoiceOut ? (
                <button
                  type="button"
                  onClick={copyOut}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
                >
                  <Copy className="size-4" /> Copy
                </button>
              ) : null}
              {variant === "home" && !isVoiceOut ? (
                <button
                  type="button"
                  onClick={() => void save()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
                >
                  <Save className="size-4" /> Save
                </button>
              ) : null}
              {variant !== "home" ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt("Edit the translation", result.translated);
                    if (next !== null) setResult({ ...result, translated: next });
                  }}
                  className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
                >
                  Edit
                </button>
              ) : null}
              {variant === "teacher" ? (
                <button
                  type="button"
                  onClick={() => {
                    onSend?.(result.translated);
                    toast.success("Sent to students");
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground"
                >
                  <Send className="size-4" /> Send
                </button>
              ) : null}
              {variant === "student" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onSend?.(result.translated);
                      toast.success("Replying to the student");
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground"
                  >
                    <Send className="size-4" /> Respond
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
                  >
                    <Save className="size-4" /> Save
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium"
              >
                <RotateCcw className="size-4" /> Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TeacherLanguageBridge({ onSend }: { onSend?: ((text: string) => void) | undefined }) {
  return <TranslationPanel variant="teacher" defaultFrom="hi" defaultTo="sat" onSend={onSend} />;
}

export function StudentResponsePanel({ onSend }: { onSend?: ((text: string) => void) | undefined }) {
  return <TranslationPanel variant="student" defaultFrom="sat" defaultTo="hi" onSend={onSend} />;
}
