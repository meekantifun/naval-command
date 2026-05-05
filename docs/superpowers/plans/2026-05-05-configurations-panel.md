# Configurations Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Configurations" tab to the Admin Panel that lets staff manage `/aicanspeak`, `/roleplay`, `/setgm`, `/setlogchannel`, and `/setmsglogchannel` as per-guild persistent settings from the web UI.

**Architecture:** Each config setting gets a dedicated bot HTTP API endpoint that runs the same logic as the Discord slash command. A thin proxy layer in the web server forwards requests. A new `ConfigurationsPanel` React component renders five independent cards. `aicanspeak` and `roleplay` are migrated from global runtime state to per-guild `guildConfig.json`.

**Tech Stack:** Discord.js (bot), Express (web server), React (frontend), axios, existing `staffRoleManager.js` and `messageLogger.js` systems.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `bot.js` | Add 8 new HTTP endpoints; update `handleAICanSpeak` and `setRoleplayMode` to persist per-guild; update game init to read per-guild roleplay config |
| Modify | `handlers/eventHandler.js` | Read `aiSpeakChance` from per-guild guildConfig instead of global bot property |
| Modify | `web-server/src/server.js` | Add 8 proxy routes forwarding to bot API |
| Create | `web-server/client/src/components/ConfigurationsPanel.js` | Five config cards with fetch, save, inline feedback |
| Create | `web-server/client/src/components/ConfigurationsPanel.css` | Card layout and toggle/search styles |
| Modify | `web-server/client/src/components/AdminPanel.js` | Add fourth "Configurations" tab |

---

## Task 1: Persist aicanspeak per-guild in bot.js

**Files:**
- Modify: `bot.js` at `handleAICanSpeak` (~line 19123)
- Modify: `handlers/eventHandler.js` (~line 36)

- [ ] **Step 1: Update `handleAICanSpeak` to save per-guild**

Replace the entire `handleAICanSpeak` method body in `bot.js` (lines 19123–19143):

```js
async handleAICanSpeak(interaction) {
    const raw = interaction.options.getString('value').trim().toLowerCase();
    const guildId = interaction.guildId;
    let chance;

    if (raw === 'false') {
        chance = 0;
    } else if (raw === 'true') {
        chance = 1.0;
    } else {
        const num = parseInt(raw, 10);
        if (isNaN(num) || num < 1 || num > 100) {
            return interaction.reply({ content: '❌ Value must be `true`, `false`, or a number from **1–100** (percentage chance).', ephemeral: true });
        }
        chance = num / 100;
    }

    const config = this.guildConfigs.get(guildId) || {};
    config.aiSpeakChance = chance;
    this.saveGuildConfig(guildId, config);

    if (chance === 0) return interaction.reply({ content: '🔇 AI personality responses are now **disabled** for this server.' });
    if (chance === 1.0) return interaction.reply({ content: '🔊 AI personality responses are now **always on** for this server.' });
    const pct = Math.round(chance * 100);
    return interaction.reply({ content: `🎲 AI personality responses set to **${pct}%** for this server.` });
}
```

- [ ] **Step 2: Update `eventHandler.js` to read per-guild aiSpeakChance**

In `handlers/eventHandler.js`, line 36, replace:
```js
const chance = this.bot.aiSpeakChance ?? 1.0;
```
with:
```js
const guildConf = this.bot.guildConfigs.get(message.guild?.id) || {};
const chance = guildConf.aiSpeakChance ?? 1.0;
```

- [ ] **Step 3: Commit**

```bash
git add bot.js handlers/eventHandler.js
git commit -m "feat: persist aicanspeak per-guild in guildConfig"
```

---

## Task 2: Persist roleplay per-guild in bot.js

**Files:**
- Modify: `bot.js` at `setRoleplayMode` (~line 19988) and game init (~line 1688)

- [ ] **Step 1: Update `setRoleplayMode` to save per-guild**

In `bot.js`, inside `setRoleplayMode`, add a save call in **both** branches. After line 20044 (`if (aiPause !== null) this.aiPause = aiPause;`) in the `else` block, add:

```js
// Save per-guild defaults
const guildId = interaction.guildId;
const gConfig = this.guildConfigs.get(guildId) || {};
gConfig.roleplay = { enabled, timeoutMs, aiPause: this.aiPause };
this.saveGuildConfig(guildId, gConfig);
```

Also save in the active-game branch, after line 20028 (`console.log(...)`), add:

```js
const guildId = interaction.guildId;
const gConfig = this.guildConfigs.get(guildId) || {};
gConfig.roleplay = { enabled, timeoutMs, aiPause: game.aiPause };
this.saveGuildConfig(guildId, gConfig);
```

- [ ] **Step 2: Apply per-guild roleplay to new games at init**

In `bot.js`, after line 1688 (`game.guildId = interaction.guildId;`), add:

```js
// Apply per-guild roleplay defaults if configured
const guildRoleplay = (this.guildConfigs.get(interaction.guildId) || {}).roleplay;
if (guildRoleplay) {
    game.roleplayMode = guildRoleplay.enabled;
    game.roleplayTimeout = guildRoleplay.timeoutMs;
    game.aiPause = guildRoleplay.aiPause ?? false;
}
```

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: persist roleplay settings per-guild in guildConfig"
```

---

## Task 3: Add GET /api/admin/config/:guildId and GET /api/admin/guild/:guildId/metadata to bot.js

**Files:**
- Modify: `bot.js` (add near the other admin API endpoints, after line ~23116)

- [ ] **Step 1: Add GET /api/admin/config/:guildId**

Add this endpoint in `bot.js` after the existing guild-config endpoints:

```js
// GET /api/admin/config/:guildId — returns current state for all Configurations panel settings
app.get('/api/admin/config/:guildId', authenticateAPIKey, (req, res) => {
    const { guildId } = req.params;
    const guildConf = this.guildConfigs.get(guildId) || {};
    const guild = this.client.guilds.cache.get(guildId);

    // aicanspeak
    const aiSpeakChance = guildConf.aiSpeakChance ?? 1.0;
    const aicanspeak = { enabled: aiSpeakChance > 0, chance: Math.round(aiSpeakChance * 100) };

    // roleplay
    const rp = guildConf.roleplay || {};
    const timeoutMs = rp.timeoutMs ?? 300000;
    const roleplay = {
        enabled: rp.enabled ?? true,
        timeout: this.formatTimeout(timeoutMs).replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' seconds', 's').replace(' second', 's'),
        aipause: rp.aiPause ?? false
    };

    // setgm — read staff config
    const staffRoleId = this.staffRoleManager.getStaffRoleId(guildId);
    const staffRole = staffRoleId && guild ? guild.roles.cache.get(staffRoleId) : null;
    let staffUserIds = [];
    try {
        const configPath = this.staffRoleManager.getConfigPath(guildId);
        const raw = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
        staffUserIds = raw.staffUserIds || [];
    } catch {}
    const users = staffUserIds.map(id => {
        const member = guild?.members.cache.get(id);
        return { id, displayName: member?.user?.tag ?? id };
    });
    const setgm = { roleId: staffRoleId ?? null, roleName: staffRole?.name ?? null, users };

    // setlogchannel (console log channel stored in guildConfig)
    const logChannelId = guildConf.logChannelId ?? null;
    const logChannel = logChannelId && guild ? guild.channels.cache.get(logChannelId) : null;
    const setlogchannel = { channelId: logChannelId, channelName: logChannel?.name ?? null };

    // setmsglogchannel
    const msgLogChannelId = this.messageLogger ? (this.messageLogger.getLogChannel(guildId) ?? null) : null;
    const msgLogChannel = msgLogChannelId && guild ? guild.channels.cache.get(msgLogChannelId) : null;
    const setmsglogchannel = { channelId: msgLogChannelId, channelName: msgLogChannel?.name ?? null };

    res.json({ aicanspeak, roleplay, setgm, setlogchannel, setmsglogchannel });
});
```

- [ ] **Step 2: Add GET /api/admin/guild/:guildId/metadata**

```js
// GET /api/admin/guild/:guildId/metadata — text channels and roles for dropdowns
app.get('/api/admin/guild/:guildId/metadata', authenticateAPIKey, (req, res) => {
    const { guildId } = req.params;
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { ChannelType } = require('discord.js');
    const channels = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const roles = guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id)
        .map(r => ({ id: r.id, name: r.name, position: r.position }))
        .sort((a, b) => b.position - a.position);

    res.json({ channels, roles });
});
```

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: add GET config and metadata bot API endpoints"
```

---

## Task 4: Add save endpoints for aicanspeak, roleplay, setgm to bot.js

**Files:**
- Modify: `bot.js`

- [ ] **Step 1: Add POST /api/admin/config/aicanspeak**

```js
// POST /api/admin/config/aicanspeak — { guildId, value: "true"|"false"|"50" }
app.post('/api/admin/config/aicanspeak', authenticateAPIKey, (req, res) => {
    const { guildId, value } = req.body;
    if (!guildId || value === undefined) return res.status(400).json({ error: 'guildId and value required' });

    const raw = String(value).trim().toLowerCase();
    let chance;
    if (raw === 'false') {
        chance = 0;
    } else if (raw === 'true') {
        chance = 1.0;
    } else {
        const num = parseInt(raw, 10);
        if (isNaN(num) || num < 1 || num > 100) return res.status(400).json({ error: 'value must be true, false, or 1-100' });
        chance = num / 100;
    }

    const config = this.guildConfigs.get(guildId) || {};
    config.aiSpeakChance = chance;
    this.saveGuildConfig(guildId, config);
    res.json({ success: true, aiSpeakChance: chance });
});
```

- [ ] **Step 2: Add POST /api/admin/config/roleplay**

```js
// POST /api/admin/config/roleplay — { guildId, enabled, timeout, aipause }
app.post('/api/admin/config/roleplay', authenticateAPIKey, (req, res) => {
    const { guildId, enabled, timeout, aipause } = req.body;
    if (!guildId || enabled === undefined) return res.status(400).json({ error: 'guildId and enabled required' });

    const timeoutMs = this.parseTimeString(timeout || '5m') ?? 300000;

    // Apply to any active games in this guild
    for (const [, game] of this.games) {
        if (game.guildId === guildId) {
            game.roleplayMode = enabled;
            game.roleplayTimeout = timeoutMs;
            if (aipause !== undefined) game.aiPause = aipause;
        }
    }

    // Persist per-guild
    const config = this.guildConfigs.get(guildId) || {};
    config.roleplay = { enabled, timeoutMs, aiPause: aipause ?? false };
    this.saveGuildConfig(guildId, config);
    res.json({ success: true });
});
```

- [ ] **Step 3: Add POST and DELETE /api/admin/config/setgm**

```js
// POST /api/admin/config/setgm — { guildId, roleId? } or { guildId, userId? }
app.post('/api/admin/config/setgm', authenticateAPIKey, (req, res) => {
    const { guildId, roleId, userId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'guildId required' });
    if (!roleId && !userId) return res.status(400).json({ error: 'roleId or userId required' });

    if (roleId) {
        this.staffRoleManager.setStaffRoleId(guildId, roleId);
    } else {
        this.staffRoleManager.addStaffUser(guildId, userId);
    }
    res.json({ success: true });
});

// DELETE /api/admin/config/setgm — { guildId, roleId? } or { guildId, userId? }
app.delete('/api/admin/config/setgm', authenticateAPIKey, (req, res) => {
    const { guildId, roleId, userId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'guildId required' });
    if (!roleId && !userId) return res.status(400).json({ error: 'roleId or userId required' });

    if (roleId) {
        this.staffRoleManager.removeStaffRole(guildId);
    } else {
        this.staffRoleManager.removeStaffUser(guildId, userId);
    }
    res.json({ success: true });
});
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: add aicanspeak, roleplay, setgm bot API endpoints"
```

---

## Task 5: Add setlogchannel and setmsglogchannel endpoints to bot.js

**Files:**
- Modify: `bot.js`

- [ ] **Step 1: Add POST /api/admin/config/setlogchannel**

```js
// POST /api/admin/config/setlogchannel — { guildId, channelId } (channelId null to clear)
app.post('/api/admin/config/setlogchannel', authenticateAPIKey, (req, res) => {
    const { guildId, channelId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'guildId required' });

    const config = this.guildConfigs.get(guildId) || {};
    if (channelId) {
        config.logChannelId = channelId;
        this.setLoggingChannel(channelId);
    } else {
        delete config.logChannelId;
        this.loggingChannelId = null;
        if (this.logFlushInterval) {
            clearInterval(this.logFlushInterval);
            this.logFlushInterval = null;
        }
    }
    this.saveGuildConfig(guildId, config);
    res.json({ success: true });
});
```

- [ ] **Step 2: Add POST /api/admin/config/setmsglogchannel**

```js
// POST /api/admin/config/setmsglogchannel — { guildId, channelId } (channelId null to clear)
app.post('/api/admin/config/setmsglogchannel', authenticateAPIKey, async (req, res) => {
    const { guildId, channelId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'guildId required' });
    if (!this.messageLogger) return res.status(500).json({ error: 'Message logger not initialized' });

    try {
        if (channelId) {
            await this.messageLogger.setLogChannel(guildId, channelId);
        } else {
            await this.messageLogger.removeLogChannel(guildId);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

- [ ] **Step 3: On bot startup, apply persisted logChannelId from guildConfig**

In `loadGuildConfig(guildId)` (line 854), after the existing try/catch block, add:

```js
loadGuildConfig(guildId) {
    const filePath = `./servers/${this.getGuildFolderName(guildId)}/guildConfig.json`;
    try {
        this.guildConfigs.set(guildId, JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch { this.guildConfigs.set(guildId, {}); }

    // Restore persisted log channel
    const conf = this.guildConfigs.get(guildId);
    if (conf?.logChannelId) this.setLoggingChannel(conf.logChannelId);
}
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: add setlogchannel and setmsglogchannel bot API endpoints"
```

---

## Task 6: Add proxy routes in web-server/src/server.js

**Files:**
- Modify: `web-server/src/server.js` (add after the existing guild-config routes near line ~891)

- [ ] **Step 1: Add GET proxy routes**

```js
// Configurations panel — fetch current config state
app.get('/api/admin/config/:guildId', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.get(`/api/admin/config/${req.params.guildId}`);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});

// Guild channels and roles for dropdowns
app.get('/api/admin/guild/:guildId/metadata', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.get(`/api/admin/guild/${req.params.guildId}/metadata`);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});
```

- [ ] **Step 2: Add POST proxy routes**

```js
app.post('/api/admin/config/aicanspeak', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.post('/api/admin/config/aicanspeak', req.body);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});

app.post('/api/admin/config/roleplay', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.post('/api/admin/config/roleplay', req.body);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});

app.post('/api/admin/config/setgm', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.post('/api/admin/config/setgm', req.body);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});

app.delete('/api/admin/config/setgm', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.delete('/api/admin/config/setgm', { data: req.body });
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});

app.post('/api/admin/config/setlogchannel', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.post('/api/admin/config/setlogchannel', req.body);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});

app.post('/api/admin/config/setmsglogchannel', ensureAuthenticated, async (req, res) => {
    try {
        const response = await botAPI.post('/api/admin/config/setmsglogchannel', req.body);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Bot API error' });
    }
});
```

- [ ] **Step 3: Commit**

```bash
git add web-server/src/server.js
git commit -m "feat: add Configurations panel proxy routes to web server"
```

---

## Task 7: Create ConfigurationsPanel.js (base + aicanspeak + roleplay cards)

**Files:**
- Create: `web-server/client/src/components/ConfigurationsPanel.js`

- [ ] **Step 1: Create the file with data fetching and aicanspeak + roleplay cards**

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConfigurationsPanel.css';

function Toggle({ value, onChange }) {
  return (
    <button
      className={`config-toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <span className="toggle-knob" />
    </button>
  );
}

function CardFeedback({ status }) {
  if (!status) return null;
  return (
    <div className={`card-feedback ${status.type}`}>
      {status.message}
    </div>
  );
}

function AiCanSpeakCard({ guildId, initial }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [chance, setChance] = useState(initial?.chance ?? 100);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    setStatus(null);
    const value = !enabled ? 'false' : String(chance);
    try {
      await axios.post('/api/admin/config/aicanspeak', { guildId, value }, { withCredentials: true });
      setStatus({ type: 'success', message: 'Saved!' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">/aicanspeak</div>
          <div className="config-card-desc">Control whether AI responds to player messages in chat</div>
        </div>
        <div className={`config-status-badge ${enabled ? 'active' : 'inactive'}`}>
          {enabled ? 'ENABLED' : 'DISABLED'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">AI Responses</span>
          <Toggle value={enabled} onChange={setEnabled} />
          <span className="config-value-hint">{enabled ? 'On' : 'Off'}</span>
        </div>
        <div className={`config-row ${!enabled ? 'dimmed' : ''}`}>
          <span className="config-label">Response Chance</span>
          <input
            type="number"
            className="config-number-input"
            min={1}
            max={100}
            value={chance}
            disabled={!enabled}
            onChange={e => setChance(Math.min(100, Math.max(1, Number(e.target.value))))}
          />
          <span className="config-value-hint">%</span>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <button className="config-save-btn" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

function RoleplayCard({ guildId, initial }) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [timeout, setTimeout2] = useState(initial?.timeout ?? '5m');
  const [aipause, setAipause] = useState(initial?.aipause ?? false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    setStatus(null);
    try {
      await axios.post('/api/admin/config/roleplay', { guildId, enabled, timeout, aipause }, { withCredentials: true });
      setStatus({ type: 'success', message: 'Saved!' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save. Please try again.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">/roleplay</div>
          <div className="config-card-desc">Toggle roleplay mode and set player response timeout</div>
        </div>
        <div className={`config-status-badge ${enabled ? 'active' : 'inactive'}`}>
          {enabled ? 'ENABLED' : 'DISABLED'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">Roleplay Mode</span>
          <Toggle value={enabled} onChange={setEnabled} />
          <span className="config-value-hint">{enabled ? 'On' : 'Off'}</span>
        </div>
        <div className={`config-row ${!enabled ? 'dimmed' : ''}`}>
          <span className="config-label">Timeout</span>
          <input
            type="text"
            className="config-text-input"
            placeholder="5m"
            value={timeout2}
            disabled={!enabled}
            onChange={e => setTimeout2(e.target.value)}
          />
          <span className="config-value-hint">e.g. 5m, 2h, 30s</span>
        </div>
        <div className={`config-row ${!enabled ? 'dimmed' : ''}`}>
          <span className="config-label">AI Pause</span>
          <Toggle value={aipause} onChange={setAipause} />
          <span className="config-value-hint">Pause after AI turn for GM narration</span>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <button className="config-save-btn" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

function ConfigurationsPanel({ guildId }) {
  const [config, setConfig] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      axios.get(`/api/admin/config/${guildId}`, { withCredentials: true }),
      axios.get(`/api/admin/guild/${guildId}/metadata`, { withCredentials: true })
    ]).then(([configRes, metaRes]) => {
      setConfig(configRes.data);
      setMetadata(metaRes.data);
    }).catch(() => setLoadError('Failed to load configuration. Is the bot online?'));
  }, [guildId]);

  if (loadError) {
    return <div className="config-load-error">{loadError}</div>;
  }

  if (!config || !metadata) {
    return <div className="config-loading">Loading configurations...</div>;
  }

  return (
    <div className="configurations-panel">
      <AiCanSpeakCard guildId={guildId} initial={config.aicanspeak} />
      <RoleplayCard guildId={guildId} initial={config.roleplay} />
      {/* SetGmCard and channel cards added in later tasks */}
    </div>
  );
}

export default ConfigurationsPanel;
```

- [ ] **Step 2: Verify file was created correctly**

```bash
ls web-server/client/src/components/ConfigurationsPanel.js
```

Expected: file exists, no error.

- [ ] **Step 3: Commit**

```bash
git add web-server/client/src/components/ConfigurationsPanel.js
git commit -m "feat: add ConfigurationsPanel with aicanspeak and roleplay cards"
```

---

## Task 8: Add SetGmCard with searchable role picker to ConfigurationsPanel.js

**Files:**
- Modify: `web-server/client/src/components/ConfigurationsPanel.js`

- [ ] **Step 1: Add SetGmCard component** 

Add this component above the `ConfigurationsPanel` function:

```jsx
function SetGmCard({ guildId, initial, roles }) {
  const [currentRole, setCurrentRole] = useState(
    initial?.roleId ? { id: initial.roleId, name: initial.roleName } : null
  );
  const [users, setUsers] = useState(initial?.users ?? []);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [status, setStatus] = useState(null);

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const showFeedback = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSelectRole = async (role) => {
    setDropdownOpen(false);
    setSearch('');
    try {
      await axios.post('/api/admin/config/setgm', { guildId, roleId: role.id }, { withCredentials: true });
      setCurrentRole(role);
      showFeedback('success', `GM role set to @${role.name}`);
    } catch {
      showFeedback('error', 'Failed to set GM role.');
    }
  };

  const handleRemoveRole = async () => {
    try {
      await axios.delete('/api/admin/config/setgm', { data: { guildId, roleId: currentRole.id }, withCredentials: true });
      setCurrentRole(null);
      showFeedback('success', 'GM role removed.');
    } catch {
      showFeedback('error', 'Failed to remove GM role.');
    }
  };

  const handleAddUser = async () => {
    if (!newUserId.trim()) return;
    try {
      await axios.post('/api/admin/config/setgm', { guildId, userId: newUserId.trim() }, { withCredentials: true });
      setUsers(prev => [...prev, { id: newUserId.trim(), displayName: newUserId.trim() }]);
      setNewUserId('');
      showFeedback('success', 'User added as GM.');
    } catch {
      showFeedback('error', 'Failed to add user.');
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete('/api/admin/config/setgm', { data: { guildId, userId }, withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== userId));
      showFeedback('success', 'User removed.');
    } catch {
      showFeedback('error', 'Failed to remove user.');
    }
  };

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">/setgm</div>
          <div className="config-card-desc">Grant GM permissions to a role or individual users</div>
        </div>
        <div className={`config-status-badge ${currentRole || users.length ? 'active' : 'inactive'}`}>
          {currentRole || users.length ? 'CONFIGURED' : 'NOT SET'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-section-label">GM Role</div>
        {currentRole && (
          <div className="config-tag">
            <span>@ {currentRole.name}</span>
            <button className="config-tag-remove" onClick={handleRemoveRole}>✕</button>
          </div>
        )}
        <div className="config-role-search-wrapper">
          <input
            type="text"
            className="config-text-input full"
            placeholder="Search roles..."
            value={search}
            onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          />
          {dropdownOpen && filteredRoles.length > 0 && (
            <div className="config-role-dropdown">
              {filteredRoles.map(r => (
                <div key={r.id} className="config-role-option" onMouseDown={() => handleSelectRole(r)}>
                  <span className="role-at">@</span> {r.name}
                </div>
              ))}
              <div className="config-role-dropdown-footer">
                Showing {filteredRoles.length} of {roles.length} roles
              </div>
            </div>
          )}
        </div>

        <div className="config-section-label" style={{ marginTop: '16px' }}>Individual GM Users</div>
        {users.map(u => (
          <div key={u.id} className="config-user-row">
            <span>{u.displayName}</span>
            <button className="config-remove-link" onClick={() => handleRemoveUser(u.id)}>Remove</button>
          </div>
        ))}
        <div className="config-row" style={{ marginTop: '8px' }}>
          <input
            type="text"
            className="config-text-input"
            placeholder="Discord user ID..."
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddUser()}
          />
          <button className="config-add-btn" onClick={handleAddUser}>Add</button>
        </div>
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire SetGmCard into ConfigurationsPanel render**

In the `ConfigurationsPanel` return, replace the `{/* SetGmCard ... */}` comment with:

```jsx
<SetGmCard guildId={guildId} initial={config.setgm} roles={metadata.roles} />
```

- [ ] **Step 3: Commit**

```bash
git add web-server/client/src/components/ConfigurationsPanel.js
git commit -m "feat: add SetGmCard with searchable role picker"
```

---

## Task 9: Add log channel cards to ConfigurationsPanel.js

**Files:**
- Modify: `web-server/client/src/components/ConfigurationsPanel.js`

- [ ] **Step 1: Add reusable LogChannelCard component**

Add this above `ConfigurationsPanel`:

```jsx
function LogChannelCard({ guildId, channels, apiPath, title, description, initial }) {
  const [channelId, setChannelId] = useState(initial?.channelId ?? '');
  const [status, setStatus] = useState(null);

  const showFeedback = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = async () => {
    if (!channelId) return showFeedback('error', 'Select a channel first.');
    try {
      await axios.post(apiPath, { guildId, channelId }, { withCredentials: true });
      showFeedback('success', 'Saved!');
    } catch {
      showFeedback('error', 'Failed to save. Please try again.');
    }
  };

  const handleClear = async () => {
    try {
      await axios.post(apiPath, { guildId, channelId: null }, { withCredentials: true });
      setChannelId('');
      showFeedback('success', 'Cleared.');
    } catch {
      showFeedback('error', 'Failed to clear.');
    }
  };

  const currentChannel = channels.find(c => c.id === channelId);

  return (
    <div className="config-card">
      <div className="config-card-header">
        <div>
          <div className="config-card-title">{title}</div>
          <div className="config-card-desc">{description}</div>
        </div>
        <div className={`config-status-badge ${channelId ? 'active' : 'inactive'}`}>
          {channelId ? 'SET' : 'NOT SET'}
        </div>
      </div>
      <div className="config-card-body">
        <div className="config-row">
          <span className="config-label">Channel</span>
          <select
            className="config-select"
            value={channelId}
            onChange={e => setChannelId(e.target.value)}
          >
            <option value="">— Select a channel —</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </div>
        {currentChannel && (
          <div className="config-current-hint">Currently: #{currentChannel.name}</div>
        )}
      </div>
      <div className="config-card-footer">
        <CardFeedback status={status} />
        <div className="config-footer-actions">
          <button className="config-clear-btn" onClick={handleClear}>Clear</button>
          <button className="config-save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire both log channel cards into ConfigurationsPanel render**

In `ConfigurationsPanel`, add after `<SetGmCard .../>`:

```jsx
<LogChannelCard
  guildId={guildId}
  channels={metadata.channels}
  apiPath="/api/admin/config/setlogchannel"
  title="/setlogchannel"
  description="Set the channel for console/bot logging"
  initial={config.setlogchannel}
/>
<LogChannelCard
  guildId={guildId}
  channels={metadata.channels}
  apiPath="/api/admin/config/setmsglogchannel"
  title="/setmsglogchannel"
  description="Set the channel for message edit/delete logging"
  initial={config.setmsglogchannel}
/>
```

- [ ] **Step 3: Commit**

```bash
git add web-server/client/src/components/ConfigurationsPanel.js
git commit -m "feat: add log channel cards to ConfigurationsPanel"
```

---

## Task 10: CSS and wire ConfigurationsPanel into AdminPanel

**Files:**
- Create: `web-server/client/src/components/ConfigurationsPanel.css`
- Modify: `web-server/client/src/components/AdminPanel.js`

- [ ] **Step 1: Create ConfigurationsPanel.css**

```css
.configurations-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.config-card {
  background: var(--bg-secondary, #1e2030);
  border: 1px solid var(--border-color, #313244);
  border-radius: 10px;
  overflow: hidden;
}

.config-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color, #313244);
}

.config-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #cdd6f4);
  font-family: monospace;
}

.config-card-desc {
  font-size: 12px;
  color: var(--text-muted, #7c8db5);
  margin-top: 3px;
}

.config-status-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border-radius: 4px;
  white-space: nowrap;
}

.config-status-badge.active { background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
.config-status-badge.inactive { background: rgba(88, 91, 112, 0.2); color: #7c8db5; }

.config-card-body {
  padding: 14px 20px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.config-row.dimmed {
  opacity: 0.4;
  pointer-events: none;
}

.config-label {
  font-size: 13px;
  color: var(--text-muted, #7c8db5);
  min-width: 130px;
}

.config-value-hint {
  font-size: 12px;
  color: var(--text-muted, #585b70);
}

.config-number-input {
  width: 64px;
  background: var(--bg-input, #313244);
  border: 1px solid var(--border-color, #45475a);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text-primary, #cdd6f4);
  font-size: 13px;
  text-align: center;
}

.config-text-input {
  background: var(--bg-input, #313244);
  border: 1px solid var(--border-color, #45475a);
  border-radius: 6px;
  padding: 7px 12px;
  color: var(--text-primary, #cdd6f4);
  font-size: 13px;
  width: 120px;
}

.config-text-input.full { width: 100%; box-sizing: border-box; }

.config-select {
  flex: 1;
  background: var(--bg-input, #313244);
  border: 1px solid var(--border-color, #45475a);
  border-radius: 6px;
  padding: 7px 12px;
  color: var(--text-primary, #cdd6f4);
  font-size: 13px;
}

/* Toggle */
.config-toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.config-toggle.on { background: #89b4fa; }
.config-toggle.off { background: #45475a; }
.toggle-knob {
  position: absolute;
  top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s;
}
.config-toggle.on .toggle-knob { left: 23px; }
.config-toggle.off .toggle-knob { left: 3px; }

/* Card footer */
.config-card-footer {
  padding: 10px 20px 14px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--border-color, #313244);
}

.config-footer-actions {
  display: flex;
  gap: 8px;
}

.config-save-btn {
  background: #89b4fa;
  color: #1e1e2e;
  border: none;
  border-radius: 6px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.config-save-btn:hover { background: #a6c8ff; }

.config-clear-btn {
  background: transparent;
  color: var(--text-muted, #7c8db5);
  border: 1px solid var(--border-color, #45475a);
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
}

.config-clear-btn:hover { border-color: #f38ba8; color: #f38ba8; }

.config-add-btn {
  background: #89b4fa;
  color: #1e1e2e;
  border: none;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Feedback */
.card-feedback {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
}
.card-feedback.success { color: #a6e3a1; background: rgba(166, 227, 161, 0.1); }
.card-feedback.error { color: #f38ba8; background: rgba(243, 139, 168, 0.1); }

/* SetGm card */
.config-section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted, #7c8db5);
  margin-bottom: 8px;
}

.config-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input, #313244);
  border-radius: 6px;
  padding: 5px 12px;
  color: var(--text-primary, #cdd6f4);
  font-size: 13px;
  margin-bottom: 8px;
}

.config-tag-remove {
  background: none;
  border: none;
  color: #f38ba8;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}

.config-role-search-wrapper { position: relative; }

.config-role-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1e2030;
  border: 1px solid #45475a;
  border-radius: 6px;
  z-index: 20;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.config-role-option {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-primary, #cdd6f4);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-role-option:hover { background: #313244; }

.role-at { color: #89b4fa; }

.config-role-dropdown-footer {
  border-top: 1px solid #313244;
  padding: 6px 14px;
  font-size: 11px;
  color: #585b70;
}

.config-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-input, #313244);
  border-radius: 6px;
  padding: 7px 12px;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-primary, #cdd6f4);
}

.config-remove-link {
  background: none;
  border: none;
  color: #f38ba8;
  font-size: 12px;
  cursor: pointer;
}

.config-current-hint {
  font-size: 11px;
  color: var(--text-muted, #585b70);
  margin-top: -4px;
  padding-left: 2px;
}

.config-loading, .config-load-error {
  padding: 40px;
  text-align: center;
  color: var(--text-muted, #7c8db5);
  font-size: 14px;
}
```

- [ ] **Step 2: Add the Configurations tab to AdminPanel.js**

In `AdminPanel.js`, add the import at the top:

```js
import ConfigurationsPanel from './ConfigurationsPanel';
```

In the tabs section (after the "Start Game" button, ~line 106):

```jsx
<button
  className={activeTab === 'configurations' ? 'active' : ''}
  onClick={() => setActiveTab('configurations')}
>
  Configurations
</button>
```

In the content section (after the `game` block, ~line 118):

```jsx
{activeTab === 'configurations' && (
  <ConfigurationsPanel guildId={selectedGuild?.id} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add web-server/client/src/components/ConfigurationsPanel.css web-server/client/src/components/AdminPanel.js
git commit -m "feat: add Configurations tab to AdminPanel and CSS"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `/aicanspeak` — toggle + number input, per-guild, persisted: Tasks 1, 4, 7
- ✅ `/roleplay` — toggle + timeout + aipause, per-guild, persisted: Tasks 2, 4, 7
- ✅ `/setgm` — searchable role dropdown + user list + add/remove: Tasks 4, 8
- ✅ `/setlogchannel` — channel dropdown, save/clear: Tasks 5, 6, 9
- ✅ `/setmsglogchannel` — channel dropdown, save/clear: Tasks 5, 6, 9
- ✅ Card-per-setting layout (style B): Task 10 CSS
- ✅ Per-guild persistence (survives restarts): Tasks 1, 2, 5
- ✅ Load all config in one fetch on mount: Task 7 `ConfigurationsPanel`
- ✅ Load channels/roles in parallel: Task 7 `Promise.all`
- ✅ Inline success/error feedback per card: `CardFeedback` + `showFeedback`

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency:**
- `staffRoleManager.setStaffRoleId` / `addStaffUser` / `removeStaffUser` / `removeStaffRole` all confirmed present in `systems/staffRoleManager.js`
- `this.saveGuildConfig(guildId, config)` signature confirmed at line 861
- `this.parseTimeString` confirmed at line 141, `this.formatTimeout` at line 167
- `this.messageLogger.setLogChannel` / `removeLogChannel` / `getLogChannel` confirmed in `moderation/messageLogger.js`
- `this.setLoggingChannel(channelId)` confirmed at line 360
