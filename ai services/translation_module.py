import requests

# =========================================================
# MEMBER 4 TRANSLATION API
# Replace this URL when Member 4 gives you the real API.
# =========================================================
MEMBER4_API_URL = "http://localhost:8000/translate"


def translate_text(
    text,
    source_lang="en",
    target_lang="sat"
):
    """
    Sends text to Member 4's translation API.

    source_lang:
        en = English
        hi = Hindi

    target_lang:
        sat = Santhali
        mun = Mundari
        ho = Ho
    """

    payload = {
        "text": text,
        "source_lang": source_lang,
        "target_lang": target_lang
    }

    try:
        response = requests.post(
            MEMBER4_API_URL,
            json=payload,
            timeout=10
        )

        response.raise_for_status()

        result = response.json()

        # Expected response from Member 4:
        # {
        #     "translated_text": "..."
        # }

        translated_text = result.get("translated_text")

        if not translated_text:
            print("❌ Translation API returned no translated_text")
            print("API response:", result)
            return None

        return translated_text

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Member 4 API.")
        print("⚠️ This is expected until Member 4's server is running.")

    except requests.exceptions.Timeout:
        print("❌ Member 4 API timed out.")

    except requests.exceptions.RequestException as e:
        print("❌ Translation API error:", e)

    except Exception as e:
        print("❌ Unexpected translation error:", e)

    return None


# =========================================================
# TEST
# =========================================================
if __name__ == "__main__":

    print("🔄 Testing Member 4 Translation Module...")

    text = input("Enter text: ")

    translated = translate_text(
        text,
        source_lang="en",
        target_lang="sat"
    )

    if translated:
        print("✅ Translation:", translated)
    else:
        print("⚠️ Translation not available yet.")