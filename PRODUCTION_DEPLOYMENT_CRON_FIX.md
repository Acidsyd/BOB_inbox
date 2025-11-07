# Production Deployment Guide: Cron Duplicate Fix

**Critical Fix**: Prevents duplicate emails from multiple CronEmailProcessor instances

**Date**: October 21, 2025
**Issue**: Multiple cron instances running simultaneously causing duplicate emails
**Solution**: Add ENABLE_CRON environment variable control

---

## Pre-Deployment Checklist

- [ ] Changes committed to git locally
- [ ] Changes pushed to repository
- [ ] Production server access verified
- [ ] PM2 is installed and running on production
- [ ] Backup of current production code created
- [ ] Production .env file backed up

---

## Deployment Steps

### Step 1: Commit and Push Changes

```bash
# On your local machine
cd /Users/gianpierodifelice/Cloude\ code\ Global/Mailsender

# Add all changed files
git add backend/src/index.js \
        backend/src/services/CronEmailProcessor.js \
        ecosystem.config.cjs \
        CLAUDE.md \
        config/.env.example \
        PRODUCTION_DEPLOYMENT_CRON_FIX.md

# Commit with detailed message
git commit -m "fix(cron): prevent duplicate emails from multiple cron instances

Critical Bug Fix:
- Add ENABLE_CRON environment variable to control cron processor
- Prevents duplicate emails when running both backend and standalone cron
- Fixes issue introduced in commit 810b9c09 (Oct 15)

Changes:
- backend/src/index.js: Add ENABLE_CRON guard with console messages
- CronEmailProcessor.js: Add startup warnings and instance ID
- ecosystem.config.cjs: Add ENABLE_CRON=false to backend process
- CLAUDE.md: Document deployment modes (Simple/Separate/Production)
- config/.env.example: Add ENABLE_CRON configuration section

Deployment Modes:
- Simple (default): npm run dev (backend includes cron)
- Separate: ENABLE_CRON=false npm run dev:backend + npm run cron:dev
- Production: ENABLE_CRON=false npm start + npm run cron

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to repository
git push origin main
```

### Step 2: SSH to Production Server

```bash
# Replace with your production server details
ssh user@your-production-server.com

# Navigate to project directory
cd /var/www/mailsender
```

### Step 3: Backup Current State

```bash
# Create backup directory
mkdir -p ~/backups/mailsender-$(date +%Y%m%d-%H%M%S)

# Backup current code
cp -r /var/www/mailsender ~/backups/mailsender-$(date +%Y%m%d-%H%M%S)/

# Backup PM2 process list
pm2 save
pm2 list > ~/backups/mailsender-$(date +%Y%m%d-%H%M%S)/pm2-processes.txt

# Backup environment file
cp .env ~/backups/mailsender-$(date +%Y%m%d-%H%M%S)/.env.backup

echo "✅ Backup created in ~/backups/"
```

### Step 4: Pull Latest Changes

```bash
# Stash any local changes (if needed)
git stash

# Pull latest changes
git pull origin main

# Verify changes were pulled
git log -1 --oneline
# Should show: "fix(cron): prevent duplicate emails..."
```

### Step 5: Stop Current Processes

```bash
# IMPORTANT: This stops email processing temporarily!
# Only proceed during low-traffic hours

# Stop all PM2 processes
pm2 stop all

# Verify all processes stopped
pm2 list
# All processes should show "stopped" status
```

### Step 6: Update Environment Variables

```bash
# Check current .env file
cat .env | grep ENABLE_CRON

# If ENABLE_CRON is not present, add it
# (The ecosystem.config.cjs already has it, but .env is good practice)
echo "" >> .env
echo "# Cron Configuration" >> .env
echo "# Set to 'false' to disable built-in cron (using dedicated cron process)" >> .env
echo "ENABLE_CRON=false" >> .env

# Verify
cat .env | grep -A 3 "Cron Configuration"
```

### Step 7: Restart Services with PM2

```bash
# Method 1: Reload from ecosystem config (RECOMMENDED)
pm2 delete all
pm2 start ecosystem.config.cjs --env production

# Method 2: Restart existing processes (alternative)
pm2 restart all --update-env

# Verify all processes started
pm2 list
```

### Step 8: Verify Deployment

```bash
# Check backend logs - should see "CronEmailProcessor DISABLED"
pm2 logs mailsender-backend --lines 50 | grep -i cron

# Expected output:
# ⏰ CronEmailProcessor DISABLED (set ENABLE_CRON=true to enable)
# 💡 Run standalone cron with: npm run cron:dev

# Check cron logs - should see startup warning
pm2 logs mailsender-cron --lines 50 | grep -i "instance"

# Expected output:
# 🆔 Instance ID: cron-1729520184562-xxxxx
# ⚠️  WARNING: Ensure ONLY ONE CronEmailProcessor is running!

# Verify only ONE instance ID is printed (not two!)
pm2 logs --lines 200 | grep "Instance ID:" | wc -l
# Should output: 1 (not 2!)
```

### Step 9: Health Checks

```bash
# Check API health
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}

# Check frontend
curl http://localhost:3001/
# Should return HTML

# Check all PM2 processes
pm2 list
# All should be "online" with uptime > 0

# Monitor logs for errors
pm2 logs --lines 50 --nostream
```

### Step 10: Test Email Sending

```bash
# Watch cron logs in real-time
pm2 logs mailsender-cron

# In another terminal, trigger a test campaign (via UI or API)
# Watch the logs to ensure emails are sent only ONCE

# After sending test email, check sent folder
# Verify recipient received only ONE email (not duplicates)
```

---

## Rollback Procedure

If issues occur, rollback immediately:

```bash
# Stop all PM2 processes
pm2 stop all

# Restore from backup
BACKUP_DIR=~/backups/mailsender-YYYYMMDD-HHMMSS  # Use your backup timestamp
cp -r $BACKUP_DIR/* /var/www/mailsender/

# Restore environment file
cp $BACKUP_DIR/.env.backup /var/www/mailsender/.env

# Restart with old code
pm2 restart all

# Verify services are running
pm2 list
```

---

## Monitoring After Deployment

### First 30 Minutes

```bash
# Monitor all logs continuously
pm2 logs --lines 100

# Watch for errors or warnings
pm2 logs --err --lines 50

# Check process memory/CPU
pm2 monit
```

### First 24 Hours

- Monitor sent emails in database
- Verify no duplicate emails sent
- Check for any error spikes
- Monitor system resources

```bash
# Count emails sent in last hour
# (Run this from backend directory or adjust path)
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('updated_at', oneHourAgo);

  console.log('Emails sent in last hour:', count);
})();
"
```

---

## Troubleshooting

### Issue: Still seeing duplicate emails

**Check:**
```bash
# Count running cron instances
pm2 list | grep cron

# Check for duplicate instance IDs in logs
pm2 logs --lines 500 | grep "Instance ID:"

# Verify ENABLE_CRON is set
pm2 describe mailsender-backend | grep ENABLE_CRON
```

**Solution:**
```bash
# Force restart with environment
pm2 delete all
pm2 start ecosystem.config.cjs --env production
```

### Issue: No emails being sent

**Check:**
```bash
# Verify cron process is running
pm2 list | grep mailsender-cron

# Check cron logs for errors
pm2 logs mailsender-cron --lines 100 --err
```

**Solution:**
```bash
# Restart cron process
pm2 restart mailsender-cron
```

### Issue: Backend won't start

**Check:**
```bash
# Check backend logs
pm2 logs mailsender-backend --lines 100 --err

# Verify environment variables
pm2 describe mailsender-backend
```

**Solution:**
```bash
# Restart backend
pm2 restart mailsender-backend

# Or reload from ecosystem
pm2 delete mailsender-backend
pm2 start ecosystem.config.cjs --only mailsender-backend --env production
```

---

## Success Criteria

- ✅ All PM2 processes showing "online" status
- ✅ Backend logs show "CronEmailProcessor DISABLED"
- ✅ Cron logs show single "Instance ID" with warning message
- ✅ No duplicate emails sent to test recipients
- ✅ API health endpoint returning 200 OK
- ✅ Frontend accessible and functional
- ✅ Email campaigns processing normally

---

## Additional Notes

### PM2 Commands Reference

```bash
# View all processes
pm2 list

# View logs
pm2 logs                          # All processes
pm2 logs mailsender-backend       # Specific process
pm2 logs --lines 100              # Last 100 lines
pm2 logs --err                    # Errors only

# Process management
pm2 restart <name>                # Restart process
pm2 reload <name>                 # Zero-downtime reload
pm2 stop <name>                   # Stop process
pm2 delete <name>                 # Remove process

# Monitoring
pm2 monit                         # Real-time monitor
pm2 describe <name>               # Process details

# Save/restore
pm2 save                          # Save process list
pm2 resurrect                     # Restore saved processes
```

### Environment Variable Priority

PM2 loads environment variables in this order (highest to lowest):
1. `ecosystem.config.cjs` env/env_production section
2. System environment variables
3. `.env` file (if using dotenv)

Our fix uses `ecosystem.config.cjs` which has highest priority.

---

## Contact & Support

If issues persist:
1. Check PM2 logs: `pm2 logs --lines 500`
2. Review this document's Troubleshooting section
3. Compare production state with local development
4. Consider rolling back if critical

---

**Deployment completed by**: _________________
**Deployment date**: _________________
**Verification time**: _________________
**Issues encountered**: _________________
**Resolution**: _________________
