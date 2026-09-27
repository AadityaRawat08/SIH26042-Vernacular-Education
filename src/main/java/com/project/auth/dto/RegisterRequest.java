package com.project.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Registration request payload.
 *
 * <p>Deliberately has no {@code role} field: accounts created here are always
 * ordinary {@code USER} accounts — privileges are only granted through
 * administrative flows, preventing self-service privilege escalation.</p>
 *
 * @param username          unique login handle (3-50 chars, letters/digits/._-)
 * @param email             unique email address (max 254 chars)
 * @param password          raw password (8-100 chars) — BCrypt-hashed before storage
 * @param displayName       optional human-readable name (max 100 chars)
 * @param preferredLanguage optional ISO 639-1 language code, defaults to {@code en}
 */
public record RegisterRequest(
        @NotBlank(message = "username must not be blank")
        @Size(min = 3, max = 50, message = "username must be between 3 and 50 characters")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$",
                message = "username may only contain letters, digits, dots, underscores and hyphens")
        String username,

        @NotBlank(message = "email must not be blank")
        @Email(message = "email must be a valid email address")
        @Size(max = 254, message = "email must be at most 254 characters")
        String email,

        @NotBlank(message = "password must not be blank")
        @Size(min = 8, max = 100, message = "password must be between 8 and 100 characters")
        String password,

        @Size(max = 100, message = "displayName must be at most 100 characters")
        String displayName,

        @Size(max = 16, message = "preferredLanguage must be at most 16 characters")
        String preferredLanguage) {
}