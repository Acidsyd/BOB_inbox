# Deploy Cron Email Processor as Worker on DigitalOcean App Platform

## Option 1: Add as a Worker Component (RECOMMENDED)

### In DigitalOcean Console:

1. Go to your App in App Platform
2. Click **"Create Component"** → **"Create Worker"**
3. Configure the worker:

**Source:**
- Source: Same GitHub repo
- Branch: main
- Source Directory: `/backend`

**Settings:**
- Name: `cron-processor`
- Run Command: `node src/cron.js`
- Build Command: `npm install`
- Instance Size: Basic ($5/month)
- Instance Count: 1

**Environment Variables (SAME as backend):**
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_KEY = your-service-key
JWT_SECRET = your-jwt-secret
EMAIL_ENCRYPTION_KEY = your-encryption-key
GOOGLE_OAUTH2_CLIENT_ID = your-google-client-id
GOOGLE_OAUTH2_CLIENT_SECRET = your-google-client-secret
```

4. Click **"Create Worker"**

## Option 2: Run Cron Inside Backend Service

Modify your backend to run the cron processor internally:

**Edit `backend/src/index.js`:**
```javascript
// At the bottom of index.js, add:
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start cron processor if in production
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Starting embedded cron processor...');
    require('./cron.js');
  }
});
```

**Note:** This approach uses the same resources as your API, which might affect performance.

## Option 3: Use DigitalOcean's Scheduled Jobs (Future)

DigitalOcean doesn't have native cron jobs in App Platform yet, but they're working on it.

## Option 4: External Cron Service

Use an external service to trigger your email processing:

1. **Cron-job.org** (Free):
   - Set up a job to call: `https://your-backend.ondigitalocean.app/api/process/trigger`
   - Every 1 minute

2. **Render.com Cron Jobs**:
   - Create a cron job that calls your endpoint
   - More reliable than free services

## Current Problem:

Without the cron processor running, your app can:
- ✅ Create campaigns
- ✅ Schedule emails
- ❌ **NOT send emails** (no processor running!)

## Immediate Fix:

### Add this endpoint to trigger manual processing:

**Create `backend/src/routes/process.js`:**
```javascript
const express = require('express');
const router = express.Router();
const CronEmailProcessor = require('../services/CronEmailProcessor');

// Manual trigger endpoint
router.post('/trigger', async (req, res) => {
  try {
    const processor = new CronEmailProcessor();
    await processor.processScheduledEmails();
    res.json({ success: true, message: 'Email processing triggered' });
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Health check for cron
router.get('/health', async (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Cron processor endpoint available',
    lastRun: global.lastCronRun || 'Never'
  });
});

module.exports = router;
```

Then you can manually trigger email sending:
```bash
curl -X POST https://your-backend.ondigitalocean.app/api/process/trigger
```

## Recommended Solution:

**Add Worker Component** (Option 1) because:
- Runs independently from your API
- Won't affect API performance
- Can scale separately
- Proper separation of concerns
- Only costs $5/month extra

## Cost Breakdown:
- Frontend: $12/month
- Backend: $12/month  
- **Cron Worker: $5/month** (new)
- Total: $29/month

Would you like me to show you exactly how to add the worker component?