package com.project.learning;

import com.project.language.Language;
import com.project.learning.dto.LearningPracticeRequest;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JPA slice tests for the learning repositories (H2 in PostgreSQL mode).
 *
 * <p>{@code @DataJpaTest} does not run {@code CommandLineRunner} seeders, so
 * users and languages are created explicitly here.</p>
 */
@DataJpaTest
class LearningRepositoryTest {

    @Autowired
    private LearningProgressRepository learningProgressRepository;
    @Autowired
    private LearningPracticeRecordRepository learningPracticeRecordRepository;
    @Autowired
    private com.project.user.UserRepository userRepository;
    @Autowired
    private com.project.language.LanguageRepository languageRepository;

    private User createUser(String username) {
        return userRepository.saveAndFlush(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("not-a-real-hash")
                .build());
    }

    private Language createLanguage(String code) {
        return languageRepository.saveAndFlush(Language.builder()
                .name("Lang " + code)
                .nativeName("Lang " + code)
                .code(code)
                .build());
    }

    private LearningProgress saveProgress(User user, Language language, int attempts, int correct) {
        return learningProgressRepository.saveAndFlush(LearningProgress.builder()
                .user(user)
                .language(language)
                .attempts(attempts)
                .correctCount(correct)
                .incorrectCount(attempts - correct)
                .wordsPracticed(1)
                .lastPracticedAt(java.time.Instant.now())
                .build());
    }

    private LearningPracticeRecord saveRecord(User user, Language language, String word, boolean correct) {
        return learningPracticeRecordRepository.saveAndFlush(LearningPracticeRecord.builder()
                .user(user)
                .language(language)
                .word(word)
                .normalizedWord(word)
                .correct(correct)
                .build());
    }


    @Test
    void savePersistsUuidTimestampsAndCounters() {
        User user = createUser("learnrepo1");
        Language language = createLanguage("xx1");
        LearningProgress progress = saveProgress(user, language, 3, 2);

        assertThat(progress.getId()).isNotNull();
        assertThat(progress.getCreatedAt()).isNotNull();
        assertThat(progress.getUpdatedAt()).isNotNull();
        assertThat(progress.getAttempts()).isEqualTo(3);
        assertThat(progress.getCorrectCount()).isEqualTo(2);
        assertThat(progress.getIncorrectCount()).isEqualTo(1);
        assertThat(progress.getUser().getId()).isEqualTo(user.getId());
        assertThat(progress.getLanguage().getCode()).isEqualTo("xx1");
    }

    @Test
    void findByUserId_returnsOnlyThatUsersProgress_mostRecentFirst() {
        User userA = createUser("learnrepoA");
        User userB = createUser("learnrepoB");
        Language lang1 = createLanguage("xx2");
        Language lang2 = createLanguage("xx3");

        LearningProgress older = saveProgress(userA, lang1, 1, 1);
        older.setLastPracticedAt(java.time.Instant.now().minusSeconds(60));
        learningProgressRepository.saveAndFlush(older);
        saveProgress(userA, lang2, 5, 4);
        saveProgress(userB, lang1, 2, 0);

        var progressA = learningProgressRepository.findByUserIdOrderByLastPracticedAtDesc(userA.getId());

        assertThat(progressA).hasSize(2);
        assertThat(progressA).extracting(LearningProgress::getAttempts)
                .containsExactly(5, 1);

        var progressB = learningProgressRepository.findByUserIdOrderByLastPracticedAtDesc(userB.getId());
        assertThat(progressB).hasSize(1);
    }


    @Test
    void practiceRecords_supportPaginationAndDistinctWordDetection() {
        User user = createUser("learnrepoC");
        User other = createUser("learnrepoD");
        Language language = createLanguage("xx4");
        saveRecord(user, language, "water", true);
        saveRecord(user, language, "book", false);
        saveRecord(other, language, "water", true);

        assertThat(learningPracticeRecordRepository
                .existsByUserIdAndLanguage_IdAndNormalizedWord(user.getId(), language.getId(), "water")).isTrue();
        assertThat(learningPracticeRecordRepository
                .existsByUserIdAndLanguage_IdAndNormalizedWord(user.getId(), language.getId(), "tree")).isFalse();
        // distinct-word detection is per user
        assertThat(learningPracticeRecordRepository
                .existsByUserIdAndLanguage_IdAndNormalizedWord(other.getId(), language.getId(), "book")).isFalse();

        var page = learningPracticeRecordRepository.findByUserId(user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 10,
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
        assertThat(page.getTotalElements()).isEqualTo(2);

        // derived bulk delete removes only that user's records
        learningPracticeRecordRepository.deleteByUserIdAndLanguage_Id(user.getId(), language.getId());
        assertThat(learningPracticeRecordRepository.findByUserId(user.getId(),
                org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements()).isZero();
        assertThat(learningPracticeRecordRepository.findByUserId(other.getId(),
                org.springframework.data.domain.PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);
    }
}
