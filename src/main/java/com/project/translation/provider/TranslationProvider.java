package com.project.translation.provider;

import com.project.language.Language;

/**
 * Abstraction over the actual translation engine.
 *
 * <p>{@code TranslationService} depends on this interface — never on a concrete
 * implementation — so the (development) {@link MockTranslationProvider} can be
 * swapped for a real provider later without touching service logic. The
 * application currently works with no external AI API.</p>
 */
public interface TranslationProvider {

    /** Stable identifier recorded on each {@code Translation} (e.g. {@code "mock"}). */
    String name();

    /**
     * Produces the translated text for the given input.
     *
     * @param text           non-blank source text
     * @param sourceLanguage resolved source language
     * @param targetLanguage resolved target language
     * @return translated text
     */
    String translate(String text, Language sourceLanguage, Language targetLanguage);

    /**
     * Translates and reports which provider <em>actually</em> produced the text.
     *
     * <p>The default implementation delegates to {@link #translate(String, Language, Language)}
     * and reports {@link #name()}, which keeps every simple provider unchanged.
     * Providers that may resolve to more than one engine per call (for example a
     * remote provider that can transparently fall back to a local development
     * translator) override this method so the persisted record never claims a
     * result it did not produce.</p>
     *
     * @param text           non-blank source text
     * @param sourceLanguage resolved source language
     * @param targetLanguage resolved target language
     * @return the translated text together with the provider that produced it
     */
    default TranslationOutcome translateWithName(String text, Language sourceLanguage, Language targetLanguage) {
        return new TranslationOutcome(translate(text, sourceLanguage, targetLanguage), name());
    }

    /**
     * Result of a translation together with the provider that produced it.
     *
     * @param text     translated text
     * @param provider provider identifier recorded on the translation
     */
    record TranslationOutcome(String text, String provider) {
    }
}
