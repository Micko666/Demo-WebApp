@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: --- NE KORISTI EMOJI, NE UTF-8 BOM ---
title LabGuard Starter

:: 1) Idi u folder skripte
cd /d "%~dp0"

:: 2) Provjeri da li postoje node i npm
where node >nul 2>nul || (
  echo [Greska] Node.js nije instaliran. Preuzmi sa: https://nodejs.org/en/download
  pause
  exit /b 1
)
where npm >nul 2>nul || (
  echo [Greska] npm nije pronadjen. Instaliraj Node.js koji sadrzi npm.
  pause
  exit /b 1
)

:: 3) Prikazi verzije
for /f "tokens=* usebackq" %%v in (`node -v`) do set NODE_VER=%%v
for /f "tokens=* usebackq" %%v in (`npm -v`) do set NPM_VER=%%v
echo Node.js: %NODE_VER%
echo npm: %NPM_VER%
echo.

:: 4) Da li smo u root-u projekta?
if not exist "package.json" (
  echo [Greska] Nije nadjen package.json u: %cd%
  echo Pokreni run.bat iz root foldera projekta.
  pause
  exit /b 1
)

:: 5) Instaliraj dependencije ako nedostaju
if not exist "node_modules" (
  echo Instaliram dependencije...
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo [Greska] Instalacija nije uspjela.
    pause
    exit /b 1
  )
) else (
  echo node_modules postoji - preskacem instalaciju.
)

echo.

:: 6) Pokreni dev server (Vite / React)
if "%PORT%"=="" set PORT=5173
echo Pokrecem dev server na http://localhost:%PORT%
start "" "http://localhost:%PORT%"

:: Prvo probaj npm scriptu (preferirano)
call npm run dev -- --port %PORT%
if not errorlevel 1 goto :end

:: Ako iz nekog razloga npm skripta ne postoji ili ne radi, fallback na npx vite
echo npm run dev nije uspio, pokusavam: npx vite --port %PORT%
call npx vite --port %PORT%
if errorlevel 1 (
  echo [Greska] Nije moguce pokrenuti dev server (ni npm run dev ni npx vite).
  pause
  exit /b 1
)

:end
echo.
echo Server zaustavljen.
pause
endlocal
