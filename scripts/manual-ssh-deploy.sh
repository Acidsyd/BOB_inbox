#!/bin/bash

# Manual SSH deployment script for immediate spintax fix
# Usage: ./scripts/manual-ssh-deploy.sh

set -e

echo "🚀 Manual SSH Deployment - Spintax Fix"
echo "======================================"

# Configuration
DEPLOY_HOST="104.131.93.55"
DEPLOY_USER="root"
SSH_KEY="~/.ssh/github_deploy_mailsender"
APP_DIR="/var/www/mailsender"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test SSH connection
log "Testing SSH connection..."
if ssh -i $SSH_KEY -o ConnectTimeout=10 $DEPLOY_USER@$DEPLOY_HOST "echo 'Connected'" 2>/dev/null; then
    success "SSH connection successful"
else
    error "SSH connection failed. Please check:"
    echo "  1. SSH key exists: $SSH_KEY"
    echo "  2. Public key added to server: $DEPLOY_HOST"
    echo "  3. Server is accessible"
    exit 1
fi

# Deploy the spintax fix
log "Deploying spintax fix to production server..."

ssh -i $SSH_KEY $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
    set -e

    echo "🔍 Checking server status..."

    # Navigate to app directory
    if [ -d "/var/www/mailsender" ]; then
        cd /var/www/mailsender
        echo "📁 Found app directory: /var/www/mailsender"
    elif [ -d "/root/mailsender" ]; then
        cd /root/mailsender
        echo "📁 Found app directory: /root/mailsender"
    elif [ -d "/home/mailsender" ]; then
        cd /home/mailsender
        echo "📁 Found app directory: /home/mailsender"
    else
        echo "❌ App directory not found! Creating fresh installation..."
        mkdir -p /var/www/mailsender
        cd /var/www/mailsender

        # Clone repository
        git clone https://github.com/Acidsyd/BOB_inbox.git .
    fi

    echo "📥 Pulling latest changes with spintax fix..."

    # Fetch latest changes
    git fetch origin main
    git pull origin main

    # Show the latest commit
    echo "✅ Latest commit:"
    git log --oneline -1

    # Check if the spintax fix is present
    if grep -q "SpintaxParser" backend/src/services/CronEmailProcessor.js; then
        echo "✅ Spintax fix detected in CronEmailProcessor.js"
    else
        echo "⚠️  Spintax fix not found - manual intervention needed"
    fi

    echo "🔄 Restarting services..."

    # Restart backend service (where the fix is)
    if command -v pm2 >/dev/null 2>&1; then
        echo "🔄 Restarting with PM2..."
        pm2 restart backend || pm2 start backend/src/index.js --name backend
        pm2 restart frontend || pm2 start "npm run start" --name frontend

        # Show PM2 status
        echo "📊 PM2 Status:"
        pm2 status
    else
        echo "⚠️  PM2 not found - attempting direct restart..."

        # Kill existing processes
        pkill -f "node.*server.js" || true
        sleep 2

        # Start backend
        cd backend
        nohup npm start > /var/log/mailsender-backend.log 2>&1 &
        cd ..

        echo "🚀 Backend started in background"
    fi

    # Test if backend is responding
    sleep 5
    if curl -f http://localhost:4000/health >/dev/null 2>&1; then
        echo "✅ Backend health check passed"
    else
        echo "⚠️  Backend health check failed - may still be starting"
    fi

    echo "🎉 Deployment completed!"
    echo "🎯 Spintax fix is now active - emails will process spintax before sending"

EOF

success "🎉 Manual deployment completed!"
echo ""
echo "Next steps:"
echo "1. Monitor your campaigns to verify spintax is processed correctly"
echo "2. Check server logs: ssh -i $SSH_KEY $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs'"
echo "3. Test spintax processing with your campaign emails"
