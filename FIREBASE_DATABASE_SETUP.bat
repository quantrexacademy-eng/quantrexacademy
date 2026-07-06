@echo off
title Firebase Setup - Quantrex Academy
cd /d "%~dp0"

echo ============================================================
echo   FIREBASE SETUP - quantrexacademy-5da32
echo   Account: quantrexacademy@gmail.com
echo ============================================================
echo.
echo [1] Login to Firebase (browser)
start https://console.firebase.google.com/project/quantrexacademy-5da32/overview
firebase login
echo.
echo [2] Enable Authentication providers
echo     - Email/Password: ON
echo     - Google: ON
start https://console.firebase.google.com/project/quantrexacademy-5da32/authentication/providers
echo.
echo [3] Add Authorized Domains (for Vercel login)
echo     - quantrexacademy-lemon.vercel.app
echo     - quantrexacademy.vercel.app
echo     - localhost
start https://console.firebase.google.com/project/quantrexacademy-5da32/authentication/settings
echo.
echo [4] Deploy Firestore Rules
firebase use quantrexacademy-5da32
firebase deploy --only firestore:rules,firestore:indexes --non-interactive
echo.
echo [5] Create test user (optional)
echo     Email: quantrexacademy@gmail.com
echo     Password: function13@
start https://console.firebase.google.com/project/quantrexacademy-5da32/authentication/users
echo.
echo Done! Firebase project: quantrexacademy-5da32
pause