package com.project.speech;

import com.project.common.exception.BusinessException;
import com.project.speech.dto.SpeechSynthesisRequest;
import com.project.speech.provider.SpeechProvider;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Verifies {@code POST /api/speech/synthesize/audio} behaviour at the service
 * layer: a real audio payload is returned and recorded, and a provider that
 * cannot produce audio is reported as a clean business error (never a 500).
 */
@SpringBootTest
@Transactional
class SpeechAudioSynthesisTest {

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
    void synthesizeAudio_returnsTheAudioAndRecordsTheAttempt() {
        User user = createUser("audio1");
        byte[] wav = new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0};

        when(speechProvider.name()).thenReturn("voice-service");
        when(speechProvider.synthesizeAudio(any()))
                .thenReturn(new SpeechProvider.TextToSpeechAudio("audio/wav", wav));

        SpeechService.AudioSynthesisResult result = speechService.synthesizeAudio(
                user.getId(), new SpeechSynthesisRequest("आज हम जोड़ना सीखेंगे।", "hi"));

        assertThat(result.contentType()).isEqualTo("audio/wav");
        assertThat(result.content()).isEqualTo(wav);
        // The attempt is part of the user's history, like the metadata endpoint.
        assertThat(speechRepository.findByUserId(user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 10)).getContent())
                .singleElement()
                .satisfies(record -> {
                    assertThat(record.getOperation()).isEqualTo(SpeechOperation.TEXT_TO_SPEECH);
                    assertThat(record.getStatus()).isEqualTo(SpeechStatus.COMPLETED);
                    assertThat(record.getInputText()).isEqualTo("आज हम जोड़ना सीखेंगे।");
                });
    }

    @Test
    void synthesizeAudio_providerWithoutAudioSupport_isACleanBusinessError() {
        User user = createUser("audio2");

        when(speechProvider.name()).thenReturn("mock-speech");
        when(speechProvider.synthesizeAudio(any()))
                .thenThrow(new UnsupportedOperationException("cannot return audio"));

        assertThatThrownBy(() -> speechService.synthesizeAudio(
                user.getId(), new SpeechSynthesisRequest("hello", "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Text-to-speech processing failed");
    }

    @Test
    void synthesizeAudio_blankText_isRejected() {
        User user = createUser("audio3");

        assertThatThrownBy(() -> speechService.synthesizeAudio(
                user.getId(), new SpeechSynthesisRequest("   ", "en")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("text must not be blank");
    }

    @Test
    void synthesizeAudio_unknownLanguage_isRejected() {
        User user = createUser("audio4");

        assertThatThrownBy(() -> speechService.synthesizeAudio(
                user.getId(), new SpeechSynthesisRequest("hello", "zz")))
                .hasMessageContaining("zz");
    }
}