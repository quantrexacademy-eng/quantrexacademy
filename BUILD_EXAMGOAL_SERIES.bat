@echo off
echo [1/3] Fetch new tests from ExamGoal API...
python "%~dp0tools\examgoal_extract_test_series.py"
if errorlevel 1 (
  echo Extraction failed - using existing Google Drive data
)
echo [2/3] Build Quantrex catalog from Drive data...
node "%~dp0tools\examgoal_build_series.js"
echo [3/3] Deploy to Firebase...
powershell -File "%~dp0scripts\deploy-fast.ps1" -Mode data
echo Done. Open: https://quantrexacademy-live.web.app/examgoal-test-series.html
pause