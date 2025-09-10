#!/bin/bash

# ================================
# DigitalOcean Production Deployment Script
# Domain: qquadro.com
# Cold Email Automation Platform
# ================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="qquadro.com"
EMAIL="admin@qquadro.com"  # Change this to your email
COMPOSE_FILE="docker-compose.production.yml"

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

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if running as root (needed for some operations)
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Consider using a non-root user with sudo privileges."
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found. Please create it from .env.production.template"
        exit 1
    fi
    
    log_success "System requirements check passed"
}

setup_firewall() {
    log_info "Configuring firewall (UFW)..."
    
    # Install and enable UFW if not already enabled
    if command -v ufw &> /dev/null; then
        sudo ufw --force enable
        sudo ufw allow ssh
        sudo ufw allow 80/tcp   # HTTP
        sudo ufw allow 443/tcp  # HTTPS
        sudo ufw --force reload
        log_success "Firewall configured"
    else
        log_warning "UFW not found. Skipping firewall configuration."
    fi
}

setup_ssl_directories() {
    log_info "Setting up SSL directories..."
    
    # Create directories for SSL certificates and Certbot
    sudo mkdir -p nginx/ssl
    sudo mkdir -p logs/nginx
    sudo mkdir -p /var/www/certbot
    
    # Set proper permissions
    sudo chown -R $USER:$USER nginx/ssl
    sudo chown -R $USER:$USER logs
    
    log_success "SSL directories created"
}

generate_ssl_certificates() {
    log_info "Generating SSL certificates with Let's Encrypt..."
    
    # First, start nginx temporarily for domain verification
    log_info "Starting temporary nginx for domain verification..."
    
    # Create temporary nginx config for certificate generation
    cat > nginx/temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name ${DOMAIN} www.${DOMAIN};
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
}
EOF

    # Start temporary nginx container
    docker run -d --name temp-nginx \
        -p 80:80 \
        -v $(pwd)/nginx/temp.conf:/etc/nginx/nginx.conf:ro \
        -v /var/www/certbot:/var/www/certbot:ro \
        nginx:alpine

    # Wait for nginx to start
    sleep 5

    # Run Certbot to get certificates
    docker run --rm \
        -v /var/www/certbot:/var/www/certbot \
        -v $(pwd)/nginx/ssl:/etc/letsencrypt/live/${DOMAIN}:rw \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} \
        -d www.${DOMAIN}

    # Stop and remove temporary nginx
    docker stop temp-nginx && docker rm temp-nginx

    # Copy certificates to the correct location
    if [ -d "/var/lib/docker/volumes/ssl-certs/_data" ]; then
        sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
        sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/
    fi

    log_success "SSL certificates generated successfully"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build backend image
    docker build -f backend/Dockerfile.production -t mailsender-backend:production ./backend
    
    # Build frontend image  
    docker build -f frontend/Dockerfile.production -t mailsender-frontend:production ./frontend
    
    log_success "Docker images built successfully"
}

deploy_application() {
    log_info "Deploying application..."
    
    # Load environment variables
    export $(cat .env.production | grep -v '^#' | xargs)
    
    # Stop any existing containers
    docker-compose -f ${COMPOSE_FILE} down || true
    
    # Start the application
    docker-compose -f ${COMPOSE_FILE} up -d
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    log_success "Application deployed successfully"
}

check_health() {
    log_info "Performing health checks..."
    
    # Check nginx
    if curl -f -k https://${DOMAIN}/health &> /dev/null; then
        log_success "Nginx is healthy"
    else
        log_error "Nginx health check failed"
    fi
    
    # Check backend API
    if curl -f -k https://${DOMAIN}/api/health &> /dev/null; then
        log_success "Backend API is healthy"
    else
        log_error "Backend API health check failed"
    fi
    
    # Show running containers
    log_info "Running containers:"
    docker-compose -f ${COMPOSE_FILE} ps
}

setup_auto_renewal() {
    log_info "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > /tmp/renew-certs.sh << 'EOF'
#!/bin/bash
docker run --rm \
    -v /var/www/certbot:/var/www/certbot \
    -v nginx-ssl:/etc/letsencrypt \
    certbot/certbot renew \
    --quiet

# Reload nginx after renewal
docker-compose -f /opt/mailsender/docker-compose.production.yml exec nginx nginx -s reload
EOF

    sudo mv /tmp/renew-certs.sh /etc/cron.daily/renew-certs
    sudo chmod +x /etc/cron.daily/renew-certs
    
    log_success "SSL auto-renewal configured"
}

main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo " DigitalOcean Production Deployment"
    echo " Domain: $DOMAIN"
    echo " Cold Email Automation Platform"
    echo "=================================="
    echo -e "${NC}"
    
    # Check if user wants to proceed
    read -p "Are you ready to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    check_requirements
    setup_firewall
    setup_ssl_directories
    
    # Ask about SSL certificates
    echo
    read -p "Do you want to generate new SSL certificates? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        generate_ssl_certificates
    else
        log_warning "Skipping SSL certificate generation. Make sure certificates exist in nginx/ssl/"
    fi
    
    build_images
    deploy_application
    check_health
    setup_auto_renewal
    
    echo
    echo -e "${GREEN}=================================="
    echo " 🚀 DEPLOYMENT SUCCESSFUL!"
    echo " 📱 Application: https://${DOMAIN}"
    echo " 🔧 API: https://${DOMAIN}/api"
    echo " 📊 Health: https://${DOMAIN}/health"
    echo "==================================${NC}"
    
    log_info "Next steps:"
    echo "1. Configure DNS: Point ${DOMAIN} A record to this server's IP"
    echo "2. Test OAuth2 login with production credentials"
    echo "3. Create your first campaign and test email sending"
    echo "4. Monitor logs: docker-compose -f ${COMPOSE_FILE} logs -f"
}

# Script arguments handling
case "${1:-}" in
    "health")
        check_health
        ;;
    "ssl")
        setup_ssl_directories
        generate_ssl_certificates
        ;;
    "build")
        build_images
        ;;
    "deploy")
        deploy_application
        ;;
    *)
        main
        ;;
esac