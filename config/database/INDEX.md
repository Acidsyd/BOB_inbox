# Database Directory

## Overview
The database directory contains PostgreSQL schema definitions and database utilities for the OPhir Cold Email Platform.

## Structure

```
database/
└── init.sql              # Complete database schema and initial data
```

## Database Schema

### Core Tables

#### Organizations
Multi-tenant organization management
```sql
organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Users
User accounts with role-based access
```sql
users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  settings JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Email Accounts
Email account credentials and health tracking
```sql
email_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255),
  provider VARCHAR(50), -- gmail, outlook, smtp
  credentials_encrypted TEXT,
  settings JSONB DEFAULT '{}',
  health_score INTEGER DEFAULT 100,
  warmup_status VARCHAR(50) DEFAULT 'pending',
  daily_limit INTEGER DEFAULT 50,
  current_sent_today INTEGER DEFAULT 0,
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Campaigns
Email campaign configurations
```sql
campaigns (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  config JSONB, -- sequences, settings, etc.
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Leads
Contact management and segmentation
```sql
leads (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  campaign_id UUID REFERENCES campaigns(id),
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  data JSONB DEFAULT '{}', -- custom fields
  status VARCHAR(50) DEFAULT 'active',
  tags TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Email Queue
Email sending queue and scheduling
```sql
email_queue (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  lead_id UUID REFERENCES leads(id),
  email_account_id UUID REFERENCES email_accounts(id),
  sequence_step INTEGER DEFAULT 1,
  subject VARCHAR(500),
  body TEXT,
  scheduled_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  error_message TEXT,
  n8n_execution_id VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Email Activities
Email tracking and analytics
```sql
email_activities (
  id UUID PRIMARY KEY,
  email_queue_id UUID REFERENCES email_queue(id),
  lead_id UUID REFERENCES leads(id),
  campaign_id UUID REFERENCES campaigns(id),
  event_type VARCHAR(50), -- sent, opened, clicked, replied, bounced
  timestamp TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  n8n_execution_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT
)
```

#### Templates
Reusable email templates
```sql
templates (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255),
  category VARCHAR(100),
  subject VARCHAR(500),
  body TEXT,
  variables JSONB DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### N8N Executions
Workflow execution tracking
```sql
n8n_executions (
  id UUID PRIMARY KEY,
  execution_id VARCHAR(255) UNIQUE,
  workflow_name VARCHAR(255),
  trigger_source VARCHAR(50),
  status VARCHAR(50), -- running, success, error, cancelled
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metrics JSONB DEFAULT '{}',
  error_data JSONB
)
```

#### Unsubscribes
Unsubscribe tracking and compliance
```sql
unsubscribes (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255),
  campaign_id UUID REFERENCES campaigns(id),
  reason VARCHAR(100),
  created_at TIMESTAMP
)
```

## Performance Features

### Indexes
Optimized indexes for frequent queries:
- User lookups by email and organization
- Campaign filtering by status and organization
- Lead searches by email and campaign
- Email queue scheduling queries
- Activity tracking by lead and campaign
- N8N execution lookups

### Triggers
Automatic timestamp updates:
- `updated_at` columns automatically maintained
- Database-level timestamp consistency

### Data Types
- **UUID**: Primary keys for scalability and security
- **JSONB**: Flexible data storage with indexing support
- **INET**: IP address storage for tracking
- **TEXT[]**: Array storage for tags and categories

## Database Functions

### Timestamp Updates
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## Initial Data

### Default Organization
- System organization for single-tenant usage
- UUID: `00000000-0000-0000-0000-000000000001`

### Admin User
- Default admin account for initial setup
- Email: `admin@ophir.dev`
- Password requires proper hashing before use

## Connection Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/ophir_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ophir_db
DB_USER=username
DB_PASSWORD=password
```

### Connection Pool Settings
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

## Migrations

### Initial Setup
```bash
# Create database
createdb ophir_db

# Run schema initialization
psql -d ophir_db -f database/init.sql
```

### Docker Setup
```bash
# Using Docker Compose
docker-compose up postgres

# Manual container
docker run -d \
  --name ophir-postgres \
  -e POSTGRES_DB=ophir_db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15
```

## Backup and Recovery

### Backup
```bash
# Full database backup
pg_dump ophir_db > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only ophir_db > schema.sql

# Data only
pg_dump --data-only ophir_db > data.sql
```

### Restore
```bash
# Full restore
psql ophir_db < backup_20250122.sql

# Schema only
psql ophir_db < schema.sql
```

## Security

### Access Control
- Row-level security policies (planned)
- Organization-based data isolation
- Encrypted credential storage

### Data Protection
- Password hashing with bcrypt
- Sensitive data encryption at application level
- GDPR compliance fields

## Performance Monitoring

### Key Metrics
- Query execution times
- Index usage statistics
- Connection pool utilization
- Table sizes and growth

### Optimization
- Regular VACUUM and ANALYZE
- Index maintenance
- Query plan analysis

## Development

### Local Setup
```bash
# Install PostgreSQL
brew install postgresql
# or
apt-get install postgresql

# Start service
brew services start postgresql
# or
sudo systemctl start postgresql

# Create database and user
createuser -s admin
createdb -O admin ophir_db

# Run schema
psql -U admin -d ophir_db -f database/init.sql
```

### Testing
```bash
# Connect to database
psql -d ophir_db

# Run test queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM campaigns;
```

## Notes

- All tables use UUID primary keys for scalability
- JSONB columns support complex data structures with indexing
- Foreign key constraints ensure data integrity
- Automatic timestamp management via triggers
- Organization-scoped data isolation enforced at application level
- Schema supports multi-tenancy with organization partitioning