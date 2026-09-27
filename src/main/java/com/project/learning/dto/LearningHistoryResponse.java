package com.project.learning.dto;

import com.project.learning.LearningPracticeRecord;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Paginated view of a user's practice history.
 *
 * @param content       the page's practice records
 * @param page          current 0-based page number
 * @param size          page size
 * @param totalElements total number of matching records
 * @param totalPages    total number of pages
 */
public record LearningHistoryResponse(
        List<LearningPracticeRecordResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static LearningHistoryResponse from(Page<LearningPracticeRecord> records) {
        return new LearningHistoryResponse(
                records.getContent().stream().map(LearningPracticeRecordResponse::from).toList(),
                records.getNumber(),
                records.getSize(),
                records.getTotalElements(),
                records.getTotalPages());
    }
}
