package com.project.dictionary;

import com.project.language.Language;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
 * A single dictionary entry owned by a {@link Language}.
 *
 * <p><strong>Normalization:</strong> {@link #normalizedWord} is a stored copy of
 * {@link #word} that is trimmed, lower-cased and whitespace-collapsed. It is the
 * canonical basis for case-insensitive search and for duplicate detection
 * (the unique constraint below guarantees one canonical entry per
 * language + word, regardless of input casing or surrounding whitespace).</p>
 *
 * <p>This is a <em>local</em> development dictionary: data is seeded by
 * {@code DictionaryDataInitializer} and managed through the ADMIN APIs. It is
 * intentionally not exhaustive and is never populated from an external provider.</p>
 */
@Entity
@Table(
        name = "dictionary_entries",
        indexes = {
                @Index(name = "idx_dictionary_language_id", columnList = "language_id"),
                @Index(name = "idx_dictionary_normalized_word", columnList = "normalized_word")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_dictionary_language_normalized_word",
                columnNames = {"language_id", "normalized_word"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DictionaryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The language this entry belongs to (never duplicated per word within a language). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "language_id", nullable = false)
    private Language language;

    /** The dictionary word as entered, e.g. {@code नमस्ते} or {@code Namaste}. */
    @Column(nullable = false, length = 200)
    private String word;

    /**
     * Trimmed, lower-cased, whitespace-collapsed copy of {@link #word}.
     * Drives case-insensitive search and the per-language uniqueness rule.
     */
    @Column(name = "normalized_word", nullable = false, length = 200)
    private String normalizedWord;

    /** Optional IPA/pronunciation, e.g. {@code /nʌməste/}. */
    @Column(length = 200)
    private String pronunciation;

    /** Meaning of the entry; the human-facing gloss. */
    @Column(nullable = false, length = 2000)
    private String definition;

    /** Grammatical category, e.g. {@code noun}, {@code interjection}. May be null. */
    @Column(name = "part_of_speech", length = 50)
    private String partOfSpeech;

    /** Optional illustrative sentence using the word. */
    @Column(name = "example_sentence", length = 1000)
    private String exampleSentence;

    /** Free-text translation/meaning of the word (e.g. English gloss). May be null. */
    @Column(length = 1000)
    private String translation;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
