package com.project.translation;

import com.project.common.dto.ApiResponse;
import com.project.security.UserPrincipal;
import com.project.translation.dto.TranslationRequest;
import com.project.translation.dto.TranslationResponse;
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
import java.util.UUID;

/**
 * Authenticated translation endpoints.
 *
 * <p>Every route requires a valid Bearer access token (enforced by
 * {@code SecurityConfig}); the authenticated user is taken from the JWT subject
 * and used to scope all reads, deletes and history.</p>
 */
@RestController
@RequestMapping("/api/translations")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Translations", description = "Text translation and per-user translation history (authenticated)")
public class TranslationController {

    private final TranslationService translationService;

    /**
     * POST /api/translations — translates text and persists the result.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Translate text",
            description = "Resolves the source/target language codes through the language catalogue, "
                    + "calls the translation provider, persists the result, and returns it. "
                    + "Both languages must exist and be active; identical languages echo the text back.")
    public ApiResponse<TranslationResponse> translate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TranslationRequest request) {
        return ApiResponse.of("Translation created",
                translationService.translate(principal.getId(), request));
    }

    /**
     * GET /api/translations — the current user's translations, newest first.
     */
    @GetMapping
    @Operation(summary = "List my translations",
            description = "Returns the authenticated user's translations, newest first. "
                    + "Supports `page` (0-based) and `size` (max 100, default 20).")
    public ApiResponse<List<TranslationResponse>> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.of(translationService.history(principal.getId(), page, size));
    }

    /**
     * GET /api/translations/{id} — a single translation owned by the caller.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get a translation",
            description = "Returns a single translation. 404 when the id is unknown or belongs to another user.")
    public ApiResponse<TranslationResponse> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ApiResponse.of(translationService.get(principal.getId(), id));
    }

    /**
     * DELETE /api/translations/{id} — deletes a translation owned by the caller.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a translation",
            description = "Deletes a single translation. 404 when the id is unknown or belongs to another user.")
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        translationService.delete(principal.getId(), id);
    }
}
