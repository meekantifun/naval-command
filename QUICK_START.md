# Naval Command - Quick Deployment Checklist

Use this as a quick reference while deploying. See DEPLOYMENT_GUIDE.md for detailed instructions.

## Pre-Deployment Checklist

- [ ] Domain purchased (e.g., navalcommand.com)
- [ ] VPS created (Ubuntu 22.04, 2GB RAM minimum)
- [ ] Discord OAuth redirect URL updated to: `https://navalcommand.com/auth/discord/callback`

## On Your VPS (SSH into it first)

```bash
# 1. Setup environment
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2

# 2. Clone your code
sudo mkdir -p /var/www/naval-command && sudo chown $USER:$USER /var/www/naval-command
cd /var/www/naval-command
git clone YOUR_REPO_URL .

# 3. Configure environment
nano .env
# (Paste your production environment variables)
cp .env web-server/.env

# 4. Deploy application
chmod +x deploy/deploy.sh
./deploy/deploy.sh

# 5. Setup Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/navalcommand
sudo ln -s /etc/nginx/sites-available/navalcommand /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 6. Setup SSL
sudo certbot --nginx -d navalcommand.com -d www.navalcommand.com

# 7. Configure firewall
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 22/tcp
sudo ufw enable
```

## DNS Configuration

Point your domain to your VPS IP:
- A Record: `@` → `YOUR_VPS_IP`
- A Record: `www` → `YOUR_VPS_IP`

## Useful Commands

```bash
# View logs
pm2 logs naval-bot          # Bot logs
pm2 logs naval-web           # Web server logs
pm2 logs                     # All logs

# Restart services
pm2 restart all              # Restart everything
pm2 restart naval-bot        # Restart bot only

# Monitor
pm2 monit                    # Resource usage
pm2 status                   # Service status

# Update code
cd /var/www/naval-command
git pull
./deploy/deploy.sh
```

## Port Configuration

- **3000**: React Frontend (served by PM2)
- **3001**: Web Server (Node.js + Express)
- **3002**: Bot API (Discord bot HTTP endpoints)
- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS (Nginx reverse proxy)

## Troubleshooting

1. **Website not loading?**
   - Check DNS propagation: https://dnschecker.org
   - Verify services: `pm2 status`
   - Check Nginx: `sudo systemctl status nginx`

2. **"Cannot connect to bot" error?**
   - Check logs: `pm2 logs naval-bot`
   - Verify .env file has correct settings
   - Ensure BOT_API_PORT=3002

3. **SSL issues?**
   - Renew certificate: `sudo certbot renew`
   - Check Nginx config: `sudo nginx -t`

## Cost: ~$154/year
- Domain: $10/year
- VPS: $12/month ($144/year)
- SSL: Free
