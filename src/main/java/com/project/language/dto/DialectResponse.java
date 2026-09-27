package com.project.language.dto;

import com.project.language.Dialect;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a {@link Dialect}.
 *
 * @param id          unique id
 * @param languageId  id of the owning language
 * @param languageCode code of the owning language
 * @param name        English display name
 * @param nativeName  name written natively, may be {@code null}
 * @param code        unique dialect code (lower-case)
 * @param description optional description
 * @param region      region where the dialect is spoken, may be {@code null}
 * @param isActive    whether the dialect appears in listings
 * @param createdAt   creation time
 * @param updatedAt   last update time
 */
public record DialectResponse(
        UUID id,
        UUID languageId,
        String languageCode,
        String name,
        String nativeName,
        String code,
        String description,
        String region,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt) {

    public static DialectResponse from(Dialect dialect) {
        return new DialectResponse(
                dialect.getId(),
                dialect.getLanguage().getId(),
                dialect.getLanguage().getCode(),
                dialect.getName(),
                dialect.getNativeName(),
                dialect.getCode(),
                dialect.getDescription(),
                dialect.getRegion(),
                dialect.isActive(),
                dialect.getCreatedAt(),
                dialect.getUpdatedAt());
    }
}