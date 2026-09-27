package com.project.ocr;

import com.project.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A single OCR processing attempt, owned by a {@link User}.
 *
 * <p>The uploaded image binary is deliberately <strong>not</strong> stored in
 * PostgreSQL — only its metadata and the extracted text are kept. Uploaded files
 * are processed transiently (read into memory for the duration of the request)
 * to avoid permanent cloud/blob storage for now.</p>
 *
 * <p>{@link #provider} records which {@code OcrProvider} produced the result, so
 * swapping the development provider for a real one later never corrupts history.
 * When {@link #status} is {@link OcrStatus#FAILED}, {@link #extractedText} is
 * {@code null} and {@link #failureReason} carries a short, safe message.</p>
 */
@Entity
@Table(
        name = "ocr_documents",
        indexes = {
                @Index(name = "idx_ocr_documents_user_id", columnList = "user_id"),
                @Index(name = "idx_ocr_documents_created_at", columnList = "created_at"),
                @Index(name = "idx_ocr_documents_status", columnList = "status")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The account that uploaded the image. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Sanitized base file name, e.g. {@code page.png}. */
    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    /** Detected MIME type of the uploaded image. */
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    /** Size of the uploaded file in bytes. */
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    /** Text produced by the provider; {@code null} when the attempt failed. */
    @Column(name = "extracted_text", length = 10000)
    private String extractedText;

    /** Optional ISO 639 code of the detected/declared language of the text. */
    @Column(name = "detected_language_code", length = 16)
    private String detectedLanguageCode;

    /** Outcome of the processing attempt. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OcrStatus status;

    /** Name of the {@code OcrProvider} that handled the image. */
    @Column(nullable = false, length = 50)
    private String provider;

    /** Short, safe reason when the attempt failed; {@code null} on success. */
    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}