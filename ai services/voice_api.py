import os
import sys
import tempfile
import uuid

# The existing speech helpers (stt.py / tts.py) print progress messages that
# include emoji. On Windows the console usually uses a legacy code page
# (cp1252), so those prints raised
#   UnicodeEncodeError: 'charmap' codec can't encode character ...
# and /stt/transcribe reported "Speech-to-text failed" even for perfectly valid
# audio. Forcing UTF-8 on this process' standard streams fixes every caller of
# the adapter without changing the speech implementation itself.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        # Stream replaced by the ASGI server or not a TextIOWrapper: nothing to do.
        pass

import requests
from dotenv import load_dotenv

# Load environment variables from .env file if it exists.
load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

import stt
import tts


# =========================================================
# CONFIG
# =========================================================

# Where the Member 4 translation service lives. Overridable via environment:
#   TRANSLATION_SERVICE_BASE_URL=http://localhost:8000
TRANSLATION_SERVICE_BASE_URL = os.environ.get(
    "TRANSLATION_SERVICE_BASE_URL", "http://localhost:8000"
).rstrip("/")

TRANSLATION_TIMEOUT = float(os.environ.get("TRANSLATION_TIMEOUT_SECONDS", "15"))

# Map the project's ISO codes to Google Speech Recognition locales.
# "sat" (Santhali) is not natively supported by Google STT, so we fall back to
# the closest supported Indic locale (hi-IN).
_GOOGLE_LOCALE = {
    "en": "en-IN",
    "hi": "hi-IN",
    "sat": "hi-IN",
}


def _google_locale(lang):
    if not lang:
        return "en-IN"
    return _GOOGLE_LOCALE.get(lang.strip().lower(), "en-IN")


# =========================================================
# APP
# =========================================================

app = FastAPI(title="Member 5 Voice Services API")


# =========================================================
# HEALTH
# =========================================================

@app.get("/")
def home():
    return {
        "status": "running",
        "service": "Voice Services API",
        "stt": "google-speech-recognition",
        "tts": "pyttsx3",
        "translation_service": TRANSLATION_SERVICE_BASE_URL,
    }


# =========================================================
# SPEECH TO TEXT
# =========================================================

@app.post("/stt/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(None),
):
    """
    Accepts an audio upload (multipart `file`) and returns transcribed text.

    Response (success):
        {"success": true, "text": "...", "language": "en"}

    Response (failure):
        {"success": false, "error": "..."}
    """

    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    tmp_path = None

    try:
        content = await file.read()
        if not content:
            return {"success": False, "error": "Empty audio upload"}

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        text = stt.speech_to_text(tmp_path, language=_google_locale(language))

        if not text:
            return {"success": False, "error": "Could not transcribe the audio"}

        return {
            "success": True,
            "text": text,
            "language": (language or "en").strip().lower(),
        }

    except Exception as exc:  # surface a clean error to callers
        return {"success": False, "error": "Speech-to-text failed: {0}".format(exc)}

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


# =========================================================
# TEXT TO SPEECH
# =========================================================

class SynthesisRequest(BaseModel):
    text: str
    language: str = "en"
    gender: str = "male"


@app.post("/tts/synthesize")
async def synthesize(request: SynthesisRequest):
    """
    Synthesizes speech for the given text using the existing pyttsx3 engine.

    Response (success):
        {"success": true, "audio_content_type": "audio/wav",
         "audio_byte_length": <n>, "description": "...", "output_file": "..."}

    Response (failure):
        {"success": false, "error": "..."}
    """

    text = (request.text or "").strip()
    if not text:
        return {"success": False, "error": "Text cannot be empty"}

    output_dir = tempfile.gettempdir()
    output_path = os.path.join(output_dir, "tts_{0}.wav".format(uuid.uuid4().hex))

    try:
        result_path = tts.text_to_speech(text, gender=request.gender, output_path=output_path)

        byte_length = 0
        if result_path and os.path.exists(result_path):
            byte_length = os.path.getsize(result_path)

        return {
            "success": True,
            "audio_content_type": "audio/wav",
            "audio_byte_length": byte_length,
            "description": "Synthesized {0} characters in '{1}'".format(len(text), request.language),
            "output_file": result_path or None,
        }

    except Exception as exc:  # surface a clean error to callers
        return {"success": False, "error": "Text-to-speech failed: {0}".format(exc)}


@app.post("/tts/synthesize/file")
async def synthesize_file(request: SynthesisRequest):
    """
    Same synthesis as `/tts/synthesize`, but streams the produced WAV back.

    Exists so the Spring Boot backend can hand a real audio result to the
    browser for the Text -> Speech and Speech -> Speech modes. The JSON endpoint
    above is unchanged and still returns metadata only.
    """

    text = (request.text or "").strip()
    if not text:
        return {"success": False, "error": "Text cannot be empty"}

    output_dir = tempfile.gettempdir()
    output_path = os.path.join(output_dir, "tts_{0}.wav".format(uuid.uuid4().hex))

    try:
        result_path = tts.text_to_speech(text, gender=request.gender, output_path=output_path)
    except Exception as exc:  # surface a clean error to callers
        return {"success": False, "error": "Text-to-speech failed: {0}".format(exc)}

    if not result_path or not os.path.exists(result_path):
        return {"success": False, "error": "Text-to-speech produced no audio"}

    if os.path.getsize(result_path) == 0:
        return {"success": False, "error": "Text-to-speech produced an empty audio file"}

    # FileResponse streams the file; the temp file is intentionally left for the
    # OS to clean up so the response never races a delete.
    return FileResponse(
        result_path,
        media_type="audio/wav",
        filename=os.path.basename(result_path),
    )


# =========================================================
# PIPELINE: STT -> TRANSLATION -> TTS
# =========================================================

@app.post("/pipeline/translate-and-speak")
async def translate_and_speak(
    file: UploadFile = File(...),
    source_lang: str = Form("en"),
    target_lang: str = Form("sat"),
):
    """
    Runs the full voice pipeline: transcribe the upload, translate it through
    the Member 4 translation service, then synthesize the result.

    If the translation service is not configured (no Bhashini key), the
    pipeline returns a clean structured error and does NOT crash.
    """

    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    tmp_path = None

    try:
        content = await file.read()
        if not content:
            return {"success": False, "error": "Empty audio upload"}

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # 1. STT
        text = stt.speech_to_text(tmp_path, language=_google_locale(source_lang))
        if not text:
            return {"success": False, "error": "Could not transcribe the audio", "stage": "stt"}

        # 2. Translation (Member 4 -> Bhashini). Graceful when not configured.
        try:
            translation_response = requests.post(
                "{0}/translate".format(TRANSLATION_SERVICE_BASE_URL),
                json={"text": text, "source_lang": source_lang, "target_lang": target_lang},
                timeout=TRANSLATION_TIMEOUT,
            )
            payload = translation_response.json()
        except (requests.RequestException, ValueError):
            return {
                "success": False,
                "error": "AI translation service is not configured yet",
                "stage": "translate",
                "transcribed_text": text,
            }

        if not payload.get("success"):
            return {
                "success": False,
                "error": "AI translation service is not configured yet",
                "stage": "translate",
                "transcribed_text": text,
            }

        translated = payload.get("translated_text")
        if not translated:
            return {
                "success": False,
                "error": "Translation service returned no text",
                "stage": "translate",
                "transcribed_text": text,
            }

        # 3. TTS
        output_dir = tempfile.gettempdir()
        output_path = os.path.join(output_dir, "tts_{0}.wav".format(uuid.uuid4().hex))
        tts.text_to_speech(translated, gender="female", output_path=output_path)

        byte_length = os.path.getsize(output_path) if os.path.exists(output_path) else 0

        return {
            "success": True,
            "transcribed_text": text,
            "translated_text": translated,
            "audio_content_type": "audio/wav",
            "audio_byte_length": byte_length,
            "output_file": output_path,
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("voice_api:app", host="0.0.0.0", port=8001)
