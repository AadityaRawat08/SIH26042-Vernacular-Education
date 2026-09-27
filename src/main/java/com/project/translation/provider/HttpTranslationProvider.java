package com.project.translation.provider;

import com.project.config.AiTranslationProperties;
import com.project.language.Language;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;

/**
 * {@link TranslationProvider} that delegates to the external AI translation
 * service (the Python FastAPI "Member 4" service) over HTTP.
 *
 * <p>Activated only when {@code translation.provider=http} is set; otherwise the
 * development {@link MockTranslationProvider} remains in use. The service is
 * reached at {@code ai-translation.base-url} (default
 * {@code http://localhost:8000}).</p>
 *
 * <p>Failures — an unreachable service or a {@code success:false} response
 * (e.g. "Translation service is not configured" when the Bhashini key is
 * missing) — are surfaced as {@link RuntimeException}s. {@code TranslationService}
 * already catches those, records a FAILED translation, and never leaks Python
 * internals to the frontend.</p>
 *
 * <p>The provider never invents a result: when the AI service answers from its
 * isolated local development translator ({@code demo_mode: true}, only possible
 * when no Bhashini key is configured) the translation is recorded with the
 * {@value #DEMO_PROVIDER_SUFFIX} suffix so it can never be mistaken for a real
 * Bhashini translation.</p>
 */
@Component
@ConditionalOnProperty(name = "translation.provider", havingValue = "http")
public class HttpTranslationProvider implements TranslationProvider {

    public static final String PROVIDER_NAME = "ai-translation";

    /** Suffix recorded when the AI service answered from its local development translator. */
    public static final String DEMO_PROVIDER_SUFFIX = "(demo)";

    private final AiTranslationProperties properties;
    private final RestClient restClient;

    public HttpTranslationProvider(AiTranslationProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory(properties.timeoutSeconds()))
                .build();
    }

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public String translate(String text, Language sourceLanguage, Language targetLanguage) {
        return extractTranslatedText(call(text, sourceLanguage, targetLanguage));
    }

    @Override
    public TranslationOutcome translateWithName(String text, Language sourceLanguage, Language targetLanguage) {
        TranslationApiResponse response = call(text, sourceLanguage, targetLanguage);
        return new TranslationOutcome(extractTranslatedText(response), effectiveProvider(response));
    }

    private TranslationApiResponse call(String text, Language sourceLanguage, Language targetLanguage) {
        Map<String, String> body = Map.of(
                "text", text,
                "source_lang", sourceLanguage.getCode(),
                "target_lang", targetLanguage.getCode());

        try {
            return restClient.post()
                    .uri("/translate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(TranslationApiResponse.class);
        } catch (RestClientException ex) {
            throw new RuntimeException("AI translation service is unavailable", ex);
        }
    }

    private static String extractTranslatedText(TranslationApiResponse response) {
        if (response == null || !Boolean.TRUE.equals(response.success())) {
            String error = response != null && response.error() != null ? response.error() : "unknown error";
            throw new RuntimeException("AI translation service is not configured yet (" + error + ")");
        }

        if (response.translatedText() == null || response.translatedText().isBlank()) {
            throw new RuntimeException("AI translation service returned an empty result");
        }

        return response.translatedText();
    }

    /**
     * Names the engine that actually produced the text.
     *
     * <p>The AI service reports {@code demo_mode: true} when it served the request
     * from its local development translator because no Bhashini key is configured.
     * That result is still a real, persisted translation, but it must never be
     * recorded as a Bhashini/remote result — so the provider is suffixed here.</p>
     *
     * <p>Package-private so the mapping can be unit-tested without a live AI
     * service.</p>
     */
    static String effectiveProvider(TranslationApiResponse response) {
        return Boolean.TRUE.equals(response.demoMode())
                ? PROVIDER_NAME + " " + DEMO_PROVIDER_SUFFIX
                : PROVIDER_NAME;
    }

    private static ClientHttpRequestFactory requestFactory(int timeoutSeconds) {
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        return factory;
    }

    /**
     * Parsed shape of the translation service's {@code /translate} response.
     *
     * <p>{@code provider} and {@code demoMode} are optional, backward-compatible
     * additions: the AI service fills them in when it answers from its local
     * development translator instead of Bhashini.</p>
     */
    public record TranslationApiResponse(
            Boolean success,
            @com.fasterxml.jackson.annotation.JsonProperty("translated_text") String translatedText,
            @com.fasterxml.jackson.annotation.JsonProperty("provider") String provider,
            @com.fasterxml.jackson.annotation.JsonProperty("demo_mode") Boolean demoMode,
            String error) {
    }
}
