package com.project.speech.dto;

import com.project.speech.SpeechDocument;
import com.project.speech.SpeechOperation;
import com.project.speech.SpeechStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of a {@link SpeechDocument}.
 *
 * <p>Deliberately exposes only metadata and text — never the JPA entity, never
 * the uploaded audio binary, and never the internal failure reason.</p>
 *
 * @param id               unique speech record id
 * @param operation        SPEECH_TO_TEXT or TEXT_TO_SPEECH
 * @param originalFileName sanitized base name of the uploaded audio (STT only)
 * @param contentType      upload MIME type (STT) or output audio format (TTS)
 * @param fileSize         upload size in bytes (STT) or produced audio size (TTS)
 * @param inputText        text supplied for synthesis (TTS only)
 * @param outputText       transcribed text (STT) or output description (TTS);
 *                         null when the attempt failed
 * @param languageCode     ISO 639 code of the declared/detected language
 * @param status           outcome (COMPLETED or FAILED)
 * @param provider         provider that handled the request
 * @param createdAt        creation time
 */
public record SpeechResponse(
        UUID id,
        SpeechOperation operation,
        String originalFileName,
        String contentType,
        Long fileSize,
        String inputText,
        String outputText,
        String languageCode,
        SpeechStatus status,
        String provider,
        Instant createdAt) {

    public static SpeechResponse from(SpeechDocument document) {
        return new SpeechResponse(
                document.getId(),
                document.getOperation(),
                document.getOriginalFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getInputText(),
                document.getOutputText(),
                document.getLanguageCode(),
                document.getStatus(),
                document.getProvider(),
                document.getCreatedAt());
    }
}
