package com.project.learning.dto;

/**
 * Result of one practice attempt: the dictionary entry that was practiced (for
 * immediate feedback) plus the caller's updated progress.
 *
 * @param languageCode  ISO 639 code of the practiced language
 * @param word          the canonical dictionary word that was practiced
 * @param pronunciation optional pronunciation of the word
 * @param definition    meaning/gloss of the word
 * @param translation   optional translation/meaning of the word
 * @param correct       the client-supplied grading of the attempt
 * @param progress      the user's updated progress for the language
 */
public record LearningPracticeResponse(
        String languageCode,
        String word,
        String pronunciation,
        String definition,
        String translation,
        boolean correct,
        LearningProgressResponse progress) {
}
