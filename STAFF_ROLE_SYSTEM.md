# Staff Role System

## Overview

The bot now supports **configurable staff roles** per server! Admins can designate a specific role as the "staff role" which grants permissions to run GM/staff commands without needing Discord's built-in permissions.

---

## Why Use This?

### Before:
- Staff commands required **Manage Messages** or **Administrator** Discord permissions
- Hard to control who can use bot staff commands without giving Discord permissions
- No flexibility for custom permission structures

### After:
- ✅ Configure a custom role as "staff" for your server
- ✅ Members with that role can use staff commands
- ✅ No need to give Discord server permissions
- ✅ Easy to manage who has bot access
- ✅ Different role for each server

---

## Commands

### `/staffrole set @role`
**Permission Required:** Administrator

Sets the designated role for staff permissions on this server.

**Example:**
```
/staffrole set @Game Master
```

Now anyone with the `@Game Master` role can use staff commands!

### `/staffrole remove`
**Permission Required:** Administrator

Removes the staff role configuration. Staff commands will revert to requiring **Manage Messages** or **Administrator** permissions.

**Example:**
```
/staffrole remove
```

### `/staffrole info`
**Permission Required:** Anyone

View the current staff role configuration for the server.

**Example:**
```
/staffrole info
```

Shows:
- Current staff role (if configured)
- Number of members with the role
- List of members (if 10 or fewer)
- What commands the role grants access to

---

## How It Works

### Permission Hierarchy:

1. **Administrator Permission** (highest)
   - Always has full access to all commands
   - Can configure staff role

2. **Configured Staff Role** (if set)
   - Members with this role can use staff commands
   - Role is per-server configurable

3. **Manage Messages Permission** (fallback)
   - If no staff role is configured, this permission is required
   - Default behavior for servers that don't set a staff role

### Staff Commands:

These commands check for staff permissions:
- `/register` - Register characters from Google Sheets
- `/newchar` - Manual character creation
- `/prepare` - Start battles
- `/start` - Begin battle
- `/spawn` - Spawn AI units
- `/end` - End battles
- `/weather` - Set weather
- `/fire` - Set targets on fire
- `/flood` - Flood targets
- `/kill` - Debug kill command
- `/editchar` - Edit characters (with staff role OR admin)
- `/deletechar` - Delete characters (with staff role OR admin)
- And other GM commands

### Administrator-Only Commands:

These always require **Administrator** permission (cannot use staff role):
- `/staffrole set` - Configure staff role
- `/staffrole remove` - Remove staff role
- `/setmastersheet` - Configure master sheet

---

## Setup Guide

### Step 1: Create a Role

In your Discord server:
1. Go to Server Settings → Roles
2. Create a new role (e.g., "Game Master", "Staff", "DM")
3. Give it a color/icon if desired
4. Don't give it any Discord permissions (unless you want to)

### Step 2: Configure the Bot

Run the command:
```
/staffrole set @YourRoleName
```

Example:
```
/staffrole set @Game Master
```

You'll see a confirmation:
```
✅ Staff Role Configured
Role Name: Game Master
Members: 3
```

### Step 3: Assign the Role

Give your staff members the role:
1. Right-click member → Roles → Add the role
2. Or use Discord's role management

### Step 4: Test

Have a staff member try a command:
```
/prepare
```

They should now have access!

---

## Example Scenarios

### Scenario 1: TTRPG Server

You want only your GMs to control the bot, but you don't want to give them Discord's Manage Messages permission.

**Solution:**
1. Create `@GM` role
2. `/staffrole set @GM`
3. Assign `@GM` to your game masters
4. They can now use bot commands without server permissions

### Scenario 2: Multi-Game Server

You have different groups playing different campaigns and want separate staff for each.

**Note:** Staff role is per-server, not per-channel. Consider:
- Using multiple Discord servers (one per campaign)
- Or managing permissions at the channel level separately

### Scenario 3: Public Server

You want tight control over who can start battles.

**Solution:**
1. Create `@Battle Staff` role
2. `/staffrole set @Battle Staff`
3. Only trusted members get the role
4. Everyone else can only join battles, not create them

---

## Per-Server Configuration

Each server has its own staff role configuration stored in:
```
servers/{ServerName}/config.json
```

Example config:
```json
{
  "staffRoleId": "123456789012345678",
  "masterSheetId": "abc123..."
}
```

If you delete the role in Discord, the bot will warn you that the configured role doesn't exist when you run `/staffrole info`.

---

## Checking Permissions (For Developers)

The bot checks permissions using `StaffRoleManager`:

```javascript
// Check if member has staff permissions
if (this.bot.staffRoleManager.hasStaffPermission(interaction.member)) {
    // User has access
}

// Check if member can configure staff settings
if (this.bot.staffRoleManager.canConfigureStaff(interaction.member)) {
    // User can change staff role
}
```

### Permission Check Logic:

```
hasStaffPermission() returns true if:
  ├─ Member has Administrator permission → YES
  ├─ Staff role is configured AND member has it → YES
  ├─ No staff role configured AND member has Manage Messages → YES
  └─ Otherwise → NO
```

---

## Troubleshooting

### "You don't have permission to use this command"

**Check:**
1. Do you have the configured staff role?
2. Run `/staffrole info` to see what role is configured
3. Ask an admin to give you the role
4. If no role is configured, you need **Manage Messages** permission

### "Configured staff role not found"

**Issue:** The role was deleted from Discord

**Fix:**
1. Create a new role
2. Run `/staffrole set @NewRole`
3. Or run `/staffrole remove` to clear config and use default permissions

### Staff role not working after setting

**Check:**
1. Make sure the role actually exists in Discord
2. Verify members have the role (right-click → profile)
3. Try `/staffrole info` to confirm configuration
4. Restart the bot if needed

---

## Migration from Old System

### If You're Already Using the Bot:

**Good news!** Nothing breaks. The system is fully backward compatible.

**Before configuring staff role:**
- Commands require **Manage Messages** or **Administrator** (same as before)

**After configuring staff role:**
- Commands check for configured role OR existing permissions
- Admins always have access
- No one loses access they already had

### To Switch to Staff Role System:

1. Identify who should have staff access
2. Create a role for them
3. Run `/staffrole set @role`
4. Assign the role to your staff
5. Test that it works
6. (Optional) Remove Discord permissions from staff members

---

## Security Notes

### ✅ Good Practices:

- Use descriptive role names ("Game Master", "Staff")
- Limit staff role to trusted members
- Regularly audit who has the role
- Use `/staffrole info` to check current members

### ⚠️ Be Careful:

- Anyone with the staff role can:
  - Start/end battles
  - Register characters
  - Spawn AI units
  - Use other GM commands
- Administrators can always change the staff role
- Don't use `@everyone` as staff role (bot prevents this)

---

## Console Logs

When a user with staff role uses a command:
```
✅ User PlayerName#1234 has staff role in guild 123456789
```

When a user without permissions tries:
```
❌ User PlayerName#1234 lacks staff permissions
```

When staff role is configured:
```
✅ Staff role set for guild ServerName (123456789): @Game Master (987654321)
```

---

## FAQ

**Q: Can I have multiple staff roles?**
A: Currently only one role per server. Anyone with Administrator permission also has access.

**Q: Does this affect character management commands?**
A: Yes! `/editchar` and `/deletechar` now check for staff role (or admin).

**Q: Can players with the role see each other's characters?**
A: No, character isolation still works. Staff can only manage characters, not see private data.

**Q: What if I want different permissions for different commands?**
A: Currently all staff commands use the same role. Consider using Discord's channel permissions for finer control.

**Q: Can I use Discord's role hierarchy?**
A: No, the bot checks for the exact role you configured. Members need that specific role.

**Q: Does removing the role from Discord break the bot?**
A: No, the bot will just fall back to checking for Manage Messages permission. Run `/staffrole info` to see the warning.

---

## Summary

✅ **Configure custom staff role per server**
✅ **Flexible permission management**
✅ **No Discord permissions needed**
✅ **Backward compatible**
✅ **Easy to manage**
✅ **Separate from Discord permissions**
✅ **Administrator can always change it**

Configure your staff role today with `/staffrole set @YourRole`! 🎭
