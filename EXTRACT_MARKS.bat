@echo off
title Extract MARKS Premium Data
cd /d E:\quantrexacademy
echo Extracting all MARKS premium content to marks_data folder...
echo This may take 30-60 minutes. Do not close.
if not exist tools mkdir tools
if not exist marks_data mkdir marks_data
copy /Y "C:\Users\Admin\AppData\Local\Temp\marks_token.json" "tools\marks_token.json" 2>nul
python scripts\extract_marks.py
echo.
echo Extraction complete. Check marks_data folder.
pause