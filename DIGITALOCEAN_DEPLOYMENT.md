# DigitalOcean Production Deployment Guide
## Cold Email Automation Platform - qquadro.com

### 🚀 Complete Step-by-Step Deployment

---

## Prerequisites

- **Domain**: qquadro.com (you own this domain)
- **DigitalOcean Account** with $200 credit
- **Supabase Project** (production database)
- **Google OAuth2 Credentials** (production setup)
- **Local Development** working properly

---

## Phase 1: DigitalOcean Infrastructure Setup (15 minutes)

### 1.1 Create DigitalOcean Account
1. Visit [DigitalOcean.com](https://www.digitalocean.com/)
2. Sign up with your email
3. Verify account and **claim $200 credit** (60 days free)
4. Add payment method (required but won't be charged during credit period)

### 1.2 Create Production Droplet
1. **Create Droplet** → Ubuntu 22.04 LTS
2. **Size**: Basic Plan → $24/month (4GB RAM, 2 vCPUs, 80GB SSD)
3. **Datacenter**: Choose closest to your target users
4. **Authentication**: 
   - Create SSH key: `ssh-keygen -t rsa -b 4096 -C "your-email@example.com"`
   - Add public key to DigitalOcean
5. **Hostname**: `qquadro-production`
6. **Create Droplet** → Note the IP address

### 1.3 Configure Domain DNS
1. Go to your domain provider (GoDaddy, Namecheap, etc.)
2. **Add A Record**:
   - **Name**: `@` (root domain)
   - **Value**: Your Droplet IP address
   - **TTL**: 300 (5 minutes)
3. **Add CNAME Record**:
   - **Name**: `www`
   - **Value**: `qquadro.com`
4. **Wait 5-15 minutes** for DNS propagation

---

## Phase 2: Server Preparation (20 minutes)

### 2.1 Connect to Server
```bash
# Connect via SSH
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install required packages
apt install -y curl git ufw fail2ban
```

### 2.2 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Start Docker on boot
systemctl enable docker
systemctl start docker
```

### 2.3 Configure Security
```bash
# Configure firewall
ufw enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# Start fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Phase 3: Application Deployment (25 minutes)

### 3.1 Clone Repository
```bash
# Create application directory
mkdir -p /opt/mailsender
cd /opt/mailsender

# Clone your repository (replace with your actual repo)
git clone https://github.com/yourusername/mailsender.git .

# OR upload files via SCP from local machine:
# scp -r /path/to/local/mailsender root@YOUR_DROPLET_IP:/opt/mailsender
```

### 3.2 Configure Environment Variables
```bash
# Copy environment template
cp .env.production.template .env.production

# Edit environment file
nano .env.production
```

**Required Environment Variables** (replace ALL placeholders):
```bash
# Core Configuration
NODE_ENV=production
FRONTEND_URL=https://qquadro.com
BACKEND_URL=https://qquadro.com

# Frontend URLs
NEXT_PUBLIC_API_URL=https://qquadro.com
NEXT_PUBLIC_WS_URL=wss://qquadro.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Security (Generate these with: openssl rand -base64 32)
JWT_SECRET=your-32-char-jwt-secret
JWT_REFRESH_SECRET=your-32-char-refresh-secret
EMAIL_ENCRYPTION_KEY=your-32-char-encryption-key

# Redis Configuration
REDIS_PASSWORD=your-secure-redis-password

# Google OAuth2 Production Setup
GOOGLE_OAUTH2_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH2_REDIRECT_URI=https://qquadro.com/api/oauth2/auth/callback

# Optional: SMTP Fallback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3.3 Set Up Google OAuth2 Production
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Create Project** or select existing one
3. **Enable Gmail API**
4. **Create OAuth2 Credentials**:
   - Application type: Web application
   - Name: "qquadro.com Production"
   - Authorized redirect URIs: `https://qquadro.com/api/oauth2/auth/callback`
5. **Copy Client ID and Secret** to `.env.production`

---

## Phase 4: SSL and Production Launch (20 minutes)

### 4.1 Deploy Application
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run automated deployment
./deploy.sh
```

The deployment script will:
- ✅ Check system requirements
- ✅ Configure firewall
- ✅ Generate SSL certificates (Let's Encrypt)
- ✅ Build Docker images
- ✅ Start all services
- ✅ Perform health checks

### 4.2 Verify Deployment
```bash
# Check all containers are running
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Test endpoints
curl -k https://qquadro.com/health
curl -k https://qquadro.com/api/health
```

**Expected Results**:
- ✅ **Frontend**: https://qquadro.com (login page loads)
- ✅ **API**: https://qquadro.com/api/health returns "OK"
- ✅ **SSL**: Green lock in browser
- ✅ **All containers**: Running without errors

---

## Phase 5: Database & Email Setup (15 minutes)

### 5.1 Run Database Migrations (if needed)
```bash
# Connect to backend container
docker-compose -f docker-compose.production.yml exec backend /bin/sh

# Run migrations
npm run db:migrate  # If you have this script

# Set up inbox folders
node backend/src/scripts/setup-inbox-folders.js

# Exit container
exit
```

### 5.2 Test Complete Email Flow
1. **Visit https://qquadro.com**
2. **Register Account** → Should work with production database
3. **OAuth2 Login** → Test Gmail connection
4. **Create Campaign** → Verify email account linking
5. **Send Test Email** → Confirm email delivery

---

## Phase 6: Monitoring & Maintenance (10 minutes)

### 6.1 Set Up Monitoring
```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Set up log rotation
nano /etc/logrotate.d/mailsender
```

**Log Rotation Configuration**:
```
/opt/mailsender/logs/**/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

### 6.2 Backup Strategy
```bash
# Create backup script
nano /opt/backup-mailsender.sh
```

**Backup Script**:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/mailsender_$DATE.tar.gz /opt/mailsender

# Backup Docker volumes
docker run --rm -v mailsender_redis-data:/data -v $BACKUP_DIR:/backup alpine tar -czf /backup/redis_$DATE.tar.gz -C /data .

# Keep only last 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Make backup script executable
chmod +x /opt/backup-mailsender.sh

# Set up daily backup cron job
crontab -e
# Add: 0 2 * * * /opt/backup-mailsender.sh
```

---

## 🎯 Production Checklist

### ✅ Infrastructure
- [ ] DigitalOcean Droplet created ($24/month)
- [ ] Domain DNS pointed to server IP
- [ ] SSH access configured
- [ ] Firewall rules active (80, 443, 22)

### ✅ Application
- [ ] Repository cloned/uploaded
- [ ] `.env.production` configured with all variables
- [ ] Docker images built successfully
- [ ] All containers running (nginx, frontend, backend, redis, cron-processor)

### ✅ Security
- [ ] SSL certificates generated (Let's Encrypt)
- [ ] HTTPS working with green lock
- [ ] Security headers configured
- [ ] Rate limiting active

### ✅ Email System
- [ ] Google OAuth2 production credentials
- [ ] Gmail API enabled and working
- [ ] Test campaign created and sent
- [ ] Email delivery confirmed

### ✅ Monitoring
- [ ] Health checks passing
- [ ] Log rotation configured
- [ ] Daily backups scheduled
- [ ] SSL auto-renewal configured

---

## 📞 Troubleshooting

### Common Issues & Solutions

#### 1. SSL Certificate Issues
```bash
# Regenerate certificates
./deploy.sh ssl

# Check certificate status
docker run --rm -v $(pwd)/nginx/ssl:/certs alpine ls -la /certs
```

#### 2. Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs [service-name]

# Restart specific service
docker-compose -f docker-compose.production.yml restart [service-name]
```

#### 3. Database Connection Issues
```bash
# Test Supabase connection
curl -H "Authorization: Bearer YOUR_SERVICE_KEY" "https://your-project.supabase.co/rest/v1/users?select=*"
```

#### 4. OAuth2 Not Working
- Verify redirect URI matches exactly: `https://qquadro.com/api/oauth2/auth/callback`
- Check Google Cloud Console credentials
- Ensure Gmail API is enabled

#### 5. Email Not Sending
```bash
# Check cron processor logs
docker-compose -f docker-compose.production.yml logs cron-processor

# Verify Gmail API permissions
# Check rate limiting status in admin panel
```

---

## 📊 Performance Monitoring

### Server Monitoring Commands
```bash
# System resources
htop

# Docker resource usage
docker stats

# Disk usage
df -h

# Application logs
docker-compose -f docker-compose.production.yml logs -f --tail=100
```

### Application Monitoring URLs
- **Health Check**: https://qquadro.com/health
- **API Status**: https://qquadro.com/api/health
- **Frontend**: https://qquadro.com
- **SSL Test**: https://www.ssllabs.com/ssltest/analyze.html?d=qquadro.com

---

## 🔄 Maintenance Tasks

### Weekly Tasks
- [ ] Check application logs for errors
- [ ] Monitor server resources (CPU, RAM, disk)
- [ ] Verify SSL certificate expiry (auto-renews)
- [ ] Test email sending functionality

### Monthly Tasks
- [ ] Update system packages: `apt update && apt upgrade`
- [ ] Review and clean old logs
- [ ] Check backup integrity
- [ ] Monitor DigitalOcean billing (after free credit)

### Updates & Deployment
```bash
# To deploy updates
cd /opt/mailsender
git pull origin main
./deploy.sh build
docker-compose -f docker-compose.production.yml up -d --no-deps --build frontend backend
```

---

## 💰 Cost Breakdown

**DigitalOcean Costs** (after $200 credit expires):
- **Droplet**: $24/month (4GB RAM, 2 vCPUs, 80GB SSD)
- **Backup Space**: ~$1/month (20GB)
- **Bandwidth**: Free (1TB included)

**Total**: ~$25/month after the first 60 days free

---

## 🎉 Success! Your Production Deployment

**🌐 Application URLs:**
- **Main App**: https://qquadro.com
- **API**: https://qquadro.com/api
- **Health**: https://qquadro.com/health

**🔐 Admin Access:**
- **Server**: `ssh root@YOUR_DROPLET_IP`
- **Logs**: `docker-compose -f docker-compose.production.yml logs -f`
- **Console**: `docker-compose -f docker-compose.production.yml exec backend /bin/sh`

**📧 Email System:**
- Production-ready cold email automation
- Gmail OAuth2 integration
- 99.9% uptime with automatic restarts
- Comprehensive rate limiting and deliverability

Your cold email automation platform is now live and ready for production use! 🚀