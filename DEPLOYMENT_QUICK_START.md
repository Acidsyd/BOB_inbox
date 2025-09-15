# 🚀 Quick Start: GitHub → DigitalOcean SSH Deployment

## ✅ What's Ready

1. **SSH Keys Generated** ✅
2. **GitHub Actions Workflow** ✅ (`.github/workflows/deploy.yml`)
3. **Deployment Scripts** ✅
4. **Setup Documentation** ✅

## 🚀 3-Step Setup

### Step 1: Add SSH Key to Droplet

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Add the public key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB3QARN+/0yAIkLkqCN3+1J/SbU1+Sjz7EYYprEmgybh github-deploy-mailsender" >> ~/.ssh/authorized_keys

# Set permissions
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
```

### Step 2: Configure GitHub Secrets

Go to **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:
- `DEPLOY_SSH_KEY`: The private key from `SSH_DEPLOYMENT_SETUP.md`
- `DEPLOY_HOST`: Your droplet IP address
- `DEPLOY_USER`: `root`

### Step 3: Deploy!

**Option A: Automatic** (push to main)
```bash
git push origin main
```

**Option B: Manual** (GitHub Actions)
- Go to Actions tab → Deploy to Production → Run workflow

**Option C: Manual SSH**
```bash
./scripts/deploy-manual.sh YOUR_DROPLET_IP
```

## 🔧 Test Scripts

```bash
# Test SSH connection and server environment
./scripts/deploy-test.sh YOUR_DROPLET_IP

# Manual deployment with confirmation
./scripts/deploy-manual.sh YOUR_DROPLET_IP
```

## 📋 Files Created

- `SSH_DEPLOYMENT_SETUP.md` - Complete setup guide with keys
- `scripts/deploy-test.sh` - Test SSH connection and server
- `scripts/deploy-manual.sh` - Manual deployment script
- `DEPLOYMENT_QUICK_START.md` - This quick reference

## 🎯 What Happens During Deployment

1. **SSH Connection** - GitHub connects to your droplet
2. **Code Update** - Pulls latest code from repository
3. **Dependencies** - Installs/updates Node.js packages
4. **Build** - Runs `npm run build`
5. **Services** - Starts with PM2 process manager
6. **Health Checks** - Verifies services are running

## 🔍 Monitoring

```bash
# SSH into droplet
ssh -i ~/.ssh/github_deploy_mailsender root@YOUR_DROPLET_IP

# Check services
pm2 status
pm2 logs

# Check application
curl http://localhost:4000/health
curl http://localhost:3001
```

## 🆘 Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| SSH permission denied | Re-add public key to droplet |
| GitHub Action fails | Check repository secrets |
| Services won't start | Check `ecosystem.config.js` |
| 502 Error | Restart services: `pm2 restart all` |

---

**🚀 Ready to deploy! Push to main or run the workflow manually.**