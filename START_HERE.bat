@echo off
title Quantrex Academy - USB Workspace
cd /d E:\quantrexacademy
color 0B
echo.
echo  ============================================================
echo    QUANTREX ACADEMY - USB WORKSPACE (E:\quantrexacademy)
echo  ============================================================
echo.
echo   [1] Extract MARKS Premium Data
echo   [2] Import Data to Website
echo   [3] Deploy Website (Vercel)
echo   [4] Firebase Database Setup
echo   [5] Login All Services
echo   [6] Open Website Locally
echo   [0] Exit
echo.
set /p choice=Enter choice (1-6): 

if "%choice%"=="1" call EXTRACT_MARKS.bat
if "%choice%"=="2" call IMPORT_TO_SITE.bat
if "%choice%"=="3" call deploy.bat
if "%choice%"=="4" call FIREBASE_DATABASE_SETUP.bat
if "%choice%"=="5" call LOGIN_ALL.bat
if "%choice%"=="6" start index.html
pause