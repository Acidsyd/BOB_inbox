# SSH Deployment Setup for GitHub → DigitalOcean

This guide sets up automated deployment from GitHub to your DigitalOcean droplet using SSH keys.

## 🔑 SSH Keys Generated

✅ **SSH Key Pair Created:**
- **Private Key**: `~/.ssh/github_deploy_mailsender`
- **Public Key**: `~/.ssh/github_deploy_mailsender.pub`

## 📋 Setup Steps

### 1. Add SSH Public Key to DigitalOcean Droplet

**Copy this public key to your droplet:**

```bash
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB3QARN+/0yAIkLkqCN3+1J/SbU1+Sjz7EYYprEmgybh github-deploy-mailsender
```

**On your droplet, run:**

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Create the .ssh directory if it doesn't exist
mkdir -p ~/.ssh

# Add the public key to authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB3QARN+/0yAIkLkqCN3+1J/SbU1+Sjz7EYYprEmgybh github-deploy-mailsender" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Test the key (from your local machine)
ssh -i ~/.ssh/github_deploy_mailsender root@your-droplet-ip "echo 'SSH key working!'"
```

### 2. Add GitHub Repository Secrets

Go to your GitHub repository: **Settings → Secrets and variables → Actions**

Add these **Repository Secrets**:

| Secret Name | Value |
|-------------|--------|
| `DEPLOY_SSH_KEY` | Copy the **entire private key** below |
| `DEPLOY_HOST` | Your DigitalOcean droplet IP address |
| `DEPLOY_USER` | `root` (or your deploy user) |

**DEPLOY_SSH_KEY value (entire private key):**

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAd0AETfv9MgCJC5Kgjd/tSf0m1Nfko8+xGGKaxJoMm4QAAAKCVRHPalURz
2gAAAAtzc2gtZWQyNTUxOQAAACAd0AETfv9MgCJC5Kgjd/tSf0m1Nfko8+xGGKaxJoMm4Q
AAAEB3L242dQOSpav8R8INlAz6BaVDmwuVs4VCEMBwso1oqR3QARN+/0yAIkLkqCN3+1J/
SbU1+Sjz7EYYprEmgybhAAAAGGdpdGh1Yi1kZXBsb3ktbWFpbHNlbmRlcgECAwQF
-----END OPENSSH PRIVATE KEY-----
```

### 3. Test SSH Connection

From your local machine:

```bash
# Test the SSH connection
ssh -i ~/.ssh/github_deploy_mailsender root@your-droplet-ip

# If successful, you should connect without password
```

## 🚀 Deployment Workflow

Your existing `.github/workflows/deploy.yml` is ready to use! It will:

1. **Automatically deploy on push to `main` branch**
2. **Manual deployment via GitHub Actions** (workflow_dispatch)

### Deployment Features:

✅ **SSH Key Authentication**  
✅ **Automatic Git Tagging**  
✅ **Service Management (PM2)**  
✅ **Health Checks**  
✅ **Rollback Capability**  
✅ **Nginx Configuration**  

### Deploy Commands:

```bash
# Automatic: Push to main branch
git push origin main

# Manual: Go to GitHub Actions → Deploy to Production → Run workflow
```

## 🔧 Server Prerequisites

Ensure your DigitalOcean droplet has:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt-get install -y nginx
```

## 🔍 Monitoring & Logs

### Check deployment status:

```bash
# SSH into droplet
ssh -i ~/.ssh/github_deploy_mailsender root@your-droplet-ip

# Check PM2 status
pm2 status
pm2 logs

# Check nginx status
sudo systemctl status nginx

# Check application logs
cd /var/www/mailsender
tail -f backend/logs/app.log
```

## 🆘 Troubleshooting

### Common Issues:

| Issue | Solution |
|-------|----------|
| SSH permission denied | Check public key is correctly added to `~/.ssh/authorized_keys` |
| GitHub Action fails | Verify all secrets are set correctly in repository |
| PM2 services not starting | Check `ecosystem.config.js` exists and is valid |
| 502 Bad Gateway | Ensure backend is running on port 4000 |

### Debug Commands:

```bash
# Test SSH key locally
ssh -i ~/.ssh/github_deploy_mailsender -v root@your-droplet-ip

# Check GitHub secrets
# Go to GitHub → Settings → Secrets → Actions

# Manual deployment script
cd /var/www/mailsender
git pull origin main
npm run build
pm2 restart all
```

## 🎯 Next Steps

1. **Add the SSH public key to your droplet**
2. **Configure GitHub repository secrets**
3. **Test SSH connection**
4. **Push to main branch or manually trigger deployment**
5. **Monitor deployment in GitHub Actions**

---

**🔗 Quick Links:**
- Repository: [Your GitHub Repository]
- Droplet: `ssh -i ~/.ssh/github_deploy_mailsender root@your-droplet-ip`
- PM2 Dashboard: `pm2 monit`
- Production URL: `https://your-droplet-ip`