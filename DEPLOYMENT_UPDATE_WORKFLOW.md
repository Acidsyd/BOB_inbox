# GitHub to Production Deployment Workflow

## 🚀 Quick Deployment Commands (After Git Push)

```bash
# 1. SSH into your server
ssh -i ~/.ssh/qquadro_production root@104.131.93.55

# 2. Navigate to project directory
cd /var/www/mailsender

# 3. Pull latest changes from GitHub
git pull origin main

# 4. Install any new dependencies (if package.json changed)
cd backend && npm install
cd ../frontend && npm install

# 5. Build frontend (if frontend changed)
cd /var/www/mailsender/frontend
npm run build

# 6. Restart services
cd /var/www/mailsender
pm2 restart ecosystem.config.cjs

# 7. Verify deployment
pm2 status
pm2 logs --lines 20
```

## 📝 Step-by-Step Deployment Process

### Step 1: Push Changes to GitHub

```bash
# On your local machine
git add .
git commit -m "Your commit message"
git push origin main
```

### Step 2: Connect to Your Server

```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55
```

### Step 3: Pull Latest Changes

```bash
cd /var/www/mailsender
git pull origin main
```

**Note**: If you get permission errors, you may need to set up GitHub SSH keys on your server (see setup section below).

### Step 4: Handle Dependencies (If Needed)

Only run if `package.json` files were modified:

```bash
# Backend dependencies
cd /var/www/mailsender/backend
npm install

# Frontend dependencies  
cd /var/www/mailsender/frontend
npm install
```

### Step 5: Build Frontend (If Frontend Changed)

```bash
cd /var/www/mailsender/frontend
npm run build
```

### Step 6: Restart Services

```bash
cd /var/www/mailsender
pm2 restart ecosystem.config.cjs
```

### Step 7: Verify Deployment

```bash
# Check service status
pm2 status

# View logs for errors
pm2 logs --lines 30

# Test endpoints
curl http://localhost:4000/health
```

## 🔧 One-Time Server Setup for Git

### Option A: Using GitHub Deploy Keys (Recommended)

1. **Generate deploy key on server**:
```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55
ssh-keygen -t ed25519 -C "deploy@104.131.93.55" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub
```

2. **Add to GitHub**:
- Go to your repository on GitHub
- Settings → Deploy keys → Add deploy key
- Paste the public key
- Give it a name like "DigitalOcean Production Server"
- Allow write access if needed

3. **Configure Git on server**:
```bash
cd /var/www/mailsender
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO.git

# Configure SSH to use the deploy key
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
EOF
```

### Option B: Using Personal Access Token

1. **Create token on GitHub**:
- GitHub → Settings → Developer settings → Personal access tokens
- Generate new token with `repo` scope

2. **Configure on server**:
```bash
cd /var/www/mailsender
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git
```

## 🤖 Automated Deployment Script

Create this script on your server for one-command deployment:

```bash
# Create deployment script
cat > /var/www/mailsender/deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to project
cd /var/www/mailsender

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Check if package.json files changed
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
    echo "📦 Installing dependencies..."
    cd backend && npm install
    cd ../frontend && npm install
    cd ..
fi

# Check if frontend changed
if git diff HEAD@{1} --name-only | grep -q "frontend/"; then
    echo "🏗️ Building frontend..."
    cd frontend && npm run build
    cd ..
fi

# Restart services
echo "🔄 Restarting services..."
pm2 restart ecosystem.config.cjs

# Show status
echo "✅ Deployment complete!"
pm2 status

# Show recent logs
echo "📋 Recent logs:"
pm2 logs --lines 10
EOF

# Make it executable
chmod +x /var/www/mailsender/deploy.sh
```

**Usage**:
```bash
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "/var/www/mailsender/deploy.sh"
```

## 🚨 Important Considerations

### What Changes Require What Actions

| Change Type | Required Actions |
|------------|-----------------|
| Backend API routes | Pull + PM2 restart |
| Frontend components | Pull + Build + PM2 restart |
| Database migrations | Pull + Run migrations + PM2 restart |
| Environment variables | Update `.env` + PM2 restart |
| Package dependencies | Pull + npm install + PM2 restart |
| Static assets | Pull only |

### Environment Variables

If you add new environment variables:

1. **Update on server**:
```bash
nano /var/www/mailsender/backend/.env
# Add your new variables
```

2. **Restart backend**:
```bash
pm2 restart mailsender-backend
```

### Database Migrations

If you have database changes:

```bash
# On server after pulling
cd /var/www/mailsender/backend
node src/scripts/your-migration-script.js
```

## 🛡️ Safety Checks

### Before Deploying

1. **Test locally first**:
```bash
npm run dev
npm run test
```

2. **Check for sensitive data**:
- No API keys in code
- No passwords in commits
- `.env` files in `.gitignore`

### After Deploying

1. **Check services are running**:
```bash
pm2 status
```

2. **Check for errors**:
```bash
pm2 logs --lines 50 | grep ERROR
```

3. **Test main features**:
```bash
# Test backend
curl http://104.131.93.55:4000/health

# Test authentication
curl -X POST http://104.131.93.55:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

## 🔄 Rollback Process

If something goes wrong:

```bash
# On server
cd /var/www/mailsender

# Check git log
git log --oneline -5

# Rollback to previous commit
git reset --hard HEAD~1

# Or rollback to specific commit
git reset --hard COMMIT_HASH

# Rebuild if needed
cd frontend && npm run build && cd ..

# Restart services
pm2 restart ecosystem.config.cjs
```

## 📊 Monitoring After Deployment

```bash
# Real-time logs
pm2 logs

# Monitor resources
pm2 monit

# Check HTTP status
curl -I http://104.131.93.55:3000

# Check API health
curl http://104.131.93.55:4000/health
```

## 🎯 Quick One-Liner Deployment

After setting up the deployment script, you can deploy with:

```bash
# From your local machine after git push
ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "cd /var/www/mailsender && git pull && pm2 restart ecosystem.config.cjs"
```

## 📝 Deployment Checklist

- [ ] Tested changes locally
- [ ] Committed all changes
- [ ] Pushed to GitHub
- [ ] Pulled on server
- [ ] Installed new dependencies (if any)
- [ ] Built frontend (if changed)
- [ ] Updated environment variables (if needed)
- [ ] Run migrations (if any)
- [ ] Restarted PM2 services
- [ ] Verified services are running
- [ ] Tested main functionality
- [ ] Checked logs for errors

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Git pull fails | Check GitHub SSH keys or use token |
| PM2 not found | Run `npm install -g pm2` |
| Port already in use | `pm2 kill` then restart |
| Frontend not updating | Clear browser cache, check build |
| Backend errors | Check logs: `pm2 logs mailsender-backend` |
| Memory issues | `pm2 restart` to free memory |

---

**Remember**: Always backup your database and `.env` files before major deployments!