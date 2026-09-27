package com.project.language.seed;

import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.language.Script;
import com.project.language.ScriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Seeds the language catalogue with an initial set of major Indian languages
 * (plus English) and the writing systems they use.
 *
 * <p>This is an <strong>idempotent</strong> initialization mechanism: every run
 * checks {@code existsByCode} before inserting, so restarting the application
 * never creates duplicates. It is intentionally separate from all business
 * services so catalogue data is never coupled to request handling.</p>
 *
 * <p>Codes follow ISO 639-1 for languages ({@code hi}, {@code bn}, …) and
 * ISO 15924 for scripts ({@code Deva}, {@code Beng}, …). The list is a starting
 * point — more languages and dialects are added through the ADMIN APIs.</p>
 */
@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class LanguageDataInitializer implements CommandLineRunner {

    private static final Map<String, String[]> SEED_SCRIPTS = Map.ofEntries(
            Map.entry("Deva", new String[]{"Devanagari", "Writing system used by Hindi, Marathi, Sanskrit and others."}),
            Map.entry("Latn", new String[]{"Latin", "Roman script, used by English and transliteration."}),
            Map.entry("Beng", new String[]{"Bengali", "Writing system used by Bengali and Assamese."}),
            Map.entry("Telu", new String[]{"Telugu", "Writing system used by Telugu."}),
            Map.entry("Taml", new String[]{"Tamil", "Writing system used by Tamil."}),
            Map.entry("Gujr", new String[]{"Gujarati", "Writing system used by Gujarati."}),
            Map.entry("Arab", new String[]{"Arabic", "Writing system used by Urdu (Nastaliq style)."}),
            Map.entry("Knda", new String[]{"Kannada", "Writing system used by Kannada."}),
            Map.entry("Orya", new String[]{"Odia", "Writing system used by Odia."}),
            Map.entry("Mlym", new String[]{"Malayalam", "Writing system used by Malayalam."}),
            Map.entry("Guru", new String[]{"Gurmukhi", "Writing system used by Punjabi."}),
            // Scripts of the Jharkhand mother-tongue languages the platform targets.
            Map.entry("Olck", new String[]{"Ol Chiki", "Writing system used by Santhali (ᱥᱟᱱᱛᱟᱲᱤ)."}),
            Map.entry("Wara", new String[]{"Warang Citi", "Writing system used by Ho (𑢹𑣉𑣉)."}));

    private final LanguageRepository languageRepository;
    private final ScriptRepository scriptRepository;

    /** Initial catalogue of major Indian languages (+ English) and their scripts. */
    private record SeedLanguage(String code, String name, String nativeName, String description, List<String> scripts) {
    }

    private static final List<SeedLanguage> SEED_LANGUAGES = List.of(
            new SeedLanguage("hi", "Hindi", "हिन्दी",
                    "Most widely spoken Indian language; official language of India.", List.of("Deva")),
            new SeedLanguage("en", "English", "English",
                    "Associate official language of India; primary language of instruction and technology.", List.of("Latn")),
            new SeedLanguage("bn", "Bengali", "বাংলা",
                    "Language of West Bengal and the Bangladesh region.", List.of("Beng")),
            new SeedLanguage("te", "Telugu", "తెలుగు",
                    "Dravidian language of Andhra Pradesh and Telangana.", List.of("Telu")),
            new SeedLanguage("mr", "Marathi", "मराठी",
                    "Official language of Maharashtra.", List.of("Deva")),
            new SeedLanguage("ta", "Tamil", "தமிழ்",
                    "Classical Dravidian language of Tamil Nadu and Puducherry.", List.of("Taml")),
            new SeedLanguage("gu", "Gujarati", "ગુજરાતી",
                    "Official language of Gujarat.", List.of("Gujr")),
            new SeedLanguage("ur", "Urdu", "اردو",
                    "Official language of Jammu and Kashmir, Telangana and others.", List.of("Arab")),
            new SeedLanguage("kn", "Kannada", "ಕನ್ನಡ",
                    "Official language of Karnataka.", List.of("Knda")),
            new SeedLanguage("or", "Odia", "ଓଡ଼ିଆ",
                    "Official language of Odisha.", List.of("Orya")),
            new SeedLanguage("ml", "Malayalam", "മലയാളം",
                    "Official language of Kerala and Lakshadweep.", List.of("Mlym")),
            new SeedLanguage("pa", "Punjabi", "ਪੰਜਾਬੀ",
                    "Official language of Punjab.", List.of("Guru")),
            new SeedLanguage("as", "Assamese", "অসমীয়া",
                    "Official language of Assam.", List.of("Beng")),
            new SeedLanguage("sa", "Sanskrit", "संस्कृतम्",
                    "Classical language of ancient Indian literature.", List.of("Deva")),
            new SeedLanguage("gom", "Konkani", "कोंकणी",
                    "Official language of Goa.", List.of("Deva")),
            // Mother-tongue languages of the primary-education districts this
            // platform targets (Jharkhand, Odisha, West Bengal, Assam). Santhali
            // uses the Ol Chiki script; Ho uses Warang Citi; Mundari is written
            // in Devanagari in school materials. Seeding them makes
            // Hindi -> Santhali / Ho / Mundari translation and the school
            // dictionary work against the real catalogue codes ("sat", "ho",
            // "mun") instead of failing with a 404.
            new SeedLanguage("sat", "Santhali", "ᱥᱟᱱᱛᱟᱲᱤ",
                    "Most widely spoken tribal language of Jharkhand, Odisha and West Bengal.",
                    List.of("Olck")),
            new SeedLanguage("ho", "Ho", "𑢹𑣉𑣉",
                    "Munda language spoken in Kolhan (Jharkhand) and neighbouring states.",
                    List.of("Wara")),
            new SeedLanguage("mun", "Mundari", "मुंडारी",
                    "Munda language of the Chotanagpur plateau.",
                    List.of("Deva")));

    private List<SeedLanguage> seedLanguagesList() {
        return SEED_LANGUAGES;
    }

    @Override
    @Transactional
    public void run(String... args) {
        int scriptsCreated = seedScripts();
        int languagesCreated = seedLanguages();
        if (scriptsCreated > 0 || languagesCreated > 0) {
            log.info("Language catalogue seeded: {} scripts and {} languages created",
                    scriptsCreated, languagesCreated);
        } else {
            log.debug("Language catalogue already seeded — nothing to do");
        }
    }

    private int seedScripts() {
        int created = 0;
        for (Map.Entry<String, String[]> entry : SEED_SCRIPTS.entrySet()) {
            String code = entry.getKey();
            if (scriptRepository.existsByCode(code)) {
                continue;
            }
            scriptRepository.save(Script.builder()
                    .name(entry.getValue()[0])
                    .code(code)
                    .description(entry.getValue()[1])
                    .build());
            created++;
        }
        return created;
    }

    private int seedLanguages() {
        int created = 0;
        for (SeedLanguage seed : seedLanguagesList()) {
            if (languageRepository.existsByCode(seed.code())) {
                continue;
            }
            Set<Script> scripts = new LinkedHashSet<>();
            for (String scriptCode : seed.scripts()) {
                scriptRepository.findByCode(scriptCode).ifPresent(scripts::add);
            }
            languageRepository.save(Language.builder()
                    .name(seed.name())
                    .nativeName(seed.nativeName())
                    .code(seed.code().toLowerCase(Locale.ROOT))
                    .description(seed.description())
                    .isActive(true)
                    .scripts(scripts)
                    .build());
            created++;
        }
        return created;
    }
}