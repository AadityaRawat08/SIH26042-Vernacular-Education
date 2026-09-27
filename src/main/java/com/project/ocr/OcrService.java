package com.project.ocr;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.ocr.dto.OcrHistoryResponse;
import com.project.ocr.dto.OcrResponse;
import com.project.ocr.dto.OcrTranslateRequest;
import com.project.ocr.provider.OcrProvider;
import com.project.translation.TranslationService;
import com.project.translation.dto.TranslationRequest;
import com.project.translation.dto.TranslationResponse;
import com.project.user.User;
import com.project.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;

/**
 * Application service managing {@link OcrDocument} records.
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>uploads must be non-empty image files (jpeg/png/webp) within the
 *       configured size limit; authenticity is checked on the MIME type, never
 *       on the original file name extension alone</li>
 *   <li>the optional {@code language} parameter must resolve to an existing,
 *       active language (404 unknown, 422 inactive)</li>
 *   <li>OCR is delegated to the {@link OcrProvider} <em>interface</em> — the
 *       service is intentionally not coupled to any concrete engine</li>
 *   <li>a provider failure persists a FAILED record with a safe reason and
 *       surfaces a generic BusinessException — no stack traces reach the
 *       client; the FAILED record is saved (and committed) before the error is
 *       returned so the user's history always records the attempt</li>
 *   <li>every read/delete/translate is scoped to the owning user (IDOR-safe:
 *       a foreign record is indistinguishable from a missing one)</li>
 *   <li>translation of extracted text reuses the existing
 *       {@link TranslationService} — no second translation system is created</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OcrService {

    static final int MAX_PAGE_SIZE = 100;
    private static final String DEFAULT_FILENAME = "upload";

    private final OcrRepository ocrRepository;
    private final UserRepository userRepository;
    private final LanguageRepository languageRepository;
    private final OcrProvider ocrProvider;
    private final OcrProperties ocrProperties;
    private final TranslationService translationService;

    /**
     * Validates and processes an uploaded image through the {@link OcrProvider}.
     *
     * <p>Deliberately not {@code @Transactional}: each repository call owns its
     * transaction, so the FAILED record (or the COMPLETED one) is committed by
     * {@code saveAndFlush} before this method returns or throws — a failure
     * never silently discards the processing attempt.</p>
     */
    public OcrResponse processFile(UUID userId, MultipartFile file, String languageCode) {
        User user = requireUser(userId);
        validateFile(file);
        String detectedLanguage = resolveDeclaredLanguage(languageCode);
        byte[] content = readBytes(file);

        OcrDocument document = OcrDocument.builder()
                .user(user)
                .originalFileName(sanitizeFilename(file.getOriginalFilename()))
                .contentType(normalizeContentType(file.getContentType()))
                .fileSize(file.getSize())
                .detectedLanguageCode(detectedLanguage)
                .status(OcrStatus.COMPLETED)
                .build();

        try {
            OcrProvider.OcrResult result = ocrProvider.extractText(new OcrProvider.OcrInput(
                    document.getOriginalFileName(),
                    document.getContentType(),
                    document.getFileSize(),
                    content));
            document.setExtractedText(result.extractedText());
            if (document.getDetectedLanguageCode() == null && result.detectedLanguageCode() != null) {
                document.setDetectedLanguageCode(result.detectedLanguageCode());
            }
            document.setProvider(ocrProvider.name());
            document.setStatus(OcrStatus.COMPLETED);
            document.setFailureReason(null);
        } catch (RuntimeException ex) {
            log.error("OCR provider failed for user {} (file '{}')", userId, document.getOriginalFileName(), ex);
            document.setExtractedText(null);
            document.setProvider(ocrProvider.name());
            document.setStatus(OcrStatus.FAILED);
            document.setFailureReason("OCR provider '" + ocrProvider.name() + "' failed");
            // The FAILED record is committed here (no enclosing transaction), so
            // the user's history keeps the attempt even though the error is surfaced.
            ocrRepository.saveAndFlush(document);
            throw new BusinessException("OCR processing failed for '" + document.getOriginalFileName() + "'");
        }

        // saveAndFlush so the UUID id / timestamps are populated before mapping.
        return OcrResponse.from(ocrRepository.saveAndFlush(document));
    }

    /**
     * Returns the authenticated user's OCR history, newest first.
     */
    @Transactional(readOnly = true)
    public OcrHistoryResponse history(UUID userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return OcrHistoryResponse.from(ocrRepository.findByUserId(userId, pageable));
    }

    /**
     * Returns a single OCR record, scoped to the owning user.
     *
     * @throws ResourceNotFoundException when missing or owned by another user (404)
     */
    @Transactional(readOnly = true)
    public OcrResponse get(UUID userId, UUID ocrId) {
        return OcrResponse.from(findOwned(ocrId, userId));
    }

    /**
     * Deletes an OCR record, scoped to the owning user.
     *
     * @throws ResourceNotFoundException when missing or owned by another user (404)
     */
    @Transactional
    public void delete(UUID userId, UUID ocrId) {
        ocrRepository.delete(findOwned(ocrId, userId));
    }

    /**
     * Translates the extracted text of a COMPLETED OCR record.
     *
     * <p>Delegates to the existing {@link TranslationService} so the translation
     * is persisted through the established {@code Translation} architecture and
     * inherits its language validation and ownership handling.</p>
     *
     * @throws ResourceNotFoundException when the record is missing or owned by
     *                                   another user (404)
     * @throws BusinessException         when the record is not COMPLETED, its text
     *                                   is blank, or no source language could be determined
     */
    @Transactional
    public TranslationResponse translate(UUID userId, UUID ocrId, OcrTranslateRequest request) {
        OcrDocument document = findOwned(ocrId, userId);
        if (document.getStatus() != OcrStatus.COMPLETED) {
            throw new BusinessException("OCR document is not completed and cannot be translated");
        }
        if (document.getExtractedText() == null || document.getExtractedText().isBlank()) {
            throw new BusinessException("OCR extracted text is blank and cannot be translated");
        }
        String sourceLanguage = resolveSourceLanguage(document, request.sourceLanguage());
        return translationService.translate(userId,
                new TranslationRequest(sourceLanguage, request.targetLanguage(), document.getExtractedText().trim()));
    }
/**
     * Loads an OCR record while enforcing ownership.
     *
     * <p>Ownership violations are reported the same way as a missing record (404)
     * so callers can never probe whether an OCR id exists.</p>
     */
    private OcrDocument findOwned(UUID ocrId, UUID userId) {
        OcrDocument document = ocrRepository.findById(ocrId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "OCR document with id " + ocrId + " was not found"));
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException(
                    "OCR document with id " + ocrId + " was not found");
        }
        return document;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + userId + " was not found"));
    }

    private void validateFile(MultipartFile file) {
        if (file == null) {
            throw new BusinessException("file must not be null");
        }
        if (file.isEmpty()) {
            throw new BusinessException("file must not be empty");
        }
        String contentType = normalizeContentType(file.getContentType());
        if (!ocrProperties.isSupportedContentType(contentType)) {
            throw new BusinessException("Unsupported file type '"
                    + (contentType == null || contentType.isBlank() ? "unknown" : contentType)
                    + "'; allowed types: " + String.join(", ", ocrProperties.allowedContentTypes()));
        }
        if (file.getSize() > ocrProperties.maxFileSize().toBytes()) {
            throw new BusinessException("File exceeds the maximum allowed size of " + ocrProperties.maxFileSize());
        }
    }

    /**
     * Resolves the optional declared language of the OCR text.
     *
     * @return the normalized language code, or {@code null} when not supplied
     * @throws ResourceNotFoundException when the code is unknown (404)
     * @throws BusinessException         when the language is inactive (422)
     */
    private String resolveDeclaredLanguage(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            return null;
        }
        String normalized = languageCode.trim().toLowerCase(Locale.ROOT);
        Language language = languageRepository.findByCode(normalized)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language with code '" + languageCode + "' was not found"));
        if (!language.isActive()) {
            throw new BusinessException("Language '" + language.getName() + "' is inactive");
        }
        return language.getCode();
    }

    /** Uses the detected language when available, falling back to the request's sourceLanguage. */
    private String resolveSourceLanguage(OcrDocument document, String requestedSource) {
        if (document.getDetectedLanguageCode() != null && !document.getDetectedLanguageCode().isBlank()) {
            return document.getDetectedLanguageCode();
        }
        if (requestedSource != null && !requestedSource.isBlank()) {
            return requestedSource.trim().toLowerCase(Locale.ROOT);
        }
        throw new BusinessException("sourceLanguage is required when no language was detected for the OCR record");
    }

    private byte[] readBytes(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readAllBytes();
        } catch (IOException ex) {
            throw new BusinessException("Failed to read the uploaded file");
        }
    }

    /** Normalizes a MIME type: lower-cases and strips parameters (e.g. {@code ; charset=...}). */
    private String normalizeContentType(String raw) {
        if (raw == null) {
            return null;
        }
        String contentType = raw.toLowerCase(Locale.ROOT);
        int semicolon = contentType.indexOf(';');
        return (semicolon >= 0 ? contentType.substring(0, semicolon) : contentType).trim();
    }

    /** Strips any client-supplied path so only the base file name is stored. */
    private String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) {
            return DEFAULT_FILENAME;
        }
        String cleaned = name.replace('\\', '/');
        int slash = cleaned.lastIndexOf('/');
        String base = slash >= 0 ? cleaned.substring(slash + 1) : cleaned;
        return base.isBlank() ? DEFAULT_FILENAME : base;
    }
}