# Prototype Backend

Backend foundation for an **AI-powered Vernacular Education and Real-Time Translation
platform** focused on Indian languages and mother-tongue-based primary education.

Built as a **modular monolith**: one deployable application with clearly separated
domain modules inside a single codebase. No microservices.

## Quick start — full local demo (recommended)

One command starts the entire stack (AI translation :8000, voice service :8001,
backend :8080, frontend :5173):

```powershell
powershell -ExecutionPolicy Bypass -File D:\Prototype\start-all.ps1
```

Then open **http://localhost:5173**. Stop everything with:

```powershell
powershell -ExecutionPolicy Bypass -File D:\Prototype\stop-all.ps1
```

Notes:

* The backend runs in dev mode with an in-memory H2 database (no external
  database needed) and uses the real HTTP providers
  (`TRANSLATION_PROVIDER=http`, `SPEECH_PROVIDER=http`).
* The AI translation service reads its Bhashini key from its own
  `ai translation\member 4\.env` (`BHASHINI_INFERENCE_KEY`). If the key is a
  placeholder, the service runs an **isolated, clearly-labelled demo fallback**
  (`translation_ready: false`, `mode: demo-glossary`) — it never fakes a real
  Bhashini result. Add a real key to that file to enable the live Bhashini path.
* Runtime logs and PIDs are written to `D:\Prototype\.run\logs\`.


## Stack

| Concern      | Technology                              |
|--------------|-----------------------------------------|
| Language     | Java 21 (Temurin LTS)                   |
| Framework    | Spring Boot 3.5                         |
| Build        | Maven                                   |
| Persistence  | PostgreSQL 16 (Spring Data JPA / Hibernate) |
| Security     | Spring Security (stateless; JWT wired in the auth module later) |
| Validation   | Jakarta Bean Validation (`spring-boot-starter-validation`) |
| Docs         | OpenAPI 3 / Swagger UI (springdoc)      |
| Observability| Spring Boot Actuator                    |
| Boilerplate  | Lombok                                  |

## Architecture

```
Controller  ──►  Service  ──►  Repository  ──►  PostgreSQL
    │
    └──► DTOs (never expose JPA entities over REST)
```

* Controllers are thin HTTP adapters; business rules live in services.
* DTOs are Java `record`s. JPA entities stay inside their module and are never
  returned directly to clients.
* External AI/translation providers will be accessed through small interfaces
  (e.g. `TranslationProvider`) so implementations can be swapped.

## Current foundation (module scope)

* Spring Boot application with Maven + Java 21
* Spring Web, Data JPA, Security, Validation, Actuator, OpenAPI/Swagger, Lombok
* `application.yml` — every credential configurable through environment variables
  (see `.env.example`); nothing hardcoded
* Standard API envelopes:
  * success: `ApiResponse<T>` → `{ success, message, data, timestamp }`
  * error: `ErrorResponse` → `{ timestamp, status, error, message, path, fieldErrors }`
* `GlobalExceptionHandler` (`@RestControllerAdvice`) mapping validation failures
  (400), not-found (404), business violations (422), malformed input, and unknown
  errors (500) to the standard error body
* Health endpoints:
  * `GET /api/health` — lightweight liveness + service identity
  * `GET /actuator/health` — full aggregated health (database, disk, …)
* `user` module: `User` entity (`users` table, UUID PK, unique email/username,
  role enum, created/updated timestamps), `UserRepository`, DTOs
  (`UserResponse`, `CreateUserRequest`), and `UserService` — creation, lookups,
  availability checks, duplicate-key business errors, and BCrypt password
  hashing (no plaintext passwords, password excluded from all DTOs)
* `auth` module: registration, login, JWT access tokens, rotating refresh
  tokens, logout, and current-user lookup (see *Authentication endpoints*)

#### Authentication endpoints

| Method | Path                 | Auth   | Description |
|--------|----------------------|--------|-------------|
| POST   | `/api/auth/register` | public | Create account (role forced to `USER`) → safe `UserResponse` |
| POST   | `/api/auth/login`    | public | `{ email, password }` → `{ accessToken, refreshToken, tokenType, expiresIn, user }` |
| POST   | `/api/auth/refresh`  | public | `{ refreshToken }` → new token pair (old token revoked) |
| POST   | `/api/auth/logout`   | Bearer | Revokes all of the caller's refresh tokens |
| GET    | `/api/auth/me`       | Bearer | Safe profile of the authenticated user |

Security model:

* Stateless JWT (HS256) — claims: user id, username, role, `iss`/`iat`/`exp`.
  TTL defaults to 15m (`JWT_ACCESS_TOKEN_TTL`).
* Refresh tokens are opaque 256-bit values stored as SHA-256 hashes in the
  `refresh_tokens` table, rotated on every refresh; reuse of a revoked token
  revokes the user's entire token family (theft detection). TTL default 7d.
* Passwords are BCrypt-hashed; never returned by any API and never logged.
  Login failures always return one generic message (no account-existence leak).
* Everything not listed as public requires a valid Bearer token — future
  modules are protected by default. 401/403 use the standard error body.
* Configuration: `JWT_SECRET` (≥ 32 chars, **required outside local dev**),
  `JWT_ISSUER`, `JWT_ACCESS_TOKEN_TTL`, `JWT_REFRESH_TOKEN_TTL`.
* PostgreSQL dev database via `compose.yaml`
* H2 (PostgreSQL-compatible mode) for tests, so `./mvnw clean test` needs no live database

### Planned modules (built one at a time)

`auth`, `user`, `language`, `translation`, `speech`, `ocr`, `document`,
`dictionary`, `learning`, `resource`, `community`, `search`, `bookmark`,
`history`, `notification`, `feedback`, `moderation`, `admin`, `analytics`

## Prerequisites

* Java 21 (JDK)
* Maven 3.9+
* Docker (only for the local PostgreSQL dev database)

## Quick start

```bash
# 1. Start local PostgreSQL
docker compose up -d

# 2. (Optional) copy the example env file and adjust values
copy .env.example .env

# 3. Run the application (env vars fall back to safe local defaults)
./mvnw spring-boot:run

# 4. Verify
curl http://localhost:8080/api/health
curl http://localhost:8080/actuator/health
```

`mvnw` / `mvnw.cmd` is the Maven Wrapper — it downloads the exact Maven version
(3.9.16) automatically, so no local Maven install is needed. A system `mvn` works
equally well.

## Useful endpoints

| Endpoint                    | Description                          |
|-----------------------------|--------------------------------------|
| `GET /api/health`           | Application liveness check           |
| `GET /actuator/health`      | Full health (DB, disk, …)            |
| `GET /actuator/info`        | Metadata (version, description)      |
| `GET /actuator/metrics`     | Runtime metrics                      |
| `GET /swagger-ui.html`      | Swagger UI                           |
| `GET /v3/api-docs`          | OpenAPI spec (JSON)                  |

## Tests

```bash
./mvnw clean test
```

Tests run against an in-memory H2 database in PostgreSQL compatibility mode,
so no database is required.

## Environment variables

| Variable                      | Default                                  | Purpose                          |
|-------------------------------|------------------------------------------|----------------------------------|
| `SPRING_PROFILES_ACTIVE`      | `local`                                  | Active Spring profile            |
| `DB_URL`                      | `jdbc:postgresql://localhost:5432/prototype` | JDBC URL                   |
| `DB_USERNAME`                 | `prototype`                              | Database user                    |
| `DB_PASSWORD`                 | `prototype`                              | Database password (change in prod) |
| `DB_POOL_MAX_SIZE` / `DB_POOL_MIN_IDLE` | `10` / `2`                    | Hikari pool sizing               |
| `DB_INIT_FAIL_TIMEOUT`        | `1`                                      | Fail fast vs. skip startup DB check |
| `JPA_DDL_AUTO`                | `none`                                   | Hibernate DDL strategy           |
| `SERVER_PORT`                 | `8080`                                   | HTTP port                        |
| `ACTUATOR_HEALTH_SHOW_DETAILS`| `always`                                 | Actuator health detail level     |
| `LOG_LEVEL_ROOT` / `LOG_LEVEL_APP` | `INFO` / `DEBUG`                   | Logging levels                   |

**Security note:** never put real credentials in committed files. Use environment
variables (or a git-ignored `.env`) and keep local defaults weak.

## Coding conventions

* Java 21, records for DTOs, `@RestControllerAdvice` for errors.
* One domain per top-level package under `com.project` (see package layout below).
* Dependencies flow inward: `controller → service → repository`. Never the reverse.
* Interfaces only where they earn their keep (external providers, persistence if
  mocked at boundaries) — no speculative abstraction.
* Write a test with every behavior change; keep `mvn clean test` green.

### Package layout

```
com.project
├── config/        # OpenAPI, and shared configuration
├── security/      # Security filter chain (JWT arrives with the auth module)
├── common/        # Shared DTOs (ApiResponse, ErrorResponse), exceptions, handler
├── health/        # Health-check endpoint
├── auth/          # (planned)
├── user/          # (planned)
└── … more modules planned (see list above)
```