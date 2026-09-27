package com.project.ocr;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Data access for {@link OcrDocument} records.
 *
 * <p>History queries are executed server-side with pagination — the full OCR
 * history is never loaded into memory.</p>
 */
public interface OcrRepository extends JpaRepository<OcrDocument, UUID> {

    /**
     * Returns the given user's OCR records, ordered by the caller's
     * {@link Pageable} (production callers sort by {@code createdAt} descending).
     */
    Page<OcrDocument> findByUserId(UUID userId, Pageable pageable);
}