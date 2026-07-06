@echo off
title Quantrex Premium - Login All Services
cd /d "%~dp0"

echo ============================================================
echo   QUANTREX PREMIUM - LOGIN SETUP
echo   Email: quantrexacademy@gmail.com
echo   Password: function13@
echo ============================================================
echo.
echo These services use browser login (password entered in browser).
echo.
echo [1] VERCEL (Website Hosting)
echo     Login with quantrexacademy@gmail.com / function13@
start https://vercel.com/login
vercel login
echo.
echo [2] GITHUB (Code Push)
echo     A browser window will open for device login.
"C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --git-protocol https --web
echo.
echo [3] FIREBASE (Database)
echo     Login with quantrexacademy@gmail.com Google account
firebase login
start https://console.firebase.google.com/project/quantrexacademy-5da32/authentication/providers
start https://console.firebase.google.com/project/quantrexacademy-5da32/authentication/settings
start https://console.firebase.google.com/project/quantrexacademy-5da32/firestore
echo.
echo After login, run deploy.bat to push code and go live.
echo.
pause