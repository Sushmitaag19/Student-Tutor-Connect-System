@echo off
REM Student-Tutor Platform - Service Startup Script for Windows
REM This script starts both the Node.js backend and Python ML microservice

echo 🚀 Starting Student-Tutor Platform Services...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python first.
    pause
    exit /b 1
)

REM Start Node.js backend
echo 📦 Starting Node.js backend...
cd backend
call npm install
start "Backend Server" cmd /k "node server.js"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Python ML service
echo 🤖 Starting Python ML microservice...
cd ml-service
call pip install -r requirements.txt
start "ML Service" cmd /k "python run_ml_service.py"

REM Wait for services to start
timeout /t 5 /nobreak >nul

echo 🎉 All services are starting!
echo 📊 Backend API: http://localhost:3000
echo 🤖 ML Service: http://localhost:5000
echo 📖 API Documentation: http://localhost:3000

echo.
echo Press any key to exit...
pause >nul
