@echo off
cd /d "%~dp0"
color 0A
echo.
echo  =============================================
echo   KabTakAayush -- Push to GitHub
echo  =============================================
echo.

REM --- Remove broken .git if it exists from a failed attempt ---
if exist ".git" (
  echo  Cleaning up previous git init...
  rmdir /s /q ".git"
)

REM --- Step 1: Initialize git ---
echo  [1/4] Initialising git...
git init
git branch -M main
echo  Done.
echo.

REM --- Step 2: Stage and commit all files ---
echo  [2/4] Adding all files...
git add .
git commit -m "Initial commit -- KabTakAayush portfolio"
echo  Done.
echo.

REM --- Step 3: Open GitHub to create the repo ---
echo  [3/4] Opening GitHub in your browser...
echo.
echo  -----------------------------------------------
echo   Create a NEW repository with these settings:
echo     Name  :  kabtakaayush
echo     Type  :  Public
echo     IMPORTANT: do NOT tick README / .gitignore
echo   Then click "Create repository"
echo  -----------------------------------------------
echo.
start https://github.com/new
echo  Come back here once the repo is created.
echo.
pause

REM --- Step 4: Connect and push ---
echo.
echo  [4/4] Connecting to GitHub...
set /p GH_USER=Enter your GitHub username (exactly as it appears on GitHub):
echo.
git remote remove origin 2>nul
git remote add origin https://github.com/%GH_USER%/kabtakaayush.git
git push -u origin main

echo.
echo  =============================================
echo   All done! Your site is on GitHub.
echo   URL: https://github.com/%GH_USER%/kabtakaayush
echo  =============================================
echo.
echo  Next step: import this repo into Vercel at
echo  https://vercel.com/new
echo.
pause
