@echo off
rem Weekly prediction refresh for Task Scheduler (same as the admin page button). The website must be running.
cd /d "%~dp0..\.."
if not defined PREDICTION_FIXTURES_API_URL set "PREDICTION_FIXTURES_API_URL=http://127.0.0.1/api/football/fixtures?type=all&limit=380"
if not exist ml\logs mkdir ml\logs
echo ===== %date% %time% ===== >> ml\logs\weekly-task.log
call npm run predict:weekly >> ml\logs\weekly-task.log 2>&1
