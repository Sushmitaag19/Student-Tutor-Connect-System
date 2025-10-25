#!/bin/bash

# Student-Tutor Platform - Service Startup Script
# This script starts both the Node.js backend and Python ML microservice

echo "🚀 Starting Student-Tutor Platform Services..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Function to start Node.js backend
start_backend() {
    echo "📦 Starting Node.js backend..."
    cd backend
    npm install
    node server.js &
    BACKEND_PID=$!
    echo "✅ Backend started with PID: $BACKEND_PID"
}

# Function to start Python ML service
start_ml_service() {
    echo "🤖 Starting Python ML microservice..."
    cd backend/ml-service
    pip install -r requirements.txt
    python run_ml_service.py &
    ML_PID=$!
    echo "✅ ML service started with PID: $ML_PID"
}

# Function to check service health
check_health() {
    echo "🔍 Checking service health..."
    
    # Wait for services to start
    sleep 5
    
    # Check backend health
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Backend is healthy"
    else
        echo "❌ Backend health check failed"
    fi
    
    # Check ML service health
    if curl -s http://localhost:5000/ml/health > /dev/null; then
        echo "✅ ML service is healthy"
    else
        echo "❌ ML service health check failed"
    fi
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID
        echo "✅ Backend stopped"
    fi
    if [ ! -z "$ML_PID" ]; then
        kill $ML_PID
        echo "✅ ML service stopped"
    fi
    exit 0
}

# Set up signal handlers
trap stop_services SIGINT SIGTERM

# Start services
start_backend
start_ml_service

# Check health
check_health

echo "🎉 All services are running!"
echo "📊 Backend API: http://localhost:3000"
echo "🤖 ML Service: http://localhost:5000"
echo "📖 API Documentation: http://localhost:3000"

# Keep script running
wait
