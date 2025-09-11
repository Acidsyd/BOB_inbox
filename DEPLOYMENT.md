# Production Deployment Guide

This guide will help you deploy your mailsender application to a fresh DigitalOcean droplet using GitHub Actions.

## Prerequisites

1. **DigitalOcean Droplet**
   - Ubuntu 22.04 LTS
   - At least 2GB RAM, 2 vCPUs
   - Root access

2. **Domain Name** (optional but recommended)
   - DNS pointing to your droplet IP
   - SSL certificate (can be set up later)

3. **GitHub Repository**
   - Code pushed to main branch
   - GitHub Actions enabled

## Step 1: Set Up Your Droplet

### Fresh Droplet Setup

1. **Create a new DigitalOcean droplet**:
   - Ubuntu 22.04 LTS
   - Basic plan (2GB RAM minimum)
   - SSH key authentication

2. **Connect to your droplet**:
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

3. **Run the automated setup**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/production-setup.sh | bash
   ```

   Or manually:
   ```bash
   wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/scripts/production-setup.sh
   chmod +x production-setup.sh
   ./production-setup.sh
   ```

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DEPLOY_HOST` | Your droplet IP or domain | `123.456.789.0` or `yourdomain.com` |
| `DEPLOY_USER` | SSH user (usually `root`) | `root` |
| `DEPLOY_SSH_KEY` | Private SSH key for droplet access | Copy your private key content |

### Getting Your SSH Key

If you need to generate a new SSH key for deployment:

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key -N ""

# Copy the public key to your droplet
ssh-copy-id -i ~/.ssh/deploy_key.pub root@YOUR_DROPLET_IP

# Copy the PRIVATE key content for GitHub Secrets
cat ~/.ssh/deploy_key
```

## Step 3: Configure Environment Variables

1. **Connect to your droplet**:
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

2. **Navigate to the app directory** (after first deployment):
   ```bash
   cd /var/www/mailsender
   ```

3. **Copy and edit the environment file**:
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

4. **Update the environment variables**:
   ```env
   # Database
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-production-service-key
   
   # JWT & Encryption
   JWT_SECRET=your-production-jwt-secret
   EMAIL_ENCRYPTION_KEY=your-32-char-encryption-key
   
   # Google OAuth2
   GOOGLE_OAUTH2_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
   GOOGLE_OAUTH2_CLIENT_SECRET=your-production-client-secret
   GOOGLE_OAUTH2_REDIRECT_URI=https://yourdomain.com/api/oauth2/auth/callback
   
   # Domain Configuration
   CORS_ORIGIN=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

## Step 4: Deploy

### Automatic Deployment

Every push to the `main` branch will automatically trigger deployment:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### Manual Deployment

You can also trigger deployment manually:

1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Deploy to Production" workflow
4. Click "Run workflow"

## Step 5: Verify Deployment

### Check Services Status

```bash
# Connect to your droplet
ssh root@YOUR_DROPLET_IP

# Check PM2 processes
pm2 status

# Check Nginx status
systemctl status nginx

# Check logs
pm2 logs
tail -f /var/log/mailsender/*.log
```

### Test Your Application

1. **Frontend**: Visit `http://YOUR_DROPLET_IP` or `https://yourdomain.com`
2. **API Health**: Visit `http://YOUR_DROPLET_IP/api/health`

## Step 6: SSL Certificate (Optional but Recommended)

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

### Update Nginx Configuration

The SSL certificate will be automatically configured by Certbot.

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   ```bash
   # Test SSH connection
   ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no root@YOUR_DROPLET_IP "echo 'Connection works'"
   ```

2. **Services Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs --error
   
   # Restart services
   pm2 restart all
   systemctl restart nginx
   ```

3. **Environment Variables Not Loading**
   ```bash
   # Check if .env.production exists
   ls -la /var/www/mailsender/.env.production
   
   # Verify environment variables are loaded
   pm2 show mailsender-backend
   ```

4. **Port Issues**
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :3001
   netstat -tulpn | grep :4000
   
   # Check firewall
   ufw status
   ```

### Useful Commands

```bash
# Deploy updates
deploy-mailsender

# Check all logs
pm2 logs

# Monitor services
pm2 monit

# Restart all services
pm2 restart all && systemctl restart nginx

# Check disk space
df -h

# Check memory usage
free -h

# Check system load
htop
```

## Security Considerations

1. **Firewall**: UFW is configured to only allow SSH, HTTP, and HTTPS
2. **Fail2ban**: Configured to prevent brute force attacks
3. **Log rotation**: Automated log rotation to prevent disk space issues
4. **Automatic security updates**: Configured for security patches

## Monitoring

### Log Files

- Application logs: `/var/log/mailsender/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Restart crashed processes
pm2 resurrect
```

## Backup Strategy

The deployment script automatically creates backups in `/var/backups/mailsender/` before each deployment.

To create manual backups:

```bash
# Create backup
cp -r /var/www/mailsender /var/backups/mailsender/backup-$(date +%Y%m%d-%H%M%S)

# Database backup (if using local database)
# This example assumes you're using Supabase, so no local backup needed
```

## Support

If you encounter issues:

1. Check the GitHub Actions logs
2. SSH into your droplet and check service logs
3. Verify environment variables are correctly set
4. Ensure all required secrets are configured in GitHub

## Next Steps

After successful deployment:

1. Set up monitoring (optional)
2. Configure SSL certificate
3. Set up domain name
4. Configure email sending limits based on your provider
5. Test the complete email automation workflow

Your application should now be live and accessible! 🎉