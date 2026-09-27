package com.project.speech;

import com.project.common.exception.BusinessException;
import com.project.speech.provider.SpeechProvider;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Verifies that a speech provider failure is handled gracefully: the attempt is
 * persisted as a FAILED record with a safe reason, the failure surfaces as a
 * generic {@link BusinessException}, and no internal exception escapes.
 *
 * <p>{@link MockitoBean} replaces the real {@code MockSpeechProvider} with a
 * stub that throws, exercising the failure branches of
 * {@link SpeechService#transcribe} and {@link SpeechService#synthesize}.</p>
 */
@SpringBootTest
class SpeechProviderFailureTest {

    @Autowired
    private SpeechService speechService;
    @Autowired
    private SpeechRepository speechRepository;
    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private SpeechProvider speechProvider;

    private User createUser(String username) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("x")
                .build());
    }

    @Test
    void transcriptionFailure_persistsFailedRecordWithoutLeakingInternals() {
        User user = createUser("speechfailing1");

        when(speechProvider.name()).thenReturn("failing-speech");
        when(speechProvider.transcribe(any()))
                .thenThrow(new RuntimeException("simulated STT outage"));

        assertThatThrownBy(() -> speechService.transcribe(user.getId(),
                new MockMultipartFile("file", "bad.wav", "audio/wav", new byte[]{1, 2}), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Speech-to-text processing failed");

        // The FAILED attempt is still recorded for the user's history.
        var records = speechRepository
                .findByUserId(user.getId(), PageRequest.of(0, 10)).getContent();
        assertThat(records).hasSize(1);
        SpeechDocument failed = records.get(0);
        assertThat(failed.getStatus()).isEqualTo(SpeechStatus.FAILED);
        assertThat(failed.getOutputText()).isNull();
        assertThat(failed.getFailureReason()).isEqualTo("Speech provider 'failing-speech' failed");
        // Internal details never leak.
        assertThat(failed.getFailureReason()).doesNotContain("simulated STT outage");
    }

    @Test
    void synthesisFailure_persistsFailedRecordWithoutLeakingInternals() {
        User user = createUser("speechfailing2");

        when(speechProvider.name()).thenReturn("failing-speech");
        when(speechProvider.synthesize(any()))
                .thenThrow(new RuntimeException("simulated TTS outage"));

        assertThatThrownBy(() -> speechService.synthesize(user.getId(),
                new com.project.speech.dto.SpeechSynthesisRequest("नमस्ते", "hi")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Text-to-speech processing failed");

        var records = speechRepository
                .findByUserId(user.getId(), PageRequest.of(0, 10)).getContent();
        assertThat(records).hasSize(1);
        SpeechDocument failed = records.get(0);
        assertThat(failed.getStatus()).isEqualTo(SpeechStatus.FAILED);
        assertThat(failed.getOutputText()).isNull();
        assertThat(failed.getFailureReason()).isEqualTo("Speech provider 'failing-speech' failed");
        assertThat(failed.getFailureReason()).doesNotContain("simulated TTS outage");
    }
}
