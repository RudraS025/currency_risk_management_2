@echo off
echo ========================================
echo CURRENCY RISK MANAGEMENT - VERSION RESTORE
echo ========================================
echo.
echo This script helps you restore to production version v1.0.0
echo.
echo Available Options:
echo.
echo 1. View current version info
echo 2. Restore to production baseline (v1.0.0-production-ready)
echo 3. Create new branch from production baseline
echo 4. Show all available versions
echo 5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo === CURRENT VERSION INFO ===
    git log --oneline -1
    git describe --tags
    echo.
    git status --porcelain
    pause
    goto :eof
)

if "%choice%"=="2" (
    echo.
    echo === RESTORING TO PRODUCTION BASELINE ===
    echo WARNING: This will reset to v1.0.0-production-ready
    echo Any uncommitted changes will be lost!
    echo.
    set /p confirm="Are you sure? (y/N): "
    if /i "%confirm%"=="y" (
        git checkout v1.0.0-production-ready
        echo.
        echo ✅ Restored to production baseline v1.0.0
        echo You are now in detached HEAD state
        echo To continue development, create a new branch:
        echo   git checkout -b your-new-branch-name
    ) else (
        echo Operation cancelled.
    )
    pause
    goto :eof
)

if "%choice%"=="3" (
    echo.
    echo === CREATE NEW BRANCH FROM PRODUCTION BASELINE ===
    set /p branchname="Enter new branch name: "
    if not "%branchname%"=="" (
        git checkout -b %branchname% v1.0.0-production-ready
        echo.
        echo ✅ Created new branch '%branchname%' from production baseline
        echo You can now safely develop new features
    ) else (
        echo Invalid branch name.
    )
    pause
    goto :eof
)

if "%choice%"=="4" (
    echo.
    echo === ALL AVAILABLE VERSIONS ===
    git tag -l
    echo.
    echo === RECENT COMMITS ===
    git log --oneline -10
    pause
    goto :eof
)

if "%choice%"=="5" (
    echo Goodbye!
    goto :eof
)

echo Invalid choice. Please try again.
pause
