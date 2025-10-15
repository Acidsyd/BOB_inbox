#!/bin/bash

# ================================
# Nginx Restart Script for Production
# Applies new nginx configuration changes
# ================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

COMPOSE_FILE="docker-compose.production.yml"

echo -e "${BLUE}=================================="
echo " Restarting Nginx with New Config"
echo " for CSV Upload Fix (413 Error)"
echo "==================================${NC}"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "docker-compose.production.yml not found!"
    exit 1
fi

log_info "Checking nginx configuration..."
docker-compose -f $COMPOSE_FILE exec nginx nginx -t || {
    log_error "Nginx configuration test failed!"
    exit 1
}

log_info "Restarting nginx container to apply new configuration..."
docker-compose -f $COMPOSE_FILE restart nginx

log_info "Waiting for nginx to start..."
sleep 10

log_info "Testing nginx health..."
if docker-compose -f $COMPOSE_FILE exec nginx nginx -t; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration test failed after restart"
    exit 1
fi

log_info "Checking if nginx is responding..."
if curl -f http://localhost/health &> /dev/null; then
    log_success "Nginx is responding to requests"
else
    log_error "Nginx is not responding properly"
    exit 1
fi

echo
echo -e "${GREEN}=================================="
echo " 🚀 NGINX RESTART SUCCESSFUL!"
echo ""
echo " Configuration changes applied:"
echo " ✅ CSV uploads: 200MB limit"
echo " ✅ Upload timeout: 600 seconds"
echo " ✅ Proxy timeouts: extended"
echo ""
echo " Test CSV upload now at:"
echo " https://qquadro.com"
echo "==================================${NC}"

log_info "Nginx restart completed successfully"
log_info "The 413 Payload Too Large errors should now be resolved"