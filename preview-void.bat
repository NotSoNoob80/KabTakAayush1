@echo off
rem ============================================================
rem  PREVIEW THE VOID HOMEPAGE
rem  ------------------------------------------------------------
rem  Double-click this file. It starts a tiny local server
rem  (built-in Windows PowerShell - nothing to install) and opens
rem  the void page in your browser.
rem
rem  Keep this window open while you browse.
rem  Close it (or press Ctrl+C) when you're done.
rem ============================================================
cd /d "%~dp0"
title KabTakAayush local preview - keep this window open

rem Open the browser after a 2s head start for the server
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8765/index.html"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-void.ps1"

echo.
echo Server stopped. If it failed, the reason is shown above.
pause
