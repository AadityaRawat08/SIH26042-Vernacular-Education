package com.project.learning.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for one vocabulary practice attempt.
 *
 * <p>The {@code word} must resolve to an existing dictionary entry of the given
 * language (case-insensitive); {@code correct} is the client's grading of the
 * attempt — there is intentionally no server-side grading engine.</p>
 *
 * @param language language code (ISO 639) being practiced, required; must
 *                 reference an existing, active language
 * @param word     the practiced word, required
 * @param correct  whether the attempt was answered correctly, required
 */
public record LearningPracticeRequest(
        @NotBlank(message = "language must not be blank")
        @Size(max = 8, message = "language must be at most 8 characters")
        String language,

        @NotBlank(message = "word must not be blank")
        @Size(max = 200, message = "word must be at most 200 characters")
        String word,

        @NotNull(message = "correct must not be null")
        Boolean correct) {
}
