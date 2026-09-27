# =============================================================================
# start-all.ps1 — start the complete SIH demo stack
#
#   1. AI translation service (FastAPI/Bhashini)  -> http://localhost:8000
#   2. Voice service (FastAPI STT/TTS adapter)    -> http://localhost:8001
#   3. Spring Boot backend                        -> http://localhost:8080
#   4. Frontend (TanStack Start dev server)       -> http://localhost:5173
#
# Secrets are NOT set here. The AI translation service reads its own
# "ai translation\member 4\.env" (BHASHINI_INFERENCE_KEY) — keep it local.
#
# Usage:  powershell -ExecutionPolicy Bypass -File D:\Prototype\start-all.ps1
#         optional: -SkipBuild  (reuse the existing backend jar)
# =============================================================================
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
if (-not $Root) { $Root = 'D:\Prototype' }

$LogDir = Join-Path $Root '.run\logs'
$RunDir = Join-Path $Root '.run'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $RunDir  | Out-Null

function Write-Step($msg)  { Write-Host ("==> " + $msg) -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host ("    " + $msg) -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host ("    " + $msg) -ForegroundColor Yellow }

function Test-PortInUse([int]$Port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Start-ServiceProcess {
    param(
        [string]$Name, [string]$WorkingDir, [string]$Command,
        [int]$Port, [string]$LogName
    )
    if (Test-PortInUse $Port) {
        Write-Warn2 ("{0}: port {1} already in use — assuming already running." -f $Name, $Port)
        return
    }
    $out = Join-Path $LogDir ($LogName + '.out.log')
    $err = Join-Path $LogDir ($LogName + '.err.log')
    $proc = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList '/c', ($Command + ' > "' + $out + '" 2> "' + $err + '"') `
        -WorkingDirectory $WorkingDir -PassThru -WindowStyle Hidden
    Set-Content -Path (Join-Path $RunDir ($LogName + '.pid')) -Value $proc.Id
    Write-Ok ("{0} starting (port {1}, pid {2})." -f $Name, $Port, $proc.Id)
}

# ---------------------------------------------------------------- 1. AI translation
Write-Step '1/4  AI translation service (Bhashini FastAPI) on :8000'
$aiDir = Join-Path $Root 'ai translation\member 4'
if (Test-Path (Join-Path $aiDir 'translation_api.py')) {
    $env:PYTHONIOENCODING = 'utf-8'
    Start-ServiceProcess -Name 'AI translation' -WorkingDir $aiDir -Port 8000 -LogName 'ai-translation' `
        -Command 'python -m uvicorn translation_api:app --host 127.0.0.1 --port 8000'
    Remove-Item env:PYTHONIOENCODING -ErrorAction SilentlyContinue
} else {
    Write-Warn2 "translation_api.py not found at $aiDir — skipping."
}

# ---------------------------------------------------------------- 2. Voice service
Write-Step '2/4  Voice service (STT/TTS FastAPI) on :8001'
$voiceDir = Join-Path $Root 'ai services'
if (Test-Path (Join-Path $voiceDir 'voice_api.py')) {
    $env:PYTHONIOENCODING = 'utf-8'
    Start-ServiceProcess -Name 'Voice service' -WorkingDir $voiceDir -Port 8001 -LogName 'voice' `
        -Command 'python -m uvicorn voice_api:app --host 127.0.0.1 --port 8001'
    Remove-Item env:PYTHONIOENCODING -ErrorAction SilentlyContinue
} else {
    Write-Warn2 "voice_api.py not found at $voiceDir — skipping."
}

# ---------------------------------------------------------------- 3. Spring Boot backend
Write-Step '3/4  Spring Boot backend on :8080'
$Jar = Join-Path $Root 'target\prototype-backend-0.1.0-SNAPSHOT.jar'
if (-not (Test-Path $Jar) -and -not $SkipBuild) {
    Write-Host '    Building backend jar (mvnw -DskipTests package)...' -ForegroundColor DarkGray
    Push-Location $Root
    & .\mvnw.cmd -q -o -DskipTests package 2>&1 | Out-Null
    Pop-Location
}
if (Test-Path $Jar) {
    # Dev profile: in-memory H2 (no external database needed for the demo).
    $env:DB_URL = 'jdbc:h2:mem:prototype;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL'
    $env:DB_DRIVER = 'org.h2.Driver'
    $env:DB_USERNAME = 'sa'
    $env:DB_PASSWORD = ''
    $env:JPA_DDL_AUTO = 'update'
    $env:TRANSLATION_PROVIDER = 'http'
    $env:SPEECH_PROVIDER = 'http'
    $env:AI_TRANSLATION_BASE_URL = 'http://localhost:8000'
    $env:VOICE_SERVICE_BASE_URL = 'http://localhost:8001'
    $env:CORS_ALLOWED_ORIGINS = 'http://localhost:5173'
    $env:JWT_SECRET = 'development-only-secret-change-me'
    Start-ServiceProcess -Name 'Backend' -WorkingDir $Root -Port 8080 -LogName 'backend' `
        -Command ('java -jar "' + $Jar + '"')
} else {
    Write-Warn2 'Backend jar not available — start the backend manually.'
}

# ---------------------------------------------------------------- 4. Frontend
Write-Step '4/4  Frontend (TanStack Start dev server) on :5173'
$feDir = Join-Path $Root 'FrontEnd'
if (-not (Test-Path (Join-Path $feDir 'package.json'))) {
    Write-Warn2 "FrontEnd not found at $feDir — skipping."
} else {
    Start-ServiceProcess -Name 'Frontend' -WorkingDir $feDir -Port 5173 -LogName 'frontend' `
        -Command 'npm run dev'
}

# ---------------------------------------------------------------- Health checks
Write-Step 'Waiting for services to come up...'
$targets = @(
    @{ Name = 'AI translation'; Url = 'http://127.0.0.1:8000/' },
    @{ Name = 'Voice service';  Url = 'http://127.0.0.1:8001/' },
    @{ Name = 'Backend';        Url = 'http://localhost:8080/api/health' },
    @{ Name = 'Frontend';       Url = 'http://localhost:5173/' }
)
foreach ($t in $targets) {
    $up = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $t.Url -TimeoutSec 3 -UseBasicParsing
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $up = $true; break }
        } catch { Start-Sleep -Seconds 2 }
    }
    if ($up) { Write-Ok  ("{0} is UP   ({1})" -f $t.Name, $t.Url) }
    else     { Write-Warn2 ("{0} did NOT respond within 60s — check {1}\logs\*.log" -f $t.Name, $RunDir) }
}

Write-Host ''
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ' SIH demo stack started.' -ForegroundColor Cyan
Write-Host ' Open the app:  http://localhost:5173' -ForegroundColor White
Write-Host ' Stop:  powershell -ExecutionPolicy Bypass -File D:\Prototype\stop-all.ps1'
Write-Host '======================================================' -ForegroundColor Cyan
