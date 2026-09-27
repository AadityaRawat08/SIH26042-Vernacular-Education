import pyttsx3
import os


class VoiceEngine:

    def __init__(self):

        self.engine = pyttsx3.init()

        self.voices = self.engine.getProperty("voices")

        # Your installed voices
        self.male_voice = self.voices[0].id
        self.female_voice = self.voices[1].id

    def speak(self, text, gender="male", rate=150, volume=1.0):

        if gender == "female":
            self.engine.setProperty("voice", self.female_voice)
        else:
            self.engine.setProperty("voice", self.male_voice)

        self.engine.setProperty("rate", rate)
        self.engine.setProperty("volume", volume)

        print(f"🔊 Speaking ({gender}): {text}")

        self.engine.say(text)
        self.engine.runAndWait()

    def save_audio(self, text, filename, gender="male", rate=150):

        if gender == "female":
            self.engine.setProperty("voice", self.female_voice)
        else:
            self.engine.setProperty("voice", self.male_voice)

        self.engine.setProperty("rate", rate)

        # Make sure folder exists
        folder = os.path.dirname(filename)

        if folder:
            os.makedirs(folder, exist_ok=True)

        print(f"💾 Creating audio: {filename}")

        self.engine.save_to_file(text, filename)
        self.engine.runAndWait()

        print("✅ Audio created!")


if __name__ == "__main__":

    voice = VoiceEngine()

    voice.save_audio(
        "Hello students, open your books.",
        "audio/test_male.wav",
        gender="male"
    )

    voice.save_audio(
        "Good morning students.",
        "audio/test_female.wav",
        gender="female"
    )

    print("\n🎉 Test completed!")