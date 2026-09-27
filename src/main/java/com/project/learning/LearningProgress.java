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
 * Aggregated vocabulary-learning progress of a {@link User} for one
 * {@link Language} — one row per user + language (enforced by a unique
 * constraint), created on the user's first practice attempt and updated on
 * every subsequent one.
 *
 * <p>Counters are deliberately simple and deterministic: total attempts,
 * correct/incorrect answers and the number of <em>distinct</em> dictionary
 * words practiced (deduplicated by normalized word). There is no streak/XP
 * gamification and no external grading engine — answer correctness is supplied
 * by the client at practice time.</p>
 */
@Entity
@Table(
        name = "learning_progress",
        indexes = {
                @Index(name = "idx_learning_progress_user_id", columnList = "user_id"),
                @Index(name = "idx_learning_progress_last_practiced_at", columnList = "last_practiced_at")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_learning_progress_user_language",
                columnNames = {"user_id", "language_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The learning account this progress belongs to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The language being learned. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "language_id", nullable = false)
    private Language language;

    /** Total practice attempts recorded for this language. */
    @Column(nullable = false)
    private int attempts;

    /** Attempts the client graded as correct. */
    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    /** Attempts the client graded as incorrect. */
    @Column(name = "incorrect_count", nullable = false)
    private int incorrectCount;

    /** Distinct dictionary words practiced at least once (by normalized word). */
    @Column(name = "words_practiced", nullable = false)
    private int wordsPracticed;

    /** Time of the most recent practice attempt for this language. */
    @Column(name = "last_practiced_at", nullable = false)
    private Instant lastPracticedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
