# DigitalOcean Deployment Troubleshooting

## ✅ Issues Fixed

### 1. CLI Column Format Error
**Error**: `unknown column "Name"`
**Cause**: DigitalOcean CLI expects lowercase column names
**Fix**: ✅ Updated script to use lowercase format names

```bash
# ❌ Wrong
doctl apps list --format Name

# ✅ Correct  
doctl apps list --format name
```

### 2. Route Conflict Error
**Error**: `rule matching path prefix "/" already in use`
**Cause**: Both frontend and backend trying to handle root path
**Fix**: ✅ Updated `.do/app.yaml` with proper route separation

```yaml
# Backend handles API routes
- name: backend
  routes:
  - path: /api
  - path: /health

# Frontend handles everything else
- name: frontend  
  routes:
  - path: /
```

## 🚀 Ready to Deploy

Both issues are now resolved! You can deploy using:

```bash
./scripts/deploy-to-digitalocean.sh
```

## Common Deployment Issues & Solutions

### Build Failures
- **Check package.json scripts**: Ensure `npm start` and `npm run build` exist
- **Environment variables**: Add required env vars in DigitalOcean dashboard
- **Dependencies**: Verify all dependencies in package.json

### Health Check Failures
- **Backend**: Ensure `/health` endpoint exists and returns 200
- **Frontend**: Verify app starts and serves content on configured port

### GitHub Integration Issues
- **Repository access**: DigitalOcean needs access to `Acidsyd/BOB_inbox`
- **Branch**: Ensure `main` branch exists and has latest code
- **Deploy keys**: DigitalOcean will create deploy keys automatically

### Environment Variables Needed
Add these in DigitalOcean dashboard after deployment:

```
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
JWT_SECRET=your_jwt_secret_here
EMAIL_ENCRYPTION_KEY=your_email_encryption_key_here
GOOGLE_OAUTH2_CLIENT_ID=your_google_oauth2_client_id_here
GOOGLE_OAUTH2_CLIENT_SECRET=your_google_oauth2_client_secret_here
GOOGLE_OAUTH2_REDIRECT_URI=https://your-app-url.ondigitalocean.app/api/oauth2/auth/callback
```

## Monitoring Commands

```bash
# Check app status
doctl apps get mailsender

# View build logs
doctl apps logs mailsender --type build --component backend
doctl apps logs mailsender --type build --component frontend

# View runtime logs  
doctl apps logs mailsender --type run --component backend
doctl apps logs mailsender --type run --component frontend

# Follow live logs
doctl apps logs mailsender --follow
```

---

Your GitHub-DigitalOcean integration is now fully configured and ready to deploy! 🎉