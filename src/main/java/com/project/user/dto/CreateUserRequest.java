package com.project.user.dto;

import com.project.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a user account.
 *
 * <p>Validated with Jakarta Bean Validation. The {@code role} and
 * {@code preferredLanguage} fields are optional and fall back to {@code USER}
 * and {@code en} respectively when {@code null}.</p>
 *
 * @param username         unique login handle (3-50 chars, letters/digits/._-)
 * @param email            unique email address (max 254 chars)
 * @param password         raw password (min 8 chars) — encoded with BCrypt before storage
 * @param displayName      optional human-readable name (max 100 chars)
 * @param role             optional role, defaults to {@link UserRole#USER}
 * @param preferredLanguage optional ISO 639-1 code, defaults to {@code en}
 */
public record CreateUserRequest(
        @NotBlank(message = "username must not be blank")
        @Size(min = 3, max = 50, message = "username must be between 3 and 50 characters")
        @jakarta.validation.constraints.Pattern(
                regexp = "^[a-zA-Z0-9._-]+$",
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

        UserRole role,

        @Size(max = 16, message = "preferredLanguage must be at most 16 characters")
        String preferredLanguage) {
}