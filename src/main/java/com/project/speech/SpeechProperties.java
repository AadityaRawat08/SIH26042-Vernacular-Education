package com.project.speech;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.util.List;

/**
 * Speech upload settings, bound from the {@code speech.*} configuration
 * namespace.
 *
 * <p>Sensible development defaults are applied when the properties are absent,
 * so the application always starts — no external speech API or API key is ever
 * required.</p>
 *
 * @param maxFileSize         maximum accepted audio upload size (default
 *                            {@code 10MB})
 * @param allowedContentTypes audio MIME types accepted by the transcribe
 *                            endpoint
 */
@ConfigurationProperties(prefix = "speech")
public record SpeechProperties(DataSize maxFileSize, List<String> allowedContentTypes) {

    public SpeechProperties {
        if (maxFileSize == null) {
            maxFileSize = DataSize.ofMegabytes(10);
        }
        if (allowedContentTypes == null || allowedContentTypes.isEmpty()) {
            allowedContentTypes = List.of(
                    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm");
        }
    }

    /** True when the given MIME type is accepted for speech uploads. */
    public boolean isSupportedContentType(String contentType) {
        return contentType != null && allowedContentTypes.contains(contentType);
    }
}
