package com.project.speech;

import com.project.common.exception.BusinessException;
import com.project.common.exception.ResourceNotFoundException;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.speech.dto.SpeechHistoryResponse;
import com.project.speech.dto.SpeechResponse;
import com.project.speech.dto.SpeechSynthesisRequest;
import com.project.speech.dto.SpeechTranslateRequest;
import com.project.speech.provider.SpeechProvider;
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
 * Application service managing {@link SpeechDocument} records.
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>transcription uploads must be non-empty audio files within the
 *       configured size limit; authenticity is checked on the MIME type, never
 *       on the original file name extension alone</li>
 *   <li>language codes must resolve to existing, active languages (404
 *       unknown, 422 inactive); optional for transcription, required for
 *       synthesis</li>
 *   <li>speech processing is delegated to the {@link SpeechProvider}
 *       <em>interface</em> — never coupled to a concrete engine</li>
 *   <li>a provider failure persists a FAILED record with a safe reason and
 *       surfaces a generic BusinessException — no stack traces reach the
 *       client; the FAILED record is committed before the error is returned so
 *       the user's history always records the attempt</li>
 *   <li>every read/delete/translate is scoped to the owning user (IDOR-safe:
 *       a foreign record is indistinguishable from a missing one)</li>
 *   <li>translation of transcribed text reuses the existing
 *       {@link TranslationService} — no second translation system is created</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpeechService {

    static final int MAX_PAGE_SIZE = 100;
    private static final String DEFAULT_FILENAME = "audio";

    private final SpeechRepository speechRepository;
    private final UserRepository userRepository;
    private final LanguageRepository languageRepository;
    private final SpeechProvider speechProvider;
    private final SpeechProperties speechProperties;
    private final TranslationService translationService;


    /**
     * Validates and transcribes an uploaded audio file through the
     * {@link SpeechProvider}.
     *
     * <p>Deliberately not {@code @Transactional}: each repository call owns its
     * transaction, so the FAILED record (or the COMPLETED one) is committed by
     * {@code saveAndFlush} before this method returns or throws — a failure
     * never silently discards the processing attempt.</p>
     */
    public SpeechResponse transcribe(UUID userId, MultipartFile file, String languageCode) {
        User user = requireUser(userId);
        validateAudioFile(file);
        String language = resolveOptionalLanguage(languageCode);
        byte[] content = readBytes(file);

        SpeechDocument document = SpeechDocument.builder()
                .user(user)
                .operation(SpeechOperation.SPEECH_TO_TEXT)
                .originalFileName(sanitizeFilename(file.getOriginalFilename()))
                .contentType(normalizeContentType(file.getContentType()))
                .fileSize(file.getSize())
                .languageCode(language)
                .status(SpeechStatus.COMPLETED)
                .build();

        try {
            SpeechProvider.SpeechToTextResult result = speechProvider.transcribe(
                    new SpeechProvider.SpeechInput(
                            document.getOriginalFileName(),
                            document.getContentType(),
                            document.getFileSize(),
                            content,
                            document.getLanguageCode()));
            document.setOutputText(result.transcribedText());
            if (document.getLanguageCode() == null && result.detectedLanguageCode() != null) {
                document.setLanguageCode(result.detectedLanguageCode());
            }
            document.setProvider(speechProvider.name());
            document.setStatus(SpeechStatus.COMPLETED);
            document.setFailureReason(null);
        } catch (RuntimeException ex) {
            log.error("Speech provider failed for user {} (file '{}')",
                    userId, document.getOriginalFileName(), ex);
            document.setOutputText(null);
            document.setProvider(speechProvider.name());
            document.setStatus(SpeechStatus.FAILED);
            document.setFailureReason("Speech provider '" + speechProvider.name() + "' failed");
            // The FAILED record is committed here (no enclosing transaction), so
            // the user's history keeps the attempt even though the error is surfaced.
            speechRepository.saveAndFlush(document);
            throw new BusinessException(
                    "Speech-to-text processing failed for '" + document.getOriginalFileName() + "'");
        }

        // saveAndFlush so the UUID id / timestamps are populated before mapping.
        return SpeechResponse.from(speechRepository.saveAndFlush(document));
    }

    /**
     * Validates and synthesizes speech for the given text through the
     * {@link SpeechProvider}.
     *
     * <p>Like {@link #transcribe}, deliberately not {@code @Transactional} so a
     * provider failure still commits the FAILED record before the error is
     * surfaced. The provider returns audio <em>metadata</em> only — no audio
     * binary is produced or persisted at this stage.</p>
     */
    public SpeechResponse synthesize(UUID userId, SpeechSynthesisRequest request) {
        User user = requireUser(userId);
        if (request.text() == null || request.text().isBlank()) {
            throw new BusinessException("text must not be blank");
        }
        String language = resolveRequiredLanguage(request.language());
        String text = request.text().trim();

        SpeechDocument document = SpeechDocument.builder()
                .user(user)
                .operation(SpeechOperation.TEXT_TO_SPEECH)
                .inputText(text)
                .languageCode(language)
                .status(SpeechStatus.COMPLETED)
                .build();

        try {
            SpeechProvider.TextToSpeechResult result = speechProvider.synthesize(
                    new SpeechProvider.SynthesisInput(text, language));
            document.setOutputText(result.description());
            document.setContentType(result.audioContentType());
            document.setFileSize(result.audioByteLength());
            document.setProvider(speechProvider.name());
            document.setStatus(SpeechStatus.COMPLETED);
            document.setFailureReason(null);
        } catch (RuntimeException ex) {
            log.error("Speech provider failed for user {} (synthesis, {} characters)",
                    userId, text.length(), ex);
            document.setOutputText(null);
            document.setContentType(null);
            document.setFileSize(null);
            document.setProvider(speechProvider.name());
            document.setStatus(SpeechStatus.FAILED);
            document.setFailureReason("Speech provider '" + speechProvider.name() + "' failed");
            speechRepository.saveAndFlush(document);
            throw new BusinessException("Text-to-speech processing failed");
        }

        return SpeechResponse.from(speechRepository.saveAndFlush(document));
    }


    /**
     * Synthesizes speech and returns the audio binary, so the caller can play a
     * real Text-to-Speech result.
     *
     * <p>Same validation and history rules as {@link #synthesize(UUID, SpeechSynthesisRequest)}:
     * the attempt is recorded on the user's speech history, a provider failure is
     * persisted as FAILED and surfaced as a {@link BusinessException} (never a
     * 500), and a provider that cannot return audio is reported the same way.</p>
     *
     * @param userId  id of the authenticated user (JWT subject)
     * @param request synthesis request
     * @return the synthesized audio and its content type
     */
    public AudioSynthesisResult synthesizeAudio(UUID userId, SpeechSynthesisRequest request) {
        User user = requireUser(userId);
        if (request.text() == null || request.text().isBlank()) {
            throw new BusinessException("text must not be blank");
        }
        String language = resolveRequiredLanguage(request.language());
        String text = request.text().trim();

        SpeechDocument document = SpeechDocument.builder()
                .user(user)
                .operation(SpeechOperation.TEXT_TO_SPEECH)
                .inputText(text)
                .languageCode(language)
                .status(SpeechStatus.COMPLETED)
                .build();

        SpeechProvider.TextToSpeechAudio audio;
        try {
            audio = speechProvider.synthesizeAudio(new SpeechProvider.SynthesisInput(text, language));
            document.setOutputText("Synthesized audio for " + text.length() + " characters");
            document.setContentType(audio.audioContentType());
            document.setFileSize((long) audio.content().length);
            document.setProvider(speechProvider.name());
            document.setStatus(SpeechStatus.COMPLETED);
            document.setFailureReason(null);
        } catch (RuntimeException ex) {
            log.error("Speech provider failed for user {} (audio synthesis, {} characters)",
                    userId, text.length(), ex);
            document.setOutputText(null);
            document.setContentType(null);
            document.setFileSize(null);
            document.setProvider(speechProvider.name());
            document.setStatus(SpeechStatus.FAILED);
            document.setFailureReason("Speech provider '" + speechProvider.name() + "' failed");
            // Committed before the error is surfaced so the attempt stays in history.
            speechRepository.saveAndFlush(document);
            throw new BusinessException("Text-to-speech processing failed");
        }

        // The attempt is recorded even though the binary itself is not persisted.
        speechRepository.saveAndFlush(document);
        return new AudioSynthesisResult(audio.audioContentType(), audio.content());
    }

    /** Synthesized audio plus its content type, returned to the controller. */
    public record AudioSynthesisResult(String contentType, byte[] content) {
    }


    /**
     * Returns the authenticated user's speech history, newest first.
     */
    @Transactional(readOnly = true)
    public SpeechHistoryResponse history(UUID userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return SpeechHistoryResponse.from(speechRepository.findByUserId(userId, pageable));
    }

    /**
     * Returns a single speech record, scoped to the owning user.
     *
     * @throws ResourceNotFoundException when missing or owned by another user (404)
     */
    @Transactional(readOnly = true)
    public SpeechResponse get(UUID userId, UUID speechId) {
        return SpeechResponse.from(findOwned(speechId, userId));
    }

    /**
     * Deletes a speech record, scoped to the owning user.
     *
     * @throws ResourceNotFoundException when missing or owned by another user (404)
     */
    @Transactional
    public void delete(UUID userId, UUID speechId) {
        speechRepository.delete(findOwned(speechId, userId));
    }

    /**
     * Translates the transcribed text of a COMPLETED speech-to-text record.
     *
     * <p>Delegates to the existing {@link TranslationService} so the translation
     * is persisted through the established {@code Translation} architecture and
     * inherits its language validation and ownership handling.</p>
     *
     * @throws ResourceNotFoundException when the record is missing or owned by
     *                                   another user (404)
     * @throws BusinessException         when the record is not a COMPLETED
     *                                   speech-to-text record, its transcribed
     *                                   text is blank, or no source language
     *                                   could be determined
     */
    @Transactional
    public TranslationResponse translate(UUID userId, UUID speechId, SpeechTranslateRequest request) {
        SpeechDocument document = findOwned(speechId, userId);
        if (document.getOperation() != SpeechOperation.SPEECH_TO_TEXT) {
            throw new BusinessException("Only speech-to-text records can be translated");
        }
        if (document.getStatus() != SpeechStatus.COMPLETED) {
            throw new BusinessException("Speech record is not completed and cannot be translated");
        }
        if (document.getOutputText() == null || document.getOutputText().isBlank()) {
            throw new BusinessException("Speech transcribed text is blank and cannot be translated");
        }
        String sourceLanguage = resolveSourceLanguage(document, request.sourceLanguage());
        return translationService.translate(userId,
                new TranslationRequest(sourceLanguage, request.targetLanguage(),
                        document.getOutputText().trim()));
    }


    /**
     * Loads a speech record while enforcing ownership.
     *
     * <p>Ownership violations are reported the same way as a missing record (404)
     * so callers can never probe whether a speech id exists.</p>
     */
    private SpeechDocument findOwned(UUID speechId, UUID userId) {
        SpeechDocument document = speechRepository.findById(speechId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Speech document with id " + speechId + " was not found"));
        if (!document.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException(
                    "Speech document with id " + speechId + " was not found");
        }
        return document;
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + userId + " was not found"));
    }

    private void validateAudioFile(MultipartFile file) {
        if (file == null) {
            throw new BusinessException("file must not be null");
        }
        if (file.isEmpty()) {
            throw new BusinessException("file must not be empty");
        }
        String contentType = normalizeContentType(file.getContentType());
        if (!speechProperties.isSupportedContentType(contentType)) {
            throw new BusinessException("Unsupported file type '"
                    + (contentType == null || contentType.isBlank() ? "unknown" : contentType)
                    + "'; allowed types: " + String.join(", ", speechProperties.allowedContentTypes()));
        }
        if (file.getSize() > speechProperties.maxFileSize().toBytes()) {
            throw new BusinessException("File exceeds the maximum allowed size of " + speechProperties.maxFileSize());
        }
    }

    /**
     * Resolves the optional declared language of the speech content.
     *
     * @return the normalized language code, or {@code null} when not supplied
     * @throws ResourceNotFoundException when the code is unknown (404)
     * @throws BusinessException         when the language is inactive (422)
     */
    private String resolveOptionalLanguage(String languageCode) {
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

    /** Resolves a mandatory language (synthesis); blank input is a 422. */
    private String resolveRequiredLanguage(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            throw new BusinessException("language must not be blank");
        }
        return resolveOptionalLanguage(languageCode);
    }

    /** Uses the record's language when available, falling back to the request's sourceLanguage. */
    private String resolveSourceLanguage(SpeechDocument document, String requestedSource) {
        if (document.getLanguageCode() != null && !document.getLanguageCode().isBlank()) {
            return document.getLanguageCode();
        }
        if (requestedSource != null && !requestedSource.isBlank()) {
            return requestedSource.trim().toLowerCase(Locale.ROOT);
        }
        throw new BusinessException("sourceLanguage is required when no language was detected for the speech record");
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
