# Set the correct path
Set-Location "d:\CURRENCY_RISK_MANAGEMENT_2025\currency-risk-management"

# Add Node.js to PATH
$env:PATH = "C:\Program Files\nodejs;$env:PATH"

# Start the dev server
Write-Host "Starting Currency Risk Management Development Server..."
Write-Host "Server will be available at: http://localhost:3000"
Write-Host ""

& "C:\Program Files\nodejs\node.exe" .\node_modules\next\dist\bin\next dev

Read-Host "Press Enter to close..."
