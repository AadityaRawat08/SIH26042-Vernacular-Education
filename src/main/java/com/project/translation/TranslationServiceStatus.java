package com.project.translation;

import java.util.List;

/**
 * Read-only status of the translation pipeline, reported by
 * {@code GET /api/health/translation}.
 *
 * <p>Lets an operator (and the frontend) verify — without a live translation
 * request — whether the backend is wired to the local mock provider or to the
 * external AI translation service, whether that service is reachable, and
 * whether it can currently reach Bhashini or is answering from its isolated
 * local development translator.</p>
 *
 * @param configuredProvider   value of {@code translation.provider} ({@code mock} or {@code http})
 * @param aiServiceUrl         configured AI translation service base URL
 * @param aiServiceReachable   true when the AI service answered the probe
 * @param translationReady     true when the AI service reports a working real (Bhashini) translation path
 * @param demoFallbackActive   true when the AI service falls back to its local development translator
 * @param mode                 one of {@code live}, {@code demo}, {@code unavailable}, {@code local-mock}
 * @param supportedLanguages   language codes the AI service accepts (empty for the local mock)
 * @param detail               short human-readable explanation, safe to show to a user
 */
public record TranslationServiceStatus(
        String configuredProvider,
        String aiServiceUrl,
        boolean aiServiceReachable,
        boolean translationReady,
        boolean demoFallbackActive,
        String mode,
        List<String> supportedLanguages,
        String detail) {
}
