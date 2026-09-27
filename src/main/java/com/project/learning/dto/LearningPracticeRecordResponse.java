package com.project.learning.dto;

import com.project.learning.LearningPracticeRecord;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a single practice-history entry.
 *
 * @param id           practice record id
 * @param languageCode ISO 639 code of the practiced language
 * @param word         the canonical dictionary word that was practiced
 * @param correct      whether the attempt was graded correct
 * @param practicedAt  when the attempt was recorded
 */
public record LearningPracticeRecordResponse(
        UUID id,
        String languageCode,
        String word,
        boolean correct,
        Instant practicedAt) {

    public static LearningPracticeRecordResponse from(LearningPracticeRecord record) {
        return new LearningPracticeRecordResponse(
                record.getId(),
                record.getLanguage().getCode(),
                record.getWord(),
                record.isCorrect(),
                record.getCreatedAt());
    }
}
