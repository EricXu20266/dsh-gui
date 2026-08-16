@echo off
cd /d "%~dp0"
call pnpm build
if errorlevel 1 goto :fail
call node "node_modules\electron-builder\out\cli\cli.js" --win dir --publish never
if errorlevel 1 goto :fail
call node scripts\apply-exe-icon.mjs
if errorlevel 1 goto :fail
echo.
echo dsh-gui win-unpacked build OK: release\win-unpacked\
if defined CI exit /b 0
pause
exit /b 0

:fail
echo.
echo Build failed. Check the error above.
if defined CI exit /b 1
pause
exit /b 1
