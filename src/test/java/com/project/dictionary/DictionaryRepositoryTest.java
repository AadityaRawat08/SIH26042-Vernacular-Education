package com.project.dictionary;

import com.project.language.Language;
import com.project.language.LanguageRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * JPA slice tests for the dictionary repository (H2 in PostgreSQL mode).
 *
 * <p>{@code @DataJpaTest} does not run {@code CommandLineRunner} seeders, so
 * languages are created explicitly here, mirroring {@code LanguageRepositoryTest}.</p>
 */
@DataJpaTest
class DictionaryRepositoryTest {

    @Autowired
    private DictionaryRepository dictionaryRepository;
    @Autowired
    private LanguageRepository languageRepository;

    private Language lang(String code) {
        return languageRepository.saveAndFlush(Language.builder()
                .name("Lang " + code).nativeName(code).code(code).isActive(true).build());
    }

    private DictionaryEntry saveEntry(Language language, String word, String normalizedWord) {
        return dictionaryRepository.saveAndFlush(DictionaryEntry.builder()
                .language(language).word(word).normalizedWord(normalizedWord).definition("def").build());
    }

    @Test
    void savePersistsUuidAndTimestamps() {
        Language hi = lang("hi");
        DictionaryEntry entry = saveEntry(hi, "नमस्ते", "नमस्ते");

        assertThat(entry.getId()).isNotNull();
        assertThat(entry.getCreatedAt()).isNotNull();
        assertThat(entry.getUpdatedAt()).isNotNull();
    }

    @Test
    void uniqueConstraint_duplicateNormalizedWordForSameLanguage_rejectedByDatabase() {
        Language hi = lang("hi");
        saveEntry(hi, "Namaste", "namaste");

        // same language, same normalized word (different casing) -> DB-level violation.
        // kept as the LAST DB operation: a flush-time constraint violation poisons the
        // shared test transaction, so no further writes may follow it.
        assertThatThrownBy(() -> saveEntry(hi, "namaste", "namaste"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void uniqueConstraint_sameWordDifferentLanguages_allowed() {
        Language hi = lang("hi");
        Language en = lang("en");

        // the composite key is (language, normalized_word): the same word in two
        // different languages must not collide.
        assertThat(saveEntry(hi, "Namaste", "namaste").getId()).isNotNull();
        assertThat(saveEntry(en, "Namaste", "namaste").getId()).isNotNull();
    }

    @Test
    void findByLanguage_Code_returnsAllEntriesForLanguagePaginated() {
        Language hi = lang("hi");
        saveEntry(hi, "नमस्ते", "नमस्ते");
        saveEntry(hi, "धन्यवाद", "धन्यवाद");
        saveEntry(hi, "घर", "घर");
        Language en = lang("en");
        saveEntry(en, "hello", "hello");

        Page<DictionaryEntry> page = dictionaryRepository.findByLanguage_Code("hi",
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).extracting(DictionaryEntry::getWord)
                .containsExactlyInAnyOrder("नमस्ते", "धन्यवाद", "घर");
    }

    @Test
    void searchByLanguageAndWord_matchesCaseInsensitiveAndOrdersExactMatchFirst() {
        Language en = lang("en");
        // 'Namaste' (norm 'namaste') contains 'nam'; 'nam' (norm 'nam') is an exact match.
        saveEntry(en, "Namaste", "namaste");
        saveEntry(en, "nam", "nam");
        saveEntry(en, "other", "other");

        Page<DictionaryEntry> found = dictionaryRepository.searchByLanguageAndWord("en", "nam",
                PageRequest.of(0, 10));

        // both 'namaste' and 'nam' contain 'nam'; 'other' does not.
        assertThat(found.getTotalElements()).isEqualTo(2);
        assertThat(found.getContent()).extracting(DictionaryEntry::getWord)
                .containsExactly("nam", "Namaste"); // exact match (norm = 'nam') ordered first
    }
}