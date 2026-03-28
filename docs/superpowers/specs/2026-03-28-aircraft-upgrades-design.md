# Aircraft Upgrades: Fighter Rockets & AP Bombs — Design Spec

## Goal

Add two permanent carrier upgrade items to the shop. When equipped, they auto-apply a loadout to all fighters/dive bombers launched from that carrier, use custom icons, and change combat behaviour.

## Architecture

Two new shop items (`fighter_rockets`, `ap_bombs`) act as permanent carrier upgrades. When a carrier launches aircraft via **either the web endpoint or the Discord flow**, the relevant flags are stamped onto the aircraft object at creation time via `createAircraftSquadron`'s `options` parameter. Combat logic and icon rendering read those flags from the aircraft — no inventory re-checking later.

## Tech Stack

- `systems/shopSystem.js` — item definitions
- `bot.js` — state endpoint flags, web `launch-aircraft` endpoint, Discord pre-launch intercept
- `systems/carrierSystem.js` — `createAircraftSquadron` (add `hasRockets` field, targets push), `calculateAircraftDamage` (rockets vs ships, AP bomb modifiers fix)
- `web-server/client/src/components/GameMap.js` — icon loading and rendering

---

## Shop Items

Both items are non-stackable, rare, permanent carrier upgrades available to Aircraft Carrier and Light Aircraft Carrier only.

| Field | Fighter Rockets | AP Bombs |
|---|---|---|
| ID | `fighter_rockets` | `ap_bombs` |
| Name | Fighter Rockets | AP Bombs |
| Category | `aircraft` | `aircraft` |
| Type | `equipment` | `equipment` |
| Price | 2,500 credits | 2,000 credits |
| Rarity | `rare` | `rare` |
| Requirements | `shipClass: ['Aircraft Carrier', 'Light Aircraft Carrier']` | `shipClass: ['Aircraft Carrier', 'Light Aircraft Carrier']` |
| Stackable | `false` | `false` |
| Emoji | `🚀` | `💣` |

---

## Aircraft Creation (carrierSystem.js — createAircraftSquadron)

Add `hasRockets` to the aircraft object alongside the existing `depthCharges` and `bombType` fields:

```js
hasRockets: options.hasRockets || false,  // Fighters only
depthCharges: options.depthCharges || false,
bombType: options.bombType || null,
```

After the existing depth-charges targets block, add a rockets block:

```js
if (aircraft.hasRockets && aircraft.type === 'fighter') {
    aircraft.targets.push('ship');
}
```

This ensures the upstream target-validation logic sees 'ship' as a valid target for rocket fighters.

---

## Launch Logic

Both the **web endpoint** and the **Discord flow** must intercept before aircraft creation and pass the right options.

### Web endpoint (bot.js — `launch-aircraft`)

Before calling `createAircraftSquadron`, check the player's inventory and build an `equipment` object. Use `this.getGuildPlayerData(game.guildId, userId)` — NOT `this.playerData.get(userId)` (playerData is guild-keyed):

```js
const pd = this.getGuildPlayerData(game.guildId, userId);
const equipment = {};
if (aircraftType === 'fighter' && (pd?.inventory?.get('fighter_rockets') ?? 0) > 0) {
    equipment.hasRockets = true;
}
if (aircraftType === 'dive_bomber' && (pd?.inventory?.get('ap_bombs') ?? 0) > 0) {
    equipment.bombType = 'ap';
}

const aircraft = this.carrierSystem.createAircraftSquadron(
    aircraftType, squadronSize, spawnPosition, 'player', player.id, equipment
);
```

Currently the endpoint passes `{}` as the equipment argument — replace that `{}` with the `equipment` variable above.

Also fix the existing hurricane check at line 20863 which has the same wrong accessor:
```js
// Before (wrong):
const pd = this.playerData.get(userId);
// After (correct):
const pd = this.getGuildPlayerData(game.guildId, userId);
```

### Discord flow (bot.js — inside the `try` block, **before** the `getLaunchOptions` call at line 9835)

The intercept must be placed before `getLaunchOptions` is called — not between it and `showEquipmentSelection` — so the entire options/selection path is skipped. Insert at the top of the `try` block (line 9833):

```js
try {
    // NEW: intercept for permanent shop upgrades — bypass equipment selection entirely
    const playerDataForLaunch = this.playerData.get(interaction.user.id);
    const autoEquipment = {};
    let autoLaunch = false;

    if (aircraftType === 'fighter' && (playerDataForLaunch?.inventory?.get('fighter_rockets') ?? 0) > 0) {
        autoEquipment.hasRockets = true;
        autoLaunch = true;
    } else if (aircraftType === 'dive_bomber' && (playerDataForLaunch?.inventory?.get('ap_bombs') ?? 0) > 0) {
        autoEquipment.bombType = 'ap';
        autoLaunch = true;
    }

    if (autoLaunch) {
        const fullSquadronId = `squadron_${squadronId}`;
        await this.launchAircraftSquadron(interaction, gamePlayer, game, aircraftType, squadronSize, hangarCost, autoEquipment, availableAircraftData, fullSquadronId);
        return; // skip the existing getLaunchOptions path below
    }
    // Note: use getGuildPlayerData(interaction.guildId, interaction.user.id) above for playerDataForLaunch,
    // NOT this.playerData.get(userId) — playerData is a guild-keyed Map.

    // Existing path unchanged:
    const options = this.carrierSystem.getLaunchOptions ? this.carrierSystem.getLaunchOptions(shipClass, aircraftType) : {};
    if (Object.keys(options).length > 0) {
        await this.showEquipmentSelection(...);
    } else {
        await this.launchAircraftSquadron(...);
    }
}
```

Players **without** the shop item fall through to the existing `getLaunchOptions` / `showEquipmentSelection` flow unchanged.

---

## State Endpoint (bot.js)

Two new boolean fields added to each player object in the state endpoint. Use `this.getGuildPlayerData(game.guildId, ...)` — the existing `hasAllWeatherAircraft` uses `this.playerData.get(...)` which is wrong (guild-keyed Map). Fix all three IIFEs together:

```js
hasAllWeatherAircraft: (() => {
    const pd = this.getGuildPlayerData(game.guildId, p.userId || p.id);
    return (pd?.inventory?.get('all_weather_aircraft') ?? 0) > 0;
})(),
hasFighterRockets: (() => {
    const pd = this.getGuildPlayerData(game.guildId, p.userId || p.id);
    return (pd?.inventory?.get('fighter_rockets') ?? 0) > 0;
})(),
hasApBombs: (() => {
    const pd = this.getGuildPlayerData(game.guildId, p.userId || p.id);
    return (pd?.inventory?.get('ap_bombs') ?? 0) > 0;
})()
```

---

## Combat Mechanics (carrierSystem.js — calculateAircraftDamage)

### Fighter Rockets

**Current:** The `else` branch in the fighter block returns `0` for ship targets. Additionally, the web `attack-aircraft` endpoint at line 21021 has a separate guard:
```js
if (aircraft.type === 'fighter' && !targetIsAircraft && !aircraft.depthCharges) {
    return res.status(400).json({ error: 'Fighters can only attack aircraft...' });
}
```

**Changes required in two places:**

1. Update the attack endpoint guard (bot.js line 21021) to also allow rockets:
```js
if (aircraft.type === 'fighter' && !targetIsAircraft && !aircraft.depthCharges && !aircraft.hasRockets) {
    return res.status(400).json({ error: 'Fighters can only attack aircraft (or submarines with depth charges)' });
}
```

2. Add a rockets branch before the final `return 0` in `calculateAircraftDamage`:

```js
} else if (aircraft.hasRockets) {
    // Rockets vs ships — normal fighter base damage (~61% of dive bomber)
    // No ship-class modifier
} else {
    return 0;
}
```

Fighter `baseDamage: 40` vs dive bomber `baseDamage: 65` = ~61% — satisfies the "moderate damage" goal without a separate multiplier.

Note: `findSuitableTarget` (used by the AI auto-engage path) does not need updating — shop items are player-only, so rocket fighters will never be AI-owned.

### AP Bombs — fix substring bug + add missing ship classes

The existing code uses `target.shipClass.includes('Carrier')` which incorrectly matches "Light Aircraft Carrier" as a heavy-ship bonus (+30%). Replace the entire AP bomb block with exact-match equality to fix this and add the missing Light Cruiser / Light Aircraft Carrier penalty:

```js
if (aircraft.bombType === 'ap') {
    if (target.shipClass === 'Battleship' ||
        target.shipClass === 'Heavy Cruiser' ||
        target.shipClass === 'Aircraft Carrier') {
        baseDamage *= 1.3; // +30% vs heavy ships
    } else if (target.shipClass === 'Destroyer' ||
               target.shipClass === 'Submarine' ||
               target.shipClass === 'Light Cruiser' ||
               target.shipClass === 'Light Aircraft Carrier') {
        baseDamage *= 0.4; // −60% vs light ships
    }
    // All other classes: no modifier
}
```

| Target | Modifier |
|---|---|
| Battleship, Heavy Cruiser, Aircraft Carrier | +30% |
| Destroyer, Submarine, Light Cruiser, Light Aircraft Carrier | −60% |
| All others | None |

---

## Icon Rendering (GameMap.js)

### Loading

Add `fighter_rockets` and `dive_bomber_AP` to the type list in the icon load loop (following the existing cache-bust pattern — `?v=3` for player set only):

```js
for (const set of ['player', 'ally', 'enemy']) {
    for (const atype of ['recon', 'fighter', 'dive_bomber', 'torpedo_bomber',
                         'fighter_rockets', 'dive_bomber_AP']) {
        const bust = set === 'player' ? '?v=3' : '';
        toLoad.push([`aircraft/${set}/${atype}`, `/icons/aircraft/${set}/${atype}.png${bust}`]);
    }
}
```

### Rendering

When selecting the icon key, check flags before falling back to type:

```js
const iconType = (ac.type === 'fighter' && ac.hasRockets)            ? 'fighter_rockets'
               : (ac.type === 'dive_bomber' && ac.bombType === 'ap') ? 'dive_bomber_AP'
               : ac.type;
const img = icons[`aircraft/${set}/${iconType}`];
```

---

## Files Changed

| File | Change |
|---|---|
| `systems/shopSystem.js` | Add `fighter_rockets` and `ap_bombs` items |
| `systems/carrierSystem.js` | Add `hasRockets` field + targets push in `createAircraftSquadron`; rockets vs ships + AP bomb fix in `calculateAircraftDamage` |
| `bot.js` | State endpoint: add `hasFighterRockets`, `hasApBombs`; web `launch-aircraft`: build equipment from inventory; web `attack-aircraft`: update fighter guard to allow `hasRockets`; Discord pre-launch: intercept before `getLaunchOptions` call |
| `web-server/client/src/components/GameMap.js` | Load and render upgraded aircraft icons |
