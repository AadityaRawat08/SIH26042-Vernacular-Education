package com.project.speech.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for translating the transcribed text of a speech-to-text
 * record.
 *
 * <p>{@code sourceLanguage} is optional: when omitted, the service uses the
 * speech record's {@code languageCode}; it becomes required only if the record
 * has no language.</p>
 *
 * @param sourceLanguage optional source language code (ISO 639); ignored when
 *                       the speech record already carries a language
 * @param targetLanguage target language code (ISO 639), required
 */
public record SpeechTranslateRequest(
        @Size(max = 8, message = "sourceLanguage must be at most 8 characters")
        String sourceLanguage,

        @NotBlank(message = "targetLanguage must not be blank")
        @Size(max = 8, message = "targetLanguage must be at most 8 characters")
        String targetLanguage) {
}
