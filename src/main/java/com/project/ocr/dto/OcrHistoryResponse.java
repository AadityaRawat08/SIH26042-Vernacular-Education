package com.project.ocr.dto;

import com.project.ocr.OcrDocument;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Paginated view of a user's OCR history.
 *
 * @param content       the page's OCR records
 * @param page          current 0-based page number
 * @param size          page size
 * @param totalElements total number of matching records
 * @param totalPages    total number of pages
 */
public record OcrHistoryResponse(
        List<OcrResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static OcrHistoryResponse from(Page<OcrDocument> documents) {
        return new OcrHistoryResponse(
                documents.getContent().stream().map(OcrResponse::from).toList(),
                documents.getNumber(),
                documents.getSize(),
                documents.getTotalElements(),
                documents.getTotalPages());
    }
}