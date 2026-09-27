package com.project.health;

import com.project.common.dto.ApiResponse;
import com.project.translation.TranslationProviderStatusService;
import com.project.translation.TranslationServiceStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * Lightweight application liveness endpoint.
 *
 * <p>For deep health details (database, disk, etc.) use Spring Boot Actuator's
 * {@code /actuator/health} endpoint, which aggregates registered health indicators.
 *
 * <p>{@code GET /api/health/translation} reports whether the translation
 * pipeline can actually translate right now (local mock provider, live Bhashini
 * path, or the AI service's isolated local development translator). It exposes
 * no credential and never performs a translation.</p>
 */
@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Application health and liveness checks")
public class HealthController {

    private final String serviceName;
    private final String version;
    private final TranslationProviderStatusService translationProviderStatusService;

    public HealthController(
            @Value("${info.app.name}") String serviceName,
            @Value("${info.app.version}") String version,
            TranslationProviderStatusService translationProviderStatusService) {
        this.serviceName = serviceName;
        this.version = version;
        this.translationProviderStatusService = translationProviderStatusService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Application liveness check",
            description = "Returns service identity and current status. Returns HTTP 200 whenever the app is running.")
    public ApiResponse<AppHealthResponse> health() {
        AppHealthResponse body = new AppHealthResponse("UP", serviceName, version, Instant.now());
        return ApiResponse.of("Service is up", body);
    }

    @GetMapping(value = "/translation", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Translation pipeline status",
            description = "Reports the configured translation provider, whether the external AI translation "
                    + "service is reachable, and whether it can currently translate (Bhashini) or is answering "
                    + "from its isolated local development translator. Read-only; no credentials are exposed. "
                    + "Returns HTTP 200 even when the AI service is down — inspect the `mode` field.")
    public ApiResponse<TranslationServiceStatus> translationStatus() {
        return ApiResponse.of("Translation status",
                translationProviderStatusService.status());
    }
}