# Combat Balance — HP Scaling & Weapon Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale ship HP by class tier, split the torpedo damage multiplier between AI and player attackers, and reduce player big gun and large torpedo damage values so no single shot (including a critical hit) one-shots a light cruiser or larger vessel.

**Architecture:** Three files are touched. `factionConfig.js` and `playerCreation.js` share the same HP formula — both get the same one-line multiplier+cap change. `playerCreation.js` also gets weapon table value edits. `bot.js` gets the torpedo multiplier moved and split by attacker type.

**Tech Stack:** Node.js, Discord.js bot. No test framework — verification uses inline `node` scripts.

**Spec:** `docs/superpowers/specs/2026-04-03-combat-balance-design.md`

---

## File Map

| File | Change |
|---|---|
| `systems/factionConfig.js` | `calculateHP()` — add scale multiplier + 2,000 cap |
| `handlers/playerCreation.js` | `calculateShipHP()` — same change; torpedo 650–850mm damage reduced to 730; gun 381–480mm damage reduced to 470–489 |
| `bot.js` | Torpedo multiplier block moved after `guildId` declaration and made AI-only |
| `scripts/verify-balance.js` | Created — node verification script (not committed to main codebase, remove after use) |

---

## Task 1: Write verification script (failing — HP formula not yet changed)

**Files:**
- Create: `scripts/verify-balance.js`

- [ ] **Step 1: Create the verification script**

```js
// scripts/verify-balance.js
// Run from project root: node scripts/verify-balance.js
const FactionConfig = require('./systems/factionConfig');
const fc = new FactionConfig();

const HP_TESTS = [
    // [shipClass, tonnageT, expectedHP]
    ['Destroyer',          1800,   288],
    ['Destroyer',          2000,   300],
    ['Destroyer',          2600,   336],
    ['Submarine',          1200,   240],
    ['Submarine',          2800,   360],
    ['Light Cruiser',      5500,   735],
    ['Light Cruiser',      8200,   870],
    ['Heavy Cruiser',     10000,  1040],
    ['Heavy Cruiser',     12000,  1140],
    ['Aircraft Carrier',  25000,  1080],
    ['Aircraft Carrier',  28000,  1140],
    ['Battleship',        35000,  1230],
    ['Battleship',        40000,  1320],
    ['Battleship',        50000,  1500],
    ['Battleship',        55000,  1590],
];

let passed = 0, failed = 0;
for (const [cls, t, exp] of HP_TESTS) {
    const got = fc.calculateHP(t, cls);
    if (got === exp) {
        console.log(`  ✓  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}`);
        passed++;
    } else {
        console.error(`  ✗  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}  (expected ${exp})`);
        failed++;
    }
}
console.log(`\n${passed}/${HP_TESTS.length} passed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run it — expect ALL FAILURES (old formula)**

```bash
node scripts/verify-balance.js
```

Expected: all lines show `✗` with old values (~200 for destroyer, ~615 for battleship at 35kt).

---

## Task 2: Scale HP formula — `factionConfig.js`

**Files:**
- Modify: `systems/factionConfig.js:4433-4447`

- [ ] **Step 1: Open `systems/factionConfig.js`, find `calculateHP`**

It starts at line ~4433 and looks like:

```js
calculateHP(tonnage, shipClass) {
    const shipParams = {
        'Destroyer':              { baseHP: 120, multiplier: 0.040, bonus: 0   },
        ...
    };
    const params = shipParams[shipClass];
    if (!params) return 100;
    return Math.max(Math.round(params.baseHP + (tonnage * params.multiplier) + params.bonus), 20);
}
```

- [ ] **Step 2: Replace the return statement only — add scale multiplier and 2,000 cap**

Replace this line:
```js
    return Math.max(Math.round(params.baseHP + (tonnage * params.multiplier) + params.bonus), 20);
```

With:
```js
    const scale = ['Destroyer', 'Submarine'].includes(shipClass) ? 1.5 : 2.0;
    return Math.min(2000, Math.max(Math.round((params.baseHP + (tonnage * params.multiplier) + params.bonus) * scale), 20));
```

- [ ] **Step 3: Run verification script — expect PASS**

```bash
node scripts/verify-balance.js
```

Expected: all 15 cases show `✓`. Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add systems/factionConfig.js
git commit -m "feat: scale AI ship HP by class tier (1.5x destroyers/subs, 2.0x others, cap 2000)"
```

---

## Task 3: Scale HP formula — `playerCreation.js`

**Files:**
- Modify: `handlers/playerCreation.js` — `calculateShipHP()` method (~line 234)

- [ ] **Step 1: Extend verification script to also test playerCreation HP**

Append to `scripts/verify-balance.js`:

```js
// ── playerCreation HP (same formula, different class) ──
const PlayerCreationModule = require('./handlers/playerCreation');
const pm = new PlayerCreationModule({ tempPlayerData: new Map() });

const PC_TESTS = [
    ['Destroyer',      2000,   300],
    ['Light Cruiser',  6000,   760],
    ['Battleship',    35000,  1230],
    ['Submarine',      1200,   240],
];

console.log('\n── playerCreation.js ──');
for (const [cls, t, exp] of PC_TESTS) {
    const got = pm.calculateShipHP(t, cls);
    if (got === exp) {
        console.log(`  ✓  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}`);
        passed++;
    } else {
        console.error(`  ✗  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}  (expected ${exp})`);
        failed++;
    }
}
console.log(`\n${passed}/${HP_TESTS.length + PC_TESTS.length} passed`);
process.exit(failed > 0 ? 1 : 0);
```

Note: `passed`/`failed` are already declared above; make sure to move the final `console.log` and `process.exit` to after the new block. Easiest: remove them from end of Task 1 script and only have them once at the very bottom.

- [ ] **Step 2: Run — expect failures for playerCreation cases**

```bash
node scripts/verify-balance.js
```

Expected: factionConfig cases pass, playerCreation cases fail.

- [ ] **Step 3: Find `calculateShipHP` in `handlers/playerCreation.js` (~line 234)**

Unlike `factionConfig.js`, this function uses a two-line form. Replace **both lines** at ~252–253:

```js
    // Before (two lines):
    const calculatedHP = Math.round(params.baseHP + (tonnage * params.multiplier) + params.bonus);
    return Math.max(calculatedHP, 20);

    // After (two lines → two lines):
    const scale = ['Destroyer', 'Submarine'].includes(shipClass) ? 1.5 : 2.0;
    return Math.min(2000, Math.max(Math.round((params.baseHP + (tonnage * params.multiplier) + params.bonus) * scale), 20));
```

- [ ] **Step 4: Run verification script — all cases should pass**

```bash
node scripts/verify-balance.js
```

Expected: all cases `✓`. Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add handlers/playerCreation.js scripts/verify-balance.js
git commit -m "feat: scale player ship HP by class tier (mirrors factionConfig change)"
```

---

## Task 4: Reduce player torpedo damage — `playerCreation.js`

**Files:**
- Modify: `handlers/playerCreation.js` — `WEAPON_TEMPLATES` constant (module-level, ~line 62)

The torpedo entries are in the `WEAPON_TEMPLATES` object. Three calibers need damage reductions.

- [ ] **Step 1: Verify current values (before change)**

```bash
grep -n "'650mm'\|'750mm'\|'850mm'" "handlers/playerCreation.js"
```

Expected output shows:
- `'650mm'`: `damage: 800`
- `'750mm'`: `damage: 1000`
- `'850mm'`: `damage: 1250`

- [ ] **Step 2: Change the three torpedo damage values**

In `WEAPON_TEMPLATES`, find and update:

```js
// Before:
'650mm': { type: 'torpedo',    damage: 800,  range: 22,   reload: 65, penetration: 1500, ammo: 4, barrels: 1 },
'750mm': { type: 'torpedo',    damage: 1000, range: 25,   reload: 75, penetration: 2000, ammo: 2, barrels: 1 },
'850mm': { type: 'torpedo',    damage: 1250, range: 20,   reload: 90, penetration: 999,  ammo: 1, barrels: 1 },

// After:
'650mm': { type: 'torpedo',    damage: 730,  range: 22,   reload: 65, penetration: 1500, ammo: 4, barrels: 1 },
'750mm': { type: 'torpedo',    damage: 730,  range: 25,   reload: 75, penetration: 2000, ammo: 2, barrels: 1 },
'850mm': { type: 'torpedo',    damage: 730,  range: 20,   reload: 90, penetration: 999,  ammo: 1, barrels: 1 },
```

All three calibers land at 730 — just under the 735 HP floor for the lightest light cruiser. Their distinct identities come from range, reload, and ammo count.

- [ ] **Step 3: Verify new values**

```bash
grep -n "'650mm'\|'750mm'\|'850mm'" "handlers/playerCreation.js"
```

Expected: all three show `damage: 730`.

- [ ] **Step 4: Commit**

```bash
git add handlers/playerCreation.js
git commit -m "balance: cap player torpedo damage at 730 for 650mm-850mm calibers"
```

---

## Task 5: Reduce player big gun damage — `playerCreation.js`

**Files:**
- Modify: `handlers/playerCreation.js` — `WEAPON_TEMPLATES` constant (same section as Task 4)

Six gun calibers need damage reductions. The constraint: `damage × 1.5 < 735` (single crit must not one-shot a light cruiser).

- [ ] **Step 1: Verify current values (before change)**

```bash
grep -n "'381mm'\|'406mm'\|'410mm'\|'457mm'\|'460mm'\|'480mm'" "handlers/playerCreation.js"
```

Expected:
- `381mm`: `damage: 500`
- `406mm`: `damage: 580`
- `410mm`: `damage: 600`
- `457mm`: `damage: 720`
- `460mm`: `damage: 750`
- `480mm`: `damage: 850`

- [ ] **Step 2: Apply the six gun damage reductions**

In `WEAPON_TEMPLATES`, find and update (only `damage` field changes; all other fields stay the same):

```js
// Before → After
'381mm': { type: 'main', damage: 500, ... }  →  damage: 470
'406mm': { type: 'main', damage: 580, ... }  →  damage: 480
'410mm': { type: 'main', damage: 600, ... }  →  damage: 483
'457mm': { type: 'main', damage: 720, ... }  →  damage: 486
'460mm': { type: 'main', damage: 750, ... }  →  damage: 488
'480mm': { type: 'main', damage: 850, ... }  →  damage: 489
```

Full updated entries (copy-paste safe):

```js
'381mm':  { type: 'main', damage: 470, range: 38, reload: 20, penetration: 420, ammo: 17, barrels: 1 },
'406mm':  { type: 'main', damage: 480, range: 40, reload: 22, penetration: 480, ammo: 15, barrels: 1 },
'410mm':  { type: 'main', damage: 483, range: 41, reload: 23, penetration: 500, ammo: 14, barrels: 1 },
'457mm':  { type: 'main', damage: 486, range: 44, reload: 28, penetration: 580, ammo: 10, barrels: 1 },
'460mm':  { type: 'main', damage: 488, range: 45, reload: 30, penetration: 600, ammo:  8, barrels: 1 },
'480mm':  { type: 'main', damage: 489, range: 48, reload: 35, penetration: 680, ammo:  6, barrels: 1 },
```

Before applying, verify the existing entries in the file match the original values above (range, reload, penetration, ammo) to avoid accidentally overwriting with wrong non-damage values.

- [ ] **Step 3: Verify new values**

```bash
grep -n "'381mm'\|'406mm'\|'410mm'\|'457mm'\|'460mm'\|'480mm'" "handlers/playerCreation.js"
```

Expected: damage values are 470, 480, 483, 486, 488, 489 respectively. All other fields unchanged.

- [ ] **Step 4: Quick crit sanity check**

```bash
node -e "
const vals = {381:470, 406:480, 410:483, 457:486, 460:488, 480:489};
const minCLHP = 735;
for (const [cal, dmg] of Object.entries(vals)) {
    const crit = Math.round(dmg * 1.5);
    const ok = crit < minCLHP ? '✓' : '✗';
    console.log(ok + ' ' + cal + 'mm: ' + dmg + ' dmg, crit=' + crit + ' vs min CL HP ' + minCLHP);
}
"
```

Expected: all 6 lines show `✓`.

- [ ] **Step 5: Commit**

```bash
git add handlers/playerCreation.js
git commit -m "balance: reduce player big gun damage 381mm-480mm so single crit cannot one-shot a light cruiser"
```

---

## Task 6: Split torpedo multiplier — `bot.js`

**Files:**
- Modify: `bot.js` — combat resolution function (torpedo multiplier block ~line 8362)

The torpedo multiplier (`× 2.2`) currently sits at line 8362, two lines before `guildId` is declared (line 8366). It must be moved to after `guildId` is in scope, then made conditional on the attacker being AI.

- [ ] **Step 1: Find the block in `bot.js`**

Search for the comment above the multiplier:

```
// Torpedoes detonate below the waterline
```

Confirm the surrounding context matches:

```js
// line ~8361-8367 (verify by reading)
// Torpedoes detonate below the waterline — massively amplified damage regardless of caliber
if (weapon === 'torpedoes') baseDamage = Math.round(baseDamage * 2.2);

// Apply equipment level bonus for players
const channel = game.channelId ? this.client.channels.cache.get(game.channelId) : null;
const guildId = channel?.guild?.id;
if (attacker.id && guildId && this.hasGuildPlayerData(guildId, attacker.id)) {
```

- [ ] **Step 2: Replace the block**

Remove the old two lines (comment + multiplier), and insert the new block **after** `const guildId = channel?.guild?.id;`:

```js
// Before (remove these two lines):
// Torpedoes detonate below the waterline — massively amplified damage regardless of caliber
if (weapon === 'torpedoes') baseDamage = Math.round(baseDamage * 2.2);

// Apply equipment level bonus for players
const channel = game.channelId ? this.client.channels.cache.get(game.channelId) : null;
const guildId = channel?.guild?.id;
```

```js
// After:
// Apply equipment level bonus for players
const channel = game.channelId ? this.client.channels.cache.get(game.channelId) : null;
const guildId = channel?.guild?.id;

// Torpedoes: AI ships use a 2.2× multiplier because their weight-based formula produces low
// base values (~80–120). Player weapon tables already encode real-world torpedo lethality —
// applying the multiplier to players results in 1,100–2,750 damage, far exceeding any ship HP.
const isPlayerAttacker = Boolean(attacker.id && guildId && this.hasGuildPlayerData(guildId, attacker.id));
if (weapon === 'torpedoes' && !isPlayerAttacker) baseDamage = Math.round(baseDamage * 2.2);
```

The `if (attacker.id && guildId && this.hasGuildPlayerData(...))` block that follows is unchanged.

- [ ] **Step 3: Verify the change by reading the modified block**

```bash
grep -n -A 8 "Apply equipment level bonus" bot.js | head -20
```

Expected: shows the new `isPlayerAttacker` variable and conditional torpedo multiplier after `guildId`.

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "balance: split torpedo 2.2x multiplier — AI only, not players"
```

---

## Task 7: Migrate existing player character HP on join

**Files:**
- Modify: `bot.js` — player join handler (search for where `calculatedHP` or `maxHealth` is assigned from character data)

Existing player characters have their old `calculatedHP` stored in JSON. Without migration, they keep old HP values until they re-register. This task recalculates HP from stored `tonnage` + `shipClass` at join time.

- [ ] **Step 1: Find the join handler insertion point in `bot.js`**

The migration goes in the `/join` handler, right before `game.addPlayer()` is called. Locate the block:

```bash
grep -n "addPlayer(interaction.user.id" bot.js
```

The first result (line ~3353) is inside the main join flow. Read the surrounding context (~line 3340–3355):

```js
// ~line 3342
const shipClass = character.shipClass || 'Unknown';
// ... a few lines ...
joinSuccess = game.addPlayer(interaction.user.id, character, shipClass, interaction.member);
```

HP is read from `character.stats.health` inside `addPlayer` (`playerData.stats.health` at line 23493). The migration must update `character.stats.health` before `addPlayer` is called — at this point `this.playerCreation` (the `PlayerCreationModule` instance) is available on the bot.

- [ ] **Step 2: Insert the recalculation immediately before the `if (isOPFOR)` block**

Find the line `const isOPFOR = character.isOPFOR || false;` (~line 3345) and add the migration directly after it:

```js
// Before:
const isOPFOR = character.isOPFOR || false;

// After:
const isOPFOR = character.isOPFOR || false;

// Recalculate HP using current formula (migration for pre-balance-update characters)
if (character.tonnage && character.stats) {
    character.stats.health = this.playerCreation.calculateShipHP(character.tonnage, shipClass);
}
```

- [ ] **Step 3: Verify the migration is in place**

```bash
grep -n -A 4 "Recalculate HP using current formula" bot.js
```

Expected: shows the 4-line block followed by the `if (isOPFOR)` check.

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: recalculate player HP from tonnage/shipClass on battle join (balance migration)"
```

---

## Task 8: Cleanup and final verification

- [ ] **Step 1: Remove the verification script (optional — keep if useful for future balance work)**

```bash
# If removing:
rm scripts/verify-balance.js
git add scripts/verify-balance.js
git commit -m "chore: remove balance verification script"
```

- [ ] **Step 2: Full balance sanity check — run one final verification**

```bash
node -e "
const FactionConfig = require('./systems/factionConfig');
const fc = new FactionConfig();
const tests = [
    ['Destroyer', 2000, 300],
    ['Light Cruiser', 5500, 735],
    ['Battleship', 35000, 1230],
    ['Battleship', 55000, 1590],
    ['Submarine', 1200, 240],
];
let ok = true;
for (const [cls, t, exp] of tests) {
    const got = fc.calculateHP(t, cls);
    console.log((got===exp?'✓':'✗') + ' ' + cls + '@' + t + 't = ' + got);
    if (got !== exp) ok = false;
}
process.exit(ok ? 0 : 1);
"
```

Expected: all `✓`.

- [ ] **Step 3: Deploy to VPS and smoke-test**

Deploy using the standard process (see VPS notes). Start a test battle, verify:
- Destroyer HP shows ~300 in the battle display
- Battleship HP shows ~1,230–1,590
- Firing a 460mm main gun reports ~488 damage (not 750)
- Firing a 533mm torpedo reports ~500 damage (not 1,100)
- AI torpedoes still hit hard (2.2× still applied)
