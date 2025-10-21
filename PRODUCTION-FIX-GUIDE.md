# Production Deployment Fix Guide

## 🔴 Issues Found on qquadro.com

### Issue 1: Dashboard Crash - Missing JavaScript Chunks
**Error**: `ChunkLoadError: Loading chunk 627 failed`
**Root Cause**: nginx serving JavaScript files with wrong MIME type (`text/plain` instead of `application/javascript`)

### Issue 2: Build Configuration Mismatch
**Error**: Dockerfile expects `standalone` output but Next.js has it disabled
**Root Cause**: `next.config.js` line 38 was commented out

### Issue 3: Empty PWA Icons
**Warning**: PWA icons are placeholder files (70 bytes)
**Impact**: Non-critical, but PWA functionality won't work properly

---

## ✅ Fixes Applied

### 1. Fixed nginx MIME Types
**File**: `config/nginx/nginx.conf`
```nginx
http {
    # CRITICAL: Include MIME types for proper file serving
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    ...
}
```

### 2. Enabled Next.js Standalone Output
**File**: `frontend/next.config.js` (line 38)
```javascript
// BEFORE (broken)
// output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

// AFTER (fixed)
output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
```

---

## 🚀 Deployment Instructions

### Option A: Using the Deployment Script (Recommended)

```bash
# 1. Navigate to project root
cd /path/to/Mailsender

# 2. Run deployment script
./deploy-production.sh
```

### Option B: Manual Deployment

```bash
# 1. Rebuild frontend with correct configuration
cd frontend
npm run build
cd ..

# 2. Rebuild Docker containers
docker-compose down
docker-compose build --no-cache

# 3. Start services
docker-compose up -d

# 4. Verify services are running
curl http://localhost:3000        # Frontend
curl http://localhost:4000/api/health  # Backend API
```

---

## 📝 Post-Deployment Steps

### 1. SSH to Production Server
```bash
ssh user@qquadro.com
```

### 2. Pull Latest Code
```bash
cd /path/to/production/deployment
git pull origin main
```

### 3. Run Deployment
```bash
./deploy-production.sh
```

### 4. Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

### 5. Verify Fix
Visit https://qquadro.com/dashboard and check:
- ✅ No "ChunkLoadError" in console
- ✅ No MIME type errors
- ✅ Dashboard loads properly
- ✅ API calls work

---

## 🔍 Additional Issues Found

### WISE 3 Campaign - No Valid Email Accounts
**Problem**: Campaign has 1,383 scheduled emails but 0 email accounts exist in database

**Fix Required**:
1. Go to **Email Accounts** settings
2. Link/add Gmail accounts via OAuth2
3. Edit "WISE 3" campaign
4. Select your email accounts
5. Save campaign

The cron processor will automatically start sending once accounts are configured.

### Empty "Active" Campaigns
**Problem**: 7 campaigns marked "active" with 0 scheduled emails

**Recommended**: Pause or complete these campaigns:
- d
- test
- Gianpiero Di Felice test
- dddd
- Gianpiero Di Felicexsz<xsxas
- mnnkmm
- bounce

---

## 🏥 System Health Status

- ✅ Backend API: Running
- ✅ Cron Processor: Running (every minute)
- ✅ Database: Connected
- ✅ No code bugs detected
- ⚠️ Frontend deployment: Needs rebuild with fixes
- ⚠️ nginx: Needs configuration reload

---

## 📞 Support

If deployment fails:
1. Check Docker logs: `docker-compose logs -f`
2. Check nginx logs: `docker-compose logs nginx`
3. Verify environment variables in `.env` files

---

## 🎯 Success Criteria

After deployment, verify:
- [ ] Dashboard loads without errors
- [ ] No JavaScript chunk errors in console
- [ ] No MIME type warnings
- [ ] API calls return data (not 401/403)
- [ ] Email accounts are linked
- [ ] WISE 3 campaign starts sending
