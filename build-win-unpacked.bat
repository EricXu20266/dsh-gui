@echo off
cd /d "%~dp0"

echo ============================================================
echo   dsh-gui 免安装包打包  (win-unpacked)
echo ============================================================

echo.
echo [1/3] 构建主进程 (pnpm build) ...
call pnpm build
if errorlevel 1 (
  echo [错误] pnpm build 失败，退出
  exit /b 1
)
echo       主进程构建完成

echo.
echo [2/3] 打包免安装包 (electron-builder --win dir) ...
call node "node_modules\electron-builder\out\cli\cli.js" --win dir --publish never
if errorlevel 1 (
  echo [错误] electron-builder 失败，退出
  exit /b 1
)
echo       打包完成

echo.
echo [3/3] 验证产物 ...
if exist "release\win-unpacked\dsh-gui.exe" (
  echo       dsh-gui.exe OK
) else (
  echo [错误] 未找到 dsh-gui.exe
  exit /b 1
)
for %%p in (dhs dsh-about dsh-discovery dsh-mcpmanager dsh-proxy dsh-skillmanager runtime) do (
  if exist "release\win-unpacked\resources\%%p" (
    echo       resources\%%p OK
  ) else (
    echo [警告] resources\%%p 缺失
  )
)

echo.
echo ============================================================
echo   打包完成: release\win-unpacked\
echo   双击 dsh-gui.exe 即可运行
echo ============================================================
pause