@echo off
title Quantrex - Firebase Hosting + Functions
cd /d "%~dp0"
echo Deploying website + /api functions for www and Play app...
echo Project: quantrexacademy-app
echo Preview first: npm run deploy:firebase:preview
echo.
call npx firebase-tools deploy --only hosting,functions --project quantrexacademy-app --non-interactive
if errorlevel 1 (
  echo.
  echo Deploy failed. Enable Blaze on quantrexacademy-app and run firebase login.
  pause
  exit /b 1
)
echo.
echo Preview URL: https://quantrexacademy-app.web.app
echo Do not switch Godaddy DNS until preview login + images + pay work.
pause
