@echo off
cd /d "%~dp0"
if not exist node_modules\vite\bin\vite.js (
  call npm install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
echo Open http://127.0.0.1:5186/ in your browser.
call npm run dev
