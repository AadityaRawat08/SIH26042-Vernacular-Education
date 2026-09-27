package com.project.speech.provider;

/**
 * Abstraction over a speech processing engine (speech-to-text and
 * text-to-speech).
 *
 * <p>{@code SpeechService} depends on this interface — never on a concrete
 * engine — so the development {@link MockSpeechProvider} can be swapped for a
 * real AI/STT/TTS provider later without touching the controller or service
 * API.</p>
 */
public interface SpeechProvider {

    /** Stable identifier recorded on each {@code SpeechDocument} (e.g. {@code "mock-speech"}). */
    String name();

    /**
     * Transcribes the given audio file.
     *
     * @param input the uploaded audio metadata and raw bytes (transient)
     * @return transcribed text plus an optional detected language code
     */
    SpeechToTextResult transcribe(SpeechInput input);

    /**
     * Synthesizes speech for the given text.
     *
     * @param input the text and its language
     * @return deterministic audio metadata (format, byte length, description) —
     *         no audio binary is produced or persisted at this stage
     */
    TextToSpeechResult synthesize(SynthesisInput input);

    /**
     * Synthesizes speech and returns the audio binary itself.
     *
     * <p>Used by {@code POST /api/speech/synthesize/audio} so the browser can
     * actually play a Text-to-Speech result. Providers that cannot produce audio
     * keep the default behaviour and report a clean
     * {@link UnsupportedOperationException}, which the service turns into a
     * normal business error — never a 500.</p>
     *
     * @param input the text and its language
     * @return the synthesized audio bytes and their content type
     */
    default TextToSpeechAudio synthesizeAudio(SynthesisInput input) {
        throw new UnsupportedOperationException("The configured speech provider cannot return audio");
    }

    /** Input handed to a speech-to-text engine: metadata plus the raw file bytes. */
    record SpeechInput(String originalFileName, String contentType, long fileSize, byte[] content,
                       String languageCode) {
    }

    /** Output of a speech-to-text engine. */
    record SpeechToTextResult(String transcribedText, String detectedLanguageCode) {
    }

    /** Input handed to a text-to-speech engine. */
    record SynthesisInput(String text, String languageCode) {
    }

    /** Output of a text-to-speech engine (metadata only for now). */
    record TextToSpeechResult(String audioContentType, long audioByteLength, String description) {
    }

    /** Audio produced by an engine that can return the synthesized binary. */
    record TextToSpeechAudio(String audioContentType, byte[] content) {
    }
}
