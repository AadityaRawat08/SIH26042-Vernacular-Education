package com.project.learning;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Data access for {@link LearningPracticeRecord} rows.
 *
 * <p>History queries are executed server-side with pagination — the full
 * practice history is never loaded into memory.</p>
 */
public interface LearningPracticeRecordRepository extends JpaRepository<LearningPracticeRecord, UUID> {

    /**
     * The user's practice attempts, ordered by the caller's {@link Pageable}
     * (production callers sort by {@code createdAt} descending).
     */
    Page<LearningPracticeRecord> findByUserId(UUID userId, Pageable pageable);

    /**
     * True when the user has already practiced this exact normalized word for
     * the language — used to keep the distinct {@code wordsPracticed} counter
     * accurate. Must be checked <em>before</em> the new record is persisted.
     */
    boolean existsByUserIdAndLanguage_IdAndNormalizedWord(UUID userId, UUID languageId, String normalizedWord);

    /** Deletes every practice record of the user for the language (progress reset). */
    void deleteByUserIdAndLanguage_Id(UUID userId, UUID languageId);
}
