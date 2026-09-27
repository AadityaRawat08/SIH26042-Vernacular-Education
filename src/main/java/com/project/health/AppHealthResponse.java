package com.project.health;

import java.time.Instant;

/**
 * Payload for the application-level health check endpoint.
 */
public record AppHealthResponse(
        String status,
        String service,
        String version,
        Instant timestamp) {
}