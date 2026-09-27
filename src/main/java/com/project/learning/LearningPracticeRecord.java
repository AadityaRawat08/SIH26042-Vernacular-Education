package com.project.learning;

import com.project.language.Language;
import com.project.user.User;
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
 * A single vocabulary practice attempt by a {@link User}.
 *
 * <p>Every attempt appends one immutable row — history is never rewritten; the
 * aggregated view lives in {@link LearningProgress}. The practiced word must
 * resolve to a {@code DictionaryEntry} of the same language, and
 * {@link #normalizedWord} stores the dictionary's canonical (trimmed,
 * lower-cased, whitespace-collapsed) form so distinct-word counting and future
 * analytics are case-insensitive by construction.</p>
 */
@Entity
@Table(
        name = "learning_practice_records",
        indexes = {
                @Index(name = "idx_learning_records_user_id", columnList = "user_id"),
                @Index(name = "idx_learning_records_language_id", columnList = "language_id"),
                @Index(name = "idx_learning_records_created_at", columnList = "created_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningPracticeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The account that practiced the word. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The language of the practiced word. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "language_id", nullable = false)
    private Language language;

    /** The dictionary word as stored canonically, e.g. {@code पानी}. */
    @Column(nullable = false, length = 200)
    private String word;

    /** Trimmed, lower-cased, whitespace-collapsed copy of {@link #word}. */
    @Column(name = "normalized_word", nullable = false, length = 200)
    private String normalizedWord;

    /** Whether the client graded the attempt as correct. */
    @Column(nullable = false)
    private boolean correct;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
