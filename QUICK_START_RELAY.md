# Quick Start: User-Provided SMTP Relay (SendGrid/Mailgun)

## Installation (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install @sendgrid/mail mailgun.js form-data
```

### 2. Run Database Migration
Open Supabase SQL Editor and execute:
```sql
-- File: config/migrations/20250114_add_relay_providers.sql
-- Creates relay_providers table and updates email_accounts
```

### 3. Restart Backend
```bash
npm run dev:backend
```

## Usage

### Adding SendGrid Relay

```bash
# Get SendGrid API key from: https://app.sendgrid.com/settings/api_keys
# Create key with "Full Access" or "Mail Send" permission

curl -X POST http://localhost:4000/api/relay-providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "sendgrid",
    "provider_name": "My SendGrid Account",
    "api_key": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "from_email": "noreply@yourdomain.com",
    "from_name": "Your Company",
    "daily_limit": 100
  }'

# Response:
{
  "success": true,
  "provider": {
    "id": "relay-provider-uuid",
    "provider_type": "sendgrid",
    "from_email": "noreply@yourdomain.com"
  }
}
```

### Adding Mailgun Relay

```bash
# Get Mailgun API key from: https://app.mailgun.com/settings/api_security
# Get domain from: https://app.mailgun.com/sending/domains

curl -X POST http://localhost:4000/api/relay-providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_type": "mailgun",
    "provider_name": "My Mailgun Account",
    "api_key": "key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "config": {
      "domain": "mg.yourdomain.com",
      "region": "us"
    },
    "from_email": "noreply@mg.yourdomain.com",
    "from_name": "Your Company",
    "daily_limit": 300
  }'
```

### Test Relay Provider

```bash
# Send test email
curl -X POST http://localhost:4000/api/relay-providers/PROVIDER_ID/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test_email": "test@example.com"}'

# Response:
{
  "success": true,
  "message": "Test email sent successfully",
  "result": {
    "messageId": "xxx",
    "provider": "sendgrid"
  }
}
```

### Associate Email Account with Relay

```bash
# Update email account to use relay provider
# (Feature requires email_accounts table entry)

# Future: This will be done via frontend UI
# For now, update directly in Supabase:
UPDATE email_accounts
SET relay_provider_id = 'relay-provider-uuid'
WHERE id = 'email-account-uuid';
```

## How It Works

```
┌─────────────────────────────────────────────┐
│         User Campaign Email Send            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         EmailService.sendEmail()            │
│  Priority Check:                            │
│  1. Relay Provider? (if relay_provider_id)  │
│  2. OAuth2? (if OAuth2 tokens exist)        │
│  3. SMTP? (fallback)                        │
└─────────────────────────────────────────────┘
                    ↓ (has relay_provider_id)
┌─────────────────────────────────────────────┐
│    RelayProviderService.sendEmail()         │
│  • Decrypt API key                          │
│  • Route based on provider_type             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           SendGrid/Mailgun API              │
│  • HTTPS request (no port 25 needed!)      │
│  • Provider handles port 25 to recipient    │
│  • Returns messageId                        │
└─────────────────────────────────────────────┘
```

## Benefits

✅ **No Port 25 Required**: Relay handles final delivery
✅ **Better Deliverability**: Pre-warmed IPs with established reputation
✅ **User Control**: Each user provides their own API keys
✅ **Free Tiers**: SendGrid (100/day), Mailgun (5000/month)
✅ **Easy Scaling**: Add multiple relay providers per organization
✅ **Secure**: API keys encrypted with AES-256-CBC

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/relay-providers` | List all providers for org |
| POST | `/api/relay-providers` | Add new provider |
| PUT | `/api/relay-providers/:id` | Update provider |
| DELETE | `/api/relay-providers/:id` | Delete provider |
| POST | `/api/relay-providers/:id/test` | Send test email |
| GET | `/api/relay-providers/:id/usage` | Get usage stats |

## Environment Variables

```bash
# Required for API key encryption
EMAIL_ENCRYPTION_KEY=your-64-char-hex-key-here

# Generate with:
openssl rand -hex 32
```

## Troubleshooting

**"API key validation failed"**
- SendGrid: Check key has "Mail Send" permission
- Mailgun: Verify domain is verified and DNS configured

**"Decryption error"**
- Check `EMAIL_ENCRYPTION_KEY` is 64 hex characters
- Regenerate: `openssl rand -hex 32`

**"Test email not received"**
- SendGrid: Check verified sender email
- Mailgun: Verify domain DNS records (24-48h wait)
- Check spam folder

## Next Steps

1. ✅ Backend API implemented
2. ✅ Database migration ready
3. ✅ SendGrid & Mailgun integration complete
4. 🔄 Frontend UI (TODO):
   - Add relay provider modal
   - List providers with usage stats
   - Associate accounts with providers
   - Test connection button

## Full Documentation

See `RELAY_PROVIDERS_SETUP.md` for complete details.

## Support

**Free Tiers**:
- SendGrid: 100 emails/day forever
- Mailgun: 5,000 emails/month (first 3 months), then 1,000/month

**Documentation**:
- SendGrid: https://docs.sendgrid.com/
- Mailgun: https://documentation.mailgun.com/

**Alternative Providers** (can be added similarly):
- AWS SES: $0.10 per 1,000 emails
- Postmark: 100 emails/month free
- Resend: 3,000 emails/month free
