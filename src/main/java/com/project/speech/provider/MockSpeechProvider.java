package com.project.speech.provider;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development-only {@link SpeechProvider} that performs no real speech
 * processing.
 *
 * <p>It returns obviously artificial, deterministic results —
 * {@code [MOCK TRANSCRIPTION] Speech processed from <filename>} for
 * speech-to-text and a {@code [MOCK SYNTHESIS] ...} audio metadata summary for
 * text-to-speech — so it is never mistaken for real AI transcription or
 * synthesis. This keeps the application fully functional with no external
 * speech API and no API key. No fake downloadable audio blob is produced.</p>
 *
 * <p>Registered by default; it is replaced by {@link HttpSpeechProvider} when
 * {@code speech.provider=http} is configured.</p>
 */
@Component
@ConditionalOnProperty(name = "speech.provider", havingValue = "mock", matchIfMissing = true)
public class MockSpeechProvider implements SpeechProvider {

    public static final String PROVIDER_NAME = "mock-speech";
    public static final String TRANSCRIPTION_PREFIX = "[MOCK TRANSCRIPTION] Speech processed from ";
    public static final String SYNTHESIS_PREFIX = "[MOCK SYNTHESIS] ";
    public static final String OUTPUT_AUDIO_CONTENT_TYPE = "audio/wav";

    /** Size of the canonical WAV header the mock pretends to emit. */
    static final long MOCK_WAV_HEADER_BYTES = 44;

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public SpeechToTextResult transcribe(SpeechInput input) {
        // Deterministic: echoes the declared language (if any), never fakes detection.
        return new SpeechToTextResult(TRANSCRIPTION_PREFIX + input.originalFileName(), input.languageCode());
    }

    @Override
    public TextToSpeechResult synthesize(SynthesisInput input) {
        int characters = input.text().length();
        // Deterministic mock audio size: canonical header + 2 bytes per character.
        long byteLength = MOCK_WAV_HEADER_BYTES + characters * 2L;
        String description = SYNTHESIS_PREFIX + "Generated mock audio for language '"
                + input.languageCode() + "' from " + characters + " characters";
        return new TextToSpeechResult(OUTPUT_AUDIO_CONTENT_TYPE, byteLength, description);
    }
}
