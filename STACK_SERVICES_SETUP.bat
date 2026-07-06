@echo off
title Quantrex - All Services Setup
cd /d "%~dp0"

echo ============================================================
echo   QUANTREX STACK — 5 SERVICES SETUP
echo   Account: quantrexacademy@gmail.com
echo ============================================================
echo.

echo [1] Firebase Authentication
echo     Enable: Email/Password + Google
start https://console.firebase.google.com/project/quantrexacademy-5da32/authentication/providers
echo.

echo [2] Firebase Firestore
echo     Rules deployed via CLI
start https://console.firebase.google.com/project/quantrexacademy-5da32/firestore
echo.

echo [3] Firebase Storage
echo     Click Get Started, then deploy rules
start https://console.firebase.google.com/project/quantrexacademy-5da32/storage
echo.

echo [4] Cloudflare Stream (Videos)
echo     Upload videos, copy customer code to stack-config.js
start https://dash.cloudflare.com/?to=/:account/stream
echo.

echo [5] Cashfree (Payments)
echo     Get sandbox keys, add to Vercel env variables
start https://merchant.cashfree.com/merchants/login
start https://vercel.com/ajay-kumar-saroj-s-projects/quantrexacademy/settings/environment-variables
echo.

echo Deploying Firebase rules...
firebase use quantrexacademy-5da32
firebase deploy --only firestore:rules,storage --non-interactive 2>nul
echo.
echo Config files:
echo   stack-config.js     — all service settings
echo   .env.example        — Vercel env variable names
echo.
pause