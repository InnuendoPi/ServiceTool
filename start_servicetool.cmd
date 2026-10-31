@echo off
setlocal
cd /d "%~dp0"
set "SERVICE_TOOL_PYTHON=python"
if exist "%~dp0.venv\Scripts\python.exe" set "SERVICE_TOOL_PYTHON=%~dp0.venv\Scripts\python.exe"
"%SERVICE_TOOL_PYTHON%" app.py
exit /b %errorlevel%
