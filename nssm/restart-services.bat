@echo off
:: ============================================================================
:: Chatbot NSSM Service Restart
:: ============================================================================

echo.
echo Restarting Chatbot services...
echo.

echo [1/3] Stopping ChatbotUI...
nssm stop ChatbotUI 2>nul

echo [2/3] Restarting ChatbotEngine...
nssm restart ChatbotEngine

echo    Waiting for Engine...
timeout /t 5 /nobreak >nul

echo [3/3] Starting ChatbotUI...
nssm start ChatbotUI

timeout /t 3 /nobreak >nul

echo.
echo ====================================================
echo   Service Status
echo ====================================================
echo   ChatbotMockAPI : & nssm status ChatbotMockAPI
echo   ChatbotEngine  : & nssm status ChatbotEngine
echo   ChatbotUI      : & nssm status ChatbotUI
echo ====================================================
echo.
pause
