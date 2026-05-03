$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Stop-ListenersOnPort([int]$Port) {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      if ($_ -and $_ -ne 0) {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
      }
    }
}

Write-Host "Using PostgreSQL from .env (local server; no Docker DB)." -ForegroundColor Cyan

Write-Host "Freeing dev ports 3000 (web) and 2745 (api) if still in use..." -ForegroundColor DarkGray
Stop-ListenersOnPort 2745
Stop-ListenersOnPort 3000

$projectPath = $PSScriptRoot.Replace("'", "''")

Write-Host "Launching API dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$projectPath'; npm run dev:api"
)

Write-Host "Launching Web dev server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$projectPath'; npm run dev:web"
)

Write-Host "Done. API and Web run locally (ensure Postgres is running and .env is configured)." -ForegroundColor Green
