package com.project.language;

import com.project.common.dto.ApiResponse;
import com.project.language.dto.CreateDialectRequest;
import com.project.language.dto.CreateLanguageRequest;
import com.project.language.dto.CreateScriptRequest;
import com.project.language.dto.DialectResponse;
import com.project.language.dto.LanguageResponse;
import com.project.language.dto.ScriptResponse;
import com.project.language.dto.UpdateDialectRequest;
import com.project.language.dto.UpdateLanguageRequest;
import com.project.language.dto.UpdateScriptRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * ADMIN-only CRUD for the language catalogue: languages, dialects and scripts.
 *
 * <p>Access is enforced twice — by {@code SecurityConfig}
 * ({@code /api/admin/** → hasRole(ADMIN)}) and by {@code @PreAuthorize} here.
 * USER accounts receive 403; unauthenticated requests receive 401.</p>
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Language Administration",
        description = "ADMIN-only management of languages, dialects and scripts")
public class AdminLanguageController {

    private final LanguageService languageService;
    private final DialectService dialectService;
    private final ScriptService scriptService;

    // --- Languages ----------------------------------------------------------

    /**
     * POST /api/admin/languages — creates a language.
     */
    @PostMapping("/languages")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "[ADMIN] Create a language",
            description = "Creates a language. Codes are unique and stored lower-case; "
                    + "script codes must reference existing scripts.")
    public ApiResponse<LanguageResponse> createLanguage(@Valid @RequestBody CreateLanguageRequest request) {
        return ApiResponse.of("Language created", languageService.create(request));
    }

    /**
     * PUT /api/admin/languages/{id} — updates a language.
     */
    @PutMapping("/languages/{id}")
    @Operation(summary = "[ADMIN] Update a language",
            description = "Updates name, native name, description, active flag and script links. "
                    + "The language code is immutable.")
    public ApiResponse<LanguageResponse> updateLanguage(
            @PathVariable UUID id, @Valid @RequestBody UpdateLanguageRequest request) {
        return ApiResponse.of("Language updated", languageService.update(id, request));
    }

    /**
     * DELETE /api/admin/languages/{id} — deletes a language without dialects.
     */
    @DeleteMapping("/languages/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "[ADMIN] Delete a language",
            description = "Deletes the language. Refused (422) while the language still has dialects; "
                    + "script links are removed with the language.")
    public void deleteLanguage(@PathVariable UUID id) {
        languageService.delete(id);
    }

    // --- Dialects -----------------------------------------------------------

    /**
     * POST /api/admin/languages/{languageId}/dialects — creates a dialect.
     */
    @PostMapping("/languages/{languageId}/dialects")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "[ADMIN] Create a dialect for a language",
            description = "Creates a dialect belonging to the language. Dialect codes are globally unique.")
    public ApiResponse<DialectResponse> createDialect(
            @PathVariable UUID languageId, @Valid @RequestBody CreateDialectRequest request) {
        return ApiResponse.of("Dialect created", dialectService.create(languageId, request));
    }

    /**
     * PUT /api/admin/dialects/{id} — updates a dialect.
     */
    @PutMapping("/dialects/{id}")
    @Operation(summary = "[ADMIN] Update a dialect",
            description = "Updates name, native name, description, region and active flag. "
                    + "The dialect code and owning language are immutable.")
    public ApiResponse<DialectResponse> updateDialect(
            @PathVariable UUID id, @Valid @RequestBody UpdateDialectRequest request) {
        return ApiResponse.of("Dialect updated", dialectService.update(id, request));
    }

    /**
     * DELETE /api/admin/dialects/{id} — deletes a dialect.
     */
    @DeleteMapping("/dialects/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "[ADMIN] Delete a dialect")
    public void deleteDialect(@PathVariable UUID id) {
        dialectService.delete(id);
    }

    // --- Scripts ------------------------------------------------------------

    /**
     * POST /api/admin/scripts — creates a script.
     */
    @PostMapping("/scripts")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "[ADMIN] Create a script",
            description = "Creates a writing system (ISO 15924 code, e.g. Deva). "
                    + "Link it to languages through the language create/update endpoints.")
    public ApiResponse<ScriptResponse> createScript(@Valid @RequestBody CreateScriptRequest request) {
        return ApiResponse.of("Script created", scriptService.create(request));
    }

    /**
     * PUT /api/admin/scripts/{id} — updates a script.
     */
    @PutMapping("/scripts/{id}")
    @Operation(summary = "[ADMIN] Update a script",
            description = "Updates name and description. The ISO 15924 code is immutable.")
    public ApiResponse<ScriptResponse> updateScript(
            @PathVariable UUID id, @Valid @RequestBody UpdateScriptRequest request) {
        return ApiResponse.of("Script updated", scriptService.update(id, request));
    }

    /**
     * DELETE /api/admin/scripts/{id} — deletes an unlinked script.
     */
    @DeleteMapping("/scripts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "[ADMIN] Delete a script",
            description = "Deletes the script. Refused (422) while any language still links to it.")
    public void deleteScript(@PathVariable UUID id) {
        scriptService.delete(id);
    }
}