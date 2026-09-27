package com.project.speech;

/**
 * Outcome of a speech processing attempt.
 */
public enum SpeechStatus {
    /** The provider produced a result. */
    COMPLETED,
    /** The provider failed; {@code failureReason} carries a safe message. */
    FAILED
}
