# 🚀 GitHub Actions Auto-Deployment Setup

This document explains how to set up automatic deployment to Digital Ocean using GitHub Actions.

## 📋 Overview

The GitHub Actions workflow (`/.github/workflows/deploy.yml`) automatically:
- ✅ Runs code quality checks (TypeScript, ESLint)
- ✅ Deploys to Digital Ocean production server on `main` branch pushes  
- ✅ Performs health checks after deployment
- ✅ Automatically rolls back if deployment fails
- ✅ Includes the 413 error fixes for CSV uploads

## 🔑 Required GitHub Secrets

You need to configure one GitHub secret for the deployment to work:

### 1. DEPLOY_SSH_KEY

This is the private SSH key that allows GitHub Actions to connect to your Digital Ocean server.

**To set this up:**

1. **Generate SSH key pair** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@qquadro.com"
   # Save as: ~/.ssh/github_actions_key (or any name you prefer)
   ```

2. **Add public key to Digital Ocean server**:
   ```bash
   # Copy the public key
   cat ~/.ssh/github_actions_key.pub
   
   # On your Digital Ocean server, add it to authorized_keys
   ssh root@qquadro.com
   echo "your-public-key-content" >> ~/.ssh/authorized_keys
   ```

3. **Add private key to GitHub Secrets**:
   - Go to your GitHub repository
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `DEPLOY_SSH_KEY`
   - Value: Copy the **entire private key** content:
     ```bash
     cat ~/.ssh/github_actions_key
     # Copy everything including -----BEGIN OPENSSH PRIVATE KEY-----
     ```

## 🏗️ Production Server Setup

Make sure your Digital Ocean server has the following:

### 1. Application Directory Structure
```bash
# The workflow looks for your app in one of these locations:
/root/mailsender/          # Primary location
/opt/mailsender/           # Alternative location  
~/mailsender/              # Fallback location
```

### 2. Required Files
- `docker-compose.production.yml` - Production Docker configuration
- `nginx/server.conf` - Nginx configuration with 413 error fixes
- Git repository with `origin` remote pointing to GitHub

### 3. Dependencies Installed
```bash
# Make sure these are installed on your server:
docker --version
docker-compose --version
git --version
curl --version
```

## 🔧 GitHub Environment Setup

1. **Create Production Environment**:
   - Go to **Settings** → **Environments**
   - Click **New environment**
   - Name: `production`
   - (Optional) Add protection rules like requiring reviews

## ⚡ How It Works

### Automatic Deployment Trigger
```yaml
on:
  push:
    branches: [main]  # Deploys when you push to main branch
```

### Deployment Process
1. **Code Quality Gate** - TypeScript & ESLint validation
2. **SSH Connection** - Connects to qquadro.com using SSH key
3. **Git Pull** - Fetches latest changes from GitHub
4. **Docker Rebuild** - Stops, rebuilds, and starts containers
5. **Health Checks** - Verifies all services are running
6. **CSV Upload Test** - Tests the 413 error fixes
7. **Rollback** - If anything fails, automatically reverts

### 📊 What Gets Fixed
- ✅ **Nginx limits**: 200MB upload limit for CSV files
- ✅ **Express.js limits**: 100MB body size limit
- ✅ **Timeout settings**: Extended to 600 seconds
- ✅ **Docker configuration**: Proper mounting and service management

## 🧪 Testing the Setup

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "test: trigger auto-deployment"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to **Actions** tab in GitHub
   - Watch the "Deploy to Production" workflow
   - Check logs for any issues

3. **Verify CSV upload fix**:
   - Visit https://qquadro.com
   - Try uploading a large CSV file (up to 200MB)
   - Should no longer get 413 errors

## 🔍 Troubleshooting

### Common Issues

**1. SSH Connection Failed**
```bash
# Test SSH connection manually:
ssh -i ~/.ssh/github_actions_key root@qquadro.com

# If this fails, check:
# - SSH key is correct
# - Public key is in authorized_keys
# - Server allows SSH connections
```

**2. Application Directory Not Found**
```bash
# Make sure your app is in one of these locations:
ls -la /root/mailsender/
ls -la /opt/mailsender/
ls -la ~/mailsender/
```

**3. Docker Compose Fails**
```bash
# Check if docker-compose.production.yml exists:
cat docker-compose.production.yml

# Check Docker is running:
docker ps
systemctl status docker
```

**4. Still Getting 413 Errors**
```bash
# Check nginx configuration is loaded:
docker-compose -f docker-compose.production.yml exec nginx nginx -t
docker-compose -f docker-compose.production.yml exec nginx cat /etc/nginx/conf.d/default.conf

# Restart nginx container specifically:
docker-compose -f docker-compose.production.yml restart nginx
```

## 🎯 Manual Deployment (Fallback)

If GitHub Actions isn't working, you can deploy manually:

```bash
# SSH into your server
ssh root@qquadro.com

# Navigate to app directory
cd /root/mailsender  # or wherever your app is

# Run the deployment script
chmod +x production-deploy.sh
./production-deploy.sh
```

## 📈 Monitoring

The workflow provides detailed logging:
- 🔍 **Health checks** for all containers
- 📊 **CSV upload endpoint testing**
- 🌐 **Website accessibility verification**
- 📋 **Container status monitoring**
- 📄 **Recent logs display**

## 🔐 Security Notes

- ✅ SSH keys are stored securely in GitHub Secrets
- ✅ Environment protection rules can require approvals
- ✅ Workflow only runs on `main` branch pushes
- ✅ Rollback mechanism protects against failed deployments
- ✅ All connections use SSH with key authentication

---

**🎉 Once configured, every push to `main` will automatically deploy your 413 error fixes to production!**