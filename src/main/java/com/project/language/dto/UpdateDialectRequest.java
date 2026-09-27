package com.project.language.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for updating an existing dialect.
 *
 * <p>The {@code code} and the owning {@code language} are immutable.</p>
 *
 * @param name        English display name
 * @param nativeName  name written natively
 * @param description optional description
 * @param region      region where the dialect is spoken
 * @param isActive    whether the dialect appears in listings
 */
public record UpdateDialectRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name must be at most 80 characters")
        String name,

        @Size(max = 80, message = "nativeName must be at most 80 characters")
        String nativeName,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        @Size(max = 80, message = "region must be at most 80 characters")
        String region,

        @NotNull(message = "isActive must not be null")
        Boolean isActive) {
}