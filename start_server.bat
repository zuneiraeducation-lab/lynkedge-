@echo off
title LynkEdge Web Server
cd /d "%~dp0"
echo ======================================================
echo   Starting LynkEdge Web Server...
echo ======================================================
echo.
echo Opening browser...
start http://localhost:8080/login
echo.
echo Server is running! Keep this window open.
echo Press Ctrl+C or close this window to stop the server.
echo.
python server.py
pause
