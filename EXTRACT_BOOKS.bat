@echo off
cd /d "%~dp0"
echo Extracting MARKS Digital Books (real questions)...
python scripts\extract_marks_selected.py
if errorlevel 1 goto err
echo Importing into Quantrex format...
python scripts\import_books.py
if errorlevel 1 goto err
echo Done! Deploy with: npx vercel --prod --yes
pause
exit /b 0
:err
echo Failed. Check tools\marks_token.json has valid JWT.
pause
exit /b 1