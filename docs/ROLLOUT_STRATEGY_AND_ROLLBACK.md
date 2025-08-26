# Rollout Strategy and Rollback Procedures
## SmartLead Email Tracking System v3.0.0

**Version:** 1.0.0  
**Date:** 2025-08-26  
**Status:** Production Ready

## 🎯 Overview

This document outlines the comprehensive rollout strategy and rollback procedures for the SmartLead-style email tracking system. The strategy ensures safe, gradual deployment with minimal risk and quick recovery capabilities.

## 🚀 Rollout Strategy

### Phase 1: Pre-Production Validation (Duration: 1-2 days)

#### Staging Environment Deployment
- [ ] **Deploy to staging environment** with production-like configuration
- [ ] **Run comprehensive test suite** (unit, integration, e2e tests)
- [ ] **Execute load testing** with 10x expected traffic
- [ ] **Perform security testing** and vulnerability scanning
- [ ] **Validate monitoring and alerting** systems
- [ ] **Test backup and restore** procedures
- [ ] **Verify all integrations** (OAuth2, email providers, etc.)

#### Validation Checklist
```bash
# Health checks
curl -f https://staging.mailsender.app/health/detailed
curl -f https://track-staging.mailsender.app/pixel/test.png

# Performance validation
npm run test:performance:staging

# Security validation
npm run test:security:staging

# Integration validation
npm run test:integration:staging
```

#### Success Criteria
- ✅ All tests passing (100% success rate)
- ✅ Response times < 100ms for API, < 50ms for tracking
- ✅ Zero security vulnerabilities
- ✅ All monitoring dashboards operational
- ✅ Load testing completed successfully at 10x capacity

### Phase 2: Blue-Green Deployment Setup (Duration: 0.5 days)

#### Infrastructure Preparation
- [ ] **Provision green environment** (identical to blue/production)
- [ ] **Deploy application** to green environment
- [ ] **Configure load balancer** for traffic switching
- [ ] **Setup monitoring** for both environments
- [ ] **Prepare database migration** scripts (if needed)
- [ ] **Configure feature flags** for gradual rollout

#### Environment Verification
```bash
# Verify green environment health
curl -f https://green.internal.mailsender.app/health/detailed

# Test traffic routing
curl -H "X-Environment: green" https://api.mailsender.app/health

# Verify database connectivity
npm run verify:database:green

# Test all critical paths
npm run test:critical-paths:green
```

### Phase 3: Canary Deployment (Duration: 2-4 hours)

#### Initial Canary Release (1% Traffic)
- [ ] **Route 1% of traffic** to green environment
- [ ] **Monitor key metrics** for 30 minutes
- [ ] **Validate tracking functionality** with real traffic
- [ ] **Check error rates** and performance metrics
- [ ] **Verify database performance** under load

#### Monitoring Dashboard Checks
```bash
# Key metrics to monitor
- Response time: < 100ms (API), < 50ms (tracking)
- Error rate: < 0.1%
- Database connections: < 80% of pool
- Memory usage: < 80%
- CPU usage: < 70%
```

#### Success Criteria for 1% Traffic
- ✅ Error rate < 0.1%
- ✅ Response times within SLA
- ✅ Zero critical errors
- ✅ All tracking events processed successfully
- ✅ Database performance stable

#### Gradual Traffic Increase
1. **5% Traffic** (Monitor for 30 minutes)
2. **10% Traffic** (Monitor for 30 minutes)
3. **25% Traffic** (Monitor for 1 hour)
4. **50% Traffic** (Monitor for 1 hour)

### Phase 4: Full Production Rollout (Duration: 1-2 hours)

#### Final Traffic Switch
- [ ] **Route 100% traffic** to green environment
- [ ] **Update DNS records** (if applicable)
- [ ] **Monitor all systems** for 2 hours
- [ ] **Validate all functionality** end-to-end
- [ ] **Run post-deployment tests**

#### Post-Deployment Validation
```bash
# Comprehensive system check
npm run test:post-deployment:production

# Performance validation
npm run validate:performance:production

# Security validation
npm run validate:security:production

# Business functionality validation
npm run validate:business:production
```

## 🔄 Rollback Procedures

### Immediate Rollback Triggers

Execute immediate rollback if any of these conditions occur:
- ❌ **Error rate > 1%** for more than 5 minutes
- ❌ **Response time > 500ms** average for more than 5 minutes
- ❌ **Database connectivity issues**
- ❌ **Critical security vulnerability discovered**
- ❌ **Data corruption or loss detected**
- ❌ **Memory leaks or resource exhaustion**
- ❌ **Third-party integration failures**

### Rollback Decision Matrix

| Severity | Condition | Action | Timeline |
|----------|-----------|---------|----------|
| **P0 - Critical** | System down, data loss | Immediate rollback | < 5 minutes |
| **P1 - High** | High error rate, slow response | Rollback if not fixed in 15 min | < 20 minutes |
| **P2 - Medium** | Minor issues, degraded performance | Monitor and decide | < 1 hour |
| **P3 - Low** | Cosmetic issues, non-critical bugs | Continue deployment | Monitor only |

### Automated Rollback Process

#### 1. Traffic-Based Rollback (Fastest - 2-3 minutes)
```bash
# Automated script execution
/opt/scripts/rollback-traffic.sh

# Manual load balancer update
# Route 100% traffic back to blue environment
curl -X POST https://lb-admin.mailsender.app/api/traffic \
  -H "Authorization: Bearer $LB_ADMIN_TOKEN" \
  -d '{"environment": "blue", "percentage": 100}'

# Verify traffic routing
curl -s https://api.mailsender.app/health | jq '.environment'
# Should return "blue"
```

#### 2. DNS Rollback (Medium - 5-10 minutes)
```bash
# Update DNS records back to blue environment
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://rollback-dns-changes.json

# Verify DNS propagation
dig api.mailsender.app +short
nslookup track.mailsender.app
```

#### 3. Application Rollback (Slower - 10-15 minutes)
```bash
# Rollback application deployment
kubectl rollout undo deployment/mailsender-api
kubectl rollout undo deployment/mailsender-worker

# Or using PM2
pm2 stop ecosystem.config.js
pm2 delete all
pm2 start ecosystem.config.previous.js

# Verify application health
curl -f https://api.mailsender.app/health/detailed
```

### Database Rollback Procedures

#### Schema Rollback
```bash
# Rollback database migrations (if schema changes were made)
cd backend
npm run migrate:rollback

# Or manual rollback
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f rollback-migrations.sql

# Verify schema version
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

#### Data Rollback (Critical)
```bash
# Only if data corruption occurred
# Restore from point-in-time backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mailsender-prod \
  --target-db-instance-identifier mailsender-prod-restored \
  --restore-time "2025-08-26T14:30:00.000Z"

# Switch application to restored database
# Update DATABASE_URL environment variable
```

### Step-by-Step Rollback Execution

#### Immediate Rollback (< 5 minutes)

1. **Alert Acknowledgment**
   ```bash
   # Acknowledge the incident
   curl -X POST https://pagerduty.api.com/incidents/$INCIDENT_ID/acknowledge \
     -H "Authorization: Token token=$PD_TOKEN"
   ```

2. **Traffic Rollback**
   ```bash
   # Execute traffic rollback script
   /opt/scripts/emergency-rollback.sh
   
   # Verify traffic routing
   for i in {1..10}; do
     curl -s https://api.mailsender.app/health | jq '.environment'
     sleep 1
   done
   ```

3. **Health Verification**
   ```bash
   # Verify system health post-rollback
   curl -f https://api.mailsender.app/health/detailed
   curl -f https://track.mailsender.app/pixel/test.png
   
   # Check error rates
   curl -s https://monitoring.mailsender.app/api/metrics/error-rate
   ```

4. **Incident Communication**
   ```bash
   # Update status page
   curl -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
     -H "Authorization: OAuth $STATUS_TOKEN" \
     -d '{"incident": {"name": "Service Rollback Completed", "status": "investigating"}}'
   ```

#### Planned Rollback (15-30 minutes)

1. **Pre-Rollback Checklist**
   - [ ] Notify stakeholders via Slack/email
   - [ ] Update status page with maintenance notice
   - [ ] Backup current state for analysis
   - [ ] Prepare rollback scripts and procedures

2. **Gradual Traffic Reduction**
   ```bash
   # Reduce traffic gradually
   /opt/scripts/gradual-rollback.sh
   
   # Monitor during each step:
   # 100% -> 50% -> 25% -> 10% -> 0%
   ```

3. **System Verification**
   ```bash
   # Run comprehensive health checks
   npm run test:health:post-rollback
   npm run validate:performance:post-rollback
   npm run validate:functionality:post-rollback
   ```

4. **Post-Rollback Analysis**
   - [ ] Collect logs from failed deployment
   - [ ] Generate rollback report
   - [ ] Schedule post-mortem meeting
   - [ ] Update documentation based on learnings

## 📊 Monitoring During Rollout

### Key Metrics Dashboard

#### Application Metrics
- **Response Time**: API (<100ms), Tracking (<50ms)
- **Throughput**: Requests/second, successful responses/second
- **Error Rate**: Total errors, 4xx errors, 5xx errors
- **Database Performance**: Connection pool usage, query times
- **Memory Usage**: Heap usage, garbage collection frequency
- **CPU Usage**: Process CPU, system CPU

#### Business Metrics
- **Email Tracking**: Pixel loads/second, click events/second
- **Campaign Performance**: Open rates, click rates, bounce rates
- **User Activity**: Active sessions, API requests by endpoint
- **OAuth2 Integration**: Token refresh success rate, API call success rate

#### Infrastructure Metrics
- **Load Balancer**: Request distribution, health check status
- **Database**: Connection count, slow queries, replication lag
- **Redis**: Memory usage, connection count, command latency
- **Network**: Bandwidth usage, packet loss, latency

### Automated Monitoring Alerts

#### Critical Alerts (Immediate Action)
```yaml
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 1% for 5 minutes"
    action: "trigger_rollback"
    
  - name: "Slow Response Time"
    condition: "avg_response_time > 500ms for 5 minutes"
    action: "trigger_rollback"
    
  - name: "Database Connection Issues"
    condition: "db_connection_errors > 0"
    action: "trigger_rollback"
    
  - name: "Memory Leak Detected"
    condition: "memory_usage_growth > 10MB/minute for 10 minutes"
    action: "trigger_rollback"
```

#### Warning Alerts (Monitor Closely)
```yaml
warnings:
  - name: "Elevated Response Time"
    condition: "avg_response_time > 200ms for 10 minutes"
    action: "notify_team"
    
  - name: "Increased Error Rate"
    condition: "error_rate > 0.5% for 10 minutes"
    action: "monitor_closely"
    
  - name: "High CPU Usage"
    condition: "cpu_usage > 80% for 15 minutes"
    action: "prepare_scaling"
```

## 🔧 Rollout Tools and Scripts

### Deployment Scripts

#### Traffic Management Script
```bash
#!/bin/bash
# /opt/scripts/manage-traffic.sh

ENVIRONMENT=$1
PERCENTAGE=$2

if [ "$ENVIRONMENT" = "blue" ] || [ "$ENVIRONMENT" = "green" ]; then
    echo "Routing $PERCENTAGE% traffic to $ENVIRONMENT environment"
    
    # Update load balancer configuration
    curl -X POST https://lb-admin.mailsender.app/api/traffic \
      -H "Authorization: Bearer $LB_ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"environment\": \"$ENVIRONMENT\", \"percentage\": $PERCENTAGE}"
    
    # Wait for changes to propagate
    sleep 30
    
    # Verify traffic routing
    echo "Verifying traffic routing..."
    for i in {1..10}; do
        RESPONSE=$(curl -s https://api.mailsender.app/health | jq -r '.environment')
        echo "Request $i: $RESPONSE"
        sleep 1
    done
else
    echo "Invalid environment. Use 'blue' or 'green'"
    exit 1
fi
```

#### Emergency Rollback Script
```bash
#!/bin/bash
# /opt/scripts/emergency-rollback.sh

echo "EMERGENCY ROLLBACK INITIATED"
echo "Timestamp: $(date)"

# Step 1: Route all traffic to blue (stable) environment
echo "Step 1: Routing 100% traffic to blue environment"
/opt/scripts/manage-traffic.sh blue 100

# Step 2: Verify system health
echo "Step 2: Verifying system health"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://api.mailsender.app/health)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed: $HEALTH_CHECK"
fi

TRACKING_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://track.mailsender.app/pixel/test.png)
if [ "$TRACKING_CHECK" = "200" ]; then
    echo "✅ Tracking health check passed"
else
    echo "❌ Tracking health check failed: $TRACKING_CHECK"
fi

# Step 3: Send notifications
echo "Step 3: Sending notifications"
curl -X POST https://hooks.slack.com/services/$SLACK_WEBHOOK \
  -H 'Content-type: application/json' \
  -d '{"text":"🚨 EMERGENCY ROLLBACK COMPLETED\nSystem rolled back to blue environment\nTimestamp: '$(date)'"}'

# Update status page
curl -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
  -H "Authorization: OAuth $STATUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"incident": {"name": "Emergency Rollback Completed", "status": "monitoring", "body": "System has been rolled back to stable version. Monitoring for stability."}}'

echo "Emergency rollback completed successfully"
```

### Health Check Scripts

#### Comprehensive Health Validation
```bash
#!/bin/bash
# /opt/scripts/validate-deployment.sh

ENVIRONMENT=$1
ERRORS=0

echo "Validating deployment for $ENVIRONMENT environment"

# API Health Check
echo "Checking API health..."
API_HEALTH=$(curl -s https://api.mailsender.app/health/detailed)
API_STATUS=$(echo $API_HEALTH | jq -r '.status')
if [ "$API_STATUS" = "healthy" ]; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed: $API_STATUS"
    ((ERRORS++))
fi

# Database Health Check
echo "Checking database health..."
DB_HEALTH=$(echo $API_HEALTH | jq -r '.components.database.status')
if [ "$DB_HEALTH" = "healthy" ]; then
    echo "✅ Database is healthy"
else
    echo "❌ Database health check failed: $DB_HEALTH"
    ((ERRORS++))
fi

# Redis Health Check
echo "Checking Redis health..."
REDIS_HEALTH=$(echo $API_HEALTH | jq -r '.components.redis.status')
if [ "$REDIS_HEALTH" = "healthy" ]; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis health check failed: $REDIS_HEALTH"
    ((ERRORS++))
fi

# Tracking Health Check
echo "Checking tracking functionality..."
PIXEL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://track.mailsender.app/pixel/test.png)
if [ "$PIXEL_RESPONSE" = "200" ]; then
    echo "✅ Pixel tracking is working"
else
    echo "❌ Pixel tracking failed: HTTP $PIXEL_RESPONSE"
    ((ERRORS++))
fi

# Performance Check
echo "Checking response times..."
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" https://api.mailsender.app/health)
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
if (( $(echo "$RESPONSE_TIME_MS < 100" | bc -l) )); then
    echo "✅ Response time is good: ${RESPONSE_TIME_MS}ms"
else
    echo "⚠️ Response time is high: ${RESPONSE_TIME_MS}ms"
fi

# Summary
echo "Validation completed with $ERRORS errors"
if [ $ERRORS -eq 0 ]; then
    echo "🎉 All health checks passed!"
    exit 0
else
    echo "💥 $ERRORS health checks failed!"
    exit 1
fi
```

## 📋 Rollout Checklist

### Pre-Rollout Checklist
- [ ] **Staging validation** completed successfully
- [ ] **Load testing** completed at 10x capacity
- [ ] **Security testing** completed with no critical issues
- [ ] **Blue-green infrastructure** provisioned and tested
- [ ] **Monitoring dashboards** configured and operational
- [ ] **Alerting rules** configured and tested
- [ ] **Rollback procedures** documented and rehearsed
- [ ] **Team notification** sent to all stakeholders
- [ ] **Status page** prepared for updates
- [ ] **Emergency contacts** confirmed and available

### During Rollout Checklist
- [ ] **Phase 1**: 1% traffic routed successfully
- [ ] **Phase 2**: 5% traffic routed successfully
- [ ] **Phase 3**: 10% traffic routed successfully
- [ ] **Phase 4**: 25% traffic routed successfully
- [ ] **Phase 5**: 50% traffic routed successfully
- [ ] **Phase 6**: 100% traffic routed successfully
- [ ] **Monitoring**: All metrics within acceptable ranges
- [ ] **Alerts**: No critical alerts triggered
- [ ] **Functionality**: All features working correctly
- [ ] **Performance**: Response times within SLA

### Post-Rollout Checklist
- [ ] **System health** validated for 2+ hours
- [ ] **Performance metrics** reviewed and documented
- [ ] **Error logs** reviewed for any issues
- [ ] **Business metrics** validated (open rates, click rates)
- [ ] **Team notification** of successful deployment
- [ ] **Status page** updated with success message
- [ ] **Post-mortem** scheduled (if any issues occurred)
- [ ] **Documentation** updated with lessons learned
- [ ] **Old environment** safely decommissioned
- [ ] **Success metrics** documented for future reference

## 📊 Success Metrics

### Technical Metrics
- **Deployment Success Rate**: > 95%
- **Rollback Rate**: < 5%
- **Time to Deploy**: < 2 hours for full rollout
- **Time to Rollback**: < 5 minutes for emergency rollback
- **Zero Downtime**: 100% uptime during deployment

### Performance Metrics
- **API Response Time**: < 100ms (99th percentile)
- **Tracking Response Time**: < 50ms (99th percentile)
- **Error Rate**: < 0.1% during and after deployment
- **Database Performance**: No degradation in query times
- **Memory Usage**: Stable with no leaks detected

### Business Metrics
- **Email Tracking Accuracy**: 100% of tracking events processed
- **Campaign Performance**: No impact on open/click rates
- **User Experience**: No user-reported issues
- **Data Integrity**: 100% data consistency maintained
- **Feature Availability**: All features operational post-deployment

## 🚨 Emergency Procedures

### Incident Response Team
- **Incident Commander**: Lead Engineer on-call
- **Technical Lead**: Senior DevOps Engineer
- **Business Lead**: Product Owner
- **Communications**: Customer Success Manager

### Escalation Path
1. **Level 1**: Automated rollback (< 5 minutes)
2. **Level 2**: Engineering team involvement (< 15 minutes)
3. **Level 3**: Management escalation (< 30 minutes)
4. **Level 4**: Executive notification (< 1 hour)

### Communication Templates

#### Emergency Rollback Notification
```
🚨 EMERGENCY ROLLBACK - SmartLead Email Tracking System

Status: COMPLETED
Time: [TIMESTAMP]
Impact: Service restored to previous stable version
Downtime: [X minutes]

Next Steps:
- Monitoring system stability
- Investigating root cause
- Will provide update in 1 hour

Team: [INCIDENT_COMMANDER]
```

#### Planned Rollback Notification
```
📢 PLANNED ROLLBACK - SmartLead Email Tracking System

Status: IN PROGRESS
Reason: [REASON]
Expected Duration: [X minutes]
Impact: No expected service disruption

Progress:
✅ Phase 1: Traffic reduction started
⏳ Phase 2: Rollback in progress
⏸️ Phase 3: Verification pending

Team: [TECHNICAL_LEAD]
```

## 📚 Post-Deployment Analysis

### Metrics Collection
- **Performance data** from monitoring systems
- **Error logs** and stack traces
- **User feedback** and support tickets
- **Business impact** measurements
- **Infrastructure costs** and resource usage

### Post-Mortem Process
1. **Timeline reconstruction** of deployment events
2. **Root cause analysis** for any issues
3. **Process improvements** identification
4. **Action items** assignment and tracking
5. **Documentation updates** based on learnings

### Continuous Improvement
- **Deployment automation** enhancements
- **Monitoring coverage** improvements
- **Alert threshold** optimization
- **Rollback procedure** refinement
- **Team training** updates

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-08-26  
**Next Review:** 2025-09-26

This rollout strategy should be reviewed and updated after each major deployment based on lessons learned and changing requirements.