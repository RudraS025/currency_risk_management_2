@echo off
echo ========================================
echo  RESTORING P&L CORRECTED VERSION
echo ========================================
echo.
echo Restoring version: v1.1.0-pnl-corrections-applied
echo Date: July 8, 2025
echo Features: Corrected Max Loss and Optimal Exit calculations
echo.

git checkout v1.1.0-pnl-corrections-applied
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to restore version
    echo Please check if the tag exists: git tag -l
    pause
    exit /b 1
)

echo.
echo ========================================
echo  RESTORATION COMPLETE
echo ========================================
echo.
echo Version restored successfully!
echo.
echo Key corrections applied:
echo - Max Loss: VaR-based calculation (99%% confidence)
echo - Optimal Exit: Risk-adjusted with maturity validation
echo - EUR/INR example: Max Loss ₹83,56,175 (was ₹3,90,871)
echo - EUR/INR example: Optimal Exit Day 63 (was Day 84)
echo.
echo To start the application:
echo   powershell -ExecutionPolicy Bypass -File "start-dev.ps1"
echo.
echo Access at: http://localhost:3002
echo.
pause
