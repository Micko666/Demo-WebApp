@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title LabGuard Starter

echo.
echo ===========================================
echo        🧬  LabGuard Startup Script
echo ===========================================
echo.

REM --- Idi u folder skripte ---
cd /d "%~dp0"

REM --- Provjeri Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo ❌ Node.js nije instaliran.
  echo 🔗 Preuzmi sa: https://nodejs.org/en/download
  pause
  exit /b
)

REM --- Prikazi verzije ---
for /f "tokens=* usebackq" %%v in (`node -v`) do set NODE_VER=%%v
for /f "tokens=* usebackq" %%v in (`npm -v`) do set NPM_VER=%%v
echo ✅ Node.js %NODE_VER%
echo ✅ npm %NPM_VER%
echo.

REM --- Provjeri package.json ---
if not exist "package.json" (
  echo ❌ Nije nadjen package.json u %cd%
  echo Pokreni skriptu iz root foldera projekta.
  pause
  exit /b
)

REM --- Instaliraj node_modules ako ne postoje ---
if not exist "node_modules" (
  echo 📦 Instaliram dependencije...
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo ❌ Instalacija nije uspjela.
    pause
    exit /b
  )
) else (
  echo ✅ node_modules već postoji, preskačem instalaciju.
)
echo.

REM --- Pokreni Vite dev server ---
set PORT=5173
echo 🚀 Pokrećem Vite server na http://localhost:%PORT%
start "" http://localhost:%PORT%

echo.
echo (Zatvori prozor da zaustaviš server)
echo -------------------------------------------
echo.

REM Pokreni server unutar istog prozora da se ne zatvori odmah
npm run dev -- --port %PORT%

echo.
echo -------------------------------------------
echo Server je zaustavljen.
pause
endlocal
