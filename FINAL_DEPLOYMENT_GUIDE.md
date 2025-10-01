# 🚀 BOBinbox Production Deployment Guide

Complete step-by-step guide for deploying the BOBinbox email platform to DigitalOcean.

## 📋 Prerequisites

### 1. DigitalOcean Droplet
- **Ubuntu 20.04/22.04** droplet
- **Minimum**: 2GB RAM, 1 vCPU, 50GB SSD
- **Recommended**: 4GB RAM, 2 vCPU, 80GB SSD for production
- Root SSH access configured

### 2. Domain Setup
- Domain pointing to your droplet IP (A record)
- Optional: www subdomain (CNAME record)

### 3. Development Environment
- Node.js 18+ and npm
- Git configured with repository access
- SSH key pair generated

---

## 🛠️ Step 1: Server Preparation

### 1.1 Initial Server Setup

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl git nginx software-properties-common

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2
```

### 1.2 Create Application Directory

```bash
# Create application directory
mkdir -p /var/www/mailsender
cd /var/www/mailsender

# Set permissions (if not root)
chown -R $USER:$USER /var/www/mailsender
```

---

## 🔐 Step 2: Environment Configuration

### 2.1 Create Environment File

```bash
# Create .env file
nano /var/www/mailsender/.env
```

**Add the following configuration:**

```env
# Server Configuration
NODE_ENV=production
PORT=4000

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars
EMAIL_ENCRYPTION_KEY=your-32-character-encryption-key

# CORS Configuration (CRITICAL)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://YOUR_DROPLET_IP

# Google OAuth2 (Required for Gmail integration)
GOOGLE_OAUTH2_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH2_REDIRECT_URI=https://yourdomain.com/api/oauth2/auth/callback

# SMTP Fallback (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
UPLOAD_DIR=/var/www/mailsender/uploads

# Optional: Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
```

**Important Notes:**
- Replace `YOUR_DROPLET_IP` with your actual droplet IP address
- Replace `yourdomain.com` with your actual domain
- Generate secure secrets for JWT_SECRET and EMAIL_ENCRYPTION_KEY
- CORS_ORIGINS must include both domain AND IP address for IP-based access

---

## 📥 Step 3: Code Deployment

### 3.1 Clone Repository

```bash
# Navigate to app directory
cd /var/www/mailsender

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Or if already cloned, pull latest changes
git pull origin main
```

### 3.2 Install Dependencies

```bash
# Install backend dependencies
cd /var/www/mailsender
npm install

# Install frontend dependencies
cd frontend
npm install

# Return to root
cd /var/www/mailsender
```

### 3.3 Build Application

```bash
# Build frontend for production
npm run build

# Verify build completed
ls -la frontend/.next
```

---

## 🗄️ Step 4: Database Setup

### 4.1 Supabase Configuration

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note down URL and keys

2. **Run Database Migrations**:
   ```bash
   # If you have migration scripts
   npm run db:migrate
   ```

3. **Seed Data** (if applicable):
   ```bash
   npm run db:seed
   ```

---

## 🔄 Step 5: Process Management with PM2

### 5.1 Create PM2 Ecosystem File

```bash
# Create ecosystem.config.cjs
nano /var/www/mailsender/ecosystem.config.cjs
```

**Add this configuration:**

```javascript
module.exports = {
  apps: [
    {
      name: 'mailsender-backend',
      script: './backend/src/index.js',
      cwd: '/var/www/mailsender',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'mailsender-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/mailsender/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    },
    {
      name: 'mailsender-cron',
      script: './backend/src/cron.js',
      cwd: '/var/www/mailsender',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 4 * * *',
      max_memory_restart: '512M',
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
      log_file: './logs/cron-combined.log',
      time: true
    }
  ]
};
```

### 5.2 Create Logs Directory

```bash
mkdir -p /var/www/mailsender/logs
```

### 5.3 Start Applications

```bash
# Start all applications
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Follow the instructions provided by pm2 startup command
```

---

## 🌐 Step 6: Nginx Configuration

### 6.1 Create Nginx Configuration

```bash
# Create site configuration
nano /etc/nginx/sites-available/mailsender
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com YOUR_DROPLET_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (Next.js)
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
        proxy_read_timeout 86400;
    }

    # Backend API
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
        proxy_read_timeout 86400;

        # CORS headers for API
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        add_header Access-Control-Allow-Credentials true always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin $http_origin always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
            add_header Access-Control-Allow-Credentials true always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain charset=UTF-8';
            add_header Content-Length 0;
            return 204;
        }
    }

    # File uploads
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json;
}
```

### 6.2 Enable Site and Restart Nginx

```bash
# Enable the site
ln -s /etc/nginx/sites-available/mailsender /etc/nginx/sites-enabled/

# Remove default site (optional)
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Enable nginx to start on boot
systemctl enable nginx
```

---

## 🔒 Step 7: SSL Certificate (Optional but Recommended)

### 7.1 Install Certbot

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx
```

### 7.2 Obtain SSL Certificate

```bash
# Get certificate for your domain
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts to configure SSL
```

### 7.3 Auto-renewal

```bash
# Test auto-renewal
certbot renew --dry-run

# Check crontab for auto-renewal (should be automatic)
crontab -l
```

---

## 🔧 Step 8: Firewall Configuration

### 8.1 Configure UFW

```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow ssh

# Allow HTTP and HTTPS
ufw allow 80
ufw allow 443

# Check status
ufw status
```

---

## 🏃‍♂️ Step 9: Application Health Checks

### 9.1 Verify Services

```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs

# Check Nginx status
systemctl status nginx

# Check application endpoints
curl http://localhost:4000/health
curl http://localhost:3001
curl http://YOUR_DROPLET_IP/api/health
```

### 9.2 Test Login Functionality

1. **Visit your application**:
   - Domain: `https://yourdomain.com`
   - IP: `http://YOUR_DROPLET_IP`

2. **Test user registration/login**:
   - Create test account
   - Verify OAuth2 integration
   - Test email features

---

## 📊 Step 10: Monitoring & Maintenance

### 10.1 Log Management

```bash
# View real-time logs
pm2 logs

# View specific app logs
pm2 logs mailsender-backend
pm2 logs mailsender-frontend
pm2 logs mailsender-cron

# Log rotation setup
pm2 install pm2-logrotate
```

### 10.2 System Monitoring

```bash
# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor memory usage
free -h

# Monitor PM2 processes
pm2 monit
```

### 10.3 Backup Strategy

```bash
# Backup application files
tar -czf mailsender-backup-$(date +%Y%m%d).tar.gz /var/www/mailsender

# Backup environment file
cp /var/www/mailsender/.env /var/www/mailsender/.env.backup
```

---

## 🚀 Step 11: Deployment Automation (GitHub Actions)

### 11.1 Setup GitHub Secrets

Add these secrets in **GitHub Repository → Settings → Secrets and variables → Actions**:

- `DEPLOY_SSH_KEY`: Your private SSH key
- `DEPLOY_HOST`: Your droplet IP address
- `DEPLOY_USER`: `root`

### 11.2 GitHub Actions Workflow

The repository includes `.github/workflows/deploy.yml` for automated deployment.

**Manual deployment trigger:**
- Go to Actions tab → Deploy to Production → Run workflow

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Login fails with CORS error** | Verify CORS_ORIGINS includes both domain and IP |
| **502 Bad Gateway** | Check PM2 services: `pm2 restart all` |
| **OAuth2 not working** | Verify Google OAuth2 redirect URI matches domain |
| **Database connection fails** | Check Supabase URL and keys in .env |
| **File uploads failing** | Check nginx client_max_body_size |
| **Email sending fails** | Verify SMTP credentials or OAuth2 setup |

### Service Commands

```bash
# Restart all services
pm2 restart all

# Restart specific service
pm2 restart mailsender-backend

# Stop all services
pm2 stop all

# View service logs
pm2 logs --lines 50

# Monitor services
pm2 monit

# Reload PM2 configuration
pm2 reload ecosystem.config.cjs

# Restart Nginx
systemctl restart nginx

# Check Nginx errors
tail -f /var/log/nginx/error.log
```

### Performance Optimization

```bash
# Monitor performance
pm2 monit

# Scale instances (if needed)
pm2 scale mailsender-backend 2

# Update application
cd /var/www/mailsender
git pull origin main
npm install
npm run build
pm2 restart all
```

---

## ✅ Final Verification Checklist

- [ ] All PM2 services running (`pm2 status`)
- [ ] Nginx configured and running (`systemctl status nginx`)
- [ ] Application accessible via domain and IP
- [ ] SSL certificate installed (if using HTTPS)
- [ ] User registration/login working
- [ ] OAuth2 integration functional
- [ ] Email sending/receiving working
- [ ] Database operations successful
- [ ] CORS configured for both domain and IP access
- [ ] Firewall properly configured
- [ ] Logs rotating properly
- [ ] Backup strategy in place

---

## 📞 Support

If you encounter issues:

1. Check the application logs: `pm2 logs`
2. Verify service status: `pm2 status`
3. Test API endpoints: `curl http://localhost:4000/health`
4. Check Nginx logs: `tail -f /var/log/nginx/error.log`

**Successfully deployed!** Your BOBinbox email platform is now running in production.