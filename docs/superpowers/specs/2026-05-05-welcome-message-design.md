# Welcome Message — Design Spec
**Date:** 2026-05-05
**Status:** Approved

## Overview

Add a Welcome Message feature to the Naval Command bot. When enabled for a guild, the bot listens for `guildMemberAdd` events, generates a welcome image by compositing the new member's Discord avatar onto a randomly-selected background, and sends it alongside a customizable text message to a configured channel.

The feature is configured entirely from the web admin panel via two new cards added to the existing Configurations tab.

**In scope:** Image generation, guildMemberAdd handler, welcome message config cards, image pool management (presets + custom URLs)  
**Out of scope:** Animated GIFs, per-role welcome routing, DM welcomes

---

## Frontend

### WelcomeMessageCard (`ConfigurationsPanel.js`)

Handles: enabled toggle, channel selection, message text editor.

**State:** `enabled` (bool), `channelId` (string), `message` (string), `saving` (bool), `status` (feedback)

**Controls:**
- ON/OFF toggle for enabled state
- Channel `<select>` dropdown (from `metadata.channels`)
- **Insert helpers** above the textarea:
  - `@user` button — appends `@user` at cursor position in textarea
  - `Insert #channel` dropdown — lists all guild channels; selecting one appends `<#channelId>` at cursor
  - `Insert @role` dropdown — lists all guild roles; selecting one appends `<@&roleId>` at cursor
- Textarea for the message body (monospace, supports all Discord markdown; `@user` is highlighted inline)
- Hint below textarea: "@user is replaced with a mention of the new member"
- **Save** button — sends `POST /api/admin/config/welcome { guildId, enabled, channelId, message }`

**Initial data:** `config.welcome` from `GET /api/admin/config/:guildId`

### WelcomeImagesCard (`ConfigurationsPanel.js`)

Handles: preset enable/disable, custom image add/remove.

**State:** `presets` (object mapping presetId → bool), `customImages` (array of `{ id, url, label }`), `newUrl` (string), `newLabel` (string), `status` (feedback)

**Presets section:**
- Lists all preset images (hard-coded in bot), each row shows:
  - Small thumbnail (rendered as `<img src={preset.url} />`, 56×36px)
  - Label
  - ON/OFF toggle — toggling immediately sends `POST /api/admin/config/welcome/preset { guildId, presetId, enabled }`

**Custom images section:**
- Lists existing custom images, each row shows:
  - Small thumbnail (`<img src={image.url} />`, 56×36px, onerror → placeholder)
  - Label
  - **Remove** button — immediately sends `DELETE /api/admin/config/welcome/custom { guildId, id }`
- URL input + optional label input + **Add** button — sends `POST /api/admin/config/welcome/custom { guildId, url, label }`; validates URL is non-empty before sending
- Hint: "Recommended size: 900×300px. Image must be publicly accessible."

**Status badge** in header shows count of active images (e.g. "3 ACTIVE"). No Save button — all actions are immediate.

**Initial data:** `config.welcome` (presets + customImages) from `GET /api/admin/config/:guildId`

---

## API Layer

### Web-server proxy routes (new, in `web-server/src/server.js`)
All routes use `ensureAuthenticated` and forward to bot API.

| Method | Path | Forwards to bot |
|--------|------|-----------------|
| POST | `/api/admin/config/welcome` | `POST /api/admin/config/welcome` |
| POST | `/api/admin/config/welcome/preset` | `POST /api/admin/config/welcome/preset` |
| POST | `/api/admin/config/welcome/custom` | `POST /api/admin/config/welcome/custom` |
| DELETE | `/api/admin/config/welcome/custom` | `DELETE /api/admin/config/welcome/custom` |

Note: `GET /api/admin/config/:guildId` already proxied — only needs bot-side extension.

### Bot API endpoints (new/extended, in `bot.js`)
All protected by `authenticateAPIKey`.

**GET `/api/admin/config/:guildId`** (extended)  
Add `welcome` to the response:
```json
{
  "welcome": {
    "enabled": false,
    "channelId": null,
    "message": "Welcome to the server, @user!",
    "presets": { "preset_naval_blue": true, "preset_deep_purple": false },
    "customImages": [{ "id": "abc123", "url": "https://...", "label": "Gold Command" }]
  }
}
```

**POST `/api/admin/config/welcome`** — body: `{ guildId, enabled, channelId, message }`  
Saves all three fields to `guildConfig[guildId].welcome`. Persists via `saveGuildConfig`.

**POST `/api/admin/config/welcome/preset`** — body: `{ guildId, presetId, enabled }`  
Sets `guildConfig[guildId].welcome.presets[presetId] = enabled`. Persists.

**POST `/api/admin/config/welcome/custom`** — body: `{ guildId, url, label }`  
Validates URL is non-empty. Generates a short UUID for `id`. Pushes `{ id, url, label }` to `guildConfig[guildId].welcome.customImages`. Persists.

**DELETE `/api/admin/config/welcome/custom`** — body: `{ guildId, id }`  
Filters `customImages` array to remove the entry with matching `id`. Persists.

---

## Bot — Image Generation

### `systems/welcomeImageGenerator.js` (new file)

Exports one async function:

```js
async function generateWelcomeImage(backgroundUrl, avatarUrl, username, memberCount)
// Returns: Buffer (PNG)
```

**Steps:**
1. Download background image from `backgroundUrl` using `https` module
2. Resize/cover-crop background to 900×300px using `sharp`
3. Download avatar from `avatarUrl` (Discord CDN)
4. Resize avatar to 100×100px, apply circular mask via SVG clip, add 4px white border ring
5. Composite avatar onto background at position `{ left: 40, top: 100 }` (left-aligned, vertically centered)
6. Build SVG text overlay:
   - `"Welcome, {username}!"` — white, bold, 22px, at `(165, 145)`
   - `"Member #{memberCount}"` — white 50% opacity, 14px, at `(165, 170)`
7. Composite SVG text overlay onto image
8. Return PNG buffer via `sharp(...).png().toBuffer()`

**Error handling:** If background or avatar download fails, throws an error (caught by the event handler, which skips sending the image and logs the error).

---

## Bot — guildMemberAdd Handler

### Location: `bot.js` (new event listener registered in `setupEventListeners` or equivalent)

`generateWelcomeImage` and `PRESETS` are imported at the top of `bot.js` from `./systems/welcomeImageGenerator`. `AttachmentBuilder` is imported from `discord.js` (already used elsewhere in the bot).

```js
this.client.on('guildMemberAdd', async (member) => {
  const conf = this.guildConfigs.get(member.guild.id) || {};
  const welcome = conf.welcome;
  if (!welcome?.enabled || !welcome?.channelId) return;

  const channel = member.guild.channels.cache.get(welcome.channelId);
  if (!channel) return;

  // Resolve message text — substitute @user with Discord mention
  const text = (welcome.message || '').replace(/@user/g, `<@${member.id}>`);

  // Build active image pool
  const activePresets = PRESETS.filter(p => welcome.presets?.[p.id] !== false);
  const pool = [...activePresets, ...(welcome.customImages || [])];
  
  if (pool.length === 0) {
    // No images configured — send text only
    await channel.send(text);
    return;
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  const memberCount = member.guild.memberCount;

  try {
    const imageBuffer = await generateWelcomeImage(selected.url, avatarUrl, member.user.username, memberCount);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
    await channel.send({ content: text, files: [attachment] });
  } catch (err) {
    console.error('Welcome image generation failed:', err);
    await channel.send(text); // fallback to text-only
  }
});
```

---

## Bot — Persistence

`guildConfig[guildId].welcome` structure:
```json
{
  "enabled": false,
  "channelId": null,
  "message": "Welcome to the server, @user!",
  "presets": {},
  "customImages": []
}
```

Presets not listed in `presets` object default to **enabled** (opt-out model — all presets active until explicitly disabled).

Persisted via existing `saveGuildConfig(guildId, config)` — no schema changes required.

---

## Presets

Defined in `systems/welcomeImageGenerator.js` as a exported constant:

```js
const PRESETS = [
  { id: 'preset_1', url: 'TBD', label: 'Naval Blue' },
  { id: 'preset_2', url: 'TBD', label: 'Deep Purple' },
  // ... more added by project owner
];
```

URLs filled in by the project owner before deployment. The admin panel displays whatever is in this array.

---

## Error Handling

- Image generation failure → falls back to text-only message, logs error
- Invalid channel (deleted since config was saved) → silently skips, logs warning
- Custom image URL that fails to load → thumbnail shows a placeholder in the admin panel; generation failure handled as above
- Empty image pool → sends text-only message
- `@user` insert button: appends at textarea cursor position using `selectionStart`/`selectionEnd`
- Channel/role insert dropdowns: close on selection, append formatted mention at cursor
