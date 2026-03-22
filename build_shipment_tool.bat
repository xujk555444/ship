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

python -m PyInstaller --noconfirm --clean --windowed --onefile --name "ShipmentMessageTool" "%APP%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo Build failed. Exit code: %EXIT_CODE%
    pause
    exit /b %EXIT_CODE%
)

echo Build completed.
echo EXE: %SCRIPT_DIR%dist\ShipmentMessageTool.exe
pause
endlocal
