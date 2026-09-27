package com.project.common.dto;

import java.time.Instant;

/**
 * Standard success envelope for REST responses.
 *
 * <p>Example: {@code {"success": true, "message": "Service is up", "data": {...}, "timestamp": "..."}}
 *
 * @param <T> payload type
 */
public record ApiResponse<T>(boolean success, String message, T data, Instant timestamp) {

    public ApiResponse {
        timestamp = timestamp == null ? Instant.now() : timestamp;
    }

    /** Creates a success response carrying only a payload. */
    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(true, null, data, Instant.now());
    }

    /** Creates a success response carrying a message and a payload. */
    public static <T> ApiResponse<T> of(String message, T data) {
        return new ApiResponse<>(true, message, data, Instant.now());
    }
}