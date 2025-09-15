# Debugging Authentication Issues on DigitalOcean

## Quick Check Steps:

### 1. Check DigitalOcean Logs
Go to your DigitalOcean App Platform:
- Click on your app
- Go to "Runtime Logs" tab
- Look for these specific errors:
  - "JWT_SECRET not configured"
  - "Invalid token"
  - "SUPABASE_URL not defined"
  - "Cannot read properties of undefined"

### 2. Verify Environment Variables
In DigitalOcean App Platform → Settings → backend component → Environment Variables:

**Required Variables:**
```
SUPABASE_URL = https://[your-project-id].supabase.co
SUPABASE_SERVICE_KEY = eyJ[long-key-starting-with-eyJ]
JWT_SECRET = [same-secret-you-use-locally]
EMAIL_ENCRYPTION_KEY = [32-character-string]
```

### 3. Common Issues & Solutions:

#### Issue: "User not found" or "Invalid credentials"
**Cause:** Database connection issue
**Fix:** 
- Verify SUPABASE_URL is correct (no trailing slash!)
- Verify SUPABASE_SERVICE_KEY is the service_role key, not anon key
- Check if the user exists in Supabase dashboard

#### Issue: "Invalid token" or "jwt malformed"
**Cause:** JWT_SECRET mismatch
**Fix:**
- Make sure JWT_SECRET is EXACTLY the same as in your local .env
- If you generated a new one, all existing tokens become invalid
- Users need to login again

#### Issue: "Cannot read properties of undefined"
**Cause:** Missing environment variables
**Fix:**
- The backend is trying to access undefined variables
- Check all 4 required variables are set

### 4. Test Authentication Manually

Test if the backend is running:
```bash
curl https://your-app.ondigitalocean.app/health
```

Test login endpoint:
```bash
curl -X POST https://your-app.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### 5. Check Frontend-Backend Connection

In the frontend environment variables, make sure:
```
NEXT_PUBLIC_API_URL = https://your-backend.ondigitalocean.app
```
(Should NOT have /api at the end)

### 6. Database Check

Go to Supabase Dashboard:
1. Check if users table has your user
2. Check if the password_hash exists
3. Check organization_id is set

### 7. Quick Fix Script

If you need to create a test user directly in Supabase:

```sql
-- Run this in Supabase SQL editor
INSERT INTO organizations (name, plan_type) 
VALUES ('Test Org', 'free') 
RETURNING id;

-- Use the returned ID in next query
INSERT INTO users (email, password_hash, first_name, last_name, organization_id, role)
VALUES (
  'test@example.com',
  '$2a$10$YourHashedPasswordHere', -- Use bcrypt to hash
  'Test',
  'User',
  'organization-id-from-above',
  'admin'
);
```

### 8. Emergency Access

If you're completely locked out, temporarily add this to backend for debugging:

```javascript
// In auth.js - REMOVE AFTER DEBUGGING
router.post('/emergency-token', async (req, res) => {
  const token = jwt.sign(
    { userId: 'test', organizationId: 'test', email: 'test@test.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token, warning: 'REMOVE THIS ENDPOINT' });
});
```

## Most Likely Issue:

Based on the error "doesn't recognize the user", the most likely issues are:

1. **JWT_SECRET is different** between local and production
2. **SUPABASE_SERVICE_KEY is wrong** (using anon key instead of service_role)
3. **User doesn't exist in production database** (different Supabase project?)

## To Fix Right Now:

1. Go to DigitalOcean App Platform
2. Check backend Runtime Logs for exact error
3. Verify all 4 environment variables are set
4. Make sure JWT_SECRET matches your local one
5. Redeploy after adding/fixing variables