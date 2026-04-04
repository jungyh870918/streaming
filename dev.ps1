# dev.ps1 - Dev mode (backend :8000 + frontend hot-reload :5173)
$RootDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir   = Join-Path $RootDir "backend"
$FrontendDir  = Join-Path $RootDir "frontend"
$VenvActivate = Join-Path $BackendDir ".venv\Scripts\Activate.ps1"

Write-Host "[DEV] Backend :8000 + Frontend :5173" -ForegroundColor Cyan
Write-Host "Close this window or press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

$backendCmd = "& '$VenvActivate'; Set-Location '$BackendDir'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Set-Location $FrontendDir
npm run dev
