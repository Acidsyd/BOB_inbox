#!/bin/bash

# ================================
# Production Deployment Script
# Fix: Prevent Duplicate Emails from Multiple Cron Instances
# ================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=================================="
echo " CRON DUPLICATE FIX DEPLOYMENT"
echo " Mailsender Production Server"
echo "=================================="
echo -e "${NC}"
echo ""

# Check if running in production directory
if [ ! -f "ecosystem.config.cjs" ]; then
    echo -e "${RED}❌ Error: Must be run from /var/www/mailsender directory${NC}"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will restart all PM2 processes!${NC}"
echo -e "${YELLOW}⚠️  Email processing will be interrupted briefly.${NC}"
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}[1/8]${NC} Creating backup..."
BACKUP_DIR=~/backups/mailsender-$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR
cp -r . $BACKUP_DIR/
cp .env $BACKUP_DIR/.env.backup 2>/dev/null || echo "No .env file to backup"
pm2 save
pm2 list > $BACKUP_DIR/pm2-processes.txt
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"

echo ""
echo -e "${BLUE}[2/8]${NC} Stashing local changes..."
git stash || echo "No changes to stash"

echo ""
echo -e "${BLUE}[3/8]${NC} Pulling latest changes..."
git pull origin main
LATEST_COMMIT=$(git log -1 --oneline)
echo -e "${GREEN}✅ Latest commit: $LATEST_COMMIT${NC}"

echo ""
echo -e "${BLUE}[4/8]${NC} Checking for ENABLE_CRON in .env..."
if grep -q "ENABLE_CRON" .env; then
    echo -e "${GREEN}✅ ENABLE_CRON already in .env${NC}"
else
    echo -e "${YELLOW}⚠️  Adding ENABLE_CRON to .env${NC}"
    echo "" >> .env
    echo "# Cron Configuration" >> .env
    echo "# Set to 'false' to disable built-in cron (using dedicated cron process)" >> .env
    echo "ENABLE_CRON=false" >> .env
    echo -e "${GREEN}✅ ENABLE_CRON added to .env${NC}"
fi

echo ""
echo -e "${BLUE}[5/8]${NC} Installing/updating dependencies..."
cd backend
npm install --production
cd ..
echo -e "${GREEN}✅ Dependencies updated${NC}"

echo ""
echo -e "${BLUE}[6/8]${NC} Stopping all PM2 processes..."
pm2 stop all
echo -e "${GREEN}✅ All processes stopped${NC}"

echo ""
echo -e "${BLUE}[7/8]${NC} Restarting with new configuration..."
pm2 delete all
pm2 start ecosystem.config.cjs --env production
sleep 5
echo -e "${GREEN}✅ Processes restarted${NC}"

echo ""
echo -e "${BLUE}[8/8]${NC} Verifying deployment..."
echo ""

# Check process status
echo -e "${BLUE}PM2 Process Status:${NC}"
pm2 list

echo ""
echo -e "${BLUE}Checking for duplicate cron instances...${NC}"
CRON_INSTANCES=$(pm2 logs --lines 500 --nostream 2>/dev/null | grep "Instance ID:" | wc -l)
if [ "$CRON_INSTANCES" -eq 1 ]; then
    echo -e "${GREEN}✅ Only ONE cron instance detected${NC}"
elif [ "$CRON_INSTANCES" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No cron instance detected yet (may still be starting)${NC}"
else
    echo -e "${RED}❌ WARNING: Multiple cron instances detected ($CRON_INSTANCES)${NC}"
    echo -e "${RED}   Check logs: pm2 logs${NC}"
fi

echo ""
echo -e "${BLUE}Recent backend logs:${NC}"
pm2 logs mailsender-backend --lines 20 --nostream | grep -i cron || echo "No cron messages in backend logs"

echo ""
echo -e "${BLUE}Recent cron logs:${NC}"
pm2 logs mailsender-cron --lines 20 --nostream | head -20

echo ""
echo -e "${GREEN}=================================="
echo " 🚀 DEPLOYMENT COMPLETE!"
echo "==================================${NC}"

echo ""
echo -e "${BLUE}📋 Post-Deployment Checklist:${NC}"
echo "1. Monitor logs: pm2 logs"
echo "2. Send test campaign and verify NO duplicates"
echo "3. Check sent emails in Gmail"
echo "4. Monitor for 30 minutes: pm2 monit"
echo ""
echo -e "${BLUE}Rollback (if needed):${NC}"
echo "cd $BACKUP_DIR"
echo "cp -r . /var/www/mailsender/"
echo "pm2 restart all"
echo ""
echo -e "${BLUE}Backup location:${NC} $BACKUP_DIR"
echo ""
