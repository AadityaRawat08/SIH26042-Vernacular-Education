package com.project.speech.dto;

import com.project.speech.SpeechDocument;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Paginated view of a user's speech processing history.
 *
 * @param content       the page's speech records
 * @param page          current 0-based page number
 * @param size          page size
 * @param totalElements total number of matching records
 * @param totalPages    total number of pages
 */
public record SpeechHistoryResponse(
        List<SpeechResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static SpeechHistoryResponse from(Page<SpeechDocument> documents) {
        return new SpeechHistoryResponse(
                documents.getContent().stream().map(SpeechResponse::from).toList(),
                documents.getNumber(),
                documents.getSize(),
                documents.getTotalElements(),
                documents.getTotalPages());
    }
}
