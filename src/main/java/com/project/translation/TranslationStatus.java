package com.project.translation;

/**
 * Lifecycle state of a {@link Translation} record.
 */
public enum TranslationStatus {

    /** The provider produced a translation successfully. */
    COMPLETED,

    /** The provider failed; no translation text is available. */
    FAILED;
}
