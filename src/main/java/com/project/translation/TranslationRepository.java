package com.project.translation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Data access for {@link Translation} records.
 */
public interface TranslationRepository extends JpaRepository<Translation, UUID> {

    /**
     * Returns the given user's translations, ordered by the caller's
     * {@code Pageable} (production callers sort by {@code createdAt} descending).
     */
    Page<Translation> findByUserId(UUID userId, Pageable pageable);
}
