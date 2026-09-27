package com.project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Connection settings for the external AI translation service
 * (the Python FastAPI "Member 4" service).
 *
 * <p>Bound from the {@code ai-translation.*} configuration namespace with
 * sensible local-development defaults, so the backend always starts even when
 * the service (or its Bhashini key) is not yet available.</p>
 *
 * @param baseUrl       base URL of the translation service (default
 *                      {@code http://localhost:8000})
 * @param timeoutSeconds HTTP timeout for translation calls (default 15)
 */
@ConfigurationProperties(prefix = "ai-translation")
public record AiTranslationProperties(String baseUrl, int timeoutSeconds) {

    public AiTranslationProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:8000";
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 15;
        }
    }
}
