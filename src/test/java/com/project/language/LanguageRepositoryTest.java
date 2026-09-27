package com.project.language;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * JPA slice tests for the language repositories (H2 in PostgreSQL mode).
 */
@DataJpaTest
class LanguageRepositoryTest {

    @Autowired
    private LanguageRepository languageRepository;
    @Autowired
    private DialectRepository dialectRepository;
    @Autowired
    private ScriptRepository scriptRepository;

    @Test
    void savePersistsLanguageWithUuidAndTimestamps() {
        Language saved = languageRepository.saveAndFlush(Language.builder()
                .name("Hindi").nativeName("हिन्दी").code("hi").description("desc").build());

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void findByCodeReturnsLanguage() {
        languageRepository.saveAndFlush(Language.builder()
                .name("Tamil").nativeName("தமிழ்").code("ta").build());

        assertThat(languageRepository.findByCode("ta")).isPresent();
        assertThat(languageRepository.findByCode("zz")).isEmpty();
        assertThat(languageRepository.existsByCode("ta")).isTrue();
        assertThat(languageRepository.existsByCode("zz")).isFalse();
    }

    @Test
    void duplicateLanguageCodeIsRejectedByDatabase() {
        languageRepository.saveAndFlush(Language.builder().name("A").nativeName("अ").code("dup").build());

        assertThatThrownBy(() -> languageRepository.saveAndFlush(
                Language.builder().name("B").nativeName("ब").code("dup").build()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void searchActiveMatchesNameAndNativeNameAndSkipsInactive() {
        languageRepository.saveAndFlush(Language.builder()
                .name("Hindi").nativeName("हिन्दी").code("hi").isActive(true).build());
        languageRepository.saveAndFlush(Language.builder()
                .name("Tamil").nativeName("தமிழ்").code("ta").isActive(true).build());
        languageRepository.saveAndFlush(Language.builder()
                .name("Old English").nativeName("Englisc").code("ang").isActive(false).build());

        assertThat(languageRepository.searchActive("hindi")).extracting(Language::getCode).containsExactly("hi");
        assertThat(languageRepository.searchActive("हिन्दी")).extracting(Language::getCode).containsExactly("hi");
        assertThat(languageRepository.searchActive("த")).extracting(Language::getCode).containsExactly("ta");
        // inactive languages are never matched
        assertThat(languageRepository.searchActive("englisc")).isEmpty();
        assertThat(languageRepository.findAllByIsActiveTrueOrderByNameAsc())
                .extracting(Language::getCode)
                .contains("hi", "ta")
                .doesNotContain("ang");
    }

    @Test
    void scriptCanBeLinkedToMultipleLanguages_andDeletionGuardWorks() {
        Script deva = scriptRepository.saveAndFlush(Script.builder()
                .name("Devanagari").code("Deva").description("d").build());

        languageRepository.saveAndFlush(Language.builder()
                .name("Hindi").nativeName("हिन्दी").code("hi").scripts(Set.of(deva)).build());
        languageRepository.saveAndFlush(Language.builder()
                .name("Marathi").nativeName("मराठी").code("mr").scripts(Set.of(deva)).build());

        assertThat(languageRepository.existsByScripts_Id(deva.getId())).isTrue();
        assertThat(languageRepository.existsByScripts_Id(UUID.randomUUID())).isFalse();
        // two languages reference the same script instance
        assertThat(scriptRepository.findByCode("Deva")).isPresent();
    }

    @Test
    void duplicateScriptCodeIsRejectedByDatabase() {
        scriptRepository.saveAndFlush(Script.builder().name("Latin").code("Latn").build());

        assertThatThrownBy(() -> scriptRepository.saveAndFlush(
                Script.builder().name("Latin again").code("Latn").build()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void dialectsBelongToLanguage_andCodesAreGloballyUnique() {
        Script deva = scriptRepository.saveAndFlush(Script.builder().name("Devanagari").code("Deva2").build());
        Language hindi = languageRepository.saveAndFlush(Language.builder()
                .name("Hindi").nativeName("हिन्दी").code("hi").scripts(Set.of(deva)).build());
        Language english = languageRepository.saveAndFlush(Language.builder()
                .name("English").nativeName("English").code("en").build());

        dialectRepository.saveAndFlush(Dialect.builder()
                .language(hindi).name("Awadhi").code("awadhi").region("Awadh").build());

        assertThat(dialectRepository.findByLanguageIdOrderByNameAsc(hindi.getId()))
                .extracting(Dialect::getCode).containsExactly("awadhi");
        assertThat(dialectRepository.findByLanguageIdOrderByNameAsc(english.getId())).isEmpty();
        assertThat(dialectRepository.existsByLanguageId(hindi.getId())).isTrue();
        assertThat(dialectRepository.existsByLanguageId(english.getId())).isFalse();

        // dialect codes are globally unique, even under a different language
        assertThatThrownBy(() -> dialectRepository.saveAndFlush(Dialect.builder()
                .language(english).name("Awadhi too").code("awadhi").build()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}