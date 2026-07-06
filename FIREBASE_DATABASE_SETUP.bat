@echo off
title Firebase Database Setup - Quantrex Premium
echo.
echo FIREBASE DATABASE (Firestore) Setup
echo Project: quantrex-premimum
echo.
echo Step 1: Open Firestore Database
start https://console.firebase.google.com/project/quantrex-premimum/firestore
echo.
echo Step 2: Open Firestore Rules (paste firestore.rules content)
start https://console.firebase.google.com/project/quantrex-premimum/firestore/rules
echo.
echo Step 3: Open Authentication
start https://console.firebase.google.com/project/quantrex-premimum/authentication/providers
echo.
echo Rules file: %~dp0firestore.rules
echo.
echo Database structure:
echo   users/{uid}              - user profile
echo   users/{uid}/data/progress - bookmarks, solved, notes
echo   app/meta                 - app info
echo.
pause