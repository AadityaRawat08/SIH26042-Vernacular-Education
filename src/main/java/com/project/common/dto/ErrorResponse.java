package com.project.common.dto;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * Standard error response body returned for every failed API call.
 *
 * <p>Example body:
 * <pre>
 * {
 *   "timestamp": "2026-09-04T10:00:00Z",
 *   "status": 400,
 *   "error": "Bad Request",
 *   "message": "Validation failed",
 *   "path": "/api/example",
 *   "fieldErrors": { "name": "must not be blank" }
 * }
 * </pre>
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors) {

    public static ErrorResponse of(HttpStatus status, String message, String path) {
        return new ErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), message, path, null);
    }

    public static ErrorResponse of(HttpStatus status, String message, String path, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), message, path, fieldErrors);
    }
}