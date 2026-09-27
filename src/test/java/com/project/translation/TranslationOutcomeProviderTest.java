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
 * Verifies that the provider persisted on a translation is the engine that
 * <em>actually</em> produced the text, not the provider that was merely
 * configured.
 *
 * <p>This is the audit trail that keeps an AI-service result produced by its
 * isolated local development translator from being recorded as a real Bhashini
 * translation.</p>
 */
@SpringBootTest
@Transactional
class TranslationOutcomeProviderTest {

    @Autowired
    private TranslationService translationService;
    @Autowired
    private TranslationRepository translationRepository;
    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private TranslationProvider translationProvider;

    @Test
    void translate_recordsTheProviderThatProducedTheText() {
        User user = userRepository.save(User.builder()
                .username("outcome")
                .email("outcome@example.com")
                .password("x")
                .build());

        when(translationProvider.name()).thenReturn("ai-translation");
        when(translationProvider.translateWithName(anyString(), any(), any()))
                .thenReturn(new TranslationProvider.TranslationOutcome(
                        "ᱟᱡᱤ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭᱟ", "ai-translation (demo)"));

        TranslationResponse response = translationService.translate(user.getId(),
                new TranslationRequest("hi", "sat", "आज हम जोड़ना सीखेंगे।"));

        assertThat(response.status()).isEqualTo(TranslationStatus.COMPLETED);
        assertThat(response.translatedText()).isEqualTo("ᱟᱡᱤ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭᱟ");
        assertThat(response.provider()).isEqualTo("ai-translation (demo)");
        assertThat(translationRepository.findById(response.id())).isPresent();
    }
}
