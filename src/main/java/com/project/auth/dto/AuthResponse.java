package com.project.auth.dto;

import com.project.user.dto.UserResponse;

/**
 * Successful login/refresh response.
 *
 * <p>Contains no password material in any field.</p>
 *
 * @param accessToken  signed JWT access token (short-lived)
 * @param refreshToken opaque refresh token (long-lived, rotated on every use)
 * @param tokenType    always {@code Bearer}
 * @param expiresIn    access-token lifetime in seconds
 * @param user         safe public view of the authenticated account
 */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserResponse user) {
}