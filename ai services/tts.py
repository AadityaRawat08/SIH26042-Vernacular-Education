import pyttsx3


# ==============================
# TTS FUNCTION
# ==============================

def text_to_speech(text, gender="male", output_path=None):

    engine = pyttsx3.init()

    voices = engine.getProperty("voices")

    # Your Windows voices:
    # 0 = Microsoft David (Male)
    # 1 = Microsoft Zira (Female)

    if gender.lower() in ["female", "f"]:
        engine.setProperty("voice", voices[1].id)
    else:
        engine.setProperty("voice", voices[0].id)

    print(f"🔊 Speaking with {gender} voice...")

    # Speak
    engine.say(text)

    # Save if output path is provided
    if output_path:
        engine.save_to_file(text, output_path)

    engine.runAndWait()

    return output_path


# ==============================
# TEST TTS DIRECTLY
# ==============================

if __name__ == "__main__":

    gender = input("Enter gender (male/female): ")

    text = input("Enter text: ")

    text_to_speech(
        text,
        gender=gender
    )