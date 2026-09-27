# Local Prototype Runbook (no Bhashini key required)

All services start WITHOUT a real BHASHINI_INFERENCE_KEY.
Missing-key responses are controlled errors, never crashes.

## Ports

| Service      | Port | Health / docs |
|--------------|------|---------------|
| Frontend     | 5173 | http://localhost:5173/ |
| Spring Boot  | 8080 | http://localhost:8080/api/health |
| AI translate | 8000 | http://localhost:8000/ + docs http://localhost:8000/docs |
| Voice        | 8001 | http://localhost:8001/ + docs http://localhost:8001/docs |

## 1. Start aitranslation (port 8000)

```bat
cd /d "D:\Prototype\ai translation\member 4"
python -m uvicorn translation_api:app --host 0.0.0.0 --port 8000
```

Requires (already installed): fastapi, uvicorn, python-dotenv, requests
(see `requirements.txt` in that folder).

Without a key, GET / returns translation_ready=false and
POST /translate returns {"success": false, "error": "Translation service is not configured"}.

## 2. Start voiceservices (port 8001)

```bat
cd /d "D:\Prototype\ai services"
set TRANSLATION_SERVICE_BASE_URL=http://localhost:8000
python -m uvicorn voice_api:app --host 0.0.0.0 --port 8001
```

Requires: fastapi, uvicorn, python-multipart, requests
(see `requirements.txt` in that folder).
STT/TTS extras (SpeechRecognition, sounddevice, scipy, pyttsx3, numpy)
are optional — the service imports them lazily and degrades gracefully.
Missing-key translation failures return structured 502s, never crashes.

## 3. Start Spring Boot backend (port 8080)

Needs the rebuilt JAR (already built):

```bat
cd /d D:\Prototype
start-backend-prototype.bat
```

That script sets (H2 in-memory so no PostgreSQL needed for the prototype):
  DB_URL=jdbc:h2:mem:prototype;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL
  DB_DRIVER=org.h2.Driver
  DB_USERNAME=sa, DB_PASSWORD=(empty), JPA_DDL_AUTO=update
  TRANSLATION_PROVIDER=http, SPEECH_PROVIDER=http
  AI_TRANSLATION_BASE_URL=http://localhost:8000
  VOICE_SERVICE_BASE_URL=http://localhost:8001
  CORS_ALLOWED_ORIGINS=http://localhost:5173

Rebuild after code changes with:
```bat
cd /d D:\Prototype
.\mvnw.cmd -q -DskipTests package
```

## 4. Start Frontend (port 5173)

```bat
cd /d D:\Prototype\FrontEnd
npm run dev
```

Backend URL comes from FrontEnd/.env:
  VITE_API_BASE_URL=http://localhost:8080

## Notes

- H2 in-memory is used ONLY so the prototype runs without PostgreSQL/Supabase.
  Data resets on backend restart. No schema or persistence code was changed.
- pom.xml: H2 scope changed test->runtime (needed for the in-memory fallback JAR).
- application.yml: datasource driver-class-name made overridable via DB_DRIVER
  (default still org.postgresql.Driver — production behavior unchanged).
- Frontend fix: node_modules/enhanced-resolve was a broken partial install;
  reinstalled enhanced-resolve@5.18.3 so `npm run dev` works.
