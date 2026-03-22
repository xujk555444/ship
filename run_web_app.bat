@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

python -m uvicorn web_app:app --host 0.0.0.0 --port 8000
