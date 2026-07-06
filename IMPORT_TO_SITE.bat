@echo off
title Import MARKS Data to Quantrex Website
cd /d E:\quantrexacademy
echo Converting MARKS data to Quantrex website format...
python scripts\import_to_quantrex.py
echo Done. Run deploy.bat to publish.
pause