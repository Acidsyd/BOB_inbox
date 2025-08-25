# Production Deployment Guide
## Clay.com-Inspired LEADS System v3.0.0

This guide provides comprehensive instructions for deploying the Clay.com-inspired LEADS system to production environments.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Prerequisites
- [ ] Node.js 20+ installed
- [ ] Docker and Docker Compose installed
- [ ] Kubernetes cluster access (optional)
- [ ] Domain name configured with SSL certificate
- [ ] Supabase project created and configured
- [ ] Redis instance available
- [ ] Email service provider configured
- [ ] Monitoring tools setup

### ✅ Environment Validation
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] External API integrations validated
- [ ] SSL certificates installed
- [ ] CDN configuration verified

---

## 🔧 ENVIRONMENT SETUP

### Required Environment Variables

```bash
# Core Application
NODE_ENV=production
PORT=4000
API_BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/mailsender_prod
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Cache and Queues
REDIS_URL=redis://your-redis-host:6379

# Authentication & Security
JWT_SECRET=your-super-secure-jwt-secret-here-minimum-32-chars
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here-minimum-32-chars
EMAIL_ENCRYPTION_KEY=your-super-secure-encryption-key-here-minimum-32-chars
SESSION_SECRET=your-super-secure-session-secret-here

# Email Service
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/oauth2/callback

# External APIs
OPENAI_API_KEY=your-openai-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Monitoring and Analytics
SENTRY_DSN=your-sentry-dsn
ANALYTICS_API_KEY=your-analytics-key

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_BILLING=true
ENABLE_AI_FEATURES=true
ENABLE_ADVANCED_ENRICHMENT=true
```

---

## 🚀 DEPLOYMENT METHODS

### Method 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/your-org/mailsender.git
cd mailsender

# 2. Configure environment
cp .env.production.example .env.production
# Edit .env.production with your values

# 3. Build and deploy
docker-compose -f docker-compose.production.yml up -d

# 4. Run database migrations
docker-compose exec backend npm run migrate:production

# 5. Verify deployment
curl https://api.yourdomain.com/health
```

### Method 2: Kubernetes Deployment

```bash
# 1. Create namespace
kubectl create namespace mailsender

# 2. Apply secrets
kubectl create secret generic mailsender-secrets \
  --from-env-file=.env.production \
  --namespace=mailsender

# 3. Deploy application
kubectl apply -f k8s/production/ --namespace=mailsender

# 4. Verify deployment
kubectl get pods --namespace=mailsender
kubectl get services --namespace=mailsender
```

### Method 3: Cloud Platform Deployment

#### AWS ECS/Fargate
```bash
# Use provided CloudFormation templates
aws cloudformation deploy \
  --template-file aws/cloudformation-template.yaml \
  --stack-name mailsender-production \
  --parameter-overrides file://aws/production-parameters.json \
  --capabilities CAPABILITY_IAM
```

#### Google Cloud Run
```bash
# Deploy backend
gcloud run deploy mailsender-backend \
  --image gcr.io/your-project/mailsender-backend \
  --platform managed \
  --region us-central1 \
  --env-vars-file .env.production

# Deploy frontend
gcloud run deploy mailsender-frontend \
  --image gcr.io/your-project/mailsender-frontend \
  --platform managed \
  --region us-central1
```

#### Azure Container Instances
```bash
# Deploy with Azure CLI
az container create \
  --resource-group mailsender-rg \
  --name mailsender-backend \
  --image your-registry.azurecr.io/mailsender-backend \
  --environment-variables @.env.production \
  --ports 4000
```

---

## 🗄️ DATABASE SETUP

### Supabase Configuration

1. **Create Supabase Project**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

2. **Run Migrations**
```bash
# Deploy migrations
supabase db push

# Verify tables
supabase db list
```

3. **Configure RLS Policies**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ... (all other tables)

-- Apply RLS policies
-- (policies are automatically applied via migrations)
```

### Direct PostgreSQL Setup

```bash
# Create production database
createdb mailsender_production

# Run migrations
cd backend
npm run migrate:production

# Verify schema
psql mailsender_production -c "\dt"
```

---

## ⚙️ SERVICE CONFIGURATION

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/mailsender
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    # Backend API
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://app.yourdomain.com';
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
    }
}
```

### SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 MONITORING SETUP

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'mailsender-backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/metrics'

  - job_name: 'mailsender-frontend'
    static_configs:
      - targets: ['frontend:3000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboards

Import the provided dashboards:
- `monitoring/grafana/dashboards/application-overview.json`
- `monitoring/grafana/dashboards/database-performance.json`
- `monitoring/grafana/dashboards/api-metrics.json`
- `monitoring/grafana/dashboards/user-activity.json`

### Log Aggregation

```yaml
# promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: backend-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend
          __path__: /app/logs/*.log

  - job_name: frontend-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: frontend
          __path__: /frontend/logs/*.log
```

---

## 🔐 SECURITY CONFIGURATION

### Firewall Rules

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Block direct access to application ports
sudo ufw deny 3000/tcp
sudo ufw deny 4000/tcp

# Enable firewall
sudo ufw enable
```

### Security Headers

```nginx
# Add to nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Rate Limiting

```nginx
# Add to nginx http block
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
        }
        
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
        }
    }
}
```

---

## 🚨 BACKUP AND DISASTER RECOVERY

### Database Backup

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mailsender_production"

# Create backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_backup_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/db_backup_$DATE.sql"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql.gz" s3://your-backup-bucket/database/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: db_backup_$DATE.sql.gz"
```

### Application Backup

```bash
#!/bin/bash
# backup-files.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/mailsender"

# Create application backup
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" \
    --exclude="$APP_DIR/node_modules" \
    --exclude="$APP_DIR/.git" \
    --exclude="$APP_DIR/logs" \
    "$APP_DIR"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/app_backup_$DATE.tar.gz" s3://your-backup-bucket/application/

# Clean old backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: app_backup_$DATE.tar.gz"
```

### Automated Backup Schedule

```bash
# Add to crontab
0 2 * * * /opt/mailsender/scripts/backup-database.sh
0 3 * * 0 /opt/mailsender/scripts/backup-files.sh
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

API_URL="https://api.yourdomain.com"
FRONTEND_URL="https://app.yourdomain.com"

echo "🔍 Running post-deployment health checks..."

# Check API health
echo "Checking API health..."
if curl -f "$API_URL/health" > /dev/null 2>&1; then
    echo "✅ API health check: PASSED"
else
    echo "❌ API health check: FAILED"
    exit 1
fi

# Check database connectivity
echo "Checking database..."
if curl -f "$API_URL/api/health/database" > /dev/null 2>&1; then
    echo "✅ Database health check: PASSED"
else
    echo "❌ Database health check: FAILED"
    exit 1
fi

# Check Redis connectivity
echo "Checking Redis..."
if curl -f "$API_URL/api/health/redis" > /dev/null 2>&1; then
    echo "✅ Redis health check: PASSED"
else
    echo "❌ Redis health check: FAILED"
    exit 1
fi

# Check frontend
echo "Checking frontend..."
if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✅ Frontend health check: PASSED"
else
    echo "❌ Frontend health check: FAILED"
    exit 1
fi

echo "🎉 All health checks passed!"
```

### Performance Validation

```bash
#!/bin/bash
# performance-check.sh

API_URL="https://api.yourdomain.com"

echo "📊 Running performance validation..."

# Test API response times
echo "Testing API response times..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$API_URL/api/campaigns")
if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "✅ API response time: ${RESPONSE_TIME}s (target: <2s)"
else
    echo "⚠️ API response time: ${RESPONSE_TIME}s (target: <2s)"
fi

# Test concurrent requests
echo "Testing concurrent load..."
ab -n 100 -c 10 "$API_URL/health" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Concurrent load test: PASSED"
else
    echo "❌ Concurrent load test: FAILED"
fi

echo "📊 Performance validation completed"
```

---

## 🔧 MAINTENANCE PROCEDURES

### Zero-Downtime Deployment

```bash
#!/bin/bash
# zero-downtime-deploy.sh

NEW_VERSION=$1

echo "🚀 Starting zero-downtime deployment to version $NEW_VERSION..."

# Pull new images
docker pull mailsender-backend:$NEW_VERSION
docker pull mailsender-frontend:$NEW_VERSION

# Update backend (rolling update)
docker service update \
    --image mailsender-backend:$NEW_VERSION \
    --update-delay 30s \
    --update-parallelism 1 \
    mailsender-backend

# Wait for backend update
echo "Waiting for backend update..."
sleep 60

# Update frontend
docker service update \
    --image mailsender-frontend:$NEW_VERSION \
    --update-delay 30s \
    --update-parallelism 1 \
    mailsender-frontend

echo "✅ Zero-downtime deployment completed"
```

### Database Migration

```bash
#!/bin/bash
# run-migration.sh

MIGRATION_FILE=$1

echo "🗄️ Running database migration: $MIGRATION_FILE..."

# Backup database first
./backup-database.sh

# Run migration
cd backend
npm run migrate:production -- --file=$MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed - consider rollback"
    exit 1
fi
```

### Log Rotation

```bash
# /etc/logrotate.d/mailsender
/opt/mailsender/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mailsender mailsender
    postrotate
        systemctl reload mailsender-backend
        systemctl reload mailsender-frontend
    endscript
}
```

---

## 🆘 TROUBLESHOOTING

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
docker logs mailsender-backend
docker logs mailsender-frontend

# Check environment variables
docker exec mailsender-backend env | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"

# Verify database connectivity
docker exec mailsender-backend node -e "require('./src/database/connection.js').query('SELECT 1')"
```

#### 2. High Memory Usage
```bash
# Check memory usage
docker stats mailsender-backend mailsender-frontend

# Check Node.js heap usage
curl https://api.yourdomain.com/api/health/memory

# Restart services if needed
docker restart mailsender-backend mailsender-frontend
```

#### 3. Database Connection Issues
```bash
# Check database connectivity
pg_isready -h your-db-host -p 5432

# Check connection pool
curl https://api.yourdomain.com/api/health/database

# Check database locks
SELECT * FROM pg_locks WHERE NOT granted;
```

#### 4. Redis Connection Issues
```bash
# Check Redis connectivity
redis-cli -h your-redis-host ping

# Check Redis memory usage
redis-cli info memory

# Clear Redis cache if needed
redis-cli flushdb
```

### Rollback Procedures

```bash
#!/bin/bash
# rollback.sh

PREVIOUS_VERSION=$1

echo "🔄 Rolling back to version $PREVIOUS_VERSION..."

# Stop current version
docker service update --replicas 0 mailsender-backend
docker service update --replicas 0 mailsender-frontend

# Deploy previous version
docker service update \
    --image mailsender-backend:$PREVIOUS_VERSION \
    --replicas 2 \
    mailsender-backend

docker service update \
    --image mailsender-frontend:$PREVIOUS_VERSION \
    --replicas 2 \
    mailsender-frontend

# Run health checks
./health-check.sh

echo "✅ Rollback completed"
```

---

## 📞 SUPPORT CONTACTS

### Emergency Contacts
- **System Administrator**: admin@yourdomain.com
- **Database Administrator**: dba@yourdomain.com  
- **Security Team**: security@yourdomain.com
- **On-call Engineering**: +1-XXX-XXX-XXXX

### Escalation Procedures
1. **Level 1**: Check monitoring dashboards and logs
2. **Level 2**: Contact on-call engineer
3. **Level 3**: Escalate to system administrator
4. **Level 4**: Emergency rollback procedures

### Documentation Links
- **API Documentation**: https://docs.yourdomain.com/api
- **User Guides**: https://docs.yourdomain.com/guides
- **Troubleshooting**: https://docs.yourdomain.com/troubleshooting
- **Status Page**: https://status.yourdomain.com

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migration tested
- [ ] External services validated
- [ ] Monitoring configured
- [ ] Backup systems tested

### During Deployment
- [ ] Deploy to staging first
- [ ] Run complete test suite
- [ ] Validate performance benchmarks
- [ ] Test all integrations
- [ ] Verify monitoring alerts
- [ ] Complete security scan

### Post-Deployment
- [ ] Health checks passing
- [ ] Performance validation complete
- [ ] User acceptance testing
- [ ] Monitor for 24 hours
- [ ] Document any issues
- [ ] Update team on status

**🎉 PRODUCTION DEPLOYMENT COMPLETE!**

---

*This guide provides comprehensive instructions for deploying the Clay.com-inspired LEADS system to production. For additional support, refer to the troubleshooting section or contact the engineering team.*