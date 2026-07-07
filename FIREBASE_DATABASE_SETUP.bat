@echo off
title Firebase Setup - Quantrex Academy
cd /d "%~dp0"

echo ============================================================
echo   FIREBASE SETUP - quantrexacademy-live
echo   Account: quantrexacademy@gmail.com
echo ============================================================
echo.
echo [1] Login to Firebase (browser)
start https://console.firebase.google.com/project/quantrexacademy-live/overview
firebase login
echo.
echo [2] Enable Authentication providers
echo     - Email/Password: ON
echo     - Google: ON
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/providers
echo.
echo [3] Add Authorized Domains (for Vercel login)
echo     - quantrexacademy-lemon.vercel.app
echo     - quantrexacademy.vercel.app
echo     - localhost
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/settings
echo.
echo [4] Auth + Storage one-click setup
start "" "%~dp0FIREBASE_AUTH_STORAGE_SETUP.bat"
echo.
echo [5] Deploy Firestore + Storage Rules
firebase use quantrexacademy-live
firebase deploy --only firestore:rules,firestore:indexes,storage --non-interactive
echo.
echo [6] Create test user (optional)
echo     Email: quantrexacademy@gmail.com
echo     Password: function13@
start https://console.firebase.google.com/project/quantrexacademy-live/authentication/users
echo.
echo Done! Firebase project: quantrexacademy-live
pause