package com.project.language;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.dto.CreateDialectRequest;
import com.project.language.dto.CreateLanguageRequest;
import com.project.language.dto.CreateScriptRequest;
import com.project.language.dto.DialectResponse;
import com.project.language.dto.LanguageResponse;
import com.project.language.dto.ScriptResponse;
import com.project.language.dto.UpdateDialectRequest;
import com.project.language.dto.UpdateLanguageRequest;
import com.project.language.dto.UpdateScriptRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-context service tests for the language catalogue (H2, PostgreSQL mode).
 */
@SpringBootTest
@Transactional
class LanguageServiceTest {

    @Autowired
    private LanguageService languageService;
    @Autowired
    private DialectService dialectService;
    @Autowired
    private ScriptService scriptService;

    // --- Language CRUD ------------------------------------------------------
    // NOTE: tests use codes that the seed data does NOT contain (mai, doi, bho)
    // because the seed initializer has already committed its catalogue at
    // context startup.

    @Test
    void createLanguage_normalizesCode_andReturnsSafePayload() {
        LanguageResponse created = languageService.create(new CreateLanguageRequest(
                "Maithili", "मैथिली", "MAI", "Language of the Mithila region.", null, Set.of("Deva")));

        assertThat(created.id()).isNotNull();
        assertThat(created.code()).isEqualTo("mai"); // normalized to lower-case
        assertThat(created.name()).isEqualTo("Maithili");
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void createLanguage_duplicateCode_throws() {
        languageService.create(new CreateLanguageRequest("Maithili", "मैथिली", "mai", null, null, null));

        assertThatThrownBy(() -> languageService.create(
                new CreateLanguageRequest("Other", "अन्य", "MAI", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void createLanguage_unknownScript_throws404() {
        assertThatThrownBy(() -> languageService.create(
                new CreateLanguageRequest("Mystery", "रहस्य", "mys", null, null, Set.of("Xyz1"))))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Script with code");
    }

    @Test
    void getById_unknownLanguage_throws404() {
        assertThatThrownBy(() -> languageService.getById(java.util.UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("was not found");
    }

    @Test
    void getByCode_returnsLanguage() {
        languageService.create(new CreateLanguageRequest("Dogri", "डोगरी", "doi", null, null, null));

        assertThat(languageService.getByCode("DOI").code()).isEqualTo("doi");
        assertThatThrownBy(() -> languageService.getByCode("zz"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateLanguage_changesFields_andScriptLinks() {
        scriptService.create(new CreateScriptRequest("Tirhuta", "Tirh", "historical Maithili script"));
        // "Latn" (Latin) is provided by the seed data — fetch, don't recreate.
        String latinCode = scriptService.list().stream()
                .filter(s -> "Latn".equals(s.code())).findFirst().orElseThrow().code();
        LanguageResponse created = languageService.create(
                new CreateLanguageRequest("Maithili", "मैथिली", "mai", "old", true, Set.of("Tirh")));

        LanguageResponse updated = languageService.update(created.id(), new UpdateLanguageRequest(
                "Maithili (updated)", "मैथिली", "new description", false, Set.of(latinCode)));

        assertThat(updated.name()).isEqualTo("Maithili (updated)");
        assertThat(updated.isActive()).isFalse();
        assertThat(updated.description()).isEqualTo("new description");

        List<ScriptResponse> scripts = languageService.getScripts(created.id());
        assertThat(scripts).extracting(ScriptResponse::code).containsExactly("Latn");
    }

    @Test
    void listActive_excludesInactiveLanguages() {
        languageService.create(new CreateLanguageRequest("Dogri", "डोगरी", "doi", null, true, null));
        languageService.create(new CreateLanguageRequest("Bhojpuri", "भोजपुरी", "bho", null, false, null));

        List<LanguageResponse> active = languageService.listActive(null);
        assertThat(active).extracting(LanguageResponse::code)
                .contains("doi")
                .doesNotContain("bho");
    }

    @Test
    void search_matchesNameOrNativeName() {
        languageService.create(new CreateLanguageRequest("Maithili", "मैथिली", "mai", null, true, null));

        assertThat(languageService.listActive("maith")).extracting(LanguageResponse::code).contains("mai");
        assertThat(languageService.listActive("मैथिली")).extracting(LanguageResponse::code).contains("mai");
        assertThat(languageService.listActive("nothing-matches")).isEmpty();
    }

    // --- Dialects -----------------------------------------------------------

    @Test
    void createDialect_underLanguage_andListByLanguage() {
        LanguageResponse maithili = languageService.create(
                new CreateLanguageRequest("Maithili", "मैथिली", "mai", null, null, null));

        dialectService.create(maithili.id(), new CreateDialectRequest(
                "Standard Maithili", "मानक मैथिली", "std-maithili", "Standard variety.", "Mithila", true));

        List<DialectResponse> dialects = dialectService.listByLanguage(maithili.id());
        assertThat(dialects).hasSize(1);
        assertThat(dialects.get(0).code()).isEqualTo("std-maithili");
        assertThat(dialects.get(0).languageCode()).isEqualTo("mai");
    }

    @Test
    void createDialect_unknownLanguage_throws404() {
        assertThatThrownBy(() -> dialectService.create(
                java.util.UUID.randomUUID(),
                new CreateDialectRequest("X", null, "xcode", null, null, null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Language");
    }

    @Test
    void createDialect_duplicateCode_throws() {
        LanguageResponse maithili = languageService.create(
                new CreateLanguageRequest("Maithili", "मैथिली", "mai", null, null, null));
        LanguageResponse dogri = languageService.create(
                new CreateLanguageRequest("Dogri", "डोगरी", "doi", null, null, null));
        dialectService.create(maithili.id(),
                new CreateDialectRequest("Standard", null, "std-maithili", null, null, null));

        // even under a different language, the code is globally unique
        assertThatThrownBy(() -> dialectService.create(dogri.id(),
                new CreateDialectRequest("Standard variant", null, "STD-MAITHILI", null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    // --- Scripts ------------------------------------------------------------

    @Test
    void createScript_andDuplicateCode_throws() {
        ScriptResponse created = scriptService.create(new CreateScriptRequest("Tirhuta", "tirh", "d"));
        assertThat(created.code()).isEqualTo("Tirh"); // ISO 15924 casing applied

        assertThatThrownBy(() -> scriptService.create(new CreateScriptRequest("Tirhuta again", "TIRH", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deleteScript_linkedToLanguage_throws_butUnlinkedSucceeds() {
        scriptService.create(new CreateScriptRequest("Tirhuta", "Tirh", "historical script"));
        LanguageResponse maithili = languageService.create(
                new CreateLanguageRequest("Maithili", "मैथिली", "mai", null, null, Set.of("Tirh")));
        ScriptResponse tirh = languageService.getScripts(maithili.id()).get(0);

        assertThatThrownBy(() -> scriptService.delete(tirh.id()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("linked to languages");

        ScriptResponse standalone = scriptService.create(new CreateScriptRequest("Braille", "Brai", "b"));
        scriptService.delete(standalone.id());
    }

    // --- Delete guards -------------------------------------------------------

    @Test
    void deleteLanguage_withDialects_throws_butEmptyLanguageDeletes() {
        LanguageResponse maithili = languageService.create(
                new CreateLanguageRequest("Maithili", "मैथिली", "mai", null, null, null));
        dialectService.create(maithili.id(),
                new CreateDialectRequest("Standard", null, "std-maithili", null, null, null));

        assertThatThrownBy(() -> languageService.delete(maithili.id()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("dialects");

        LanguageResponse dogri = languageService.create(
                new CreateLanguageRequest("Dogri", "डोगरी", "doi", null, null, null));
        languageService.delete(dogri.id());
        assertThatThrownBy(() -> languageService.getById(dogri.id()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}