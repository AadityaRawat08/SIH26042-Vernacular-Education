package com.project.learning;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data access for {@link LearningProgress} aggregates.
 *
 * <p>One row exists per user + language (enforced by a unique constraint), so
 * all lookups are cheap indexed reads — progress is never recomputed by
 * scanning practice history.</p>
 */
public interface LearningProgressRepository extends JpaRepository<LearningProgress, UUID> {

    /** The user's progress row for a language, if any. */
    Optional<LearningProgress> findByUserIdAndLanguage_Id(UUID userId, UUID languageId);

    /** The user's progress row for a language code, if any. */
    Optional<LearningProgress> findByUserIdAndLanguage_Code(UUID userId, String languageCode);

    /** All of the user's progress rows, most recently practiced first. */
    List<LearningProgress> findByUserIdOrderByLastPracticedAtDesc(UUID userId);
}
