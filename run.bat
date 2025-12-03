@echo off
setlocal ENABLEDELAYEDEXPANSION
title LabGuard Starter

REM ==== ROOT PROJEKTA ====
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ================================
echo   LabGuard - dev pokretanje
echo ================================
echo.

REM ==== NODE/NPM PROVJERA ====
where node >nul 2>nul || (
  echo [GRESKA] Node.js nije instaliran.
  pause
  exit /b 1
)
where npm >nul 2>nul || (
  echo [GRESKA] npm nije nadjen.
  pause
  exit /b 1
)

REM ==== FRONTEND DEPENDENCIES ====
if not exist "node_modules" (
  echo Instaliram frontend dependencije...
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo [GRESKA] Instalacija frontenda nije uspjela.
    pause
    exit /b 1
  )
) else (
  echo node_modules postoji - preskacem instalaciju.
)

echo.

REM ==== PYTHON / PIP ====
set "PYTHON="
where py >nul 2>nul && set "PYTHON=py"
where python >nul 2>nul && set "PYTHON=python"

if "%PYTHON%"=="" (
  echo [GRESKA] Python nije pronadjen u PATH-u.
  pause
  exit /b 1
)

if exist "AI - Bot\\requirements.txt" (
  echo Instaliram backend dependencije...
  %PYTHON% -m pip install -r "AI - Bot\\requirements.txt"
)

echo.

REM ==== BACKEND (NOVI PROZOR) ====
echo Pokrecem LabGuard backend...
start "LabGuard backend" /D "%ROOT%AI - Bot" %PYTHON% -m uvicorn app:app --reload

REM ==== FRONTEND (OVAJ PROZOR) ====
if "%PORT%"=="" set PORT=5173

echo.
echo Pokrecem frontend na http://localhost:%PORT% ...
start "" "http://localhost:%PORT%"

call npm run dev -- --port %PORT%

echo.
echo Frontend je zavrsen. Zatvori i prozor "LabGuard backend" ako jos radi.
pause
endlocal
