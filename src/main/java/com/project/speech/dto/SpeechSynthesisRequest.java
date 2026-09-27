package com.project.speech.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for text-to-speech synthesis.
 *
 * @param text     non-blank text to synthesize
 * @param language required language code (ISO 639) of the text; must reference
 *                 an existing, active language
 */
public record SpeechSynthesisRequest(
        @NotBlank(message = "text must not be blank")
        @Size(max = 5000, message = "text must be at most 5000 characters")
        String text,

        @NotBlank(message = "language must not be blank")
        @Size(max = 8, message = "language must be at most 8 characters")
        String language) {
}
