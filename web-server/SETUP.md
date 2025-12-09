# Naval Command Web Interface Setup Guide

This guide will help you set up the interactive web interface for your Naval Command Discord bot.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Discord Bot    │◄───────►│  Web Server      │◄───────►│  React Client   │
│  (bot.js)       │  HTTP   │  (Express+WS)    │  HTTP   │  (Browser)      │
│  Port 3000      │  API    │  Port 3001       │  +WS    │  Port 3000*     │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                           │                            │
         └───────────────────────────┴────────────────────────────┘
                          Shared Game State
```

*React dev server runs on port 3000, production build is served by web server.

## Prerequisites

- Node.js 16+ installed
- Discord bot already working
- Discord Application credentials (for OAuth)

## Step 1: Install Dependencies

### Web Server Dependencies
```bash
cd web-server
npm install
```

### React Client Dependencies
```bash
cd web-server/client
npm install
```

### Bot Dependencies (add these if not present)
```bash
cd "C:\Users\Chris\Desktop\Naval Command"
npm install express cors axios
```

## Step 2: Configure Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **OAuth2** section
4. Add redirect URL: `http://localhost:3001/auth/discord/callback`
5. For production, add your production URL (e.g., `https://yourapp.com/auth/discord/callback`)
6. Note down:
   - **Client ID**
   - **Client Secret**

## Step 3: Configure Environment Variables

### Create Bot .env (in root directory)

Add these lines to your existing `.env` file:

```env
# Existing Discord bot config
DISCORD_TOKEN=your_existing_token

# NEW: Bot HTTP API Configuration
BOT_API_PORT=3000
BOT_API_KEY=generate_a_random_secure_key_here
WEB_SERVER_URL=http://localhost:3001

# NEW: Discord OAuth (same client as your bot)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Create Web Server .env

```bash
cd web-server
cp .env.example .env
```

Edit `web-server/.env`:

```env
# Web Server Configuration
PORT=3001
NODE_ENV=development

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback

# Session Secret (generate a random string)
SESSION_SECRET=generate_random_string_here

# Bot Communication
BOT_API_URL=http://localhost:3000
BOT_API_KEY=same_key_as_in_bot_env

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Important:** Make sure `BOT_API_KEY` is the **same** in both `.env` files!

## Step 4: Integrate Bot API

You need to add HTTP endpoints to your Discord bot so the web server can communicate with it.

### Option A: Manual Integration

1. Open `bot.js`

2. Add imports at the top:
```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');
```

3. Copy the methods from `web-server/src/botAPI.js` into your `NavalWarfareBot` class:
   - `setupHTTPServer()` method
   - `broadcastGameUpdate()` method

4. After creating your bot instance, call:
```javascript
const bot = new NavalWarfareBot();
bot.setupHTTPServer();
```

### Option B: Quick Integration (Recommended)

Add this to the end of your `NavalWarfareBot` class in `bot.js`:

```javascript
// Add HTTP API for web interface
setupHTTPServer() {
  const express = require('express');
  const cors = require('cors');
  const axios = require('axios');
  const app = express();
  const PORT = process.env.BOT_API_PORT || 3000;

  app.use(cors());
  app.use(express.json());

  const authenticateAPIKey = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const expectedKey = process.env.BOT_API_KEY || 'default_api_key';
    if (authHeader === `Bearer ${expectedKey}`) return next();
    res.status(401).json({ error: 'Unauthorized' });
  };

  // Copy all endpoint code from web-server/src/botAPI.js here
  // OR require the file: require('./web-server/src/botAPI.js')(this, app);

  app.listen(PORT, () => {
    console.log(`Bot HTTP API listening on port ${PORT}`);
  });

  this.httpServer = app;
}

async broadcastGameUpdate(channelId) {
  try {
    const WEB_SERVER_URL = process.env.WEB_SERVER_URL || 'http://localhost:3001';
    const BOT_API_KEY = process.env.BOT_API_KEY || 'default_api_key';
    const game = this.games.get(channelId);
    if (!game) return;

    await axios.post(
      `${WEB_SERVER_URL}/api/broadcast/${channelId}`,
      { type: 'gameUpdate', channelId, timestamp: Date.now() },
      { headers: { 'Authorization': `Bearer ${BOT_API_KEY}` } }
    );
  } catch (error) {
    console.error('Error broadcasting to web server:', error.message);
  }
}
```

Then in your bot initialization:
```javascript
const bot = new NavalWarfareBot();
bot.setupHTTPServer(); // Add this line
```

## Step 5: Register /weblink Command

1. Copy `web-server/commands/weblinkCommand.js` to your bot's commands directory

2. Make sure your bot loads this command (it should auto-load if you use a command handler)

3. The command will work once both bot and web server are running

## Step 6: Running the System

You need to run **3 processes** during development:

### Terminal 1: Discord Bot
```bash
cd "C:\Users\Chris\Desktop\Naval Command"
node bot.js
# or if using nodemon:
npm run dev
```

### Terminal 2: Web Server
```bash
cd "C:\Users\Chris\Desktop\Naval Command\web-server"
npm run dev
```

### Terminal 3: React Client
```bash
cd "C:\Users\Chris\Desktop\Naval Command\web-server\client"
npm start
```

The browser should automatically open to `http://localhost:3000`

## Step 7: Testing the Integration

1. **Start a game in Discord** using your existing commands
2. Run `/weblink` in the game channel
3. Click the link provided
4. Log in with Discord
5. You should see your active games
6. Click "Enter Game"
7. Try clicking on the map to move your ship!

## Troubleshooting

### Issue: "Not authenticated" error
- **Solution:** Make sure `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correctly set
- Check that the redirect URL is added in Discord Developer Portal

### Issue: "Failed to load games"
- **Solution:** Ensure the Discord bot is running and the HTTP API is active
- Verify `BOT_API_KEY` matches in both `.env` files
- Check bot is listening on port 3000

### Issue: CORS errors
- **Solution:** Make sure `FRONTEND_URL` is set correctly in web server .env
- Check that `cors` is properly configured

### Issue: Can't move ships
- **Solution:** Ensure `broadcastGameUpdate()` is being called after moves
- Check WebSocket connection in browser console
- Verify bot API endpoints are responding

### Issue: "Game not found"
- **Solution:** Make sure there's an active game in the Discord channel
- The bot and web server must share the same game state

## Production Deployment

### Build React App
```bash
cd web-server/client
npm run build
```

### Serve Static Files
Update `web-server/src/server.js` to serve the built React app:

```javascript
// Add after other middleware
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/build')));

// Add before other routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});
```

### Environment Variables
Update all URLs to use your production domain:
- `FRONTEND_URL`
- `DISCORD_CALLBACK_URL`
- `BOT_API_URL`
- `WEB_SERVER_URL`

### Process Management
Use PM2 or similar to keep processes running:

```bash
npm install -g pm2

# Start bot
pm2 start bot.js --name naval-bot

# Start web server
pm2 start web-server/src/server.js --name naval-web

pm2 save
pm2 startup
```

## Features

✅ **Interactive Map**: Click directly on the map to move ships
✅ **Real-time Updates**: See changes instantly via WebSocket
✅ **Discord OAuth**: Secure authentication with Discord accounts
✅ **Mobile Friendly**: Responsive design works on phones/tablets
✅ **Dual Interface**: Discord commands and web interface work together
✅ **Visual Combat**: See attack ranges and ship positions clearly

## Support

If you encounter issues:
1. Check all 3 processes are running
2. Verify all environment variables are set correctly
3. Check browser console for errors
4. Check Discord bot console for errors
5. Check web server console for errors

## Next Steps

- Customize the map colors and styling in `GameMap.js`
- Add more features (aircraft deployment from web, damage control, etc.)
- Deploy to a production server
- Add player statistics and leaderboards to the web interface

Enjoy your interactive Naval Command web interface! 🚢⚓
