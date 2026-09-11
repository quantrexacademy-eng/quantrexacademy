@echo off
title Quantrex Deploy - Test Series + PYQ + Banks
cd /d "%~dp0"

echo ============================================
echo  DEPLOY TEST SERIES + PYQ + DPP DATA
echo  Syncs banks, quizrr, nav (~400MB)
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-fast.ps1" -Mode tests -Bump
if errorlevel 1 (
  echo DEPLOY FAILED
  pause
  exit /b 1
)
echo.
echo Test Series, PYQ Mock, DPP should work now.
pause