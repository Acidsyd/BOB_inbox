#!/bin/bash

# Production Setup Script for DigitalOcean Deployment
# This script sets up the complete production environment

set -e

echo "🚀 Starting production setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Update system packages
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt install -y curl wget git software-properties-common ufw fail2ban htop

# Install Node.js 20
log_info "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "Node.js installed: $NODE_VERSION"
log_success "npm installed: $NPM_VERSION"

# Install PM2 globally
log_info "Installing PM2..."
npm install pm2 -g
pm2 install pm2-logrotate

# Configure PM2 startup
log_info "Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# Install and configure Nginx
log_info "Installing Nginx..."
apt install -y nginx

# Configure UFW firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443

# Create application directory
APP_DIR="/var/www/mailsender"
log_info "Creating application directory: $APP_DIR"
mkdir -p $APP_DIR
chown -R www-data:www-data /var/www

# Create log directory
LOG_DIR="/var/log/mailsender"
log_info "Creating log directory: $LOG_DIR"
mkdir -p $LOG_DIR
chown -R www-data:www-data $LOG_DIR

# Create systemd service files
log_info "Creating systemd service files..."

# Backend service
cat > /etc/systemd/system/mailsender-backend.service << EOF
[Unit]
Description=Mailsender Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node backend/src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=4000

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
cat > /etc/systemd/system/mailsender-frontend.service << EOF
[Unit]
Description=Mailsender Frontend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Create Nginx configuration
log_info "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/mailsender << EOF
# Mailsender Production Configuration
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # File upload size limit
    client_max_body_size 200M;
    
    # Frontend (static files)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/mailsender /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure logrotate for application logs
log_info "Configuring log rotation..."
cat > /etc/logrotate.d/mailsender << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload all > /dev/null 2>&1 || true
    endscript
}
EOF

# Configure fail2ban for additional security
log_info "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl restart fail2ban

# Set up automatic security updates
log_info "Configuring automatic security updates..."
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Create deployment helper script
log_info "Creating deployment helper script..."
cat > /usr/local/bin/deploy-mailsender << 'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/mailsender"
BACKUP_DIR="/var/backups/mailsender"

echo "🚀 Deploying Mailsender..."

# Create backup
mkdir -p $BACKUP_DIR
if [ -d "$APP_DIR" ]; then
    echo "📦 Creating backup..."
    cp -r $APP_DIR $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)
fi

# Stop services
echo "⏹️ Stopping services..."
pm2 stop all || true
systemctl stop mailsender-backend || true
systemctl stop mailsender-frontend || true

# Deploy new code
cd $APP_DIR
git pull origin main

# Install dependencies and build
echo "🔨 Building application..."
npm run setup
npm run build

# Start services
echo "🚀 Starting services..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
systemctl restart nginx

echo "✅ Deployment completed!"
EOF

chmod +x /usr/local/bin/deploy-mailsender

# Final system configuration
log_info "Applying final system configuration..."

# Restart services
systemctl restart nginx
systemctl enable nginx

log_success "Production setup completed successfully!"
log_info "Next steps:"
echo "1. Clone your application to $APP_DIR"
echo "2. Configure environment variables in $APP_DIR/.env.production"
echo "3. Run: npm run setup && npm run build"
echo "4. Start services: pm2 start ecosystem.config.js"
echo ""
log_info "Useful commands:"
echo "- Deploy updates: deploy-mailsender"
echo "- Check logs: pm2 logs"
echo "- Monitor services: pm2 monit"
echo "- Check status: systemctl status nginx"
echo ""
log_success "Server is ready for deployment! 🎉"