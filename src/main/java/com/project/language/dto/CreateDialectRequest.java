package com.project.language.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a dialect under an existing language.
 *
 * @param name        English display name (required)
 * @param nativeName  name written natively (optional)
 * @param code        unique dialect code — letters/digits/hyphens, stored lower-case
 * @param description optional description
 * @param region      region where the dialect is spoken (optional)
 * @param isActive    optional; defaults to {@code true}
 */
public record CreateDialectRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name must be at most 80 characters")
        String name,

        @Size(max = 80, message = "nativeName must be at most 80 characters")
        String nativeName,

        @NotBlank(message = "code must not be blank")
        @Size(min = 2, max = 32, message = "code must be between 2 and 32 characters")
        @Pattern(regexp = "^[a-zA-Z0-9-]+$", message = "code may only contain letters, digits and hyphens")
        String code,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        @Size(max = 80, message = "region must be at most 80 characters")
        String region,

        Boolean isActive) {
}