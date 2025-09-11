# 🚀 GitHub Actions Auto-Deploy Setup Guide

## Overview
Your repository is now configured for automatic deployment to Digital Ocean whenever you push to the `main` branch.

## 📋 Setup Checklist

### 1. GitHub Repository Secrets (REQUIRED)
You need to add your SSH private key to GitHub secrets:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DEPLOY_SSH_KEY`
5. Value: Your SSH private key content (the one you use to SSH to root@qquadro.com)

### 2. SSH Key Format
Your SSH key should look like this:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn
...
-----END OPENSSH PRIVATE KEY-----
```

### 3. Testing the SSH Key
To verify your SSH key works:
```bash
ssh -i ~/.ssh/your_key root@qquadro.com
```

## 🔄 How Auto-Deployment Works

### Triggers
- **Automatic**: Every push to `main` branch
- **Manual**: Via GitHub Actions "Run workflow" button

### Deployment Process
1. Checkout latest code
2. SSH to your Digital Ocean server (qquadro.com)
3. Navigate to `/root/mailsender`
4. Pull latest changes with `git reset --hard origin/main`
5. Stop existing Docker containers
6. Rebuild and restart containers with latest code
7. Verify deployment health
8. Report success/failure

### What Gets Deployed
- All code changes from `main` branch
- Rebuilt Docker images (frontend, backend, nginx, redis, cron processor)
- Updated configurations (nginx, environment variables)
- Your CSV uploader fixes and 200MB upload limits

## 🛡️ Security Features

### Safe Deployment
- Uses `git reset --hard` to ensure clean deployments
- Removes orphaned containers with `--remove-orphans`
- Force recreates containers with `--force-recreate`
- Health checks verify deployment success

### Error Handling
- Deployment fails fast on any error
- Provides detailed logs for troubleshooting
- Includes manual deployment commands as fallback

## 📊 Monitoring

### GitHub Actions
- View deployment status in GitHub Actions tab
- See real-time logs during deployment
- Get notified of deployment success/failure

### Server Health Checks
- Website availability check (https://qquadro.com)
- API health endpoint verification
- Docker container status monitoring

## 🚨 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   ```
   Solution: Verify DEPLOY_SSH_KEY secret is correct
   Test: ssh -i ~/.ssh/your_key root@qquadro.com
   ```

2. **Docker Build Failed**
   ```
   Check server logs: ssh root@qquadro.com 'cd /root/mailsender && docker-compose logs'
   Manual fix: SSH to server and run deployment commands manually
   ```

3. **Service Health Check Failed**
   ```
   Services might be starting up - check after 1-2 minutes
   Manual check: curl -f https://qquadro.com/api/health
   ```

### Manual Deployment (Fallback)
If auto-deployment fails, you can deploy manually:
```bash
ssh root@qquadro.com
cd /root/mailsender
git pull origin main
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

## 🎯 Next Steps

1. **Add the SSH key secret to GitHub** (most important!)
2. **Test deployment**: Make a small change and push to `main`
3. **Monitor first deployment**: Watch GitHub Actions tab
4. **Verify deployment**: Check https://qquadro.com works

## 🔍 Environment Setup

Your Digital Ocean server should have:
- Git repository cloned to `/root/mailsender`
- Docker and Docker Compose installed
- Environment variables configured in `.env` file
- SSL certificates configured for HTTPS

## 📝 Post-Deployment

After each deployment:
- ✅ Website loads at https://qquadro.com
- ✅ CSV upload works (200MB limit)
- ✅ All application features functional
- ✅ No errors in browser console
- ✅ Backend API responding

---

**🎉 You're all set!** Every push to `main` will now automatically deploy to your Digital Ocean server.