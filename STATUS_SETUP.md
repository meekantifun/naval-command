# Naval Command Bot Status System

This status system provides real-time updates about your bot's operational status, including online/offline status, active players, and running sorties.

## Setup Instructions

### 1. Get Your Status Channel ID

1. In Discord, go to **User Settings** → **Advanced** → Enable **Developer Mode**
2. Right-click on the channel where you want status updates → **Copy ID**
3. Save this channel ID for the next step

### 2. Configure the .env File

Edit your `.env` file and add your status channel ID:

```
# Status Channel Configuration
STATUS_CHANNEL_ID=YOUR_CHANNEL_ID_HERE
```

Replace `YOUR_CHANNEL_ID_HERE` with the channel ID you copied.

### 3. Restart the Bot

Restart your bot to apply the changes:

```bash
npm start
```

or if using nodemon:

```bash
npm run dev
```

## Features

### ✅ What the Status System Does

- **Online Status**: Shows when the bot is online and operational
- **Offline Status**: Automatically displays when the bot goes offline
- **Player Count**: Real-time count of active players across all sorties
- **Sortie Count**: Number of active naval battles in progress
- **Uptime Tracking**: Shows how long the bot has been running
- **Crash Detection**: Automatically sends crash messages when errors occur
- **Message Management**: Cleans up old status messages and maintains one current status message
- **Auto-Updates**: Status updates automatically every minute and when significant events occur

### 🔄 When Status Updates

The status message updates automatically when:
- Bot comes online
- Bot goes offline
- New sortie starts (`/prepare` command)
- Sortie ends (`/end` command)
- Player joins a sortie
- Bot crashes or encounters errors
- Every 60 seconds (periodic update)

### 📋 Status Message Format

**Online Status:**
```
⚓ Naval Command Status
🟢 ONLINE - Bot is operational and monitoring fleet operations

👥 Active Players: X players currently active
🚢 Active Sorties: X sorties in progress
⏱️ Uptime: Xd Xh Xm

Last updated: [timestamp]
```

**Offline Status:**
```
⚓ Naval Command Status
🔴 OFFLINE - Bot is currently offline for maintenance or updates

Last updated: [timestamp]
```

**Crash Alert:**
```
💥 Naval Command - Critical Error
🔴 BOT CRASHED - A critical error has occurred

❌ Error Details: [error message]
🕐 Crash Time: [timestamp]

System will attempt automatic restart
```

## Troubleshooting

### Status Not Working?

1. **Check .env file**: Make sure `STATUS_CHANNEL_ID` is set correctly
2. **Verify permissions**: Bot needs permission to send messages in the status channel
3. **Check console**: Look for status system initialization messages
4. **Channel exists**: Make sure the channel ID is valid and the bot can access it

### Multiple Status Messages?

The system automatically cleans up old status messages, but if you see multiples:
1. Manually delete old status messages
2. Restart the bot
3. The system will create a fresh status message

### Status Not Updating?

- Status updates every minute automatically
- Manual updates occur when players join/leave or sorties start/end
- Check bot permissions in the status channel
- Restart the bot if updates stop working

## Disabling Status System

To disable the status system, remove or comment out the `STATUS_CHANNEL_ID` line in your `.env` file:

```
# STATUS_CHANNEL_ID=YOUR_CHANNEL_ID_HERE
```

The bot will work normally without status updates.