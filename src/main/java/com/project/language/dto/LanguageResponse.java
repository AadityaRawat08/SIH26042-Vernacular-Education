package com.project.language.dto;

import com.project.language.Language;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a {@link Language}.
 *
 * <p>Scripts supported by a language are served separately through
 * {@code GET /api/languages/{id}/scripts} to keep listings lean.</p>
 *
 * @param id          unique id
 * @param name        English display name
 * @param nativeName  name written in the language itself
 * @param code        standard language code (ISO 639-1/2-3, lower-case)
 * @param description optional description
 * @param isActive    whether the language appears in public listings
 * @param createdAt   creation time
 * @param updatedAt   last update time
 */
public record LanguageResponse(
        UUID id,
        String name,
        String nativeName,
        String code,
        String description,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt) {

    public static LanguageResponse from(Language language) {
        return new LanguageResponse(
                language.getId(),
                language.getName(),
                language.getNativeName(),
                language.getCode(),
                language.getDescription(),
                language.isActive(),
                language.getCreatedAt(),
                language.getUpdatedAt());
    }
}