package com.project.dictionary.dto;

import com.project.dictionary.DictionaryEntry;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a {@link DictionaryEntry}.
 *
 * <p>Exposes the owning language by code (and English name) rather than the
 * JPA {@code Language} entity, so no entity ever leaks into an API response.
 *
 * @param id              unique entry id
 * @param languageCode    owning language code (ISO 639, e.g. {@code hi})
 * @param languageName    owning language English name, e.g. {@code "Hindi"}
 * @param word            the dictionary word
 * @param pronunciation   optional pronunciation
 * @param definition      meaning/gloss
 * @param partOfSpeech    grammatical category, may be {@code null}
 * @param exampleSentence optional example sentence, may be {@code null}
 * @param translation     optional free-text translation, may be {@code null}
 * @param createdAt       creation time
 * @param updatedAt       last update time
 */
public record DictionaryEntryResponse(
        UUID id,
        String languageCode,
        String languageName,
        String word,
        String pronunciation,
        String definition,
        String partOfSpeech,
        String exampleSentence,
        String translation,
        Instant createdAt,
        Instant updatedAt) {

    public static DictionaryEntryResponse from(DictionaryEntry entry) {
        return new DictionaryEntryResponse(
                entry.getId(),
                entry.getLanguage().getCode(),
                entry.getLanguage().getName(),
                entry.getWord(),
                entry.getPronunciation(),
                entry.getDefinition(),
                entry.getPartOfSpeech(),
                entry.getExampleSentence(),
                entry.getTranslation(),
                entry.getCreatedAt(),
                entry.getUpdatedAt());
    }
}
