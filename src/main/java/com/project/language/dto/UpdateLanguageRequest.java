package com.project.language.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * Request payload for updating an existing language.
 *
 * <p>The {@code code} is intentionally immutable — it is the stable public
 * identifier referenced by user preferences and external clients.</p>
 *
 * @param name        English display name
 * @param nativeName  name written in the language itself
 * @param description optional description
 * @param isActive    whether the language appears in public listings
 * @param scriptCodes optional replacement set of script codes; {@code null}
 *                    leaves the current links unchanged, an empty set clears them
 */
public record UpdateLanguageRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name must be at most 80 characters")
        String name,

        @NotBlank(message = "nativeName must not be blank")
        @Size(max = 80, message = "nativeName must be at most 80 characters")
        String nativeName,

        @Size(max = 500, message = "description must be at most 500 characters")
        String description,

        @NotNull(message = "isActive must not be null")
        Boolean isActive,

        Set<String> scriptCodes) {
}