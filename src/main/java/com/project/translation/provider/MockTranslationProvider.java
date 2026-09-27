package com.project.translation.provider;

import com.project.language.Language;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development-only {@link TranslationProvider} that performs no real translation.
 *
 * <p>It returns an obviously artificial result — {@code [MOCK TRANSLATION] <text>}
 * — so it is never mistaken for a real AI translation. This keeps the application
 * fully functional without any external AI API.</p>
 *
 * <p>Registered by default; it is replaced by {@link HttpTranslationProvider}
 * when {@code translation.provider=http} is configured.</p>
 */
@Component
@ConditionalOnProperty(name = "translation.provider", havingValue = "mock", matchIfMissing = true)
public class MockTranslationProvider implements TranslationProvider {

    public static final String PROVIDER_NAME = "mock";
    public static final String PREFIX = "[MOCK TRANSLATION] ";

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public String translate(String text, Language sourceLanguage, Language targetLanguage) {
        return PREFIX + text;
    }
}
