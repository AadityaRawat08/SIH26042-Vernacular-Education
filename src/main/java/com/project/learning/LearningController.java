package com.project.learning;

import com.project.common.dto.ApiResponse;
import com.project.learning.dto.LearningHistoryResponse;
import com.project.learning.dto.LearningPracticeRequest;
import com.project.learning.dto.LearningPracticeResponse;
import com.project.learning.dto.LearningProgressResponse;
import com.project.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Authenticated vocabulary-learning endpoints.
 *
 * <p>Every route requires a valid Bearer access token (enforced by
 * {@code SecurityConfig}); all data is scoped to the authenticated user taken
 * from the JWT subject — progress is never addressed by a user id in the URL,
 * so a user can never see or reset another user's learning data.</p>
 */
@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Learning", description = "Vocabulary learning progress and practice history (authenticated)")
public class LearningController {

    private final LearningService learningService;

    /**
     * POST /api/learning/practice — record one practice attempt.
     */
    @PostMapping("/practice")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record a vocabulary practice attempt",
            description = "Records one practice attempt for the given `word` and `language` (ISO 639 code) and "
                    + "returns the dictionary entry for immediate feedback together with the updated progress. "
                    + "The word must exist in the local dictionary for that language (404 otherwise; case-"
                    + "insensitive). The language must be existing and active (404 unknown / 422 inactive). "
                    + "`correct` is the client's grading of the attempt (no server-side grading engine). "
                    + "Requires a valid Bearer access token; progress is owned by the caller.")
    public ApiResponse<LearningPracticeResponse> practice(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody LearningPracticeRequest request) {
        return ApiResponse.of("Practice recorded",
                learningService.practice(principal.getId(), request));
    }

    /**
     * GET /api/learning/progress — the caller's progress for every language.
     */
    @GetMapping("/progress")
    @Operation(summary = "List my learning progress",
            description = "Returns the authenticated user's learning progress for every language they have "
                    + "practiced, most recently practiced first. One row per language.")
    public ApiResponse<List<LearningProgressResponse>> progress(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.of(learningService.progress(principal.getId()));
    }


    /**
     * GET /api/learning/progress/{languageCode} — the caller's progress for one language.
     */
    @GetMapping("/progress/{languageCode}")
    @Operation(summary = "Get my learning progress for a language",
            description = "Returns the authenticated user's progress for the given language code. 404 when the "
                    + "user has no progress for that language (unknown languages are not distinguished from "
                    + "languages without progress).")
    public ApiResponse<LearningProgressResponse> progressForLanguage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String languageCode) {
        return ApiResponse.of(learningService.progressForLanguage(principal.getId(), languageCode));
    }

    /**
     * GET /api/learning/history — the caller's practice history, newest first.
     */
    @GetMapping("/history")
    @Operation(summary = "List my practice history",
            description = "Returns the authenticated user's practice attempts, newest first, as a paginated page. "
                    + "Supports `page` (0-based, default 0) and `size` (default 20, max 100).")
    public ApiResponse<LearningHistoryResponse> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.of(learningService.history(principal.getId(), page, size));
    }

    /**
     * DELETE /api/learning/progress/{languageCode} — reset progress for a language.
     */
    @DeleteMapping("/progress/{languageCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Reset my learning progress for a language",
            description = "Deletes the authenticated user's progress and practice history for the given language "
                    + "code. 404 when the user has no progress for that language.")
    public void resetProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String languageCode) {
        learningService.resetProgress(principal.getId(), languageCode);
    }
}
