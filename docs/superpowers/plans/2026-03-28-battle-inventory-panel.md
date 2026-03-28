# Battle Inventory Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Inventory button to the battle sidebar that opens a floating overlay where players can view all owned items and use consumables during battle.

**Architecture:** Four independent changes wired together: (1) the bot state endpoint gains an `inventory` field so the frontend sees item quantities, (2) GameView.js gains a button + overlay panel + ITEM_META lookup table, (3) a new `/api/game/:channelId/use-item` endpoint in bot.js executes item effects and saves data, proxied through server.js, (4) `processTurnEffects` in bot.js gains buff expiry blocks for the six new timed buffs.

**Tech Stack:** React (useState), Express proxy (server.js → bot.js), Discord.js bot handler, CSS overlay

**Spec:** `docs/superpowers/specs/2026-03-28-battle-inventory-panel-design.md`

---

## File Map

| File | Change |
|------|--------|
| `bot.js` | Add `inventory` field to playersArray (~line 20243); add `/api/game/:channelId/use-item` endpoint (~line 21769); add buff expiry blocks to `processTurnEffects` (~line 17876) |
| `web-server/src/server.js` | Add use-item proxy route (~line 494) |
| `web-server/client/src/components/GameView.js` | Add `showInventory` state; add Inventory button; add ITEM_META constant; add InventoryPanel JSX |
| `web-server/client/src/components/GameView.css` | Add `.inventory-overlay` and child styles |

---

### Task 1: Expose inventory in the state endpoint

**Files:**
- Modify: `bot.js:20243`

The `playersArray` mapping is at bot.js line 20216–20244. Add `inventory` as the last field before the closing `}))`.

- [ ] **Step 1: Add `inventory` field to playersArray**

  In `bot.js`, find the `hasAirSupportMarker` line (line 20243) and add the new field after it:

  ```js
  // existing last line:
  hasAirSupportMarker: this.getInventoryCount(game.guildId, p.userId || p.id, 'air_support_marker') > 0,
  // ADD both fields:
  luckyCharm: p.luckyCharm ?? false,
  inventory: Object.fromEntries(
    this.getPlayerInventory(game.guildId, p.userId || p.id) ?? []
  )
  ```

  `getPlayerInventory` returns a `Map<itemId, quantity>` or null. `?? []` produces an empty iterable so `Object.fromEntries` returns `{}` when the player has no inventory.

- [ ] **Step 2: Verify manually**

  Start the bot and open the web UI during a battle. Open browser DevTools → Network, find a WebSocket or polling call that returns the game state, and verify each player object now has an `inventory` field (`{}` if empty, `{ repair_kit: 2, ... }` if items are present).

- [ ] **Step 3: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: expose player inventory in game state endpoint"
  ```

---

### Task 2: Add `showInventory` state and Inventory button (GameView.js)

**Files:**
- Modify: `web-server/client/src/components/GameView.js`

- [ ] **Step 1: Add state declaration**

  After line 208 (`const [gmAIAttackTarget, setGmAIAttackTarget] = useState('');`), add:

  ```js
  const [showInventory, setShowInventory] = useState(false);
  ```

- [ ] **Step 2: Add Inventory button between Damage Control and Air Support**

  Find the closing `</button>` of the Damage Control button (line 1410). After it, insert:

  ```jsx
  <button
    className="btn btn-info"
    onClick={() => setShowInventory(v => !v)}
  >
    🎒 Inventory
    {selectedPlayer.inventory && Object.keys(selectedPlayer.inventory).length > 0 &&
      ` (${Object.values(selectedPlayer.inventory).reduce((a, b) => a + b, 0)})`}
  </button>
  ```

  This shows a count of total consumable items in brackets (e.g. "🎒 Inventory (3)") when the player has any.

- [ ] **Step 3: Verify button appears**

  Run the dev server (`cd web-server/client && npm start`). Open a battle. Confirm the Inventory button appears between Damage Control and Air Support/End Turn.

- [ ] **Step 4: Commit**

  ```bash
  git add web-server/client/src/components/GameView.js
  git commit -m "feat: add Inventory toggle button to battle sidebar"
  ```

---

### Task 3: Add ITEM_META constant and InventoryPanel component (GameView.js)

**Files:**
- Modify: `web-server/client/src/components/GameView.js`

- [ ] **Step 1: Add ITEM_META constant**

  Near the top of `GameView.js`, after the `import` statements and before the component function declaration, add:

  ```js
  const ITEM_META = {
    repair_kit:            { name: 'Repair Kit',            emoji: '🔧', desc: 'Heals 50 HP, clears status effects',   action: true  },
    fire_suppression:      { name: 'Fire Suppression',      emoji: '🔥', desc: 'Extinguishes fires instantly',         action: false },
    emergency_patch:       { name: 'Emergency Patch',       emoji: '🩹', desc: 'Stops flooding instantly',             action: false },
    smoke_screen:          { name: 'Smoke Screen',          emoji: '💨', desc: '+50% evasion for 3 turns',             action: true  },
    lucky_charm:           { name: 'Lucky Charm',           emoji: '🍀', desc: '+25% crit chance for this battle',     action: true  },
    emergency_speed_boost: { name: 'Emergency Speed Boost', emoji: '⚡', desc: '+3 speed for 2 turns (costs 10 HP)',   action: true  },
    radar_jamming:         { name: 'Radar Jamming',         emoji: '📡', desc: '-20% enemy accuracy for 3 turns',      action: true  },
    decoy_buoy:            { name: 'Decoy Buoy',            emoji: '🪝', desc: 'Redirects torpedoes for 2 turns',      action: true  },
    combat_stimulants:     { name: 'Combat Stimulants',     emoji: '💉', desc: '+1 action point this turn',            action: true  },
    repair_ship_contract:  { name: 'Repair Ship Contract',  emoji: '🛠️', desc: '+40 HP/turn for 3 turns',             action: true  },
    fuel_barrels:          { name: 'Fuel Barrels',          emoji: '⛽', desc: '+5 fuel to all deployed aircraft',     action: true  },
    air_support_marker:    { name: 'Air Support Marker',    emoji: '✈️', desc: 'Call in bombers on a target',          action: true  },
  };
  ```

- [ ] **Step 2: Add `handleUseItem` function**

  Inside the component function, near the other handler functions (e.g. alongside `handleDamageControl`), add:

  ```js
  const handleUseItem = async (itemId) => {
    if (itemId === 'air_support_marker') {
      setShowInventory(false);
      setAirSupportTargeting(true);
      return;
    }
    try {
      const r = await fetch(`/api/game/${channelId}/use-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await r.json();
      if (!data.success) alert(data.error || 'Failed to use item');
    } catch (err) {
      console.error('use-item error', err);
    }
  };
  ```

  Note: `channelId` is already available in `GameView.js` as a prop or from the URL.

- [ ] **Step 3: Add the InventoryPanel JSX**

  Immediately before the closing `</div>` of the sidebar action buttons section (just before the `<p className="action-help">` line at ~line 1426), insert:

  ```jsx
  {showInventory && (
    <div className="inventory-overlay">
      <div className="inventory-header">
        <span>🎒 Inventory</span>
        <button className="inventory-close" onClick={() => setShowInventory(false)}>✕</button>
      </div>

      {/* Consumables */}
      <div className="inventory-section-label">Consumables</div>
      {(() => {
        const inv = selectedPlayer.inventory || {};
        const consumables = Object.entries(inv).filter(([id]) => ITEM_META[id]);
        if (consumables.length === 0) {
          return <div className="inventory-empty">No consumables</div>;
        }
        return consumables.map(([id, qty]) => {
          const meta = ITEM_META[id];
          const noActions    = meta.action && selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions;
          const classCheck   = id === 'decoy_buoy'       && !selectedPlayer.shipClass?.toLowerCase().includes('submarine');
          const carrierCheck = id === 'fuel_barrels'     && !selectedPlayer.shipClass?.toLowerCase().includes('carrier');
          const fireCheck    = id === 'fire_suppression' && !selectedPlayer.onFire;
          const floodCheck   = id === 'emergency_patch'  && !selectedPlayer.flooding;
          const charmCheck   = id === 'lucky_charm'      && selectedPlayer.luckyCharm;
          const disabled = noActions || classCheck || carrierCheck || fireCheck || floodCheck || charmCheck;
          return (
            <div key={id} className={`inventory-item${disabled ? ' inventory-item--disabled' : ''}`}>
              <div className="inventory-item-info">
                <div className="inventory-item-name">
                  {meta.emoji} {meta.name} <span className="inventory-qty">×{qty}</span>
                </div>
                <div className="inventory-item-desc">
                  {meta.desc} · {meta.action ? '1 action' : 'Free'}
                </div>
              </div>
              <button
                className="inventory-use-btn"
                disabled={disabled}
                onClick={() => handleUseItem(id)}
              >
                USE
              </button>
            </div>
          );
        });
      })()}

      {/* Equipment (passive) */}
      {(() => {
        const inv = selectedPlayer.inventory || {};
        const passives = Object.entries(inv).filter(([id]) => !ITEM_META[id]);
        if (passives.length === 0) return null;
        return (
          <>
            <div className="inventory-section-label" style={{ marginTop: 10 }}>Equipment (Passive)</div>
            {passives.map(([id]) => (
              <div key={id} className="inventory-item">
                <div className="inventory-item-info">
                  <div className="inventory-item-name" style={{ color: '#94a3b8' }}>
                    ⚙️ {id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                </div>
                <span className="inventory-active-badge">✓ ACTIVE</span>
              </div>
            ))}
          </>
        );
      })()}
    </div>
  )}
  ```

- [ ] **Step 4: Check that `channelId` is available**

  Search the component for how `channelId` is accessed (it's likely from `props.channelId` or `useParams()`). Adjust the `fetch` URL in `handleUseItem` if needed.

- [ ] **Step 5: Verify panel opens/closes**

  In dev server, click the Inventory button — the panel should appear. Click ✕ to close. Verify consumables and passives render correctly with USE buttons.

- [ ] **Step 6: Commit**

  ```bash
  git add web-server/client/src/components/GameView.js
  git commit -m "feat: add inventory overlay panel with item metadata and USE buttons"
  ```

---

### Task 4: Add CSS for the inventory overlay

**Files:**
- Modify: `web-server/client/src/components/GameView.css`

- [ ] **Step 1: Add inventory styles**

  Append at the end of `GameView.css`:

  ```css
  /* ── Inventory Overlay ─────────────────────────────────── */
  .inventory-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: #0f172a;
    border: 1px solid #4ade80;
    border-radius: 8px;
    padding: 10px;
    z-index: 50;
    max-height: 420px;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  }

  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #334155;
    color: #4ade80;
    font-weight: bold;
    font-size: 13px;
  }

  .inventory-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    line-height: 1;
  }

  .inventory-close:hover { color: #e2e8f0; }

  .inventory-section-label {
    color: #94a3b8;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
  }

  .inventory-empty {
    color: #64748b;
    font-size: 11px;
    padding: 4px 0;
  }

  .inventory-item {
    background: #1e293b;
    border-radius: 5px;
    padding: 6px 8px;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  }

  .inventory-item--disabled { opacity: 0.45; }

  .inventory-item-info { flex: 1; min-width: 0; }

  .inventory-item-name {
    color: #e2e8f0;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .inventory-qty { color: #94a3b8; }

  .inventory-item-desc {
    color: #64748b;
    font-size: 9px;
    margin-top: 2px;
  }

  .inventory-use-btn {
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 10px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .inventory-use-btn:disabled {
    background: #374151;
    color: #64748b;
    cursor: not-allowed;
  }

  .inventory-active-badge {
    color: #4ade80;
    font-size: 9px;
    font-weight: bold;
    flex-shrink: 0;
  }
  ```

- [ ] **Step 2: Verify layout**

  Open the inventory panel in the dev server. Confirm: header with ✕, section labels, item rows with USE buttons, disabled state visually dimmed.

- [ ] **Step 3: Commit**

  ```bash
  git add web-server/client/src/components/GameView.css
  git commit -m "feat: add inventory overlay CSS styles"
  ```

---

### Task 5: Add use-item proxy route (server.js)

**Files:**
- Modify: `web-server/src/server.js:494`

- [ ] **Step 1: Add proxy after start-battle (line 494)**

  After the closing `});` of the `start-battle` route (line 494), insert:

  ```js
  app.post('/api/game/:channelId/use-item', ensureAuthenticated, async (req, res) => {
    try {
      const r = await botAPI.post(`/api/game/${req.params.channelId}/use-item`,
        { ...req.body, userId: req.user.id });
      res.json(r.data);
    } catch (error) {
      console.error('[use-item proxy]', error.message, 'status:', error.response?.status, 'data:', JSON.stringify(error.response?.data));
      res.status(error.response?.status || 500).json({ error: error.response?.data?.error || error.message || 'Failed to use item' });
    }
  });
  ```

- [ ] **Step 2: Restart server and verify route exists**

  Restart the web server and confirm the route responds (a POST to `/api/game/test/use-item` without auth should return 401, not 404).

- [ ] **Step 3: Commit**

  ```bash
  git add web-server/src/server.js
  git commit -m "feat: add use-item proxy route to web server"
  ```

---

### Task 6: Add use-item endpoint (bot.js)

**Files:**
- Modify: `bot.js:21769`

- [ ] **Step 1: Add the endpoint after start-battle (line 21769)**

  After the closing `});` of the `start-battle` endpoint (line 21769), insert the full handler:

  ```js
  app.post('/api/game/:channelId/use-item', authenticateAPIKey, async (req, res) => {
      try {
          const { channelId } = req.params;
          const { userId, itemId } = req.body;

          // 1. Game exists
          const game = this.games.get(channelId);
          if (!game) return res.status(404).json({ error: 'No active game in this channel' });

          const guildId = game.guildId;

          // 2. Player exists and is not sunk
          const player = game.players.get(userId);
          if (!player) return res.status(404).json({ error: 'Player not found in this game' });
          if (player.sunk || !player.alive) return res.status(400).json({ error: 'Your ship has been sunk' });

          // 3. Item in inventory with qty > 0
          const qty = this.getInventoryCount(guildId, userId, itemId);
          if (qty <= 0) return res.status(400).json({ error: 'Item not in inventory' });

          // 4. Action-cost check (look up whether this item costs an action)
          const ACTION_COST_ITEMS = new Set([
              'repair_kit','smoke_screen','lucky_charm','emergency_speed_boost',
              'radar_jamming','decoy_buoy','combat_stimulants','repair_ship_contract',
              'fuel_barrels','air_support_marker'
          ]);
          const costAction = ACTION_COST_ITEMS.has(itemId);
          const actionsUsed = player.actionsThisTurn ?? 0;
          const maxActions  = player.maxActions ?? 2;
          if (costAction && actionsUsed >= maxActions) {
              return res.status(400).json({ error: 'No actions remaining this turn' });
          }

          // 5. Item-specific conditions
          if (itemId === 'fire_suppression' && !player.onFire) {
              return res.status(400).json({ error: 'You are not on fire' });
          }
          if (itemId === 'emergency_patch' && !player.flooding) {
              return res.status(400).json({ error: 'You are not flooding' });
          }
          if (itemId === 'decoy_buoy' && !player.shipClass?.toLowerCase().includes('submarine')) {
              return res.status(400).json({ error: 'Decoy Buoy is for Submarines only' });
          }
          if (itemId === 'fuel_barrels') {
              if (!player.shipClass?.toLowerCase().includes('carrier')) {
                  return res.status(400).json({ error: 'Fuel Barrels are for Carriers only' });
              }
              const hasAircraft = game.aircraft && [...game.aircraft.values()].some(
                  ac => (ac.owner === userId || ac.carrierID === userId) && ac.alive
              );
              if (!hasAircraft) return res.status(400).json({ error: 'No deployed aircraft' });
          }
          if (itemId === 'lucky_charm' && player.luckyCharm) {
              return res.status(400).json({ error: 'Lucky Charm is already active' });
          }

          // Apply effect
          switch (itemId) {
              case 'repair_kit':
                  player.currentHealth = Math.min(player.maxHealth, player.currentHealth + 50);
                  player.onFire     = false;
                  player.flooding   = false;
                  player.bleeding   = false;
                  break;
              case 'fire_suppression':
                  player.onFire     = false;
                  player.fireTimer  = 0;
                  break;
              case 'emergency_patch':
                  player.flooding   = false;
                  player.floodTimer = 0;
                  break;
              case 'smoke_screen':
                  player.smokeScreenTurns = 3;
                  player.evasionBonus = (player.evasionBonus || 0) + 50;
                  break;
              case 'lucky_charm':
                  player.luckyCharm = true;
                  break;
              case 'emergency_speed_boost':
                  player.speedBoostTurns = 2;
                  player.stats.speed = (player.stats.speed || 0) + 3;
                  player.currentHealth = Math.max(0, player.currentHealth - 10);
                  break;
              case 'radar_jamming':
                  player.radarJammingTurns = 3;
                  break;
              case 'decoy_buoy':
                  player.decoyBuoyTurns = 2;
                  break;
              case 'combat_stimulants':
                  player.maxActions = (player.maxActions || 2) + 1;
                  player.combatStimulantsBonus = (player.combatStimulantsBonus || 0) + 1;
                  break;
              case 'repair_ship_contract':
                  player.regenAmount = 40;
                  player.regenTurns  = 3;
                  break;
              case 'fuel_barrels':
                  for (const ac of game.aircraft.values()) {
                      if ((ac.owner === userId || ac.carrierID === userId) && ac.alive) {
                          ac.fuel = (ac.fuel || 0) + 5;
                      }
                  }
                  break;
          }

          // Decrement inventory
          const inventory = this.getPlayerInventory(guildId, userId);
          const newQty = (inventory.get(itemId) || 0) - 1;
          if (newQty <= 0) inventory.delete(itemId);
          else inventory.set(itemId, newQty);
          await this.savePlayerData();

          // Charge action if applicable
          if (costAction) {
              player.actionsThisTurn = (player.actionsThisTurn || 0) + 1;
              if (player.actionsThisTurn >= player.maxActions) {
                  this.endPlayerTurn(player);
              }
          }

          await this.broadcastGameUpdate(channelId);

          // Discord message
          const itemName = itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const channel  = this.client.channels.cache.get(channelId);
          if (channel) channel.send(`🎒 **${player.username || player.characterAlias}** used **${itemName}**!`).catch(() => {});

          res.json({ success: true, message: `Used ${itemName}` });
      } catch (error) {
          console.error('Error in use-item endpoint:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
  ```

- [ ] **Step 2: Verify `endPlayerTurn` signature**

  The definition at bot.js line 6212 is `endPlayerTurn(player)` — takes only `player`, no `game`/`channelId` (it scans `this.games` internally). The call in Step 1 already uses this signature.

- [ ] **Step 3: Manual smoke test**

  In the web UI, open Inventory, click USE on a Repair Kit. Verify:
  - HP increases (or status is cleared if already full HP)
  - Item quantity decrements (panel updates on next state poll)
  - Discord channel shows the used-item message
  - Action counter increments correctly

- [ ] **Step 4: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: add use-item endpoint with full item effect switch"
  ```

---

### Task 7: Add buff expiry to processTurnEffects (bot.js)

**Files:**
- Modify: `bot.js:17876`

`processTurnEffects` currently ends at line 17899 with `return messages;`. Insert buff expiry logic before the `return` statement, after the existing `damageControlCooldown` block (line 17876):

- [ ] **Step 1: Add buff expiry blocks**

  Find the comment `// Process cooldowns` section (line 17873–17876) and add directly after the `damageControlCooldown` block:

  ```js
  // Process item buff expiry
  if (player.smokeScreenTurns > 0) {
      player.smokeScreenTurns--;
      if (player.smokeScreenTurns === 0) {
          player.evasionBonus = Math.max(0, (player.evasionBonus || 0) - 50);
      }
  }

  if (player.speedBoostTurns > 0) {
      player.speedBoostTurns--;
      if (player.speedBoostTurns === 0) {
          if (player.stats) player.stats.speed = Math.max(0, (player.stats.speed || 0) - 3);
      }
  }

  if (player.radarJammingTurns > 0) {
      player.radarJammingTurns--;
  }

  if (player.decoyBuoyTurns > 0) {
      player.decoyBuoyTurns--;
  }

  if (player.regenTurns > 0) {
      player.currentHealth = Math.min(player.maxHealth, player.currentHealth + (player.regenAmount || 0));
      player.regenTurns--;
      if (player.regenTurns === 0) player.regenAmount = 0;
  }

  if (player.combatStimulantsBonus > 0) {
      player.maxActions -= player.combatStimulantsBonus;
      player.combatStimulantsBonus = 0;
  }
  ```

- [ ] **Step 2: Verify expiry messages (optional)**

  The existing pattern adds strings to `messages` for notable events. If desired, add a message when regen heals: `if (player.regenTurns > 0) messages.push(\`⚕️ ${player.shipClass} regenerates ${player.regenAmount} HP from Repair Contract.\`);`

- [ ] **Step 3: Manual smoke test**

  Use a Smoke Screen in battle. After the third turn tick, verify the `evasionBonus` is removed (the player no longer has elevated evasion).

- [ ] **Step 4: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: add buff expiry for all inventory timed effects in processTurnEffects"
  ```

---

## Deploy Checklist

After all tasks are committed locally:

- [ ] Build the React app: `cd web-server/client && NODE_OPTIONS='--max-old-space-size=512' npx react-scripts build`
- [ ] Upload changed files to VPS: bot.js, web-server/src/server.js, and the React build output
- [ ] Restart PM2 services: `pm2 restart naval-bot naval-web`
- [ ] Verify in live environment: open inventory panel, use a Repair Kit, check Discord message appears
