# Complete Login Fix Deployment Guide

## 🚨 Quick Reference Commands

```bash
# Test frontend-backend connectivity
curl -s http://104.131.93.55:4000/health

# Check PM2 service status
ssh -i ~/.ssh/your-key root@104.131.93.55 "pm2 status"

# View PM2 logs (troubleshooting)
ssh -i ~/.ssh/your-key root@104.131.93.55 "pm2 logs mailsender-backend --lines 20"

# Restart services after changes
ssh -i ~/.ssh/your-key root@104.131.93.55 "cd /var/www/mailsender && pm2 restart ecosystem.config.cjs"

# Copy files to server
scp -i ~/.ssh/your-key local-file root@server-ip:/remote/path

# Test authentication endpoint
curl -X POST http://104.131.93.55:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test"}'

# Check file contents on server
ssh -i ~/.ssh/your-key root@104.131.93.55 "head -30 /var/www/mailsender/backend/src/app.js"

# Fix file permissions for SSH keys
chmod 600 ~/.ssh/your-private-key
```

## Problem Summary

**Issue**: After deploying the BOB_inbox application to DigitalOcean (IP: 104.131.93.55), login functionality was failing with various errors including CORS violations and backend crashes.

**Root Cause**: The backend `app.js` file was corrupted during deployment, containing only 6 lines of CORS configuration instead of the complete application code.

## Step-by-Step Fix Process

### 1. Initial Diagnosis - API Connectivity

**Problem**: Frontend couldn't connect to backend API
```bash
# Test basic connectivity
curl -s http://104.131.93.55:4000/health
```

**Finding**: Backend was returning CORS errors when accessed from the frontend running on the same server.

### 2. CORS Configuration Fix

**Problem**: Browser showing "Access to XMLHttpRequest blocked by CORS policy"

**Solution**: Updated frontend API configuration to detect server IP access
```javascript
// In frontend/lib/api.ts
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === '104.131.93.55') {
    return 'http://104.131.93.55:4000'
  }
  // ... other conditions
}
```

### 3. Environment Variables Issues

**Problem**: Backend logging "MISSING REQUIRED ENVIRONMENT VARIABLES"

**Commands Used**:
```bash
# Copy environment file to server
scp -i ~/.ssh/qquadro_production .env.production root@104.131.93.55:/var/www/mailsender/backend/.env

# Verify environment variables
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "head -10 /var/www/mailsender/backend/.env"
```

### 4. PM2 Configuration Problems

**Problem**: PM2 not loading environment variables correctly

**Solution**: Created proper ecosystem configuration
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'mailsender-backend',
      script: 'src/app.js',
      cwd: '/var/www/mailsender/backend',
      env_file: '.env',
      env: { NODE_ENV: 'production', PORT: 4000 }
    },
    {
      name: 'mailsender-frontend', 
      script: 'server.js',
      cwd: '/var/www/mailsender/frontend',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
}
```

**Commands**:
```bash
# Create ecosystem config on server
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "cd /var/www/mailsender && cat > ecosystem.config.cjs << 'EOF'
[config content]
EOF"

# Restart with new config
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "cd /var/www/mailsender && pm2 restart ecosystem.config.cjs"
```

### 5. Critical Discovery - Corrupted Backend File

**Problem**: Backend still failing to start properly

**Investigation Command**:
```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "cat /var/www/mailsender/backend/src/app.js"
```

**Finding**: The `app.js` file contained only 6 lines:
```javascript
origin: [
  'http://104.131.93.55:3000',
  'http://localhost:3000', 
  'http://localhost:3001',
  'https://qquadro.com'
],
```

### 6. File Restoration Process

**Solution**: Copy the complete backend file from local development environment

**Commands**:
```bash
# Find correct SSH key
ls -la ~/.ssh/

# Copy backend file (local index.js → server app.js)
scp -i ~/.ssh/qquadro_production backend/src/index.js root@104.131.93.55:/var/www/mailsender/backend/src/app.js

# Update CORS configuration for production
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "cd /var/www/mailsender/backend && sed -i 's/https:\/\/yourdomain\.com/http:\/\/104\.131\.93\.55:3000/g' src/app.js"

# Verify restoration
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "head -30 /var/www/mailsender/backend/src/app.js"
```

### 7. Final Service Restart and Testing

**Restart Services**:
```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "cd /var/www/mailsender && pm2 restart ecosystem.config.cjs"
```

**Verification**:
```bash
# Check service status
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "pm2 status"

# Test health endpoint
curl -s http://104.131.93.55:4000/health

# Test authentication endpoint
curl -X POST http://104.131.93.55:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"wrongpassword"}'
```

## Key Technical Details

### Server Configuration
- **Server IP**: 104.131.93.55
- **Frontend Port**: 3000
- **Backend Port**: 4000
- **Process Manager**: PM2
- **Environment**: Production

### File Structure
```
/var/www/mailsender/
├── backend/
│   ├── src/
│   │   ├── app.js (main application file)
│   │   ├── routes/ (API routes)
│   │   └── services/ (business logic)
│   ├── .env (environment variables)
│   └── package.json
├── frontend/
│   ├── lib/api.ts (API configuration)
│   └── server.js (Next.js production server)
└── ecosystem.config.cjs (PM2 configuration)
```

### Environment Variables Required
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
EMAIL_ENCRYPTION_KEY=your-32-char-encryption-key
GOOGLE_OAUTH2_CLIENT_ID=your-client-id
GOOGLE_OAUTH2_CLIENT_SECRET=your-client-secret
NODE_ENV=production
PORT=4000
```

### CORS Configuration
The backend CORS must allow the frontend domain:
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://104.131.93.55:3000'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

## Troubleshooting Commands

### Check Service Health
```bash
# PM2 process status
ssh -i ~/.ssh/your-key root@104.131.93.55 "pm2 status"

# View recent logs
ssh -i ~/.ssh/your-key root@104.131.93.55 "pm2 logs --lines 50"

# Test API endpoints
curl -s http://104.131.93.55:4000/health
curl -s http://104.131.93.55:4000/api/auth/me
```

### File Operations
```bash
# Check file contents
ssh -i ~/.ssh/your-key root@104.131.93.55 "cat /path/to/file"

# Copy files to server
scp -i ~/.ssh/your-key local-file root@server-ip:/remote/path

# Edit files on server
ssh -i ~/.ssh/your-key root@104.131.93.55 "nano /path/to/file"
```

### SSH Key Management
```bash
# Fix SSH key permissions
chmod 600 ~/.ssh/your-private-key

# Test SSH connection
ssh -i ~/.ssh/your-key root@server-ip "echo 'Connection successful'"
```

## Prevention Measures

1. **Backup Critical Files**: Always backup `app.js`, `package.json`, and `.env` before deployment
2. **Verify Deployment**: Test all endpoints after deployment
3. **Monitor Logs**: Check PM2 logs immediately after deployment
4. **Version Control**: Ensure all code is committed before deployment
5. **Staged Deployment**: Test on staging environment first

## Success Verification

After completing all steps, verify success with:

1. **Frontend Access**: Visit `http://104.131.93.55:3000`
2. **Backend Health**: `curl http://104.131.93.55:4000/health`
3. **Authentication**: Test login functionality
4. **PM2 Status**: All services showing "online"
5. **No CORS Errors**: Check browser console for clean API calls

## Final Result

✅ **Login functionality restored**
✅ **All API endpoints working**
✅ **CORS issues resolved** 
✅ **Environment variables loaded**
✅ **PM2 services stable**
✅ **Application fully functional**

The BOB_inbox application is now successfully deployed and operational at `http://104.131.93.55:3000`.