package com.project.speech;

/**
 * The kind of speech processing a {@link SpeechDocument} represents.
 */
public enum SpeechOperation {
    /** Audio file in, transcribed text out. */
    SPEECH_TO_TEXT,
    /** Text in, synthesized speech (audio metadata) out. */
    TEXT_TO_SPEECH
}
