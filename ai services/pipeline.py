from stt import record_audio, speech_to_text
from translation_module import translate_text
from tts import text_to_speech


def run_full_pipeline():

    print("\n==============================")
    print("   MEMBER 5 VOICE PIPELINE")
    print("==============================")

    # 1️⃣ Record voice
    audio_file = record_audio()

    # 2️⃣ Speech → Text
    text = speech_to_text(audio_file)

    if not text:
        print("❌ No text detected.")
        return

    # 3️⃣ Text → Translation
    print("\n🌐 Sending text to Member 4...")

    translated_text = translate_text(
        text,
        source_lang="en",
        target_lang="sat"
    )

    if not translated_text:
        print("⚠️ Translation not available yet.")
        return

    print("✅ Translation:", translated_text)

    # 4️⃣ Translation → Speech
    print("\n🔊 Creating audio...")

    text_to_speech(
        translated_text,
        output_path="pipeline_output.mp3"
    )

    print("\n🎉 PIPELINE COMPLETE!")
    print("🔊 Audio saved as: pipeline_output.mp3")
    import os

    os.startfile("pipeline_output.mp3")


if __name__ == "__main__":
    run_full_pipeline()