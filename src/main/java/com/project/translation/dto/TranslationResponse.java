package com.project.translation.dto;

import com.project.translation.Translation;
import com.project.translation.TranslationStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a {@link Translation}.
 *
 * <p>Deliberately exposes language <em>codes</em> rather than the JPA entities,
 * so no entity ever leaks into an API response.</p>
 *
 * @param id             unique translation id
 * @param sourceLanguage source language code (ISO 639)
 * @param targetLanguage target language code (ISO 639)
 * @param sourceText     original text
 * @param translatedText provider output (null when {@code status} is FAILED)
 * @param provider       provider that handled the translation
 * @param status         outcome (COMPLETED or FAILED)
 * @param createdAt      creation time
 */
public record TranslationResponse(
        UUID id,
        String sourceLanguage,
        String targetLanguage,
        String sourceText,
        String translatedText,
        String provider,
        TranslationStatus status,
        Instant createdAt) {

    public static TranslationResponse from(Translation translation) {
        return new TranslationResponse(
                translation.getId(),
                translation.getSourceLanguage().getCode(),
                translation.getTargetLanguage().getCode(),
                translation.getSourceText(),
                translation.getTranslatedText(),
                translation.getProvider(),
                translation.getStatus(),
                translation.getCreatedAt());
    }
}
