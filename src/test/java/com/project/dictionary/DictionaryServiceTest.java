package com.project.dictionary;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.dictionary.dto.CreateDictionaryEntryRequest;
import com.project.dictionary.dto.DictionaryEntryResponse;
import com.project.dictionary.dto.UpdateDictionaryEntryRequest;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-context service tests for the dictionary module (H2, PostgreSQL mode).
 *
 * <p>Language seed data ({@code hi}, {@code en}, …) committed by
 * {@code LanguageDataInitializer} at context startup is used as read-only
 * fixture alongside the small committed dictionary seed.</p>
 */
@SpringBootTest
@Transactional
class DictionaryServiceTest {

    @Autowired
    private DictionaryService dictionaryService;
    @Autowired
    private DictionaryRepository dictionaryRepository;
    @Autowired
    private LanguageRepository languageRepository;

    @Test
    void createEntry_succeeds_andReturnsSafePayload() {
        DictionaryEntryResponse created = dictionaryService.create(
                new CreateDictionaryEntryRequest("en", "zebraman2024", "zeb-ram-an",
                        "A fake test word.", "noun", "Sentence here.", "word"));

        assertThat(created.id()).isNotNull();
        assertThat(created.languageCode()).isEqualTo("en");
        assertThat(created.languageName()).isEqualTo("English");
        assertThat(created.word()).isEqualTo("zebraman2024");
        assertThat(created.pronunciation()).isEqualTo("zeb-ram-an");
        assertThat(created.definition()).isEqualTo("A fake test word.");
        assertThat(created.createdAt()).isNotNull();
        assertThat(created.updatedAt()).isNotNull();
    }

    @Test
    void createEntry_unknownLanguage_throws404() {
        assertThatThrownBy(() -> dictionaryService.create(
                new CreateDictionaryEntryRequest("zz", "hello", null, "def.", "noun", null, null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zz");
    }

    @Test
    void createEntry_inactiveLanguage_throws422() {
        languageRepository.saveAndFlush(Language.builder()
                .name("Inactive").nativeName("Inactive").code("xx").isActive(false).build());

        assertThatThrownBy(() -> dictionaryService.create(
                new CreateDictionaryEntryRequest("xx", "hello", null, "def.", "noun", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }

    @Test
    void createEntry_duplicateWord_isCaseInsensitive_throws422() {
        dictionaryService.create(new CreateDictionaryEntryRequest("en", "ZebraMan2024", null,
                "def.", "noun", null, null));

        // different casing, same normalized word -> still a duplicate
        assertThatThrownBy(() -> dictionaryService.create(
                new CreateDictionaryEntryRequest("en", "zebraman2024", null, "def.", "noun", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void getEntry_returnsEntry() {
        DictionaryEntryResponse created = dictionaryService.create(
                new CreateDictionaryEntryRequest("en", "uniqentry1", null, "def.", "noun", null, null));

        DictionaryEntryResponse found = dictionaryService.get(created.id());
        assertThat(found.id()).isEqualTo(created.id());
        assertThat(found.word()).isEqualTo("uniqentry1");
        assertThat(found.languageCode()).isEqualTo("en");
    }

    @Test
    void getEntry_unknownId_throws404() {
        assertThatThrownBy(() -> dictionaryService.get(java.util.UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("was not found");
    }

    @Test
    void updateEntry_changesWord_andReindexesNormalization() {
        DictionaryEntryResponse created = dictionaryService.create(
                new CreateDictionaryEntryRequest("en", "uniqentry2", null, "def.", "noun", null, null));

        DictionaryEntryResponse updated = dictionaryService.update(created.id(),
                new UpdateDictionaryEntryRequest("UPPER Word", null, "new definition.", null, null, null));
        assertThat(updated.word()).isEqualTo("UPPER Word");
        assertThat(updated.definition()).isEqualTo("new definition.");

        // the updated (normalized) word is searchable, case-insensitively
        List<DictionaryEntryResponse> found = dictionaryService.search("en", "upper word", 0, 20);
        assertThat(found).extracting(DictionaryEntryResponse::word).contains("UPPER Word");
    }

    @Test
    void deleteEntry_removesIt() {
        DictionaryEntryResponse created = dictionaryService.create(
                new CreateDictionaryEntryRequest("en", "uniqentry3", null, "def.", "noun", null, null));
        dictionaryService.delete(created.id());
        assertThatThrownBy(() -> dictionaryService.get(created.id()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void searchByWord_returnsMatchingEntries() {
        // 'नमस्ते' is part of the committed seed for Hindi.
        List<DictionaryEntryResponse> results = dictionaryService.search("hi", "नमस्ते", 0, 20);

        assertThat(results).isNotEmpty();
        assertThat(results).allMatch(e -> e.languageCode().equals("hi"));
        assertThat(results).extracting(DictionaryEntryResponse::word).contains("नमस्ते");
    }

    @Test
    void searchByWord_isCaseInsensitive() {
        // 'hello' entry exists in seed for English; uppercase lookup must still match.
        List<DictionaryEntryResponse> results = dictionaryService.search("en", "HELLO", 0, 20);
        assertThat(results).extracting(DictionaryEntryResponse::word).contains("hello");
    }

    @Test
    void searchByLanguage_withoutWord_returnsAllEntriesForLanguage() {
        List<DictionaryEntryResponse> results = dictionaryService.search("en", null, 0, 100);
        assertThat(results).isNotEmpty();
        assertThat(results).allMatch(e -> e.languageCode().equals("en"));
    }

    @Test
    void search_paginationRespectsSize() {
        List<DictionaryEntryResponse> page1 = dictionaryService.search("en", null, 0, 2);
        assertThat(page1).hasSize(2);

        List<DictionaryEntryResponse> big = dictionaryService.search("en", null, 0, 100);
        assertThat(big.size()).isGreaterThanOrEqualTo(4); // seed has 4 English entries
    }

    @Test
    void search_invalidLanguage_throws404() {
        assertThatThrownBy(() -> dictionaryService.search("zz", null, 0, 20))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zz");
    }

    @Test
    void search_inactiveLanguage_throws422() {
        languageRepository.saveAndFlush(Language.builder()
                .name("Inactive").nativeName("Inactive").code("xx").isActive(false).build());
        assertThatThrownBy(() -> dictionaryService.search("xx", null, 0, 20))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }
}
