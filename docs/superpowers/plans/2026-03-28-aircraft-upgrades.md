# Aircraft Upgrades (Fighter Rockets & AP Bombs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two permanent shop upgrades — Fighter Rockets (lets fighters strike ships) and AP Bombs (replaces HE bombs, heavy/light damage modifiers) — with custom icons and correct combat logic across web, Discord, and the map renderer.

**Architecture:** Shop items stamp flags (`hasRockets`, `bombType:'ap'`) onto aircraft at creation time. Combat, rendering, and launch logic all read from the aircraft object directly — no inventory re-checking after launch. Four independent files are touched; each task is self-contained and committable on its own.

**Tech Stack:** Node.js (bot.js, shopSystem.js, carrierSystem.js), React + HTML5 Canvas (GameMap.js)

---

## File Map

| File | What changes |
|---|---|
| `systems/shopSystem.js:801` | Add two new items after `all_weather_aircraft` |
| `systems/carrierSystem.js:137-151` | Add `hasRockets` field + targets push in `createAircraftSquadron` |
| `systems/carrierSystem.js:334-346` | Fighter rockets branch in `calculateAircraftDamage` |
| `systems/carrierSystem.js:352-361` | AP bomb strict-equality fix in `calculateAircraftDamage` |
| `bot.js:20863` | Fix hurricane check accessor (wrong guild-keyed Map call) |
| `bot.js:20190-20193` | Fix `hasAllWeatherAircraft` + add `hasFighterRockets`, `hasApBombs` in state endpoint |
| `bot.js:20902-20910` | Build equipment from inventory before `createAircraftSquadron` in web launch endpoint |
| `bot.js:21021` | Update fighter attack guard to allow `hasRockets` |
| `bot.js:9833` | Discord pre-launch intercept before `getLaunchOptions` call |
| `web-server/client/src/components/GameMap.js:1238-1243` | Add new icons to load loop |
| `web-server/client/src/components/GameMap.js:1505` | Use upgraded icon when `hasRockets` or `bombType==='ap'` |

---

### Task 1: Add shop items

**Files:**
- Modify: `systems/shopSystem.js:811` (after the `all_weather_aircraft` item)

The `all_weather_aircraft` item ends at line 811 (`});`). Add both new items directly after it.

- [ ] **Step 1: Add `fighter_rockets` and `ap_bombs` items**

Open `systems/shopSystem.js`. After line 811 (`});` closing `all_weather_aircraft`), insert:

```js
    this.addItem('fighter_rockets', {
        name: 'Fighter Rockets',
        category: 'aircraft',
        price: 2500,
        description: 'Attaches rocket launchers under fighter wings, allowing fighters to strike enemy ships',
        type: 'equipment',
        rarity: 'rare',
        requirements: { shipClass: ['Aircraft Carrier', 'Light Aircraft Carrier'] },
        stackable: false,
        emoji: '🚀'
    });

    this.addItem('ap_bombs', {
        name: 'AP Bombs',
        category: 'aircraft',
        price: 2000,
        description: 'Replaces HE bombs with armor-piercing bombs. +30% vs heavy ships, -60% vs light ships',
        type: 'equipment',
        rarity: 'rare',
        requirements: { shipClass: ['Aircraft Carrier', 'Light Aircraft Carrier'] },
        stackable: false,
        emoji: '💣'
    });
```

- [ ] **Step 2: Verify**

Start the bot and run `/shop` in Discord. Confirm `Fighter Rockets` (2500cr) and `AP Bombs` (2000cr) appear in the aircraft category for a CV or CVL player, and do not appear for non-carrier ship classes.

- [ ] **Step 3: Commit**

```bash
git add systems/shopSystem.js
git commit -m "feat: add Fighter Rockets and AP Bombs shop items"
```

---

### Task 2: Aircraft creation — hasRockets flag + targets

**Files:**
- Modify: `systems/carrierSystem.js:136-151`

Currently lines 136-151 look like:
```js
            // Special equipment/options
            depthCharges: options.depthCharges || false, // Fighters only
            bombType: options.bombType || null, // Dive bombers: 'ap' or 'he'

            // Combat properties
            targets: [...aircraftData.targets], // Copy array
            autoEngage: aircraftData.autoEngage || false,
            floodingChance: aircraftData.floodingChance || 0
        };

        // Modify targets and stats based on equipment
        if (aircraft.depthCharges && aircraft.type === 'fighter') {
            aircraft.targets.push('submarine');
            // Debuff when attacking aircraft
            aircraft.stats.accuracy -= 15; // -15% accuracy vs aircraft when carrying depth charges
        }

        return aircraft;
```

- [ ] **Step 1: Add `hasRockets` field and rockets targets block**

Replace the `// Special equipment/options` section and the post-creation block with:

```js
            // Special equipment/options
            depthCharges: options.depthCharges || false, // Fighters only
            hasRockets: options.hasRockets || false,     // Fighters only — allows ship attacks
            bombType: options.bombType || null, // Dive bombers: 'ap' or 'he'

            // Combat properties
            targets: [...aircraftData.targets], // Copy array
            autoEngage: aircraftData.autoEngage || false,
            floodingChance: aircraftData.floodingChance || 0
        };

        // Modify targets and stats based on equipment
        if (aircraft.depthCharges && aircraft.type === 'fighter') {
            aircraft.targets.push('submarine');
            // Debuff when attacking aircraft
            aircraft.stats.accuracy -= 15; // -15% accuracy vs aircraft when carrying depth charges
        }

        if (aircraft.hasRockets && aircraft.type === 'fighter') {
            aircraft.targets.push('ship');
        }

        return aircraft;
```

- [ ] **Step 2: Verify**

No automated tests — verify manually: launch a fighter from a CV that has `fighter_rockets` in inventory (temporarily grant via bot command or direct data edit). Confirm `aircraft.targets` includes `'ship'` and `aircraft.hasRockets === true` in the game state.

- [ ] **Step 3: Commit**

```bash
git add systems/carrierSystem.js
git commit -m "feat: add hasRockets flag and ship targeting to fighter squadron creation"
```

---

### Task 3: Combat mechanics — rockets damage + AP bomb fix

**Files:**
- Modify: `systems/carrierSystem.js:334-361`

Currently the fighter and dive_bomber blocks look like (lines 334-368):
```js
        if (aircraft.type === 'fighter') {
            if (target.type?.includes('aircraft')) {
                // Normal damage vs aircraft
                if (aircraft.depthCharges) {
                    baseDamage *= 0.85; // -15% damage when carrying depth charges
                }
            } else if (target.shipClass?.includes('Submarine') && aircraft.depthCharges) {
                // Depth charges vs submarines
                baseDamage *= 0.6; // Moderate damage vs subs
            } else {
                // Fighters can't attack ships without depth charges
                return 0;
            }
        } else if (aircraft.type === 'dive_bomber') {
            if (target.type?.includes('aircraft')) {
                baseDamage *= 0.5; // -50% damage vs aircraft
            } else if (target.shipClass) {
                // Ship targeting with bomb types
                if (aircraft.bombType === 'ap') {
                    // AP bombs - good vs heavy ships
                    if (target.shipClass.includes('Heavy Cruiser') ||
                        target.shipClass.includes('Battleship') ||
                        target.shipClass.includes('Carrier')) {
                        baseDamage *= 1.3; // +30% vs heavy ships
                    } else if (target.shipClass.includes('Destroyer') ||
                               target.shipClass.includes('Submarine')) {
                        baseDamage *= 0.4; // -60% vs light ships
                    }
                } else if (aircraft.bombType === 'he') {
```

- [ ] **Step 1: Update fighter block to allow rocket attacks**

Replace the fighter `else` return-0 line (inside the `if (aircraft.type === 'fighter')` block):

Change:
```js
            } else {
                // Fighters can't attack ships without depth charges
                return 0;
            }
```

To:
```js
            } else if (aircraft.hasRockets) {
                // Rocket fighters vs ships — normal fighter base damage (~61% of dive bomber, no modifier)
            } else {
                // Fighters can't attack ships without depth charges or rockets
                return 0;
            }
```

- [ ] **Step 2: Fix AP bomb block — strict equality + add Light Cruiser / Light Aircraft Carrier**

Replace the entire AP bomb `if` block inside the `dive_bomber` branch:

Change:
```js
                if (aircraft.bombType === 'ap') {
                    // AP bombs - good vs heavy ships
                    if (target.shipClass.includes('Heavy Cruiser') ||
                        target.shipClass.includes('Battleship') ||
                        target.shipClass.includes('Carrier')) {
                        baseDamage *= 1.3; // +30% vs heavy ships
                    } else if (target.shipClass.includes('Destroyer') ||
                               target.shipClass.includes('Submarine')) {
                        baseDamage *= 0.4; // -60% vs light ships
                    }
```

To:
```js
                if (aircraft.bombType === 'ap') {
                    // AP bombs — strict equality to avoid substring false matches (e.g. 'Light Aircraft Carrier' ≠ 'Aircraft Carrier')
                    if (target.shipClass === 'Battleship' ||
                        target.shipClass === 'Heavy Cruiser' ||
                        target.shipClass === 'Aircraft Carrier') {
                        baseDamage *= 1.3; // +30% vs heavy ships
                    } else if (target.shipClass === 'Destroyer' ||
                               target.shipClass === 'Submarine' ||
                               target.shipClass === 'Light Cruiser' ||
                               target.shipClass === 'Light Aircraft Carrier') {
                        baseDamage *= 0.4; // -60% vs light ships
                    }
```

- [ ] **Step 3: Verify**

Manually test in a running game:
- Rocket fighter attacking a Destroyer: should deal ~40 damage (base, no modifier)
- AP bomb dive bomber attacking an Aircraft Carrier: should deal ~85 (65 × 1.3)
- AP bomb dive bomber attacking a Light Aircraft Carrier: should deal ~26 (65 × 0.4) — NOT ~85
- AP bomb dive bomber attacking a Light Cruiser: should deal ~26 (65 × 0.4)

- [ ] **Step 4: Commit**

```bash
git add systems/carrierSystem.js
git commit -m "feat: rockets vs ships damage, fix AP bomb strict-equality modifiers"
```

---

### Task 4: bot.js — state endpoint + web launch + attack guard

**Files:**
- Modify: `bot.js:20863` (hurricane check accessor fix)
- Modify: `bot.js:20190-20193` (state endpoint — fix existing IIFE + add two new ones)
- Modify: `bot.js:20902-20910` (web launch — build equipment from inventory)
- Modify: `bot.js:21021` (attack guard — allow `hasRockets`)

#### Sub-task A: Fix hurricane check accessor

Line 20863 currently:
```js
                    const pd = this.playerData.get(userId);
```

- [ ] **Step 1: Fix hurricane accessor**

Change line 20863 to:
```js
                    const pd = this.getGuildPlayerData(game.guildId, userId);
```

#### Sub-task B: Fix state endpoint + add new flags

Lines 20190-20193 currently:
```js
                    hasAllWeatherAircraft: (() => {
                        const pd = this.playerData.get(p.userId || p.id);
                        return (pd?.inventory?.get('all_weather_aircraft') ?? 0) > 0;
                    })()
```

- [ ] **Step 2: Replace all three IIFEs**

Replace lines 20190-20194 (include line 20194 `}));` in your selection — it must be preserved):
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
                }));
```

The `}));` on the last line closes the outer `.map(p => ({...}))` call — keep it exactly as shown. `hasAllWeatherAircraft` now has a trailing comma (it was the last field; now it isn't).

#### Sub-task C: Web launch — build equipment from inventory

Lines 20902-20910 currently contain:
```js
                const aircraft = this.carrierSystem.createAircraftSquadron(
                    aircraftType,
                    squadronSize,
                    spawnPosition,
                    'player',
                    player.id,
                    {}
                );
```

- [ ] **Step 3: Build equipment object before aircraft creation**

Replace those lines with:
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
                    aircraftType,
                    squadronSize,
                    spawnPosition,
                    'player',
                    player.id,
                    equipment
                );
```

#### Sub-task D: Attack guard — allow hasRockets

Line 21021 currently:
```js
                if (aircraft.type === 'fighter' && !targetIsAircraft && !aircraft.depthCharges) {
```

- [ ] **Step 4: Add `!aircraft.hasRockets` to the guard**

Change to:
```js
                if (aircraft.type === 'fighter' && !targetIsAircraft && !aircraft.depthCharges && !aircraft.hasRockets) {
```

- [ ] **Step 5: Verify**

- Launch a fighter from a CV with `fighter_rockets` in inventory via the web UI. Confirm the aircraft has `hasRockets: true` in the game state.
- Select a ship target and attack. Confirm no 400 error from the attack endpoint.
- In the game state, confirm `hasFighterRockets: true` and `hasApBombs: true` appear correctly for players with those items.

- [ ] **Step 6: Commit**

```bash
git add bot.js
git commit -m "feat: launch/attack equipment logic for fighter rockets and AP bombs, fix playerData accessor"
```

---

### Task 5: Discord launch intercept

**Files:**
- Modify: `bot.js:9833` (inside `handleAircraftLaunchSelection` or equivalent, top of `try` block)

The existing `try` block at line 9833 starts before the `getLaunchOptions` call at line 9835. The intercept goes at the very top of this block. `squadronId` is declared at line 9728 and set at line 9749 — it is in scope before the `try` block.

- [ ] **Step 1: Add auto-launch intercept before getLaunchOptions**

At the top of the `try` block (line 9833), insert before the `const options = ...` line:

```js
        try {
            // Permanent shop upgrades bypass equipment selection entirely
            const playerDataForLaunch = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
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
                return;
            }

            // Existing path: equipment selection or direct launch
            const options = this.carrierSystem.getLaunchOptions ? this.carrierSystem.getLaunchOptions(shipClass, aircraftType) : {};
            // ... rest unchanged
```

- [ ] **Step 2: Verify**

In Discord, launch a fighter from a CV with `fighter_rockets`. Confirm the AP/Standard/Depth Charge equipment selection screen does **not** appear — the aircraft launches immediately with rockets. Repeat for a dive bomber with `ap_bombs` — confirm the HE/AP selection screen is skipped.

For players **without** the items, confirm the equipment selection screen still appears normally.

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: Discord auto-launch with rockets/AP bombs, bypass equipment selection"
```

---

### Task 6: GameMap.js — icon loading and rendering

**Files:**
- Modify: `web-server/client/src/components/GameMap.js:1238-1243` (icon load loop)
- Modify: `web-server/client/src/components/GameMap.js:1505` (icon selection per aircraft)

#### Sub-task A: Load new icons

Lines 1238-1243 currently:
```js
    for (const set of ['player', 'ally', 'enemy']) {
      for (const atype of ['recon', 'fighter', 'dive_bomber', 'torpedo_bomber']) {
        const bust = set === 'player' ? '?v=3' : '';
        toLoad.push([`aircraft/${set}/${atype}`, `/icons/aircraft/${set}/${atype}.png${bust}`]);
      }
    }
```

- [ ] **Step 1: Add new types to the load loop**

Change the inner `for` loop type list to include the two new variants:

```js
    for (const set of ['player', 'ally', 'enemy']) {
      for (const atype of ['recon', 'fighter', 'dive_bomber', 'torpedo_bomber',
                           'fighter_rockets', 'dive_bomber_AP']) {
        const bust = set === 'player' ? '?v=3' : '';
        toLoad.push([`aircraft/${set}/${atype}`, `/icons/aircraft/${set}/${atype}.png${bust}`]);
      }
    }
```

This loads `fighter_rockets.png` and `dive_bomber_AP.png` from `icons/aircraft/{player,ally,enemy}/`. The `?v=3` cache-bust applies to the player set only (existing behaviour).

#### Sub-task B: Use upgraded icon when flags are set

Line 1505 currently:
```js
        const img = icons[`aircraft/${set}/${ac.type}`];
```

- [ ] **Step 2: Select icon based on aircraft flags**

Replace line 1505 with:
```js
        const iconType = (ac.type === 'fighter' && ac.hasRockets)            ? 'fighter_rockets'
                       : (ac.type === 'dive_bomber' && ac.bombType === 'ap') ? 'dive_bomber_AP'
                       : ac.type;
        const img = icons[`aircraft/${set}/${iconType}`];
```

- [ ] **Step 3: Verify**

Build the React app and open the web dashboard. Launch a rocket fighter — confirm the `fighter_rockets.png` icon appears on the map instead of the regular fighter icon. Launch an AP bomb dive bomber — confirm `dive_bomber_AP.png` appears. Regular fighters and dive bombers (without upgrades) should still show their original icons.

- [ ] **Step 4: Commit**

```bash
git add web-server/client/src/components/GameMap.js
git commit -m "feat: load and render fighter_rockets and dive_bomber_AP icons on game map"
```

---

### Task 7: Build and deploy

- [ ] **Step 1: Build the React client**

```bash
cd web-server/client
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Restart bot and web server**

```bash
pm2 restart naval-bot naval-web
```

- [ ] **Step 3: Smoke test end-to-end**

1. Buy `Fighter Rockets` from the shop on a CV — confirm purchase succeeds
2. Start a game, launch a fighter — confirm `fighter_rockets.png` icon appears, equipment screen is skipped
3. Select an enemy ship and attack with the fighter — confirm hit registers, no 400 error
4. Buy `AP Bombs`, launch a dive bomber — confirm `dive_bomber_AP.png` icon, AP bomb loadout auto-applied
5. Attack a Battleship — confirm higher damage; attack a Destroyer — confirm lower damage
6. Player without either item: launch fighter, confirm equipment selection (Standard/Depth Charge) still appears

- [ ] **Step 4: Commit if any final fixes needed, then done**
