# SMTP Relay Provider Setup (SendGrid & Mailgun)

This guide explains how to set up user-provided SMTP relay services (SendGrid/Mailgun) in your Mailsender application.

## Overview

Users can now bring their own SendGrid or Mailgun API keys to send emails through their relay accounts. This provides:

- **No port 25 required**: Relay services handle final delivery
- **Better deliverability**: Pre-warmed IPs and established reputation
- **Easy scaling**: SendGrid (100/day free), Mailgun (5000/month free)
- **User control**: Each user provides their own API keys

## Installation Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install @sendgrid/mail mailgun.js form-data
```

**Packages**:
- `@sendgrid/mail` (v7.7.0+): Official SendGrid Node.js SDK
- `mailgun.js` (v9.4.0+): Official Mailgun Node.js SDK
- `form-data` (v4.0.0+): Required by mailgun.js

### Step 2: Run Database Migration

Open Supabase SQL Editor and run:

```bash
# File location
config/migrations/20250114_add_relay_providers.sql
```

This creates:
- `relay_providers` table (stores encrypted API keys)
- `relay_provider_usage_summary` view (usage statistics)
- Updates `email_accounts` table with `relay_provider_id` column

### Step 3: Verify Backend Setup

The following files have been added/updated:

```bash
✅ backend/src/services/RelayProviderService.js    # SendGrid & Mailgun integration
✅ backend/src/services/EmailService.js            # Updated to route via relay
✅ backend/src/routes/relayProviders.js            # API endpoints
✅ backend/src/index.js                            # Route registration
```

### Step 4: Test Backend API

```bash
# Start backend
npm run dev:backend

# Test health endpoint
curl http://localhost:4000/health

# Test relay providers endpoint (requires auth)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/relay-providers
```

## API Endpoints

### 1. List Relay Providers

```bash
GET /api/relay-providers
Authorization: Bearer <token>

Response:
{
  "success": true,
  "providers": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "provider_type": "sendgrid",
      "provider_name": "SendGrid Primary",
      "from_email": "noreply@example.com",
      "is_active": true,
      "daily_limit": 100,
      "emails_sent_today": 5,
      "health_score": 100,
      "connected_accounts": 3
    }
  ]
}
```

### 2. Add Relay Provider

**SendGrid Example**:
```bash
POST /api/relay-providers
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_type": "sendgrid",
  "provider_name": "SendGrid Primary",
  "api_key": "SG.xxxxxxxxxxxxxxxxxxxxx",
  "from_email": "noreply@example.com",
  "from_name": "My Company",
  "daily_limit": 100
}
```

**Mailgun Example**:
```bash
POST /api/relay-providers
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_type": "mailgun",
  "provider_name": "Mailgun Primary",
  "api_key": "key-xxxxxxxxxxxxxxxxxxxxxxxx",
  "config": {
    "domain": "mg.example.com",
    "region": "us"
  },
  "from_email": "noreply@mg.example.com",
  "from_name": "My Company",
  "daily_limit": 300
}
```

### 3. Test Relay Provider

```bash
POST /api/relay-providers/:id/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "test_email": "test@example.com"
}

Response:
{
  "success": true,
  "message": "Test email sent successfully",
  "result": {
    "messageId": "xxx",
    "provider": "sendgrid",
    "to": "test@example.com"
  }
}
```

### 4. Update Relay Provider

```bash
PUT /api/relay-providers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_name": "SendGrid Updated",
  "daily_limit": 200,
  "is_active": true,
  "api_key": "SG.new_key_here"  // Optional
}
```

### 5. Delete Relay Provider

```bash
DELETE /api/relay-providers/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Relay provider deleted successfully"
}

# Error if accounts are using it:
{
  "success": false,
  "error": "Cannot delete relay provider. 3 email account(s) are still using it.",
  "connected_accounts": [...]
}
```

### 6. Get Usage Statistics

```bash
GET /api/relay-providers/:id/usage?days=30
Authorization: Bearer <token>

Response:
{
  "success": true,
  "provider_id": "uuid",
  "provider_name": "SendGrid Primary",
  "usage": {
    "today": 15,
    "this_month": 450,
    "daily_limit": 100,
    "daily_remaining": 85,
    "daily_usage_percent": 15.00,
    "last_used_at": "2025-01-14T10:30:00Z"
  },
  "connected_accounts": 3
}
```

## How Email Routing Works

When sending emails, the system now follows this priority:

```
1. Relay Provider (if email_accounts.relay_provider_id is set)
   ├── SendGrid API (port 25 handled by SendGrid)
   └── Mailgun API (port 25 handled by Mailgun)

2. OAuth2 (if OAuth2 tokens exist)
   └── Gmail API (no SMTP/port 25 needed)

3. Direct SMTP (fallback)
   └── Nodemailer SMTP (requires port 587/465)
```

**Example Flow**:

```javascript
// User adds SendGrid API key
POST /api/relay-providers
{ provider_type: "sendgrid", api_key: "SG.xxx..." }

// User associates email account with relay provider
PUT /api/email-accounts/:id
{ relay_provider_id: "relay-provider-uuid" }

// When campaign sends email:
EmailService.sendEmail() → checks relay_provider_id
  → RelayProviderService.sendViaSendGrid()
  → SendGrid API (HTTPS, no port 25 needed)
  → SendGrid handles port 25 delivery to recipient
```

## Getting API Keys

### SendGrid

1. Sign up: https://signup.sendgrid.com/
2. Go to: Settings → API Keys
3. Create API Key with "Full Access" permissions
4. Copy key (starts with `SG.`)
5. **Free tier**: 100 emails/day

### Mailgun

1. Sign up: https://signup.mailgun.com/
2. Go to: Sending → Domain Settings → API Keys
3. Copy API Key (starts with `key-`)
4. Add your domain: Sending → Domains → Add New Domain
5. **Free tier**: 5,000 emails/month (first 3 months)

**Important**: Mailgun requires domain verification:
- Add DNS records (MX, TXT, CNAME)
- Wait 24-48 hours for verification
- Use format: `you@mg.yourdomain.com`

## Security

**Encryption**:
- API keys encrypted with AES-256-CBC
- Stored in `api_key_encrypted` + `api_key_iv` columns
- Encryption key from `process.env.EMAIL_ENCRYPTION_KEY`

**Validation**:
- API keys validated before saving (test API call)
- SendGrid: Uses sandbox mode for validation
- Mailgun: Validates domain access

**Access Control**:
- All endpoints require JWT authentication
- Organization isolation (users only see their own providers)
- Sensitive data removed from API responses

## Troubleshooting

### "API key validation failed"

**SendGrid**:
- Ensure API key has "Mail Send" permission
- Check key starts with `SG.`
- Verify `from_email` is verified sender in SendGrid

**Mailgun**:
- Ensure `config.domain` is provided
- Domain must be verified in Mailgun dashboard
- Check DNS records (MX, TXT, CNAME)

### "Cannot delete relay provider"

Error means email accounts are still using this provider:
1. Check `connected_accounts` in error response
2. Update those accounts to use different provider
3. Then delete the relay provider

### "Failed to decrypt API key"

- Verify `EMAIL_ENCRYPTION_KEY` environment variable is set
- Key must be 32 characters (64 hex characters)
- Generate with: `openssl rand -hex 32`

## Frontend Integration (TODO)

Next steps for frontend UI:

1. **Settings Page** (`/settings/email-accounts`):
   - Add "Relay Providers" tab
   - List existing providers
   - Button: "Add SendGrid" / "Add Mailgun"

2. **Add Provider Modal**:
   ```tsx
   <AddRelayProviderModal>
     <Select provider_type>SendGrid | Mailgun</Select>
     <Input api_key placeholder="SG.xxx or key-xxx" />
     <Input from_email />
     <Input from_name />
     {providerType === 'mailgun' && (
       <Input config.domain placeholder="mg.example.com" />
     )}
     <Button onClick={handleAdd}>Validate & Add</Button>
   </AddRelayProviderModal>
   ```

3. **Email Account Association**:
   - In email account edit modal
   - Dropdown: "Use Relay Provider" → Select from user's providers
   - Shows usage stats: "15/100 emails sent today"

## Testing

### Test SendGrid Integration

```javascript
// In backend console or test script
const RelayProviderService = require('./src/services/RelayProviderService');
const service = new RelayProviderService();

const result = await service.sendViaSendGrid(
  { api_key: 'SG.xxx', from_email: 'test@example.com' },
  {
    to: 'recipient@example.com',
    subject: 'Test SendGrid',
    html: '<p>Hello from SendGrid!</p>'
  }
);

console.log(result);
```

### Test Mailgun Integration

```javascript
const result = await service.sendViaMailgun(
  {
    api_key: 'key-xxx',
    from_email: 'test@mg.example.com',
    config: { domain: 'mg.example.com', region: 'us' }
  },
  {
    to: 'recipient@example.com',
    subject: 'Test Mailgun',
    html: '<p>Hello from Mailgun!</p>'
  }
);

console.log(result);
```

## Production Checklist

Before deploying to production:

- [ ] Run database migration
- [ ] Install npm dependencies
- [ ] Set `EMAIL_ENCRYPTION_KEY` environment variable
- [ ] Test API endpoints with curl
- [ ] Verify API key validation works
- [ ] Test email sending through both SendGrid and Mailgun
- [ ] Check usage tracking updates correctly
- [ ] Verify organization isolation (users can't see others' providers)
- [ ] Test deletion protection (can't delete if accounts using it)
- [ ] Build frontend UI for adding providers

## Support

**Common Issues**:
- SendGrid: https://docs.sendgrid.com/
- Mailgun: https://documentation.mailgun.com/
- Encryption errors: Check `EMAIL_ENCRYPTION_KEY` length (must be 64 hex chars)

**Feature Requests**:
- AWS SES support: Add to `RelayProviderService.js`
- Postmark support: Similar pattern to SendGrid
- Usage analytics: Create `relay_provider_usage_history` table
