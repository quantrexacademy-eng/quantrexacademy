@echo off
title Quantrex TURBO Deploy (fastest - code only)
cd /d "%~dp0"
echo TURBO: code sync + C: SSD deploy (~20-60 sec)
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-fast.ps1" -Mode code -Bump
if errorlevel 1 ( echo FAILED & pause & exit /b 1 )
echo OK - Ctrl+Shift+R on site
pause