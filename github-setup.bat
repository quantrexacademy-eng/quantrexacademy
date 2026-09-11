@echo off
title Quantrex - GitHub (no passwords in this file)
cd /d "%~dp0"

echo ============================================
echo  GitHub remote for QUANTREX\website
echo  Repo should be PRIVATE
echo  Website + Android app share this tree
echo ============================================
echo.
echo Sign in with GitHub CLI if needed:
echo   gh auth login --hostname github.com --git-protocol https --web
echo.
echo Then (once):
echo   git remote add origin https://github.com/quantrexacademy-eng/quantrexacademy.git
echo   git branch -M main
echo   git push -u origin main
echo.
echo Never commit .env, data/marks_config.json, or harvest passwords.
echo Source of truth stays this USB folder, not Desktop.
pause
