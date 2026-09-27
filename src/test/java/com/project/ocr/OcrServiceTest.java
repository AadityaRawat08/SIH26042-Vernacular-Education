package com.project.ocr;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.ocr.dto.OcrHistoryResponse;
import com.project.ocr.dto.OcrResponse;
import com.project.ocr.dto.OcrTranslateRequest;
import com.project.ocr.provider.MockOcrProvider;
import com.project.language.LanguageRepository;
import com.project.translation.TranslationRepository;
import com.project.translation.dto.TranslationResponse;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-context service tests for the OCR module (H2, PostgreSQL mode).
 * Uses the committed language seed ({@code hi}, {@code en}) for translation tests.
 */
@SpringBootTest
@Transactional
class OcrServiceTest {

    @Autowired
    private OcrService ocrService;
    @Autowired
    private OcrRepository ocrRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LanguageRepository languageRepository;
    @Autowired
    private TranslationRepository translationRepository;

    private User createUser(String username) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("not-a-real-hash")
                .build());
    }

    private MockMultipartFile image(String name, String contentType, byte[] content) {
        return new MockMultipartFile("file", name, contentType, content);
    }

    @Test
    void processFile_succeeds_persistsResultAndCompletes() {
        User user = createUser("ocr1");
        MockMultipartFile file = image("page.png", "image/png", new byte[]{1, 2, 3});

        OcrResponse response = ocrService.processFile(user.getId(), file, "hi");

        assertThat(response.id()).isNotNull();
        assertThat(response.originalFileName()).isEqualTo("page.png");
        assertThat(response.contentType()).isEqualTo("image/png");
        assertThat(response.fileSize()).isEqualTo(3L);
        assertThat(response.extractedText()).isEqualTo(MockOcrProvider.PREFIX + "page.png");
        assertThat(response.detectedLanguageCode()).isEqualTo("hi");
        assertThat(response.status()).isEqualTo(OcrStatus.COMPLETED);
        assertThat(response.provider()).isEqualTo(MockOcrProvider.PROVIDER_NAME);
        assertThat(response.createdAt()).isNotNull();

        OcrDocument saved = ocrRepository.findById(response.id()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(OcrStatus.COMPLETED);
        assertThat(saved.getExtractedText()).isEqualTo(MockOcrProvider.PREFIX + "page.png");
    }

    @Test
    void processFile_noLanguage_leavesDetectedLanguageNull() {
        User user = createUser("ocr2");

        OcrResponse response = ocrService.processFile(user.getId(),
                image("raw.png", "image/png", new byte[]{1}), null);

        assertThat(response.detectedLanguageCode()).isNull();
        assertThat(response.status()).isEqualTo(OcrStatus.COMPLETED);
    }

    @Test
    void processFile_missingFile_throws422() {
        User user = createUser("ocr3");

        assertThatThrownBy(() -> ocrService.processFile(user.getId(), null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("file must not be null");
    }

    @Test
    void processFile_emptyFile_throws422() {
        User user = createUser("ocr4");

        assertThatThrownBy(() -> ocrService.processFile(user.getId(),
                image("empty.png", "image/png", new byte[0]), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void processFile_unsupportedContentType_throws422() {
        User user = createUser("ocr5");

        assertThatThrownBy(() -> ocrService.processFile(user.getId(),
                image("doc.pdf", "application/pdf", new byte[]{1, 2}), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unsupported file type");
    }

    @Test
    void processFile_oversizedFile_throws422() {
        User user = createUser("ocr6");
        // test config caps uploads at 1MB; 1MB + 1 byte is oversized.
        byte[] big = new byte[1024 * 1024 + 1];

        assertThatThrownBy(() -> ocrService.processFile(user.getId(),
                image("big.png", "image/png", big), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("maximum allowed size");
    }

    @Test
    void processFile_invalidLanguage_throws404() {
        User user = createUser("ocr7");

        assertThatThrownBy(() -> ocrService.processFile(user.getId(),
                image("page.png", "image/png", new byte[]{1}), "zz"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zz");
    }

    @Test
    void processFile_inactiveLanguage_throws422() {
        User user = createUser("ocr8");
        languageRepository.save(com.project.language.Language.builder()
                .name("Inactive").nativeName("Inactive").code("xx").isActive(false).build());

        assertThatThrownBy(() -> ocrService.processFile(user.getId(),
                image("page.png", "image/png", new byte[]{1}), "xx"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }

    @Test
    void processFile_clientSidePath_isSanitizedToBaseName() {
        User user = createUser("ocr9");

        OcrResponse response = ocrService.processFile(user.getId(),
                image("../../etc/secret.png", "image/png", new byte[]{1}), null);

        assertThat(response.originalFileName()).isEqualTo("secret.png");
    }

    @Test
    void history_returnsOnlyOwnRecords_newestFirst() {
        User user = createUser("ocrH1");
        User other = createUser("ocrH2");

        OcrResponse first = ocrService.processFile(user.getId(),
                image("one.png", "image/png", new byte[]{1}), null);
        OcrResponse second = ocrService.processFile(user.getId(),
                image("two.png", "image/png", new byte[]{1}), null);
        // other user's record must never appear in user's history
        ocrService.processFile(other.getId(), image("other.png", "image/png", new byte[]{1}), null);

        OcrHistoryResponse history = ocrService.history(user.getId(), 0, 10);

        assertThat(history.content()).extracting(OcrResponse::originalFileName)
                .containsExactlyInAnyOrder("one.png", "two.png");
        assertThat(history.content()).extracting(OcrResponse::originalFileName).doesNotContain("other.png");
        assertThat(history.totalElements()).isEqualTo(2);
    }

    @Test
    void get_returnsOwnRecord() {
        User user = createUser("ocrG1");
        OcrResponse created = ocrService.processFile(user.getId(),
                image("mine.png", "image/png", new byte[]{1}), null);

        OcrResponse found = ocrService.get(user.getId(), created.id());
        assertThat(found.id()).isEqualTo(created.id());
    }

    @Test
    void get_foreignRecord_throws404() {
        User owner = createUser("ocrG2");
        User intruder = createUser("ocrG3");
        OcrResponse created = ocrService.processFile(owner.getId(),
                image("owner.png", "image/png", new byte[]{1}), null);

        assertThatThrownBy(() -> ocrService.get(intruder.getId(), created.id()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("was not found");
    }

    @Test
    void get_unknownId_throws404() {
        User user = createUser("ocrG4");

        assertThatThrownBy(() -> ocrService.get(user.getId(), UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_removesOwnRecord() {
        User user = createUser("ocrD1");
        OcrResponse created = ocrService.processFile(user.getId(),
                image("del.png", "image/png", new byte[]{1}), null);

        ocrService.delete(user.getId(), created.id());

        assertThat(ocrRepository.findById(created.id())).isEmpty();
    }

    @Test
    void delete_foreignRecord_throws404() {
        User owner = createUser("ocrD2");
        User intruder = createUser("ocrD3");
        OcrResponse created = ocrService.processFile(owner.getId(),
                image("owner.png", "image/png", new byte[]{1}), null);

        assertThatThrownBy(() -> ocrService.delete(intruder.getId(), created.id()))
                .isInstanceOf(ResourceNotFoundException.class);

        // record still exists
        assertThat(ocrRepository.findById(created.id())).isPresent();
    }

    @Test
    void translate_usesExistingTranslationService_andPersistsTranslation() {
        User user = createUser("ocrT1");
        OcrResponse ocr = ocrService.processFile(user.getId(),
                image("note.png", "image/png", new byte[]{1}), "hi");

        TranslationResponse translation = ocrService.translate(user.getId(), ocr.id(),
                new OcrTranslateRequest(null, "en"));

        assertThat(translation.id()).isNotNull();
        assertThat(translation.sourceLanguage()).isEqualTo("hi");
        assertThat(translation.targetLanguage()).isEqualTo("en");
        assertThat(translation.sourceText()).isEqualTo(MockOcrProvider.PREFIX + "note.png");
        assertThat(translation.status()).isEqualTo(com.project.translation.TranslationStatus.COMPLETED);
        // persisted through the existing translation architecture
        assertThat(translationRepository.findById(translation.id())).isPresent();
    }

    @Test
    void translate_foreignOcrRecord_throws404() {
        User owner = createUser("ocrT2");
        User intruder = createUser("ocrT3");
        OcrResponse ocr = ocrService.processFile(owner.getId(),
                image("note.png", "image/png", new byte[]{1}), "hi");

        assertThatThrownBy(() -> ocrService.translate(intruder.getId(), ocr.id(),
                new OcrTranslateRequest(null, "en")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("was not found");
    }

    @Test
    void translate_failedOcrRecord_throws422() {
        User user = createUser("ocrT4");
        OcrDocument failed = ocrRepository.save(OcrDocument.builder()
                .user(user)
                .originalFileName("bad.png")
                .contentType("image/png")
                .fileSize(1L)
                .status(OcrStatus.FAILED)
                .provider("mock-ocr")
                .failureReason("OCR provider 'mock-ocr' failed")
                .build());

        assertThatThrownBy(() -> ocrService.translate(user.getId(), failed.getId(),
                new OcrTranslateRequest("hi", "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not completed");
    }

    @Test
    void translate_blankOcrText_throws422() {
        User user = createUser("ocrT5");
        OcrDocument blank = ocrRepository.save(OcrDocument.builder()
                .user(user)
                .originalFileName("blank.png")
                .contentType("image/png")
                .fileSize(1L)
                .extractedText("   ")
                .status(OcrStatus.COMPLETED)
                .provider("mock-ocr")
                .build());

        assertThatThrownBy(() -> ocrService.translate(user.getId(), blank.getId(),
                new OcrTranslateRequest("hi", "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("blank");
    }

    @Test
    void translate_noDetectedNorRequestedSource_throws422() {
        User user = createUser("ocrT6");
        OcrResponse ocr = ocrService.processFile(user.getId(),
                image("note.png", "image/png", new byte[]{1}), null);

        assertThatThrownBy(() -> ocrService.translate(user.getId(), ocr.id(),
                new OcrTranslateRequest(null, "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("sourceLanguage is required");
    }

    @Test
    void translate_requestedSourceLanguage_isUsedWhenNoDetection() {
        User user = createUser("ocrT7");
        OcrResponse ocr = ocrService.processFile(user.getId(),
                image("note.png", "image/png", new byte[]{1}), null);

        TranslationResponse translation = ocrService.translate(user.getId(), ocr.id(),
                new OcrTranslateRequest("hi", "en"));

        assertThat(translation.sourceLanguage()).isEqualTo("hi");
        assertThat(translation.targetLanguage()).isEqualTo("en");
    }

    @Test
    void translate_invalidTargetLanguage_throws404() {
        User user = createUser("ocrT8");
        OcrResponse ocr = ocrService.processFile(user.getId(),
                image("note.png", "image/png", new byte[]{1}), "hi");

        assertThatThrownBy(() -> ocrService.translate(user.getId(), ocr.id(),
                new OcrTranslateRequest(null, "zzun")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // The provider-failure path (FAILED persisted without leaking stack traces)
    // is covered separately in OcrProviderFailureTest with a stubbed provider.
}