package com.project.dictionary;

import com.project.common.dto.ApiResponse;
import com.project.dictionary.dto.DictionaryEntryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Authenticated dictionary lookup endpoints.
 *
 * <p>Every route requires a valid Bearer access token (enforced by
 * {@code SecurityConfig}). Reads are public to any authenticated user; all
 * modifications live in the ADMIN-only {@link AdminDictionaryController}.</p>
 */
@RestController
@RequestMapping("/api/dictionary")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Dictionary", description = "Local dictionary lookup: search and entry details (authenticated)")
public class DictionaryController {

    private final DictionaryService dictionaryService;

    /**
     * GET /api/dictionary/search &mdash; search entries for a language.
     *
     * <p>{@code language} (ISO 639 code) is required; {@code word} is optional.
     * When {@code word} is provided, results match it case-insensitively on the
     * normalized word, with exact matches ordered first. Pagination uses
     * {@code page} (0-based, default 0) and {@code size} (default 20, max 100).
     */
    @GetMapping("/search")
    @Operation(summary = "Search the dictionary",
            description = "Authenticated users search the local dictionary. `language` (ISO 639 code, "
                    + "e.g. `hi`) is required and must be active (404 unknown / 422 inactive). "
                    + "`word` is optional: when provided, results match case-insensitively on the "
                    + "normalized word with exact matches first; when omitted, all entries for the "
                    + "language are returned newest-first. `page` (0-based, default 0) and `size` "
                    + "(default 20, max 100) control pagination.")
    public ApiResponse<List<DictionaryEntryResponse>> search(
            @RequestParam String language,
            @RequestParam(required = false) String word,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.of(dictionaryService.search(language, word, page, size));
    }

    /**
     * GET /api/dictionary/{id} &mdash; retrieve a single entry by id.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get a dictionary entry by id",
            description = "Authenticated users retrieve a single entry by id. "
                    + "Returns 404 when no entry exists for the given id.")
    public ApiResponse<DictionaryEntryResponse> get(@PathVariable UUID id) {
        return ApiResponse.of(dictionaryService.get(id));
    }
}
