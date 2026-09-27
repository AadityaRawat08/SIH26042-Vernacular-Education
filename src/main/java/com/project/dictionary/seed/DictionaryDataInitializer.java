package com.project.dictionary.seed;

import com.project.dictionary.DictionaryEntry;
import com.project.dictionary.DictionaryRepository;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Seeds a small, development-only dictionary dataset across the Indian
 * languages committed by {@code LanguageDataInitializer}.
 *
 * <p>Idempotent: every run checks the per-language + normalized-word uniqueness
 * before inserting, so restarts never create duplicates. The data is
 * deliberately small (a few common words per language) and is NOT a complete
 * dictionary &mdash; it exists only for development/demo. {@code @Order(20)}
 * runs this after the language catalogue initializer ({@code @Order(10)}).</p>
 */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class DictionaryDataInitializer implements CommandLineRunner {

    private final DictionaryRepository dictionaryRepository;
    private final LanguageRepository languageRepository;

    private record SeedEntry(String languageCode, String word, String pronunciation,
                             String definition, String partOfSpeech, String exampleSentence,
                             String translation) {
    }

    private List<SeedEntry> seedEntries() {
        return List.of(
                // Hindi
                new SeedEntry("hi", "नमस्ते", "namaste", "A formal greeting or salutation.",
                        "interjection", "नमस्ते, आप कैसे हैं?", "hello"),
                new SeedEntry("hi", "धन्यवाद", "dhanyavaad", "An expression of gratitude; thank you.",
                        "interjection", "धन्यवाद तुम्हारी मदद के लिए।", "thank you"),
                new SeedEntry("hi", "घर", "ghar", "A place where one lives; house or home.",
                        "noun", "मेरा घर पास में है।", "house"),
                // English
                new SeedEntry("en", "hello", "həˈloʊ", "A common greeting.",
                        "interjection", "Hello, how are you?", "नमस्ते"),
                new SeedEntry("en", "thank you", "θæŋk juː", "An expression of gratitude.",
                        "phrase", "Thank you for your help.", "धन्यवाद"),
                new SeedEntry("en", "water", "ˈwɔː.tər", "The clear, colorless, tasteless liquid.",
                        "noun", "Please give me some water.", "पानी"),
                new SeedEntry("en", "home", "hoʊm", "The place where one lives.",
                        "noun", "There is no place like home.", "घर"),
                // Bengali
                new SeedEntry("bn", "নমস্কার", "nomoskar", "A formal greeting.",
                        "interjection", "নমস্কার, কেমন আছেন?", "hello"),
                new SeedEntry("bn", "ধন্যবাদ", "dhonnobad", "Thanks; thank you.",
                        "interjection", "ধন্যবাদ।", "thank you"),
                // Tamil
                new SeedEntry("ta", "வணக்கம்", "vaṇakkam", "A formal greeting.",
                        "interjection", "வணக்கம், எப்படி இருக்கிறீர்கள்?", "hello"),
                new SeedEntry("ta", "நன்றி", "naṉṟi", "Thanks; thank you.",
                        "interjection", "நன்றி.", "thank you"),
                // Telugu
                new SeedEntry("te", "నమస్కారం", "namaskāraṁ", "A formal greeting.",
                        "interjection", "నమస్కారం.", "hello"),
                new SeedEntry("te", "ధన్యవాదాలు", "dhanyavādālu", "Thanks; thank you.",
                        "interjection", "ధన్యవాదాలు.", "thank you"),
                // Marathi
                new SeedEntry("mr", "नमस्कार", "namaskār", "A formal greeting.",
                        "interjection", "नमस्कार, तुम्ही कसे आहात?", "hello"),
                new SeedEntry("mr", "धन्यवाद", "dhanyavād", "Thanks; thank you.",
                        "interjection", "धन्यवाद.", "thank you")
        );
    }

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        for (SeedEntry seed : seedEntries()) {
            Language language = languageRepository.findByCode(seed.languageCode().toLowerCase(Locale.ROOT))
                    .orElse(null);
            if (language == null) {
                log.debug("Skipping dictionary seed for unseeded language '{}'", seed.languageCode());
                continue;
            }
            String normalizedWord = normalizeWord(seed.word());
            if (dictionaryRepository.existsByLanguage_CodeAndNormalizedWord(language.getCode(), normalizedWord)) {
                continue;
            }
            dictionaryRepository.save(DictionaryEntry.builder()
                    .language(language)
                    .word(seed.word())
                    .normalizedWord(normalizedWord)
                    .pronunciation(seed.pronunciation())
                    .definition(seed.definition())
                    .partOfSpeech(seed.partOfSpeech())
                    .exampleSentence(seed.exampleSentence())
                    .translation(seed.translation())
                    .build());
            created++;
        }
        if (created > 0) {
            log.info("Dictionary seeded with {} entries", created);
        } else {
            log.debug("Dictionary already seeded — nothing to do");
        }
    }

    private static String normalizeWord(String word) {
        return word.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
