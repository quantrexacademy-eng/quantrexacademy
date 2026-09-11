@echo off
title Quantrex FAST Deploy - Full sync
cd /d "%~dp0"

echo ============================================
echo  QUANTREX FULL SYNC + DEPLOY
echo  Use when figures/assets changed
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-fast.ps1" -Mode all -Bump
if errorlevel 1 (
  echo DEPLOY FAILED
  pause
  exit /b 1
)
pause