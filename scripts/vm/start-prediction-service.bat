@echo off
rem Starts prediction-service on 127.0.0.1:8000 (only this machine can reach it). Keep the window open.
title Prediction service (do not close)
cd /d "%~dp0..\..\prediction-service"
rem The website serves the fixtures/results API on port 80 on the VM.
if not defined PREDICTION_FIXTURES_API_URL set "PREDICTION_FIXTURES_API_URL=http://127.0.0.1/api/football/fixtures?type=all&limit=380"
echo Prediction service on http://127.0.0.1:8000  (do not close this window)
"..\ml\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
