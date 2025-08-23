# Production Deployment Guide - OPhir Email Platform v2.0.0

## Overview

This comprehensive guide covers the production deployment of the OPhir Email Automation Platform with complete N8N integration, Supabase database, and real-time features. The platform is designed for cloud-native deployment with horizontal scaling capabilities.

**Current Status:** Production-ready system with live N8N integration  
**Architecture:** Cloud-native with Supabase + N8N + Docker containers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Configuration](#database-configuration)
4. [N8N Production Deployment](#n8n-production-deployment)
5. [Application Deployment](#application-deployment)
6. [Security Configuration](#security-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Scaling Considerations](#scaling-considerations)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts and Services
- **Supabase Account**: [https://supabase.com](https://supabase.com) (Database + Auth)
- **Render/Railway/DigitalOcean**: For N8N hosting (current: Render)
- **AWS/GCP/Azure**: For main application hosting
- **Domain**: Custom domain for production URLs
- **SSL Certificate**: Let's Encrypt or commercial SSL
- **Email Provider**: Gmail OAuth2 or SMTP credentials

### Local Development Requirements
- **Node.js**: v20.0.0 or higher
- **Docker**: v24.0 or higher
- **Docker Compose**: v2.0 or higher
- **Git**: Latest version
- **CLI Tools**: kubectl (if using Kubernetes)

### Third-party Integrations
- **Gmail API**: OAuth2 credentials for email sending
- **Monitoring**: DataDog, New Relic, or similar
- **Error Tracking**: Sentry or Bugsnag
- **CDN**: CloudFlare or AWS CloudFront

---

## Infrastructure Setup

### 1. Cloud Provider Selection

#### Recommended: AWS + Supabase + Render
```yaml
# Infrastructure components
Database: Supabase (PostgreSQL with real-time)
N8N: Render.com (current production instance)
Backend API: AWS ECS/Fargate
Frontend: AWS CloudFront + S3
Load Balancer: AWS ALB
Cache: AWS ElastiCache (Redis)
Monitoring: AWS CloudWatch + DataDog
```

#### Alternative: Google Cloud + Supabase
```yaml
Database: Supabase (PostgreSQL with real-time)
N8N: Google Cloud Run
Backend API: Google Cloud Run
Frontend: Google Cloud CDN + Cloud Storage
Load Balancer: Google Cloud Load Balancer
Cache: Google Cloud Memorystore
Monitoring: Google Cloud Monitoring
```

### 2. Network Architecture
```
Internet
    │
┌───▼───┐
│  CDN  │ (CloudFront/CloudFlare)
└───┬───┘
    │
┌───▼───┐
│  ALB  │ (Application Load Balancer)
└───┬───┘
    │
┌───▼───────────┬─────────────┐
│   Frontend    │   Backend   │
│   (React)     │   (Node.js) │
└───┬───────────┴─────────┬───┘
    │                     │
┌───▼───┐           ┌─────▼─────┐
│ Cache │           │ Database  │
│(Redis)│           │(Supabase) │
└───────┘           └───────────┘
                          │
                    ┌─────▼─────┐
                    │    N8N    │
                    │ (Render)  │
                    └───────────┘
```

---

## Database Configuration

### 1. Supabase Production Setup

#### Create Production Project
```bash
# 1. Create new Supabase project at https://supabase.com/dashboard
# 2. Configure project settings:
Project Name: OPhir-Production
Region: us-east-1 (or closest to your users)
Plan: Pro or Team (for production features)
```

#### Import Database Schema
```sql
-- Run in Supabase SQL Editor
-- Import from /database/campaign_automation_schema.sql
\i campaign_automation_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (see SECURITY.md for details)
```

#### Configure Real-time
```bash
# Enable real-time for critical tables
# In Supabase Dashboard > Database > Replication
Enable for:
- email_accounts
- campaigns
- leads
- email_activities
- n8n_executions
```

#### Environment Configuration
```bash
# Production environment variables
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key

# Database connection pooling
SUPABASE_DB_URL=postgresql://[user]:[pass]@[host]:[port]/[db]?pgbouncer=true
```

### 2. Database Performance Optimization

#### Indexing Strategy
```sql
-- Performance indexes for high-traffic queries
CREATE INDEX CONCURRENTLY idx_leads_organization_status 
ON leads(organization_id, status) WHERE status IN ('new', 'contacted');

CREATE INDEX CONCURRENTLY idx_email_accounts_org_health 
ON email_accounts(organization_id, health_score) WHERE health_score > 70;

CREATE INDEX CONCURRENTLY idx_campaigns_org_active 
ON campaigns(organization_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_email_activities_campaign_date 
ON email_activities(campaign_id, created_at);
```

#### Connection Pooling
```javascript
// Backend Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      poolConfig: {
        connectionTimeoutMillis: 2000,
        idleTimeoutMillis: 30000,
        max: 20
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

---

## N8N Production Deployment

### 1. Current Production Instance
**URL:** https://n8n-1-pztp.onrender.com  
**Status:** Active with deployed workflows  
**Workflows:** Test Webhook (uKfAc2j1wXxwOHux), Campaign Automation (EpC6mEr2wUH3tsTc)

### 2. Render.com Configuration (Current)
```yaml
# render.yaml for N8N deployment
services:
  - type: web
    name: n8n-production
    env: node
    buildCommand: npm install n8n -g
    startCommand: n8n start
    envVars:
      - key: N8N_HOST
        value: 0.0.0.0
      - key: N8N_PORT
        value: 10000
      - key: WEBHOOK_URL
        value: https://n8n-1-pztp.onrender.com
      - key: GENERIC_TIMEZONE
        value: America/New_York
      - key: N8N_BASIC_AUTH_ACTIVE
        value: true
      - key: N8N_BASIC_AUTH_USER
        value: admin
      - key: N8N_BASIC_AUTH_PASSWORD
        fromGroup: n8n-secrets
      - key: DB_TYPE
        value: postgresdb
      - key: DB_POSTGRESDB_HOST
        fromGroup: database-config
```

### 3. Alternative: Self-hosted N8N with Docker
```yaml
# docker-compose.n8n.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PROTOCOL=https
      - N8N_PORT=5678
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - GENERIC_TIMEZONE=America/New_York
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${DB_HOST}
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${DB_NAME}
      - DB_POSTGRESDB_USER=${DB_USER}
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

volumes:
  n8n_data:
```

### 4. N8N Production Configuration

#### SSL and Security
```bash
# Enable HTTPS for webhooks
N8N_PROTOCOL=https
N8N_HOST=n8n.yourdomain.com
WEBHOOK_URL=https://n8n.yourdomain.com/

# Security settings
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-password

# API security
N8N_API_KEY=your-secure-api-key
```

#### Performance Tuning
```bash
# Execution settings
EXECUTIONS_TIMEOUT=300
EXECUTIONS_TIMEOUT_MAX=3600
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_MAX_AGE=336 # 14 days

# Performance settings
N8N_PAYLOAD_SIZE_MAX=16
N8N_METRICS=true
```

---

## Application Deployment

### 1. Backend API Deployment

#### Docker Configuration
```dockerfile
# Dockerfile.backend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY backend/src ./src

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

CMD ["npm", "start"]
```

#### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
PORT=4000

# Database
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# N8N Integration
N8N_API_URL=https://n8n-1-pztp.onrender.com/api/v1
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_BASE_URL=https://n8n-1-pztp.onrender.com/webhook

# Redis Cache
REDIS_URL=redis://your-redis-host:6379

# Security
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
API_SECRET=your-api-secret

# Email Providers
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

#### AWS ECS Deployment
```json
{
  "family": "ophir-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "ophir-backend",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/ophir-backend:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ophir-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 2. Frontend Deployment

#### Build Configuration
```bash
# Frontend build for production
cd frontend
npm run build

# Environment variables for build
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### CloudFront + S3 Deployment
```yaml
# AWS CloudFormation template
Resources:
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: ophir-frontend-prod
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: error.html

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Aliases:
          - app.yourdomain.com
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt S3Bucket.DomainName
            S3OriginConfig:
              OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${OriginAccessIdentity}"
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          Compress: true
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # Managed-CachingOptimized
```

---

## Security Configuration

### 1. Environment Security
```bash
# Use AWS Secrets Manager or similar
aws secretsmanager create-secret \
  --name "ophir/production/database" \
  --description "Production database credentials" \
  --secret-string '{"SUPABASE_SERVICE_ROLE_KEY":"your-key"}'

aws secretsmanager create-secret \
  --name "ophir/production/jwt" \
  --description "JWT signing secrets" \
  --secret-string '{"JWT_SECRET":"your-secret","JWT_REFRESH_SECRET":"your-refresh-secret"}'
```

### 2. Network Security
```yaml
# Security Group Configuration (AWS)
SecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: OPhir Backend Security Group
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 4000
        ToPort: 4000
        SourceSecurityGroupId: !Ref LoadBalancerSecurityGroup
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0
    SecurityGroupEgress:
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0
      - IpProtocol: tcp
        FromPort: 5432
        ToPort: 5432
        DestinationSecurityGroupId: !Ref DatabaseSecurityGroup
```

### 3. SSL/TLS Configuration
```nginx
# Nginx SSL Configuration
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Monitoring and Logging

### 1. Application Monitoring

#### DataDog Integration
```javascript
// Backend monitoring setup
import { StatsD } from 'node-statsd';
import tracer from 'dd-trace';

// Initialize DataDog tracer
tracer.init({
  service: 'ophir-backend',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION
});

// Custom metrics
const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'ophir.backend.'
});

// Track API calls
app.use((req, res, next) => {
  const start = Date.now();
  statsd.increment('api.requests');
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    statsd.timing('api.response_time', duration);
    statsd.increment(`api.responses.${res.statusCode}`);
  });
  
  next();
});
```

#### Prometheus + Grafana Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure-password
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  prometheus_data:
  grafana_data:
```

### 2. Centralized Logging

#### ELK Stack Configuration
```yaml
# elasticsearch.yml
cluster.name: "ophir-logs"
network.host: 0.0.0.0
discovery.type: single-node
xpack.security.enabled: false

# logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "ophir-backend" {
    json {
      source => "message"
    }
    
    date {
      match => ["timestamp", "ISO8601"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "ophir-logs-%{+YYYY.MM.dd}"
  }
}
```

#### Application Logging
```javascript
// Winston logger configuration
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'ophir-backend',
    version: process.env.APP_VERSION 
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: process.env.ELASTICSEARCH_URL },
      index: 'ophir-logs'
    })
  ]
});
```

### 3. Health Checks and Alerts

#### Application Health Endpoint
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {}
  };

  try {
    // Database connectivity
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    health.checks.database = error ? 'unhealthy' : 'healthy';

    // N8N connectivity
    const n8nHealth = await fetch(`${process.env.N8N_API_URL}/health`);
    health.checks.n8n = n8nHealth.ok ? 'healthy' : 'unhealthy';

    // Redis connectivity
    const redisHealth = await redis.ping();
    health.checks.redis = redisHealth === 'PONG' ? 'healthy' : 'unhealthy';

    // Overall status
    const isHealthy = Object.values(health.checks).every(check => check === 'healthy');
    health.status = isHealthy ? 'healthy' : 'unhealthy';

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});
```

#### Uptime Monitoring
```yaml
# Uptime Kuma configuration
version: '3.8'

services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    ports:
      - "3002:3001"
    volumes:
      - uptime-kuma:/app/data
    restart: unless-stopped

volumes:
  uptime-kuma:
```

---

## Scaling Considerations

### 1. Horizontal Scaling

#### Load Balancing Strategy
```nginx
# Nginx upstream configuration
upstream backend {
    least_conn;
    server backend-1:4000 max_fails=3 fail_timeout=30s;
    server backend-2:4000 max_fails=3 fail_timeout=30s;
    server backend-3:4000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Health checks
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

#### Auto Scaling Configuration (AWS)
```yaml
# Auto Scaling Group
AutoScalingGroup:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: 2
    MaxSize: 10
    DesiredCapacity: 3
    LaunchTemplate:
      LaunchTemplateId: !Ref LaunchTemplate
      Version: !GetAtt LaunchTemplate.LatestVersionNumber
    TargetGroupARNs:
      - !Ref TargetGroup
    HealthCheckType: ELB
    HealthCheckGracePeriod: 300

# Scaling Policies
ScaleUpPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    AutoScalingGroupName: !Ref AutoScalingGroup
    PolicyType: TargetTrackingScaling
    TargetTrackingConfiguration:
      PredefinedMetricSpecification:
        PredefinedMetricType: ASGAverageCPUUtilization
      TargetValue: 70
```

### 2. Database Scaling

#### Read Replicas
```javascript
// Database read/write splitting
const supabaseWrite = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const supabaseRead = createClient(process.env.SUPABASE_READ_URL, process.env.SUPABASE_SERVICE_KEY);

// Use read replica for queries
export const getCampaigns = async (organizationId) => {
  return await supabaseRead
    .from('campaigns')
    .select('*')
    .eq('organization_id', organizationId);
};

// Use primary for writes
export const createCampaign = async (campaign) => {
  return await supabaseWrite
    .from('campaigns')
    .insert(campaign);
};
```

#### Connection Pooling
```javascript
// PgBouncer configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Cache Strategy

#### Redis Clustering
```yaml
# Redis Cluster Setup
version: '3.8'

services:
  redis-1:
    image: redis:alpine
    command: redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes.conf
    ports:
      - "7001:7001"
    
  redis-2:
    image: redis:alpine
    command: redis-server --port 7002 --cluster-enabled yes --cluster-config-file nodes.conf
    ports:
      - "7002:7002"
      
  redis-3:
    image: redis:alpine
    command: redis-server --port 7003 --cluster-enabled yes --cluster-config-file nodes.conf
    ports:
      - "7003:7003"
```

#### Application-level Caching
```javascript
// Multi-layer caching strategy
import NodeCache from 'node-cache';
import Redis from 'redis';

// L1: In-memory cache (fast, small)
const memoryCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// L2: Redis cache (shared, larger)
const redisClient = Redis.createClient(process.env.REDIS_URL);

const cache = {
  async get(key) {
    // Try L1 first
    let value = memoryCache.get(key);
    if (value) return value;
    
    // Try L2
    value = await redisClient.get(key);
    if (value) {
      memoryCache.set(key, value);
      return JSON.parse(value);
    }
    
    return null;
  },
  
  async set(key, value, ttl = 300) {
    memoryCache.set(key, value, ttl);
    await redisClient.setex(key, ttl, JSON.stringify(value));
  }
};
```

---

## Backup and Recovery

### 1. Database Backup

#### Automated Supabase Backups
```bash
# Supabase provides automated backups
# Point-in-time recovery available for 7 days (Pro plan)
# Manual backups via dashboard or CLI

# CLI backup
npx supabase db dump --file backup.sql --data-only
npx supabase db dump --file schema.sql --schema-only
```

#### Custom Backup Script
```javascript
// Automated backup script
import { createClient } from '@supabase/supabase-js';
import AWS from 'aws-sdk';
import cron from 'node-cron';

const s3 = new AWS.S3();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const backupDatabase = async () => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Export data
    const tables = ['organizations', 'users', 'campaigns', 'leads', 'email_accounts'];
    const backup = {};
    
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backup[table] = data;
    }
    
    // Upload to S3
    const params = {
      Bucket: 'ophir-backups',
      Key: `database/backup-${timestamp}.json`,
      Body: JSON.stringify(backup, null, 2),
      ContentType: 'application/json'
    };
    
    await s3.upload(params).promise();
    console.log(`Backup completed: backup-${timestamp}.json`);
  } catch (error) {
    console.error('Backup failed:', error);
  }
};

// Schedule daily backups at 2 AM
cron.schedule('0 2 * * *', backupDatabase);
```

### 2. Application Backup

#### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Environment configurations
cp .env.production $BACKUP_DIR/
cp docker-compose.yml $BACKUP_DIR/
cp nginx.conf $BACKUP_DIR/

# N8N workflows
curl -H "Authorization: Bearer $N8N_API_KEY" \
  "$N8N_API_URL/workflows" > $BACKUP_DIR/n8n-workflows.json

# Upload to S3
aws s3 sync $BACKUP_DIR s3://ophir-backups/config/$(date +%Y%m%d)/
```

### 3. Disaster Recovery

#### Recovery Procedures
```bash
# 1. Database Recovery
# Restore from Supabase dashboard or CLI
supabase db reset --file backup.sql

# 2. Application Recovery
# Deploy from backup configuration
docker-compose -f docker-compose.backup.yml up -d

# 3. N8N Recovery
# Import workflows from backup
curl -X POST "$N8N_API_URL/workflows/import" \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @n8n-workflows.json

# 4. DNS and CDN
# Update DNS records if needed
# Invalidate CDN cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

---

## Troubleshooting

### 1. Common Issues

#### Database Connection Issues
```bash
# Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# Test connection
psql "$SUPABASE_DB_URL" -c "SELECT 1;"

# Check connection pool
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

#### N8N Workflow Issues
```bash
# Check N8N health
curl https://n8n-1-pztp.onrender.com/health

# Check workflow status
curl -H "Authorization: Bearer $N8N_API_KEY" \
  "$N8N_API_URL/workflows/EpC6mEr2wUH3tsTc"

# Check executions
curl -H "Authorization: Bearer $N8N_API_KEY" \
  "$N8N_API_URL/executions?workflowId=EpC6mEr2wUH3tsTc&limit=10"
```

#### Performance Issues
```bash
# Check system resources
docker stats

# Check database performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# Check Redis memory usage
redis-cli info memory
```

### 2. Debugging Tools

#### Log Analysis
```bash
# Follow application logs
docker logs -f ophir-backend

# Search logs for errors
grep -i error /var/log/ophir/backend.log | tail -20

# Analyze performance logs
awk '{sum+=$10; count++} END {print "Average response time:", sum/count "ms"}' access.log
```

#### Database Debugging
```sql
-- Check slow queries
SELECT query, total_exec_time, mean_exec_time, calls, rows
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Check locks
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## Conclusion

This deployment guide provides a comprehensive framework for deploying the OPhir Email Platform in production. The architecture is designed for scalability, reliability, and security with proper monitoring and backup procedures.

Key considerations for production deployment:
1. **Security**: Proper SSL, network isolation, and secret management
2. **Scalability**: Auto-scaling groups and load balancing
3. **Monitoring**: Comprehensive logging and alerting
4. **Reliability**: Backup procedures and disaster recovery
5. **Performance**: Caching strategies and database optimization

For immediate deployment, focus on:
1. Supabase production setup with proper RLS policies
2. N8N instance configuration with Gmail OAuth2
3. Application deployment with proper environment variables
4. Monitoring setup for proactive issue detection

The system is production-ready and only requires email provider configuration to enable full automation capabilities.