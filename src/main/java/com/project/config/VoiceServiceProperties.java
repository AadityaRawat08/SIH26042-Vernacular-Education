package com.project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Connection settings for the external voice services API
 * (the Python FastAPI "Member 5" service wrapping STT/TTS).
 *
 * <p>Bound from the {@code voice-service.*} configuration namespace with
 * sensible local-development defaults.</p>
 *
 * @param baseUrl       base URL of the voice services API (default
 *                      {@code http://localhost:8001})
 * @param timeoutSeconds HTTP timeout for speech calls (default 15)
 */
@ConfigurationProperties(prefix = "voice-service")
public record VoiceServiceProperties(String baseUrl, int timeoutSeconds) {

    public VoiceServiceProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:8001";
        }
        if (timeoutSeconds <= 0) {
            timeoutSeconds = 15;
        }
    }
}
