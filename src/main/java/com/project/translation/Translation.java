package com.project.translation;

import com.project.language.Language;
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

import java.time.Instant;
import java.util.UUID;

/**
 * A single text-translation request and its result, owned by a {@link User}.
 *
 * <p>Each record captures the source/target {@link Language}, the original
 * {@link #sourceText}, the produced {@link #translatedText} (when the provider
 * succeeded), the provider that handled it, and the outcome
 * {@link #status}.</p>
 */
@Entity
@Table(
        name = "translations",
        indexes = {
                @Index(name = "idx_translations_user_id", columnList = "user_id"),
                @Index(name = "idx_translations_created_at", columnList = "created_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Translation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The account that requested the translation. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Language the {@link #sourceText} is written in. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_language_id", nullable = false)
    private Language sourceLanguage;

    /** Language the text was translated into. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_language_id", nullable = false)
    private Language targetLanguage;

    /** Original text supplied by the user. */
    @Column(name = "source_text", nullable = false, length = 5000)
    private String sourceText;

    /** Provider output; {@code null} when the translation {@link #status} is FAILED. */
    @Column(name = "translated_text", length = 10000)
    private String translatedText;

    /** Name of the {@code TranslationProvider} that produced the result. */
    @Column(nullable = false, length = 50)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TranslationStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
