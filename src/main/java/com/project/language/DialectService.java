package com.project.language;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.dto.CreateDialectRequest;
import com.project.language.dto.DialectResponse;
import com.project.language.dto.UpdateDialectRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Application service managing {@link Dialect} entities.
 *
 * <p>Dialect codes are globally unique; the owning language is fixed at
 * creation and never changes.</p>
 */
@Service
@RequiredArgsConstructor
public class DialectService {

    private final DialectRepository dialectRepository;
    private final LanguageRepository languageRepository;

    /**
     * Creates a dialect under an existing language.
     *
     * @throws ResourceNotFoundException when the language id is unknown
     * @throws BusinessException         when the dialect code already exists
     */
    @Transactional
    public DialectResponse create(UUID languageId, CreateDialectRequest request) {
        Language language = languageRepository.findById(languageId).orElseThrow(
                () -> new ResourceNotFoundException("Language with id " + languageId + " was not found"));
        String code = request.code().trim().toLowerCase(Locale.ROOT);
        if (dialectRepository.existsByCode(code)) {
            throw new BusinessException("A dialect with code '" + code + "' already exists");
        }
        Dialect dialect = Dialect.builder()
                .language(language)
                .name(request.name().trim())
                .nativeName(trimToNull(request.nativeName()))
                .code(code)
                .description(trimToNull(request.description()))
                .region(trimToNull(request.region()))
                .isActive(request.isActive() == null || request.isActive())
                .build();
        // saveAndFlush so the UUID id is generated before the response is built.
        return DialectResponse.from(dialectRepository.saveAndFlush(dialect));
    }

    /**
     * Updates mutable fields of a dialect (code and language are immutable).
     */
    @Transactional
    public DialectResponse update(UUID id, UpdateDialectRequest request) {
        Dialect dialect = getEntity(id);
        dialect.setName(request.name().trim());
        dialect.setNativeName(trimToNull(request.nativeName()));
        dialect.setDescription(trimToNull(request.description()));
        dialect.setRegion(trimToNull(request.region()));
        dialect.setActive(request.isActive());
        return DialectResponse.from(dialectRepository.save(dialect));
    }

    /**
     * Deletes a dialect.
     */
    @Transactional
    public void delete(UUID id) {
        dialectRepository.delete(getEntity(id));
    }

    /**
     * Lists the dialects of a language (404 when the language is unknown).
     */
    @Transactional(readOnly = true)
    public List<DialectResponse> listByLanguage(UUID languageId) {
        if (!languageRepository.existsById(languageId)) {
            throw new ResourceNotFoundException("Language with id " + languageId + " was not found");
        }
        return dialectRepository.findByLanguageIdOrderByNameAsc(languageId).stream()
                .map(DialectResponse::from)
                .toList();
    }

    private Dialect getEntity(UUID id) {
        return dialectRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Dialect with id " + id + " was not found"));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}