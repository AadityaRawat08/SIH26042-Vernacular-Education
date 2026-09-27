package com.project.speech;

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
 * A single speech processing attempt (history entry), owned by a {@link User}.
 *
 * <p>Two operations are supported by the {@code SpeechProvider} abstraction:</p>
 * <ul>
 *   <li>{@link SpeechOperation#SPEECH_TO_TEXT} — an uploaded audio file is
 *       transcribed; {@link #originalFileName}/{@link #contentType}/
 *       {@link #fileSize} describe the upload and {@link #outputText} holds the
 *       transcription.</li>
 *   <li>{@link SpeechOperation#TEXT_TO_SPEECH} — {@link #inputText} is
 *       synthesized; {@link #outputText} carries the provider's deterministic
 *       output description and {@link #contentType}/{@link #fileSize} describe
 *       the audio that would be produced. The audio binary itself is
 *       deliberately <strong>not</strong> persisted — no blob storage exists
 *       yet, so no fake downloadable audio is pretended.</li>
 * </ul>
 *
 * <p>{@link #provider} records which {@code SpeechProvider} handled the request,
 * so swapping the development provider for a real AI/STT/TTS engine later never
 * corrupts history. When {@link #status} is {@link SpeechStatus#FAILED},
 * {@link #outputText} is {@code null} and {@link #failureReason} carries a
 * short, safe message.</p>
 */
@Entity
@Table(
        name = "speech_documents",
        indexes = {
                @Index(name = "idx_speech_documents_user_id", columnList = "user_id"),
                @Index(name = "idx_speech_documents_created_at", columnList = "created_at"),
                @Index(name = "idx_speech_documents_status", columnList = "status")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeechDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The account that performed the speech operation. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Whether this record is a transcription or a synthesis. */
    @Enumerated(EnumType.STRING)
    @Column(name = "operation", nullable = false, length = 20)
    private SpeechOperation operation;

    /** Sanitized base name of the uploaded audio file (STT only). */
    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    /**
     * Audio MIME type: the detected upload type for STT, or the output audio
     * format reported by the provider for TTS.
     */
    @Column(name = "content_type", length = 100)
    private String contentType;

    /** Size in bytes: of the upload (STT) or of the produced audio (TTS). */
    @Column(name = "file_size")
    private Long fileSize;

    /** Text supplied for synthesis (TTS only). */
    @Column(name = "input_text", length = 5000)
    private String inputText;

    /**
     * Provider output: the transcribed text for STT, or a short deterministic
     * output description for TTS; {@code null} when the attempt failed.
     */
    @Column(name = "output_text", length = 10000)
    private String outputText;

    /** ISO 639 code of the declared/detected language of the speech content. */
    @Column(name = "language_code", length = 16)
    private String languageCode;

    /** Outcome of the processing attempt. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SpeechStatus status;

    /** Name of the {@code SpeechProvider} that handled the request. */
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
