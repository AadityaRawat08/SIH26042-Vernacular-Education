package com.project.ocr.provider;

import org.springframework.stereotype.Component;

/**
 * Development-only {@link OcrProvider} that performs no real OCR.
 *
 * <p>It returns an obviously artificial result —
 * {@code [MOCK OCR RESULT] Extracted text from <filename>} — so it is never
 * mistaken for real text recognition. This keeps the application fully
 * functional with no external OCR API and no API key.</p>
 */
@Component
public class MockOcrProvider implements OcrProvider {

    public static final String PROVIDER_NAME = "mock-ocr";
    public static final String PREFIX = "[MOCK OCR RESULT] Extracted text from ";

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public OcrResult extractText(OcrInput input) {
        return new OcrResult(PREFIX + input.originalFileName(), null);
    }
}