package com.project.ocr;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.util.List;

/**
 * OCR upload settings, bound from the {@code ocr.*} configuration namespace.
 *
 * <p>Sensible development defaults are applied when the properties are absent,
 * so the application always starts — no external OCR API or API key is ever
 * required.</p>
 *
 * @param maxFileSize       maximum accepted upload size (default {@code 5MB})
 * @param allowedContentTypes image MIME types accepted by the upload endpoint
 */
@ConfigurationProperties(prefix = "ocr")
public record OcrProperties(DataSize maxFileSize, List<String> allowedContentTypes) {

    public OcrProperties {
        if (maxFileSize == null) {
            maxFileSize = DataSize.ofMegabytes(5);
        }
        if (allowedContentTypes == null || allowedContentTypes.isEmpty()) {
            allowedContentTypes = List.of("image/jpeg", "image/png", "image/webp");
        }
    }

    /** True when the given MIME type is accepted for OCR uploads. */
    public boolean isSupportedContentType(String contentType) {
        return contentType != null && allowedContentTypes.contains(contentType);
    }
}