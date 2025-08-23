# API Documentation - OPhir Email Automation Platform v2.0.0

## Overview

The OPhir Email Automation Platform provides a comprehensive REST API for managing email campaigns, leads, email accounts, and N8N workflow automation. This documentation covers all available endpoints, authentication, and usage examples.

**Base URL:** `http://localhost:4000/api` (Development)  
**Version:** 2.0.0  
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [OAuth2 Gmail API Integration](#oauth2-gmail-api-integration)
3. [N8N Integration Endpoints](#n8n-integration-endpoints)
4. [Campaign Management](#campaign-management)
5. [Email Accounts](#email-accounts)
6. [Lead Management](#lead-management)
7. [Analytics](#analytics)
8. [Webhooks](#webhooks)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)
11. [Examples](#examples)

---

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "organizationId": "org-uuid"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "Acme Corp"
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

---

## OAuth2 Gmail API Integration

### OAuth2 Authentication Flow

#### Initialize OAuth2 Flow
```http
GET /api/oauth2/auth
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "state": "secure-state-token"
  }
}
```

#### Handle OAuth2 Callback
```http
GET /api/oauth2/callback?code=<auth-code>&state=<state-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Gmail integration successful",
  "data": {
    "email": "user@gmail.com",
    "status": "active",
    "scopes": ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"]
  }
}
```

#### List OAuth2 Accounts
```http
GET /api/oauth2/accounts
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "oauth2-account-uuid",
      "email": "user@gmail.com",
      "provider": "gmail",
      "status": "active",
      "scopes": ["gmail.send", "gmail.readonly", "gmail.modify"],
      "created_at": "2025-08-23T20:00:00Z",
      "last_used": "2025-08-23T19:45:00Z"
    }
  ]
}
```

#### Revoke OAuth2 Account
```http
DELETE /api/oauth2/accounts/:id
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "message": "OAuth2 account revoked successfully"
}
```

#### Test OAuth2 Connection
```http
POST /api/oauth2/test
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "accountId": "oauth2-account-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "email": "user@gmail.com",
    "profile": {
      "emailAddress": "user@gmail.com",
      "messagesTotal": 12543,
      "threadsTotal": 8231
    }
  }
}
```

#### Send Email via OAuth2
```http
POST /api/oauth2/send-email
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "accountId": "oauth2-account-uuid",
  "to": "recipient@example.com",
  "subject": "Test Email",
  "htmlBody": "<h1>Hello from Gmail API</h1><p>This email was sent via OAuth2 integration.</p>",
  "textBody": "Hello from Gmail API\n\nThis email was sent via OAuth2 integration."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "gmail-message-id",
    "threadId": "gmail-thread-id",
    "sentAt": "2025-08-23T20:15:00Z",
    "status": "sent"
  }
}
```

### OAuth2 Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request parameters or OAuth2 flow error
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: OAuth2 scope insufficient or Google API quota exceeded
- **409 Conflict**: OAuth2 account already exists for this email
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error or OAuth2 service unavailable

### OAuth2 Error Responses

```json
{
  "success": false,
  "error": {
    "code": "OAUTH2_AUTH_FAILED",
    "message": "OAuth2 authentication failed: invalid_grant",
    "details": {
      "provider": "gmail",
      "error_type": "token_expired",
      "suggestion": "Please re-authenticate your Gmail account"
    }
  }
}
```

---

## N8N Integration Endpoints

### Create Campaign Workflow
```http
POST /api/n8n-integration/workflows/campaign
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "campaignId": "campaign-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "EpC6mEr2wUH3tsTc",
    "name": "Campaign Automation - Campaign Name",
    "webhookUrl": "https://n8n-1-pztp.onrender.com/webhook/campaign-uuid",
    "status": "active",
    "createdAt": "2025-08-22T10:00:00Z"
  }
}
```

### Create Warmup Workflow
```http
POST /api/n8n-integration/workflows/warmup
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "emailAccountId": "account-uuid"
}
```

### Activate Workflow
```http
POST /api/n8n-integration/workflows/{workflowId}/activate
Authorization: Bearer <access-token>
```

### Deactivate Workflow
```http
POST /api/n8n-integration/workflows/{workflowId}/deactivate
Authorization: Bearer <access-token>
```

### Get Workflow Details
```http
GET /api/n8n-integration/workflows/{workflowId}
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "EpC6mEr2wUH3tsTc",
    "name": "Campaign Automation",
    "active": true,
    "createdAt": "2025-08-22T10:00:00Z",
    "updatedAt": "2025-08-22T10:30:00Z",
    "executionCount": 15,
    "lastExecution": "2025-08-22T11:45:00Z",
    "status": "success"
  }
}
```

### List Organization Workflows
```http
GET /api/n8n-integration/workflows
Authorization: Bearer <access-token>
```

### Delete Workflow
```http
DELETE /api/n8n-integration/workflows/{workflowId}
Authorization: Bearer <access-token>
```

---

## Campaign Management

### List Campaigns
```http
GET /api/campaigns
Authorization: Bearer <access-token>
Query Parameters:
  - page: integer (default: 1)
  - limit: integer (default: 20, max: 100)
  - status: string (draft|active|paused|completed)
  - search: string
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "campaign-uuid",
        "name": "Q3 Outreach Campaign",
        "status": "active",
        "emailsSent": 1250,
        "opensCount": 180,
        "clicksCount": 45,
        "repliesCount": 12,
        "createdAt": "2025-08-01T00:00:00Z",
        "n8nWorkflowId": "EpC6mEr2wUH3tsTc"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Q3 Outreach Campaign",
  "subject": "Hello {{firstName}} - Special Offer",
  "bodyText": "Hi {{firstName}}, we have a special offer for {{company}}...",
  "emailAccountIds": ["account-uuid-1", "account-uuid-2"],
  "leadListId": "list-uuid",
  "sendingSchedule": {
    "startDate": "2025-09-01",
    "sendDays": [1, 2, 3, 4, 5],
    "startHour": 9,
    "endHour": 17,
    "timezone": "America/New_York",
    "intervalMinutes": 15
  },
  "sequences": [
    {
      "step": 1,
      "delayDays": 0,
      "subject": "Initial outreach",
      "bodyText": "Hi {{firstName}}..."
    },
    {
      "step": 2,
      "delayDays": 3,
      "subject": "Follow up",
      "bodyText": "Just following up..."
    }
  ]
}
```

### Get Campaign Details
```http
GET /api/campaigns/{campaignId}
Authorization: Bearer <access-token>
```

### Update Campaign
```http
PUT /api/campaigns/{campaignId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "status": "paused"
}
```

### Start Campaign
```http
POST /api/campaigns/{campaignId}/start
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": "campaign-uuid",
    "status": "active",
    "n8nWorkflowId": "EpC6mEr2wUH3tsTc",
    "workflowStatus": "active",
    "message": "Campaign started successfully with N8N workflow"
  }
}
```

### Pause Campaign
```http
POST /api/campaigns/{campaignId}/pause
Authorization: Bearer <access-token>
```

### Delete Campaign
```http
DELETE /api/campaigns/{campaignId}
Authorization: Bearer <access-token>
```

---

## Email Accounts

### List Email Accounts
```http
GET /api/email-accounts
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "account-uuid",
      "email": "sender@company.com",
      "provider": "gmail",
      "status": "active",
      "healthScore": 85,
      "dailyLimit": 50,
      "sentToday": 12,
      "warmupProgress": 100,
      "warmupDaysRemaining": 0,
      "lastActivity": "2025-08-22T10:30:00Z",
      "createdAt": "2025-07-01T00:00:00Z"
    }
  ]
}
```

### Add Email Account
```http
POST /api/email-accounts
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "sender@company.com",
  "provider": "gmail",
  "credentials": {
    "refreshToken": "encrypted-refresh-token",
    "accessToken": "encrypted-access-token"
  },
  "dailyLimit": 50,
  "warmupEnabled": true
}
```

### Get Email Account Details
```http
GET /api/email-accounts/{accountId}
Authorization: Bearer <access-token>
```

### Update Email Account
```http
PUT /api/email-accounts/{accountId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "dailyLimit": 75,
  "status": "active"
}
```

### Start Email Account Warmup
```http
POST /api/email-accounts/{accountId}/warmup
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "warmupDays": 30,
  "initialDailyLimit": 5,
  "finalDailyLimit": 50
}
```

### Delete Email Account
```http
DELETE /api/email-accounts/{accountId}
Authorization: Bearer <access-token>
```

---

## Lead Management

### List Leads
```http
GET /api/leads
Authorization: Bearer <access-token>
Query Parameters:
  - page: integer (default: 1)
  - limit: integer (default: 50, max: 200)
  - status: string (new|contacted|replied|unsubscribed)
  - search: string
  - campaignId: string
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "lead-uuid",
        "email": "prospect@company.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "company": "Tech Solutions Inc",
        "jobTitle": "Marketing Director",
        "status": "new",
        "lastContactedAt": null,
        "createdAt": "2025-08-22T00:00:00Z",
        "customData": {
          "industry": "Technology",
          "employees": "50-100",
          "location": "San Francisco, CA"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "totalPages": 25
    }
  }
}
```

### Import Leads from CSV
```http
POST /api/leads/import
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

file: leads.csv
listName: "Q3 Prospects"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listId": "list-uuid",
    "listName": "Q3 Prospects",
    "totalRows": 1000,
    "validRows": 980,
    "duplicates": 15,
    "errors": 5,
    "warnings": [
      "Row 45: Missing company name",
      "Row 123: Invalid email format fixed"
    ]
  }
}
```

### Create Individual Lead
```http
POST /api/leads
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "prospect@company.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "company": "Tech Solutions Inc",
  "jobTitle": "Marketing Director",
  "customData": {
    "industry": "Technology",
    "employees": "50-100"
  }
}
```

### Get Lead Details
```http
GET /api/leads/{leadId}
Authorization: Bearer <access-token>
```

### Update Lead
```http
PUT /api/leads/{leadId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "status": "contacted",
  "notes": "Sent initial outreach email"
}
```

### Delete Lead
```http
DELETE /api/leads/{leadId}
Authorization: Bearer <access-token>
```

---

## Analytics

### Dashboard Overview
```http
GET /api/analytics/dashboard
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCampaigns": 5,
      "activeCampaigns": 2,
      "totalLeads": 5000,
      "emailsSentToday": 150,
      "emailsSentThisMonth": 4500,
      "openRate": 22.5,
      "clickRate": 4.8,
      "replyRate": 2.1
    },
    "recentActivity": [
      {
        "type": "campaign_started",
        "campaignName": "Q3 Outreach",
        "timestamp": "2025-08-22T10:00:00Z"
      }
    ],
    "topPerformingCampaigns": [
      {
        "id": "campaign-uuid",
        "name": "Q3 Outreach",
        "openRate": 28.5,
        "clickRate": 6.2,
        "emailsSent": 1250
      }
    ]
  }
}
```

### Campaign Performance
```http
GET /api/analytics/campaigns/{campaignId}
Authorization: Bearer <access-token>
Query Parameters:
  - period: string (7d|30d|90d|all)
  - metrics: string (opens,clicks,replies,bounces)
```

### Email Account Performance
```http
GET /api/analytics/accounts/{accountId}
Authorization: Bearer <access-token>
```

### Lead Engagement History
```http
GET /api/analytics/leads/{leadId}
Authorization: Bearer <access-token>
```

---

## Webhooks

### Email Event Tracking
```http
POST /api/webhooks/email-events
Content-Type: application/json

{
  "event": "email_opened",
  "messageId": "message-uuid",
  "leadId": "lead-uuid",
  "campaignId": "campaign-uuid",
  "timestamp": "2025-08-22T11:30:00Z",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }
}
```

### N8N Workflow Status Updates
```http
POST /api/webhooks/n8n
Content-Type: application/json
Authorization: Bearer <webhook-token>

{
  "workflowId": "EpC6mEr2wUH3tsTc",
  "executionId": "execution-uuid",
  "status": "success",
  "startedAt": "2025-08-22T11:00:00Z",
  "finishedAt": "2025-08-22T11:02:00Z",
  "data": {
    "leadsProcessed": 10,
    "emailsSent": 8,
    "errors": []
  }
}
```

### Unsubscribe Handler
```http
GET /api/webhooks/unsubscribe/{token}
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `AUTHENTICATION_ERROR`: Invalid or expired token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `N8N_ERROR`: N8N workflow operation failed
- `SUPABASE_ERROR`: Database operation failed

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **Webhooks**: 1000 requests per minute per endpoint

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1629820800
```

---

## Examples

### Complete Campaign Creation Flow

1. **Create Campaign**
```bash
curl -X POST http://localhost:4000/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Launch Campaign",
    "subject": "Introducing {{firstName}} - Revolutionary Product",
    "bodyText": "Hi {{firstName}}, {{company}} might be interested in our new product...",
    "emailAccountIds": ["account-1", "account-2"],
    "leadListId": "list-123"
  }'
```

2. **Start Campaign (Auto-creates N8N Workflow)**
```bash
curl -X POST http://localhost:4000/api/campaigns/campaign-uuid/start \
  -H "Authorization: Bearer $TOKEN"
```

3. **Monitor Campaign Performance**
```bash
curl -X GET http://localhost:4000/api/analytics/campaigns/campaign-uuid \
  -H "Authorization: Bearer $TOKEN"
```

### Bulk Lead Import
```bash
curl -X POST http://localhost:4000/api/leads/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@leads.csv" \
  -F "listName=Q3 Prospects"
```

### N8N Workflow Management
```bash
# Create workflow for campaign
curl -X POST http://localhost:4000/api/n8n-integration/workflows/campaign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "campaign-uuid"}'

# Check workflow status
curl -X GET http://localhost:4000/api/n8n-integration/workflows/EpC6mEr2wUH3tsTc \
  -H "Authorization: Bearer $TOKEN"

# Deactivate workflow
curl -X POST http://localhost:4000/api/n8n-integration/workflows/EpC6mEr2wUH3tsTc/deactivate \
  -H "Authorization: Bearer $TOKEN"
```

---

## SDK and Libraries

### JavaScript/Node.js SDK (Planned)
```javascript
import { OPhirClient } from '@ophir/sdk';

const client = new OPhirClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.ophir.dev'
});

// Create and start campaign
const campaign = await client.campaigns.create({
  name: 'Product Launch',
  subject: 'Hello {{firstName}}',
  // ...
});

await client.campaigns.start(campaign.id);
```

### Python SDK (Planned)
```python
from ophir_sdk import OPhirClient

client = OPhirClient(api_key='your-api-key')

# Bulk lead import
result = client.leads.import_csv('leads.csv', list_name='Q3 Prospects')
print(f"Imported {result.valid_rows} leads")
```

---

## Support and Resources

- **Documentation**: [https://docs.ophir.dev](https://docs.ophir.dev)
- **API Status**: [https://status.ophir.dev](https://status.ophir.dev)
- **Support**: [support@ophir.dev](mailto:support@ophir.dev)
- **Changelog**: See `CHANGELOG.md` for API version updates
- **Postman Collection**: Available for download with example requests

---

## Changelog

### v2.0.0 (2025-08-22)
- Added complete N8N integration endpoints
- Enhanced campaign management with workflow automation
- Improved error handling and validation
- Added real-time webhook integration
- Enhanced CSV import with better validation

### v0.3.0 (2025-01-22)
- Added Supabase integration
- Real-time email account management
- Enhanced authentication system

### v0.2.0 (2025-01-22)
- Initial complete API implementation
- Campaign and lead management
- Email account integration