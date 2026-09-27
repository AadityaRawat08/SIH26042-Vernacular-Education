import sounddevice as sd
import scipy.io.wavfile as wav
import speech_recognition as sr
import pyttsx3
import numpy as np
import time

SAMPLE_RATE = 16000

# Voice detection settings
BLOCK_DURATION = 0.1       # 100 ms
SILENCE_DURATION = 0.7    # stop after 1 sec silence
MAX_RECORDING_TIME = 10    # safety limit
ENERGY_THRESHOLD = 500


recognizer = sr.Recognizer()


# -----------------------------
# RECORD UNTIL USER STOPS
# -----------------------------
def record_voice():

    print("\n🎤 Speak now...")

    block_size = int(SAMPLE_RATE * BLOCK_DURATION)

    audio_blocks = []

    speech_started = False
    silence_time = 0
    start_time = time.time()

    while True:

        audio = sd.rec(
            block_size,
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16"
        )

        sd.wait()

        audio = audio.flatten()

        # Calculate volume
        volume = np.sqrt(np.mean(audio.astype(float) ** 2))

        # Detect speech
        if volume > ENERGY_THRESHOLD:

            speech_started = True
            silence_time = 0

            print("🗣️", end="", flush=True)

        else:

            if speech_started:
                silence_time += BLOCK_DURATION

                print(".", end="", flush=True)

        audio_blocks.append(audio)

        # Stop after silence
        if speech_started and silence_time >= SILENCE_DURATION:
            break

        # Safety limit
        if time.time() - start_time >= MAX_RECORDING_TIME:
            break

    print("\n")

    if not speech_started:
        print("❌ No speech detected.")
        return False

    complete_audio = np.concatenate(audio_blocks)

    wav.write(
        "recorded.wav",
        SAMPLE_RATE,
        complete_audio
    )

    print("✅ Recording complete")

    return True


# -----------------------------
# SPEECH TO TEXT
# -----------------------------
def speech_to_text():

    print("🔄 Converting voice to text...")

    recognizer = sr.Recognizer()

    with sr.AudioFile("recorded.wav") as source:

        # Remove some background noise
        audio = recognizer.record(source)

    try:

        text = recognizer.recognize_google(
            audio,
            language="en-IN"
        )

        print("📝 You said:", text)

        return text

    except sr.UnknownValueError:

        print("❌ Could not understand the speech.")

    except sr.RequestError as e:

        print("❌ STT service error:", e)

    return None

# -----------------------------
# PITCH DETECTION
# -----------------------------
def detect_pitch():

    rate, data = wav.read("recorded.wav")

    data = data.astype(float)

    if len(data.shape) > 1:
        data = data[:, 0]

    data = data - np.mean(data)

    correlation = np.correlate(
        data,
        data,
        mode="full"
    )

    correlation = correlation[len(correlation) // 2:]

    min_lag = int(SAMPLE_RATE / 300)
    max_lag = int(SAMPLE_RATE / 80)

    correlation[:min_lag] = 0

    if max_lag >= len(correlation):
        max_lag = len(correlation) - 1

    lag = np.argmax(
        correlation[min_lag:max_lag]
    ) + min_lag

    if lag == 0:
        return None

    return SAMPLE_RATE / lag


# -----------------------------
# TEXT TO SPEECH
# -----------------------------
def speak(text, pitch):

    engine = pyttsx3.init()

    voices = engine.getProperty("voices")

    if pitch is not None:

        print(f"🎵 Pitch: {pitch:.1f} Hz")

        if pitch < 165:

            print("👨 Male voice selected")

            engine.setProperty(
                "voice",
                voices[0].id
            )

        else:

            print("👩 Female voice selected")

            engine.setProperty(
                "voice",
                voices[1].id
            )

    engine.setProperty("rate", 150)

    print("🔊 Speaking...")

    engine.say(text)

    engine.runAndWait()

    engine.stop()


# -----------------------------
# MAIN
# -----------------------------
def main():

    print("==============================")
    print("      VOICE AI ASSISTANT")
    print("==============================")

    print("Speak normally.")
    print("The system stops when you stop speaking.")
    print("Press CTRL+C to exit.\n")

    while True:

        try:

            # Record
            success = record_voice()

            if not success:
                continue

            # STT
            text = speech_to_text()

            if text is None:
                continue

            # Pitch
            pitch = detect_pitch()

            # TTS
            speak(text, pitch)

            print("\n🔄 Ready for next sentence...")

            time.sleep(0.5)

        except KeyboardInterrupt:

            print("\n🛑 Voice assistant stopped.")
            break


if __name__ == "__main__":
    main()