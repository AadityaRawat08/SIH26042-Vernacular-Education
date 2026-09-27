package com.project.translation;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.translation.dto.TranslationRequest;
import com.project.translation.dto.TranslationResponse;
import com.project.translation.provider.MockTranslationProvider;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-context service tests for the translation module (H2, PostgreSQL mode).
 *
 * <p>Runs against the real {@link MockTranslationProvider} bean; language codes
 * {@code hi}/{@code en} come from the committed seed catalogue.</p>
 */
@SpringBootTest
@Transactional
class TranslationServiceTest {

    @Autowired
    private TranslationService translationService;
    @Autowired
    private TranslationRepository translationRepository;
    @Autowired
    private LanguageRepository languageRepository;
    @Autowired
    private UserRepository userRepository;

    private User createUser(String username) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("not-a-real-hash")
                .build());
    }

    @Test
    void translate_succeeds_usesMockProvider_andPersists() {
        User user = createUser("translator1");

        TranslationResponse response = translationService.translate(user.getId(),
                new TranslationRequest("hi", "en", "नमस्ते"));

        assertThat(response.id()).isNotNull();
        assertThat(response.sourceLanguage()).isEqualTo("hi");
        assertThat(response.targetLanguage()).isEqualTo("en");
        assertThat(response.sourceText()).isEqualTo("नमस्ते");
        // The mock provider's clearly-identifiable development result is used.
        assertThat(response.translatedText()).isEqualTo(MockTranslationProvider.PREFIX + "नमस्ते");
        assertThat(response.provider()).isEqualTo("mock");
        assertThat(response.status()).isEqualTo(TranslationStatus.COMPLETED);
        assertThat(response.createdAt()).isNotNull();
        // Result is persisted.
        assertThat(translationRepository.findById(response.id())).isPresent();
    }

    @Test
    void translate_invalidSourceLanguage_throws404() {
        User user = createUser("translator2");

        assertThatThrownBy(() -> translationService.translate(user.getId(),
                new TranslationRequest("zz", "en", "hello")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zz");
    }

    @Test
    void translate_invalidTargetLanguage_throws404() {
        User user = createUser("translator3");

        assertThatThrownBy(() -> translationService.translate(user.getId(),
                new TranslationRequest("hi", "zz", "नमस्ते")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zz");
    }

    @Test
    void translate_inactiveLanguage_throws422() {
        languageRepository.save(Language.builder()
                .name("Inactive").nativeName("Inactive").code("xx").isActive(false).build());
        User user = createUser("translator4");

        assertThatThrownBy(() -> translationService.translate(user.getId(),
                new TranslationRequest("xx", "en", "hello")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }

    @Test
    void translate_blankText_throws422() {
        User user = createUser("translator5");

        assertThatThrownBy(() -> translationService.translate(user.getId(),
                new TranslationRequest("hi", "en", "   ")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("blank");
    }

    @Test
    void translate_tooLongText_throws422() {
        User user = createUser("translator6");

        assertThatThrownBy(() -> translationService.translate(user.getId(),
                new TranslationRequest("hi", "en", "a".repeat(5001))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("at most");
    }

    @Test
    void translate_sameLanguage_echoesWithoutProviderWork() {
        User user = createUser("translator7");

        TranslationResponse response = translationService.translate(user.getId(),
                new TranslationRequest("hi", "hi", "नमस्ते"));

        assertThat(response.translatedText()).isEqualTo("नमस्ते");
        assertThat(response.provider()).isEqualTo("identity");
        assertThat(response.status()).isEqualTo(TranslationStatus.COMPLETED);
    }
}
