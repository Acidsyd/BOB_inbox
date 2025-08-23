# OAuth2 Database Setup Instructions

## Current Status ✅

Your Supabase database is **90% ready** for OAuth2 functionality:

- ✅ **oauth2_tokens table** - Exists and working correctly
- ✅ **email_queue table** - Exists and accessible  
- ❌ **email_sending_stats table** - Missing (needs creation)
- ❌ **OAuth2 columns in email_accounts** - Missing (needs addition)

## Quick Setup (2 minutes)

### Step 1: Access Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qqalaelzfdiytrcdmbfw`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute SQL Script
1. Copy the entire contents of `MANUAL_OAUTH2_SETUP.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute all commands

### Step 3: Verify Setup
Run the verification script:
```bash
cd backend
node verify-oauth2-setup.js
```

You should see all ✅ green checkmarks.

## What Gets Created

### Tables
- **email_sending_stats** - Tracks email metrics and health scores
  
### Columns Added to email_accounts
- **oauth2_token_id** - Links to OAuth2 tokens
- **auth_method** - 'smtp' or 'oauth2' 
- **api_quotas** - JSON tracking of API usage

### Performance Indexes
- Email queue status and scheduling optimization
- OAuth2 token lookups by organization and email
- Email sending statistics by organization and date

### Database Triggers
- Automatic `updated_at` timestamp updates for all tables

## OAuth2 Service Architecture

### Database Schema Overview
```
organizations
├── oauth2_tokens (stores encrypted OAuth2 credentials)
│   ├── organization_id → organizations.id
│   ├── email (Gmail address)
│   ├── encrypted_tokens (access & refresh tokens)
│   ├── expires_at (token expiration)
│   └── scopes (OAuth2 permissions)
│
├── email_accounts (email sending accounts)
│   ├── oauth2_token_id → oauth2_tokens.id
│   ├── auth_method ('smtp' or 'oauth2')
│   └── api_quotas (usage tracking)
│
├── email_queue (outbound emails)
│   ├── campaign_id, lead_id
│   ├── email content and scheduling
│   └── delivery status tracking
│
└── email_sending_stats (daily metrics)
    ├── organization_id → organizations.id
    ├── email_account (sending address)
    ├── emails_sent, delivered, bounced
    └── health_score (0-100)
```

### OAuth2Service Features
- **Token Management**: Secure storage and automatic refresh
- **Gmail API Integration**: Direct email sending via Gmail API
- **Quota Management**: Track and respect API limits
- **Health Monitoring**: Email account reputation tracking
- **Domain-wide Delegation**: Enterprise G Suite integration

## Testing OAuth2 Functionality

Once setup is complete, you can test OAuth2 functionality:

### 1. Enable OAuth2 Routes
In `backend/src/index.js`, uncomment the OAuth2 routes:
```javascript
// Line 39: Uncomment this line
app.use('/api/oauth2', oauth2Routes);

// Line 173: Uncomment this line  
app.use('/api/oauth2', oauth2Routes);
```

### 2. Start Backend Server
```bash
cd backend
npm run dev
```

### 3. Test OAuth2 Endpoints
```bash
# Test OAuth2 authorization URL generation
curl http://localhost:4000/api/oauth2/auth/url

# Test token storage (after OAuth flow)
curl -X POST http://localhost:4000/api/oauth2/tokens \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "your-org-id", "email": "test@gmail.com"}'
```

## Environment Variables Required

Ensure these are set in `backend/.env`:
```env
# OAuth2 Configuration
GOOGLE_OAUTH2_CLIENT_ID=529213249799-ivupsm6s63trnjp08klvii1gq4a8eqqi.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=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
GOOGLE_OAUTH2_REDIRECT_URI=http://localhost:4000/api/oauth2/auth/callback
EMAIL_ENCRYPTION_KEY=your-32-char-encryption-key-here

# Supabase (already configured)
SUPABASE_URL=https://qqalaelzfdiytrcdmbfw.supabase.co
SUPABASE_SERVICE_KEY=...
```

## Next Steps After Setup

1. **✅ Complete database setup** (using the SQL script above)
2. **🔧 Enable OAuth2 routes** in the backend
3. **🧪 Test OAuth2 flow** with a Gmail account
4. **📊 Monitor email metrics** in the dashboard
5. **🚀 Deploy to production** when ready

## Troubleshooting

### If you get errors during SQL execution:
- Run each section separately (tables, then columns, then indexes)
- Check for typos in table/column names
- Ensure you're connected to the correct Supabase project

### If OAuth2Service fails to import:
- Check that all environment variables are set
- Verify the service file exists at `src/services/OAuth2Service.js`
- Make sure you're running from the `backend` directory

### If verification script shows missing tables:
- Clear your browser cache for Supabase dashboard
- Wait 30 seconds after running SQL for schema cache to refresh
- Re-run the verification script

## Support

If you encounter issues:
1. Check the `DEVELOPMENT_LOG.md` for recent changes
2. Verify environment variables are correctly set
3. Run `node verify-oauth2-setup.js` to diagnose problems
4. Check Supabase dashboard logs for any error messages

---

**Status**: Ready for manual setup ✅  
**Time Required**: ~2 minutes  
**Complexity**: Low (copy/paste SQL script)