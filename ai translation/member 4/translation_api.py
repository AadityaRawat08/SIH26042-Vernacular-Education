import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file if it exists.
# The application must still START when the key is absent; the key is only
# checked when /translate is actually called.
load_dotenv()

from fastapi import FastAPI
from pydantic import BaseModel


# =========================================================
# APP
# =========================================================

app = FastAPI(title="Member 4 Bhashini Translation API")


# =========================================================
# BHASHINI CONFIG
# =========================================================

BHASHINI_URL = (
    "https://dhruva-api.bhashini.gov.in/"
    "services/inference/pipeline"
)

BHASHINI_KEY = os.environ.get("BHASHINI_INFERENCE_KEY", "").strip()

SERVICE_ID = "bhashini/iiith/nmt-all"

# Placeholder values that should never be treated as a real key. If the local
# .env is only scaffolding (e.g. "your_key_here"), the service reports a clean
# "not configured" error instead of calling Bhashini with a bogus key.
_PLACEHOLDER_KEYS = {"your_key_here", "replace-me", "changeme", "your-api-key", "not-set"}


def is_bhashini_configured() -> bool:
    return bool(BHASHINI_KEY) and BHASHINI_KEY not in _PLACEHOLDER_KEYS


# =========================================================
# LANGUAGE CODES
# =========================================================

LANGUAGES = {
    "en": "en",
    "hi": "hi",
    "sat": "sat",
}


# =========================================================
# LOCAL DEVELOPMENT FALLBACK (NO BHASHINI KEY)
# =========================================================
#
# This block exists ONLY so the local SIH demo can be demonstrated when no
# Bhashini inference key is available. It is deliberately isolated from the real
# integration and can never replace it:
#
#   * it is used ONLY when is_bhashini_configured() is False;
#   * when a real key IS configured this code path is never taken, so a Bhashini
#     failure is always reported as a failure — never masked;
#   * every result it produces is labelled `provider: "demo-glossary"` and
#     `demo_mode: true`, so no caller can mistake it for a Bhashini translation;
#   * it can be switched off entirely with TRANSLATION_DEMO_FALLBACK=0.
#
# Nothing here touches the network: the phrases and words below are a small,
# hand-written primary-education demo set.

DEMO_FALLBACK_ENABLED = os.environ.get(
    "TRANSLATION_DEMO_FALLBACK", "1"
).strip().lower() not in {"0", "false", "no", "off"}

DEMO_PROVIDER_NAME = "demo-glossary"
DEMO_NOTE = "Local development demonstration output — not a Bhashini translation."

# Sentence-level demo phrases, keyed by (source, target).
DEMO_PHRASES = {
    ("hi", "sat"): {
        "आज हम जोड़ना सीखेंगे": "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ ᱾",
        "आज हम जोड़ सीखेंगे": "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ ᱾",
        "बैठ जाओ": "ᱫᱩᱲᱩᱵ ᱢᱮ ᱾",
        "ध्यान दो": "ᱮᱢ ᱥᱟᱸᱣᱛᱟ ᱢᱮ ᱾",
        "बच्चों ध्यान दो": "ᱜᱟᱴᱮᱠᱳ ᱮᱢ ᱥᱟᱸᱣᱛᱟ ᱢᱮ ᱾",
        "आज हम गिनती सीखेंगे": "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱞᱮᱠᱷᱟ ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ ᱾",
        "एक और दो मिलकर तीन होते हैं": "ᱢᱤᱫ ᱟᱨ ᱵᱟᱨ ᱢᱤᱫ ᱥᱟᱶ ᱯᱮ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ ᱾",
        "सब ठीक है": "ᱡᱚᱛᱚ ᱴᱷᱤᱠ ᱜᱮᱭᱟ ᱾",
    },
    ("sat", "hi"): {
        "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ ᱾": "आज हम जोड़ना सीखेंगे।",
        "ᱫᱩᱲᱩᱵ ᱢᱮ ᱾": "बैठ जाओ।",
        "ᱮᱢ ᱥᱟᱸᱣᱛᱟ ᱢᱮ ᱾": "ध्यान दो।",
        "ᱡᱚᱛᱚ ᱴᱷᱤᱠ ᱜᱮᱭᱟ ᱾": "सब ठीक है।",
    },
    ("hi", "en"): {
        "आज हम जोड़ना सीखेंगे": "Today we will learn addition.",
        "आज हम जोड़ सीखेंगे": "Today we will learn addition.",
        "बैठ जाओ": "Sit down.",
        "ध्यान दो": "Pay attention.",
        "एक और दो मिलकर तीन होते हैं": "One and two together make three.",
        "सब ठीक है": "All is well.",
    },
    ("en", "hi"): {
        "today we will learn addition": "आज हम जोड़ना सीखेंगे।",
        "sit down": "बैठ जाओ।",
        "pay attention": "ध्यान दो।",
        "one and two together make three": "एक और दो मिलकर तीन होते हैं।",
        "all is well": "सब ठीक है।",
    },
    ("en", "sat"): {
        "today we will learn addition": "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ ᱾",
        "sit down": "ᱫᱩᱲᱩᱵ ᱢᱮ ᱾",
        "pay attention": "ᱮᱢ ᱥᱟᱸᱣᱛᱟ ᱢᱮ ᱾",
        "one and two together make three": "ᱢᱤᱫ ᱟᱨ ᱵᱟᱨ ᱢᱤᱫ ᱥᱟᱶ ᱯᱮ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ ᱾",
        "all is well": "ᱡᱚᱛᱚ ᱴᱷᱤᱠ ᱜᱮᱭᱟ ᱾",
    },
    ("sat", "en"): {
        "ᱛᱮᱦᱮᱸ ᱟᱞᱮ ᱡᱚᱲᱟᱣ ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ ᱾": "Today we will learn addition.",
        "ᱫᱩᱲᱩᱵ ᱢᱮ ᱾": "Sit down.",
        "ᱮᱢ ᱥᱟᱸᱣᱛᱟ ᱢᱮ ᱾": "Pay attention.",
        "ᱡᱚᱛᱚ ᱴᱷᱤᱠ ᱜᱮᱭᱟ ᱾": "All is well.",
    },
}

# Word-level demo glossary for classroom vocabulary, keyed by (source, target).
DEMO_WORDS = {
    ("hi", "sat"): {
        "आज": "ᱛᱮᱦᱮᱸ", "हम": "ᱟᱞᱮ", "जोड़ना": "ᱡᱚᱲᱟᱣ", "जोड़": "ᱡᱚᱲᱟᱣ",
        "सीखेंगे": "ᱥᱮᱬᱟᱭ ᱞᱮᱭᱟ", "बच्चों": "ᱜᱟᱴᱮᱠᱳ", "एक": "ᱢᱤᱫ", "दो": "ᱵᱟᱨ",
        "तीन": "ᱯᱮ", "चार": "ᱯᱩᱱ", "पाँच": "ᱢᱚᱬᱮ", "पानी": "ᱫᱟᱜ", "घर": "ᱚᱲᱟᱜ",
        "किताब": "ᱯᱚᱛᱚᱵ", "माँ": "ᱢᱟᱭ", "पेड़": "ᱫᱟᱨᱮ", "फूल": "ᱵᱟᱦᱟ",
        "अध्यापक": "ᱢᱟᱪᱮᱫ", "स्कूल": "ᱤᱥᱠᱩᱞ", "गिनती": "ᱞᱮᱠᱷᱟ", "मिलकर": "ᱢᱤᱫ ᱥᱟᱶ",
    },
    ("sat", "hi"): {
        "ᱛᱮᱦᱮᱸ": "आज", "ᱟᱞᱮ": "हम", "ᱡᱚᱲᱟᱣ": "जोड़ना", "ᱥᱮᱬᱟᱭ": "सीखना",
        "ᱜᱟᱴᱮᱠᱳ": "बच्चों", "ᱢᱤᱫ": "एक", "ᱵᱟᱨ": "दो", "ᱯᱮ": "तीन", "ᱯᱩᱱ": "चार",
        "ᱢᱚᱬᱮ": "पाँच", "ᱫᱟᱜ": "पानी", "ᱚᱲᱟᱜ": "घर", "ᱯᱚᱛᱚᱵ": "किताब",
        "ᱫᱟᱨᱮ": "पेड़", "ᱵᱟᱦᱟ": "फूल", "ᱢᱟᱪᱮᱫ": "अध्यापक", "ᱞᱮᱠᱷᱟ": "गिनती",
    },
    ("hi", "en"): {
        "आज": "today", "हम": "we", "जोड़ना": "addition", "जोड़": "addition",
        "सीखेंगे": "will learn", "बच्चों": "children", "एक": "one", "दो": "two",
        "तीन": "three", "चार": "four", "पाँच": "five", "पानी": "water", "घर": "home",
        "किताब": "book", "माँ": "mother", "पेड़": "tree", "फूल": "flower",
        "अध्यापक": "teacher", "स्कूल": "school", "गिनती": "counting", "मिलकर": "together",
    },
    ("en", "hi"): {
        "today": "आज", "we": "हम", "addition": "जोड़ना", "learn": "सीखना",
        "children": "बच्चों", "one": "एक", "two": "दो", "three": "तीन", "four": "चार",
        "five": "पाँच", "water": "पानी", "home": "घर", "book": "किताब",
        "mother": "माँ", "tree": "पेड़", "flower": "फूल", "teacher": "अध्यापक",
        "school": "स्कूल", "counting": "गिनती", "together": "मिलकर",
    },
    ("en", "sat"): {
        "today": "ᱛᱮᱦᱮᱸ", "we": "ᱟᱞᱮ", "addition": "ᱡᱚᱲᱟᱣ", "learn": "ᱥᱮᱬᱟᱭ",
        "children": "ᱜᱟᱴᱮᱠᱳ", "one": "ᱢᱤᱫ", "two": "ᱵᱟᱨ", "three": "ᱯᱮ", "four": "ᱯᱩᱱ",
        "five": "ᱢᱚᱬᱮ", "water": "ᱫᱟᱜ", "home": "ᱚᱲᱟᱜ", "book": "ᱯᱚᱛᱚᱵ",
        "mother": "ᱢᱟᱭ", "tree": "ᱫᱟᱨᱮ", "flower": "ᱵᱟᱦᱟ", "teacher": "ᱢᱟᱪᱮᱫ",
        "school": "ᱤᱥᱠᱩᱞ", "counting": "ᱞᱮᱠᱷᱟ", "together": "ᱢᱤᱫ ᱥᱟᱶ",
    },
    ("sat", "en"): {
        "ᱛᱮᱦᱮᱸ": "today", "ᱟᱞᱮ": "we", "ᱡᱚᱲᱟᱣ": "addition", "ᱥᱮᱬᱟᱭ": "learn",
        "ᱜᱟᱴᱮᱠᱳ": "children", "ᱢᱤᱫ": "one", "ᱵᱟᱨ": "two", "ᱯᱮ": "three",
        "ᱯᱩᱱ": "four", "ᱢᱚᱬᱮ": "five", "ᱫᱟᱜ": "water", "ᱚᱲᱟᱜ": "home",
        "ᱯᱚᱛᱚᱵ": "book", "ᱫᱟᱨᱮ": "tree", "ᱵᱟᱦᱟ": "flower", "ᱢᱟᱪᱮᱫ": "teacher",
        "ᱞᱮᱠᱷᱟ": "counting",
    },
}

# Prefix used when no phrase or glossary word matches, so a demo result can never
# be mistaken for a real translation.
DEMO_PREFIX = {
    "sat": "ᱫᱮᱢᱳ ᱛᱚᱨᱡᱚᱢᱟ: ",
    "hi": "डेमो अनुवाद: ",
    "en": "Demo translation: ",
}

def _normalize(text):
    """Folds punctuation and case so demo lookups are forgiving, without altering the text."""
    return " ".join(
        text.strip().lower().replace("।", "").replace(".", "").replace(",", "").split()
    )


def _demo_phrase(text, source, target):
    """Exact sentence match for the requested direction, else via an English pivot."""
    direct = DEMO_PHRASES.get((source, target), {}).get(_normalize(text))
    if direct:
        return direct
    if source != "en" and target != "en":
        pivot = DEMO_PHRASES.get((source, "en"), {}).get(_normalize(text))
        if pivot:
            via_english = DEMO_PHRASES.get(("en", target), {}).get(_normalize(pivot))
            if via_english:
                return via_english
    return None


def _demo_words(text, source, target):
    """
    Word-by-word glossary substitution for short lists of known words.

    Only used when EVERY token is in the glossary. Partial substitution is
    deliberately rejected: a word like Hindi "दो" means "two" in a counting
    lesson but is also the imperative "give", and mixing substituted and
    unsubstituted words produces output that *looks* translated while being
    wrong. Rejecting it lets the caller fall back to an explicitly marked demo
    result instead.
    """
    glossary = DEMO_WORDS.get((source, target))
    if not glossary:
        return None
    tokens = text.split()
    if not tokens:
        return None
    translated = []
    for token in tokens:
        replacement = glossary.get(_normalize(token))
        if not replacement:
            return None
        translated.append(replacement)
    return " ".join(translated)


def demo_translate(text, source, target):
    """
    Local development translator, used only when Bhashini is NOT configured.

    Returns (translated_text, matched) where `matched` is False when nothing in
    the demo phrase set or glossary matched, and the source text was therefore
    carried through with an explicit demo marker.
    """
    text = text.strip()

    if source == target:
        return text, True

    phrase = _demo_phrase(text, source, target)
    if phrase:
        return phrase, True

    words = _demo_words(text, source, target)
    if words:
        return words, True

    return DEMO_PREFIX.get(target, "Demo translation: ") + text, False


# =========================================================
# REQUEST FORMAT
# =========================================================

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    ready = is_bhashini_configured()
    demo_active = (not ready) and DEMO_FALLBACK_ENABLED
    return {
        "status": "running",
        "service": "Member 4 Bhashini Translation API",
        "translation_ready": ready,
        "mode": "bhashini" if ready else ("demo-glossary" if demo_active else "not-configured"),
        "demo_mode": demo_active,
        "demo_fallback_enabled": DEMO_FALLBACK_ENABLED,
        "demo_note": DEMO_NOTE if demo_active else None,
        "supported_languages": list(LANGUAGES.keys())
    }


# =========================================================
# TRANSLATION
# =========================================================

@app.post("/translate")
def translate(request: TranslationRequest):

    text = request.text.strip()

    # Empty input
    if not text:
        return {
            "success": False,
            "error": "Text cannot be empty"
        }

    # API key check.
    #
    # When no Bhashini key is configured the request is answered either by the
    # ISOLATED local development translator (opt-in, clearly labelled) or with a
    # controlled "not configured" error — never by pretending Bhashini replied.
    # When a key IS configured the demo path is unreachable.
    if not is_bhashini_configured():
        if not DEMO_FALLBACK_ENABLED:
            return {
                "success": False,
                "error": "Translation service is not configured"
            }

        # Source/target must still be validated before demo lookup.
        if request.source_lang not in LANGUAGES:
            return {
                "success": False,
                "error": f"Unsupported source language: {request.source_lang}",
                "supported_languages": list(LANGUAGES.keys())
            }
        if request.target_lang not in LANGUAGES:
            return {
                "success": False,
                "error": f"Unsupported target language: {request.target_lang}",
                "supported_languages": list(LANGUAGES.keys())
            }

        demo_text, matched = demo_translate(
            text, LANGUAGES[request.source_lang], LANGUAGES[request.target_lang]
        )
        return {
            "success": True,
            "translated_text": demo_text,
            "provider": DEMO_PROVIDER_NAME,
            "demo_mode": True,
            "glossary_match": matched,
            "note": DEMO_NOTE,
        }

    # Source language check
    if request.source_lang not in LANGUAGES:
        return {
            "success": False,
            "error": f"Unsupported source language: {request.source_lang}",
            "supported_languages": list(LANGUAGES.keys())
        }

    # Target language check
    if request.target_lang not in LANGUAGES:
        return {
            "success": False,
            "error": f"Unsupported target language: {request.target_lang}",
            "supported_languages": list(LANGUAGES.keys())
        }

    source = LANGUAGES[request.source_lang]
    target = LANGUAGES[request.target_lang]

    # Same-language request
    if source == target:
        return {
            "success": True,
            "translated_text": text,
            "provider": "identity",
            "demo_mode": False
        }

    # =====================================================
    # BHASHINI REQUEST
    # =====================================================

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source,
                        "targetLanguage": target
                    },
                    "serviceId": SERVICE_ID
                }
            }
        ],
        "inputData": {
            "input": [
                {
                    "source": text
                }
            ]
        }
    }

    try:

        response = requests.post(
            BHASHINI_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": BHASHINI_KEY
            },
            json=payload,
            timeout=60
        )

        # Bhashini error
        if response.status_code != 200:
            return {
                "success": False,
                "error": "Bhashini request failed",
                "status_code": response.status_code,
                "details": response.text
            }

        data = response.json()

        # Extract translation
        translated_text = (
            data["pipelineResponse"][0]
            ["output"][0]
            ["target"]
        )

        return {
            "success": True,
            "translated_text": translated_text,
            "provider": "bhashini",
            "demo_mode": False
        }

    except requests.exceptions.Timeout:

        return {
            "success": False,
            "error": "Bhashini request timed out"
        }

    except requests.exceptions.RequestException as e:

        return {
            "success": False,
            "error": "Network error while contacting Bhashini",
            "details": str(e)
        }

    except (KeyError, IndexError, TypeError):

        return {
            "success": False,
            "error": "Unexpected Bhashini response",
            "details": data if "data" in locals() else None
        }

    except Exception as e:

        return {
            "success": False,
            "error": "Unexpected server error",
            "details": str(e)
        }