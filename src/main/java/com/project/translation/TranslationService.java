package com.project.translation;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.translation.dto.TranslationRequest;
import com.project.translation.dto.TranslationResponse;
import com.project.translation.provider.TranslationProvider;
import com.project.user.User;
import com.project.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Application service managing {@link Translation} records.
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>source and target language codes must resolve to existing, active
 *       languages (404 unknown, 422 inactive)</li>
 *   <li>text must be non-blank and within {@link #MAX_TEXT_LENGTH}</li>
 *   <li>identical source/target languages echo the text back without invoking
 *       the provider</li>
 *   <li>provider failures are captured as a persisted FAILED record rather than
 *       leaking internal exceptions</li>
 *   <li>every read/delete is scoped to the owning user (IDOR-safe: a foreign
 *       record is indistinguishable from a missing one)</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TranslationService {

    public static final int MAX_TEXT_LENGTH = 5000;

    private static final int MAX_PAGE_SIZE = 100;
    private static final String IDENTITY_PROVIDER = "identity";

    private final TranslationRepository translationRepository;
    private final LanguageRepository languageRepository;
    private final UserRepository userRepository;
    private final TranslationProvider translationProvider;

    /**
     * Translates {@code request.text()} and persists the result.
     *
     * @param userId  id of the authenticated user (JWT subject)
     * @param request translation request
     * @return persisted translation view
     */
    @Transactional
    public TranslationResponse translate(UUID userId, TranslationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + userId + " was not found"));
        String text = validateText(request.text());
        Language source = resolveActiveLanguage(request.sourceLanguage(), "source");
        Language target = resolveActiveLanguage(request.targetLanguage(), "target");

        String translatedText;
        TranslationStatus status;
        String providerName;

        if (source.getCode().equals(target.getCode())) {
            // No actual translation needed — echo back without provider work.
            translatedText = text;
            status = TranslationStatus.COMPLETED;
            providerName = IDENTITY_PROVIDER;
        } else {
            try {
                // translateWithName (not translate + name) so the recorded provider is
                // the engine that actually produced the text — a provider that falls
                // back to a local development translator must never be recorded as
                // the real remote engine.
                TranslationProvider.TranslationOutcome outcome =
                        translationProvider.translateWithName(text, source, target);
                translatedText = outcome.text();
                status = TranslationStatus.COMPLETED;
                providerName = outcome.provider();
            } catch (RuntimeException ex) {
                // Provider failure is recorded, not rethrown: the user keeps a
                // FAILED history entry and no internal detail is exposed.
                log.warn("Translation provider '{}' failed for user {}: {}",
                        translationProvider.name(), userId, ex.getMessage());
                translatedText = null;
                status = TranslationStatus.FAILED;
                providerName = translationProvider.name();
            }
        }

        Translation translation = Translation.builder()
                .user(user)
                .sourceLanguage(source)
                .targetLanguage(target)
                .sourceText(text)
                .translatedText(translatedText)
                .provider(providerName)
                .status(status)
                .build();

        // saveAndFlush so the UUID id / timestamps are populated before mapping.
        return TranslationResponse.from(translationRepository.saveAndFlush(translation));
    }

    /**
     * Returns the authenticated user's translations, newest first.
     */
    @Transactional(readOnly = true)
    public List<TranslationResponse> history(UUID userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return translationRepository.findByUserId(userId, pageable)
                .map(TranslationResponse::from)
                .getContent();
    }

    /**
     * Returns a single translation, scoped to the owning user.
     *
     * @throws ResourceNotFoundException when missing or owned by another user (404)
     */
    @Transactional(readOnly = true)
    public TranslationResponse get(UUID userId, UUID translationId) {
        return TranslationResponse.from(findOwned(translationId, userId));
    }

    /**
     * Deletes a translation, scoped to the owning user.
     *
     * @throws ResourceNotFoundException when missing or owned by another user (404)
     */
    @Transactional
    public void delete(UUID userId, UUID translationId) {
        translationRepository.delete(findOwned(translationId, userId));
    }

    /**
     * Loads a translation while enforcing ownership.
     *
     * <p>Ownership violations are reported the same way as a missing record
     * (404) so callers can never probe whether a translation id exists.</p>
     */
    private Translation findOwned(UUID translationId, UUID userId) {
        Translation translation = translationRepository.findById(translationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Translation with id " + translationId + " was not found"));
        if (!translation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException(
                    "Translation with id " + translationId + " was not found");
        }
        return translation;
    }

    private String validateText(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException("text must not be blank");
        }
        String text = raw.trim();
        if (text.length() > MAX_TEXT_LENGTH) {
            throw new BusinessException("text must be at most " + MAX_TEXT_LENGTH + " characters");
        }
        return text;
    }

    private Language resolveActiveLanguage(String code, String field) {
        if (code == null || code.isBlank()) {
            throw new BusinessException(field + " language must not be blank");
        }
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        Language language = languageRepository.findByCode(normalized)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language with code '" + code + "' was not found"));
        if (!language.isActive()) {
            throw new BusinessException("Language '" + language.getName() + "' is inactive");
        }
        return language;
    }
}

