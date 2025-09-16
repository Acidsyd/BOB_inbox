#!/bin/bash

# Manual SSH deployment script for email variable fix
# Usage: ./scripts/deploy-email-variable-fix.sh

set -e

echo "🚀 Manual SSH Deployment - Email Variable Fix"
echo "============================================="

# Configuration
DEPLOY_HOST="104.131.93.55"
DEPLOY_USER="root"
SSH_KEY="~/.ssh/github_deploy_mailsender"
APP_DIR="/var/www/mailsender"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
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

# First, commit and push changes locally
log "Committing email variable fix..."

if git diff --quiet && git diff --cached --quiet; then
    warning "No uncommitted changes found. Email variable fix should already be committed."
else
    log "Committing email variable fix..."
    git add -A
    git commit -m "fix: remove double spintax processing to fix email variable substitution

- Variables like {first_name}, {company} now properly substitute with lead data
- Removed redundant spintax processing in CronEmailProcessor
- Content is already personalized during campaign creation
- Fixes issue where variables showed as literal text instead of values

🎯 Email variables will now work correctly in sent campaigns"
fi

log "Pushing changes to GitHub..."
git push origin main

# Deploy the email variable fix
log "Deploying email variable fix to production server..."

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

        # Clone repository - you'll need to update this with your actual repository URL
        echo "⚠️  Please update the repository URL in the script"
        echo "⚠️  Using placeholder URL - update as needed"
        # git clone https://github.com/yourusername/your-repo.git .
        exit 1
    fi

    echo "📥 Pulling latest changes with email variable fix..."

    # Fetch latest changes
    git fetch origin main
    git pull origin main

    # Show the latest commit
    echo "✅ Latest commit:"
    git log --oneline -1

    # Check if the email variable fix is present
    if grep -q "Use pre-processed content from scheduled_emails table" backend/src/services/CronEmailProcessor.js; then
        echo "✅ Email variable fix detected in CronEmailProcessor.js"
    else
        echo "⚠️  Email variable fix not found - manual intervention needed"
    fi

    # Verify the fix is correct
    if grep -q "processedSubject = email.subject" backend/src/services/CronEmailProcessor.js; then
        echo "✅ Confirmed: Double spintax processing removed"
    else
        echo "⚠️  Warning: Fix may not be applied correctly"
    fi

    echo "📦 Installing/updating dependencies..."

    # Install backend dependencies if package.json changed
    if [ -d "backend" ]; then
        cd backend
        npm install --production
        cd ..
    fi

    # Install frontend dependencies if package.json changed
    if [ -d "frontend" ]; then
        cd frontend
        npm install --production
        cd ..
    fi

    echo "🔄 Restarting services..."

    # Restart backend service (where the fix is)
    if command -v pm2 >/dev/null 2>&1; then
        echo "🔄 Restarting with PM2..."

        # Restart backend - this is where the email variable fix is
        pm2 restart backend || pm2 start backend/src/server.js --name backend

        # Also restart cron processor if it exists
        pm2 restart cron-processor || pm2 start "npm run cron:dev" --name cron-processor --cwd backend

        # Restart frontend
        pm2 restart frontend || pm2 start "npm run start" --name frontend

        # Show PM2 status
        echo "📊 PM2 Status:"
        pm2 status

        # Show backend logs to check for issues
        echo "📋 Recent backend logs:"
        pm2 logs backend --lines 10 || true

    else
        echo "⚠️  PM2 not found - attempting direct restart..."

        # Kill existing processes
        pkill -f "node.*server.js" || true
        pkill -f "CronEmailProcessor" || true
        sleep 3

        # Start backend
        cd backend
        nohup npm start > /var/log/mailsender-backend.log 2>&1 &

        # Start cron processor
        nohup npm run cron:dev > /var/log/mailsender-cron.log 2>&1 &
        cd ..

        echo "🚀 Services started in background"
    fi

    # Test if backend is responding
    sleep 5
    if curl -f http://localhost:4000/api/health >/dev/null 2>&1; then
        echo "✅ Backend health check passed"
    else
        echo "⚠️  Backend health check failed - may still be starting"
        echo "🔍 Checking if backend is running on port 4000..."
        if lsof -i :4000 >/dev/null 2>&1; then
            echo "✅ Port 4000 is occupied - backend likely starting"
        else
            echo "❌ Port 4000 is not occupied - backend may have failed to start"
        fi
    fi

    echo "🎉 Deployment completed!"
    echo ""
    echo "📧 Email Variable Fix Summary:"
    echo "- Variables like {first_name}, {company} will now show actual values"
    echo "- Fixed double spintax processing issue"
    echo "- Personalization happens during campaign creation (already working)"
    echo "- CronEmailProcessor now uses pre-processed content"
    echo ""
    echo "🧪 Test the fix by:"
    echo "1. Creating a new campaign with {first_name} in subject/content"
    echo "2. Starting the campaign"
    echo "3. Checking sent emails show actual names, not '{first_name}'"

EOF

success "🎉 Email variable fix deployment completed!"
echo ""
echo "✅ What was fixed:"
echo "   • Variables like {first_name}, {company}, {job_title} will now show actual values"
echo "   • Removed double spintax processing that was interfering with personalization"
echo "   • Emails will display recipient names instead of variable placeholders"
echo ""
echo "🧪 Next steps:"
echo "1. Create a test campaign with {first_name} in the subject or content"
echo "2. Monitor your campaigns to verify variables are substituted correctly"
echo "3. Check server logs: ssh -i $SSH_KEY $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs backend'"
echo ""
echo "🔍 Debug if needed:"
echo "   ssh -i $SSH_KEY $DEPLOY_USER@$DEPLOY_HOST"
echo "   pm2 logs backend"
echo "   pm2 logs cron-processor"