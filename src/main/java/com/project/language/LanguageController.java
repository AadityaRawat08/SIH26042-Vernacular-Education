package com.project.language;

import com.project.common.dto.ApiResponse;
import com.project.language.dto.DialectResponse;
import com.project.language.dto.LanguageResponse;
import com.project.language.dto.ScriptResponse;
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
 * Public language discovery endpoints for authenticated users.
 *
 * <p>Requires a valid Bearer token (enforced by {@code SecurityConfig}):
 * authentication gives read access to the language catalogue, while all
 * modifications live in the ADMIN-only {@link AdminLanguageController}.</p>
 */
@RestController
@RequestMapping("/api/languages")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Languages", description = "Language catalogue: languages, dialects and scripts (authenticated)")
public class LanguageController {

    private final LanguageService languageService;
    private final DialectService dialectService;

    /**
     * GET /api/languages — active languages, optional search across name and native name.
     */
    @GetMapping
    @Operation(summary = "List active languages",
            description = "Returns all active languages ordered by name. "
                    + "Optional `search` filters case-insensitively across name and native name "
                    + "(e.g. `hindi`, `தமிழ்`). Inactive languages are never returned.")
    public ApiResponse<List<LanguageResponse>> list(@RequestParam(required = false) String search) {
        return ApiResponse.of(languageService.listActive(search));
    }

    /**
     * GET /api/languages/{id} — a single language by id (active or inactive).
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get a language by id",
            description = "404 when no language with the given id exists.")
    public ApiResponse<LanguageResponse> getById(@PathVariable UUID id) {
        return ApiResponse.of(languageService.getById(id));
    }

    /**
     * GET /api/languages/code/{code} — a single language by its standard code.
     */
    @GetMapping("/code/{code}")
    @Operation(summary = "Get a language by code",
            description = "Looks up by the standard language code (ISO 639), e.g. `hi`. "
                    + "404 when the code is unknown.")
    public ApiResponse<LanguageResponse> getByCode(@PathVariable String code) {
        return ApiResponse.of(languageService.getByCode(code));
    }

    /**
     * GET /api/languages/{languageId}/dialects — dialects of a language.
     */
    @GetMapping("/{languageId}/dialects")
    @Operation(summary = "List dialects of a language",
            description = "Returns the dialects belonging to the language, ordered by name. "
                    + "404 when the language id is unknown.")
    public ApiResponse<List<DialectResponse>> dialects(@PathVariable UUID languageId) {
        return ApiResponse.of(dialectService.listByLanguage(languageId));
    }

    /**
     * GET /api/languages/{languageId}/scripts — scripts supported by a language.
     */
    @GetMapping("/{languageId}/scripts")
    @Operation(summary = "List scripts supported by a language",
            description = "Returns the writing systems linked to the language (e.g. Hindi → Devanagari). "
                    + "404 when the language id is unknown.")
    public ApiResponse<List<ScriptResponse>> scripts(@PathVariable UUID languageId) {
        return ApiResponse.of(languageService.getScripts(languageId));
    }
}