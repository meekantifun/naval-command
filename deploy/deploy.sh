#!/bin/bash
# Deployment Script for Naval Command
# Run this in the /var/www/naval-command directory

set -e

echo "🚀 Deploying Naval Command..."
echo "=============================="

# Install system dependencies for sharp (if not already installed)
echo "📦 Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    libglib2.0-dev \
    libexpat1-dev \
    librsvg2-dev \
    libpng-dev \
    libjpeg-dev \
    libgif-dev \
    libwebp-dev \
    libtiff-dev \
    libexif-dev \
    liblcms2-dev \
    libheif-dev \
    libfftw3-dev \
    libgsf-1-dev \
    liborc-0.4-dev \
    libpango1.0-dev \
    libcfitsio-dev \
    libmatio-dev \
    libopenexr-dev \
    libopenslide-dev \
    libpoppler-glib-dev \
    libmagickwand-dev

# Install node-gyp globally
sudo npm install -g node-gyp --silent

# Install bot dependencies
echo "📦 Installing bot dependencies..."
# Remove node_modules to force clean install (fixes platform-specific binaries like sharp)
rm -rf node_modules
npm install --production

# Try to use prebuilt sharp binaries first
echo "🔧 Installing sharp..."
if npm install sharp; then
    echo "✅ Sharp installed successfully with prebuilt binaries"
else
    echo "⚠️  Prebuilt binaries failed, building from source..."
    # Install build dependencies
    npm install --save-dev node-addon-api node-gyp
    # Build from source
    npm install --build-from-source sharp
fi

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
pm2 start bot.js --name "naval-bot" --max-memory-restart 500M --cwd /var/www/naval-command

# Start Web Server
pm2 start web-server/src/server.js --name "naval-web" --max-memory-restart 300M --cwd /var/www/naval-command/web-server

# Note: Frontend is served directly by Nginx from web-server/client/build

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (if not already setup)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || true

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
