@echo off
title Firebase Auth + Storage Setup - quantrexacademy-live
cd /d "%~dp0"

echo ============================================================
echo   FIREBASE AUTH + STORAGE SETUP
echo   Project: quantrexacademy-live
echo   Account: quantrexacademy@gmail.com
echo ============================================================
echo.
echo STEP A - Authentication (browser)
echo   1. Click "Get Started" if shown
echo   2. Enable Email/Password + Google
echo   3. Add authorized domain: quantrexacademy-lemon.vercel.app
echo.
start https://console.firebase.google.com/project/quantrexacademy-live/authentication
timeout /t 2 >nul
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/providers
timeout /t 2 >nul
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/settings
timeout /t 2 >nul
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/users
echo.
echo STEP B - Storage (browser)
echo   1. Click "Get Started"
echo   2. Choose location: asia-south1 (Mumbai)
echo   3. Use default security rules, then Finish
echo.
start https://console.firebase.google.com/project/quantrexacademy-live/storage
echo.
echo STEP C - Deploy rules from this PC
firebase use quantrexacademy-live
firebase deploy --only firestore:rules,storage --non-interactive
echo.
echo STEP D - Add test user (if not done in console)
echo   Email: quantrexacademy@gmail.com
echo   Password: function13@
echo.
echo Test login:
echo   https://quantrexacademy-lemon.vercel.app/login
echo   https://quantrexacademy-live.web.app/login
echo.
pause