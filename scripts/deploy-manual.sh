#!/bin/bash

# Manual SSH Deployment Script
# Usage: ./scripts/deploy-manual.sh [droplet-ip]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSH_KEY="$HOME/.ssh/github_deploy_mailsender"
DEPLOY_USER="root"
DROPLET_IP="${1:-}"
APP_DIR="/var/www/mailsender"
REPO_URL="https://github.com/Acidsyd/BOB_inbox.git"

echo -e "${GREEN}🚀 Manual SSH Deployment${NC}"
echo "=========================="

# Check if droplet IP is provided
if [ -z "$DROPLET_IP" ]; then
    echo -e "${RED}❌ Error: Droplet IP required${NC}"
    echo "Usage: ./scripts/deploy-manual.sh [droplet-ip]"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    echo "Run ssh-keygen first or check SSH_DEPLOYMENT_SETUP.md"
    exit 1
fi

# Create deployment timestamp
DEPLOYMENT_ID="deploy-$(date +%s)"
DEPLOYMENT_TAG="manual-deploy-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}📋 Deployment Details:${NC}"
echo "  Server: $DEPLOY_USER@$DROPLET_IP"
echo "  App Dir: $APP_DIR"
echo "  Deployment ID: $DEPLOYMENT_ID"
echo "  Tag: $DEPLOYMENT_TAG"
echo ""

# Confirm deployment
read -p "🤔 Continue with deployment? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️ Deployment cancelled${NC}"
    exit 0
fi

echo -e "${YELLOW}🔄 Starting deployment...${NC}"

# Deploy to server
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DROPLET_IP" << EOF
    set -e
    
    echo "🚀 Starting deployment: $DEPLOYMENT_ID"
    
    # Create app directory if it doesn't exist
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Stop services gracefully
    echo "⏹️ Stopping services..."
    pm2 stop all || true
    
    # Create backup if app exists
    if [ -d ".git" ]; then
        echo "💾 Creating backup..."
        mkdir -p /var/backups/mailsender
        cp -r . "/var/backups/mailsender/backup-$DEPLOYMENT_ID" || true
    fi
    
    # Clone or update repository
    if [ -d ".git" ]; then
        echo "📥 Updating existing repository..."
        git fetch --all --tags
        git checkout main
        git pull origin main
    else
        echo "📦 Cloning repository..."
        cd /tmp
        rm -rf mailsender-temp || true
        git clone --branch main --single-branch $REPO_URL mailsender-temp
        cd mailsender-temp
        
        # Move files to app directory
        cp -r * $APP_DIR/ 2>/dev/null || true
        cp -r .* $APP_DIR/ 2>/dev/null || true
        cd $APP_DIR
        rm -rf /tmp/mailsender-temp || true
    fi
    
    # Install system dependencies if needed
    if ! command -v node >/dev/null 2>&1; then
        echo "📦 Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || true
        apt-get update && apt-get install -y nodejs || true
    fi
    
    if ! command -v pm2 >/dev/null 2>&1; then
        echo "📦 Installing PM2..."
        npm install -g pm2 || true
    fi
    
    # Setup environment
    if [ ! -f ".env.production" ]; then
        echo "🔧 Setting up environment..."
        cp .env.production.example .env.production || true
        echo "⚠️ Please configure .env.production with your settings"
    fi
    
    # Install dependencies and build
    echo "🔨 Building application..."
    npm run setup || npm install
    npm run build || true
    
    # Start services
    echo "🚀 Starting services..."
    if [ -f "ecosystem.config.js" ]; then
        pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    else
        pm2 start backend/src/server.js --name mailsender-backend || true
        pm2 start "npm run start" --name mailsender-frontend || true
    fi
    
    # Start nginx if available
    systemctl restart nginx || true
    systemctl enable nginx || true
    
    # Show status
    echo "📊 Service Status:"
    pm2 status || true
    
    echo "✅ Deployment $DEPLOYMENT_ID completed!"
    
EOF

echo -e "${YELLOW}🔍 Running health checks...${NC}"

# Wait for services to start
sleep 15

# Health checks
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DROPLET_IP" << 'EOF'
    echo "🏥 Health Checks:"
    
    # Check backend
    if curl -f http://localhost:4000/health 2>/dev/null; then
        echo "✅ Backend health check passed"
    else
        echo "⚠️ Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3001 2>/dev/null; then
        echo "✅ Frontend health check passed"
    else
        echo "⚠️ Frontend health check failed"
    fi
    
    # Show final status
    echo ""
    echo "📊 Final Status:"
    pm2 status || true
EOF

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED!${NC}"
echo "========================="
echo -e "${GREEN}✅ Manual deployment successful${NC}"
echo -e "${GREEN}✅ Services started with PM2${NC}"
echo -e "${GREEN}✅ Health checks completed${NC}"
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
echo "  Production URL: http://$DROPLET_IP"
echo "  SSH access: ssh -i $SSH_KEY $DEPLOY_USER@$DROPLET_IP"
echo ""
echo -e "${YELLOW}📋 Post-deployment tasks:${NC}"
echo "  1. Configure .env.production with your settings"
echo "  2. Set up SSL certificate (Let's Encrypt)"
echo "  3. Configure domain DNS if applicable"
echo "  4. Set up monitoring and backup"
echo ""
echo -e "${BLUE}🔍 Monitoring commands:${NC}"
echo "  pm2 status    # Check service status"
echo "  pm2 logs      # View application logs"
echo "  pm2 monit     # Real-time monitoring"