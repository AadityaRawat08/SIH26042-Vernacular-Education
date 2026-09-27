import speech_recognition as sr
import sounddevice as sd
from scipy.io.wavfile import write


# ==============================
# SETTINGS
# ==============================

DURATION = 5
SAMPLE_RATE = 16000
OUTPUT_FILE = "recorded.wav"


# ==============================
# RECORD AUDIO
# ==============================

def record_audio():

    print("🎤 Speak now...")

    recording = sd.rec(
        int(DURATION * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16"
    )

    sd.wait()

    write(
        OUTPUT_FILE,
        SAMPLE_RATE,
        recording
    )

    print("✅ Recording complete.")

    return OUTPUT_FILE


# ==============================
# SPEECH TO TEXT
# ==============================

def speech_to_text(audio_file_path, language="en-IN"):

    print("🔄 Converting speech to text...")

    recognizer = sr.Recognizer()

    try:

        with sr.AudioFile(audio_file_path) as source:

            audio = recognizer.record(source)

        text = recognizer.recognize_google(
            audio,
            language=language
        )

        print("✅ You said:", text)

        return text

    except sr.UnknownValueError:

        print("❌ Could not understand your speech.")

        return None

    except sr.RequestError as e:

        print("❌ STT service error:", e)

        return None

    except Exception as e:

        print("❌ Unexpected error:", e)

        return None


# ==============================
# TEST STT DIRECTLY
# ==============================

if __name__ == "__main__":

    audio_file = record_audio()

    text = speech_to_text(audio_file)

    print("\nFinal text:", text)