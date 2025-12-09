# Quick Start: Staff Role Configuration

## What Is It?

Configure a custom Discord role that grants permissions to use bot staff commands!

---

## Quick Setup (3 Steps)

### 1. Create a Role in Discord
- Server Settings → Roles → Create Role
- Name it (e.g., "Game Master", "Staff", "DM")
- No Discord permissions needed!

### 2. Set the Staff Role
```
/staffrole set @YourRoleName
```

### 3. Give Members the Role
- Right-click member → Roles → Add role

**Done!** Members with that role can now use staff commands.

---

## Commands

```
/staffrole set @role     # Set staff role (Admin only)
/staffrole remove        # Remove configuration (Admin only)
/staffrole info          # View current setup (Anyone)
```

---

## What Can Staff Do?

Members with the staff role can use:
- `/register` - Register characters from Google Sheets
- `/newchar` - Manual character creation
- `/prepare` - Start battles
- `/spawn` - Spawn AI units
- `/editchar` - Edit characters
- `/deletechar` - Delete characters
- And other GM commands

---

## Example

**Scenario:** You want your GMs to control the bot without giving them Discord's Manage Messages permission.

1. Create `@Game Master` role in Discord
2. Run `/staffrole set @Game Master`
3. Give your GMs the `@Game Master` role
4. They can now use bot commands!

---

## Permission Levels

1. **Administrator** - Full access (always)
2. **Staff Role** - Staff commands (if configured)
3. **Manage Messages** - Staff commands (if no role configured)

---

## Check Configuration

```
/staffrole info
```

Shows:
- Current staff role
- Number of members with the role
- What permissions it grants

---

## Remove Configuration

```
/staffrole remove
```

Bot will go back to requiring **Manage Messages** or **Administrator** permissions.

---

## Per-Server

Each server can have its own staff role! Perfect for multi-server setups.

---

## Need Help?

See `STAFF_ROLE_SYSTEM.md` for complete documentation including:
- Detailed setup guide
- Troubleshooting
- Security notes
- FAQ

---

**Set up your staff role in seconds with `/staffrole set @YourRole`!** 🎭
