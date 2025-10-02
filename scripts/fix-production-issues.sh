#!/bin/bash

# Fix Production Server Issues
# Run this script on the production server to fix disk space and git ownership issues

set -e  # Exit on error

echo "🔧 Starting production server fixes..."

# 1. Fix git ownership issue
echo "📝 Fixing git ownership..."
cd /var/www/mailsender
sudo git config --global --add safe.directory /var/www/mailsender

# 2. Clean old backups (keep only last 3)
echo "🗑️  Cleaning old backups..."
cd /var/backups/mailsender
ls -t | tail -n +4 | xargs -r rm -rf
echo "✅ Old backups cleaned"

# 3. Clean frontend build artifacts
echo "🧹 Cleaning frontend build artifacts..."
cd /var/www/mailsender/frontend
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Removed .next directory"
fi

# 4. Check disk space
echo "💾 Current disk usage:"
df -h /

# 5. Clean npm cache if disk space is still critical
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Disk usage still high ($DISK_USAGE%), cleaning npm cache..."
    npm cache clean --force
    echo "✅ npm cache cleaned"
fi

# 6. Clean old PM2 logs
echo "📋 Cleaning old PM2 logs..."
pm2 flush
if [ -d "/var/log/mailsender" ]; then
    find /var/log/mailsender -name "*.log" -mtime +7 -delete
    echo "✅ Old PM2 logs cleaned"
fi

# 7. Final disk space check
echo ""
echo "💾 Final disk usage:"
df -h /

echo ""
echo "✅ Production fixes completed!"
echo "📝 Next steps:"
echo "   1. Trigger a new deployment by pushing to git"
echo "   2. Or run: gh workflow run deploy.yml"
