@echo off
rem One-time setup of the AI prediction system (ml/.venv) on the faculty VM. Needs Python 3.11.
title Setup AI prediction (ml/.venv)
cd /d "%~dp0..\..\ml"

py -3.11 --version >nul 2>&1
if errorlevel 1 (
  echo Python 3.11 not found. Install it from python.org first ^(tick "Add python.exe to PATH"^).
  pause
  exit /b 1
)

if not exist .venv\Scripts\python.exe (
  echo Creating ml\.venv ...
  py -3.11 -m venv .venv || goto :failed
)

echo Installing libraries ^(5-10 minutes the first time^) ...
.venv\Scripts\python.exe -m pip install --upgrade pip || goto :failed
.venv\Scripts\python.exe -m pip install -r ..\prediction-service\requirements.txt || goto :failed

echo Running ml tests ^(expect: 72 passed, 6 xfailed^) ...
.venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
echo.
echo Setup finished.
pause
exit /b 0

:failed
echo.
echo Setup FAILED - send the error above.
pause
exit /b 1
