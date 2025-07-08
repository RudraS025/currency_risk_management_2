#!/usr/bin/env pwsh
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " RESTORING P&L CORRECTED VERSION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Restoring version: v1.1.0-pnl-corrections-applied" -ForegroundColor Green
Write-Host "Date: July 8, 2025" -ForegroundColor Green
Write-Host "Features: Corrected Max Loss and Optimal Exit calculations" -ForegroundColor Green
Write-Host ""

try {
    git checkout v1.1.0-pnl-corrections-applied
    if ($LASTEXITCODE -ne 0) {
        throw "Git checkout failed"
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " RESTORATION COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Version restored successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Key corrections applied:" -ForegroundColor Yellow
    Write-Host "- Max Loss: VaR-based calculation (99% confidence)" -ForegroundColor White
    Write-Host "- Optimal Exit: Risk-adjusted with maturity validation" -ForegroundColor White
    Write-Host "- EUR/INR example: Max Loss ₹83,56,175 (was ₹3,90,871)" -ForegroundColor White
    Write-Host "- EUR/INR example: Optimal Exit Day 63 (was Day 84)" -ForegroundColor White
    Write-Host ""
    Write-Host "To start the application:" -ForegroundColor Cyan
    Write-Host "  powershell -ExecutionPolicy Bypass -File `"start-dev.ps1`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Access at: http://localhost:3002" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to restore version" -ForegroundColor Red
    Write-Host "Please check if the tag exists: git tag -l" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Read-Host "Press Enter to continue..."
