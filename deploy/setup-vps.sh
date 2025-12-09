#!/bin/bash
# VPS Setup Script for Naval Command
# Run this script on your VPS after initial setup

set -e

echo "🚀 Naval Command VPS Setup Script"
echo "=================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install required tools
echo "📦 Installing required tools..."
sudo apt install -y nginx certbot python3-certbot-nginx git

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/naval-command
sudo chown $USER:$USER /var/www/naval-command

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your code to /var/www/naval-command"
echo "2. Copy .env.production to .env and configure it"
echo "3. Run the deployment script: ./deploy/deploy.sh"
echo "4. Configure Nginx: sudo cp deploy/nginx.conf /etc/nginx/sites-available/naval-command"
echo "5. Enable site: sudo ln -s /etc/nginx/sites-available/naval-command /etc/nginx/sites-enabled/"
echo "6. Setup SSL: sudo certbot --nginx -d naval-command.org -d www.naval-command.org"
