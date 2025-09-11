#!/bin/bash

# DigitalOcean GitHub Integration Setup
# This script helps connect your GitHub repository to DigitalOcean App Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Repository Configuration
REPO_OWNER="Acidsyd"
REPO_NAME="BOB_inbox"
REPO_URL="https://github.com/$REPO_OWNER/$REPO_NAME"
APP_NAME="mailsender"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

mcp_command() {
    echo -e "${PURPLE}[MCP COMMAND]${NC} $1"
}

echo "🚀 DigitalOcean GitHub Integration Setup"
echo "========================================"
echo "Repository: $REPO_URL"
echo "App Name: $APP_NAME"
echo ""

# Step 1: Check current DigitalOcean apps
log "📋 Step 1: Checking existing DigitalOcean apps"
echo ""
mcp_command "/mcp digitalocean list_apps"
echo ""
echo "This command will show you all existing apps in your DigitalOcean account."
echo "Please run this command in Claude Code CLI and note if you already have a 'mailsender' app."
echo ""
read -p "Press Enter after running the command above..."

# Step 2: Check if app exists
echo ""
log "🔍 Step 2: Do you have an existing 'mailsender' app?"
echo ""
echo "Options:"
echo "1. Yes - I have an existing 'mailsender' app"
echo "2. No - I need to create a new app"
echo ""
read -p "Enter your choice (1 or 2): " APP_CHOICE

if [ "$APP_CHOICE" = "1" ]; then
    # Update existing app
    log "🔄 Updating existing app with GitHub connection"
    echo ""
    echo "To update your existing app to connect to GitHub:"
    echo ""
    mcp_command "/mcp digitalocean get_app name:mailsender"
    echo ""
    echo "This will show your current app configuration."
    echo ""
    read -p "Press Enter after checking your app details..."
    
else
    # Create new app
    log "🆕 Creating new DigitalOcean app"
    echo ""
    echo "We'll create a new app connected to your GitHub repository."
fi

# Step 3: App Configuration
echo ""
log "📝 Step 3: App Configuration Details"
echo ""
echo "Repository Details:"
echo "  📁 Owner: $REPO_OWNER"
echo "  📂 Repository: $REPO_NAME"
echo "  🌐 URL: $REPO_URL"
echo "  🌿 Branch: main"
echo "  📁 Root Directory: / (repository root)"
echo ""

# Step 4: App Specification
log "🔧 Step 4: Creating App Specification"
echo ""

cat > /tmp/digitalocean-app-spec.yaml << EOF
name: $APP_NAME
services:
- name: backend
  source_dir: backend
  github:
    repo: $REPO_OWNER/$REPO_NAME
    branch: main
    deploy_on_push: true
  run_command: npm start
  build_command: npm install && npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 4000
  health_check:
    http_path: /health
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "4000"

- name: frontend
  source_dir: frontend
  github:
    repo: $REPO_OWNER/$REPO_NAME
    branch: main
    deploy_on_push: true
  run_command: npm start
  build_command: npm install && npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 3001
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3001"
  - key: NEXT_PUBLIC_API_URL
    value: \${backend.PUBLIC_URL}

databases:
- name: mailsender-db
  engine: PG
  version: "15"
  size: db-s-dev-database

static_sites: []
EOF

success "App specification created at /tmp/digitalocean-app-spec.yaml"

# Step 5: Environment Variables
echo ""
log "🔐 Step 5: Environment Variables Setup"
echo ""
echo "Your app will need these environment variables:"
echo ""
echo "Backend Environment Variables:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_KEY"  
echo "  - JWT_SECRET"
echo "  - EMAIL_ENCRYPTION_KEY"
echo "  - GOOGLE_OAUTH2_CLIENT_ID"
echo "  - GOOGLE_OAUTH2_CLIENT_SECRET"
echo "  - GOOGLE_OAUTH2_REDIRECT_URI"
echo ""
echo "Frontend Environment Variables:"
echo "  - NEXT_PUBLIC_API_URL (will be set automatically)"
echo ""

# Step 6: Create the app
echo ""
log "🚀 Step 6: Creating/Updating DigitalOcean App"
echo ""

if [ "$APP_CHOICE" = "1" ]; then
    echo "To update your existing app with GitHub integration:"
    echo ""
    mcp_command "/mcp digitalocean update_app name:mailsender spec_file:/tmp/digitalocean-app-spec.yaml"
    
else
    echo "To create a new app with GitHub integration:"
    echo ""
    mcp_command "/mcp digitalocean create_app spec_file:/tmp/digitalocean-app-spec.yaml"
fi

echo ""
echo "This command will:"
echo "  ✅ Connect your GitHub repository"
echo "  ✅ Set up automatic deployments on push"
echo "  ✅ Configure both frontend and backend services"
echo "  ✅ Set up proper routing and health checks"
echo "  ✅ Create a PostgreSQL database"
echo ""

# Step 7: GitHub Permissions
echo ""
log "📝 Step 7: GitHub Permissions"
echo ""
echo "DigitalOcean will need access to your GitHub repository."
echo "When prompted:"
echo "  1. Authorize DigitalOcean to access your GitHub account"
echo "  2. Grant access to the $REPO_OWNER/$REPO_NAME repository"
echo "  3. Allow deploy key installation"
echo ""

# Step 8: Post-deployment steps
echo ""
log "⚙️ Step 8: Post-Deployment Configuration"
echo ""
echo "After the app is created, you'll need to:"
echo ""
echo "1. Add environment variables:"
mcp_command "/mcp digitalocean update_app name:mailsender envs:backend:SUPABASE_URL=your_supabase_url"

echo ""
echo "2. Configure domain (optional):"
mcp_command "/mcp digitalocean add_domain app:mailsender domain:yourdomain.com"

echo ""
echo "3. Monitor deployment:"
mcp_command "/mcp digitalocean get_logs app:mailsender service:backend"

# Step 9: Verification
echo ""
log "✅ Step 9: Verification Commands"
echo ""
echo "After setup, verify everything is working:"
echo ""
echo "Check app status:"
mcp_command "/mcp digitalocean get_app name:mailsender"

echo ""
echo "Check deployments:"
mcp_command "/mcp digitalocean list_deployments app:mailsender"

echo ""
echo "Monitor logs:"
mcp_command "/mcp digitalocean get_logs app:mailsender service:backend"
mcp_command "/mcp digitalocean get_logs app:mailsender service:frontend"

echo ""
echo "🎯 Quick Commands Reference:"
echo "=========================="
echo ""
echo "List apps:"
echo "  /mcp digitalocean list_apps"
echo ""
echo "Get app details:"
echo "  /mcp digitalocean get_app name:mailsender"
echo ""
echo "Create deployment:"
echo "  /mcp digitalocean create_deployment app:mailsender"
echo ""
echo "Check logs:"
echo "  /mcp digitalocean get_logs app:mailsender service:backend"
echo ""
echo "Update environment variables:"
echo "  /mcp digitalocean update_app name:mailsender envs:backend:KEY=value"
echo ""

success "🚀 DigitalOcean GitHub Integration Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo "1. Run the MCP commands provided above in Claude Code CLI"
echo "2. Configure your environment variables"
echo "3. Test your deployment"
echo "4. Set up monitoring and alerts"
echo ""
echo "🔗 Useful Links:"
echo "  📊 DigitalOcean Dashboard: https://cloud.digitalocean.com/apps"
echo "  🐙 GitHub Repository: $REPO_URL"
echo "  📚 App Platform Docs: https://docs.digitalocean.com/products/app-platform/"