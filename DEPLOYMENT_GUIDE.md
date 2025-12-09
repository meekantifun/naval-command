# Naval Command - Production Deployment Guide

This guide will walk you through deploying Naval Command to a VPS and making it accessible at navalcommand.com.

## Prerequisites Checklist

- [ ] Domain name purchased (e.g., navalcommand.com)
- [ ] VPS account created (DigitalOcean, Linode, etc.)
- [ ] Discord Bot Token
- [ ] Discord OAuth Application configured

---

## Step 1: Purchase Domain Name

### Option A: Cloudflare ($10/year) - Recommended
1. Go to https://www.cloudflare.com/products/registrar/
2. Search for "navalcommand.com"
3. Complete purchase
4. Keep the Cloudflare dashboard open - you'll need it for DNS configuration

### Option B: Namecheap ($10-15/year)
1. Go to https://www.namecheap.com
2. Search for and purchase your domain
3. You'll configure DNS later

---

## Step 2: Setup Discord OAuth for Production

1. Go to https://discord.com/developers/applications
2. Select your Naval Command application
3. Go to **OAuth2** → **General**
4. Add redirect URL: `https://navalcommand.com/auth/discord/callback`
5. Save changes
6. Keep your Client ID and Client Secret handy

---

## Step 3: Create VPS

### DigitalOcean (Recommended for beginners)

1. Sign up at https://www.digitalocean.com
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($12/month for 2GB RAM recommended)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH key (recommended) or password
3. Click **Create Droplet**
4. Note your server's IP address (e.g., 123.45.67.89)

### Alternative VPS Providers

- **Linode**: https://www.linode.com (similar pricing and features)
- **Vultr**: https://www.vultr.com (starts at $6/month)
- **Oracle Cloud**: https://www.oracle.com/cloud/free/ (free tier available)

---

## Step 4: Configure DNS

Point your domain to your VPS:

### If using Cloudflare:
1. Go to your domain in Cloudflare dashboard
2. Click **DNS** → **Records**
3. Add two A records:
   - **Type**: A, **Name**: `@`, **Content**: `YOUR_VPS_IP`, **Proxy status**: Proxied
   - **Type**: A, **Name**: `www`, **Content**: `YOUR_VPS_IP`, **Proxy status**: Proxied

### If using Namecheap:
1. Log into Namecheap
2. Click **Domain List** → Select your domain → **Manage**
3. Go to **Advanced DNS** tab
4. Add two A records:
   - **Type**: A Record, **Host**: `@`, **Value**: `YOUR_VPS_IP`, **TTL**: Automatic
   - **Type**: A Record, **Host**: `www`, **Value**: `YOUR_VPS_IP`, **TTL**: Automatic

**Wait 5-30 minutes for DNS to propagate.**

---

## Step 5: Connect to Your VPS

### Windows (using PuTTY):
1. Download PuTTY from https://www.putty.org/
2. Open PuTTY
3. Enter your VPS IP address
4. Click **Open**
5. Login as `root` (or the user you created)

### Mac/Linux (using Terminal):
```bash
ssh root@YOUR_VPS_IP
```

---

## Step 6: Setup VPS Environment

Once connected to your VPS, run these commands:

```bash
# Run the automated setup script
curl -o setup-vps.sh https://raw.githubusercontent.com/YOUR_REPO/deploy/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

**Or manually run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install required tools
sudo apt install -y nginx certbot python3-certbot-nginx git

# Install PM2 for process management
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/naval-command
sudo chown $USER:$USER /var/www/naval-command
```

---

## Step 7: Upload Your Code to VPS

### Option A: Using Git (Recommended)

1. **On your local machine**, create a GitHub repository and push your code:
```bash
cd "C:\Users\Chris\Desktop\Naval Command"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/naval-command.git
git push -u origin main
```

2. **On your VPS**, clone the repository:
```bash
cd /var/www/naval-command
git clone https://github.com/YOUR_USERNAME/naval-command.git .
```

### Option B: Using SCP (Direct file transfer)

**From your local machine (Windows PowerShell):**
```powershell
scp -r "C:\Users\Chris\Desktop\Naval Command\*" root@YOUR_VPS_IP:/var/www/naval-command/
```

---

## Step 8: Configure Environment Variables

On your VPS, create the production .env file:

```bash
cd /var/www/naval-command
nano .env
```

Copy this template and fill in your values:

```env
# Discord Bot Token
DISCORD_TOKEN=YOUR_DISCORD_TOKEN_HERE

# Website Configuration
BOT_API_PORT=3002
BOT_API_KEY=YOUR_SECURE_RANDOM_API_KEY_HERE
WEB_SERVER_URL=http://localhost:3001

# Discord OAuth
DISCORD_CLIENT_ID=YOUR_CLIENT_ID_HERE
DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
DISCORD_CALLBACK_URL=https://navalcommand.com/auth/discord/callback

# Frontend URL
FRONTEND_URL=https://navalcommand.com

# Session Secret (generate a random string)
SESSION_SECRET=YOUR_SECURE_RANDOM_SESSION_SECRET_HERE

# Status Channel Configuration
STATUS_CHANNEL_ID=YOUR_CHANNEL_ID_HERE

# Production settings
NODE_ENV=production
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

Also create web-server/.env:
```bash
cp .env web-server/.env
```

---

## Step 9: Deploy the Application

```bash
cd /var/www/naval-command
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

This will:
- Install all dependencies
- Build the React frontend
- Start all services with PM2

---

## Step 10: Configure Nginx Reverse Proxy

```bash
# Copy Nginx configuration
sudo cp deploy/nginx.conf /etc/nginx/sites-available/navalcommand

# Enable the site
sudo ln -s /etc/nginx/sites-available/navalcommand /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 11: Setup SSL Certificate (HTTPS)

```bash
# Get free SSL certificate from Let's Encrypt
sudo certbot --nginx -d navalcommand.com -d www.navalcommand.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose option 2: Redirect HTTP to HTTPS
```

**Certbot will automatically renew your certificate every 90 days.**

---

## Step 12: Open Firewall Ports

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH (keep this open!)
sudo ufw enable
```

---

## Step 13: Test Your Website

1. Open your browser and go to **https://navalcommand.com**
2. You should see your Naval Command website
3. Try logging in with Discord
4. Check that games load properly

---

## Maintenance & Monitoring

### View Logs
```bash
# Bot logs
pm2 logs naval-bot

# Web server logs
pm2 logs naval-web

# Frontend logs
pm2 logs naval-frontend

# All logs
pm2 logs
```

### Restart Services
```bash
# Restart specific service
pm2 restart naval-bot

# Restart all
pm2 restart all
```

### Update Code
```bash
cd /var/www/naval-command
git pull
./deploy/deploy.sh
```

### Monitor Resource Usage
```bash
pm2 monit
```

---

## Troubleshooting

### Website not loading
1. Check DNS propagation: https://dnschecker.org
2. Verify Nginx is running: `sudo systemctl status nginx`
3. Check PM2 services: `pm2 status`
4. View logs: `pm2 logs`

### SSL certificate issues
```bash
# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### "Cannot connect to bot" error
1. Check bot is running: `pm2 status`
2. Verify .env configuration
3. Check bot logs: `pm2 logs naval-bot`

---

## Security Best Practices

1. **Change default SSH port** (optional but recommended)
2. **Setup SSH key authentication** (disable password login)
3. **Enable automatic security updates**:
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```
4. **Keep your environment variables secret** - never commit them to Git
5. **Regular backups** of your player data and configuration

---

## Cost Estimate

| Item | Cost |
|------|------|
| Domain (Cloudflare) | $10/year |
| VPS (DigitalOcean 2GB) | $12/month |
| SSL Certificate | Free (Let's Encrypt) |
| **Total** | **~$154/year** |

---

## Need Help?

If you encounter issues during deployment:
1. Check the logs: `pm2 logs`
2. Verify all environment variables are set correctly
3. Make sure DNS has propagated
4. Ensure firewall ports are open

---

**Congratulations! Your Naval Command bot is now live on the internet! 🎉**
