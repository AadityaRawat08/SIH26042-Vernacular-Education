package com.project.language.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for updating an existing script.
 *
 * <p>The ISO 15924 {@code code} is immutable.</p>
 *
 * @param name        English display name
 * @param description optional description
 */
public record UpdateScriptRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name must be at most 80 characters")
        String name,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description) {
}