package com.project.dictionary;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.dictionary.dto.CreateDictionaryEntryRequest;
import com.project.dictionary.dto.DictionaryEntryResponse;
import com.project.dictionary.dto.UpdateDictionaryEntryRequest;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.List;
import java.util.UUID;

/**
 * Application service managing local {@link DictionaryEntry} records.
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>the owning language is referenced by ISO 639 code and must exist and be
 *       active (404 unknown, 422 inactive) &mdash; resolved via
 *       {@link LanguageRepository} exactly like the translation module</li>
 *   <li>{@code word} and {@code definition} are required and trimmed</li>
 *   <li>words are normalized (trim + lower-case + collapse whitespace) before
 *       persistence; the normalized form drives search and uniqueness</li>
 *   <li>the same normalized word for the same language is rejected as a
 *       duplicate (422), regardless of input casing/whitespace</li>
 *   <li>language is immutable on update (delete + recreate to re-assign)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DictionaryService {

    static final int MAX_PAGE_SIZE = 100;

    private final DictionaryRepository dictionaryRepository;
    private final LanguageRepository languageRepository;

    /**
     * Creates a new dictionary entry.
     *
     * @throws ResourceNotFoundException when the language code is unknown
     * @throws BusinessException         when the language is inactive or an entry
     *                                   for {@code word} already exists in that language
     */
    @Transactional
    public DictionaryEntryResponse create(CreateDictionaryEntryRequest request) {
        Language language = resolveActiveLanguage(request.language());
        String trimmedWord = request.word().trim();
        String normalizedWord = normalizeWord(trimmedWord);
        if (dictionaryRepository.existsByLanguage_CodeAndNormalizedWord(language.getCode(), normalizedWord)) {
            throw new BusinessException("An entry for language '" + language.getCode()
                    + "' with word '" + trimmedWord + "' already exists");
        }
        DictionaryEntry entry = DictionaryEntry.builder()
                .language(language)
                .word(trimmedWord)
                .normalizedWord(normalizedWord)
                .pronunciation(trimToNull(request.pronunciation()))
                .definition(request.definition().trim())
                .partOfSpeech(trimToNull(request.partOfSpeech()))
                .exampleSentence(trimToNull(request.exampleSentence()))
                .translation(trimToNull(request.translation()))
                .build();
        // saveAndFlush so the id/timestamps are populated before mapping.
        return DictionaryEntryResponse.from(dictionaryRepository.saveAndFlush(entry));
    }

    /**
     * Updates mutable fields of an entry. The language is fixed and never changes.
     *
     * @throws ResourceNotFoundException when the entry id is unknown
     * @throws BusinessException         when the new word would collide with an
     *                                   existing entry for the same language
     */
    @Transactional
    public DictionaryEntryResponse update(UUID id, UpdateDictionaryEntryRequest request) {
        DictionaryEntry entry = getEntity(id);
        String trimmedWord = request.word().trim();
        String normalizedWord = normalizeWord(trimmedWord);
        if (dictionaryRepository.existsByLanguage_CodeAndNormalizedWordAndIdNot(
                entry.getLanguage().getCode(), normalizedWord, id)) {
            throw new BusinessException("An entry for language '" + entry.getLanguage().getCode()
                    + "' with word '" + trimmedWord + "' already exists");
        }
        entry.setWord(trimmedWord);
        entry.setNormalizedWord(normalizedWord);
        entry.setPronunciation(trimToNull(request.pronunciation()));
        entry.setDefinition(request.definition().trim());
        entry.setPartOfSpeech(trimToNull(request.partOfSpeech()));
        entry.setExampleSentence(trimToNull(request.exampleSentence()));
        entry.setTranslation(trimToNull(request.translation()));
        return DictionaryEntryResponse.from(dictionaryRepository.save(entry));
    }

    /** Deletes an entry. */
    @Transactional
    public void delete(UUID id) {
        dictionaryRepository.delete(getEntity(id));
    }

    /** Returns a single entry by id (404 when unknown). */
    @Transactional(readOnly = true)
    public DictionaryEntryResponse get(UUID id) {
        return DictionaryEntryResponse.from(getEntity(id));
    }

    /**
     * Searches entries for a language, optionally filtered by word.
     *
     * <p>{@code language} must reference an existing, active language. When
     * {@code word} is blank, all entries for the language are returned (newest
     * first); otherwise results match the normalized word case-insensitively,
     * with exact matches ordered first.
     *
     * @throws ResourceNotFoundException when the language code is unknown
     * @throws BusinessException         when the language is inactive
     */
    @Transactional(readOnly = true)
    public List<DictionaryEntryResponse> search(String languageCode, String word, int page, int size) {
        Language language = resolveActiveLanguage(languageCode);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("word")));

        Page<DictionaryEntry> result = (word == null || word.isBlank())
                ? dictionaryRepository.findByLanguage_Code(language.getCode(), pageable)
                : dictionaryRepository.searchByLanguageAndWord(language.getCode(), normalizeWord(word), pageable);

        return result.getContent().stream()
                .map(DictionaryEntryResponse::from)
                .toList();
    }

    private DictionaryEntry getEntity(UUID id) {
        return dictionaryRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Dictionary entry with id " + id + " was not found"));
    }

    /**
     * Resolves a single dictionary entry by language and raw word, applying the
     * same word normalization as storage. Used by the learning module to resolve
     * a practiced word back to its dictionary entry.
     *
     * @throws ResourceNotFoundException when the word has no entry for the language
     */
    @Transactional(readOnly = true)
    public DictionaryEntry findEntry(Language language, String rawWord) {
        String normalizedWord = normalizeWord(rawWord.trim());
        return dictionaryRepository.findByLanguage_CodeAndNormalizedWord(language.getCode(), normalizedWord)
                .orElseThrow(() -> new ResourceNotFoundException("Dictionary entry with word '"
                        + rawWord.trim() + "' was not found for language '" + language.getCode() + "'"));
    }

    /** Resolves a language by its ISO 639 code, requiring it to be active. */
    private Language resolveActiveLanguage(String code) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("language must not be blank");
        }
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        Language language = languageRepository.findByCode(normalized)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language with code '" + code + "' was not found"));
        if (!language.isActive()) {
            throw new BusinessException("Language '" + language.getName() + "' is inactive");
        }
        return language;
    }

    /** Trim + lower-case + collapse internal whitespace, mirroring storage normalization. */
    static String normalizeWord(String word) {
        return word.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
