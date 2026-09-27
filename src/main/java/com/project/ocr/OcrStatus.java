package com.project.ocr;

/**
 * Outcome of an OCR processing attempt.
 */
public enum OcrStatus {

    /** The provider produced extracted text successfully. */
    COMPLETED,

    /** The provider failed or the attempt was aborted; a safe reason is recorded. */
    FAILED
}