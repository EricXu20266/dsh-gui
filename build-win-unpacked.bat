@echo off
cd /d "%~dp0"
call pnpm build
if errorlevel 1 exit /b 1
call node "node_modules\electron-builder\out\cli\cli.js" --win dir --publish never
if errorlevel 1 exit /b 1
pause
