# Submarine System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4-level submarine dive system with a 3-level system (surface/periscope/runningDeep) featuring new oxygen rules, Armor Break torpedo mechanics, wake tracking, Crash Dive Toggle, and Ballast Blow.

**Architecture:** `systems/diveSystem.js` is fully rewritten as the single source of truth for all dive logic. `bot.js` is updated at 7 hookpoints (processTurnEffects, AI turn, attack handler, damage calc, calculateAccuracy, status embed, slash commands + web API routes). `GameView.js` gets updated UI controls.

**Tech Stack:** Node.js, Discord.js, React (GameView.js)

---

## File Map

| File | Change |
|------|--------|
| `systems/diveSystem.js` | **Full rewrite** — 3 levels, new oxygen/ArmorBreak/wake tracking API |
| `bot.js` ~7193 | AI submarine dive logic — replace old `dive`/`surface` calls |
| `bot.js` ~7318 | AI attack path — add crash dive check before `executeAIAttack` |
| `bot.js` ~18272 | `processTurnEffects` — new oxygen damage, armor break, flag clears |
| `bot.js` ~8334 | `handleTargetSelection` — ballastBlow block, attacker restrictions, crit, wake |
| `bot.js` ~8500 | `executeAttack` — apply armor break in armor calc |
| `bot.js` ~8780 | `calculateAccuracy` — remove deep torpedo penalty |
| `bot.js` ~8724 | `executeDive`/`executeSurface` — use descend/ascend |
| `bot.js` ~530 | Slash command builders — update dive choices, add crashdivetoggle/ballastblow |
| `bot.js` ~1080 | `handleCommand` switch — add cases for new commands |
| `bot.js` ~6171 | `addPlayerStatusToEmbed` — Armor Break, crash dive toggle, runningDeep icon |
| `bot.js` ~20911 | Game state API — new submarine fields |
| `bot.js` ~22145 | Web API routes — update dive/surface, add ballastblow/crashdivetoggle |
| `web-server/client/src/components/GameView.js` | Updated depth UI, Ballast Blow, Crash Dive Toggle buttons |

---

## Task 1: Rewrite systems/diveSystem.js

**Files:**
- Modify: `systems/diveSystem.js`

- [ ] **Step 1: Replace the entire file**

```javascript
// systems/diveSystem.js

const DEPTH_LEVELS = ['surface', 'periscope', 'runningDeep'];

const DEPTH_RULES = {
    surface:     { speedMult: 1.00, spotMult: 1.0,  spotMax: null, oxygenRegen: 2 },
    periscope:   { speedMult: 0.75, spotMult: 0.5,  spotMax: null, oxygenRegen: 0 },
    runningDeep: { speedMult: 0.75, spotMult: null, spotMax: 0,    oxygenRegen: 0 },
};

// depth → weaponType → whether that weapon can hit a sub at that depth
const TARGETING_MATRIX = {
    surface:     { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: false, planeDepthCharge: false },
    periscope:   { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: true,  planeDepthCharge: true  },
    runningDeep: { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
};

function isSubmarine(ship) {
    return ship?.type === 'submarine' || !!ship?.shipClass?.toLowerCase().includes('submarine');
}

// Descend exactly 1 level. Costs 1 AP.
function descend(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can dive.' };
    const currentIndex = DEPTH_LEVELS.indexOf(submarine.depth || 'surface');
    if (currentIndex >= DEPTH_LEVELS.length - 1) {
        return { success: false, message: 'Already at Running Deep. Cannot descend further.' };
    }
    if ((submarine.oxygen ?? 0) <= 0) {
        return { success: false, message: 'No air remaining — surface to replenish oxygen before diving.' };
    }
    submarine.depth = DEPTH_LEVELS[currentIndex + 1];
    return { success: true, message: `Descending to **${formatDepth(submarine.depth)}** depth.`, apCost: 1 };
}

// Ascend exactly 1 level. Costs 1 AP.
function ascend(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can ascend.' };
    const currentIndex = DEPTH_LEVELS.indexOf(submarine.depth || 'surface');
    if (currentIndex <= 0) {
        return { success: false, message: 'Already at Surface.' };
    }
    submarine.depth = DEPTH_LEVELS[currentIndex - 1];
    return { success: true, message: `Ascending to **${formatDepth(submarine.depth)}** depth.`, apCost: 1 };
}

// Emergency surface from any depth. Costs 1 AP. Blocks firing that turn.
function ballastBlow(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can blow ballast.' };
    if ((submarine.depth || 'surface') === 'surface') return { success: false, message: 'Already at surface.' };
    const prev = submarine.depth;
    submarine.depth = 'surface';
    submarine.ballastBlewThisTurn = true;
    return { success: true, message: `Blowing ballast — rising from **${formatDepth(prev)}** to **Surface**!`, apCost: 1 };
}

// Toggle crash dive auto-dive behavior.
function toggleCrashDive(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can use crash dive.' };
    submarine.crashDiveToggle = !submarine.crashDiveToggle;
    return { success: true, enabled: submarine.crashDiveToggle };
}

// Immediately crash-dive to runningDeep. Bypasses 1-level rule. Sets AP debt for next turn.
function executeCrashDive(submarine) {
    if (!isSubmarine(submarine)) return { success: false };
    submarine.depth = 'runningDeep';
    submarine.crashDiveApDebt = (submarine.crashDiveApDebt ?? 0) + 1;
    return { success: true };
}

// Called at start of each submarine's turn. Ticks oxygen.
// Returns { oxygenRemaining, tookDamage, damageAmount }
function processDiveTick(submarine) {
    if (!isSubmarine(submarine)) return { oxygenRemaining: null, tookDamage: false, damageAmount: 0 };
    const depth = submarine.depth || 'surface';
    const rule  = DEPTH_RULES[depth];

    if (depth === 'surface') {
        submarine.oxygen = Math.min(
            submarine.maxOxygen ?? 4,
            (submarine.oxygen ?? submarine.maxOxygen ?? 4) + rule.oxygenRegen
        );
        return { oxygenRemaining: submarine.oxygen, tookDamage: false, damageAmount: 0 };
    }

    submarine.oxygen = Math.max(0, (submarine.oxygen ?? submarine.maxOxygen ?? 4) - 1);
    if (submarine.oxygen <= 0) {
        return { oxygenRemaining: 0, tookDamage: true, damageAmount: 10 };
    }
    return { oxygenRemaining: submarine.oxygen, tookDamage: false, damageAmount: 0 };
}

// Apply/upgrade Armor Break on target. Called on torpedo critical hit.
// Returns the new tier (1, 2, or 3).
function applyArmorBreak(target) {
    const currentReduction = (target.armorBreakTurns ?? 0) > 0 ? (target.armorBreakReduction ?? 0) : 0;
    if (currentReduction === 0) {
        target.armorBreakReduction = 3;
    } else if (currentReduction === 3) {
        target.armorBreakReduction = 6;
    } else {
        target.armorBreakReduction = 9;
    }
    target.armorBreakTurns = 2;
    return target.armorBreakReduction / 3; // 1, 2, or 3
}

// Returns active ARM reduction from Armor Break (0 if inactive).
function getArmorBreakReduction(target) {
    if (!target.armorBreakTurns || target.armorBreakTurns <= 0) return 0;
    return target.armorBreakReduction ?? 0;
}

// Returns Armor Break tier (0 = none, 1/2/3).
function getArmorBreakTier(target) {
    const reduction = getArmorBreakReduction(target);
    if (reduction === 0) return 0;
    if (reduction <= 3) return 1;
    if (reduction <= 6) return 2;
    return 3;
}

// Decrement Armor Break timer. Call in processTurnEffects for every ship.
function decrementArmorBreak(target) {
    if ((target.armorBreakTurns ?? 0) > 0) {
        target.armorBreakTurns--;
        if (target.armorBreakTurns <= 0) {
            target.armorBreakReduction = 0;
        }
    }
}

// Add a spotter's ID to the submarine's wake tracking list.
function addWakeTracking(submarine, spotterId) {
    if (!submarine.wakeTrackedBy) submarine.wakeTrackedBy = [];
    if (!submarine.wakeTrackedBy.includes(spotterId)) {
        submarine.wakeTrackedBy.push(spotterId);
    }
}

// Clear wake tracking. Call at start of submarine's turn.
function clearWakeTracking(submarine) {
    submarine.wakeTrackedBy = [];
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
    return 1.0;
}

// Whether spotter can detect submarine at all (range handled separately).
function canSpot(spotter, submarine) {
    if (!isSubmarine(submarine)) return true;
    const depth = submarine.depth || 'surface';

    // Wake tracking overrides all depth concealment for 1 turn
    if (submarine.wakeTrackedBy?.includes(spotter.id)) return true;

    if (depth === 'surface' || depth === 'periscope') return true;
    // runningDeep: undetectable without sonar
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

// Set depth/oxygen/new fields on submarine at battle start. No-op for non-subs.
function initSubmarine(ship) {
    if (!isSubmarine(ship)) return;
    if (ship.depth           === undefined) ship.depth           = 'surface';
    if (ship.maxOxygen       === undefined) ship.maxOxygen       = 4;
    if (ship.oxygen          === undefined) ship.oxygen          = ship.maxOxygen;
    if (ship.crashDiveToggle === undefined) ship.crashDiveToggle = false;
    if (ship.crashDiveApDebt === undefined) ship.crashDiveApDebt = 0;
    ship.wakeTrackedBy        = [];
    ship.armorBreakTurns      = 0;
    ship.armorBreakReduction  = 0;
    ship.ballastBlewThisTurn  = false;
}

// Depth context string for turn-start messages.
function getDepthContextMessage(submarine) {
    const depth = submarine.depth || 'surface';
    const o = submarine.oxygen ?? '?', mo = submarine.maxOxygen ?? '?';
    return {
        surface:     `🌊 **Surface** | Guns, AA & Torpedoes available. Full speed. O₂: ${o}/${mo} (+2 this turn).`,
        periscope:   `🔭 **Periscope** | Torpedoes only. Enemy spot range ×0.5. Speed −25%. O₂: ${o}/${mo}.`,
        runningDeep: `🌑 **Running Deep** | Undetectable. Cannot fire. ASW weapons only can reach you. O₂: ${o}/${mo}.`,
    }[depth] ?? '';
}

function formatDepth(depth) {
    return { surface: 'Surface', periscope: 'Periscope', runningDeep: 'Running Deep' }[depth] ?? depth;
}

module.exports = {
    descend, ascend, ballastBlow, toggleCrashDive, executeCrashDive,
    processDiveTick,
    applyArmorBreak, getArmorBreakReduction, getArmorBreakTier, decrementArmorBreak,
    addWakeTracking, clearWakeTracking,
    getEffectiveSpeed, getEffectiveSpotRange, getEnemySpotMultiplier,
    canSpot, canTarget,
    initSubmarine, getDepthContextMessage, formatDepth, isSubmarine,
    DEPTH_LEVELS, DEPTH_RULES, TARGETING_MATRIX,
};
```

- [ ] **Step 2: Verify the old exports are covered**

Run:
```bash
node -e "const d = require('./systems/diveSystem'); console.log(Object.keys(d))"
```
Expected output (order may differ):
```
[
  'descend', 'ascend', 'ballastBlow', 'toggleCrashDive', 'executeCrashDive',
  'processDiveTick', 'applyArmorBreak', 'getArmorBreakReduction', 'getArmorBreakTier',
  'decrementArmorBreak', 'addWakeTracking', 'clearWakeTracking', 'getEffectiveSpeed',
  'getEffectiveSpotRange', 'getEnemySpotMultiplier', 'canSpot', 'canTarget',
  'initSubmarine', 'getDepthContextMessage', 'formatDepth', 'isSubmarine',
  'DEPTH_LEVELS', 'DEPTH_RULES', 'TARGETING_MATRIX'
]
```

- [ ] **Step 3: Commit**

```bash
git add systems/diveSystem.js
git commit -m "feat: rewrite diveSystem for 3-level submarine redesign"
```

---

## Task 2: Update AI Submarine Behavior in bot.js

**Files:**
- Modify: `bot.js` (~lines 7187–7199 and ~7318, ~7332, ~7389)

The AI dive decision block uses the old `diveSystem.dive()` and `diveSystem.surface()` which no longer exist. Update it to `descend()`/`ascend()`, adjust depth name check, and add crash dive reaction before each `executeAIAttack` call.

- [ ] **Step 1: Update the AI submarine depth decision block (~line 7187)**

Find this block:
```javascript
            if (diveSystem.isSubmarine(ai)) {
                const oxygenPct   = (ai.oxygen ?? ai.maxOxygen ?? 10) / ((ai.maxOxygen ?? 10) || 10);
                const isSubmerged = (ai.depth || 'surface') !== 'surface';
                const inRange     = !!bestTarget &&
                    game.calculateDistance(ai.position, bestTarget.position) <= (ai.stats?.range ?? 8);

                if (isSubmerged && (oxygenPct < 0.3 || (ai.depth === 'veryDeep' && inRange))) {
                    diveSystem.surface(ai);
                } else if (!isSubmerged && oxygenPct > 0.5 && !inRange) {
                    diveSystem.dive(ai, 'periscope');
                } else if (ai.depth === 'periscope' && oxygenPct > 0.4 && aiHPPct < 0.6) {
                    diveSystem.dive(ai, 'deep');
                }
            }
```

Replace with:
```javascript
            if (diveSystem.isSubmarine(ai)) {
                const oxygenPct   = (ai.oxygen ?? ai.maxOxygen ?? 4) / ((ai.maxOxygen ?? 4) || 4);
                const isSubmerged = (ai.depth || 'surface') !== 'surface';
                const inRange     = !!bestTarget &&
                    game.calculateDistance(ai.position, bestTarget.position) <= (ai.stats?.range ?? 8);

                if (isSubmerged && (oxygenPct < 0.3 || (ai.depth === 'runningDeep' && inRange))) {
                    diveSystem.ascend(ai);
                } else if (!isSubmerged && oxygenPct > 0.5 && !inRange) {
                    diveSystem.descend(ai);
                } else if (ai.depth === 'periscope' && oxygenPct > 0.4 && aiHPPct < 0.6) {
                    diveSystem.descend(ai);
                }
            }
```

- [ ] **Step 2: Add a crash dive helper just before the aiTurn attack calls**

Create a helper method in the class. Find the `executeAIAttack` method definition (~line 7036) and add this method directly above it:

```javascript
    async checkCrashDiveReaction(target, ai, game, channel) {
        if (!diveSystem.isSubmarine(target)) return false;
        if (!target.crashDiveToggle) return false;
        if ((target.depth || 'surface') === 'runningDeep') return false;
        diveSystem.executeCrashDive(target);
        const tName = target.characterAlias || target.username || target.shipClass;
        const aiName = GameUtils.getAIDisplayName(ai);
        await channel.send(
            `🚨 **${tName}** detects **${aiName}** targeting them — **Crash Dive** engaged! Plunging to Running Deep.`
        );
        return true; // attack aborted
    }
```

- [ ] **Step 3: Add crash dive check before each executeAIAttack call**

There are three `executeAIAttack` call sites in `aiTurn`. Wrap each one:

At ~line 7318 (parting shot):
```javascript
                    if (retreatDist <= weaponRange) {
                        await this.executeAIAttack(ai, bestTarget, game, channel);
                    }
```
Replace with:
```javascript
                    if (retreatDist <= weaponRange) {
                        const aborted = await this.checkCrashDiveReaction(bestTarget, ai, game, channel);
                        if (!aborted) await this.executeAIAttack(ai, bestTarget, game, channel);
                    }
```

At ~line 7332 (focus fire / in-range attack):
```javascript
                await this.executeAIAttack(ai, bestTarget, game, channel);
```
Replace with:
```javascript
                const aborted = await this.checkCrashDiveReaction(bestTarget, ai, game, channel);
                if (!aborted) await this.executeAIAttack(ai, bestTarget, game, channel);
```

At ~line 7389 (after-move attack):
```javascript
                        await this.executeAIAttack(ai, bestTarget, game, channel);
```
Replace with:
```javascript
                        const aborted = await this.checkCrashDiveReaction(bestTarget, ai, game, channel);
                        if (!aborted) await this.executeAIAttack(ai, bestTarget, game, channel);
```

Also add the check in the GM AI-attack API route at ~line 9089:
```javascript
        const result  = await this.executeAIAttack(ai, target, game, interaction.channel);
```
Replace with:
```javascript
        const aborted = await this.checkCrashDiveReaction(target, ai, game, interaction.channel);
        const result  = aborted ? null : await this.executeAIAttack(ai, target, game, interaction.channel);
        if (aborted) return interaction.reply({ content: '🚨 Target crash-dived — attack aborted.', flags: MessageFlags.Ephemeral });
```

- [ ] **Step 4: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```
Expected: No syntax errors. (The bot will fail on missing env vars — that's fine, just no parse errors.)

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "fix: update AI submarine dive calls to new descend/ascend API, add crash dive reaction"
```

---

## Task 3: Update processTurnEffects in bot.js

**Files:**
- Modify: `bot.js` (~lines 18267–18279)

- [ ] **Step 1: Replace the submarine tick block and add armor break decrement**

Find (~line 18271):
```javascript
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
```

Replace with:
```javascript
        // ── Submarine dive tick ───────────────────────────────────────
        if (diveSystem.isSubmarine(player)) {
            const tick = diveSystem.processDiveTick(player);
            if (tick.tookDamage) {
                player.currentHealth = Math.max(0, player.currentHealth - tick.damageAmount);
                totalDamage += tick.damageAmount;
                messages.push(
                    `⚠️ **${player.username || player.characterAlias || player.shipClass}** is out of air! ` +
                    `Taking **${tick.damageAmount} damage** from oxygen deprivation.`
                );
                if (player.currentHealth <= 0) player.alive = false;
            }
            // Clear per-turn transient flags
            player.ballastBlewThisTurn = false;
            diveSystem.clearWakeTracking(player);
            // Apply crash dive AP debt from previous turn
            if (player.crashDiveApDebt > 0) {
                player.actionsThisTurn = Math.min(
                    player.maxActions ?? 2,
                    (player.actionsThisTurn ?? 0) + player.crashDiveApDebt
                );
                player.crashDiveApDebt = 0;
            }
        }
        // ─────────────────────────────────────────────────────────────

        // Armor Break timer (applies to any ship type hit by torpedo crits)
        diveSystem.decrementArmorBreak(player);
```

Place the `decrementArmorBreak` call immediately after the closing `// ─────` comment (before the fire damage block).

- [ ] **Step 2: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: update processTurnEffects for new oxygen damage, armor break, crash dive debt"
```

---

## Task 4: Update handleTargetSelection (Player Attack Handler) in bot.js

**Files:**
- Modify: `bot.js` (~lines 8334–8390)

Four changes: (a) block firing after Ballast Blow, (b) update attacker depth weapon restrictions, (c) add 9% torpedo crit → Armor Break, (d) add wake tracking on torpedo hit.

- [ ] **Step 1: Add Ballast Blow firing block — right after the player actionPoints check (~line 8316)**

Find:
```javascript
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive || player.actionPoints < 1) {
            return interaction.update({ content: '❌ Cannot shoot - not in game, dead, or no action points!', embeds: [], components: [] });
        }
```

Add immediately after:
```javascript
        if (player.ballastBlewThisTurn) {
            return interaction.update({ content: '❌ Cannot fire this turn — excessive pitching from Ballast Blow.', embeds: [], components: [] });
        }
```

- [ ] **Step 2: Update attacker depth weapon restrictions (~line 8346)**

Find:
```javascript
        // Enforce attacker's own depth weapon restrictions (submarines)
        if (diveSystem.isSubmarine(player)) {
            const ownDepth = player.depth || 'surface';
            if (ownDepth !== 'surface' && _weaponTypeStr === 'gun') {
                return interaction.update({ content: '❌ Deck guns cannot be used while submerged.', embeds: [], components: [] });
            }
            if (ownDepth === 'veryDeep' && _weaponTypeStr === 'torpedo') {
                return interaction.update({ content: '❌ Torpedoes cannot be fired at Very Deep depth.', embeds: [], components: [] });
            }
        }
```

Replace with:
```javascript
        // Enforce attacker's own depth weapon restrictions (submarines)
        if (diveSystem.isSubmarine(player)) {
            const ownDepth = player.depth || 'surface';
            if (ownDepth === 'runningDeep') {
                return interaction.update({ content: '❌ Cannot fire weapons at Running Deep — surface to engage.', embeds: [], components: [] });
            }
            if (ownDepth === 'periscope' && _weaponTypeStr === 'gun') {
                return interaction.update({ content: '❌ Deck guns cannot be used while submerged.', embeds: [], components: [] });
            }
        }
```

- [ ] **Step 3: Add torpedo crit → Armor Break after the flooding special effect (~line 8379)**

Find:
```javascript
        if (weaponType === 'torpedoes' && result.hit && Math.random() < 0.4) {
            target.flooding = true;
            target.floodTimer = 10;
            specialEffects += ' 🌊 Target is flooding!';
        }
```

Add immediately after this block:
```javascript
        // 9% crit chance on torpedo hit → Armor Break
        if (weaponType === 'torpedoes' && result.hit && Math.random() < 0.09) {
            const tier = diveSystem.applyArmorBreak(target);
            const tierLabels = ['', 'I', 'II', 'III'];
            specialEffects += ` 🔩 **Armor Break ${tierLabels[tier]}!** Target ARM −${tier * 3} for 2 turns.`;
        }

        // Wake tracking: torpedo hit reveals sub to target for 1 turn
        if (weaponType === 'torpedoes' && result.hit && diveSystem.isSubmarine(player)) {
            const targetId = target.id || target.userId;
            if (targetId && game.hasVisionOf(player.position, 'ai')) {
                diveSystem.addWakeTracking(player, targetId);
                specialEffects += ' 🌊 *Wake detected — enemy has your bearing for 1 turn!*';
            }
        }
```

- [ ] **Step 4: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "feat: add ballastBlow fire block, depth restrictions, torpedo crit ArmorBreak, wake tracking"
```

---

## Task 5: Update calculateAccuracy and Damage Calculation in bot.js

**Files:**
- Modify: `bot.js` (~lines 8780, 8500)

- [ ] **Step 1: Remove torpedo deep penalty from calculateAccuracy (~line 8779)**

Find and delete these lines:
```javascript
        // Submarine firing torpedoes at Deep depth: −20% accuracy
        if (diveSystem.isSubmarine(attacker) &&
            (attacker.depth || 'surface') === 'deep' &&
            weapon?.ammoTypes?.includes('torpedo')) {
            baseAccuracy *= 0.80;
        }
```

- [ ] **Step 2: Apply Armor Break reduction in executeAttack (~line 8500)**

Find:
```javascript
        const penetration = weaponData ? weaponData.penetration : this.getWeaponPenetration(weapon, ammoType);
        const armor = target.stats.armor || 50;
```

Replace with:
```javascript
        const penetration = weaponData ? weaponData.penetration : this.getWeaponPenetration(weapon, ammoType);
        const armor = Math.max(0, (target.stats.armor || 50) - diveSystem.getArmorBreakReduction(target));
```

- [ ] **Step 3: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "fix: remove torpedo depth penalty, apply ArmorBreak reduction in damage calc"
```

---

## Task 6: Add New Slash Commands and Handlers in bot.js

**Files:**
- Modify: `bot.js` (~lines 529–545, ~1080, ~8724)

Two new commands: `/crashdivetoggle` and `/ballastblow`. Also update `/dive` and `/surface` descriptions since they now shift 1 level and both cost AP.

- [ ] **Step 1: Update /dive and /surface command builders (~line 529)**

Find:
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

Replace with:
```javascript
            new SlashCommandBuilder()
                .setName('dive')
                .setDescription('Descend your submarine 1 depth level (costs 1 AP)'),

            new SlashCommandBuilder()
                .setName('surface')
                .setDescription('Ascend your submarine 1 depth level (costs 1 AP)'),

            new SlashCommandBuilder()
                .setName('ballastblow')
                .setDescription('Emergency surface from any depth (1 AP, cannot fire this turn)'),

            new SlashCommandBuilder()
                .setName('crashdivetoggle')
                .setDescription('Toggle auto crash-dive when targeted by an enemy (starts next turn with 1 fewer AP)'),
```

- [ ] **Step 2: Add cases to the handleCommand switch (~line 1080)**

Find the switch statement. Add four new cases before the closing `}`:
```javascript
            case 'dive':             await this.executeDive(interaction); break;
            case 'surface':          await this.executeSurface(interaction); break;
            case 'ballastblow':      await this.executeBallastBlow(interaction); break;
            case 'crashdivetoggle':  await this.executeCrashDiveToggle(interaction); break;
```

- [ ] **Step 3: Rewrite executeDive and executeSurface (~line 8724)**

Find `executeDive`:
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

Replace with:
```javascript
    async executeDive(interaction) {
        const game = this.getGameForChannel(interaction.channelId);
        if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
        if (!diveSystem.isSubmarine(player)) return interaction.reply({ content: 'Only submarines can dive.', flags: MessageFlags.Ephemeral });
        if (player.actionPoints <= 0) return interaction.reply({ content: 'No action points remaining.', flags: MessageFlags.Ephemeral });

        const result = diveSystem.descend(player);
        if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });

        player.actionPoints -= result.apCost;
        await interaction.reply({
            content: `🤿 ${result.message} | O₂: ${player.oxygen}/${player.maxOxygen} | AP: ${player.actionPoints}`
        });
        await this.updateGameDisplay(game, interaction.channel);
    }

    async executeSurface(interaction) {
        const game = this.getGameForChannel(interaction.channelId);
        if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
        if (!diveSystem.isSubmarine(player)) return interaction.reply({ content: 'Only submarines can surface.', flags: MessageFlags.Ephemeral });
        if (player.actionPoints <= 0) return interaction.reply({ content: 'No action points remaining.', flags: MessageFlags.Ephemeral });

        const result = diveSystem.ascend(player);
        if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });

        player.actionPoints -= result.apCost;
        await interaction.reply({
            content: `🌊 ${result.message} | O₂: ${player.oxygen}/${player.maxOxygen} | AP: ${player.actionPoints}`
        });
        await this.updateGameDisplay(game, interaction.channel);
    }

    async executeBallastBlow(interaction) {
        const game = this.getGameForChannel(interaction.channelId);
        if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
        if (!diveSystem.isSubmarine(player)) return interaction.reply({ content: 'Only submarines can blow ballast.', flags: MessageFlags.Ephemeral });
        if (player.actionPoints <= 0) return interaction.reply({ content: 'No action points remaining.', flags: MessageFlags.Ephemeral });

        const result = diveSystem.ballastBlow(player);
        if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });

        player.actionPoints -= result.apCost;
        await interaction.reply({
            content: `💨 ${result.message} | Cannot fire this turn. O₂: ${player.oxygen}/${player.maxOxygen} | AP: ${player.actionPoints}`
        });
        await this.updateGameDisplay(game, interaction.channel);
    }

    async executeCrashDiveToggle(interaction) {
        const game = this.getGameForChannel(interaction.channelId);
        if (!game) return interaction.reply({ content: 'No active battle.', flags: MessageFlags.Ephemeral });
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) return interaction.reply({ content: 'You are not in this battle.', flags: MessageFlags.Ephemeral });
        if (!diveSystem.isSubmarine(player)) return interaction.reply({ content: 'Only submarines can use crash dive.', flags: MessageFlags.Ephemeral });

        const result = diveSystem.toggleCrashDive(player);
        const state = result.enabled ? '🟢 **ON**' : '🔴 **OFF**';
        await interaction.reply({
            content: `🚨 Crash Dive Toggle: ${state}\n` +
                (result.enabled
                    ? 'You will auto-dive to Running Deep when targeted by an enemy. Your next turn starts with 1 fewer AP.'
                    : 'Auto crash dive disabled.')
        });
    }
```

Note: The old `executeSurface` at ~line 8743 must be deleted — it is now replaced by the one in the new `executeDive` block above. Replace the old `executeSurface` entirely.

- [ ] **Step 4: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "feat: add /ballastblow and /crashdivetoggle slash commands, update /dive and /surface to 1-level shifts"
```

---

## Task 7: Update Status Embed in bot.js

**Files:**
- Modify: `bot.js` (~lines 6171–6179)

- [ ] **Step 1: Update the submarine depth embed section**

Find:
```javascript
        // Add submarine depth and oxygen status
        if (diveSystem.isSubmarine(player)) {
            const depthIcons = { surface: '🌊', periscope: '🔭', deep: '🌑', veryDeep: '⬛' };
            const depth = player.depth || 'surface';
            const icon  = depthIcons[depth] ?? '🌊';
            embed.addFields([{
                name: `${icon} Depth`,
                value: `**${diveSystem.formatDepth(depth)}** | O₂: ${player.oxygen ?? '?'}/${player.maxOxygen ?? '?'}`,
                inline: true
            }]);
```

Replace with:
```javascript
        // Add submarine depth and oxygen status
        if (diveSystem.isSubmarine(player)) {
            const depthIcons = { surface: '🌊', periscope: '🔭', runningDeep: '🌑' };
            const depth = player.depth || 'surface';
            const icon  = depthIcons[depth] ?? '🌊';
            const crashIcon = player.crashDiveToggle ? '🟢' : '🔴';
            const tier = diveSystem.getArmorBreakTier(player);
            const tierLabel = tier > 0 ? ` | 🔩 Armor Break ${['', 'I', 'II', 'III'][tier]} (${player.armorBreakTurns}t)` : '';
            embed.addFields([{
                name: `${icon} Depth`,
                value: `**${diveSystem.formatDepth(depth)}** | O₂: ${player.oxygen ?? '?'}/${player.maxOxygen ?? '?'}` +
                       `${tierLabel}\n${crashIcon} Crash Dive`,
                inline: true
            }]);
```

- [ ] **Step 2: Also update the statusInfo block (~line 6158) to include Armor Break**

Find:
```javascript
        if (player.onFire) statusInfo += '🔥 On Fire! ';
        if (player.flooding) statusInfo += '🌊 Flooding! ';
        if (player.damageControlCooldown > 0) statusInfo += `🔧 Damage Control: ${player.damageControlCooldown} turns `;
```

Add a line after flooding:
```javascript
        if (player.onFire) statusInfo += '🔥 On Fire! ';
        if (player.flooding) statusInfo += '🌊 Flooding! ';
        const abTier = diveSystem.getArmorBreakTier(player);
        if (abTier > 0) statusInfo += `🔩 Armor Break ${'I'.repeat(abTier)} (${player.armorBreakTurns}t) `;
        if (player.damageControlCooldown > 0) statusInfo += `🔧 Damage Control: ${player.damageControlCooldown} turns `;
```

- [ ] **Step 3: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: update status embed for 3-level depth, ArmorBreak, crash dive toggle indicator"
```

---

## Task 8: Update Web API Routes in bot.js

**Files:**
- Modify: `bot.js` (~lines 22145–22201)

- [ ] **Step 1: Update /api/game/:channelId/dive to use descend()**

Find (~line 22145):
```javascript
        app.post('/api/game/:channelId/dive', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId, depth } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (!player.alive) return res.status(400).json({ error: 'Ship has been sunk' });
                if (!diveSystem.isSubmarine(player)) return res.status(400).json({ error: 'Only submarines can dive' });
                if (player.actionsThisTurn >= player.maxActions) return res.status(400).json({ error: 'No actions remaining this turn' });
                if (!['periscope', 'deep', 'veryDeep'].includes(depth)) return res.status(400).json({ error: 'Invalid depth value' });
                const result = diveSystem.dive(player, depth);
                if (!result.success) return res.status(400).json({ error: result.message });
                this.consumeAction(player);
                const needsEndTurn = player.actionsThisTurn >= player.maxActions;
                if (needsEndTurn) player.actionPoints = 0;
                await this.broadcastGameUpdate(channelId);
                res.json({ depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen, actionPoints: player.actionPoints });
                this.client.channels.fetch(channelId).then(ch => {
                    if (!ch) return;
                    const pName = player.characterAlias || player.username || 'A player';
                    ch.send({ content: `🤿 **${pName}** dives to **${diveSystem.formatDepth(player.depth)}** depth. O₂: ${player.oxygen}/${player.maxOxygen}` })
                        .then(() => { if (needsEndTurn) this.endPlayerTurn(player); })
                        .catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
                }).catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
            } catch (err) {
                console.error('Error diving:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
```

Replace with:
```javascript
        app.post('/api/game/:channelId/dive', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (!player.alive) return res.status(400).json({ error: 'Ship has been sunk' });
                if (!diveSystem.isSubmarine(player)) return res.status(400).json({ error: 'Only submarines can dive' });
                if (player.actionsThisTurn >= player.maxActions) return res.status(400).json({ error: 'No actions remaining this turn' });
                const result = diveSystem.descend(player);
                if (!result.success) return res.status(400).json({ error: result.message });
                this.consumeAction(player);
                const needsEndTurn = player.actionsThisTurn >= player.maxActions;
                if (needsEndTurn) player.actionPoints = 0;
                await this.broadcastGameUpdate(channelId);
                res.json({ depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen, actionPoints: player.actionPoints });
                this.client.channels.fetch(channelId).then(ch => {
                    if (!ch) return;
                    const pName = player.characterAlias || player.username || 'A player';
                    ch.send({ content: `🤿 **${pName}** descends to **${diveSystem.formatDepth(player.depth)}** depth. O₂: ${player.oxygen}/${player.maxOxygen}` })
                        .then(() => { if (needsEndTurn) this.endPlayerTurn(player); })
                        .catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
                }).catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
            } catch (err) {
                console.error('Error diving:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
```

- [ ] **Step 2: Update /api/game/:channelId/surface to use ascend() and cost 1 AP**

Find (~line 22177):
```javascript
        // Submarine: surface (free action — no AP cost)
        app.post('/api/game/:channelId/surface', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (!player.alive) return res.status(400).json({ error: 'Ship has been sunk' });
                if (!diveSystem.isSubmarine(player)) return res.status(400).json({ error: 'Only submarines can surface' });
                const result = diveSystem.surface(player);
                if (!result.success) return res.status(400).json({ error: result.message });
                await this.broadcastGameUpdate(channelId);
                res.json({ depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen });
                this.client.channels.fetch(channelId).then(ch => {
                    if (!ch) return;
                    const pName = player.characterAlias || player.username || 'A player';
                    ch.send({ content: `🌊 **${pName}** surfaces.` }).catch(() => {});
                }).catch(() => {});
            } catch (err) {
                console.error('Error surfacing:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
```

Replace with:
```javascript
        // Submarine: ascend 1 level (costs 1 AP)
        app.post('/api/game/:channelId/surface', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (!player.alive) return res.status(400).json({ error: 'Ship has been sunk' });
                if (!diveSystem.isSubmarine(player)) return res.status(400).json({ error: 'Only submarines can surface' });
                if (player.actionsThisTurn >= player.maxActions) return res.status(400).json({ error: 'No actions remaining this turn' });
                const result = diveSystem.ascend(player);
                if (!result.success) return res.status(400).json({ error: result.message });
                this.consumeAction(player);
                const needsEndTurn = player.actionsThisTurn >= player.maxActions;
                if (needsEndTurn) player.actionPoints = 0;
                await this.broadcastGameUpdate(channelId);
                res.json({ depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen, actionPoints: player.actionPoints });
                this.client.channels.fetch(channelId).then(ch => {
                    if (!ch) return;
                    const pName = player.characterAlias || player.username || 'A player';
                    ch.send({ content: `🌊 **${pName}** ascends to **${diveSystem.formatDepth(player.depth)}** depth.` })
                        .then(() => { if (needsEndTurn) this.endPlayerTurn(player); })
                        .catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
                }).catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
            } catch (err) {
                console.error('Error surfacing:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
```

- [ ] **Step 3: Add /ballastblow and /crashdivetoggle web API routes**

Add these two routes immediately after the `/surface` route (before the `/depthcharge` route):

```javascript
        // Submarine: ballast blow (immediate surface, 1 AP, no firing this turn)
        app.post('/api/game/:channelId/ballastblow', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (!player.alive) return res.status(400).json({ error: 'Ship has been sunk' });
                if (!diveSystem.isSubmarine(player)) return res.status(400).json({ error: 'Only submarines can blow ballast' });
                if (player.actionsThisTurn >= player.maxActions) return res.status(400).json({ error: 'No actions remaining this turn' });
                const result = diveSystem.ballastBlow(player);
                if (!result.success) return res.status(400).json({ error: result.message });
                this.consumeAction(player);
                const needsEndTurn = player.actionsThisTurn >= player.maxActions;
                if (needsEndTurn) player.actionPoints = 0;
                await this.broadcastGameUpdate(channelId);
                res.json({ depth: player.depth, oxygen: player.oxygen, maxOxygen: player.maxOxygen, actionPoints: player.actionPoints });
                this.client.channels.fetch(channelId).then(ch => {
                    if (!ch) return;
                    const pName = player.characterAlias || player.username || 'A player';
                    ch.send({ content: `💨 **${pName}** blows ballast and rapidly surfaces! Cannot fire this turn.` })
                        .then(() => { if (needsEndTurn) this.endPlayerTurn(player); })
                        .catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
                }).catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
            } catch (err) {
                console.error('Error with ballast blow:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Submarine: toggle crash dive auto-reaction
        app.post('/api/game/:channelId/crashdivetoggle', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (!player.alive) return res.status(400).json({ error: 'Ship has been sunk' });
                if (!diveSystem.isSubmarine(player)) return res.status(400).json({ error: 'Only submarines can use crash dive' });
                const result = diveSystem.toggleCrashDive(player);
                await this.broadcastGameUpdate(channelId);
                res.json({ crashDiveToggle: result.enabled });
            } catch (err) {
                console.error('Error toggling crash dive:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
```

- [ ] **Step 4: Update game state API to include new submarine fields (~line 20911)**

Find:
```javascript
                    depth: p.depth ?? 'surface',
                    oxygen: p.oxygen ?? null,
                    maxOxygen: p.maxOxygen ?? null,
                    hasDepthCharges: p.hasDepthCharges ?? false,
                    type: p.type ?? (p.shipClass?.toLowerCase().includes('submarine') ? 'submarine' : undefined),
```

Replace with:
```javascript
                    depth: p.depth ?? 'surface',
                    oxygen: p.oxygen ?? null,
                    maxOxygen: p.maxOxygen ?? null,
                    hasDepthCharges: p.hasDepthCharges ?? false,
                    type: p.type ?? (p.shipClass?.toLowerCase().includes('submarine') ? 'submarine' : undefined),
                    crashDiveToggle: p.crashDiveToggle ?? false,
                    ballastBlewThisTurn: p.ballastBlewThisTurn ?? false,
                    armorBreakTurns: p.armorBreakTurns ?? 0,
                    armorBreakReduction: p.armorBreakReduction ?? 0,
```

- [ ] **Step 5: Verify bot.js loads cleanly**

```bash
node -e "require('./bot.js')" 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add bot.js
git commit -m "feat: update web API routes for new submarine actions (dive/surface 1-level, ballastblow, crashdivetoggle)"
```

---

## Task 9: Update GameView.js Web Dashboard

**Files:**
- Modify: `web-server/client/src/components/GameView.js` (~lines 224, 1533–1614)

- [ ] **Step 1: The diveDepth state is no longer needed — remove it**

Find (~line 224):
```javascript
  const [diveDepth, setDiveDepth] = useState('periscope');
```
Delete this line.

- [ ] **Step 2: Replace the entire submarine controls section (~line 1533)**

Find:
```javascript
                    {/* ── Submarine Controls ── only shown for submarine ships */}
                    {selectedPlayer.type === 'submarine' && (
                      <div style={{ marginTop: '6px', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                          Depth:{' '}
                          <strong style={{ color: '#4a9eff' }}>
                            {({ surface: '🌊 Surface', periscope: '🔭 Periscope', deep: '🌑 Deep', veryDeep: '⬛ Very Deep' })[selectedPlayer.depth || 'surface'] ?? '🌊 Surface'}
                          </strong>
                          {' '}| O₂:{' '}
                          <strong>{selectedPlayer.oxygen ?? '?'}/{selectedPlayer.maxOxygen ?? '?'}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select
                            value={diveDepth}
                            onChange={e => setDiveDepth(e.target.value)}
                            style={{ fontSize: '12px', padding: '2px 4px', borderRadius: '4px' }}
                          >
                            <option value="periscope">Periscope</option>
                            <option value="deep">Deep</option>
                            <option value="veryDeep">Very Deep</option>
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            disabled={
                              selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions ||
                              selectedPlayer.depth === 'veryDeep' ||
                              (selectedPlayer.oxygen ?? 1) <= 0  // null oxygen = uninitialized, treat as available
                            }
                            onClick={async () => {
                              try {
                                await axios.post(`${API_URL}/api/game/${channelId}/dive`,
                                  { depth: diveDepth, characterAlias: selectedPlayer.characterAlias },
                                  { withCredentials: true });
                                addLogEntry(`🤿 Diving to ${diveDepth}`, 'action');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to dive');
                              }
                            }}
                          >🤿 Dive</button>
                          <button
                            className="btn btn-info"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            disabled={!selectedPlayer.depth || selectedPlayer.depth === 'surface'}
                            onClick={async () => {
                              try {
                                await axios.post(`${API_URL}/api/game/${channelId}/surface`,
                                  { characterAlias: selectedPlayer.characterAlias },
                                  { withCredentials: true });
                                addLogEntry('🌊 Surfacing', 'action');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to surface');
                              }
                            }}
                          >🌊 Surface</button>
                        </div>
                      </div>
                    )}
```

Replace with:
```javascript
                    {/* ── Submarine Controls ── only shown for submarine ships */}
                    {selectedPlayer.type === 'submarine' && (
                      <div style={{ marginTop: '6px', border: '1px solid #4a9eff44', borderRadius: '6px', padding: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                          Depth:{' '}
                          <strong style={{ color: '#4a9eff' }}>
                            {({ surface: '🌊 Surface', periscope: '🔭 Periscope', runningDeep: '🌑 Running Deep' })[selectedPlayer.depth || 'surface'] ?? '🌊 Surface'}
                          </strong>
                          {' '}| O₂:{' '}
                          <strong>{selectedPlayer.oxygen ?? '?'}/{selectedPlayer.maxOxygen ?? '?'}</strong>
                          {selectedPlayer.armorBreakTurns > 0 && (
                            <span style={{ color: '#ff9800', marginLeft: '6px' }}>
                              🔩 Armor Break {['', 'I', 'II', 'III'][Math.min(3, Math.round((selectedPlayer.armorBreakReduction ?? 0) / 3))]} ({selectedPlayer.armorBreakTurns}t)
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            disabled={
                              selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions ||
                              selectedPlayer.depth === 'runningDeep' ||
                              (selectedPlayer.oxygen ?? 1) <= 0
                            }
                            onClick={async () => {
                              try {
                                await axios.post(`${API_URL}/api/game/${channelId}/dive`,
                                  { characterAlias: selectedPlayer.characterAlias },
                                  { withCredentials: true });
                                addLogEntry('🤿 Descending 1 level', 'action');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to dive');
                              }
                            }}
                          >🤿 Dive ↓</button>
                          <button
                            className="btn btn-info"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            disabled={
                              selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions ||
                              !selectedPlayer.depth || selectedPlayer.depth === 'surface'
                            }
                            onClick={async () => {
                              try {
                                await axios.post(`${API_URL}/api/game/${channelId}/surface`,
                                  { characterAlias: selectedPlayer.characterAlias },
                                  { withCredentials: true });
                                addLogEntry('🌊 Ascending 1 level', 'action');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to ascend');
                              }
                            }}
                          >🌊 Surface ↑</button>
                          <button
                            className="btn btn-warning"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            disabled={
                              selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions ||
                              !selectedPlayer.depth || selectedPlayer.depth === 'surface'
                            }
                            onClick={async () => {
                              try {
                                await axios.post(`${API_URL}/api/game/${channelId}/ballastblow`,
                                  { characterAlias: selectedPlayer.characterAlias },
                                  { withCredentials: true });
                                addLogEntry('💨 Ballast Blow — surfacing rapidly!', 'action');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to blow ballast');
                              }
                            }}
                          >💨 Ballast Blow</button>
                          <button
                            className="btn btn-secondary"
                            style={{
                              fontSize: '12px', padding: '4px 8px',
                              background: selectedPlayer.crashDiveToggle ? '#2d5a27' : undefined,
                              borderColor: selectedPlayer.crashDiveToggle ? '#4caf50' : undefined,
                            }}
                            onClick={async () => {
                              try {
                                await axios.post(`${API_URL}/api/game/${channelId}/crashdivetoggle`,
                                  { characterAlias: selectedPlayer.characterAlias },
                                  { withCredentials: true });
                                addLogEntry(
                                  selectedPlayer.crashDiveToggle ? '🔴 Crash Dive OFF' : '🟢 Crash Dive ON',
                                  'action'
                                );
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to toggle crash dive');
                              }
                            }}
                          >
                            {selectedPlayer.crashDiveToggle ? '🟢' : '🔴'} Crash Dive
                          </button>
                        </div>
                      </div>
                    )}
```

- [ ] **Step 3: Verify the React app compiles**

```bash
cd web-server/client && npm run build 2>&1 | tail -20
```
Expected: `Compiled successfully.` (or warnings only — no errors).

- [ ] **Step 4: Commit**

```bash
git add web-server/client/src/components/GameView.js
git commit -m "feat: update submarine dashboard UI for 3-level depth, Ballast Blow, Crash Dive Toggle"
```

---

## Task 10: Manual Testing Checklist

Start the bot locally (`npm start`) and run through the following:

- [ ] **Depth levels and movement**
  - Submarine starts at Surface
  - `/dive` → moves to Periscope, costs 1 AP
  - `/dive` again → moves to Running Deep, costs 1 AP
  - `/dive` at Running Deep → error: "Already at Running Deep"
  - `/surface` → moves to Periscope, costs 1 AP
  - `/surface` at Surface → error: "Already at Surface"

- [ ] **Ballast Blow**
  - While at Running Deep or Periscope: `/ballastblow` → immediately surfaces, costs 1 AP
  - After Ballast Blow: attempting to fire any weapon → error about excessive pitching
  - At Surface: `/ballastblow` → error: "Already at surface"

- [ ] **Crash Dive Toggle**
  - `/crashdivetoggle` → shows 🟢 ON
  - `/crashdivetoggle` again → shows 🔴 OFF
  - With toggle ON and sub not at Running Deep: when AI attacks, sub auto-dives to Running Deep; next turn starts with 1 less AP

- [ ] **Oxygen system**
  - Sub at Periscope: oxygen decrements by 1 each turn
  - Sub at Surface: oxygen increments by 2 per turn (max 4)
  - At 0 oxygen: sub takes 10 damage per turn, does NOT surface automatically
  - Oxygen floor is 0 (never negative)

- [ ] **Armor Break**
  - Fire torpedoes at a ship — approximately 1 in 11 hits triggers Armor Break I
  - Hit again with torpedo crit: upgrades to II, then III (3 hits max)
  - After 2 turns: Armor Break clears
  - Status embed shows Armor Break tier and turns remaining

- [ ] **Wake tracking**
  - Fire torpedo that hits an enemy with LOS to the submarine
  - Enemy can now spot submarine for 1 turn despite depth
  - On sub's next turn, wake tracking clears

- [ ] **Web dashboard**
  - Submarine controls show Dive ↓ / Surface ↑ / Ballast Blow / Crash Dive buttons
  - Depth display shows correct icon/name for all 3 levels
  - Crash Dive button turns green when active
  - Ballast Blow disabled at surface
  - Dive ↓ disabled at Running Deep

- [ ] **Commit final**

```bash
git add -A
git commit -m "test: verify submarine redesign manual testing complete"
```

---

*Plan complete. Reference spec: `docs/superpowers/specs/2026-05-12-submarine-redesign.md`*
