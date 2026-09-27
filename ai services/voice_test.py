import speech_recognition as sr
import sounddevice as sd
from scipy.io.wavfile import write
import pyttsx3

# -------------------------
# TTS setup
# -------------------------
engine = pyttsx3.init()


def speak(text):
    print("🔊 AI:", text)
    engine.say(text)
    engine.runAndWait()


# -------------------------
# STT setup
# -------------------------
duration = 5
sample_rate = 44100

print("🎤 Speak now...")

recording = sd.rec(
    int(duration * sample_rate),
    samplerate=sample_rate,
    channels=1,
    dtype="int16"
)

sd.wait()

write("recorded.wav", sample_rate, recording)

print("🔄 Converting speech to text...")

recognizer = sr.Recognizer()

with sr.AudioFile("recorded.wav") as source:
    audio = recognizer.record(source)

try:
    text = recognizer.recognize_google(audio)

    print("👤 You:", text)

    # AI speaks the same text back
    speak(text)

except sr.UnknownValueError:
    print("❌ Could not understand your speech.")

except sr.RequestError as e:
    print("❌ Speech recognition service error:", e)