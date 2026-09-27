package com.project.speech;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.LanguageRepository;
import com.project.speech.dto.SpeechHistoryResponse;
import com.project.speech.dto.SpeechResponse;
import com.project.speech.dto.SpeechSynthesisRequest;
import com.project.speech.dto.SpeechTranslateRequest;
import com.project.speech.provider.MockSpeechProvider;
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
 * Full-context service tests for the speech module (H2, PostgreSQL mode).
 * Uses the committed language seed ({@code hi}, {@code en}) for translation tests.
 */
@SpringBootTest
@Transactional
class SpeechServiceTest {

    @Autowired
    private SpeechService speechService;
    @Autowired
    private SpeechRepository speechRepository;
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

    private MockMultipartFile audio(String name, String contentType, byte[] content) {
        return new MockMultipartFile("file", name, contentType, content);
    }


    // --- Speech-to-text -------------------------------------------------------

    @Test
    void transcribe_succeeds_persistsResultAndCompletes() {
        User user = createUser("speech1");
        MockMultipartFile file = audio("clip.wav", "audio/wav", new byte[]{1, 2, 3});

        SpeechResponse response = speechService.transcribe(user.getId(), file, "hi");

        assertThat(response.id()).isNotNull();
        assertThat(response.operation()).isEqualTo(SpeechOperation.SPEECH_TO_TEXT);
        assertThat(response.originalFileName()).isEqualTo("clip.wav");
        assertThat(response.contentType()).isEqualTo("audio/wav");
        assertThat(response.fileSize()).isEqualTo(3L);
        assertThat(response.outputText()).isEqualTo(MockSpeechProvider.TRANSCRIPTION_PREFIX + "clip.wav");
        assertThat(response.languageCode()).isEqualTo("hi");
        assertThat(response.status()).isEqualTo(SpeechStatus.COMPLETED);
        assertThat(response.provider()).isEqualTo(MockSpeechProvider.PROVIDER_NAME);
        assertThat(response.createdAt()).isNotNull();

        SpeechDocument saved = speechRepository.findById(response.id()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(SpeechStatus.COMPLETED);
        assertThat(saved.getOutputText()).isEqualTo(MockSpeechProvider.TRANSCRIPTION_PREFIX + "clip.wav");
    }

    @Test
    void transcribe_noLanguage_leavesLanguageNull() {
        User user = createUser("speech2");

        SpeechResponse response = speechService.transcribe(user.getId(),
                audio("raw.wav", "audio/wav", new byte[]{1}), null);

        assertThat(response.languageCode()).isNull();
        assertThat(response.status()).isEqualTo(SpeechStatus.COMPLETED);
    }

    @Test
    void transcribe_missingFile_throws422() {
        User user = createUser("speech3");

        assertThatThrownBy(() -> speechService.transcribe(user.getId(), null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("file must not be null");
    }

    @Test
    void transcribe_emptyFile_throws422() {
        User user = createUser("speech4");

        assertThatThrownBy(() -> speechService.transcribe(user.getId(),
                audio("empty.wav", "audio/wav", new byte[0]), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void transcribe_unsupportedContentType_throws422() {
        User user = createUser("speech5");

        assertThatThrownBy(() -> speechService.transcribe(user.getId(),
                audio("notes.txt", "text/plain", new byte[]{1, 2}), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unsupported file type");
    }

    @Test
    void transcribe_oversizedFile_throws422() {
        User user = createUser("speech6");
        // test config caps uploads at 1MB; 1MB + 1 byte is oversized.
        byte[] big = new byte[1024 * 1024 + 1];

        assertThatThrownBy(() -> speechService.transcribe(user.getId(),
                audio("big.wav", "audio/wav", big), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("maximum allowed size");
    }


    @Test
    void transcribe_invalidLanguage_throws404() {
        User user = createUser("speech7");

        assertThatThrownBy(() -> speechService.transcribe(user.getId(),
                audio("clip.wav", "audio/wav", new byte[]{1}), "zz"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zz");
    }

    @Test
    void transcribe_inactiveLanguage_throws422() {
        User user = createUser("speech8");
        languageRepository.save(com.project.language.Language.builder()
                .name("Inactive").nativeName("Inactive").code("xx").isActive(false).build());

        assertThatThrownBy(() -> speechService.transcribe(user.getId(),
                audio("clip.wav", "audio/wav", new byte[]{1}), "xx"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }

    @Test
    void transcribe_clientSidePath_isSanitizedToBaseName() {
        User user = createUser("speech9");

        SpeechResponse response = speechService.transcribe(user.getId(),
                audio("../../etc/secret.wav", "audio/wav", new byte[]{1}), null);

        assertThat(response.originalFileName()).isEqualTo("secret.wav");
    }


    // --- Text-to-speech -------------------------------------------------------

    @Test
    void synthesize_succeeds_persistsMetadataAndCompletes() {
        User user = createUser("speech10");
        String text = "नमस्ते दोस्त";

        SpeechResponse response = speechService.synthesize(user.getId(),
                new SpeechSynthesisRequest(text, "hi"));

        assertThat(response.id()).isNotNull();
        assertThat(response.operation()).isEqualTo(SpeechOperation.TEXT_TO_SPEECH);
        assertThat(response.inputText()).isEqualTo(text);
        assertThat(response.outputText()).startsWith(MockSpeechProvider.SYNTHESIS_PREFIX);
        assertThat(response.outputText()).contains("language 'hi'");
        assertThat(response.outputText()).contains(text.length() + " characters");
        assertThat(response.contentType()).isEqualTo(MockSpeechProvider.OUTPUT_AUDIO_CONTENT_TYPE);
        assertThat(response.fileSize()).isEqualTo(44 + text.length() * 2L);
        assertThat(response.languageCode()).isEqualTo("hi");
        assertThat(response.status()).isEqualTo(SpeechStatus.COMPLETED);
        assertThat(response.provider()).isEqualTo(MockSpeechProvider.PROVIDER_NAME);

        SpeechDocument saved = speechRepository.findById(response.id()).orElseThrow();
        assertThat(saved.getOperation()).isEqualTo(SpeechOperation.TEXT_TO_SPEECH);
        assertThat(saved.getStatus()).isEqualTo(SpeechStatus.COMPLETED);
    }

    @Test
    void synthesize_blankText_throws422() {
        User user = createUser("speech11");

        assertThatThrownBy(() -> speechService.synthesize(user.getId(),
                new SpeechSynthesisRequest("   ", "hi")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("text must not be blank");
    }

    @Test
    void synthesize_invalidLanguage_throws404() {
        User user = createUser("speech12");

        assertThatThrownBy(() -> speechService.synthesize(user.getId(),
                new SpeechSynthesisRequest("hello", "zz")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void synthesize_inactiveLanguage_throws422() {
        User user = createUser("speech13");
        languageRepository.save(com.project.language.Language.builder()
                .name("Inactive").nativeName("Inactive").code("xx").isActive(false).build());

        assertThatThrownBy(() -> speechService.synthesize(user.getId(),
                new SpeechSynthesisRequest("hello", "xx")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }

    // --- History / get / delete -----------------------------------------------

    @Test
    void history_returnsOnlyOwnRecords() {
        User user = createUser("speechH1");
        User other = createUser("speechH2");

        speechService.transcribe(user.getId(), audio("one.wav", "audio/wav", new byte[]{1}), null);
        speechService.synthesize(user.getId(), new SpeechSynthesisRequest("hello", "en"));
        // other user's record must never appear in user's history
        speechService.transcribe(other.getId(), audio("other.wav", "audio/wav", new byte[]{1}), null);

        SpeechHistoryResponse history = speechService.history(user.getId(), 0, 10);

        assertThat(history.content()).extracting(SpeechResponse::originalFileName)
                .containsExactlyInAnyOrder("one.wav", null);
        assertThat(history.content()).extracting(SpeechResponse::originalFileName)
                .doesNotContain("other.wav");
        assertThat(history.totalElements()).isEqualTo(2);
    }

    @Test
    void get_returnsOwnRecord() {
        User user = createUser("speechG1");
        SpeechResponse created = speechService.transcribe(user.getId(),
                audio("mine.wav", "audio/wav", new byte[]{1}), null);

        SpeechResponse response = speechService.get(user.getId(), created.id());
        assertThat(response.id()).isEqualTo(created.id());
        assertThat(response.originalFileName()).isEqualTo("mine.wav");
    }


    @Test
    void get_foreignRecord_throws404() {
        User owner = createUser("speechG2");
        User intruder = createUser("speechG3");
        SpeechResponse created = speechService.transcribe(owner.getId(),
                audio("private.wav", "audio/wav", new byte[]{1}), null);

        assertThatThrownBy(() -> speechService.get(intruder.getId(), created.id()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("was not found");
    }

    @Test
    void get_unknownRecord_throws404() {
        User user = createUser("speechG4");

        assertThatThrownBy(() -> speechService.get(user.getId(), UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_removesOwnRecord() {
        User user = createUser("speechD1");
        SpeechResponse created = speechService.transcribe(user.getId(),
                audio("gone.wav", "audio/wav", new byte[]{1}), null);

        speechService.delete(user.getId(), created.id());

        assertThat(speechRepository.findById(created.id())).isEmpty();
    }

    @Test
    void delete_foreignRecord_throws404_andKeepsOwnerRecord() {
        User owner = createUser("speechD2");
        User intruder = createUser("speechD3");
        SpeechResponse created = speechService.transcribe(owner.getId(),
                audio("private.wav", "audio/wav", new byte[]{1}), null);

        assertThatThrownBy(() -> speechService.delete(intruder.getId(), created.id()))
                .isInstanceOf(ResourceNotFoundException.class);
        // The owner's record is untouched.
        assertThat(speechRepository.findById(created.id())).isPresent();
    }


    // --- Translation integration ----------------------------------------------

    @Test
    void translate_completedSttRecord_usesExistingTranslationArchitecture() {
        User user = createUser("speechT1");
        SpeechResponse speech = speechService.transcribe(user.getId(),
                audio("note.wav", "audio/wav", new byte[]{1}), "hi");

        TranslationResponse translation = speechService.translate(user.getId(), speech.id(),
                new SpeechTranslateRequest(null, "en"));

        assertThat(translation.sourceLanguage()).isEqualTo("hi");
        assertThat(translation.targetLanguage()).isEqualTo("en");
        assertThat(translation.sourceText())
                .isEqualTo(MockSpeechProvider.TRANSCRIPTION_PREFIX + "note.wav");
        assertThat(translation.status()).isEqualTo(com.project.translation.TranslationStatus.COMPLETED);
        // persisted through the existing translation architecture
        assertThat(translationRepository.findById(translation.id())).isPresent();
    }

    @Test
    void translate_foreignRecord_throws404() {
        User owner = createUser("speechT2");
        User intruder = createUser("speechT3");
        SpeechResponse speech = speechService.transcribe(owner.getId(),
                audio("note.wav", "audio/wav", new byte[]{1}), "hi");

        assertThatThrownBy(() -> speechService.translate(intruder.getId(), speech.id(),
                new SpeechTranslateRequest(null, "en")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("was not found");
    }

    @Test
    void translate_ttsRecord_throws422() {
        User user = createUser("speechT4");
        SpeechResponse synthesized = speechService.synthesize(user.getId(),
                new SpeechSynthesisRequest("hello", "en"));

        assertThatThrownBy(() -> speechService.translate(user.getId(), synthesized.id(),
                new SpeechTranslateRequest(null, "hi")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only speech-to-text records");
    }

    @Test
    void translate_failedRecord_throws422() {
        User user = createUser("speechT5");
        SpeechDocument failed = speechRepository.save(SpeechDocument.builder()
                .user(user)
                .operation(SpeechOperation.SPEECH_TO_TEXT)
                .originalFileName("bad.wav")
                .contentType("audio/wav")
                .fileSize(1L)
                .status(SpeechStatus.FAILED)
                .provider("mock-speech")
                .failureReason("Speech provider 'mock-speech' failed")
                .build());

        assertThatThrownBy(() -> speechService.translate(user.getId(), failed.getId(),
                new SpeechTranslateRequest("hi", "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not completed");
    }

    @Test
    void translate_blankTranscribedText_throws422() {
        User user = createUser("speechT6");
        SpeechDocument blank = speechRepository.save(SpeechDocument.builder()
                .user(user)
                .operation(SpeechOperation.SPEECH_TO_TEXT)
                .originalFileName("blank.wav")
                .contentType("audio/wav")
                .fileSize(1L)
                .outputText("   ")
                .status(SpeechStatus.COMPLETED)
                .provider("mock-speech")
                .build());

        assertThatThrownBy(() -> speechService.translate(user.getId(), blank.getId(),
                new SpeechTranslateRequest("hi", "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("blank");
    }

    @Test
    void translate_noRecordNorRequestedSource_throws422() {
        User user = createUser("speechT7");
        SpeechResponse speech = speechService.transcribe(user.getId(),
                audio("note.wav", "audio/wav", new byte[]{1}), null);

        assertThatThrownBy(() -> speechService.translate(user.getId(), speech.id(),
                new SpeechTranslateRequest(null, "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("sourceLanguage is required");
    }

    @Test
    void translate_requestedSourceLanguage_isUsedWhenRecordHasNone() {
        User user = createUser("speechT8");
        SpeechResponse speech = speechService.transcribe(user.getId(),
                audio("note.wav", "audio/wav", new byte[]{1}), null);

        TranslationResponse translation = speechService.translate(user.getId(), speech.id(),
                new SpeechTranslateRequest("hi", "en"));

        assertThat(translation.sourceLanguage()).isEqualTo("hi");
        assertThat(translation.targetLanguage()).isEqualTo("en");
    }

    @Test
    void translate_invalidTargetLanguage_throws404() {
        User user = createUser("speechT9");
        SpeechResponse speech = speechService.transcribe(user.getId(),
                audio("note.wav", "audio/wav", new byte[]{1}), "hi");

        assertThatThrownBy(() -> speechService.translate(user.getId(), speech.id(),
                new SpeechTranslateRequest(null, "zzun")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // The provider-failure path (FAILED persisted without leaking stack traces)
    // is covered separately in SpeechProviderFailureTest with a stubbed provider.
}
