@echo off
:: ============================================================================
:: Chatbot NSSM Service Uninstaller
:: ============================================================================

echo.
echo ====================================================
echo   Chatbot NSSM Service Uninstaller
echo ====================================================
echo.
echo This will STOP and REMOVE all Chatbot Windows services.
echo.
set /p CONFIRM=Are you sure? (Y/N):
if /I not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Stopping services...
nssm stop ChatbotUI 2>nul
nssm stop ChatbotEngine 2>nul
nssm stop ChatbotMockAPI 2>nul

timeout /t 3 /nobreak >nul

echo Removing services...
nssm remove ChatbotUI confirm 2>nul
nssm remove ChatbotEngine confirm 2>nul
nssm remove ChatbotMockAPI confirm 2>nul

echo.
echo All Chatbot services have been removed.
echo Log files in data\logs\ are preserved.
echo.
pause
