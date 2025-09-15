#!/bin/bash

# SSH Deployment Test Script
# Usage: ./scripts/deploy-test.sh [droplet-ip]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSH_KEY="$HOME/.ssh/github_deploy_mailsender"
DEPLOY_USER="root"
DROPLET_IP="${1:-}"

echo -e "${GREEN}🚀 SSH Deployment Test Script${NC}"
echo "=================================="

# Check if droplet IP is provided
if [ -z "$DROPLET_IP" ]; then
    echo -e "${RED}❌ Error: Droplet IP required${NC}"
    echo "Usage: ./scripts/deploy-test.sh [droplet-ip]"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    echo "Run ssh-keygen first or check SSH_DEPLOYMENT_SETUP.md"
    exit 1
fi

echo -e "${YELLOW}🔑 Testing SSH connection...${NC}"

# Test SSH connection
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$DEPLOY_USER@$DROPLET_IP" "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo "1. Make sure the public key is added to the droplet"
    echo "2. Check the droplet IP is correct"
    echo "3. Verify SSH service is running on the droplet"
    exit 1
fi

echo -e "${YELLOW}🔍 Checking server environment...${NC}"

# Check server environment
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DROPLET_IP" << 'EOF'
    echo "🐧 Server: $(uname -a)"
    echo "📦 Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "📦 NPM: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "📦 PM2: $(pm2 --version 2>/dev/null || echo 'Not installed')"
    echo "🌐 Nginx: $(nginx -v 2>&1 | head -1 || echo 'Not installed')"
    echo "💾 Disk space: $(df -h / | tail -1)"
    echo "🧠 Memory: $(free -h | grep Mem)"
EOF

echo -e "${YELLOW}📋 Checking GitHub repository access...${NC}"

# Test GitHub repository access from server
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DROPLET_IP" << 'EOF'
    # Test Git and GitHub access
    if command -v git >/dev/null 2>&1; then
        echo "✅ Git is installed: $(git --version)"
        
        # Test GitHub connectivity
        if git ls-remote https://github.com/Acidsyd/BOB_inbox.git HEAD >/dev/null 2>&1; then
            echo "✅ GitHub repository is accessible"
        else
            echo "❌ Cannot access GitHub repository"
        fi
    else
        echo "❌ Git is not installed"
    fi
EOF

echo -e "${YELLOW}🏗️ Testing deployment directory...${NC}"

# Check/create deployment directory
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DROPLET_IP" << 'EOF'
    APP_DIR="/var/www/mailsender"
    
    echo "📁 App directory: $APP_DIR"
    
    if [ -d "$APP_DIR" ]; then
        echo "✅ App directory exists"
        ls -la "$APP_DIR" | head -5
        
        if [ -d "$APP_DIR/.git" ]; then
            echo "✅ Git repository detected"
            cd "$APP_DIR"
            echo "📍 Current branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
            echo "📍 Last commit: $(git log --oneline -1 2>/dev/null || echo 'none')"
        else
            echo "ℹ️ No Git repository in app directory"
        fi
    else
        echo "ℹ️ App directory doesn't exist (will be created during deployment)"
        echo "📁 Creating directory: $APP_DIR"
        mkdir -p "$APP_DIR"
        ls -la "$(dirname "$APP_DIR")"
    fi
EOF

echo -e "${GREEN}✅ SSH deployment test completed!${NC}"
echo ""
echo -e "${YELLOW}🎯 Next steps:${NC}"
echo "1. Configure GitHub repository secrets:"
echo "   - DEPLOY_SSH_KEY (private key content)"
echo "   - DEPLOY_HOST: $DROPLET_IP"
echo "   - DEPLOY_USER: $DEPLOY_USER"
echo ""
echo "2. Test deployment:"
echo "   - Push to main branch, or"
echo "   - Manually trigger GitHub Actions workflow"
echo ""
echo "3. Monitor deployment:"
echo "   - GitHub Actions logs"
echo "   - Server: ssh -i $SSH_KEY $DEPLOY_USER@$DROPLET_IP"
echo ""
echo -e "${GREEN}🚀 Ready for deployment!${NC}"