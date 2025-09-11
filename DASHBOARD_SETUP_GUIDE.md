# DigitalOcean Dashboard Setup Guide

## 🚫 CLI Issues Encountered

The CLI deployment failed due to GitHub repository access permissions. Here's what happened:

1. **App Creation**: ✅ Successful using `doctl apps create`
2. **GitHub Access**: ❌ Failed - DigitalOcean needs explicit permission to access `Acidsyd/BOB_inbox`
3. **Build Process**: ❌ Cannot start without GitHub integration

## 🎯 Dashboard Solution (Recommended)

### Step 1: Access DigitalOcean Dashboard
1. Go to: https://cloud.digitalocean.com/apps
2. Click **"Create App"**

### Step 2: Connect GitHub Repository
1. **Source**: Choose **"GitHub"**
2. **Authorize**: Click **"Authorize DigitalOcean"** 
   - This grants DigitalOcean access to your GitHub account
   - You'll be redirected to GitHub for permission
3. **Repository**: Select `Acidsyd/BOB_inbox`
4. **Branch**: Select `main`
5. **Auto-deploy**: ✅ Check "Auto-deploy on push"

### Step 3: Configure Backend Service
```
Service Name: backend
Source Directory: backend
Build Command: npm install --production
Run Command: npm start
HTTP Port: 4000
Environment: node-js
Instance Size: Basic ($5/month)
```

**Routes:**
- `/api`
- `/health`

**Environment Variables:**
```
NODE_ENV=production
PORT=4000
```

### Step 4: Configure Frontend Service
```
Service Name: frontend
Source Directory: frontend
Build Command: npm install --production && npm run build
Run Command: npm start
HTTP Port: 3001
Environment: node-js
Instance Size: Basic ($5/month)
```

**Routes:**
- `/` (catch-all)

**Environment Variables:**
```
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=${backend.PUBLIC_URL}
```

### Step 5: Review and Deploy
1. **App Name**: `mailsender`
2. **Region**: Choose closest to your users
3. **Review Configuration**: Verify all settings
4. **Create Resources**: Click **"Create Resources"**

## 🔧 Required Environment Variables (Add After Deployment)

Once the app is deployed, add these environment variables in the dashboard:

### Backend Environment Variables
```
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
JWT_SECRET=your_jwt_secret_here
EMAIL_ENCRYPTION_KEY=your_email_encryption_key_here
GOOGLE_OAUTH2_CLIENT_ID=your_google_oauth2_client_id_here
GOOGLE_OAUTH2_CLIENT_SECRET=your_google_oauth2_client_secret_here
GOOGLE_OAUTH2_REDIRECT_URI=https://your-app-url.ondigitalocean.app/api/oauth2/auth/callback
```

### Frontend Environment Variables
```
NEXT_PUBLIC_API_URL=${backend.PUBLIC_URL}
```

## 📊 Monitoring Your Deployment

### Dashboard Monitoring
1. **Apps Dashboard**: https://cloud.digitalocean.com/apps
2. **Deployment Status**: Watch build and deploy progress
3. **Logs**: View build and runtime logs
4. **Metrics**: Monitor performance and usage

### Key Metrics to Watch
- **Build Status**: Should complete without errors
- **Health Checks**: Both services should be healthy
- **Response Times**: Monitor for performance issues
- **Resource Usage**: CPU and memory consumption

## 🎯 Expected Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| GitHub Authorization | 1-2 minutes | User action required |
| Build Backend | 3-5 minutes | Automatic |
| Build Frontend | 5-10 minutes | Automatic |
| Deploy Services | 2-3 minutes | Automatic |
| Health Checks | 1-2 minutes | Automatic |
| **Total** | **12-22 minutes** | **Complete** |

## ✅ Success Indicators

You'll know it's working when:

1. **Build Logs**: Show successful npm install and build
2. **Health Checks**: Both services report healthy
3. **Live URL**: App is accessible via provided URL
4. **GitHub Integration**: Shows connected repository
5. **Auto-deploy**: Future pushes trigger automatic deployments

## 🚨 Troubleshooting

### Common Issues
- **GitHub Permission Denied**: Re-authorize DigitalOcean in GitHub settings
- **Build Failures**: Check package.json scripts exist
- **Port Conflicts**: Ensure unique ports for each service
- **Environment Variables**: Add required variables after deployment

### Next Steps After Success
1. Add production environment variables
2. Configure custom domain (optional)
3. Set up monitoring and alerts
4. Test the application functionality
5. Configure SSL certificate (automatic with DigitalOcean)

---

**The dashboard approach provides better GitHub integration management and clearer error visibility compared to CLI deployment.** 🎉