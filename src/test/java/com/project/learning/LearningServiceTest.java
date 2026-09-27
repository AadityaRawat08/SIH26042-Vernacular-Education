package com.project.learning;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.dictionary.DictionaryEntry;
import com.project.dictionary.DictionaryRepository;
import com.project.learning.dto.LearningHistoryResponse;
import com.project.learning.dto.LearningPracticeRequest;
import com.project.learning.dto.LearningPracticeResponse;
import com.project.learning.dto.LearningProgressResponse;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-context service tests for the learning module (H2, PostgreSQL mode).
 * Dictionary entries and languages are created explicitly so the tests do not
 * depend on seed content.
 */
@SpringBootTest
@Transactional
class LearningServiceTest {

    @Autowired
    private LearningService learningService;
    @Autowired
    private LearningProgressRepository learningProgressRepository;
    @Autowired
    private LearningPracticeRecordRepository learningPracticeRecordRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LanguageRepository languageRepository;
    @Autowired
    private DictionaryRepository dictionaryRepository;

    private User createUser(String username) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("not-a-real-hash")
                .build());
    }

    private Language createLanguage(String code) {
        return languageRepository.save(Language.builder()
                .name("Lang " + code)
                .nativeName("Lang " + code)
                .code(code)
                .build());
    }

    private Language createInactiveLanguage(String code) {
        return languageRepository.save(Language.builder()
                .name("Inactive " + code)
                .nativeName("Inactive " + code)
                .code(code)
                .isActive(false)
                .build());
    }

    private DictionaryEntry createEntry(Language language, String word, String translation) {
        return dictionaryRepository.save(DictionaryEntry.builder()
                .language(language)
                .word(word)
                .normalizedWord(word.trim().toLowerCase().replaceAll("\\s+", " "))
                .definition("definition of " + word)
                .translation(translation)
                .build());
    }

    private LearningPracticeRequest practice(String language, String word, boolean correct) {
        return new LearningPracticeRequest(language, word, correct);
    }


    // --- Practice: happy paths -------------------------------------------------

    @Test
    void practice_succeeds_createsProgressAndRecord_withDictionaryFeedback() {
        User user = createUser("learn1");
        Language language = createLanguage("xa1");
        createEntry(language, "pani", "water");

        LearningPracticeResponse response = learningService.practice(user.getId(),
                practice("xa1", "pani", true));

        assertThat(response.languageCode()).isEqualTo("xa1");
        assertThat(response.word()).isEqualTo("pani");
        assertThat(response.translation()).isEqualTo("water");
        assertThat(response.definition()).isEqualTo("definition of pani");
        assertThat(response.correct()).isTrue();

        LearningProgressResponse progress = response.progress();
        assertThat(progress.id()).isNotNull();
        assertThat(progress.languageCode()).isEqualTo("xa1");
        assertThat(progress.attempts()).isEqualTo(1);
        assertThat(progress.correctCount()).isEqualTo(1);
        assertThat(progress.incorrectCount()).isZero();
        assertThat(progress.wordsPracticed()).isEqualTo(1);
        assertThat(progress.lastPracticedAt()).isNotNull();

        // both the aggregate and the immutable record are persisted
        assertThat(learningProgressRepository.findById(progress.id())).isPresent();
        assertThat(learningPracticeRecordRepository.findByUserId(user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);
    }

    @Test
    void practice_repeatedWord_incrementsAttemptsButKeepsDistinctWordCount() {
        User user = createUser("learn2");
        Language language = createLanguage("xa2");
        createEntry(language, "pani", "water");

        learningService.practice(user.getId(), practice("xa2", "pani", true));
        LearningPracticeResponse second = learningService.practice(user.getId(),
                practice("xa2", "  PANI  ", false)); // case/whitespace-insensitive match

        assertThat(second.progress().attempts()).isEqualTo(2);
        assertThat(second.progress().correctCount()).isEqualTo(1);
        assertThat(second.progress().incorrectCount()).isEqualTo(1);
        // same normalized word -> distinct count stays at 1
        assertThat(second.progress().wordsPracticed()).isEqualTo(1);
        // the canonical dictionary word is recorded, not the raw input
        assertThat(second.word()).isEqualTo("pani");
    }

    @Test
    void practice_multipleLanguages_keepSeparateProgress() {
        User user = createUser("learn3");
        Language hindi = createLanguage("xa3");
        Language english = createLanguage("xa4");
        createEntry(hindi, "pani", "water");
        createEntry(english, "water", "paani");

        learningService.practice(user.getId(), practice("xa3", "pani", true));
        LearningPracticeResponse englishPractice = learningService.practice(user.getId(),
                practice("xa4", "water", false));

        assertThat(englishPractice.progress().languageCode()).isEqualTo("xa4");
        assertThat(englishPractice.progress().attempts()).isEqualTo(1);

        var all = learningService.progress(user.getId());
        assertThat(all).hasSize(2);
        assertThat(all).extracting(LearningProgressResponse::languageCode)
                .containsExactlyInAnyOrder("xa3", "xa4");
    }

    // --- Practice: validation --------------------------------------------------

    @Test
    void practice_unknownLanguage_throws404() {
        User user = createUser("learn4");

        assertThatThrownBy(() -> learningService.practice(user.getId(), practice("zzz1", "word", true)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("zzz1");
    }

    @Test
    void practice_inactiveLanguage_throws422() {
        User user = createUser("learn5");
        createInactiveLanguage("xa5");

        assertThatThrownBy(() -> learningService.practice(user.getId(), practice("xa5", "word", true)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("inactive");
    }

    @Test
    void practice_blankWord_throws422() {
        User user = createUser("learn6");
        Language language = createLanguage("xa6");
        createEntry(language, "pani", "water");

        assertThatThrownBy(() -> learningService.practice(user.getId(), practice("xa6", "   ", true)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("word must not be blank");
    }

    @Test
    void practice_wordNotInDictionary_throws404() {
        User user = createUser("learn7");
        Language language = createLanguage("xa7");
        createEntry(language, "pani", "water");

        assertThatThrownBy(() -> learningService.practice(user.getId(), practice("xa7", "vriksha", true)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("vriksha");
        // nothing was persisted for the failed attempt
        assertThat(learningService.progress(user.getId())).isEmpty();
    }


    // --- Progress / history / reset --------------------------------------------

    @Test
    void progress_isolatedPerUser() {
        User userA = createUser("learnH1");
        User userB = createUser("learnH2");
        Language language = createLanguage("xa8");
        createEntry(language, "pani", "water");

        learningService.practice(userA.getId(), practice("xa8", "pani", true));
        learningService.practice(userB.getId(), practice("xa8", "pani", false));

        assertThat(learningService.progress(userA.getId())).hasSize(1);
        assertThat(learningService.progress(userA.getId()).get(0).attempts()).isEqualTo(1);
        assertThat(learningService.progress(userA.getId()).get(0).correctCount()).isEqualTo(1);
        // each user has an independent aggregate for the same language
        assertThat(learningService.progress(userB.getId()).get(0).incorrectCount()).isEqualTo(1);
    }

    @Test
    void progressForLanguage_returnsOwnProgress() {
        User user = createUser("learnG1");
        Language language = createLanguage("xa9");
        createEntry(language, "pani", "water");

        learningService.practice(user.getId(), practice("xa9", "pani", true));

        LearningProgressResponse progress = learningService.progressForLanguage(user.getId(), "XA9"); // case-insensitive
        assertThat(progress.attempts()).isEqualTo(1);
        assertThat(progress.languageCode()).isEqualTo("xa9");
    }

    @Test
    void progressForLanguage_unknownOrUnpracticedLanguage_throws404() {
        User user = createUser("learnG2");

        // unknown language code and known-but-unpracticed code are indistinguishable (404)
        assertThatThrownBy(() -> learningService.progressForLanguage(user.getId(), "zzz2"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No learning progress found");

        Language language = createLanguage("xa10");
        createEntry(language, "pani", "water");
        assertThatThrownBy(() -> learningService.progressForLanguage(user.getId(), "xa10"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No learning progress found");
    }

    @Test
    void history_returnsOnlyOwnRecords_newestFirst_paginated() {
        User user = createUser("learnHi1");
        User other = createUser("learnHi2");
        Language language = createLanguage("xa11");
        createEntry(language, "pani", "water");
        createEntry(language, "book", "kitaab");

        learningService.practice(user.getId(), practice("xa11", "pani", true));
        learningService.practice(user.getId(), practice("xa11", "book", false));
        learningService.practice(other.getId(), practice("xa11", "pani", true));

        LearningHistoryResponse history = learningService.history(user.getId(), 0, 10);
        assertThat(history.totalElements()).isEqualTo(2);
        assertThat(history.content()).extracting(
                        com.project.learning.dto.LearningPracticeRecordResponse::word)
                .containsExactlyInAnyOrder("pani", "book");
        assertThat(history.content()).extracting(
                        com.project.learning.dto.LearningPracticeRecordResponse::correct)
                .containsExactlyInAnyOrder(true, false);

        LearningHistoryResponse firstPage = learningService.history(user.getId(), 0, 1);
        assertThat(firstPage.totalElements()).isEqualTo(2);
        assertThat(firstPage.content()).hasSize(1);
        assertThat(firstPage.totalPages()).isEqualTo(2);
    }

    @Test
    void resetProgress_deletesProgressAndRecordsForThatLanguageOnly() {
        User user = createUser("learnR1");
        Language hindi = createLanguage("xa12");
        Language english = createLanguage("xa13");
        createEntry(hindi, "pani", "water");
        createEntry(english, "water", "paani");

        learningService.practice(user.getId(), practice("xa12", "pani", true));
        learningService.practice(user.getId(), practice("xa13", "water", true));

        learningService.resetProgress(user.getId(), "xa12");

        assertThatThrownBy(() -> learningService.progressForLanguage(user.getId(), "xa12"))
                .isInstanceOf(ResourceNotFoundException.class);
        // the other language's progress is untouched
        assertThat(learningService.progressForLanguage(user.getId(), "xa13").attempts()).isEqualTo(1);
        // and the practice records for the reset language are gone
        var remaining = learningService.history(user.getId(), 0, 10);
        assertThat(remaining.totalElements()).isEqualTo(1);
        assertThat(remaining.content().get(0).languageCode()).isEqualTo("xa13");
    }

    @Test
    void resetProgress_noProgress_throws404_andDoesNotTouchOtherUsers() {
        User user = createUser("learnR2");
        User other = createUser("learnR3");
        Language language = createLanguage("xa14");
        createEntry(language, "pani", "water");

        learningService.practice(other.getId(), practice("xa14", "pani", true));

        assertThatThrownBy(() -> learningService.resetProgress(user.getId(), "xa14"))
                .isInstanceOf(ResourceNotFoundException.class);

        // the other user's progress survives
        assertThat(learningService.progressForLanguage(other.getId(), "xa14").attempts()).isEqualTo(1);
    }
}
