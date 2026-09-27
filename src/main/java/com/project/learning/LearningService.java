package com.project.learning;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.dictionary.DictionaryEntry;
import com.project.dictionary.DictionaryService;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.learning.dto.LearningHistoryResponse;
import com.project.learning.dto.LearningPracticeRecordResponse;
import com.project.learning.dto.LearningPracticeRequest;
import com.project.learning.dto.LearningPracticeResponse;
import com.project.learning.dto.LearningProgressResponse;
import com.project.user.User;
import com.project.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Application service for vocabulary learning progress.
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>practiced words must belong to an existing, active language (404
 *       unknown, 422 inactive) and resolve to a dictionary entry of that
 *       language (404) — the local dictionary is the single source of learning
 *       content; no external grading or content service exists</li>
 *   <li>answer correctness is supplied by the client at practice time; the
 *       service only aggregates it deterministically</li>
 *   <li>every attempt appends an immutable {@link LearningPracticeRecord} and
 *       upserts the {@link LearningProgress} aggregate; the distinct
 *       {@code wordsPracticed} counter only advances on the first attempt of a
 *       normalized word</li>
 *   <li>all reads and writes are scoped to the authenticated user — progress is
 *       addressed by the caller's identity (never by a user id in the URL), so
 *       another user's data is unreachable by construction</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class LearningService {

    static final int MAX_PAGE_SIZE = 100;

    private final LearningProgressRepository learningProgressRepository;
    private final LearningPracticeRecordRepository learningPracticeRecordRepository;
    private final UserRepository userRepository;
    private final LanguageRepository languageRepository;
    private final DictionaryService dictionaryService;

    /**
     * Records one practice attempt and updates the caller's progress.
     *
     * @throws ResourceNotFoundException when the language (404), the user (404)
     *                                   or the dictionary word (404) is unknown
     * @throws BusinessException         when the language is inactive (422) or
     *                                   the word is blank (422)
     */
    @Transactional
    public LearningPracticeResponse practice(UUID userId, LearningPracticeRequest request) {
        User user = requireUser(userId);
        if (request.word() == null || request.word().isBlank()) {
            throw new BusinessException("word must not be blank");
        }
        Language language = resolveActiveLanguage(request.language());
        DictionaryEntry entry = dictionaryService.findEntry(language, request.word());
        boolean correct = Boolean.TRUE.equals(request.correct());

        // Distinct-word bookkeeping must be decided before the new record exists.
        boolean firstAttemptOfWord = !learningPracticeRecordRepository
                .existsByUserIdAndLanguage_IdAndNormalizedWord(userId, language.getId(), entry.getNormalizedWord());

        learningPracticeRecordRepository.save(LearningPracticeRecord.builder()
                .user(user)
                .language(language)
                .word(entry.getWord())
                .normalizedWord(entry.getNormalizedWord())
                .correct(correct)
                .build());

        LearningProgress progress = learningProgressRepository
                .findByUserIdAndLanguage_Id(userId, language.getId())
                .orElseGet(() -> LearningProgress.builder()
                        .user(user)
                        .language(language)
                        .attempts(0)
                        .correctCount(0)
                        .incorrectCount(0)
                        .wordsPracticed(0)
                        .build());
        progress.setAttempts(progress.getAttempts() + 1);
        if (correct) {
            progress.setCorrectCount(progress.getCorrectCount() + 1);
        } else {
            progress.setIncorrectCount(progress.getIncorrectCount() + 1);
        }
        if (firstAttemptOfWord) {
            progress.setWordsPracticed(progress.getWordsPracticed() + 1);
        }
        progress.setLastPracticedAt(Instant.now());

        // saveAndFlush so the id / timestamps are populated before mapping.
        LearningProgress saved = learningProgressRepository.saveAndFlush(progress);

        return new LearningPracticeResponse(
                language.getCode(),
                entry.getWord(),
                entry.getPronunciation(),
                entry.getDefinition(),
                entry.getTranslation(),
                correct,
                LearningProgressResponse.from(saved));
    }


    /**
     * Returns all of the caller's progress rows, most recently practiced first.
     */
    @Transactional(readOnly = true)
    public List<LearningProgressResponse> progress(UUID userId) {
        return learningProgressRepository.findByUserIdOrderByLastPracticedAtDesc(userId)
                .stream()
                .map(LearningProgressResponse::from)
                .toList();
    }

    /**
     * Returns the caller's progress for one language.
     *
     * @throws ResourceNotFoundException when the language is unknown or the user
     *                                   has no progress for it (404, indistinguishable
     *                                   by design so language existence is not leaked)
     */
    @Transactional(readOnly = true)
    public LearningProgressResponse progressForLanguage(UUID userId, String languageCode) {
        return learningProgressRepository
                .findByUserIdAndLanguage_Code(userId, normalizeCode(languageCode))
                .map(LearningProgressResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No learning progress found for language '" + languageCode + "'"));
    }

    /**
     * Returns the caller's practice history, newest first.
     */
    @Transactional(readOnly = true)
    public LearningHistoryResponse history(UUID userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return LearningHistoryResponse.from(
                learningPracticeRecordRepository.findByUserId(userId, pageable));
    }

    /**
     * Resets (deletes) the caller's progress and practice history for a language.
     *
     * @throws ResourceNotFoundException when the user has no progress for the
     *                                   language (404)
     */
    @Transactional
    public void resetProgress(UUID userId, String languageCode) {
        LearningProgress progress = learningProgressRepository
                .findByUserIdAndLanguage_Code(userId, normalizeCode(languageCode))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No learning progress found for language '" + languageCode + "'"));
        learningPracticeRecordRepository.deleteByUserIdAndLanguage_Id(userId, progress.getLanguage().getId());
        learningProgressRepository.delete(progress);
    }

    /**
     * Resolves a language by its ISO 639 code, requiring it to be active.
     *
     * @throws ResourceNotFoundException when the code is unknown (404)
     * @throws BusinessException         when the language is inactive (422)
     */
    private Language resolveActiveLanguage(String code) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("language must not be blank");
        }
        Language language = languageRepository.findByCode(normalizeCode(code))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language with code '" + code + "' was not found"));
        if (!language.isActive()) {
            throw new BusinessException("Language '" + language.getName() + "' is inactive");
        }
        return language;
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toLowerCase(Locale.ROOT);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + userId + " was not found"));
    }
}
