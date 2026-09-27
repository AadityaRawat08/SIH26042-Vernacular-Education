# =============================================================================
# stop-all.ps1 — stop the complete SIH demo stack
#
# Stops the processes listening on the demo ports (8080 backend, 8000 AI
# translation, 8001 voice, 5173 frontend). Only those four ports are touched,
# so nothing else on the machine is affected.
#
# Usage:  powershell -ExecutionPolicy Bypass -File D:\Prototype\stop-all.ps1
# =============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$RunDir = Join-Path $PSScriptRoot '.run'

$ports = 5173, 8000, 8001, 8080
$names = @{ 5173 = 'Frontend'; 8000 = 'AI translation'; 8001 = 'Voice service'; 8080 = 'Backend' }

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
             Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $conns) {
        if ($procId -and $procId -ne 0) {
            $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($p) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host ("Stopped {0} (pid {1}, port {2})" -f $names[$port], $procId, $port) -ForegroundColor Green
            }
        }
    }
}

# Also stop any cmd.exe wrappers recorded by start-all.ps1
if (Test-Path $RunDir) {
    Get-ChildItem -Path $RunDir -Filter '*.pid' | ForEach-Object {
        $procId = Get-Content $_.FullName -ErrorAction SilentlyContinue
        if ($procId) {
            $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($p -and $p.ProcessName -in @('cmd', 'java', 'python', 'node')) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host ("Stopped leftover {0} wrapper (pid {1})" -f $p.ProcessName, $procId) -ForegroundColor Green
            }
        }
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Host 'All demo services stopped.' -ForegroundColor Cyan
