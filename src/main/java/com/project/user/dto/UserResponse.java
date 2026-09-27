package com.project.user.dto;

import com.project.user.UserRole;

import com.project.user.User;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a user account.
 *
 * <p>Deliberately excludes {@code password} — the password hash must never be
 * exposed through API responses.</p>
 *
 * @param id               unique account id
 * @param username         unique username (login handle)
 * @param email            unique email address (stored lower-cased)
 * @param displayName      human-readable name, may be {@code null}
 * @param role             account role
 * @param preferredLanguage ISO 639-1 language code
 * @param isActive         whether the account may authenticate
 * @param createdAt        account creation time
 */
public record UserResponse(
        UUID id,
        String username,
        String email,
        String displayName,
        UserRole role,
        String preferredLanguage,
        boolean isActive,
        Instant createdAt) {

    /**
     * Maps a {@link User} entity to this safe public view.
     *
     * <p>The password hash is deliberately not part of this record and can
     * therefore never leak into an API response.</p>
     */
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getPreferredLanguage(),
                user.isActive(),
                user.getCreatedAt());
    }
}