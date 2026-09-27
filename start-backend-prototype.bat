@echo off
set DB_URL=jdbc:h2:mem:prototype;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL
set DB_DRIVER=org.h2.Driver
set DB_USERNAME=sa
set DB_PASSWORD=
set JPA_DDL_AUTO=update
set TRANSLATION_PROVIDER=http
set SPEECH_PROVIDER=http
set AI_TRANSLATION_BASE_URL=http://localhost:8000
set VOICE_SERVICE_BASE_URL=http://localhost:8001
set CORS_ALLOWED_ORIGINS=http://localhost:5173
set JWT_SECRET=development-only-secret-change-me
java -jar D:\Prototype\target\prototype-backend-0.1.0-SNAPSHOT.jar
