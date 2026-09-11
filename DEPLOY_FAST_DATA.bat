@echo off
title Quantrex FAST Deploy - Data + Code
cd /d "%~dp0"

echo ============================================
echo  QUANTREX FAST DEPLOY (data + code)
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-fast.ps1" -Mode data -Bump
if errorlevel 1 (
  echo DEPLOY FAILED
  pause
  exit /b 1
)
pause