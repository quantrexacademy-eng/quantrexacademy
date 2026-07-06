@echo off
title Quantrex - GitHub Setup
cd /d "%~dp0"

echo ============================================
echo  GITHUB SETUP for Quantrex Premium
echo  Account: quantrexacademy@gmail.com
echo ============================================
echo.
echo Step 1: Login to GitHub (browser will open)
echo Use email: quantrexacademy@gmail.com
echo Password: function13@
echo.
pause

"C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --git-protocol https --web

echo.
echo Step 2: Create repository (if not exists)
"C:\Program Files\GitHub CLI\gh.exe" repo create quantrexacademy --public --source=. --remote=origin --push 2>nul
if errorlevel 1 (
  echo Repo may already exist. Pushing to origin...
  git remote set-url origin https://github.com/quantrexacademy-eng/quantrexacademy.git
  git branch -M main
  git push -u origin main
)

echo.
echo Step 3: Verify
"C:\Program Files\GitHub CLI\gh.exe" auth status
"C:\Program Files\GitHub CLI\gh.exe" repo view --web 2>nul

echo.
echo Done! GitHub: https://github.com/quantrexacademy-eng/quantrexacademy
pause