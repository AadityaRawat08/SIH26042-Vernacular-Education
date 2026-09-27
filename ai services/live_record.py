import sounddevice as sd
import soundfile as sf

OUTPUT = "live_input.wav"
DEVICE = 1
SAMPLE_RATE = 16000
DURATION = 5

print("\n🎤 Speak now...")

audio = sd.rec(
    int(DURATION * SAMPLE_RATE),
    samplerate=SAMPLE_RATE,
    channels=1,
    dtype="float32",
    device=DEVICE
)

sd.wait()

sf.write(OUTPUT, audio, SAMPLE_RATE)

print(f"✅ Recording saved: {OUTPUT}")