package com.project.speech;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Data access for {@link SpeechDocument} records.
 *
 * <p>History queries are executed server-side with pagination — the full speech
 * history is never loaded into memory.</p>
 */
public interface SpeechRepository extends JpaRepository<SpeechDocument, UUID> {

    /**
     * Returns the given user's speech records, ordered by the caller's
     * {@link Pageable} (production callers sort by {@code createdAt} descending).
     */
    Page<SpeechDocument> findByUserId(UUID userId, Pageable pageable);
}
