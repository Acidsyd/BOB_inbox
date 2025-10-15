# GitHub Actions Deployment to DigitalOcean

Complete guide for setting up automatic deployment from GitHub to your DigitalOcean droplet.

## Prerequisites

- DigitalOcean droplet (Ubuntu)
- GitHub repository
- SSH access to your droplet
- Domain name (optional, but recommended)

## Step 1: Generate SSH Key for Deployment

On your local machine, generate a dedicated SSH key for GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_mailsender
```

This creates two files:
- `~/.ssh/github_deploy_mailsender` (private key - for GitHub)
- `~/.ssh/github_deploy_mailsender.pub` (public key - for droplet)

## Step 2: Add Public Key to Droplet

Copy the public key to your droplet's authorized_keys:

```bash
# Display the public key
cat ~/.ssh/github_deploy_mailsender.pub

# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Add the public key
mkdir -p ~/.ssh
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
exit
```

**Test the connection:**
```bash
ssh -i ~/.ssh/github_deploy_mailsender root@YOUR_DROPLET_IP
```

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions → Repository secrets**

Add these **three secrets**:

### 1. DEPLOY_SSH_KEY
```bash
# Copy the ENTIRE private key to clipboard
cat ~/.ssh/github_deploy_mailsender | pbcopy
```

- Click **"New repository secret"**
- Name: `DEPLOY_SSH_KEY`
- Value: Paste the private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
- **IMPORTANT**: Make sure there are NO extra spaces or blank lines between the key content lines

### 2. DEPLOY_HOST
- Name: `DEPLOY_HOST`
- Value: Your droplet IP address (e.g., `104.131.93.55`) or domain (e.g., `yourdomain.com`)

### 3. DEPLOY_USER
- Name: `DEPLOY_USER`
- Value: `root` (or your SSH username if different)

## Step 4: Prepare Droplet Environment

SSH into your droplet and set up the environment:

```bash
# Create application directory
sudo mkdir -p /var/www/mailsender
sudo chown -R $USER:$USER /var/www/mailsender

# Install Node.js 20 (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get update && sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create log directory
sudo mkdir -p /var/log/mailsender
sudo chown -R $USER:$USER /var/log/mailsender

# Setup environment file
cd /var/www/mailsender
nano .env.production
```

Add your production environment variables:
```env
NODE_ENV=production
PORT=4000
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
# ... add all required env vars
```

## Step 5: Configure Nginx

Create/update nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

```nginx
server {
    server_name yourdomain.com www.yourdomain.com YOUR_DROPLET_IP;

    # API routes to backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend - all other routes
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    listen 80;
    listen [::]:80;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Fix Ecosystem Config for ESM

Rename the PM2 ecosystem config to use `.cjs` extension:

```bash
# In your local repository
mv ecosystem.config.js ecosystem.config.cjs
git add ecosystem.config.cjs
git commit -m "fix: rename ecosystem config to .cjs for ESM compatibility"
git push origin main
```

## Step 7: GitHub Actions Workflow

The workflow file already exists at `.github/workflows/deploy.yml`. Key features:

- **Triggers**: Automatically on push to `main` branch, or manually via workflow_dispatch
- **SSH Connection**: Uses `webfactory/ssh-agent` for secure SSH key handling
- **Deployment Steps**:
  1. Checkout code
  2. Setup SSH connection
  3. Test SSH connection
  4. Create deployment tag
  5. SSH into droplet and deploy
  6. Start/restart services with PM2
  7. Run health checks

## Step 8: Test Deployment

Push a test commit to trigger deployment:

```bash
echo "# Test deployment $(date)" >> README.md
git add README.md
git commit -m "test: trigger deployment"
git push origin main
```

Monitor the deployment:
1. Go to GitHub → Actions tab
2. Watch the "Deploy to Production" workflow
3. Check logs for any errors

## Step 9: Verify Deployment

Once deployment completes, verify everything is running:

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Check PM2 status
pm2 status

# Check nginx status
sudo systemctl status nginx

# Test services locally
curl http://localhost:3001  # Frontend
curl http://localhost:4000/api/health  # Backend

# Check logs
pm2 logs --lines 50
```

Access your site:
- **HTTP**: http://YOUR_DROPLET_IP or http://yourdomain.com
- **HTTPS**: https://yourdomain.com (if SSL is configured)

## Common Issues & Solutions

### Issue: "Permission denied (publickey)"

**Solution**: The SSH key format in GitHub secrets is incorrect.

1. Copy the key again: `cat ~/.ssh/github_deploy_mailsender | pbcopy`
2. Update `DEPLOY_SSH_KEY` secret in GitHub
3. Ensure NO extra blank lines between key content lines
4. Make sure you copied the PRIVATE key (not the .pub file)

### Issue: "502 Bad Gateway"

**Possible causes:**

1. **Services not running**:
   ```bash
   pm2 status
   pm2 restart all
   ```

2. **Wrong port in nginx**:
   - Frontend should proxy to `localhost:3001`
   - Backend should proxy to `localhost:4000`
   - Check: `sudo cat /etc/nginx/sites-enabled/yourdomain.com`

3. **Nginx configuration error**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Issue: "ecosystem.config.js malformed"

**Solution**: ESM modules require `.cjs` extension for CommonJS files.

```bash
cd /var/www/mailsender
mv ecosystem.config.js ecosystem.config.cjs
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```

### Issue: Git permission denied when pushing tags

**Solution**: Already fixed in workflow with `permissions: contents: write`

## Manual Deployment (Emergency)

If GitHub Actions fails, you can deploy manually:

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Navigate to app directory
cd /var/www/mailsender

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart services
pm2 restart ecosystem.config.cjs

# Check status
pm2 status
pm2 logs --lines 50
```

## Monitoring & Maintenance

### View PM2 Logs
```bash
pm2 logs                    # All logs
pm2 logs mailsender-backend # Backend only
pm2 logs mailsender-frontend # Frontend only
pm2 logs --lines 100        # Last 100 lines
```

### Restart Services
```bash
pm2 restart all
pm2 restart mailsender-backend
pm2 reload ecosystem.config.cjs
```

### Save PM2 Process List
```bash
pm2 save
pm2 startup  # Enable PM2 on system boot
```

### Update PM2
```bash
pm2 update
```

## SSL/HTTPS Setup (Optional but Recommended)

Install Certbot and get free SSL certificate:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## Workflow Customization

Edit `.github/workflows/deploy.yml` to customize:

- Add environment variables
- Change deployment branch
- Add build steps
- Configure health checks
- Add Slack/Discord notifications

## Rollback

If a deployment fails, you can quickly rollback:

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd /var/www/mailsender

# View available tags
git tag -l | grep deploy-

# Checkout previous deployment
git checkout deploy-20251002-160000

# Rebuild and restart
npm install
npm run build
pm2 restart ecosystem.config.cjs
```

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [DigitalOcean Guides](https://docs.digitalocean.com/)

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check PM2 logs on droplet
3. Check nginx error logs: `/var/log/nginx/error.log`
4. Verify all environment variables are set correctly
5. Ensure firewall allows ports 80 and 443

---

**Deployment Setup Complete!** 🎉

Your application now automatically deploys to production every time you push to the `main` branch.
