#!/bin/bash
# Deployment Script for Naval Command
# Run this in the /var/www/naval-command directory

set -e

echo "🚀 Deploying Naval Command..."
echo "=============================="

# Install bot dependencies
echo "📦 Installing bot dependencies..."
# Remove node_modules to force clean install (fixes platform-specific binaries like sharp)
rm -rf node_modules
npm install --production

# Rebuild native modules for the current platform
echo "🔧 Rebuilding native modules for Linux..."
npm rebuild sharp --verbose

# Install web server dependencies
echo "📦 Installing web server dependencies..."
cd web-server
rm -rf node_modules
npm install --production

# Install frontend dependencies and build
echo "📦 Building frontend..."
cd client
rm -rf node_modules
npm install
npm run build
cd ../..

# Stop existing PM2 processes (if any)
echo "🛑 Stopping existing processes..."
pm2 stop all || true
pm2 delete all || true

# Start services with PM2
echo "🚀 Starting services..."

# Start Discord Bot with API
pm2 start bot.js --name "naval-bot" --max-memory-restart 500M

# Start Web Server
pm2 start web-server/src/server.js --name "naval-web" --max-memory-restart 300M

# Serve frontend build with a simple static server
cd web-server/client
pm2 serve build 3000 --name "naval-frontend" --spa

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Running services:"
pm2 status
echo ""
echo "To view logs:"
echo "  pm2 logs naval-bot"
echo "  pm2 logs naval-web"
echo "  pm2 logs naval-frontend"
