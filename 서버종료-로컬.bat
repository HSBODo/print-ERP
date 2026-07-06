@echo off
title BVIIT Server Shutdown (local)
echo ========================================
echo   BVIIT Analytics Dashboard - Shutdown (local)
echo ========================================
echo.

set FOUND=0
set BACKEND_PORT=18080
set FRONTEND_PORT=15173

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    echo [Backend  :%BACKEND_PORT%] PID %%a kill
    taskkill /PID %%a /T /F >nul 2>&1
    set FOUND=1
)

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    echo [Frontend :%FRONTEND_PORT%] PID %%a kill
    taskkill /PID %%a /T /F >nul 2>&1
    set FOUND=1
)

taskkill /FI "WINDOWTITLE eq Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BVIIT Dashboard (local)" /T /F >nul 2>&1

if %FOUND%==0 (
    echo No running server found.
) else (
    echo.
    echo All servers and terminals stopped.
)

echo ========================================
pause
