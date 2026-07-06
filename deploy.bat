@echo off
title Quantrex Deploy - GitHub + Vercel + Firebase
cd /d "%~dp0"

echo ============================================
echo  QUANTREX STACK
echo  GitHub  = Code push / version control
echo  Vercel  = Website hosting (live site)
echo  Firebase = Login + Database (Firestore)
echo ============================================
echo.

set MSG=Update Quantrex Academy
if not "%~1"=="" set MSG=%~1

echo [1/3] Git commit...
git add .
git commit -m "%MSG%" 2>nul
if errorlevel 1 echo No new changes to commit.

echo [2/3] Push to GitHub...
git push origin main
if errorlevel 1 (
  echo GitHub push failed. Use GitHub Desktop or add a Personal Access Token.
  echo Repo: https://github.com/quantrexacademy-eng/quantrexacademy
) else (
  echo GitHub push OK.
)

echo [3/3] Deploy website to Vercel...
vercel whoami >nul 2>&1
if errorlevel 1 (
  echo Vercel not logged in. Opening login...
  start https://vercel.com/login
  vercel login
)
call vercel --prod --yes
if errorlevel 1 (
  echo Vercel deploy failed. Run LOGIN_ALL.bat first.
) else (
  echo Website live at: https://quantrexacademy-lemon.vercel.app
)

echo.
echo Firebase database runs automatically from the website.
echo Project: quantrex-premimum
echo Console: https://console.firebase.google.com/project/quantrex-premimum
echo.
pause