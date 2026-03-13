@echo off
:: ============================================================================
:: Chatbot NSSM Service Status Check
:: ============================================================================

echo.
echo ====================================================
echo   Chatbot Service Status
echo ====================================================
echo.
echo   ChatbotMockAPI : & nssm status ChatbotMockAPI 2>nul || echo   (not installed)
echo   ChatbotEngine  : & nssm status ChatbotEngine 2>nul || echo   (not installed)
echo   ChatbotUI      : & nssm status ChatbotUI 2>nul || echo   (not installed)
echo.
echo ====================================================
echo   Port Check
echo ====================================================
echo.
echo   Port 8080 (MockAPI):
netstat -ano | findstr :8080 | findstr LISTENING
if errorlevel 1 echo     (not listening)
echo.
echo   Port 4000 (Engine):
netstat -ano | findstr :4000 | findstr LISTENING
if errorlevel 1 echo     (not listening)
echo.
echo   Port 3000 (UI):
netstat -ano | findstr :3000 | findstr LISTENING
if errorlevel 1 echo     (not listening)
echo.
echo ====================================================
echo   Recent Errors (last 5 lines from each stderr log)
echo ====================================================
echo.
set LOGS=C:\Chatbot\data\logs

if exist "%LOGS%\engine-stderr.log" (
    echo --- Engine Errors ---
    powershell "Get-Content '%LOGS%\engine-stderr.log' -Tail 5" 2>nul
    echo.
)
if exist "%LOGS%\ui-stderr.log" (
    echo --- UI Errors ---
    powershell "Get-Content '%LOGS%\ui-stderr.log' -Tail 5" 2>nul
    echo.
)
if exist "%LOGS%\mock-api-stderr.log" (
    echo --- MockAPI Errors ---
    powershell "Get-Content '%LOGS%\mock-api-stderr.log' -Tail 5" 2>nul
    echo.
)
echo ====================================================
pause
