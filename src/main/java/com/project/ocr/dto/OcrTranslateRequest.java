package com.project.ocr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for translating the extracted text of an OCR record.
 *
 * <p>{@code sourceLanguage} is optional: when omitted, the service uses the OCR
 * record's {@code detectedLanguageCode}; it becomes required only if no language
 * was detected.</p>
 *
 * @param sourceLanguage optional source language code (ISO 639); ignored when a
 *                       language was detected for the OCR record
 * @param targetLanguage target language code (ISO 639), required
 */
public record OcrTranslateRequest(
        @Size(max = 8, message = "sourceLanguage must be at most 8 characters")
        String sourceLanguage,

        @NotBlank(message = "targetLanguage must not be blank")
        @Size(max = 8, message = "targetLanguage must be at most 8 characters")
        String targetLanguage) {
}