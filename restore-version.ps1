# Currency Risk Management - Version Restore Script
# PowerShell version for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CURRENCY RISK MANAGEMENT - VERSION RESTORE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script helps you restore to production version v1.0.0" -ForegroundColor Yellow
Write-Host ""
Write-Host "Available Options:" -ForegroundColor Green
Write-Host ""
Write-Host "1. View current version info" -ForegroundColor White
Write-Host "2. Restore to production baseline (v1.0.0-production-ready)" -ForegroundColor White
Write-Host "3. Create new branch from production baseline" -ForegroundColor White
Write-Host "4. Show all available versions" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "=== CURRENT VERSION INFO ===" -ForegroundColor Yellow
        git log --oneline -1
        git describe --tags
        Write-Host ""
        git status --porcelain
        Read-Host "Press Enter to continue"
    }
    
    "2" {
        Write-Host ""
        Write-Host "=== RESTORING TO PRODUCTION BASELINE ===" -ForegroundColor Yellow
        Write-Host "WARNING: This will reset to v1.0.0-production-ready" -ForegroundColor Red
        Write-Host "Any uncommitted changes will be lost!" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            git checkout v1.0.0-production-ready
            Write-Host ""
            Write-Host "✅ Restored to production baseline v1.0.0" -ForegroundColor Green
            Write-Host "You are now in detached HEAD state" -ForegroundColor Yellow
            Write-Host "To continue development, create a new branch:" -ForegroundColor Yellow
            Write-Host "  git checkout -b your-new-branch-name" -ForegroundColor Cyan
        } else {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
        }
        Read-Host "Press Enter to continue"
    }
    
    "3" {
        Write-Host ""
        Write-Host "=== CREATE NEW BRANCH FROM PRODUCTION BASELINE ===" -ForegroundColor Yellow
        $branchname = Read-Host "Enter new branch name"
        if ($branchname -ne "") {
            git checkout -b $branchname v1.0.0-production-ready
            Write-Host ""
            Write-Host "✅ Created new branch '$branchname' from production baseline" -ForegroundColor Green
            Write-Host "You can now safely develop new features" -ForegroundColor Yellow
        } else {
            Write-Host "Invalid branch name." -ForegroundColor Red
        }
        Read-Host "Press Enter to continue"
    }
    
    "4" {
        Write-Host ""
        Write-Host "=== ALL AVAILABLE VERSIONS ===" -ForegroundColor Yellow
        git tag -l
        Write-Host ""
        Write-Host "=== RECENT COMMITS ===" -ForegroundColor Yellow
        git log --oneline -10
        Read-Host "Press Enter to continue"
    }
    
    "5" {
        Write-Host "Goodbye!" -ForegroundColor Green
        exit
    }
    
    default {
        Write-Host "Invalid choice. Please try again." -ForegroundColor Red
        Read-Host "Press Enter to continue"
    }
}
