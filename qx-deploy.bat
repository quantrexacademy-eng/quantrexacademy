@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0qx-deploy.ps1" -Target code
) else if /i "%~1"=="nobump" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0qx-deploy.ps1" -Target code -NoBump
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0qx-deploy.ps1" -Target %~1
)
endlocal