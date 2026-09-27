package com.project.language;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.dto.CreateLanguageRequest;
import com.project.language.dto.LanguageResponse;
import com.project.language.dto.ScriptResponse;
import com.project.language.dto.UpdateLanguageRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Application service managing {@link Language} entities and their script links.
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>language codes are unique (422 on duplicates) and lower-cased</li>
 *   <li>unknown ids/codes → {@link ResourceNotFoundException} (404)</li>
 *   <li>languages that still have dialects cannot be deleted (422)</li>
 *   <li>script links must reference existing scripts (404 otherwise)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class LanguageService {

    private final LanguageRepository languageRepository;
    private final DialectRepository dialectRepository;
    private final ScriptRepository scriptRepository;

    /**
     * Creates a new language, optionally linking existing scripts by code.
     */
    @Transactional
    public LanguageResponse create(CreateLanguageRequest request) {
        String code = normalizeLanguageCode(request.code());
        if (languageRepository.existsByCode(code)) {
            throw new BusinessException("A language with code '" + code + "' already exists");
        }
        Language language = Language.builder()
                .name(request.name().trim())
                .nativeName(request.nativeName().trim())
                .code(code)
                .description(trimToNull(request.description()))
                .isActive(request.isActive() == null || request.isActive())
                .build();
        if (request.scriptCodes() != null) {
            language.getScripts().addAll(resolveScripts(request.scriptCodes()));
        }
        // saveAndFlush so the UUID id is generated before the response is built.
        return LanguageResponse.from(languageRepository.saveAndFlush(language));
    }

    /**
     * Updates mutable fields of a language. The code is immutable; script codes
     * replace the current links when provided.
     */
    @Transactional
    public LanguageResponse update(UUID id, UpdateLanguageRequest request) {
        Language language = getEntity(id);
        language.setName(request.name().trim());
        language.setNativeName(request.nativeName().trim());
        language.setDescription(trimToNull(request.description()));
        language.setActive(request.isActive());
        if (request.scriptCodes() != null) {
            language.getScripts().clear();
            language.getScripts().addAll(resolveScripts(request.scriptCodes()));
        }
        return LanguageResponse.from(languageRepository.save(language));
    }

    /**
     * Deletes a language. Deletion is refused while dialects still reference it.
     */
    @Transactional
    public void delete(UUID id) {
        Language language = getEntity(id);
        if (dialectRepository.existsByLanguageId(id)) {
            throw new BusinessException("Language '" + language.getName()
                    + "' still has dialects; delete them first");
        }
        languageRepository.delete(language);
    }

    /**
     * Loads a language by id (active or inactive).
     *
     * @throws ResourceNotFoundException when the id is unknown
     */
    @Transactional(readOnly = true)
    public LanguageResponse getById(UUID id) {
        return LanguageResponse.from(getEntity(id));
    }

    /**
     * Loads a language by its standard code.
     *
     * @throws ResourceNotFoundException when the code is unknown
     */
    @Transactional(readOnly = true)
    public LanguageResponse getByCode(String code) {
        return languageRepository.findByCode(normalizeLanguageCode(code))
                .map(LanguageResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language with code '" + code + "' was not found"));
    }

    /**
     * Lists active languages, optionally filtered by a case-insensitive fragment
     * of name or native name.
     *
     * @param search optional search text; blank returns all active languages
     */
    @Transactional(readOnly = true)
    public List<LanguageResponse> listActive(String search) {
        String query = search == null ? "" : search.trim();
        List<Language> languages = query.isEmpty()
                ? languageRepository.findAllByIsActiveTrueOrderByNameAsc()
                : languageRepository.searchActive(query);
        return languages.stream().map(LanguageResponse::from).toList();
    }

    /**
     * Lists the scripts supported by a language (404 when unknown).
     */
    @Transactional(readOnly = true)
    public List<ScriptResponse> getScripts(UUID languageId) {
        Language language = getEntity(languageId);
        return language.getScripts().stream()
                .map(ScriptResponse::from)
                .toList();
    }

    private Language getEntity(UUID id) {
        return languageRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Language with id " + id + " was not found"));
    }

    private Set<Script> resolveScripts(Set<String> scriptCodes) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String raw : scriptCodes) {
            if (raw != null && !raw.isBlank()) {
                normalized.add(normalizeScriptCode(raw));
            }
        }
        if (normalized.isEmpty()) {
            return Set.of();
        }
        Set<Script> scripts = new LinkedHashSet<>();
        for (String code : normalized) {
            scripts.add(scriptRepository.findByCode(code).orElseThrow(
                    () -> new ResourceNotFoundException("Script with code '" + code + "' was not found")));
        }
        return scripts;
    }

    private String normalizeLanguageCode(String code) {
        return code == null ? null : code.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeScriptCode(String code) {
        String trimmed = code.trim();
        return Character.toUpperCase(trimmed.charAt(0))
                + trimmed.substring(1).toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}