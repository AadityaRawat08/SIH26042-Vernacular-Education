package com.project.ocr.dto;

import com.project.ocr.OcrDocument;
import com.project.ocr.OcrStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Public view of an {@link OcrDocument}.
 *
 * <p>Deliberately exposes only metadata and extracted text — never the JPA
 * entity and never the uploaded file binary.</p>
 *
 * @param id                  unique OCR record id
 * @param originalFileName    sanitized base file name
 * @param contentType         detected MIME type of the uploaded image
 * @param fileSize            uploaded file size in bytes
 * @param extractedText       text produced by the provider (null when failed)
 * @param detectedLanguageCode optional ISO 639 code of the detected language
 * @param status              outcome (COMPLETED or FAILED)
 * @param provider            provider that handled the image
 * @param createdAt           creation time
 */
public record OcrResponse(
        UUID id,
        String originalFileName,
        String contentType,
        Long fileSize,
        String extractedText,
        String detectedLanguageCode,
        OcrStatus status,
        String provider,
        Instant createdAt) {

    public static OcrResponse from(OcrDocument document) {
        return new OcrResponse(
                document.getId(),
                document.getOriginalFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getExtractedText(),
                document.getDetectedLanguageCode(),
                document.getStatus(),
                document.getProvider(),
                document.getCreatedAt());
    }
}