package com.project.ocr;

import com.project.common.dto.ApiResponse;
import com.project.ocr.dto.OcrHistoryResponse;
import com.project.ocr.dto.OcrResponse;
import com.project.ocr.dto.OcrTranslateRequest;
import com.project.security.UserPrincipal;
import com.project.translation.dto.TranslationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Authenticated OCR endpoints.
 *
 * <p>Every route requires a valid Bearer access token (enforced by
 * {@code SecurityConfig}); the authenticated user is taken from the JWT subject
 * and used to scope all reads, deletes, history and translations — a user
 * can never access another user's OCR records (404 on foreign ids).</p>
 */
@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "OCR", description = "Image OCR processing and per-user OCR history (authenticated)")
public class OcrController {

    private final OcrService ocrService;
/**
     * POST /api/ocr — upload an image (multipart {@code file}) and extract text.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Extract text from an image with OCR",
            description = "Uploads an image as multipart `file` and runs it through the OCR provider. "
                    + "Accepted content types: image/jpeg, image/png, image/webp. The file must be "
                    + "non-empty and within the configured size limit. The optional `language` query "
                    + "parameter (ISO 639 code, e.g. `hi`) records the language of the text and must "
                    + "reference an existing, active language (404 unknown / 422 inactive). "
                    + "Requires a valid Bearer access token; the record is owned by the caller.")
    public ApiResponse<OcrResponse> process(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String language) {
        return ApiResponse.of("OCR processed", ocrService.processFile(principal.getId(), file, language));
    }

    /**
     * GET /api/ocr — the current user's OCR history, newest first.
     */
    @GetMapping
    @Operation(summary = "List my OCR history",
            description = "Returns the authenticated user's OCR records, newest first, as a paginated "
                    + "page. Supports `page` (0-based, default 0) and `size` (default 20, max 100). "
                    + "File binaries are never returned.")
    public ApiResponse<OcrHistoryResponse> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.of(ocrService.history(principal.getId(), page, size));
    }

    /**
     * GET /api/ocr/{id} — a single OCR record owned by the caller.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get an OCR record",
            description = "Returns a single OCR record. 404 when the id is unknown or belongs to "
                    + "another user (ownership is enforced server-side).")
    public ApiResponse<OcrResponse> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ApiResponse.of(ocrService.get(principal.getId(), id));
    }

    /**
     * POST /api/ocr/{id}/translate — translate the extracted text using the
     * existing translation architecture.
     */
    @PostMapping("/{id}/translate")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Translate the text extracted from an OCR record",
            description = "Translates the extracted text of a COMPLETED OCR record through the "
                    + "existing translation service (the result is persisted in the user's translation "
                    + "history). The source language is the OCR record's detected language when "
                    + "available, otherwise `sourceLanguage` in the request body is used. 404 when the "
                    + "OCR id is unknown or belongs to another user; 422 when the record is not "
                    + "COMPLETED, its text is blank, no source language could be determined, or target "
                    + "language rules are violated.")
    public ApiResponse<TranslationResponse> translate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody OcrTranslateRequest request) {
        return ApiResponse.of("Translation created",
                ocrService.translate(principal.getId(), id, request));
    }

    /**
     * DELETE /api/ocr/{id} — deletes an OCR record owned by the caller.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an OCR record",
            description = "Deletes a single OCR record. 404 when the id is unknown or belongs to "
                    + "another user (ownership is enforced server-side).")
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        ocrService.delete(principal.getId(), id);
    }
}