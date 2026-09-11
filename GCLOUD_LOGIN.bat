@echo off
title Google Cloud Login - quantrexacademy@gmail.com
cd /d "%~dp0"
echo ============================================
echo  Google Cloud CLI Login
echo  Account: quantrexacademy@gmail.com
echo ============================================
echo.
echo Browser khulega — login karke Allow dabao.
echo.
gcloud auth login quantrexacademy@gmail.com
echo.
echo --- Result ---
gcloud auth list
echo.
pause