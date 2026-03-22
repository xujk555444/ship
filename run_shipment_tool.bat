@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "APP=%SCRIPT_DIR%app.py"

if not exist "%APP%" (
    echo app.py not found:
    echo %APP%
    pause
    exit /b 1
)

python "%APP%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Program exited with code: %EXIT_CODE%
    pause
    exit /b %EXIT_CODE%
)

endlocal
