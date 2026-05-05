# Configurations Panel — Design Spec
**Date:** 2026-05-05
**Status:** Approved

## Overview

Add a "Configurations" tab to the Admin Panel that exposes server-specific bot settings as a web UI. Each setting maps to an existing Discord slash command and behaves identically — applying the setting from the web is exactly the same as running the command. All settings are per-guild and persist through bot restarts.

**In scope:** `/aicanspeak`, `/roleplay`, `/setgm`, `/setlogchannel`, `/setmsglogchannel`
**Out of scope (deferred):** `/embed` (custom embed builder)

---

## Frontend

### AdminPanel.js
Add a fourth tab: **Configurations** (`activeTab === 'configurations'`). Renders `<ConfigurationsPanel guildId={selectedGuild?.id} />`.

### ConfigurationsPanel.js (`web-server/client/src/components/ConfigurationsPanel.js`)
On mount, fires two requests in parallel:
1. `GET /api/admin/config/:guildId` — current values for all 5 settings
2. `GET /api/admin/guild/:guildId/metadata` — guild channels (text only) and roles list

Renders five cards in a single scrollable column. Each card is self-contained: has its own local state, Save button, and inline success/error feedback. Saving one card does not affect others.

### Card designs

#### /aicanspeak
- ON/OFF toggle (ON = aiSpeakChance > 0)
- Number input (1–100) for percentage chance; greyed out when toggle is OFF
- Single **Save** button — sends `{ guildId, value }` where value is `"true"`, `"false"`, or the number as a string (e.g. `"75"`) to match the Discord command's input format

#### /roleplay
- ON/OFF toggle (enabled)
- Text input for timeout (e.g. `5m`, `2h`, `30s`) — defaults to `5m`
- ON/OFF toggle for AI Pause
- Single **Save** button — sends `{ guildId, enabled, timeout, aipause }`

#### /setgm
- **GM Role section:**
  - Shows current GM role as a removable badge (e.g. `@ Game Master ✕`)
  - Searchable text input below: typing filters the guild roles list in a floating dropdown; clicking a role selects it and sends `POST /api/admin/config/setgm { guildId, roleId }`; remove button sends `DELETE /api/admin/config/setgm { guildId, roleId }`
  - Dropdown footer shows "Showing N of M roles — keep typing to narrow results"
- **Individual GM Users section:**
  - Lists current individual GM users, each with a **Remove** button
  - Text input + **Add** button to add a user by Discord user ID; sends `POST /api/admin/config/setgm { guildId, userId }`

#### /setlogchannel
- Channel dropdown (all guild text channels, fetched on load)
- Shows currently configured channel name if set
- **Save** button + **Clear** button (sets to null)

#### /setmsglogchannel
- Same structure as /setlogchannel

---

## API Layer

### Web-server proxy routes (new, in `web-server/src/server.js`)
All routes are `ensureAuthenticated` and forward to the bot API.

| Method | Path | Forwards to bot |
|--------|------|-----------------|
| GET | `/api/admin/config/:guildId` | `GET /api/admin/config/:guildId` |
| GET | `/api/admin/guild/:guildId/metadata` | `GET /api/admin/guild/:guildId/metadata` |
| POST | `/api/admin/config/aicanspeak` | `POST /api/admin/config/aicanspeak` |
| POST | `/api/admin/config/roleplay` | `POST /api/admin/config/roleplay` |
| POST | `/api/admin/config/setgm` | `POST /api/admin/config/setgm` |
| DELETE | `/api/admin/config/setgm` | `DELETE /api/admin/config/setgm` |
| POST | `/api/admin/config/setlogchannel` | `POST /api/admin/config/setlogchannel` |
| POST | `/api/admin/config/setmsglogchannel` | `POST /api/admin/config/setmsglogchannel` |

### Bot API endpoints (new, in `bot.js`)
All protected by `authenticateAPIKey`.

**GET `/api/admin/config/:guildId`**
Returns current config state:
```json
{
  "aicanspeak": { "enabled": true, "chance": 75 },
  "roleplay": { "enabled": true, "timeout": "5m", "aipause": false },
  "setgm": { "roleId": "123456", "roleName": "Game Master", "users": [{ "id": "789", "displayName": "ExampleUser#1234" }] },
  "setlogchannel": { "channelId": "111", "channelName": "bot-logs" },
  "setmsglogchannel": { "channelId": "222", "channelName": "msg-logs" }
}
```

**GET `/api/admin/guild/:guildId/metadata`**
Returns guild channels and roles:
```json
{
  "channels": [{ "id": "111", "name": "bot-logs" }, ...],
  "roles": [{ "id": "123456", "name": "Game Master" }, ...]
}
```

**POST `/api/admin/config/aicanspeak`** — body: `{ guildId, value }`
Runs same logic as `handleAICanSpeak`. Saves `aiSpeakChance` to `guildConfig[guildId].aiSpeakChance`.

**POST `/api/admin/config/roleplay`** — body: `{ guildId, enabled, timeout, aipause }`
Runs same logic as `setRoleplayMode`. Saves to `guildConfig[guildId].roleplay`.

**POST `/api/admin/config/setgm`** — body: `{ guildId, roleId? }` or `{ guildId, userId? }`
Calls `staffRoleManager.setStaffRole(guildId, roleId)` or `staffRoleManager.addStaffUser(guildId, userId)`.

**DELETE `/api/admin/config/setgm`** — body: `{ guildId, roleId? }` or `{ guildId, userId? }`
Calls `staffRoleManager.removeStaffRole(guildId)` or `staffRoleManager.removeStaffUser(guildId, userId)`.

**POST `/api/admin/config/setlogchannel`** — body: `{ guildId, channelId }` (null to clear)
Sets the console log channel. Persists to `guildConfig[guildId].logChannelId`.

**POST `/api/admin/config/setmsglogchannel`** — body: `{ guildId, channelId }` (null to clear)
Calls `messageLogger.setLogChannel(guildId, channelId)` or `messageLogger.removeLogChannel(guildId)`.

---

## Bot Persistence Changes

### aicanspeak (currently runtime-only, global)
- **Change to per-guild:** store as `guildConfig[guildId].aiSpeakChance`
- `handleAICanSpeak(interaction)`: save to `guildConfig` after setting, keyed by `interaction.guildId`
- `loadGuildConfig(guildId)`: read `aiSpeakChance` on load; store in a per-guild map rather than `this.aiSpeakChance`
- Game instances read from `this.guildConfigs.get(guildId).aiSpeakChance` instead of `this.aiSpeakChance`

### roleplay (currently runtime-only, global)
- **Change to per-guild:** store as `guildConfig[guildId].roleplay: { enabled, timeoutMs, aiPause }`
- `setRoleplayMode(interaction)`: save to `guildConfig` after setting, keyed by `interaction.guildId`
- `loadGuildConfig(guildId)`: read roleplay config on load
- New game instances read defaults from `guildConfig[guildId].roleplay` instead of `this.roleplayMode` / `this.roleplayTimeout`

---

## Error Handling

- Each card shows an inline success message ("Saved!") or error message below its Save button
- Fetch failures on load show an error state per card with a Retry button
- The setgm user Add input validates that the ID is non-empty before sending
- GM user display names are resolved from the bot's member cache; if not cached, the raw user ID is shown instead
- Channel/role dropdowns show a loading state while metadata is fetching
