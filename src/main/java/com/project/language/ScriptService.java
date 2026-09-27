package com.project.language;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.dto.CreateScriptRequest;
import com.project.language.dto.ScriptResponse;
import com.project.language.dto.UpdateScriptRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Application service managing the global {@link Script} registry.
 *
 * <p>Scripts linked to at least one language cannot be deleted; detach them
 * from the languages first.</p>
 */
@Service
@RequiredArgsConstructor
public class ScriptService {

    private final ScriptRepository scriptRepository;
    private final LanguageRepository languageRepository;

    /**
     * Creates a new script.
     *
     * @throws BusinessException when the ISO 15924 code already exists
     */
    @Transactional
    public ScriptResponse create(CreateScriptRequest request) {
        String code = normalizeScriptCode(request.code());
        if (scriptRepository.existsByCode(code)) {
            throw new BusinessException("A script with code '" + code + "' already exists");
        }
        Script script = Script.builder()
                .name(request.name().trim())
                .code(code)
                .description(trimToNull(request.description()))
                .build();
        // saveAndFlush so the UUID id is generated before the response is built.
        return ScriptResponse.from(scriptRepository.saveAndFlush(script));
    }

    /**
     * Returns all scripts ordered by name.
     */
    @Transactional(readOnly = true)
    public List<ScriptResponse> list() {
        return scriptRepository.findAll().stream()
                .map(ScriptResponse::from)
                .toList();
    }

    /**
     * Updates mutable fields of a script (code is immutable).
     */
    @Transactional
    public ScriptResponse update(UUID id, UpdateScriptRequest request) {
        Script script = getEntity(id);
        script.setName(request.name().trim());
        script.setDescription(trimToNull(request.description()));
        return ScriptResponse.from(scriptRepository.save(script));
    }

    /**
     * Deletes a script that is not linked to any language.
     *
     * @throws BusinessException when at least one language still references it
     */
    @Transactional
    public void delete(UUID id) {
        Script script = getEntity(id);
        if (languageRepository.existsByScripts_Id(id)) {
            throw new BusinessException("Script '" + script.getName()
                    + "' is still linked to languages; detach it first");
        }
        scriptRepository.delete(script);
    }

    private Script getEntity(UUID id) {
        return scriptRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Script with id " + id + " was not found"));
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