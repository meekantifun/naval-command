# Troubleshooting: /staffrole Command Not Showing

## Steps to Fix

### 1. Restart the Bot

The most common issue is that the bot needs to be restarted to register new commands with Discord.

```bash
# Stop the bot (Ctrl+C if running)
# Then restart
npm start
```

### 2. Check Console Output

When the bot starts, look for these logs:

```
📋 Staff role commands: 1 command(s) - staffrole
📝 Registering XX commands...
📋 Commands: prepare, join, start, ..., staffrole, ...
✅ Commands registered successfully
```

**If you see:**
- `📋 Staff role commands: 1 command(s) - staffrole` ✅ Command is being added
- `✅ Commands registered successfully` ✅ Commands sent to Discord

**If you DON'T see staffrole in the command list:**
- There's an issue with the command initialization
- Check for errors in the console

### 3. Wait for Discord to Update

Discord can take up to **1 hour** to update slash commands. If the bot just registered them:
- Wait a few minutes
- Try in a different channel
- Restart your Discord client
- Try on Discord web/mobile

### 4. Check Permissions

Make sure the bot has permission to create slash commands:
- Bot needs `applications.commands` scope
- Check bot's role permissions in Server Settings

### 5. Force Refresh Discord

- Press `Ctrl+R` (or `Cmd+R` on Mac) to reload Discord
- Or completely close and reopen Discord
- Clear Discord cache (User Settings → Advanced → Clear Cache)

### 6. Verify Bot Integration

Check that your bot token and application ID are correct:
- `.env` file should have valid `DISCORD_TOKEN`
- Bot should be properly invited with correct permissions

### 7. Check for Errors

Look for these error messages in console:

```
❌ Error registering commands: ...
```

If you see errors:
- Check the full error message
- Ensure all required npm packages are installed
- Verify bot.js has no syntax errors

### 8. Test Command Manually

Run this to verify the command structure is valid:

```bash
node -e "const StaffRoleCommands = require('./commands/staffRoleCommands'); const bot = { staffRoleManager: {} }; const cmd = new StaffRoleCommands(bot); console.log(cmd.getCommands()[0].name)"
```

Should output: `staffrole`

### 9. Check Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Go to "General Information" → Copy Application ID
4. Make sure it matches your bot's client ID

### 10. Re-invite Bot (if needed)

If commands still don't show, re-invite the bot with correct scopes:

**Required Scopes:**
- `bot`
- `applications.commands`

**Invite URL:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Replace `YOUR_BOT_CLIENT_ID` with your bot's application ID.

---

## Common Issues

### Command Shows for Some Users but Not Others

**Issue:** Discord caches commands per-user

**Fix:**
- Have users restart Discord
- Wait for cache to refresh (up to 1 hour)

### Command Shows but Gives Error

**Issue:** Command is registered but handler is missing or has bug

**Fix:**
- Check console for errors when using command
- Verify eventHandler.js has staffrole handler

### Bot Can't Register Commands

**Issue:** Missing permissions or bot token issue

**Fix:**
- Verify `.env` has correct `DISCORD_TOKEN`
- Check bot has `applications.commands` scope
- Ensure bot is in the server

### Commands Registered but Showing Old Version

**Issue:** Discord cache

**Fix:**
- Wait a few minutes
- Restart Discord
- Clear Discord cache

---

## Debug Checklist

- [ ] Bot has been restarted since adding staffrole
- [ ] Console shows "Staff role commands: 1 command(s) - staffrole"
- [ ] Console shows "✅ Commands registered successfully"
- [ ] staffrole appears in the command list in console
- [ ] Waited at least 5 minutes after restart
- [ ] Tried restarting Discord client
- [ ] Bot has applications.commands permission
- [ ] No errors in console during startup
- [ ] Tested in different channel
- [ ] Tried on Discord web/mobile

---

## Expected Console Output

When bot starts correctly, you should see:

```
📋 Staff role commands: 1 command(s) - staffrole
📝 Registering 35 commands...
📋 Commands: prepare, join, start, move, moveair, weather, spawn, end, shop, equip, stats, equipment, clearpins, kill, newchar, fire, flood, roleplay, setlogchannel, ..., register, setmastersheet, template, staffrole, createmap, listmaps, usemap, previewmap, deletemap, uploadmap
✅ Commands registered successfully
🤖 Logged in as YourBot#1234
🌐 Connected to 1 servers
👥 Serving 50 users
✅ Google Sheets API initialized successfully
🎯 Naval Command Bot is fully operational!
```

---

## Still Not Working?

If you've tried everything above and `/staffrole` still doesn't show:

1. **Check the console output** - Share the startup logs
2. **Check for errors** - Look for any error messages
3. **Verify files exist:**
   - `systems/staffRoleManager.js`
   - `commands/staffRoleCommands.js`
4. **Test in DMs** - Try using `/` in a DM with the bot to see if command shows there
5. **Check bot status** - Make sure bot is online and connected

---

## Quick Test

Run these commands to verify everything:

```bash
# 1. Check if files exist
ls systems/staffRoleManager.js
ls commands/staffRoleCommands.js

# 2. Test command structure
node -e "const cmd = require('./commands/staffRoleCommands'); console.log('✅ Command file loads correctly')"

# 3. Restart bot
npm start
```

Then check console for the log messages above.
