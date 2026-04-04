# install.ps1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  DIALOGUE ENGINE - Install" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$RootDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$VenvDir     = Join-Path $BackendDir ".venv"
$VenvActivate = Join-Path $VenvDir "Scripts\Activate.ps1"

# [1/3] Python venv
Write-Host "[1/3] Setting up Python virtual environment..." -ForegroundColor Yellow
Set-Location $BackendDir

if (-not (Test-Path $VenvDir)) {
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) {
        Write-Host "[ERROR] Python not found. Install from https://www.python.org" -ForegroundColor Red
        exit 1
    }
    python -m venv .venv
    Write-Host "  venv created." -ForegroundColor Gray
}

if (-not (Test-Path $VenvActivate)) {
    Write-Host "[ERROR] Cannot find: $VenvActivate" -ForegroundColor Red
    exit 1
}

& $VenvActivate
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
Write-Host "[OK] Python packages installed." -ForegroundColor Green

# [2/3] Node.js check
Write-Host ""
Write-Host "[2/3] Checking Node.js..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
$nodeVer = node -v
Write-Host "[OK] Node.js $nodeVer found." -ForegroundColor Green

# [3/3] Frontend build
Write-Host ""
Write-Host "[3/3] Building frontend..." -ForegroundColor Yellow
Set-Location $FrontendDir
npm install --silent
npm run build --silent
Write-Host "[OK] Frontend build complete." -ForegroundColor Green

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  Done! Run .\start.ps1 to launch." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
