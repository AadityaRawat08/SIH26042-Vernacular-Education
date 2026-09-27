package com.project.dictionary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a dictionary entry.
 *
 * <p>The entry is attached to a language by its ISO 639 code (matching the
 * convention used by the translation module). The code must reference an
 * existing, active language or the request fails (404 unknown / 422 inactive).
 *
 * @param language        owning language code (e.g. {@code hi}), required
 * @param word            the dictionary word, required
 * @param pronunciation   optional pronunciation
 * @param definition      meaning/gloss, required
 * @param partOfSpeech    grammatical category, optional
 * @param exampleSentence optional example sentence, optional
 * @param translation     optional free-text translation/meaning
 */
public record CreateDictionaryEntryRequest(
        @NotBlank(message = "language must not be blank")
        @Size(max = 8, message = "language must be at most 8 characters")
        String language,

        @NotBlank(message = "word must not be blank")
        @Size(max = 200, message = "word must be at most 200 characters")
        String word,

        @Size(max = 200, message = "pronunciation must be at most 200 characters")
        String pronunciation,

        @NotBlank(message = "definition must not be blank")
        @Size(max = 2000, message = "definition must be at most 2000 characters")
        String definition,

        @Size(max = 50, message = "partOfSpeech must be at most 50 characters")
        String partOfSpeech,

        @Size(max = 1000, message = "exampleSentence must be at most 1000 characters")
        String exampleSentence,

        @Size(max = 1000, message = "translation must be at most 1000 characters")
        String translation) {
}
