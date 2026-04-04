# start.ps1
$ErrorActionPreference = "Stop"

$RootDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir   = Join-Path $RootDir "backend"
$VenvActivate = Join-Path $BackendDir ".venv\Scripts\Activate.ps1"
$StaticDir    = Join-Path $BackendDir "app\static"

if (-not (Test-Path $VenvActivate)) {
    Write-Host "[!] venv not found. Run .\install.ps1 first." -ForegroundColor Yellow
    exit 1
}

$staticFiles = Get-ChildItem $StaticDir -ErrorAction SilentlyContinue
if (-not $staticFiles) {
    Write-Host "[!] Frontend build missing. Run .\install.ps1 first." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  DIALOGUE ENGINE - Starting..." -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

& $VenvActivate
Set-Location $BackendDir
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
