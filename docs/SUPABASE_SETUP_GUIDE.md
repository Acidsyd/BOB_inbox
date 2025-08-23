# Supabase Setup Guide for OPhir Platform

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. **Project Details:**
   - **Organization**: Your organization or personal
   - **Name**: `OPhir Cold Email Platform`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier for development

4. Click "Create new project" and wait ~2 minutes for initialization

## Step 2: Import Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `/database/init.sql` EXCEPT the first line
4. **Remove this line:** `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` (Supabase has this enabled by default)
5. Paste the modified schema and click **Run**
6. Verify tables are created in **Table Editor**

## Step 3: Get Your Supabase Credentials

### From Supabase Dashboard → Settings → API:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: `eyJ...` (public, safe for frontend)
- **Service Role Key**: `eyJ...` (secret, backend only!)

## Step 4: Update Environment Variables

### Backend (`/backend/.env`):
```env
# Replace with your actual values
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend (`/frontend/.env.local`):
```env
# Replace with your actual values  
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Enable Real-time Features

1. In Supabase dashboard → **Database** → **Replication**
2. Enable real-time for these tables:
   - ✅ `email_accounts` (for live health updates)
   - ✅ `campaigns` (for campaign progress)
   - ✅ `email_activities` (for engagement tracking)
   - ✅ `email_queue` (for send progress)

## Step 6: Test the Connection

### Backend Test:
```bash
cd backend
npm run dev
curl http://localhost:4000/health
```

### Frontend Test:
```bash  
cd frontend
npm run dev
# Visit http://localhost:3000/settings/email-accounts
```

## Step 7: Create Test Data (Optional)

In Supabase SQL Editor, run:
```sql
-- Create test organization (if not exists)
INSERT INTO organizations (name, plan_type) 
VALUES ('Test Organization', 'free')
ON CONFLICT DO NOTHING;

-- Create test user
INSERT INTO users (organization_id, email, password_hash, first_name, last_name, email_verified)
VALUES (
  (SELECT id FROM organizations WHERE name = 'Test Organization' LIMIT 1),
  'test@example.com',
  '$2b$10$example.hash.for.password',
  'Test',
  'User',
  true
) ON CONFLICT (email) DO NOTHING;

-- Create test email account
INSERT INTO email_accounts (
  user_id, organization_id, email, provider, 
  credentials_encrypted, health_score, warmup_status, daily_limit
)
VALUES (
  (SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1),
  (SELECT id FROM organizations WHERE name = 'Test Organization' LIMIT 1),
  'sender@example.com',
  'gmail',
  'encrypted_credentials_placeholder',
  95,
  'active',
  100
) ON CONFLICT (email, organization_id) DO NOTHING;
```

## Step 8: Verify Integration Files

The following files should be in place for Supabase integration:

### Backend Files:
- `/backend/src/database/supabase.ts` - Supabase client with helper functions
- `/backend/src/types/supabase.ts` - TypeScript types for database schema
- `/backend/src/routes/emailAccounts.ts` - Refactored API routes using Supabase

### Frontend Files:
- `/frontend/lib/supabase.ts` - Frontend client with real-time subscriptions
- `/frontend/types/supabase.ts` - Frontend TypeScript types
- `/frontend/hooks/useEmailAccounts.ts` - Real-time data management hook

## Step 9: Row Level Security (Optional but Recommended)

1. Go to **Authentication** → **Policies**
2. For each table, click **Enable RLS**
3. Create policies for organization-based access:

```sql
-- Example policy for email_accounts
CREATE POLICY "Users can view own organization's email accounts" ON email_accounts
  FOR SELECT USING (organization_id = auth.jwt() ->> 'organization_id');
```

## Troubleshooting

### Common Issues:

**❌ "Missing environment variables"**
- Check that all SUPABASE_* variables are set correctly
- Ensure no trailing spaces or quotes in .env files
- Restart both backend and frontend after updating env vars

**❌ "Database schema not found"**
- Verify schema was imported successfully in SQL Editor
- Check that uuid-ossp line was removed before import
- Ensure all tables appear in Table Editor

**❌ "Real-time not working"**
- Enable replication for required tables in Database → Replication
- Check browser console for WebSocket connection errors
- Verify anon key has proper permissions

**❌ "Authentication errors"**  
- Check that Service Role key is used in backend only
- Ensure Anon key is used in frontend
- Verify JWT secrets match between Supabase and your backend

## Success Indicators

✅ **Database Working**: Tables visible in Supabase Table Editor
✅ **Backend Connected**: Health endpoint returns success  
✅ **Frontend Working**: Email accounts page loads without errors
✅ **Real-time Active**: Changes in Supabase dashboard appear instantly in frontend
✅ **Authentication**: Users can login and access organization data

## Next Steps After Setup

1. **Test Email Account Creation**: Add new accounts through the frontend
2. **Verify Real-time Updates**: Make changes in Supabase dashboard, see instant updates
3. **N8N Integration**: Configure N8N workflows to use Supabase webhooks
4. **Production Deploy**: Configure production Supabase instance

---

**Need Help?** Check the Supabase documentation at [docs.supabase.com](https://docs.supabase.com) or contact our team.