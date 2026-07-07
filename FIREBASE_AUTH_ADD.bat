@echo off
title Firebase Auth - Add Vercel Domain
cd /d "%~dp0"

echo ============================================================
echo   FIREBASE AUTH SETUP - quantrexacademy-live
echo   Account: quantrexacademy@gmail.com
echo ============================================================
echo.
echo [STATUS CHECK]
python tools\setup_firebase_auth.py
echo.
echo [STEP 1] Firebase Login (browser)
firebase login
echo.
echo [STEP 2] Add Authorized Domains - browser khulega
echo   Add these domains manually:
echo     quantrexacademy-lemon.vercel.app
echo     quantrexacademy.vercel.app
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/settings
echo.
echo [STEP 3] Enable Email + Google sign-in
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/providers
echo.
echo [STEP 4] Firestore rules deploy
firebase use quantrexacademy-live
firebase deploy --only firestore:rules --non-interactive
echo.
echo [STEP 5] Firebase Hosting (backup URL - auth already works)
echo   https://quantrexacademy-live.web.app
firebase deploy --only hosting --non-interactive
echo.
echo Test login:
echo   https://quantrexacademy-lemon.vercel.app/login
echo   Email: quantrexacademy@gmail.com
echo   Password: function13@
pause