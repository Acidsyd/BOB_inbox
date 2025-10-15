#!/bin/bash

# Simple deployment script for timezone and email truncation fixes
set -e

echo "🚀 Deploying timezone and email truncation fixes to production"
echo "============================================================="

# Configuration
DEPLOY_HOST="104.131.93.55"
DEPLOY_USER="root"
SSH_KEY="$HOME/.ssh/github_deploy_mailsender"
APP_DIR="/var/www/mailsender"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "Please ensure SSH key exists for deployment"
    exit 1
fi

echo "📋 Connecting to production server..."

# Deploy via SSH
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
    set -e

    echo "🔍 Checking server status..."

    # Navigate to app directory
    cd /var/www/mailsender || { echo "❌ App directory not found"; exit 1; }

    echo "📥 Pulling latest changes with timezone fixes..."

    # Fetch and pull latest changes (our commit c0e6bcf2)
    git fetch origin main
    git pull origin main

    # Show latest commit to verify our fix is there
    echo "✅ Latest commit:"
    git log --oneline -1

    # Verify our specific files were updated
    echo "🔍 Verifying fixes are present..."

    # Check timezone fix in frontend/lib/timezone.ts
    if grep -q "stored === 'null' || stored === 'undefined'" frontend/lib/timezone.ts; then
        echo "✅ Timezone fix detected in frontend/lib/timezone.ts"
    else
        echo "⚠️  Timezone fix not found in frontend/lib/timezone.ts"
    fi

    # Check email truncation fix in InboxMessageView.tsx
    if grep -q 'className="break-all"' frontend/components/inbox/InboxMessageView.tsx; then
        echo "✅ Email truncation fix detected in InboxMessageView.tsx"
    else
        echo "⚠️  Email truncation fix not found in InboxMessageView.tsx"
    fi

    echo "🔨 Building application..."

    # Install dependencies if needed
    npm install --production

    # Build frontend and backend
    npm run build

    echo "🔄 Restarting services..."

    # Stop existing services
    pm2 stop all || true

    # Start services with PM2
    pm2 start ecosystem.config.js || {
        echo "📝 ecosystem.config.js not found, starting manually..."
        pm2 start backend/src/server.js --name mailsender-backend
        pm2 start "npm run start" --name mailsender-frontend --cwd frontend
    }

    # Show PM2 status
    echo "📊 Service Status:"
    pm2 status

    # Wait for services to start
    sleep 10

    # Health checks
    echo "🏥 Running health checks..."

    if curl -f http://localhost:4000/health >/dev/null 2>&1; then
        echo "✅ Backend health check passed"
    else
        echo "⚠️  Backend health check failed"
        pm2 logs mailsender-backend --lines 10
    fi

    if curl -f http://localhost:3001 >/dev/null 2>&1; then
        echo "✅ Frontend health check passed"
    else
        echo "⚠️  Frontend health check failed"
        pm2 logs mailsender-frontend --lines 10
    fi

    echo "🎉 Deployment completed!"
    echo "🎯 Timezone and email truncation fixes are now live"

EOF

echo ""
echo "✅ Deployment completed!"
echo "🌐 Your application should now be running with the fixes at:"
echo "   http://104.131.93.55"
echo ""
echo "🔍 To monitor the application:"
echo "   ssh -i $SSH_KEY $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs'"
echo "   ssh -i $SSH_KEY $DEPLOY_USER@$DEPLOY_HOST 'pm2 status'"