#!/bin/bash

# Git MCP Enhanced Deployment Script
# This script uses Git MCP tools for intelligent deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DEPLOY_HOST=${DEPLOY_HOST:-"your-droplet-ip"}
DEPLOY_USER=${DEPLOY_USER:-"root"}
APP_DIR="/var/www/mailsender"
DEPLOYMENT_ID="deploy-$(date +%s)"

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

# Function to run Git MCP commands
run_git_mcp() {
    local command="$1"
    local params="$2"
    
    log "Running Git MCP: $command"
    
    # Here you would integrate with actual MCP Git tools
    # For demonstration, we'll use regular git commands
    case "$command" in
        "check_status")
            if ! git diff-index --quiet HEAD --; then
                error "Repository has uncommitted changes"
                return 1
            fi
            ;;
        "create_tag")
            local tag_name="deploy-$(date +%Y%m%d-%H%M%S)"
            git tag -a "$tag_name" -m "Deployment $DEPLOYMENT_ID"
            git push origin "$tag_name"
            echo "$tag_name"
            ;;
        "get_commit")
            git rev-parse HEAD
            ;;
        *)
            log "Unknown Git MCP command: $command"
            ;;
    esac
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a Git repository"
        exit 1
    fi
    
    # Check if we're on main branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        error "Deployment only allowed from main branch. Current: $current_branch"
        exit 1
    fi
    
    # Check for uncommitted changes using MCP
    if ! run_git_mcp "check_status"; then
        exit 1
    fi
    
    # Verify environment variables
    if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
        error "DEPLOY_HOST and DEPLOY_USER must be set"
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# Create deployment tag
create_deployment_tag() {
    log "🏷️ Creating deployment tag..."
    
    DEPLOYMENT_TAG=$(run_git_mcp "create_tag")
    
    if [ $? -eq 0 ]; then
        success "Created deployment tag: $DEPLOYMENT_TAG"
    else
        error "Failed to create deployment tag"
        exit 1
    fi
}

# Deploy to server
deploy_to_server() {
    log "🚢 Deploying to server: $DEPLOY_HOST"
    
    # Create deployment script for server
    cat > /tmp/deploy_script.sh << EOF
#!/bin/bash
set -e

echo "🚀 Starting server deployment..."

# Navigate to app directory
cd $APP_DIR || { echo "❌ App directory not found"; exit 1; }

# Stop services
echo "⏹️ Stopping services..."
pm2 stop all || true

# Create backup
echo "💾 Creating backup..."
mkdir -p /var/backups/mailsender
cp -r . "/var/backups/mailsender/backup-$DEPLOYMENT_ID" || true

# Pull latest code
echo "📥 Pulling latest code..."
git fetch --all --tags
git checkout $DEPLOYMENT_TAG

# Install dependencies and build
echo "🔨 Building application..."
npm run setup
npm run build

# Start services
echo "🚀 Starting services..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# Wait for services to start
sleep 15

# Health check
echo "🔍 Running health check..."
curl -f http://localhost:4000/health || { echo "❌ Backend health check failed"; exit 1; }
curl -f http://localhost:3001 || { echo "❌ Frontend health check failed"; exit 1; }

echo "✅ Server deployment completed successfully!"
EOF

    # Copy and execute deployment script
    scp -o StrictHostKeyChecking=no /tmp/deploy_script.sh "$DEPLOY_USER@$DEPLOY_HOST:/tmp/"
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" "chmod +x /tmp/deploy_script.sh && /tmp/deploy_script.sh"
    
    # Cleanup
    rm /tmp/deploy_script.sh
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" "rm /tmp/deploy_script.sh"
    
    success "Deployment to server completed"
}

# Post-deployment validation
post_deployment_validation() {
    log "🔍 Running post-deployment validation..."
    
    # Test external connectivity
    if curl -f -s "http://$DEPLOY_HOST" > /dev/null; then
        success "External connectivity test passed"
    else
        warning "External connectivity test failed (might be normal for IP-only setup)"
    fi
    
    # Check service status on server
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" "pm2 status"
    
    success "Post-deployment validation completed"
}

# Record deployment
record_deployment() {
    log "📝 Recording deployment..."
    
    # Create deployment record directory
    mkdir -p deployment-records
    
    # Get commit hash using MCP
    COMMIT_HASH=$(run_git_mcp "get_commit")
    
    # Create deployment record
    cat > "deployment-records/$DEPLOYMENT_ID.json" << EOF
{
  "id": "$DEPLOYMENT_ID",
  "tag": "$DEPLOYMENT_TAG",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "$COMMIT_HASH",
  "branch": "main",
  "status": "success",
  "host": "$DEPLOY_HOST",
  "user": "$DEPLOY_USER"
}
EOF
    
    # Commit deployment record using MCP
    git add "deployment-records/$DEPLOYMENT_ID.json"
    git commit -m "chore: record deployment $DEPLOYMENT_ID"
    git push origin main
    
    success "Deployment recorded: deployment-records/$DEPLOYMENT_ID.json"
}

# Rollback function
rollback_deployment() {
    local backup_id="$1"
    
    warning "🔄 Rolling back deployment..."
    
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" << EOF
set -e
cd $APP_DIR

# Stop services
pm2 stop all || true

# Restore from backup
if [ -d "/var/backups/mailsender/backup-$backup_id" ]; then
    echo "📦 Restoring from backup..."
    rm -rf * .* 2>/dev/null || true
    cp -r "/var/backups/mailsender/backup-$backup_id/"* .
    
    # Restart services
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    
    echo "✅ Rollback completed"
else
    echo "❌ No backup found for rollback"
    exit 1
fi
EOF
    
    success "Rollback completed"
}

# Main deployment flow
main() {
    log "🚀 Starting Git MCP Enhanced Deployment: $DEPLOYMENT_ID"
    
    # Trap errors for cleanup
    trap 'error "Deployment failed!"; exit 1' ERR
    
    pre_deployment_checks
    create_deployment_tag
    deploy_to_server
    post_deployment_validation
    record_deployment
    
    success "🎉 Deployment $DEPLOYMENT_ID completed successfully!"
    log "📊 Deployment tag: $DEPLOYMENT_TAG"
    log "🌐 Application URL: http://$DEPLOY_HOST"
    log "📝 Record: deployment-records/$DEPLOYMENT_ID.json"
}

# Handle command line arguments
case "${1:-}" in
    "rollback")
        if [ -z "$2" ]; then
            error "Usage: $0 rollback <deployment-id>"
            exit 1
        fi
        rollback_deployment "$2"
        ;;
    "deploy"|"")
        main
        ;;
    *)
        error "Usage: $0 [deploy|rollback <deployment-id>]"
        exit 1
        ;;
esac