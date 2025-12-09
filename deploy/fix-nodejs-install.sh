#!/bin/bash
# Fix Node.js installation conflict on Ubuntu
# Run this if you get dpkg errors during Node.js installation

echo "🔧 Fixing Node.js installation conflict..."

# Remove existing Node.js packages
echo "📦 Removing old Node.js packages..."
sudo apt remove -y nodejs libnode72 libnode-dev
sudo apt autoremove -y

# Clean up any leftover configuration
sudo apt clean
sudo apt autoclean

# Clear dpkg cache if there are issues
sudo rm -f /var/cache/apt/archives/nodejs*.deb

# Now reinstall Node.js 18 from NodeSource
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt update
sudo apt install -y nodejs

# Verify installation
echo ""
echo "✅ Node.js installation:"
node --version
npm --version

echo ""
echo "✅ Node.js installation fixed!"
