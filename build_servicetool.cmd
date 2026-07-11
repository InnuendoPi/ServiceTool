@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" >nul

if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
python -m PyInstaller ^
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

echo Build finished: "%SCRIPT_DIR%dist\Brautomat32ServiceTool.exe"
popd >nul
exit /b 0
