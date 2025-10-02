#!/bin/bash
# Emergency restart script for production server
# Run this on the server if services are down

set -e

echo "🚨 Emergency production restart..."

cd /var/www/mailsender

# Stop all services
echo "⏹️ Stopping services..."
pm2 stop all || true
pm2 delete all || true

# Check if we have the ecosystem config
if [ -f "ecosystem.config.cjs" ]; then
    echo "✅ Found ecosystem.config.cjs"
    CONFIG_FILE="ecosystem.config.cjs"
elif [ -f "ecosystem.config.js" ]; then
    echo "✅ Found ecosystem.config.js, renaming to .cjs"
    mv ecosystem.config.js ecosystem.config.cjs
    CONFIG_FILE="ecosystem.config.cjs"
else
    echo "❌ No ecosystem config found!"
    echo "Creating basic config..."
    cat > ecosystem.config.cjs << 'EOFCONFIG'
module.exports = {
  apps: [
    {
      name: 'mailsender-backend',
      script: './backend/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'mailsender-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
}
EOFCONFIG
    CONFIG_FILE="ecosystem.config.cjs"
fi

# Start services
echo "🚀 Starting services with PM2..."
pm2 start $CONFIG_FILE

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Show status
echo ""
echo "📊 Service status:"
pm2 status

# Health checks
echo ""
echo "🔍 Health checks:"
echo "Backend (port 4000):"
curl -f http://localhost:4000/health || echo "❌ Backend health check failed"

echo ""
echo "Frontend (port 3001):"
curl -f http://localhost:3001 || echo "❌ Frontend health check failed"

# Restart nginx
echo ""
echo "🔄 Restarting nginx..."
systemctl restart nginx || echo "⚠️ Nginx restart failed"

echo ""
echo "✅ Recovery complete!"
echo ""
echo "📝 Next steps:"
echo "  - Check if services are running: pm2 status"
echo "  - View logs: pm2 logs"
echo "  - Check nginx: systemctl status nginx"
