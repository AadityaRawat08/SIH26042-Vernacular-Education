package com.project.translation.provider;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for how {@link HttpTranslationProvider} names the engine that
 * produced a translation.
 *
 * <p>The provider name is persisted on every translation, so it is the record
 * that must never claim a Bhashini result for a text produced by the AI
 * service's isolated local development translator. No network call is made
 * here: only the response-to-name mapping is exercised.</p>
 */
class HttpTranslationProviderTest {

    private static HttpTranslationProvider.TranslationApiResponse response(Boolean demoMode) {
        return new HttpTranslationProvider.TranslationApiResponse(
                true, "ᱟᱡᱤ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭᱟ", demoMode == null ? null : "demo-glossary", demoMode, null);
    }

    @Test
    void realBhashiniResult_isRecordedAsRemoteProvider() {
        assertThat(HttpTranslationProvider.effectiveProvider(response(false)))
                .isEqualTo(HttpTranslationProvider.PROVIDER_NAME);
    }

    @Test
    void responseWithoutDemoFlag_isRecordedAsRemoteProvider() {
        // Older AI-service responses carry no demo flag at all.
        assertThat(HttpTranslationProvider.effectiveProvider(response(null)))
                .isEqualTo(HttpTranslationProvider.PROVIDER_NAME);
    }

    @Test
    void localDevelopmentFallback_isNeverRecordedAsRemoteProvider() {
        assertThat(HttpTranslationProvider.effectiveProvider(response(true)))
                .isEqualTo(HttpTranslationProvider.PROVIDER_NAME + " " + HttpTranslationProvider.DEMO_PROVIDER_SUFFIX);
    }
}
