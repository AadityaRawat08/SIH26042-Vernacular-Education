package com.project.translation;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.project.config.AiTranslationProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;

/**
 * Reports which translation engine the backend is actually able to use.
 *
 * <p>Backs {@code GET /api/health/translation}. The probe is deliberately
 * cheap, read-only and short-timed-out: it calls the AI translation service's
 * root endpoint and never performs a translation, so it is safe to call during
 * a demo or from an external health check.</p>
 *
 * <p>No credential is ever read, echoed or logged here — the AI service owns the
 * Bhashini key and only reports whether it is configured.</p>
 */
@Slf4j
@Service
public class TranslationProviderStatusService {

    /** Probe timeout: a health endpoint must never hang on an absent service. */
    private static final int PROBE_TIMEOUT_SECONDS = 2;

    private static final String MODE_LIVE = "live";
    private static final String MODE_DEMO = "demo";
    private static final String MODE_UNAVAILABLE = "unavailable";
    private static final String MODE_LOCAL_MOCK = "local-mock";

    private final String configuredProvider;
    private final AiTranslationProperties properties;
    private final RestClient restClient;

    public TranslationProviderStatusService(
            @Value("${translation.provider:mock}") String configuredProvider,
            AiTranslationProperties properties) {
        this.configuredProvider = configuredProvider;
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory())
                .build();
    }

    /** Resolves the current status; never throws. */
    public TranslationServiceStatus status() {
        if (!"http".equalsIgnoreCase(configuredProvider)) {
            return new TranslationServiceStatus(
                    configuredProvider,
                    properties.baseUrl(),
                    false,
                    false,
                    false,
                    MODE_LOCAL_MOCK,
                    List.of(),
                    "Backend is using the local development mock translation provider.");
        }

        AiServiceProbe probe = probe();
        if (probe == null) {
            return new TranslationServiceStatus(
                    configuredProvider,
                    properties.baseUrl(),
                    false,
                    false,
                    false,
                    MODE_UNAVAILABLE,
                    List.of(),
                    "AI translation service is not reachable at " + properties.baseUrl() + ".");
        }

        boolean ready = Boolean.TRUE.equals(probe.translationReady());
        boolean demo = Boolean.TRUE.equals(probe.demoMode());
        String mode = ready ? MODE_LIVE : (demo ? MODE_DEMO : MODE_UNAVAILABLE);
        String detail = switch (mode) {
            case MODE_LIVE -> "AI translation service is connected to Bhashini.";
            case MODE_DEMO -> "AI translation service has no Bhashini key and is answering from its "
                    + "isolated local development translator.";
            default -> "AI translation service is running but cannot translate right now.";
        };

        return new TranslationServiceStatus(
                configuredProvider,
                properties.baseUrl(),
                true,
                ready,
                demo,
                mode,
                probe.supportedLanguages() == null ? List.of() : probe.supportedLanguages(),
                detail);
    }

    /** Probes the AI service root endpoint; returns null when it is unreachable. */
    private AiServiceProbe probe() {
        try {
            return restClient.get()
                    .uri("/")
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(AiServiceProbe.class);
        } catch (RestClientException ex) {
            log.debug("AI translation service probe failed at {}: {}", properties.baseUrl(), ex.getMessage());
            return null;
        }
    }

    private static ClientHttpRequestFactory requestFactory() {
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(PROBE_TIMEOUT_SECONDS))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(PROBE_TIMEOUT_SECONDS));
        return factory;
    }

    /** Parsed shape of the AI translation service root endpoint. */
    public record AiServiceProbe(
            String status,
            String service,
            @JsonProperty("translation_ready") Boolean translationReady,
            @JsonProperty("demo_mode") Boolean demoMode,
            @JsonProperty("supported_languages") List<String> supportedLanguages) {
    }
}
