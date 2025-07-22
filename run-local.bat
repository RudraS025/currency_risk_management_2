@echo off
echo 🚀 Starting Currency Risk Management Platform (Local Development)
echo.
echo 📍 Current Directory: %CD%
echo 🔧 Node.js Version:
"C:\Program Files\nodejs\node.exe" --version
echo.

echo 📦 Starting development server...
echo 🌐 The app will open at: http://localhost:3000
echo.
echo ⚠️  If prompted to install packages, press 'y' and Enter
echo.

"C:\Program Files\nodejs\node.exe" "node_modules\.bin\next" dev

echo.
echo 🛑 Development server stopped.
pause
