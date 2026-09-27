package com.project.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Refresh-token request payload.
 *
 * @param refreshToken the refresh token previously issued by login/refresh
 */
public record RefreshTokenRequest(
        @NotBlank(message = "refreshToken must not be blank")
        String refreshToken) {
}