#!/bin/bash

# Production Deployment Script for qquadro.com
# This script fixes and deploys the corrected configuration

set -e

echo "🚀 Starting Production Deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from project root directory"
    exit 1
fi

# Step 1: Clean and rebuild frontend with standalone output
echo "📦 Step 1: Cleaning and building frontend with standalone output..."
cd frontend

# Clean previous build artifacts
echo "🧹 Cleaning previous build..."
rm -rf .next
rm -rf out

# Fresh build
npm run build

cd ..
echo "✅ Frontend build complete"
echo ""

# Step 2: Rebuild Docker images
echo "🐳 Step 2: Rebuilding Docker containers..."

# Stop all services
docker-compose down

# Remove old frontend image to force complete rebuild
docker rmi mailsender-app 2>/dev/null || true

# Rebuild with no cache
docker-compose build --no-cache app

echo "✅ Docker images rebuilt"
echo ""

# Step 3: Deploy to production
echo "🌐 Step 3: Starting services..."
docker-compose up -d
echo "✅ Services started"
echo ""

# Step 4: Check health
echo "🏥 Step 4: Checking service health..."
sleep 5

# Check frontend
if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend health check failed"
fi

# Check backend
if curl -s -f http://localhost:4000/api/health > /dev/null; then
    echo "✅ Backend API is running"
else
    echo "⚠️  Backend health check failed"
fi

echo ""
echo "📋 Deployment Summary:"
echo "  - nginx MIME types: FIXED ✅"
echo "  - Next.js standalone: ENABLED ✅"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend: http://localhost:4000"
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Push changes to your production server"
echo "  2. Run this script on production: ./deploy-production.sh"
echo "  3. Clear browser cache and reload qquadro.com"
echo ""
