#!/bin/bash

# DigitalOcean MCP Server Setup Script
# This script configures the DigitalOcean MCP server for Claude Code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

echo "🚀 DigitalOcean MCP Server Setup"
echo "================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    error "Node.js is required but not installed. Please install Node.js ≥ 12"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
log "Node.js version: $NODE_VERSION"

# Check if DigitalOcean MCP package is available
log "🔍 Testing DigitalOcean MCP server availability..."
if npx --yes @digitalocean/mcp --help > /dev/null 2>&1; then
    success "DigitalOcean MCP server is available"
else
    error "Failed to access DigitalOcean MCP server"
    exit 1
fi

# Check for API token
log "🔐 Checking DigitalOcean API token configuration..."

if [ -f ".env.digitalocean" ]; then
    source .env.digitalocean
    if [ -z "$DIGITALOCEAN_API_TOKEN" ] || [ "$DIGITALOCEAN_API_TOKEN" = "your_digitalocean_api_token_here" ]; then
        warning "DigitalOcean API token not configured"
        echo ""
        echo "📝 To configure your DigitalOcean API token:"
        echo "1. Go to: https://cloud.digitalocean.com/account/api/tokens"
        echo "2. Click 'Generate New Token'"
        echo "3. Name: claude-code-mcp-server"
        echo "4. Select scopes: Read (all), Write (App Platform, Droplets, Databases)"
        echo "5. Copy the token and edit .env.digitalocean file"
        echo "6. Replace 'your_digitalocean_api_token_here' with your actual token"
        echo ""
    else
        success "DigitalOcean API token configured (${DIGITALOCEAN_API_TOKEN:0:8}...)"
    fi
else
    error ".env.digitalocean file not found"
    exit 1
fi

# Available services
log "📋 Available DigitalOcean MCP services:"
cat << 'EOF'
• apps - App Platform applications management
• deployments - Application deployment handling
• logs - Application logs retrieval
• infrastructure - Regions and instance sizes
• alerts - Application alerts management
• rollbacks - Deployment rollback operations
• metrics - Bandwidth and performance metrics
• droplets - Droplet management (if token has access)
• databases - Database management (if token has access)
• networking - Network resources (if token has access)
EOF

echo ""
log "🔧 Configuration options for Claude Code:"

echo ""
echo "Option 1: All services (recommended for full access)"
echo "claude mcp add digitalocean -e DIGITALOCEAN_API_TOKEN=\$DIGITALOCEAN_API_TOKEN -- npx -y @digitalocean/mcp"

echo ""
echo "Option 2: App Platform only (minimal for app deployment)"
echo "claude mcp add digitalocean -e DIGITALOCEAN_API_TOKEN=\$DIGITALOCEAN_API_TOKEN -- npx -y @digitalocean/mcp --services apps"

echo ""
echo "Option 3: Apps and infrastructure (recommended for deployment automation)"
echo "claude mcp add digitalocean -e DIGITALOCEAN_API_TOKEN=\$DIGITALOCEAN_API_TOKEN -- npx -y @digitalocean/mcp --services apps,infrastructure,deployments,logs"

echo ""
log "🚀 Ready to configure DigitalOcean MCP!"
echo ""
echo "Next steps:"
echo "1. Configure your API token in .env.digitalocean"
echo "2. Choose a configuration option above"
echo "3. Run the claude mcp add command"
echo "4. Test with: claude mcp list"
echo ""
success "Setup script completed!"