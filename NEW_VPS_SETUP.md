# New VPS Setup Guide

Your new VPS: **198.46.174.142** (40GB storage)

## Step 1: Update DNS Records

Go to your Cloudflare dashboard (or wherever you manage naval-command.com DNS):

1. Find the **A record** for `naval-command.com`
2. Update the IP address to: **198.46.174.142**
3. Also update the **A record** for `www.naval-command.com` (if it exists)
4. Save changes

**Wait 5-10 minutes** for DNS to propagate.

## Step 2: SSH into New VPS

```bash
ssh root@198.46.174.142
```

## Step 3: Run Initial VPS Setup

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install git
apt-get install -y git

# Install Nginx
apt-get install -y nginx

# Install Certbot for SSL
apt-get install -y certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2

# Create project directory
mkdir -p /var/www/naval-command
cd /var/www/naval-command
```

## Step 4: Clone Repository

```bash
cd /var/www/naval-command
git clone https://github.com/meekantifun/naval-command.git .
```

If you get authentication error, use a personal access token:
```bash
git clone https://YOUR_GITHUB_TOKEN@github.com/meekantifun/naval-command.git .
```

## Step 5: Create Environment Files

### Main .env file
```bash
nano /var/www/naval-command/.env
```

Add this content (replace with your actual values):
```env
DISCORD_TOKEN=your_actual_discord_bot_token
BOT_API_PORT=3002
BOT_API_URL=http://localhost:3002
BOT_API_KEY=your_secure_random_api_key
WEB_SERVER_URL=http://localhost:3001
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=https://naval-command.com/auth/discord/callback
FRONTEND_URL=https://naval-command.com
SESSION_SECRET=your_secure_random_session_secret
NODE_ENV=production
```

### Web server .env file
```bash
nano /var/www/naval-command/web-server/.env
```

Add the same content as above.

**Important**: Make sure `BOT_API_KEY` is the SAME in both files!

## Step 6: Configure Nginx

```bash
# Copy initial Nginx config (for HTTP only, before SSL)
cp /var/www/naval-command/deploy/nginx-initial.conf /etc/nginx/sites-available/naval-command
ln -s /etc/nginx/sites-available/naval-command /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 7: Get SSL Certificate

**Wait for DNS to propagate first!** Test with:
```bash
ping naval-command.com
# Should show 198.46.174.142
```

Then get certificate:
```bash
certbot --nginx -d naval-command.com -d www.naval-command.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

Certbot will automatically update your Nginx config with SSL.

## Step 8: Deploy the Application

```bash
cd /var/www/naval-command
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

This will:
- Install all dependencies
- Build sharp from source (takes 2-5 minutes)
- Build React frontend
- Start all services with PM2

## Step 9: Verify Everything Works

```bash
# Check services are running
pm2 status

# Should see:
# - naval-bot (online)
# - naval-web (online)
# - naval-frontend (online)

# Check bot logs
pm2 logs naval-bot --lines 30

# Check web server logs
pm2 logs naval-web --lines 30
```

## Step 10: Test the Website

1. Visit https://naval-command.com
2. You should see the login page
3. Click "Login with Discord"
4. After logging in, go to Admin Panel
5. You should see your servers listed!

## Troubleshooting

### DNS not propagating
Check with: `nslookup naval-command.com`
- If it shows the old IP, wait a few more minutes

### Certbot fails
- Make sure DNS points to new IP
- Make sure port 80 is not blocked by firewall:
  ```bash
  ufw allow 80
  ufw allow 443
  ```

### Bot not starting
Check logs:
```bash
pm2 logs naval-bot --lines 50
```

Common issues:
- DISCORD_TOKEN incorrect
- Sharp build failed (should work now with 40GB space)

### Website shows 502 Bad Gateway
- Check all PM2 services are running: `pm2 status`
- Restart services: `pm2 restart all`

## Auto-start on Boot

```bash
# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup systemd
# Copy and run the command it outputs
```

## Updating the Bot Later

```bash
cd /var/www/naval-command
git pull
./deploy/deploy.sh
```

## Monitoring

```bash
# View all logs
pm2 logs

# View specific service
pm2 logs naval-bot

# Monitor resources
pm2 monit
```

---

**Your new VPS has 40GB of storage, so the sharp build should work perfectly!**
