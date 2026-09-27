package com.project.dictionary;

import com.project.common.dto.ApiResponse;
import com.project.dictionary.dto.CreateDictionaryEntryRequest;
import com.project.dictionary.dto.DictionaryEntryResponse;
import com.project.dictionary.dto.UpdateDictionaryEntryRequest;
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
 * ADMIN-only CRUD for dictionary entries.
 *
 * <p>Access is enforced twice &mdash; by {@code SecurityConfig}
 * ({@code /api/admin/** → hasRole(ADMIN)}) and by {@code @PreAuthorize} here.
 * USER accounts receive 403; unauthenticated requests receive 401.</p>
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Dictionary Administration",
        description = "ADMIN-only management of local dictionary entries")
public class AdminDictionaryController {

    private final DictionaryService dictionaryService;

    /** POST /api/admin/dictionary &mdash; creates an entry. */
    @PostMapping("/dictionary")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "[ADMIN] Create a dictionary entry",
            description = "Creates a dictionary entry for an existing, active language "
                    + "(referenced by ISO 639 code). Duplicate language + normalized word "
                    + "combinations are rejected with 422.")
    public ApiResponse<DictionaryEntryResponse> create(@Valid @RequestBody CreateDictionaryEntryRequest request) {
        return ApiResponse.of("Dictionary entry created", dictionaryService.create(request));
    }

    /** PUT /api/admin/dictionary/{id} &mdash; updates an entry. The language is immutable. */
    @PutMapping("/dictionary/{id}")
    @Operation(summary = "[ADMIN] Update a dictionary entry",
            description = "Updates word, pronunciation, definition, part of speech, example "
                    + "sentence and translation. The owning language cannot be changed. "
                    + "422 when the new word collides with an existing entry for the language; "
                    + "404 when the id is unknown.")
    public ApiResponse<DictionaryEntryResponse> update(
            @PathVariable UUID id, @Valid @RequestBody UpdateDictionaryEntryRequest request) {
        return ApiResponse.of("Dictionary entry updated", dictionaryService.update(id, request));
    }

    /** DELETE /api/admin/dictionary/{id} &mdash; deletes an entry. */
    @DeleteMapping("/dictionary/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "[ADMIN] Delete a dictionary entry",
            description = "Deletes the entry. 404 when the id is unknown.")
    public void delete(@PathVariable UUID id) {
        dictionaryService.delete(id);
    }
}
