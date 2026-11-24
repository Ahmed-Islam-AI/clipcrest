@echo off
title ClipCrest
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"
echo.
echo   ClipCrest has stopped. Press any key to close this window.
pause >nul
