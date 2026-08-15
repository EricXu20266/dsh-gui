@echo off
cd /d "%~dp0"

echo ============================================================
echo   dsh-gui portable build  (win-unpacked)
echo ============================================================

echo.
echo [1/3] Building main process (pnpm build) ...
call pnpm build
if errorlevel 1 (
  echo [ERROR] pnpm build failed
  exit /b 1
)
echo       main process built

echo.
echo [2/3] Packing win-unpacked (electron-builder --win dir) ...
call node "node_modules\electron-builder\out\cli\cli.js" --win dir --publish never
if errorlevel 1 (
  echo [ERROR] electron-builder failed
  exit /b 1
)
echo       packaged

echo.
echo [3/3] Verifying artifacts ...
if exist "release\win-unpacked\dsh-gui.exe" (
  echo       dsh-gui.exe OK
) else (
  echo [ERROR] dsh-gui.exe not found
  exit /b 1
)
for %%p in (dhs dsh-about dsh-discovery dsh-mcpmanager dsh-proxy dsh-skillmanager runtime) do (
  if exist "release\win-unpacked\resources\%%p" (
    echo       resources\%%p OK
  ) else (
    echo [WARN] resources\%%p missing
  )
)

echo.
echo ============================================================
echo   Done: release\win-unpacked\
echo   Run dsh-gui.exe to start
echo ============================================================
pause
