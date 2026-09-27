package com.project.ocr.provider;

/**
 * Abstraction over an OCR engine.
 *
 * <p>{@code OcrService} depends on this interface — never on a concrete engine —
 * so the development {@link MockOcrProvider} can be swapped for Tesseract, a
 * local AI model, or an external OCR provider later without touching the
 * controller or service API.</p>
 */
public interface OcrProvider {

    /** Stable identifier recorded on each {@code OcrDocument} (e.g. {@code "mock-ocr"}). */
    String name();

    /**
     * Extracts text from the given image.
     *
     * @param input the uploaded image metadata and raw bytes (transient)
     * @return extracted text plus an optional detected language code
     */
    OcrResult extractText(OcrInput input);

    /** Input handed to an OCR engine: metadata plus the raw file bytes. */
    record OcrInput(String originalFileName, String contentType, long fileSize, byte[] content) {
    }

    /** Output of an OCR engine. */
    record OcrResult(String extractedText, String detectedLanguageCode) {
    }
}