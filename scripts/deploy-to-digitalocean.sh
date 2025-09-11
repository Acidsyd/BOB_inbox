#!/bin/bash

# Deploy to DigitalOcean App Platform
# This script creates or updates the Mailsender app on DigitalOcean

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
APP_NAME="mailsender"
REPO_OWNER="Acidsyd"
REPO_NAME="BOB_inbox"
SPEC_FILE=".do/app.yaml"

echo "🚀 DigitalOcean App Platform Deployment"
echo "======================================"
echo "App Name: $APP_NAME"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo "Spec File: $SPEC_FILE"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    error "doctl CLI is not installed. Please install it first:"
    echo "curl -sL https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz | tar -xzv"
    echo "sudo mv doctl /usr/local/bin"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list &> /dev/null; then
    error "Please authenticate with DigitalOcean first:"
    echo "doctl auth init"
    exit 1
fi

log "📋 Checking existing apps..."
if doctl apps list --format name | grep -q "^$APP_NAME$"; then
    log "🔄 App '$APP_NAME' exists, updating..."
    
    # Get app ID
    APP_ID=$(doctl apps list --format id,name --no-header | grep "$APP_NAME" | awk '{print $1}')
    
    if [ -z "$APP_ID" ]; then
        error "Could not find app ID for $APP_NAME"
        exit 1
    fi
    
    log "📝 Updating app with ID: $APP_ID"
    doctl apps update "$APP_ID" --spec "$SPEC_FILE"
    
    if [ $? -eq 0 ]; then
        success "✅ App updated successfully!"
    else
        error "❌ Failed to update app"
        exit 1
    fi
    
else
    log "🆕 Creating new app..."
    doctl apps create --spec "$SPEC_FILE"
    
    if [ $? -eq 0 ]; then
        success "✅ App created successfully!"
    else
        error "❌ Failed to create app"
        exit 1
    fi
fi

# Get app info
log "📊 Getting app information..."
doctl apps get "$APP_NAME" --format "name,default_ingress,live_url,phase,created_at"

echo ""
success "🎉 Deployment completed!"
echo ""
echo "📚 Next Steps:"
echo "1. Configure environment variables in DigitalOcean dashboard"
echo "2. Monitor deployment progress: doctl apps get $APP_NAME"
echo "3. Check logs: doctl apps logs $APP_NAME"
echo ""
echo "🔗 Useful Commands:"
echo "  View app: doctl apps get $APP_NAME"
echo "  View logs: doctl apps logs $APP_NAME --follow"
echo "  List deployments: doctl apps list-deployments $APP_NAME"
echo ""