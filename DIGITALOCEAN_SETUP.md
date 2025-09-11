# DigitalOcean App Platform Setup Guide

## 🚀 Complete GitHub Integration

Your repository is now configured for DigitalOcean App Platform deployment with automatic GitHub integration.

### What's Been Configured

✅ **App Specification Created** (`.do/app.yaml`)
- Backend service: `backend/` directory, port 4000
- Frontend service: `frontend/` directory, port 3001  
- GitHub repository: `Acidsyd/BOB_inbox`
- Auto-deploy on push to `main` branch
- Health checks and environment variables configured

✅ **Deployment Scripts Ready**
- Manual deployment: `scripts/deploy-to-digitalocean.sh`
- Interactive setup: `scripts/setup-digitalocean-github-integration.sh`
- Quick commands reference: `scripts/digitalocean-quick-commands.md`

### Option 1: Using DigitalOcean CLI (Recommended)

#### 1. Install DigitalOcean CLI
```bash
# macOS
brew install doctl

# Linux
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin
```

#### 2. Authenticate
```bash
doctl auth init
# Enter your DigitalOcean API token when prompted
```

#### 3. Deploy Your App
```bash
# Run the deployment script
./scripts/deploy-to-digitalocean.sh

# Or manually create the app
doctl apps create --spec .do/app.yaml
```

#### 4. Monitor Deployment
```bash
# Check app status
doctl apps get mailsender

# Follow logs
doctl apps logs mailsender --follow

# View deployments
doctl apps list-deployments mailsender
```

### Option 2: Using DigitalOcean Dashboard

#### 1. Go to DigitalOcean Dashboard
- Navigate to: https://cloud.digitalocean.com/apps

#### 2. Create New App
- Click "Create App"
- Choose "GitHub" as source
- Select repository: `Acidsyd/BOB_inbox`
- Branch: `main`
- Auto-deploy: ✅ Enabled

#### 3. Configure Services

**Backend Service:**
- Source Directory: `backend`
- Run Command: `npm start`
- Build Command: `npm ci && npm run build`
- HTTP Port: `4000`
- Health Check Path: `/health`

**Frontend Service:**
- Source Directory: `frontend`  
- Run Command: `npm start`
- Build Command: `npm ci && npm run build`
- HTTP Port: `3001`
- Routes: `/` (catchall)

#### 4. Environment Variables

Add these environment variables in the DigitalOcean dashboard:

**Backend Variables:**
```
NODE_ENV=production
PORT=4000
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
JWT_SECRET=your_jwt_secret_here
EMAIL_ENCRYPTION_KEY=your_email_encryption_key_here
GOOGLE_OAUTH2_CLIENT_ID=your_google_oauth2_client_id_here
GOOGLE_OAUTH2_CLIENT_SECRET=your_google_oauth2_client_secret_here
GOOGLE_OAUTH2_REDIRECT_URI=https://your-app-url.ondigitalocean.app/api/oauth2/auth/callback
```

**Frontend Variables:**
```
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=${backend.PUBLIC_URL}
```

### Deployment Flow

Once configured, your deployment flow will be:

1. **Push to GitHub** → Automatic deployment triggered
2. **DigitalOcean** builds both services from source directories
3. **Health checks** ensure services are running
4. **Traffic** routed to your app URL

### Monitoring & Troubleshooting

#### Check App Status
```bash
doctl apps get mailsender --format "Name,DefaultIngress,LiveURL,Phase,CreatedAt"
```

#### View Logs
```bash
# Backend logs
doctl apps logs mailsender --type build --component backend
doctl apps logs mailsender --type run --component backend

# Frontend logs  
doctl apps logs mailsender --type build --component frontend
doctl apps logs mailsender --type run --component frontend
```

#### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check `package.json` scripts and dependencies |
| Health check fails | Ensure `/health` endpoint exists in backend |
| Environment variables missing | Add them in DigitalOcean dashboard |
| GitHub permissions | Authorize DigitalOcean to access your repository |

### Next Steps

1. **Deploy the app** using one of the methods above
2. **Configure environment variables** with your actual values
3. **Test the deployment** by accessing your app URL
4. **Set up monitoring** and alerts for production

### Useful Links

- 📊 **DigitalOcean Dashboard**: https://cloud.digitalocean.com/apps
- 🐙 **GitHub Repository**: https://github.com/Acidsyd/BOB_inbox
- 📚 **App Platform Docs**: https://docs.digitalocean.com/products/app-platform/
- 🔧 **CLI Reference**: https://docs.digitalocean.com/reference/doctl/

---

Your GitHub repository is now fully configured for automatic deployment to DigitalOcean App Platform! 🎉