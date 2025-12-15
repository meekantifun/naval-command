#!/bin/bash
# Quick fix for sharp module on Linux VPS
# Run this if you get "Could not load the sharp module" error

set -e

echo "🔧 Fixing sharp module for Linux..."
echo "This will build sharp from source for older CPUs"
echo ""

cd /var/www/naval-command

# Install system build tools if not already installed
echo "📦 Installing system build tools (if needed)..."
sudo apt-get update
sudo apt-get install -y build-essential python3 pkg-config libvips-dev

# Install node-gyp globally if not present
echo "📦 Installing node-gyp..."
sudo npm install -g node-gyp

# Install build dependencies
echo "📦 Installing build dependencies..."
npm install --save-dev node-addon-api node-gyp

# Remove sharp and reinstall from source
echo "🗑️  Removing existing sharp module..."
npm uninstall sharp || true

echo "🔨 Building sharp from source (this may take a few minutes)..."
npm install --build-from-source sharp

# Restart the bot
echo "🔄 Restarting bot..."
pm2 restart naval-bot

echo ""
echo "✅ Done! Check bot status:"
pm2 logs naval-bot --lines 20
