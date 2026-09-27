import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteTranslation, getTranslationPipelineStatus, listTranslations } from "@/lib/api/translations";
import { ensureBackendSession } from "@/lib/api/bootstrap";
import { languageLabel } from "@/lib/language/types";
import { TranslationPanel } from "@/components/translation/TranslationPanel";
import { Copy, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/translate")({
  head: () => ({
    meta: [
      { title: "Instant translator — Tribhashniya" },
      {
        name: "description",
        content: "Speak or type in Hindi or English and get it back in your classroom language, as text or spoken audio.",
      },
      { property: "og:title", content: "Instant translator — Tribhashniya" },
      { property: "og:description", content: "Voice and text translation built for multilingual classrooms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TranslatePage,
});

function speakLocal(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "en" ? "en-IN" : "hi-IN";
  window.speechSynthesis.speak(utter);
}

function TranslatePage() {
  const queryClient = useQueryClient();

  /**
   * Pipeline status comes from the backend (`GET /api/health/translation`), so
   * the badge always tells the truth about which engine is answering.
   */
  const status = useQuery({
    queryKey: ["translation-pipeline-status"],
    queryFn: async () => {
      await ensureBackendSession();
      return getTranslationPipelineStatus();
    },
    refetchOnWindowFocus: false,
  });

  /** Every translation is persisted by the backend, so this is the real history. */
  const history = useQuery({
    queryKey: ["saved-translations"],
    queryFn: async () => {
      await ensureBackendSession();
      return listTranslations(0, 20);
    },
    refetchOnWindowFocus: false,
  });

  const items = history.data ?? [];
  const mode = status.data?.mode;

  const remove = async (id: string) => {
    try {
      await deleteTranslation(id);
      toast.success("Removed");
    } catch {
      toast.error("Could not remove it. Please try again.");
    }
    void queryClient.invalidateQueries({ queryKey: ["saved-translations"] });
  };

  return (
    <AppLayout role="teacher">
      <PageHeader
        title="Instant Translator"
        subtitle="Speak or type. Translate naturally — no class needed."
        action={
          <Pill tone={mode === "live" ? "success" : mode === "unavailable" ? "warning" : "muted"}>
            {mode === "live"
              ? "Live language service"
              : mode === "demo"
                ? "Demo language service"
                : mode === "unavailable"
                  ? "Language service unavailable"
                  : "Checking language service…"}
          </Pill>
        }
      />

      {status.data?.detail ? (
        <p className="mt-3 text-xs text-muted-foreground">{status.data.detail}</p>
      ) : null}

      <Surface className="mt-5">
        <TranslationPanel
          variant="home"
          defaultFrom="hi"
          defaultTo="sat"
          onSaved={() => void queryClient.invalidateQueries({ queryKey: ["saved-translations"] })}
        />
      </Surface>

      <section className="mt-8">
        <SectionTitle meta={items.length ? `${items.length} saved` : undefined}>Recent translations</SectionTitle>
        <div className="space-y-2.5">
          {items.map((t) => (
            <div key={t.id} className="surface-card p-4">
              <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                {languageLabel(t.sourceLanguage)} → {languageLabel(t.targetLanguage)}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.sourceText}</p>
              <p className="mt-1 text-base font-semibold">{t.translatedText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => speakLocal(t.translatedText ?? "", t.targetLanguage)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground"
                >
                  <Volume2 className="size-3.5" /> Replay
                </button>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(t.translatedText ?? "");
                    toast.success("Copied");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium"
                >
                  <Copy className="size-3.5" /> Copy
                </button>
                <button
                  onClick={() => void remove(t.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-destructive"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
          {!history.isLoading && !items.length ? (
            <p className="text-sm text-muted-foreground">Nothing saved yet. Translate something and it appears here.</p>
          ) : null}
        </div>
      </section>
    </AppLayout>
  );
}
