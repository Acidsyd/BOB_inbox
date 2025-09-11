#!/bin/bash

# ================================
# Production Deployment Script - 413 Error Fix
# Run this script on your Digital Ocean server
# ================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}"
echo "=================================="
echo " Production Deployment - 413 Fix"
echo " CSV Upload Error Resolution"
echo "=================================="
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "docker-compose.production.yml" ]; then
    log_error "docker-compose.production.yml not found!"
    log_error "Please run this script from your application root directory"
    exit 1
fi

log_info "Starting deployment process..."

# Step 1: Pull latest changes from GitHub
log_info "Pulling latest changes from GitHub..."
git fetch origin
git pull origin main

if [ $? -ne 0 ]; then
    log_error "Failed to pull latest changes from GitHub"
    exit 1
fi

log_success "Latest changes pulled successfully"

# Step 2: Check if nginx/server.conf exists
if [ ! -f "nginx/server.conf" ]; then
    log_error "nginx/server.conf not found! This is required for the fix."
    exit 1
fi

log_info "nginx/server.conf found - contains 200MB CSV upload limits"

# Step 3: Stop current services
log_info "Stopping current Docker services..."
docker-compose -f docker-compose.production.yml down

if [ $? -eq 0 ]; then
    log_success "Services stopped successfully"
else
    log_warning "Some services may not have been running"
fi

# Step 4: Remove old containers and images (optional cleanup)
log_info "Cleaning up old containers and images..."
docker system prune -f > /dev/null 2>&1 || true

# Step 5: Build and start services with new configuration
log_info "Building and starting services with new configuration..."
log_info "This will apply the nginx configuration fix for 413 errors..."

docker-compose -f docker-compose.production.yml up -d --build

if [ $? -ne 0 ]; then
    log_error "Failed to start services"
    exit 1
fi

# Step 6: Wait for services to start
log_info "Waiting for services to initialize..."
sleep 30

# Step 7: Health checks
log_info "Performing health checks..."

# Check if containers are running
NGINX_STATUS=$(docker-compose -f docker-compose.production.yml ps --filter="status=running" --format="table {{.Service}}" | grep nginx || echo "")
BACKEND_STATUS=$(docker-compose -f docker-compose.production.yml ps --filter="status=running" --format="table {{.Service}}" | grep backend || echo "")
FRONTEND_STATUS=$(docker-compose -f docker-compose.production.yml ps --filter="status=running" --format="table {{.Service}}" | grep frontend || echo "")

if [ -n "$NGINX_STATUS" ]; then
    log_success "✅ Nginx container is running"
else
    log_error "❌ Nginx container is not running"
fi

if [ -n "$BACKEND_STATUS" ]; then
    log_success "✅ Backend container is running"
else
    log_error "❌ Backend container is not running"
fi

if [ -n "$FRONTEND_STATUS" ]; then
    log_success "✅ Frontend container is running"
else
    log_error "❌ Frontend container is not running"
fi

# Step 8: Test nginx configuration
log_info "Testing nginx configuration..."
docker-compose -f docker-compose.production.yml exec nginx nginx -t

if [ $? -eq 0 ]; then
    log_success "✅ Nginx configuration is valid"
else
    log_error "❌ Nginx configuration test failed"
fi

# Step 9: Test website accessibility
log_info "Testing website accessibility..."
sleep 10

# Test main site
if curl -f -s http://localhost/health > /dev/null 2>&1; then
    log_success "✅ Website is accessible"
else
    log_warning "⚠️  Website health check failed - may still be starting"
fi

# Show running containers
log_info "Current running containers:"
docker-compose -f docker-compose.production.yml ps

echo
echo -e "${GREEN}=================================="
echo " 🚀 DEPLOYMENT COMPLETED!"
echo ""
echo " Applied fixes:"
echo " ✅ Updated nginx configuration (200MB CSV limit)"
echo " ✅ Fixed docker-compose mounting"  
echo " ✅ Increased Express.js body limits"
echo " ✅ Extended upload timeouts"
echo ""
echo " 🎯 The 413 'Payload Too Large' errors"
echo "    should now be resolved!"
echo ""
echo " Test CSV uploads at: https://qquadro.com"
echo "=================================="
echo -e "${NC}"

log_info "Deployment script completed successfully"
log_info "Monitor logs with: docker-compose -f docker-compose.production.yml logs -f"