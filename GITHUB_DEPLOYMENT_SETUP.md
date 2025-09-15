# GitHub Deployment Setup Guide

## 🚀 Quick Commands Summary

```bash
# Deploy after pushing to GitHub
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "/var/www/mailsender/deploy.sh"

# Manual deployment steps
ssh -i ~/.ssh/qquadro_production root@104.131.93.55
cd /var/www/mailsender
git pull origin main
pm2 restart ecosystem.config.cjs

# Check deployment status
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "pm2 status && pm2 logs --lines 10"

# Test application health
curl http://104.131.93.55:4000/health
curl http://104.131.93.55:3000
```

## ✅ GitHub Setup Status

### Repository Configuration
- **Repository**: `https://github.com/Acidsyd/BOB_inbox.git`
- **Branch**: `main`
- **Authentication**: HTTPS (working)
- **Server Access**: ✅ Verified working

### Server Configuration
- **Location**: `/var/www/mailsender`
- **PM2 Config**: `ecosystem.config.cjs` ✅ Configured
- **Git Remote**: HTTPS ✅ Working
- **SSH Access**: `~/.ssh/qquadro_production` ✅ Working

## 🔄 Complete Deployment Workflow

### 1. Local Development
```bash
# Make your changes locally
git add .
git commit -m "Your descriptive commit message"
git push origin main
```

### 2. Deploy to Production
**Option A: Automated Script (Recommended)**
```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "/var/www/mailsender/deploy.sh"
```

**Option B: Manual Steps**
```bash
# Connect to server
ssh -i ~/.ssh/qquadro_production root@104.131.93.55

# Navigate and pull changes
cd /var/www/mailsender
git pull origin main

# Install dependencies if package.json changed
cd backend && npm install
cd ../frontend && npm install

# Build frontend if frontend changed
cd /var/www/mailsender/frontend
npm run build

# Restart services
cd /var/www/mailsender
pm2 restart ecosystem.config.cjs
```

### 3. Verify Deployment
```bash
# Check service status
pm2 status

# Check logs for errors
pm2 logs --lines 20

# Test endpoints
curl http://104.131.93.55:4000/health
curl http://104.131.93.55:3000
```

## 🛠️ Server Configuration Details

### Git Configuration
```bash
# Current working setup
Remote URL: https://github.com/Acidsyd/BOB_inbox.git
Authentication: HTTPS (no credentials needed for public repo)
Branch: main
```

### PM2 Ecosystem Configuration
```javascript
// /var/www/mailsender/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'mailsender-backend',
      script: 'src/app.js',
      cwd: '/var/www/mailsender/backend',
      env_file: '.env',
      env: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'mailsender-frontend', 
      script: 'server.js',
      cwd: '/var/www/mailsender/frontend',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
}
```

### Environment Files
```bash
# Backend environment
/var/www/mailsender/backend/.env

# Contains all required environment variables:
# - SUPABASE_URL, SUPABASE_SERVICE_KEY
# - JWT_SECRET, EMAIL_ENCRYPTION_KEY
# - GOOGLE_OAUTH2_CLIENT_ID, GOOGLE_OAUTH2_CLIENT_SECRET
# - NODE_ENV=production, PORT=4000
```

## 📋 Deployment Checklist

**Before Each Deployment:**
- [ ] Test changes locally (`npm run dev`)
- [ ] Commit all changes to Git
- [ ] Push to GitHub (`git push origin main`)

**During Deployment:**
- [ ] Pull latest changes (`git pull origin main`)
- [ ] Install dependencies if needed (`npm install`)
- [ ] Build frontend if needed (`npm run build`)
- [ ] Restart PM2 services (`pm2 restart ecosystem.config.cjs`)

**After Deployment:**
- [ ] Check PM2 status (`pm2 status`)
- [ ] Review logs for errors (`pm2 logs --lines 20`)
- [ ] Test health endpoints
- [ ] Verify application functionality

## 🚨 Troubleshooting Guide

### Common Issues

| Issue | Solution |
|-------|----------|
| `git pull` fails | Check internet connection and GitHub status |
| PM2 services not starting | Check `ecosystem.config.cjs` syntax and paths |
| Frontend not updating | Clear browser cache, ensure build completed |
| Backend API errors | Check `.env` file and database connection |
| Port conflicts | Ensure no other processes using ports 3000/4000 |

### Quick Fixes
```bash
# Restart all services
pm2 restart all

# Kill all PM2 processes and restart
pm2 kill
pm2 start ecosystem.config.cjs

# Check port usage
netstat -tulpn | grep :4000
netstat -tulpn | grep :3000

# View detailed logs
pm2 logs mailsender-backend --lines 50
pm2 logs mailsender-frontend --lines 50
```

## 🔍 Health Check Commands

### System Status
```bash
# Check all services
pm2 status

# Monitor in real-time
pm2 monit

# Check system resources
df -h
free -m
```

### Application Health
```bash
# Backend API
curl -I http://104.131.93.55:4000/health
curl -X POST http://104.131.93.55:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Frontend
curl -I http://104.131.93.55:3000

# Database connectivity (via backend)
curl http://104.131.93.55:4000/api/plans/status
```

## 📈 Performance Monitoring

### PM2 Commands
```bash
# Real-time monitoring
pm2 monit

# Detailed process info
pm2 show mailsender-backend
pm2 show mailsender-frontend

# Restart with zero downtime
pm2 reload ecosystem.config.cjs

# View error logs only
pm2 logs --err --lines 20
```

### System Metrics
```bash
# Disk space
df -h /var/www/mailsender

# Memory usage
free -h

# Process list
ps aux | grep node
```

## 🔐 Security Notes

### SSH Key Management
- **Key Location**: `~/.ssh/qquadro_production`
- **Permissions**: `chmod 600` (already configured)
- **Usage**: For server access only

### Environment Security
- Never commit `.env` files to Git
- Regularly rotate API keys and secrets
- Monitor server logs for unauthorized access

## 📚 Related Documentation

- **`DEPLOYMENT_LOGIN_FIX.md`**: Complete login deployment troubleshooting guide
- **`DEPLOYMENT_UPDATE_WORKFLOW.md`**: Detailed deployment workflow with automated scripts
- **`CLAUDE.md`**: Complete project documentation and development guide

## ✅ Setup Verification

### GitHub Integration Status
- [x] Repository accessible from server
- [x] HTTPS authentication working
- [x] Git pull/push operations functional
- [x] PM2 configuration optimized
- [x] Environment variables configured
- [x] Health checks passing
- [x] Deployment workflow documented

### Next Steps
1. **Use the deployment workflow** outlined above for future updates
2. **Monitor logs** after each deployment to catch issues early  
3. **Test thoroughly** on staging before production deployment
4. **Keep documentation updated** as the system evolves

---

**🎯 Your deployment setup is now complete and fully functional!**

Use the automated deployment script for the fastest deployments:
```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "/var/www/mailsender/deploy.sh"
```