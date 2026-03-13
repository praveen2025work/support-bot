@echo off
setlocal EnableDelayedExpansion

:: ============================================================================
:: Chatbot NSSM Service Installer
:: ============================================================================
:: Usage:  install-services.bat [PROJECT_DIR] [NODE_PATH]
::
:: Defaults:
::   PROJECT_DIR = C:\Chatbot
::   NODE_PATH   = C:\Program Files\nodejs\node.exe
:: ============================================================================

set PROJECT=%~1
if "%PROJECT%"=="" set PROJECT=C:\Chatbot

set NODE=%~2
if "%NODE%"=="" set NODE=C:\Program Files\nodejs\node.exe

set LOGS=%PROJECT%\data\logs

echo.
echo ====================================================
echo   Chatbot NSSM Service Installer
echo ====================================================
echo   Project  : %PROJECT%
echo   Node     : %NODE%
echo   Logs     : %LOGS%
echo ====================================================
echo.

:: Verify project exists
if not exist "%PROJECT%\package.json" (
    echo ERROR: Project not found at %PROJECT%
    echo Make sure the project is cloned and built first.
    pause
    exit /b 1
)

:: Verify node exists
if not exist "%NODE%" (
    echo ERROR: Node.js not found at %NODE%
    echo Install Node.js 18+ or pass the correct path.
    pause
    exit /b 1
)

:: Verify engine is built
if not exist "%PROJECT%\services\engine\dist\server.js" (
    echo ERROR: Engine not built. Run these commands first:
    echo   cd %PROJECT%\services\engine
    echo   npm run build
    pause
    exit /b 1
)

:: Verify UI is built
if not exist "%PROJECT%\.next\standalone\server.js" (
    echo ERROR: UI not built. Run these commands first:
    echo   cd %PROJECT%
    echo   npm run build
    echo   xcopy /E /I public .next\standalone\public
    echo   xcopy /E /I .next\static .next\standalone\.next\static
    pause
    exit /b 1
)

:: Create log directory
if not exist "%LOGS%" (
    echo Creating log directory: %LOGS%
    mkdir "%LOGS%"
)

:: ── ChatbotEngine ──────────────────────────────────────────────────────────

echo.
echo [1/3] Installing ChatbotEngine...

nssm install ChatbotEngine "%NODE%"
nssm set ChatbotEngine AppParameters "dist\server.js"
nssm set ChatbotEngine AppDirectory "%PROJECT%\services\engine"

:: Environment variables — EDIT THESE for your environment
nssm set ChatbotEngine AppEnvironmentExtra ^
    NODE_ENV=production ^
    ENGINE_PORT=4000 ^
    API_BASE_URL=http://localhost:8080/api ^
    API_TOKEN= ^
    ENGINE_API_KEY= ^
    UI_ORIGIN=http://localhost:3001 ^
    USER_INFO_URL= ^
    LOG_ENCRYPTION_KEY=

:: Logging
nssm set ChatbotEngine AppStdout "%LOGS%\engine-stdout.log"
nssm set ChatbotEngine AppStderr "%LOGS%\engine-stderr.log"
nssm set ChatbotEngine AppStdoutCreationDisposition 4
nssm set ChatbotEngine AppStderrCreationDisposition 4
nssm set ChatbotEngine AppRotateFiles 1
nssm set ChatbotEngine AppRotateSeconds 86400
nssm set ChatbotEngine AppRotateBytes 10485760

:: Restart policy
nssm set ChatbotEngine AppExit Default Restart
nssm set ChatbotEngine AppRestartDelay 3000

:: Graceful shutdown — send Ctrl+C, wait 10s
nssm set ChatbotEngine AppStopMethodSkip 0
nssm set ChatbotEngine AppStopMethodConsole 10000
nssm set ChatbotEngine AppStopMethodWindow 0
nssm set ChatbotEngine AppStopMethodThreads 0

echo    ChatbotEngine installed.

:: ── ChatbotUI ──────────────────────────────────────────────────────────────

echo.
echo [2/3] Installing ChatbotUI...

nssm install ChatbotUI "%NODE%"
nssm set ChatbotUI AppParameters ".next\standalone\server.js"
nssm set ChatbotUI AppDirectory "%PROJECT%"

:: Environment variables
nssm set ChatbotUI AppEnvironmentExtra ^
    NODE_ENV=production ^
    PORT=3000 ^
    ENGINE_URL=http://localhost:4001

:: Logging
nssm set ChatbotUI AppStdout "%LOGS%\ui-stdout.log"
nssm set ChatbotUI AppStderr "%LOGS%\ui-stderr.log"
nssm set ChatbotUI AppStdoutCreationDisposition 4
nssm set ChatbotUI AppStderrCreationDisposition 4
nssm set ChatbotUI AppRotateFiles 1
nssm set ChatbotUI AppRotateSeconds 86400

:: Depends on engine
nssm set ChatbotUI DependOnService ChatbotEngine

:: Restart policy
nssm set ChatbotUI AppExit Default Restart
nssm set ChatbotUI AppRestartDelay 3000

:: Graceful shutdown
nssm set ChatbotUI AppStopMethodSkip 0
nssm set ChatbotUI AppStopMethodConsole 10000
nssm set ChatbotUI AppStopMethodWindow 0
nssm set ChatbotUI AppStopMethodThreads 0

echo    ChatbotUI installed.

:: ── ChatbotMockAPI (optional) ──────────────────────────────────────────────

echo.
echo [3/3] Installing ChatbotMockAPI (optional — demo only)...

nssm install ChatbotMockAPI "%NODE%"
nssm set ChatbotMockAPI AppParameters "server.js"
nssm set ChatbotMockAPI AppDirectory "%PROJECT%\services\mock-api"

:: Logging
nssm set ChatbotMockAPI AppStdout "%LOGS%\mock-api-stdout.log"
nssm set ChatbotMockAPI AppStderr "%LOGS%\mock-api-stderr.log"
nssm set ChatbotMockAPI AppStdoutCreationDisposition 4
nssm set ChatbotMockAPI AppStderrCreationDisposition 4
nssm set ChatbotMockAPI AppRotateFiles 1

:: Restart policy
nssm set ChatbotMockAPI AppExit Default Restart
nssm set ChatbotMockAPI AppRestartDelay 3000

:: Graceful shutdown
nssm set ChatbotMockAPI AppStopMethodSkip 0
nssm set ChatbotMockAPI AppStopMethodConsole 5000
nssm set ChatbotMockAPI AppStopMethodWindow 0
nssm set ChatbotMockAPI AppStopMethodThreads 0

echo    ChatbotMockAPI installed.

:: ── Start services ─────────────────────────────────────────────────────────

echo.
echo ====================================================
echo   Starting services...
echo ====================================================

nssm start ChatbotMockAPI
echo    Waiting for MockAPI to start...
timeout /t 3 /nobreak >nul

nssm start ChatbotEngine
echo    Waiting for Engine to start...
timeout /t 5 /nobreak >nul

nssm start ChatbotUI
echo    Waiting for UI to start...
timeout /t 3 /nobreak >nul

:: ── Status check ───────────────────────────────────────────────────────────

echo.
echo ====================================================
echo   Service Status
echo ====================================================
echo.
echo   ChatbotMockAPI : & nssm status ChatbotMockAPI
echo   ChatbotEngine  : & nssm status ChatbotEngine
echo   ChatbotUI      : & nssm status ChatbotUI
echo.
echo ====================================================
echo   Access Points
echo ====================================================
echo   UI:       http://localhost:3001
echo   Admin:    http://localhost:3001/admin
echo   Widget:   http://localhost:3001/widget
echo   Engine:   http://localhost:4001/api/health
echo   Mock API: http://localhost:8080/api/queries
echo ====================================================
echo.
pause
