package com.project.translation;

import com.project.translation.dto.TranslationRequest;
import com.project.translation.dto.TranslationResponse;
import com.project.translation.provider.TranslationProvider;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Verifies that a provider failure is handled gracefully: the attempt is
 * persisted as a FAILED record and no internal exception escapes.
 *
 * <p>{@link MockitoBean} replaces the real {@code MockTranslationProvider} with
 * a stub that throws, exercising the failure branch of
 * {@link TranslationService#translate}.</p>
 */
@SpringBootTest
@Transactional
class TranslationProviderFailureTest {

    @Autowired
    private TranslationService translationService;
    @Autowired
    private TranslationRepository translationRepository;
    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private TranslationProvider translationProvider;

    @Test
    void providerFailure_persistsFailedRecordWithoutLeakingInternals() {
        User user = userRepository.save(User.builder()
                .username("failing")
                .email("failing@example.com")
                .password("x")
                .build());

        when(translationProvider.name()).thenReturn("mock");
        when(translationProvider.translate(anyString(), any(), any()))
                .thenThrow(new RuntimeException("simulated provider outage"));

        TranslationResponse response = translationService.translate(user.getId(),
                new TranslationRequest("hi", "en", "hello"));

        assertThat(response.id()).isNotNull();
        assertThat(response.status()).isEqualTo(TranslationStatus.FAILED);
        assertThat(response.translatedText()).isNull();
        assertThat(response.provider()).isEqualTo("mock");
        // The failed attempt is still recorded for the user's history.
        assertThat(translationRepository.findById(response.id())).isPresent();
    }
}
