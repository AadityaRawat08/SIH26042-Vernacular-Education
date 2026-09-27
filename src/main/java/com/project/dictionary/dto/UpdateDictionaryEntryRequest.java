package com.project.dictionary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for updating an existing dictionary entry.
 *
 * <p>The owning language is immutable &mdash; to move an entry to a different
 * language, delete and recreate it. Duplicate detection is case-insensitive
 * (via the normalized word), so re-submitting the same casing/wording does not
 * collide with itself.
 *
 * @param word            the dictionary word
 * @param pronunciation   optional pronunciation
 * @param definition      meaning/gloss
 * @param partOfSpeech    grammatical category, optional
 * @param exampleSentence optional example sentence, optional
 * @param translation     optional free-text translation/meaning
 */
public record UpdateDictionaryEntryRequest(
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
