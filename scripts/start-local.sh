#!/bin/bash

echo "🚀 Starting OPhir Platform Locally..."

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   brew install postgresql"
    exit 1
fi

# Check for Redis
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Please install it first:"
    echo "   brew install redis"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first:"
    echo "   brew install node"
    exit 1
fi

# Start PostgreSQL
echo "📊 Starting PostgreSQL..."
brew services start postgresql

# Start Redis
echo "💾 Starting Redis..."
brew services start redis

# Create database if it doesn't exist
echo "🗄️ Setting up database..."
createdb ophir_db 2>/dev/null || echo "Database already exists"
psql -d ophir_db -f database/init.sql

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Start backend in background
echo "🔧 Starting backend API..."
npm run dev &
BACKEND_PID=$!

cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Start frontend
echo "🎨 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo "✅ OPhir Platform is starting!"
echo ""
echo "📍 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:4000"
echo ""
echo "⚠️  Note: n8n automation requires Docker to run"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; brew services stop postgresql redis; exit" INT
wait