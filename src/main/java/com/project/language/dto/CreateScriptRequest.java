package com.project.language.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a script.
 *
 * @param name        English display name, e.g. "Devanagari" (required)
 * @param code        ISO 15924 code — 4 letters, e.g. {@code Deva} (required, unique)
 * @param description optional description
 */
public record CreateScriptRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name must be at most 80 characters")
        String name,

        @NotBlank(message = "code must not be blank")
        @Size(min = 4, max = 4, message = "code must be exactly 4 letters (ISO 15924)")
        @Pattern(regexp = "^[a-zA-Z]{4}$", message = "code must contain only letters (ISO 15924)")
        String code,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description) {
}