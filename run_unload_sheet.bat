@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%run_unload_sheet.ps1"

if not exist "%PS1%" (
    echo PowerShell script not found:
    echo %PS1%
    pause
    exit /b 1
)

set "SOURCE=%~1"
set "OUTPUT=%~2"

if "%~1"=="" (
    echo.
    echo Enter the full path of the source workbook (.xlsx)
    echo Example:
    echo C:\Users\PC16\Desktop\your_source.xlsx
    set /p SOURCE=Source path: 
)

if "%SOURCE%"=="" (
    echo No source workbook provided.
    pause
    exit /b 1
)

echo.
echo Starting...
powershell -ExecutionPolicy Bypass -File "%PS1%" "%SOURCE%" "%OUTPUT%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo Failed. Exit code: %EXIT_CODE%
    pause
    exit /b %EXIT_CODE%
)

echo Done.
pause
exit /b 0
