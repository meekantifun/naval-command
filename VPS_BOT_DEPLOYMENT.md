# Deploy Naval Command Bot to VPS

This guide will help you deploy the Discord bot to your VPS alongside the web interface.

## Prerequisites

- VPS with Ubuntu 22.04
- Node.js 18.x installed (from setup-vps.sh)
- PM2 installed globally
- Repository cloned to `/var/www/naval-command`

## Step 1: Configure Environment Variables

On your VPS, create the `.env` file with production settings:

```bash
cd /var/www/naval-command
nano .env
```

Add the following configuration (replace placeholder values):

```env
# Discord Bot Token
DISCORD_TOKEN=your_actual_discord_bot_token

# Website Configuration
BOT_API_PORT=3002
BOT_API_URL=http://localhost:3002
BOT_API_KEY=your_secure_random_api_key_here
WEB_SERVER_URL=http://localhost:3001

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=https://naval-command.com/auth/discord/callback

# Frontend URL
FRONTEND_URL=https://naval-command.com

# Session Secret (generate a random string)
SESSION_SECRET=your_secure_random_session_secret

# Status Channel (optional)
STATUS_CHANNEL_ID=your_channel_id_here

# Production settings
NODE_ENV=production
```

**Important**: Make sure `BOT_API_KEY` is the same value in both bot and web server configs.

Save and exit (Ctrl+X, then Y, then Enter).

Also create the web server `.env`:

```bash
cd /var/www/naval-command/web-server
nano .env
```

Add the same environment variables as above.

## Step 2: Deploy All Services

Run the deployment script:

```bash
cd /var/www/naval-command
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

This will:
1. Install all dependencies
2. Build the React frontend
3. Start 3 PM2 processes:
   - `naval-bot` - Discord bot with API (port 3002)
   - `naval-web` - Web server with OAuth (port 3001)
   - `naval-frontend` - React app (port 3000)

## Step 3: Verify Services

Check that all services are running:

```bash
pm2 status
```

You should see all three services with status "online":
```
┌────┬────────────────────┬──────────┬──────┬───────────┐
│ id │ name              │ status   │ cpu  │ memory    │
├────┼────────────────────┼──────────┼──────┼───────────┤
│ 0  │ naval-bot         │ online   │ 0%   │ 100.5mb   │
│ 1  │ naval-web         │ online   │ 0%   │ 75.3mb    │
│ 2  │ naval-frontend    │ online   │ 0%   │ 45.2mb    │
└────┴────────────────────┴──────────┴──────┴───────────┘
```

## Step 4: Check Logs

If any service shows errors, check the logs:

```bash
# Bot logs
pm2 logs naval-bot --lines 50

# Web server logs
pm2 logs naval-web --lines 50

# Frontend logs
pm2 logs naval-frontend --lines 50
```

## Step 5: Verify Bot is Online

1. Check Discord - your bot should show as online
2. Visit https://naval-command.com and log in
3. Go to Admin Panel - you should now see your servers listed

## Common Issues

### Bot shows "offline" status
- Check `DISCORD_TOKEN` in .env is correct
- Check logs: `pm2 logs naval-bot`

### No servers showing in Admin Panel
- Make sure bot is running: `pm2 status`
- Verify bot is in your Discord server
- Check web server can connect to bot API: `pm2 logs naval-web`

### "Failed to check permission" error
- Verify `BOT_API_KEY` matches in both .env files
- Check `BOT_API_URL=http://localhost:3002` in web-server/.env

### Port conflicts
- Bot API: 3002
- Web server: 3001
- Frontend: 3000
- Nginx: 80, 443

Check no other services are using these ports:
```bash
netstat -tlnp | grep -E ':(3000|3001|3002|80|443)'
```

## Updating the Bot

When you push changes to GitHub:

```bash
cd /var/www/naval-command
git pull
./deploy/deploy.sh
```

## PM2 Commands Reference

```bash
# View all processes
pm2 status

# Restart a service
pm2 restart naval-bot

# Restart all services
pm2 restart all

# View logs
pm2 logs

# Stop all services
pm2 stop all

# Delete all services
pm2 delete all
```

## Next Steps

Once the bot is running:
- Invite the bot to your Discord servers
- Test the admin panel at https://naval-command.com
- Configure staff roles on your servers using `/setstaffrole`
