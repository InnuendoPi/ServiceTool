@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" >nul

if not defined SERVICE_TOOL_BUILD_PYTHON (
  set "SERVICE_TOOL_BUILD_PYTHON=python"
  if exist ".venv\Scripts\python.exe" set "SERVICE_TOOL_BUILD_PYTHON=%SCRIPT_DIR%.venv\Scripts\python.exe"
)
"%SERVICE_TOOL_BUILD_PYTHON%" tools\check_windows_build.py
if errorlevel 1 (
  popd >nul
  exit /b 1
)

if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
"%SERVICE_TOOL_BUILD_PYTHON%" -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --onefile ^
  --name Brautomat32ServiceTool ^
  --collect-all zeroconf ^
  --collect-all ifaddr ^
  --collect-all serial ^
  --collect-all certifi ^
  --add-data "static;static" ^
  app.py

if errorlevel 1 (
  echo Build failed.
  popd >nul
  exit /b 1
)

"%SERVICE_TOOL_BUILD_PYTHON%" tools\check_windows_build.py --exe dist\Brautomat32ServiceTool.exe
if errorlevel 1 (
  popd >nul
  exit /b 1
)
echo Build finished: "%SCRIPT_DIR%dist\Brautomat32ServiceTool.exe"
popd >nul
exit /b 0
