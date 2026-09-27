package com.project.learning.dto;

import com.project.learning.LearningProgress;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a user's {@link LearningProgress} for one language.
 *
 * @param id             progress row id
 * @param languageCode   ISO 639 code of the language being learned
 * @param languageName   display name of the language
 * @param attempts       total practice attempts recorded
 * @param correctCount   attempts graded correct
 * @param incorrectCount attempts graded incorrect
 * @param wordsPracticed distinct dictionary words practiced at least once
 * @param lastPracticedAt time of the most recent attempt
 * @param createdAt      when progress tracking started for this language
 * @param updatedAt      last time the progress row changed
 */
public record LearningProgressResponse(
        UUID id,
        String languageCode,
        String languageName,
        int attempts,
        int correctCount,
        int incorrectCount,
        int wordsPracticed,
        Instant lastPracticedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static LearningProgressResponse from(LearningProgress progress) {
        return new LearningProgressResponse(
                progress.getId(),
                progress.getLanguage().getCode(),
                progress.getLanguage().getName(),
                progress.getAttempts(),
                progress.getCorrectCount(),
                progress.getIncorrectCount(),
                progress.getWordsPracticed(),
                progress.getLastPracticedAt(),
                progress.getCreatedAt(),
                progress.getUpdatedAt());
    }
}
