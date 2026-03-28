# Battle Inventory Panel — Design Spec
**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Add an **🎒 Inventory** button to the battle sidebar's Actions section (below Damage Control, above End Turn). Clicking it opens a floating overlay panel where players can view all items they own and use active consumables during battle.

---

## UI Layer — GameView.js

### Inventory Button

Placed in the action buttons list between Damage Control and End Turn:

```
🔧 Damage Control
🎒 Inventory        ← new
✋ End Turn
```

Clicking toggles a `showInventory` boolean state. No action point cost to open/close.

### Inventory Overlay Panel

A `<div>` that floats over the sidebar (absolute/fixed positioned). Closed by clicking ✕ in the header.

**Structure:**
```
┌─────────────────────────────┐
│ 🎒 Inventory           ✕   │
├─────────────────────────────┤
│ CONSUMABLES                 │
│ 🔧 Repair Kit ×2            │
│   Heals 50 HP · 1 action  [USE] │
│ 🔥 Fire Suppression ×1      │
│   Extinguishes fire · Free [USE] │
│ ...                         │
├─────────────────────────────┤
│ EQUIPMENT (PASSIVE)         │
│ 📡 Advanced Radar           │
│   +10% accuracy, +2 range  ✓ ACTIVE │
│ ...                         │
└─────────────────────────────┘
```

**Item row fields:** emoji + name, quantity (consumables only), short description, action cost tag ("1 action" or "Free"), USE button or ACTIVE badge.

**Disable conditions for USE button:**
- All action-cost items: disabled when `actionsThisTurn >= maxActions`
- `fire_suppression`: disabled when `!player.onFire`
- `emergency_patch`: disabled when `!player.flooding`
- `decoy_buoy`: disabled when `!player.shipClass?.toLowerCase().includes('submarine')`
- `fuel_barrels`: disabled when `!player.shipClass?.toLowerCase().includes('carrier')`
- `air_support_marker`: always enabled if qty > 0 (opens targeting mode, not use-item)

### Static Item Metadata (frontend lookup table)

Item metadata lives in a constant in GameView.js — no metadata travels over the wire:

```js
const ITEM_META = {
  repair_kit:             { name: 'Repair Kit',            emoji: '🔧', desc: 'Heals 50 HP, clears status effects', action: true  },
  fire_suppression:       { name: 'Fire Suppression',      emoji: '🔥', desc: 'Extinguishes fires instantly',       action: false },
  emergency_patch:        { name: 'Emergency Patch',       emoji: '🩹', desc: 'Stops flooding instantly',           action: false },
  smoke_screen:           { name: 'Smoke Screen',          emoji: '💨', desc: '+50% evasion for 3 turns',           action: true  },
  lucky_charm:            { name: 'Lucky Charm',           emoji: '🍀', desc: '+25% crit chance for this battle',   action: true  },
  emergency_speed_boost:  { name: 'Emergency Speed Boost', emoji: '⚡', desc: '+3 speed for 2 turns (costs 10 HP)', action: true  },
  radar_jamming:          { name: 'Radar Jamming',         emoji: '📡', desc: '-20% enemy accuracy for 3 turns',    action: true  },
  decoy_buoy:             { name: 'Decoy Buoy',            emoji: '🪝', desc: 'Redirects torpedoes for 2 turns',    action: true  },
  combat_stimulants:      { name: 'Combat Stimulants',     emoji: '💉', desc: '+1 action point this turn',          action: true  },
  repair_ship_contract:   { name: 'Repair Ship Contract',  emoji: '🛠️', desc: '+40 HP/turn for 3 turns',           action: true  },
  fuel_barrels:           { name: 'Fuel Barrels',          emoji: '⛽', desc: '+5 fuel to all deployed aircraft',   action: true  },
  air_support_marker:     { name: 'Air Support Marker',    emoji: '✈️', desc: 'Call in bombers on a target',        action: true  },
};
```

Items not in this table (passive equipment) are listed in the Equipment section with their shop description and an ACTIVE badge.

### `air_support_marker` special case

Clicking USE on an air support marker closes the inventory panel and activates `airSupportTargeting` mode — the existing targeting flow — rather than calling `use-item`.

---

## State Layer — bot.js state endpoint

The `playersArray` mapping gains one new field per player:

```js
inventory: Object.fromEntries(
  this.getPlayerInventory(game.guildId, p.userId || p.id) ?? []
)
```

Returns a plain object `{ itemId: quantity, ... }` e.g. `{ repair_kit: 2, advanced_radar: 1 }`. Returns `{}` if the player has no inventory.

The existing boolean flags (`hasFighterRockets`, `hasApBombs`, `hasAllWeatherAircraft`, `hasAirSupportMarker`) remain unchanged — they are used by other parts of the UI.

---

## Backend — `POST /api/game/:channelId/use-item`

### server.js proxy

```js
app.post('/api/game/:channelId/use-item', ensureAuthenticated, async (req, res) => {
  const r = await botAPI.post(`/api/game/${req.params.channelId}/use-item`,
    { ...req.body, userId: req.user.id });
  res.json(r.data);
});
```

### bot.js endpoint

**Request body:** `{ userId, itemId }`

`guildId` is not in the request body — retrieve it from the active game:
```js
const game = this.activeGames.get(channelId);
const guildId = game.guildId;
```

**Validation (in order):**
1. Game exists
2. Player exists in game and is not sunk
3. Item is in player's inventory with qty > 0
4. If action-cost item: `player.actionsThisTurn < player.maxActions`
5. Item-specific conditions (ship class, status effects)

**Effect switch:**

| itemId | Effect |
|---|---|
| `repair_kit` | `player.currentHealth = Math.min(player.maxHealth, player.currentHealth + 50)`, clear `onFire`, `flooding`, `bleeding` status flags. Note: this is the only consumable that clears status; damage control is a cooldown-gated action that also clears status — both paths are valid. |
| `fire_suppression` | `player.onFire = false`, `player.fireTimer = 0` |
| `emergency_patch` | `player.flooding = false`, `player.floodTimer = 0` |
| `smoke_screen` | `player.smokeScreenTurns = 3`, `player.evasionBonus = (player.evasionBonus \|\| 0) + 50` |
| `lucky_charm` | If `player.luckyCharm` is already `true`, reject with "Lucky Charm already active". Otherwise set `player.luckyCharm = true`. During crit roll, add 25 percentage-points to the base crit chance before the roll: `critChance = baseCritChance + 0.25`. Flag persists for the whole battle (not per-turn). |
| `emergency_speed_boost` | `player.speedBoostTurns = 2`, `player.stats.speed += 3`, `player.currentHealth -= 10` |
| `radar_jamming` | `player.radarJammingTurns = 3` (applied as -20% accuracy to all enemies targeting this player) |
| `decoy_buoy` | `player.decoyBuoyTurns = 2` (torpedo redirect flag checked during incoming torpedo resolution) |
| `combat_stimulants` | `player.maxActions++`, `player.combatStimulantsBonus = (player.combatStimulantsBonus \|\| 0) + 1` (grants one extra action slot this turn only; the bonus is tracked so it can be reversed at turn end) |
| `repair_ship_contract` | `player.regenAmount = 40`, `player.regenTurns = 3` |
| `fuel_barrels` | Carrier-only item. Reject if `!player.shipClass?.toLowerCase().includes('carrier')` ("Carriers only"). Reject if no aircraft for this player exist in `game.aircraft` ("No deployed aircraft"). Otherwise add +5 fuel to each of this player's deployed aircraft. |

**After effect:**
- Decrement inventory qty; delete key if qty reaches 0
- Call `this.savePlayerData()`
- If action-cost item: `player.actionsThisTurn++`; if `actionsThisTurn >= maxActions`, call `this.endPlayerTurn(player)`
- Call `this.broadcastGameUpdate(channelId)`
- Send Discord channel message: `🎒 **PlayerName** used **Item Name**!`

**Response:** `{ success: true, message: '...' }`

### Turn tick — buff expiry

Add the following blocks to `processTurnEffects` (the function that already handles `fireTimer`, `floodTimer`, `damageControlCooldown`) for each player:

```js
// smoke_screen
if (player.smokeScreenTurns > 0) {
  player.smokeScreenTurns--;
  if (player.smokeScreenTurns === 0) {
    player.evasionBonus = Math.max(0, (player.evasionBonus || 0) - 50);
  }
}

// emergency_speed_boost
if (player.speedBoostTurns > 0) {
  player.speedBoostTurns--;
  if (player.speedBoostTurns === 0) {
    player.stats.speed = Math.max(0, (player.stats.speed || 0) - 3);
  }
}

// radar_jamming
if (player.radarJammingTurns > 0) {
  player.radarJammingTurns--;
  // Effect is a read-time check; no cleanup needed when counter hits 0
}

// decoy_buoy
if (player.decoyBuoyTurns > 0) {
  player.decoyBuoyTurns--;
  // Effect is a read-time check; no cleanup needed when counter hits 0
}

// repair_ship_contract (regen)
if (player.regenTurns > 0) {
  player.currentHealth = Math.min(player.maxHealth, player.currentHealth + player.regenAmount);
  player.regenTurns--;
  if (player.regenTurns === 0) {
    player.regenAmount = 0;
  }
}

// combat_stimulants — reverse bonus at turn end
if (player.combatStimulantsBonus > 0) {
  player.maxActions -= player.combatStimulantsBonus;
  player.combatStimulantsBonus = 0;
}
```

---

## Item Action Cost Reference

| Item | Action Cost |
|---|---|
| `fire_suppression` | **Free** |
| `emergency_patch` | **Free** |
| `repair_kit` | 1 action |
| `smoke_screen` | 1 action |
| `lucky_charm` | 1 action |
| `emergency_speed_boost` | 1 action |
| `radar_jamming` | 1 action |
| `decoy_buoy` | 1 action |
| `combat_stimulants` | 1 action |
| `repair_ship_contract` | 1 action |
| `fuel_barrels` | 1 action |
| `air_support_marker` | 1 action (existing flow) |

---

## Out of Scope

- Flagship items (fleet-wide buffs) — passive, already applied at character load time
- Equipment items bought in shop (radar, armor, engines, etc.) — passive, already applied
- Discord bot slash command to use items during battle — web UI only for now
- Buff icons or visual status indicators on the map for active buffs
