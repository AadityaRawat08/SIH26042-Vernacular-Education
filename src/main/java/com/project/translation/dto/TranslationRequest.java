package com.project.translation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for a translation.
 *
 * @param sourceLanguage source language code (ISO 639, e.g. {@code hi})
 * @param targetLanguage target language code (ISO 639, e.g. {@code en})
 * @param text           non-blank source text to translate
 */
public record TranslationRequest(
        @NotBlank(message = "sourceLanguage must not be blank")
        String sourceLanguage,

        @NotBlank(message = "targetLanguage must not be blank")
        String targetLanguage,

        @NotBlank(message = "text must not be blank")
        @Size(max = 5000, message = "text must be at most 5000 characters")
        String text) {
}
