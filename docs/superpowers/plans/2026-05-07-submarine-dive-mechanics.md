# Submarine Dive Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement submarine depth levels (Surface/Periscope/Deep/Very Deep), oxygen system, depth charges, sonar, Discord commands, web dashboard controls, and AI dive behavior.

**Architecture:** A new `systems/diveSystem.js` module owns all depth-level rules. Existing functions (targeting, vision, speed, turn effects) call into it at defined hookpoints. No depth logic is hardcoded outside this module.

**Tech Stack:** Node.js / Discord.js, React (GameView.js), Express (web-server/server.js)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `systems/diveSystem.js` | CREATE | All depth rules, oxygen logic, targeting/vision checks |
| `systems/factionConfig.js` | MODIFY | Add `maxOxygen` to subs; add `depthCharges` weapon to DD/CL/CA |
| `systems/shopSystem.js` | MODIFY | Add sonar and ASW upgrade items |
| `systems/battleManager.js` | MODIFY | Initialize sub fields at battle start; set `hasDepthCharges` on eligible ships |
| `bot.js` | MODIFY | Hook diveSystem into processTurnEffects, hasVisionOf, movement, commands, AI |
| `handlers/eventHandler.js` | MODIFY | Route /dive, /surface, /depthcharge commands |
| `web-server/server.js` | MODIFY | Add /api/game/:channelId/dive, /surface, /depthcharge endpoints |
| `web-server/client/src/components/GameView.js` | MODIFY | Dive/Surface/DepthCharge buttons, depth badge, oxygen bar |

---

### Task 1: Create `systems/diveSystem.js`

**Files:**
- Create: `systems/diveSystem.js`

- [ ] **Step 1: Create the file with full implementation**

```javascript
// systems/diveSystem.js

const DEPTH_LEVELS = ['surface', 'periscope', 'deep', 'veryDeep'];

const DEPTH_RULES = {
    surface:   { speedMult: 1.00, spotMult: 1.0, spotMax: null, oxygenRegen: 2 },
    periscope: { speedMult: 0.75, spotMult: 0.5, spotMax: null, oxygenRegen: 0 },
    deep:      { speedMult: 0.50, spotMult: null, spotMax: 3,   oxygenRegen: 0 },
    veryDeep:  { speedMult: 0.10, spotMult: null, spotMax: 0,   oxygenRegen: 0 },
};

// depth → weaponType → whether that weapon can hit a sub at that depth
const TARGETING_MATRIX = {
    surface:   { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: false, planeDepthCharge: false },
    periscope: { gun: false, torpedo: true,  bomb: true,  shipDepthCharge: true,  planeDepthCharge: true  },
    deep:      { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
    veryDeep:  { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
};

function isSubmarine(ship) {
    return ship?.type === 'submarine' || ship?.shipClass?.toLowerCase().includes('submarine');
}

// Dive to targetDepth. Costs 1 AP. Can jump multiple levels at once. Only descends.
function dive(submarine, targetDepth) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can dive.' };
    if (!DEPTH_LEVELS.includes(targetDepth) || targetDepth === 'surface') {
        return { success: false, message: 'Invalid depth. Choose: periscope, deep, or verydeep.' };
    }
    const currentIndex = DEPTH_LEVELS.indexOf(submarine.depth || 'surface');
    const targetIndex  = DEPTH_LEVELS.indexOf(targetDepth);
    if (targetIndex <= currentIndex) {
        return { success: false, message: `Already at or deeper than ${formatDepth(targetDepth)}. Use /surface to ascend first.` };
    }
    if ((submarine.oxygen ?? 0) <= 0) {
        return { success: false, message: 'No air remaining — surface to replenish oxygen before diving.' };
    }
    submarine.depth = targetDepth;
    return { success: true, message: `Diving to **${formatDepth(targetDepth)}** depth.`, apCost: 1 };
}

// Surface immediately. Free action. Always goes to Surface (no partial ascent).
function surface(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can surface.' };
    if ((submarine.depth || 'surface') === 'surface') return { success: false, message: 'Already at surface.' };
    const prev = submarine.depth;
    submarine.depth = 'surface';
    return { success: true, message: `Surfacing from **${formatDepth(prev)}** depth.` };
}

// Called at start of each submarine's turn. Ticks oxygen. Forces surface if depleted.
function processDiveTick(submarine) {
    if (!isSubmarine(submarine)) return { forcedSurface: false, oxygenRemaining: null };
    const depth = submarine.depth || 'surface';

    if (depth === 'surface') {
        submarine.oxygen = Math.min(
            submarine.maxOxygen ?? 10,
            (submarine.oxygen ?? submarine.maxOxygen ?? 10) + 2
        );
        return { forcedSurface: false, oxygenRemaining: submarine.oxygen };
    }

    submarine.oxygen = Math.max(0, (submarine.oxygen ?? submarine.maxOxygen ?? 10) - 1);
    if (submarine.oxygen <= 0) {
        submarine.depth = 'surface';
        return { forcedSurface: true, oxygenRemaining: 0 };
    }
    return { forcedSurface: false, oxygenRemaining: submarine.oxygen };
}

// Effective movement speed at current depth.
function getEffectiveSpeed(submarine) {
    const mult = DEPTH_RULES[submarine.depth || 'surface']?.speedMult ?? 1.0;
    return Math.max(1, Math.floor((submarine.stats?.speed ?? 3) * mult));
}

// Effective spotting range for a submarine acting as spotter.
function getEffectiveSpotRange(submarine, baseRange) {
    const rule = DEPTH_RULES[submarine.depth || 'surface'];
    if (!rule) return baseRange;
    if (rule.spotMax === 0) return 0;
    if (rule.spotMax !== null) return Math.min(baseRange, rule.spotMax);
    if (rule.spotMult !== null) return Math.floor(baseRange * rule.spotMult);
    return baseRange;
}

// Multiplier applied to enemy spotting range when trying to see this submarine.
function getEnemySpotMultiplier(submarine) {
    if (!isSubmarine(submarine)) return 1.0;
    if ((submarine.depth || 'surface') === 'periscope') return 0.5;
    return 1.0; // deep/veryDeep handled by canSpot
}

// Whether spotter can detect submarine at all (ignoring range — range handled separately).
function canSpot(spotter, submarine) {
    if (!isSubmarine(submarine)) return true;
    const depth = submarine.depth || 'surface';
    if (depth === 'surface' || depth === 'periscope') return true;
    return !!spotter.hasSonar;
}

// Whether attacker can use weaponType against submarine at its current depth.
// weaponType: 'gun' | 'torpedo' | 'bomb' | 'shipDepthCharge' | 'planeDepthCharge'
function canTarget(attacker, submarine, weaponType) {
    if (!isSubmarine(submarine)) return { canTarget: true, reason: '' };
    const depth   = submarine.depth || 'surface';
    const allowed = TARGETING_MATRIX[depth]?.[weaponType] ?? false;
    if (!allowed) {
        return {
            canTarget: false,
            reason: `Cannot target a **${formatDepth(depth)}** submarine with ${weaponType}.`,
        };
    }
    return { canTarget: true, reason: '' };
}

// Set depth/oxygen fields on submarine at battle start. No-op for non-subs.
function initSubmarine(ship) {
    if (!isSubmarine(ship)) return;
    if (ship.depth     === undefined) ship.depth     = 'surface';
    if (ship.maxOxygen === undefined) ship.maxOxygen = ship.definedMaxOxygen ?? 10;
    if (ship.oxygen    === undefined) ship.oxygen    = ship.maxOxygen;
}

// Depth context string for turn-start messages.
function getDepthContextMessage(submarine) {
    const depth = submarine.depth || 'surface';
    const o = submarine.oxygen ?? '?', mo = submarine.maxOxygen ?? '?';
    return {
        surface:   `🌊 **Surface** | All weapons. Full speed. O₂: ${o}/${mo} (+2 this turn).`,
        periscope: `🔭 **Periscope** | Torpedoes only. Enemy spot range ×0.5. Speed −25%. O₂: ${o}/${mo}.`,
        deep:      `🌑 **Deep** | Depth charges only can reach you. Torpedoes −20% acc. Speed −50%. O₂: ${o}/${mo}.`,
        veryDeep:  `⬛ **Very Deep** | Immune. Cannot fire. Speed −90%. O₂: ${o}/${mo}.`,
    }[depth] ?? '';
}

function formatDepth(depth) {
    return { surface: 'Surface', periscope: 'Periscope', deep: 'Deep', veryDeep: 'Very Deep' }[depth] ?? depth;
}

module.exports = {
    dive, surface, processDiveTick,
    getEffectiveSpeed, getEffectiveSpotRange, getEnemySpotMultiplier,
    canSpot, canTarget,
    initSubmarine, getDepthContextMessage, formatDepth, isSubmarine,
    DEPTH_LEVELS, DEPTH_RULES, TARGETING_MATRIX,
};
```

- [ ] **Step 2: Verify the module loads**

```bash
node -e "const d = require('./systems/diveSystem'); console.log(Object.keys(d).sort().join(', '));"
```

Expected (sorted, may vary in order):
```
DEPTH_LEVELS, DEPTH_RULES, TARGETING_MATRIX, canSpot, canTarget, dive, formatDepth, getDepthContextMessage, getEffectiveSpeed, getEffectiveSpotRange, getEnemySpotMultiplier, initSubmarine, isSubmarine, processDiveTick, surface
```

- [ ] **Step 3: Smoke test**

```bash
node -e "
const d = require('./systems/diveSystem');
const sub = { type: 'submarine', depth: 'surface', oxygen: 10, maxOxygen: 10, stats: { speed: 4 } };

let r = d.dive(sub, 'periscope');
console.assert(r.success === true, 'dive periscope failed');
console.assert(sub.depth === 'periscope', 'depth not updated');
console.assert(d.getEffectiveSpeed(sub) === 3, 'speed at periscope should be 3 (floor(4*0.75))');

let r2 = d.dive(sub, 'periscope');
console.assert(r2.success === false, 'same-level dive should fail');

let s = d.surface(sub);
console.assert(s.success === true && sub.depth === 'surface', 'surface failed');

sub.oxygen = 8;
d.processDiveTick(sub); // at surface, regens +2
console.assert(sub.oxygen === 10, 'oxygen regen failed: expected 10 got ' + sub.oxygen);

sub.depth = 'deep'; sub.oxygen = 1;
const tick = d.processDiveTick(sub);
console.assert(tick.forcedSurface === true, 'forced surface not triggered');
console.assert(sub.depth === 'surface', 'sub not surfaced');

const notSub = { type: 'destroyer' };
console.assert(d.canSpot(notSub, sub) === true, 'canSpot should be true for surface sub');
sub.depth = 'deep';
console.assert(d.canSpot(notSub, sub) === false, 'canSpot should be false for deep sub without sonar');
notSub.hasSonar = true;
console.assert(d.canSpot(notSub, sub) === true, 'canSpot should be true with sonar');

console.log('All smoke tests passed');
"
```

Expected: `All smoke tests passed`

- [ ] **Step 4: Commit**

```bash
git add systems/diveSystem.js
git commit -m "feat: add diveSystem module with depth rules, oxygen, targeting, and vision logic"
```

---

### Task 2: Add `maxOxygen` and depth charges to `factionConfig.js`

**Files:**
- Modify: `systems/factionConfig.js`

- [ ] **Step 1: Search for all submarine definitions**

```bash
grep -n "type: 'submarine'" systems/factionConfig.js
```

Note every line number returned.

- [ ] **Step 2: Add `maxOxygen` to each submarine definition**

For each submarine `aiType`, add `maxOxygen: 10` after the `tonnage` line:

```javascript
// Example — abyssal_ka_class (~line 1396):
this.aiTypes.set('abyssal_ka_class', {
    universe: 'abyssal',
    name: '[SS] Ka-Class',
    type: 'submarine',
    shipClass: 'AI Submarine',
    tonnage: 1200,
    maxOxygen: 10,       // ← ADD
    speedKnots: 17,
    // ... rest unchanged
});
```

- [ ] **Step 3: Search for all DD/CL/CA definitions**

```bash
grep -n "type: 'destroyer'\|type: 'lightcruiser'\|type: 'cruiser'" systems/factionConfig.js
```

- [ ] **Step 4: Add `depthCharges` weapon to each DD/CL/CA**

Inside the `weapons` object of every destroyer, light cruiser, and heavy cruiser, add:

```javascript
depthCharges: {
    name: 'Depth Charge Racks',
    damage: 60,
    range: 4,
    ammo: 8,
    aoeRadius: 1,   // hits 2×2 tiles (±1 from target)
    ammoTypes: ['depthcharge'],
},
```

- [ ] **Step 5: Verify no syntax errors**

```bash
node -e "const f = require('./systems/factionConfig'); console.log('factionConfig OK, types:', f.aiTypes?.size ?? 'N/A');"
```

Expected: `factionConfig OK, types: <number>`

- [ ] **Step 6: Commit**

```bash
git add systems/factionConfig.js
git commit -m "feat: add maxOxygen to submarine definitions and depthCharges weapon to DD/CL/CA"
```

---

### Task 3: Initialize submarine state at battle start

**Files:**
- Modify: `systems/battleManager.js`

- [ ] **Step 1: Add import at top of battleManager.js**

```javascript
const diveSystem = require('./diveSystem');
```

- [ ] **Step 2: Find where ship objects are initialized**

```bash
grep -n "alive.*true\|actionPoints\|currentHealth\|maxHealth" systems/battleManager.js | head -20
```

- [ ] **Step 3: Add submarine init and hasDepthCharges to the ship init loop**

In the loop that initializes each ship (both player and AI ships), add after the existing property assignments:

```javascript
// Initialize submarine dive fields
diveSystem.initSubmarine(ship);

// Set depth charge flag for eligible surface ship types
if (['destroyer', 'lightcruiser', 'cruiser'].includes(ship.type)) {
    ship.hasDepthCharges = true;
}
```

If player ships and AI ships are initialized in separate code paths, add the above block to both.

- [ ] **Step 4: Apply sonar/ASW flags from activeUpgrades**

In the same initialization loop, after `initSubmarine`:

```javascript
if (Array.isArray(character?.activeUpgrades ?? ship?.activeUpgrades)) {
    const upgrades = character?.activeUpgrades ?? ship?.activeUpgrades;
    if (upgrades.includes('sonar'))       ship.hasSonar   = true;
    if (upgrades.includes('asw_upgrade')) ship.aswUpgrade = true;
}
```

- [ ] **Step 5: Verify bot starts without errors**

Restart the bot and start a test battle:
```bash
pm2 restart naval-bot && pm2 logs naval-bot --lines 30
```

Confirm no errors about undefined properties on submarine ships.

- [ ] **Step 6: Commit**

```bash
git add systems/battleManager.js
git commit -m "feat: initialize submarine depth/oxygen and hasDepthCharges at battle start"
```

---

### Task 4: Hook `processDiveTick` into turn processing

**Files:**
- Modify: `bot.js` (~line 18075 for `processTurnEffects`, ~line 5883 for `playerTurn`)

- [ ] **Step 1: Add diveSystem require at top of bot.js**

Near the other `require` calls at the top:

```javascript
const diveSystem = require('./systems/diveSystem');
```

- [ ] **Step 2: Add dive tick at the start of `processTurnEffects`**

At `processTurnEffects(player, game)` (~line 18075), insert as the **first block** before any fire/flood processing:

```javascript
processTurnEffects(player, game) {
    const messages = [];
    let totalDamage = 0;

    // ── Submarine dive tick ───────────────────────────────────────
    if (diveSystem.isSubmarine(player)) {
        const tick = diveSystem.processDiveTick(player);
        if (tick.forcedSurface) {
            messages.push(
                `⚠️ **${player.username || player.shipClass}** ran out of oxygen and was forced to surface!`
            );
        }
    }
    // ─────────────────────────────────────────────────────────────

    // (existing fire/flood code continues unchanged below)
    if (player.onFire && player.fireTimer > 0) {
```

- [ ] **Step 3: Add depth context message to turn start**

In `playerTurn()` (~line 5883), after the `processTurnEffects` messages loop, add:

```javascript
// After: for (const message of turnMessages) await channel.send(message);
if (diveSystem.isSubmarine(player)) {
    const depthMsg = diveSystem.getDepthContextMessage(player);
    if (depthMsg) await channel.send(depthMsg);
}
```

- [ ] **Step 4: Test**

In a Discord test battle with a submarine:
1. Take several turns submerged — confirm turn message shows oxygen countdown
2. Let oxygen hit 0 — confirm forced-surface warning appears
3. Confirm sub is at Surface on the next turn

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "feat: hook processDiveTick into processTurnEffects, add depth context to turn messages"
```

---

### Task 5: Hook vision checks into `hasVisionOf`

**Files:**
- Modify: `bot.js` at `hasVisionOf()` (~line 24673)

This task handles two vision cases:
- **Sub as target:** enemy spot range is halved at Periscope; deep/veryDeep require sonar
- **Sub as spotter:** sub's own spot range is reduced by depth

- [ ] **Step 1: Replace `hasVisionOf` with depth-aware version**

Find `hasVisionOf(targetPos, side)` at ~line 24673. Replace the entire function body with:

```javascript
hasVisionOf(targetPos, side) {
    if (!targetPos || !this.map) return true;

    // Find the ship sitting at targetPos (for submarine depth checks)
    const findShipAt = (pos) => {
        for (const p of this.players.values()) { if (p.position === pos) return p; }
        for (const e of this.enemies.values()) { if (e.position === pos) return e; }
        return null;
    };
    const targetShip = findShipAt(targetPos);

    const WEATHER_SPOT_RANGE = { hurricane: 12, thunderstorm: 20, fog: 28, foggy: 28 };
    const baseSpotRange = WEATHER_SPOT_RANGE[this.weather] ?? null;

    // Enemy spot range is halved when target is a periscope-depth sub
    const enemyMult = targetShip ? diveSystem.getEnemySpotMultiplier(targetShip) : 1.0;

    // Build a per-spotter range check (subs have reduced own spot range by depth)
    const withinRange = (spotter, weatherRange) => {
        if (weatherRange === null || !spotter.position) return true;
        let effectiveRange = Math.floor(weatherRange * enemyMult);
        if (diveSystem.isSubmarine(spotter)) {
            effectiveRange = Math.min(effectiveRange, diveSystem.getEffectiveSpotRange(spotter, effectiveRange));
        }
        const a = this.coordToNumbers(spotter.position);
        const b = this.coordToNumbers(targetPos);
        if (!a || !b) return true;
        return Math.hypot(b.x - a.x, b.y - a.y) <= effectiveRange;
    };

    const AIRCRAFT_SPOT_RANGE = { hurricane: 5, thunderstorm: 3, fog: 10, foggy: 10 };
    const baseAcRange = AIRCRAFT_SPOT_RANGE[this.weather] ?? null;
    const withinAcRange = (aircraft, weatherRange) => {
        if (weatherRange === null || !aircraft.position) return true;
        const effectiveRange = Math.floor(weatherRange * enemyMult);
        const a = this.coordToNumbers(aircraft.position);
        const b = this.coordToNumbers(targetPos);
        if (!a || !b) return true;
        return Math.hypot(b.x - a.x, b.y - a.y) <= effectiveRange;
    };

    if (side === 'player') {
        for (const p of this.players.values()) {
            if (!p.alive || !p.position) continue;
            if (targetShip && !diveSystem.canSpot(p, targetShip)) continue;
            if (withinRange(p, baseSpotRange) && this.hasLineOfSight(p.position, targetPos)) return true;
        }
        for (const aircraft of this.aircraft?.values() || []) {
            if (aircraft.owner !== 'player' || !aircraft.alive || !aircraft.position) continue;
            if (targetShip && !diveSystem.canSpot(aircraft, targetShip)) continue;
            if (withinAcRange(aircraft, baseAcRange) && this.hasLineOfSight(aircraft.position, targetPos)) return true;
        }
        return false;
    } else {
        for (const enemy of this.enemies.values()) {
            if (!enemy.alive || !enemy.position) continue;
            if (targetShip && !diveSystem.canSpot(enemy, targetShip)) continue;
            if (withinRange(enemy, baseSpotRange) && this.hasLineOfSight(enemy.position, targetPos)) return true;
        }
        return false;
    }
}
```

- [ ] **Step 2: Test visibility**

In a test battle with a player submarine:
1. Surface — confirm normal spotting by both sides
2. Periscope — confirm you must be closer to spot the sub; sub sees less far
3. Deep — confirm enemies without sonar cannot see the sub
4. Deep with `ship.hasSonar = true` on an enemy — confirm they can see it
5. Very Deep — confirm no one without sonar can see the sub

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: hook diveSystem canSpot and spotting range multipliers into hasVisionOf"
```

---

### Task 6: Hook `getEffectiveSpeed` into movement

**Files:**
- Modify: `bot.js` — AI movement calls and player movement validation

- [ ] **Step 1: Find all AI movement calls**

```bash
grep -n "moveTowards.*stats.speed\|moveTowards.*\.speed" bot.js | head -15
```

- [ ] **Step 2: Wrap each AI `moveTowards` speed argument**

For every line of the form `game.moveTowards(ai.position, dest, ai.stats.speed)` in `aiTurn()`, replace `ai.stats.speed` with:

```javascript
(diveSystem.isSubmarine(ai) ? diveSystem.getEffectiveSpeed(ai) : ai.stats.speed)
```

Example:
```javascript
// Before:
const newPos = game.moveTowards(ai.position, nearestKP.position, ai.stats.speed);

// After:
const newPos = game.moveTowards(ai.position, nearestKP.position,
    diveSystem.isSubmarine(ai) ? diveSystem.getEffectiveSpeed(ai) : ai.stats.speed);
```

Apply to all three movement call sites (~lines 7143, 7165, 7214).

- [ ] **Step 3: Find player movement distance validation**

```bash
grep -n "stats.speed\|player.speed\|distance.*speed" bot.js | grep -i "move\|distance" | head -10
```

- [ ] **Step 4: Wrap player movement distance check**

Find the line similar to `if (distance > (player.stats.speed || 3))` (~line 7625) and replace:

```javascript
const maxMoveRange = diveSystem.isSubmarine(player)
    ? diveSystem.getEffectiveSpeed(player)
    : (player.stats.speed || 3);
if (distance > maxMoveRange) {
```

Also find where the movement range circle radius is calculated for the web dashboard map display (search for `stats.speed` near map rendering). Apply the same effective speed:

```javascript
const displaySpeed = diveSystem.isSubmarine(player)
    ? diveSystem.getEffectiveSpeed(player)
    : (player.stats.speed || 3);
```

- [ ] **Step 5: Test**

With a submarine at Periscope depth (speed ×0.75), try to move further than 75% of its base speed — confirm the move is rejected. Confirm the movement circle on the web map shrinks.

- [ ] **Step 6: Commit**

```bash
git add bot.js
git commit -m "feat: apply depth-based speed reduction to submarine movement"
```

---

### Task 7: Add `canTarget` check at attack execution and `/depthcharge` command

**Files:**
- Modify: `bot.js`

- [ ] **Step 1: Find the attack execution point**

```bash
grep -n "actionPoints--\|weaponsFiredThisTurn\|executeAttack\|applyDamage" bot.js | head -20
```

- [ ] **Step 2: Add `canTarget` check before AP deduction**

At the point where a weapon fires and `player.actionPoints--` occurs (~line 8257), add the check immediately before it:

```javascript
// Map weapon key + ammo type to weaponType string for diveSystem
const getWeaponType = (weaponKey, ammoType) => {
    if (ammoType === 'torpedo') return 'torpedo';
    if (ammoType === 'bomb')    return 'bomb';
    return 'gun';
};
const weaponTypeStr = getWeaponType(weaponKey, selectedAmmoType ?? currentAmmoType);
const depthCheck = diveSystem.canTarget(player, target, weaponTypeStr);
if (!depthCheck.canTarget) {
    return interaction.reply({ content: `❌ ${depthCheck.reason}`, flags: MessageFlags.Ephemeral });
}

// (existing) player.actionPoints--;
```

- [ ] **Step 3: Add `executeDepthCharge` function in bot.js**

Add this function near the other weapon-related handlers:

```javascript
async executeDepthCharge(interaction) {
    const game = this.getGameForChannel(interaction.channelId);
    if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
    const player = game.players.get(interaction.user.id);
    if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
    if (!player.hasDepthCharges) return interaction.reply({ content: 'Your ship has no depth charges.', flags: MessageFlags.Ephemeral });
    if (!(player.weapons?.depthCharges?.ammo > 0)) return interaction.reply({ content: 'No depth charges remaining.', flags: MessageFlags.Ephemeral });
    if (player.actionPoints <= 0) return interaction.reply({ content: 'No action points remaining.', flags: MessageFlags.Ephemeral });

    const coord = interaction.options.getString('coordinate');
    if (!game.map?.has(coord)) return interaction.reply({ content: `Invalid coordinate: ${coord}`, flags: MessageFlags.Ephemeral });

    const targetXY = game.coordToNumbers(coord);
    const hits = [];
    for (const ship of [...game.players.values(), ...game.enemies.values()]) {
        if (!ship.alive || !diveSystem.isSubmarine(ship)) continue;
        if ((ship.depth || 'surface') === 'surface') continue;
        const sXY = game.coordToNumbers(ship.position);
        if (Math.abs(sXY.x - targetXY.x) <= 1 && Math.abs(sXY.y - targetXY.y) <= 1) hits.push(ship);
    }

    const dc = player.weapons.depthCharges;
    const lines = [`💣 **${player.username}** drops depth charges at **${coord}**!`];
    for (const sub of hits) {
        const dmg = Math.floor(dc.damage * (0.85 + Math.random() * 0.3));
        sub.currentHealth = Math.max(0, sub.currentHealth - dmg);
        if (sub.currentHealth <= 0) sub.alive = false;
        lines.push(`💥 **${sub.username || sub.shipClass}** takes ${dmg} damage!${sub.alive ? '' : ' 💀 Sunk!'}`);
    }
    if (!hits.length) lines.push('No submerged submarines in the blast radius.');

    dc.ammo--;
    player.actionPoints--;
    await interaction.reply({ content: lines.join('\n') });
    await this.updateGameDisplay(game, interaction.channel);
}
```

- [ ] **Step 4: Register `/depthcharge` in the command builder (~line 446)**

```javascript
new SlashCommandBuilder()
    .setName('depthcharge')
    .setDescription('Drop depth charges at a coordinate (2×2 AoE) to damage submerged submarines')
    .addStringOption(opt =>
        opt.setName('coordinate')
            .setDescription('Grid coordinate to target, e.g. E5')
            .setRequired(true)
    ),
```

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "feat: add canTarget depth check at attack execution and executeDepthCharge handler"
```

---

### Task 8: Add `/dive` and `/surface` commands

**Files:**
- Modify: `bot.js`
- Modify: `handlers/eventHandler.js`

- [ ] **Step 1: Register both commands in the command builder (~line 446)**

```javascript
new SlashCommandBuilder()
    .setName('dive')
    .setDescription('Dive your submarine to a depth level (costs 1 AP)')
    .addStringOption(opt =>
        opt.setName('depth')
            .setDescription('Target depth')
            .setRequired(true)
            .addChoices(
                { name: 'Periscope', value: 'periscope' },
                { name: 'Deep',      value: 'deep'      },
                { name: 'Very Deep', value: 'veryDeep'  }
            )
    ),

new SlashCommandBuilder()
    .setName('surface')
    .setDescription('Surface your submarine immediately (free action — no AP cost)'),
```

- [ ] **Step 2: Add `executeDive` handler in bot.js**

```javascript
async executeDive(interaction) {
    const game = this.getGameForChannel(interaction.channelId);
    if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
    const player = game.players.get(interaction.user.id);
    if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
    if (!diveSystem.isSubmarine(player)) return interaction.reply({ content: 'Only submarines can dive.', flags: MessageFlags.Ephemeral });
    if (player.actionPoints <= 0) return interaction.reply({ content: 'No action points remaining.', flags: MessageFlags.Ephemeral });

    const targetDepth = interaction.options.getString('depth');
    const result = diveSystem.dive(player, targetDepth);
    if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });

    player.actionPoints -= result.apCost;
    await interaction.reply({
        content: `🤿 ${result.message} | O₂: ${player.oxygen}/${player.maxOxygen} | AP: ${player.actionPoints}`
    });
    await this.updateGameDisplay(game, interaction.channel);
}
```

- [ ] **Step 3: Add `executeSurface` handler in bot.js**

```javascript
async executeSurface(interaction) {
    const game = this.getGameForChannel(interaction.channelId);
    if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
    const player = game.players.get(interaction.user.id);
    if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
    if (!diveSystem.isSubmarine(player)) return interaction.reply({ content: 'Only submarines can surface.', flags: MessageFlags.Ephemeral });

    const result = diveSystem.surface(player);
    if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });

    await interaction.reply({ content: `🌊 ${result.message}` });
    await this.updateGameDisplay(game, interaction.channel);
}
```

- [ ] **Step 4: Route commands in `handlers/eventHandler.js`**

Find the `handleSlashCommand` switch block (~line 181). Add three cases:

```javascript
case 'dive':
    await this.bot.executeDive(interaction);
    break;
case 'surface':
    await this.bot.executeSurface(interaction);
    break;
case 'depthcharge':
    await this.bot.executeDepthCharge(interaction);
    break;
```

- [ ] **Step 5: Test all three commands in Discord**

With a submarine in a test battle:
1. `/dive depth:Periscope` → success, AP decrements by 1
2. `/dive depth:Periscope` again → error "already at or deeper"
3. `/dive depth:Deep` → success (jumps from Periscope to Deep in one action)
4. `/surface` → success, back at Surface
5. `/surface` again → error "already at surface"
6. Drain oxygen to 0, then `/dive depth:Periscope` → error "no air remaining"

With a destroyer:
7. `/depthcharge coordinate:E5` → "no depth charges" if sub is at surface, or AoE result if sub is submerged nearby

- [ ] **Step 6: Commit**

```bash
git add bot.js handlers/eventHandler.js
git commit -m "feat: add /dive, /surface, /depthcharge Discord slash commands"
```

---

### Task 9: Add sonar and ASW shop upgrades

**Files:**
- Modify: `systems/shopSystem.js`

- [ ] **Step 1: Add sonar item**

In `shopSystem.js`, after the last equipment item (e.g., after `advanced_radar`), add:

```javascript
this.addItem('sonar', {
    name: 'Sonar Array',
    category: 'equipment',
    price: 600,
    description: 'Detects submerged submarines at any depth. Does not grant targeting — detection only.',
    type: 'equipment',
    rarity: 'uncommon',
    requirements: { level: 5 },
    stackable: false,
    emoji: '🔊',
});
```

- [ ] **Step 2: Add ASW upgrade item**

```javascript
this.addItem('asw_upgrade', {
    name: 'ASW Strike Package',
    category: 'equipment',
    price: 800,
    description: 'Equips your dive bombers with depth charges. 1×1 tile AoE against submerged submarines.',
    type: 'aircraft',
    rarity: 'rare',
    requirements: { level: 7 },
    stackable: false,
    emoji: '💣',
});
```

- [ ] **Step 3: Verify shop loads**

```bash
node -e "const s = require('./systems/shopSystem'); const shop = new s(); console.log('sonar:', shop.items?.has('sonar'), 'asw:', shop.items?.has('asw_upgrade'));"
```

Expected: `sonar: true asw: true`

- [ ] **Step 4: Test purchase in Discord**

1. Use the shop to purchase Sonar Array
2. Confirm it appears in inventory / activeUpgrades
3. Start a battle — confirm `ship.hasSonar === true` on your ship (check via GM debug or bot log)

- [ ] **Step 5: Commit**

```bash
git add systems/shopSystem.js
git commit -m "feat: add sonar and ASW upgrade items to shop"
```

---

### Task 10: AI submarine dive behavior

**Files:**
- Modify: `bot.js` at `aiTurn()` (~line 7020)

- [ ] **Step 1: Find the AI combat decision block**

```bash
grep -n "isRetreat\|bestTarget\|aiHPPct\|aiCurHP" bot.js | head -15
```

- [ ] **Step 2: Add submarine dive decision block**

After the `isRetreat` declaration (~line 7122) and before the `if (!bestTarget)` block, insert:

```javascript
// ── AI submarine depth decision ──────────────────────────────────
if (diveSystem.isSubmarine(ai)) {
    const oxygenPct   = (ai.oxygen ?? ai.maxOxygen ?? 10) / (ai.maxOxygen ?? 10);
    const isSubmerged = (ai.depth || 'surface') !== 'surface';
    const inRange     = !!bestTarget &&
        game.calculateDistance(ai.position, bestTarget.position) <= (ai.stats?.range ?? 8);

    if (isSubmerged && (oxygenPct < 0.3 || (ai.depth === 'veryDeep' && inRange))) {
        // Surface: low oxygen, or at Very Deep with a target in range
        diveSystem.surface(ai);
    } else if (!isSubmerged && oxygenPct > 0.5 && !inRange) {
        // Dive to periscope: not in range, oxygen healthy — get closer undetected
        diveSystem.dive(ai, 'periscope');
    } else if (ai.depth === 'periscope' && oxygenPct > 0.4 && aiHPPct < 0.6) {
        // Dive deeper: taking damage, enough oxygen to go deep
        diveSystem.dive(ai, 'deep');
    }
}
// ────────────────────────────────────────────────────────────────
```

- [ ] **Step 3: Test AI dive behavior**

Start a battle with an AI submarine. Observe over several turns:
1. Confirm the AI eventually dives
2. Confirm the AI surfaces when oxygen is low
3. Confirm the AI at Deep cannot be attacked with guns or torpedoes

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: add AI submarine dive/surface decision logic"
```

---

### Task 11: Web dashboard API endpoints and UI buttons

**Files:**
- Modify: `web-server/server.js`
- Modify: `bot.js` (web-facing handler methods)
- Modify: `web-server/client/src/components/GameView.js`

- [ ] **Step 1: Add web-facing handler methods in bot.js**

```javascript
async executeDiveWeb(channelId, userId, targetDepth) {
    const game = this.getGameForChannel(channelId);
    if (!game) throw new Error('No active battle.');
    const player = game.players.get(userId);
    if (!player?.alive) throw new Error('You are not in this battle.');
    if (!diveSystem.isSubmarine(player)) throw new Error('Only submarines can dive.');
    if (player.actionPoints <= 0) throw new Error('No action points remaining.');
    const result = diveSystem.dive(player, targetDepth);
    if (!result.success) throw new Error(result.message);
    player.actionPoints -= result.apCost;
    return { depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen, actionPoints: player.actionPoints };
}

async executeSurfaceWeb(channelId, userId) {
    const game = this.getGameForChannel(channelId);
    if (!game) throw new Error('No active battle.');
    const player = game.players.get(userId);
    if (!player?.alive) throw new Error('You are not in this battle.');
    if (!diveSystem.isSubmarine(player)) throw new Error('Only submarines can surface.');
    const result = diveSystem.surface(player);
    if (!result.success) throw new Error(result.message);
    return { depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen };
}

async executeDepthChargeWeb(channelId, userId, coordinate) {
    const game = this.getGameForChannel(channelId);
    if (!game) throw new Error('No active battle.');
    const player = game.players.get(userId);
    if (!player?.alive) throw new Error('You are not in this battle.');
    if (!player.hasDepthCharges) throw new Error('Your ship has no depth charges.');
    if (!(player.weapons?.depthCharges?.ammo > 0)) throw new Error('No depth charges remaining.');
    if (player.actionPoints <= 0) throw new Error('No action points remaining.');
    if (!game.map?.has(coordinate)) throw new Error(`Invalid coordinate: ${coordinate}`);

    const targetXY = game.coordToNumbers(coordinate);
    const hits = [];
    for (const ship of [...game.players.values(), ...game.enemies.values()]) {
        if (!ship.alive || !diveSystem.isSubmarine(ship)) continue;
        if ((ship.depth || 'surface') === 'surface') continue;
        const sXY = game.coordToNumbers(ship.position);
        if (Math.abs(sXY.x - targetXY.x) <= 1 && Math.abs(sXY.y - targetXY.y) <= 1) hits.push(ship);
    }

    const dc = player.weapons.depthCharges;
    const hitResults = hits.map(sub => {
        const dmg = Math.floor(dc.damage * (0.85 + Math.random() * 0.3));
        sub.currentHealth = Math.max(0, sub.currentHealth - dmg);
        if (sub.currentHealth <= 0) sub.alive = false;
        return { name: sub.username || sub.shipClass, damage: dmg, sunk: !sub.alive };
    });
    dc.ammo--;
    player.actionPoints--;
    return { hits: hitResults, ammoRemaining: dc.ammo, actionPoints: player.actionPoints };
}
```

- [ ] **Step 2: Add API endpoints in `web-server/server.js`**

Find where existing game routes are defined (search for `app.post.*api/game`). Add:

```javascript
app.post('/api/game/:channelId/dive', requireAuth, async (req, res) => {
    try {
        const result = await botInstance.executeDiveWeb(req.params.channelId, req.user.id, req.body.depth);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/game/:channelId/surface', requireAuth, async (req, res) => {
    try {
        const result = await botInstance.executeSurfaceWeb(req.params.channelId, req.user.id);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/game/:channelId/depthcharge', requireAuth, async (req, res) => {
    try {
        const result = await botInstance.executeDepthChargeWeb(req.params.channelId, req.user.id, req.body.coordinate);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
});
```

- [ ] **Step 3: Add submarine controls to `GameView.js`**

Find the action button panel (~line 1224 in `GameView.js`). Add the submarine section inside the panel, before or after existing action buttons:

```jsx
{/* ── Submarine Controls ── only shown for submarine players */}
{selectedPlayer?.type === 'submarine' && (
    <div style={{ marginTop: '8px', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '8px' }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            Depth: <strong style={{ color: '#4a9eff' }}>
                {selectedPlayer.depth === 'surface'   && '🌊 Surface'}
                {selectedPlayer.depth === 'periscope' && '🔭 Periscope'}
                {selectedPlayer.depth === 'deep'      && '🌑 Deep'}
                {selectedPlayer.depth === 'veryDeep'  && '⬛ Very Deep'}
            </strong>
            {' '}| O₂: <strong>{selectedPlayer.oxygen ?? '?'}/{selectedPlayer.maxOxygen ?? '?'}</strong>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select id="dive-depth-sel" defaultValue="periscope" style={{ fontSize: '12px', padding: '2px 4px' }}>
                <option value="periscope">Periscope</option>
                <option value="deep">Deep</option>
                <option value="veryDeep">Very Deep</option>
            </select>
            <button
                disabled={
                    (selectedPlayer.actionPoints ?? 0) <= 0 ||
                    selectedPlayer.depth === 'veryDeep' ||
                    (selectedPlayer.oxygen ?? 0) <= 0
                }
                onClick={async () => {
                    const depth = document.getElementById('dive-depth-sel').value;
                    try {
                        await axios.post(`${API_URL}/api/game/${channelId}/dive`,
                            { depth, characterAlias: selectedPlayer.characterAlias },
                            { withCredentials: true });
                        addLogEntry(`🤿 Diving to ${depth}`, 'action');
                    } catch (err) { alert(err.response?.data?.error || 'Failed to dive'); }
                }}
            >🤿 Dive</button>
            <button
                disabled={selectedPlayer.depth === 'surface'}
                onClick={async () => {
                    try {
                        await axios.post(`${API_URL}/api/game/${channelId}/surface`,
                            { characterAlias: selectedPlayer.characterAlias },
                            { withCredentials: true });
                        addLogEntry('🌊 Surfacing', 'action');
                    } catch (err) { alert(err.response?.data?.error || 'Failed to surface'); }
                }}
            >🌊 Surface</button>
        </div>
    </div>
)}

{/* ── Depth Charge Button ── only for DD/CL/CA with a cell selected */}
{selectedPlayer?.hasDepthCharges && selectedCell && (
    <button
        style={{ marginTop: '6px', width: '100%' }}
        disabled={
            (selectedPlayer.actionPoints ?? 0) <= 0 ||
            !(selectedPlayer.weapons?.depthCharges?.ammo > 0)
        }
        onClick={async () => {
            try {
                const result = await axios.post(`${API_URL}/api/game/${channelId}/depthcharge`,
                    { coordinate: selectedCell, characterAlias: selectedPlayer.characterAlias },
                    { withCredentials: true });
                const hitCount = result.data.hits?.length ?? 0;
                addLogEntry(`💣 Depth charges at ${selectedCell} — ${hitCount} sub(s) hit`, 'attack');
                setSelectedCell(null);
            } catch (err) { alert(err.response?.data?.error || 'Failed to drop depth charges'); }
        }}
    >
        💣 Depth Charge at {selectedCell} ({selectedPlayer.weapons?.depthCharges?.ammo ?? 0} left)
    </button>
)}
```

- [ ] **Step 4: Test web dashboard**

1. Open a battle with a submarine — confirm Dive/Surface controls appear
2. Dive to Periscope — confirm depth badge updates
3. Surface — confirm badge resets
4. Open a battle with a destroyer — select a grid cell near a submerged sub
5. Confirm Depth Charge button appears with ammo count
6. Drop depth charges — confirm result in action log

- [ ] **Step 5: Commit**

```bash
git add web-server/server.js bot.js web-server/client/src/components/GameView.js
git commit -m "feat: add web dashboard dive/surface/depthcharge buttons and API endpoints"
```

---

### Task 12: Depth badge and oxygen bar in Discord game embed

**Files:**
- Modify: `bot.js` — wherever `updateGameDisplay` builds ship stat fields

- [ ] **Step 1: Find where ship stats are formatted in the embed**

```bash
grep -n "currentHealth\|maxHealth\|EmbedBuilder\|addFields\|stats.armor\|stats.speed" bot.js | grep -v "\/\/" | head -20
```

- [ ] **Step 2: Add depth/oxygen lines to submarine stat display**

Find the function that formats each ship's stat line (the text like `HP: X/Y | Armor: Z | Speed: N`). After building the base stats string, add:

```javascript
let shipStatLine = `HP: ${ship.currentHealth}/${ship.maxHealth} | Armor: ${ship.stats?.armor ?? '?'} | Speed: ${ship.stats?.speed ?? '?'}`;

if (diveSystem.isSubmarine(ship)) {
    const depthLabel = diveSystem.formatDepth(ship.depth || 'surface');
    const depthIcons = { surface: '🌊', periscope: '🔭', deep: '🌑', veryDeep: '⬛' };
    const icon = depthIcons[ship.depth || 'surface'] ?? '🌊';
    shipStatLine += `\n${icon} Depth: **${depthLabel}** | O₂: ${ship.oxygen ?? '?'}/${ship.maxOxygen ?? '?'}`;
}
```

- [ ] **Step 3: Test embed**

Run a turn in a battle with a submarine. Confirm the Discord game embed shows the depth badge and oxygen line for the submarine ship card. Dive and take another turn — confirm values update.

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: add depth badge and oxygen bar to submarine stats in Discord game embed"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| 4 depth levels with rules | Task 1 (TARGETING_MATRIX, DEPTH_RULES) |
| Targeting restrictions per depth | Tasks 1, 7 |
| Speed modifiers per depth | Tasks 1, 6 |
| Sub spotting range reduction (sub as spotter) | Tasks 1, 5 |
| Enemy spotting range reduced vs periscope sub | Tasks 1, 5 |
| Sonar detects at periscope/deep/veryDeep | Tasks 1, 5, 9 |
| Oxygen system (regen at surface, tick submerged) | Tasks 1, 4 |
| Forced surface on oxygen 0 | Tasks 1, 4 |
| Dive costs 1 AP, multi-level at once | Tasks 1, 8 |
| Surfacing is free, always goes to Surface | Tasks 1, 8 |
| Ship depth charges (DD/CL/CA, 2×2) | Tasks 2, 7 |
| Plane depth charges (ASW upgrade, 1×1) | Tasks 9 (flag), 7 (AoE uses `planeDepthCharge` type) |
| Sonar shop upgrade | Task 9 |
| ASW shop upgrade | Task 9 |
| /dive command | Task 8 |
| /surface command | Task 8 |
| /depthcharge command | Tasks 7, 8 |
| Web Dive/Surface buttons | Task 11 |
| Web Depth Charge button | Task 11 |
| Depth badge + oxygen bar (web) | Task 11 |
| Depth badge + oxygen bar (Discord embed) | Task 12 |
| Turn depth context message | Task 4 |
| AI submarine dive behavior | Task 10 |
| Battle-start initialization | Task 3 |

**Gap — plane depth charge attack:** The `aswUpgrade` flag is set (Task 9, Task 3), and `planeDepthCharge` is in the TARGETING_MATRIX (Task 1). However, no Discord command or web button triggers a plane depth charge attack. When implementing aircraft strike flow (outside this plan's scope for now), the executor should check `aircraft.aswUpgrade` and if true, allow targeting a coordinate for a 1×1 depth charge drop using `canTarget(aircraft, target, 'planeDepthCharge')`.
