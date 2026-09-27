import sounddevice as sd
import numpy as np

print("🎤 Speak for 5 seconds...")

sample_rate = 44100
duration = 5

audio = sd.rec(
    int(duration * sample_rate),
    samplerate=sample_rate,
    channels=1,
    dtype="float32"
)

sd.wait()

audio = audio.flatten()

# Remove very quiet/background parts
audio = audio[np.abs(audio) > 0.01]

if len(audio) == 0:
    print("❌ No voice detected.")
    exit()

# Estimate fundamental frequency (pitch)
autocorr = np.correlate(audio, audio, mode="full")
autocorr = autocorr[len(autocorr)//2:]

# Human speech pitch range
min_freq = 80
max_freq = 300

min_lag = int(sample_rate / max_freq)
max_lag = int(sample_rate / min_freq)

peak = np.argmax(autocorr[min_lag:max_lag]) + min_lag

pitch = sample_rate / peak

print(f"🎵 Estimated pitch: {pitch:.1f} Hz")

if pitch < 165:
    print("👨 Likely male voice")
else:
    print("👩 Likely female voice")