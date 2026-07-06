@echo off
setlocal disabledelayedexpansion
title BVIIT Dashboard (local)

set "PROJECT_DIR=%~dp0"
set "BACKEND_PORT=18080"
set "FRONTEND_PORT=15173"
set "SERVER_PORT=%BACKEND_PORT%"
set "VITE_BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "VITE_FRONTEND_PORT=%FRONTEND_PORT%"
set "APP_CORS_ALLOWED_ORIGINS=http://localhost:%FRONTEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"

echo Starting BVIIT Dashboard (local profile)...
echo.

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    taskkill /PID %%a /T /F >nul 2>&1
)

set "BOOT_PROFILE=local"
set "BOOT_PROFILE_LABEL=local"

if not defined APP_JWT_SECRET set "APP_JWT_SECRET=bviit-analytics-local-launch-secret-key-%RANDOM%-%RANDOM%"
if not defined APP_SEED_ENABLED set "APP_SEED_ENABLED=true"
if not defined APP_SEED_ADMIN_LOGIN_ID set "APP_SEED_ADMIN_LOGIN_ID=admin"
if not defined APP_SEED_ADMIN_PASSWORD set "APP_SEED_ADMIN_PASSWORD=Local-%RANDOM%-%RANDOM%"

echo Backend : http://localhost:%BACKEND_PORT%
powershell -NoProfile -Command "Write-Host 'Frontend: ' -NoNewline; Write-Host $env:FRONTEND_URL -ForegroundColor Blue"
echo Profile : %BOOT_PROFILE_LABEL%
if /I "%APP_SEED_ENABLED%"=="true" echo Login   : %APP_SEED_ADMIN_LOGIN_ID% / %APP_SEED_ADMIN_PASSWORD%
echo.
echo Backend logs open in a separate window.
echo Frontend runs here. Only errors will be shown.
echo.
echo [NOTE] local profile requires local Docker Postgres running.
echo        docker compose --profile mart up -d
echo.

start "Backend" /D "%PROJECT_DIR%backend" cmd /k "gradlew.bat bootRun --args=--spring.profiles.active=local"

cd /d "%PROJECT_DIR%frontend"
if exist "%PROJECT_DIR%frontend\node_modules\vite\bin\vite.js" (
    node "%PROJECT_DIR%frontend\node_modules\vite\bin\vite.js" --logLevel error
) else (
    npm run dev -- --logLevel error
)
