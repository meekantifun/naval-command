# Permanent Upgrade Toggle Design

## Overview

Players can activate or deactivate permanent equipment upgrades from the Characters section of the web dashboard. Once a battle is in progress, no toggle changes are allowed (neither activation nor deactivation) — upgrades are locked in for the duration of the battle.

---

## Scope

**In scope:**
- Toggle UI in CharacterManager.js showing owned equipment-type shop items
- `activeUpgrades` field stored on each character
- Two new bot.js API endpoints (battle-status check + toggle)
- Two new proxy routes in server.js
- Battle-lock: all toggles disabled while player is in an active game

**Out of scope:**
- Applying equipment stat bonuses to battle calculations (separate future feature)

---

## Data Model

### `character.activeUpgrades: string[]`

A new field on each character object storing item IDs of currently active upgrades:

```json
{
  "activeUpgrades": ["advanced_radar", "reinforced_armor"]
}
```

- Stored at: `playerData[guildId][userId].characters[charName].activeUpgrades`
- Defaults to `[]` when absent
- Only item IDs present in `EQUIPMENT_META` (defined below) are valid toggle targets
- Aircraft-loadout items (`fighter_rockets`, `ap_bombs`, `all_weather_aircraft`) have `type: 'equipment'` in the shop catalog but are excluded from this feature — they auto-apply on aircraft launch and have no persistent toggle concept
- An item must exist in `character.inventory` with qty ≥ 1 to be activatable

---

## API Endpoints

### `GET /api/player/battle-status`

**Query params:** `guildId`, `userId`

Scans `this.games` filtering by `game.guildId === guildId`, then checks `game.players.has(userId)`. The `guildId` filter prevents a false positive if the same Discord user ID appears in a game on a different guild.

**Response:**
```json
{ "inBattle": true }
```
or
```json
{ "inBattle": false }
```

### `PATCH /api/player/active-upgrades`

**Body:**
```json
{
  "guildId": "...",
  "userId": "...",
  "characterName": "...",
  "itemId": "advanced_radar",
  "active": true
}
```

**Validation:**
1. Player data and character exist
2. `itemId` exists in `shopSystem.shopItems` with `type: 'equipment'` AND is not in the excluded aircraft-loadout set (`fighter_rockets`, `ap_bombs`, `all_weather_aircraft`) — returns HTTP 400 with `{ error: "Item is not a toggleable upgrade" }` otherwise
3. `character.inventory` contains `itemId` with qty ≥ 1
4. Player is not currently in a battle (`this.games` filtered by `game.guildId === guildId`, then `game.players.has(userId)`) — returns HTTP 400 with `{ error: "Cannot change upgrades during battle" }` if in battle

**On success:**
- Ensure `character.activeUpgrades` is initialized to `[]` if undefined before any mutation
- If `active: true`: add `itemId` to `character.activeUpgrades` if not already present
- If `active: false`: filter `itemId` out of `character.activeUpgrades`
- Save player data
- Return `{ activeUpgrades: [...updatedArray] }`

---

## Server Proxy Routes (server.js)

Two new routes added after the existing admin proxy routes:

```
GET  /api/player/battle-status  → bot GET  /api/player/battle-status
PATCH /api/player/active-upgrades → bot PATCH /api/player/active-upgrades
```

Both pass `guildId` / `userId` from query/body through to the bot unchanged.

---

## Existing Endpoint Change

### `GET /api/admin/characters`

The bot-side handler spreads character data with `{ name, ...data, userId, isActive }`. Add an explicit `activeUpgrades: data.activeUpgrades ?? []` field to the spread so callers always receive an array regardless of whether the character was created before this feature shipped.

---

## Frontend — CharacterManager.js

### New constant: `EQUIPMENT_META`

Added at module level, mapping item IDs to display metadata:

```js
const EQUIPMENT_META = {
  // All classes
  advanced_radar:           { name: 'Advanced Radar System',              emoji: '📡', description: '+10% accuracy, +2 detection range' },
  reinforced_armor:         { name: 'Reinforced Armor Plating',           emoji: '🛡️', description: '+20 armor points' },
  improved_engines:         { name: 'Improved Engine System',             emoji: '⚡', description: '+1 speed, +5% evasion' },
  fire_control_system:      { name: 'Advanced Fire Control',              emoji: '🎯', description: '-reload time, +15% accuracy' },
  navigation_computer:      { name: 'Navigation Computer',                emoji: '🧭', description: '+1 movement range per turn' },
  rangefinder:              { name: 'Optical Rangefinder',                emoji: '🔭', description: '+8% accuracy, +1 attack range' },
  damage_control_team:      { name: 'Damage Control Team',                emoji: '🧯', description: '-30% fire/flood damage, halved status duration' },
  sonar_array:              { name: 'Surface Search Sonar',               emoji: '📻', description: 'Detects submarines within 4 cells' },
  medical_bay:              { name: 'Onboard Medical Bay',                emoji: '⚕️', description: '+8 HP regen at start of each turn' },
  camouflage_paint:         { name: 'Dazzle Camouflage Scheme',           emoji: '🎨', description: '+8% evasion vs long-range attacks' },
  crew_training:            { name: 'Elite Crew Training',                emoji: '👥', description: '+5% accuracy, +5% evasion, +3 armor' },
  // Destroyer
  high_speed_turbines:      { name: 'High-Speed Steam Turbines',          emoji: '💨', description: '+2 speed (Destroyer)' },
  torpedo_director:         { name: 'Torpedo Fire Director',              emoji: '🎯', description: '+20% torpedo accuracy, +15% flooding (Destroyer)' },
  depth_charge_racks:       { name: 'Depth Charge Racks',                 emoji: '💣', description: '60 dmg to submerged subs in adjacent cells (Destroyer)' },
  enhanced_smoke_gen:       { name: 'Enhanced Smoke Generator',           emoji: '🌫️', description: '+65% evasion for 4 turns (Destroyer)' },
  // Light Cruiser
  aa_director:              { name: 'AA Fire Director Mk. III',           emoji: '🛡️', description: '+30% AA damage, +2 AA range (Light Cruiser)' },
  high_pressure_boiler:     { name: 'High-Pressure Boiler System',        emoji: '⚙️', description: '+1 speed, +1 movement (Light Cruiser)' },
  // Light Cruiser + Heavy Cruiser
  scout_floatplane:         { name: 'OS2U Kingfisher Floatplane',         emoji: '🛩️', description: '+5 detection range, +12% long-range accuracy (Light/Heavy Cruiser)' },
  // Heavy Cruiser
  heavy_armor_belt:         { name: 'Heavy Side Armor Belt',              emoji: '🪨', description: '+40 armor (Heavy Cruiser)' },
  dual_purpose_mount:       { name: 'Dual-Purpose Gun Mount',             emoji: '🔫', description: '+20 AA damage, +10 secondary damage (Heavy Cruiser)' },
  type94_fire_director:     { name: 'Type 94 Fire Director',              emoji: '💻', description: '+20% accuracy, -shell spread at range (Heavy Cruiser)' },
  // Battleship
  turtleback_armor:         { name: 'Turtleback Armor Scheme',            emoji: '🛡️', description: '+60 armor, -below-waterline penetration (Battleship)' },
  secondary_battery_director: { name: 'Secondary Battery Director',       emoji: '🎯', description: '+35% secondary gun damage, +2 secondary range (Battleship)' },
  ford_rangekeeping:        { name: 'Ford Rangekeeping Computer',         emoji: '📐', description: '+25% accuracy beyond 5 cells (Battleship)' },
  conning_tower_armor:      { name: 'Conning Tower Reinforcement',        emoji: '🏰', description: '-40% chance of crew casualty crits (Battleship)' },
  // Aircraft Carrier
  armored_flight_deck:      { name: 'Armored Flight Deck',                emoji: '🛬', description: '-35% bomb/strafing damage to carrier (Carrier)' },
  expanded_hangar:          { name: 'Expanded Hangar Deck',               emoji: '🏗️', description: '+2 aircraft squadron capacity (Carrier)' },
  advanced_cic:             { name: 'Advanced Combat Information Center', emoji: '🖥️', description: '+15% aircraft damage, -1 rearm turn (Carrier)' },
  catapult_upgrade:         { name: 'H-4 Catapult Upgrade',               emoji: '🚀', description: '-1 launch delay turn (Carrier)' },
  // Submarine
  improved_periscope:       { name: 'High-Power Attack Periscope',        emoji: '🔭', description: 'Target from 6 cells while submerged (Submarine)' },
  silent_running:           { name: 'Silent Running System',              emoji: '🤫', description: '-40% sonar detection chance (Submarine)' },
  oxygen_recycler:          { name: 'Oxygen Recycling System',            emoji: '💨', description: '+4 turns before forced surface (Submarine)' },
  magnetic_detonator:       { name: 'Magnetic Torpedo Detonator',         emoji: '🧲', description: '+25% torpedo damage (Submarine)' },
  escape_hatch:             { name: 'Emergency Escape System',            emoji: '🆘', description: 'Survive one fatal hit at 1 HP (Submarine)' },
};
```

### New state

```js
const [battleStatuses, setBattleStatuses] = useState({});  // { [userId]: { inBattle: bool } }
```

### `loadCharacters()` change

After the existing character load completes, extract unique `userId` values from `characters`. For each, fire `GET /api/player/battle-status?guildId=X&userId=Y` in parallel. Store all results in `setBattleStatuses`.

### New `pendingUpgrades` state

```js
const [pendingUpgrades, setPendingUpgrades] = useState(new Set());
// entries are `${userId}:${characterName}:${itemId}`
```

Used to disable a toggle while its request is in flight, preventing duplicate concurrent requests.

### New `handleToggleUpgrade(char, itemId, newActive)`

```js
const handleToggleUpgrade = async (char, itemId, newActive) => {
  const key = `${char.userId}:${char.name}:${itemId}`;
  if (pendingUpgrades.has(key)) return;
  setPendingUpgrades(prev => new Set(prev).add(key));
  try {
    const res = await axios.patch('/api/player/active-upgrades', {
      guildId,
      userId: char.userId,
      characterName: char.name,
      itemId,
      active: newActive,
    }, { withCredentials: true });
    setCharacters(prev => prev.map(c =>
      c.userId === char.userId && c.name === char.name
        ? { ...c, activeUpgrades: res.data.activeUpgrades }
        : c
    ));
  } catch (err) {
    alert(err.response?.data?.error ?? 'Failed to update upgrade');
  } finally {
    setPendingUpgrades(prev => { const n = new Set(prev); n.delete(key); return n; });
  }
};
```

Toggle input renders `disabled` if `pendingUpgrades.has(key)` (in addition to the `inBattle` check).

### New "⚙️ Upgrades" section in character card JSX

Rendered inside `{isExpanded && ...}` block, after the AA Systems section and before the GM Controls section.

Conditions:
- Only renders if `char.inventory` contains at least one key present in `EQUIPMENT_META`
- `inBattle` is `battleStatuses[char.userId]?.inBattle ?? false`
- `activeUpgrades` is `char.activeUpgrades ?? []`

Per upgrade row:
- Toggle is an `<input type="checkbox">` rendered as a CSS toggle switch
- `checked = activeUpgrades.includes(itemId)`
- `disabled = inBattle || pendingUpgrades.has(key)` where `key = \`${char.userId}:${char.name}:${itemId}\``
- On change: calls `handleToggleUpgrade(char, itemId, !checked)`
- If `inBattle`: show `🔒 In battle` badge alongside the disabled toggle
- If `inBattle` and any upgrades are active: show note "Active upgrades are locked for the duration of the battle"

---

## Rendering of `char.inventory`

`char.inventory` is returned as a plain object `{ itemId: qty }` from the `/api/admin/characters` endpoint (consistent with how inventory is handled in the state endpoint). Filter keys by `itemId in EQUIPMENT_META` to get the equipment list.

---

## Error States

| Scenario | Handling |
|---|---|
| Player tries to toggle while `inBattle` | Toggle is `disabled` — click never fires. 400 response from server is a safety net only. |
| No equipment items in inventory | Upgrades section does not render |
| `battleStatuses` not yet loaded | Treat as `inBattle: false` (toggles enabled while status loads) |
| Network error on toggle | `alert()` with server error message |
| Rapid double-click on toggle | `pendingUpgrades` set prevents second request firing |
| Player joins battle after page load | `battleStatuses` is a snapshot from page load — toggles remain enabled in UI. The server-side 400 guard catches any stale toggle attempt. This is an acceptable trade-off; users refresh the page to pick up the latest battle status. |
