package com.project.language.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * Request payload for creating a language.
 *
 * @param name        English display name (required)
 * @param nativeName  name written in the language itself (required)
 * @param code        standard language code — 2-3 letters, stored lower-case, unique
 * @param description optional description
 * @param isActive    optional; defaults to {@code true}
 * @param scriptCodes optional set of ISO 15924 script codes to link (must already exist)
 */
public record CreateLanguageRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name must be at most 80 characters")
        String name,

        @NotBlank(message = "nativeName must not be blank")
        @Size(max = 80, message = "nativeName must be at most 80 characters")
        String nativeName,

        @NotBlank(message = "code must not be blank")
        @Size(min = 2, max = 3, message = "code must be 2 or 3 letters")
        @Pattern(regexp = "^[a-zA-Z]{2,3}$", message = "code must contain only letters (ISO 639)")
        String code,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        Boolean isActive,

        Set<String> scriptCodes) {
}