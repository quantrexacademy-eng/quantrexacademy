@echo off
title Quantrex FAST Deploy (Firebase)
cd /d "%~dp0"

echo ============================================
echo  QUANTREX FAST DEPLOY
echo  Code/CSS/JS changes only (~30-90 sec)
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-fast.ps1" -Mode code -Bump
if errorlevel 1 (
  echo.
  echo DEPLOY FAILED
  pause
  exit /b 1
)

echo.
echo OK - hard refresh site: Ctrl+Shift+R
pause