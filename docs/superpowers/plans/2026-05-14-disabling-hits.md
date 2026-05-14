# Disabling Hits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add component disabling on critical hits — rudder (straight-line movement only), engines (no movement), and turrets (proportional damage reduction) — each repairing after 3 turns naturally or 1 turn via Damage Control.

**Architecture:** Six new fields on player/enemy objects following the existing `onFire`/`fireTimer` pattern. A helper method `getMainTurretCount` reads turret count from `weapon.mountGroups`. A helper `isAlongFacing` checks direction alignment for rudder enforcement. All logic lives in `bot.js` and `GameView.js` — no new files.

**Tech Stack:** Node.js (bot.js), React (GameView.js)

---

## File Structure

| File | Changes |
|---|---|
| `bot.js` | New helpers; init fields; disable roll in `executeAttack`; turret guard in Discord + web API attack handlers; engine/rudder checks in Discord + web API move handlers; DC extension (Discord + web API); repair timers in `processTurnEffects`; game state serialization |
| `web-server/client/src/components/GameView.js` | Status icons (3 locations), log event detection, DC button condition |

---

### Task 1: Add helper methods to the bot

**Files:**
- Modify: `bot.js` — add two helpers near the combat system (around line 8156, just before `handleShoot`)

- [ ] **Step 1: Add `getMainTurretCount` and `isAlongFacing` methods**

Find this comment in `bot.js` (around line 8156):
```js
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 COMBAT SYSTEM                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
```

Insert both helpers immediately after that comment block, before `async handleShoot`:

```js
    getMainTurretCount(ship) {
        const weaponsArr = Array.isArray(ship.weapons)
            ? ship.weapons
            : Object.values(ship.weapons || {});
        const mainWeapon = weaponsArr.find(w => w.type === 'main');
        if (!mainWeapon || !mainWeapon.mountGroups) return 0;
        return mainWeapon.mountGroups.reduce((sum, g) => sum + (g.count || 0), 0);
    }

    isAlongFacing(player, dx, dy) {
        if (dx === 0 && dy === 0) return false;
        if (player.direction == null) return true; // no facing set yet — allow any direction
        const rounded = (Math.round(player.direction / 45) * 45) % 360;
        const idx = rounded / 45;
        const ux = [1, 1, 0, -1, -1, -1, 0, 1][idx];
        const uy = [0, 1, 1, 1, 0, -1, -1, -1][idx];
        return (dx * uy - dy * ux) === 0;
    }
```

- [ ] **Step 2: Verify helpers exist**

Run: `node -e "const b = require('./bot.js'); console.log('ok')" 2>&1 | head -3`

Expected: no syntax errors (the bot won't fully start without Discord token, but syntax is checked)

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: add getMainTurretCount and isAlongFacing helpers"
```

---

### Task 2: Initialize component damage fields on all player/enemy objects

**Files:**
- Modify: `bot.js` — three initialization sites

The six new fields follow the same pattern as `onFire`/`fireTimer`. Each of the three ship-creation locations needs all six fields.

- [ ] **Step 1: Add fields to `addPlayer` (regular players)**

Find this block in `bot.js` (around line 24391):
```js
            onFire: false,
            flooding: false,
            sunk: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
```

Replace with:
```js
            onFire: false,
            flooding: false,
            sunk: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            rudderDamaged: false,
            rudderRepairTimer: 0,
            enginesDamaged: false,
            enginesRepairTimer: 0,
            disabledTurrets: 0,
            turretRepairTimer: 0,
```

- [ ] **Step 2: Add fields to `addOPFORPlayer` (OPFOR players)**

Find this block in `bot.js` (around line 24441):
```js
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            fuel: 100,
```

Replace with:
```js
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            rudderDamaged: false,
            rudderRepairTimer: 0,
            enginesDamaged: false,
            enginesRepairTimer: 0,
            disabledTurrets: 0,
            turretRepairTimer: 0,
            fuel: 100,
```

- [ ] **Step 3: Add fields to `spawnRandomAI` (AI enemies)**

Find this block in `bot.js` (around line 25374):
```js
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            tonnage: customAI.tonnage,
```

Replace with:
```js
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            rudderDamaged: false,
            rudderRepairTimer: 0,
            enginesDamaged: false,
            enginesRepairTimer: 0,
            disabledTurrets: 0,
            turretRepairTimer: 0,
            tonnage: customAI.tonnage,
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: initialize component damage fields on player and AI objects"
```

---

### Task 3: Add disable roll to `executeAttack` and apply turret damage scaling

**Files:**
- Modify: `bot.js` — `executeAttack` function (around lines 8550–8711)

This task adds two things inside `executeAttack`:
1. Turret damage scaling on the *attacker* side (if attacker's turrets are disabled, reduce baseDamage)
2. The disabling roll on the *target* side (after a crit lands)

- [ ] **Step 1: Apply attacker turret damage scaling**

Find this line in `executeAttack` (around line 8577):
```js
        let baseDamage = weaponData ? weaponData.damage : this.getWeaponDamage(weapon, ammoType);
```

Replace with:
```js
        let baseDamage = weaponData ? weaponData.damage : this.getWeaponDamage(weapon, ammoType);

        // Turret damage scaling: each disabled turret reduces main-gun output proportionally
        if (weapon === 'main' && (attacker.disabledTurrets ?? 0) > 0) {
            const totalTurrets = this.getMainTurretCount(attacker);
            if (totalTurrets > 0) {
                const operational = Math.max(0, totalTurrets - attacker.disabledTurrets);
                baseDamage = Math.round(baseDamage * (operational / totalTurrets));
            }
        }
```

- [ ] **Step 2: Add the disabling hit roll after the crit block**

Find this block in `executeAttack` (around line 8626):
```js
        // Check for critical hit (5% base chance)
        if (Math.random() < 0.05) {
            isCritical = true;
            baseDamage = Math.round(baseDamage * 1.5); // 50% damage bonus for critical
        }
```

Replace with:
```js
        // Check for critical hit (5% base chance)
        if (Math.random() < 0.05) {
            isCritical = true;
            baseDamage = Math.round(baseDamage * 1.5); // 50% damage bonus for critical
        }

        // Disabling hit roll: triggers only on crits, against surviving targets
        let disableMessage = '';
        if (isCritical && target.currentHealth > 0) {
            const roll = Math.random() * 100;
            if (roll > 50 && roll <= 75) {
                target.rudderDamaged = true;
                target.rudderRepairTimer = 3;
                disableMessage = `\n⚙️ **DISABLING HIT!** ${targetName}'s **rudder** has been damaged — can only move forward or backward!`;
            } else if (roll > 75 && roll <= 90) {
                target.enginesDamaged = true;
                target.enginesRepairTimer = 3;
                disableMessage = `\n⚙️ **DISABLING HIT!** ${targetName}'s **engines** have been disabled — cannot move!`;
            } else if (roll > 90) {
                const totalTurrets = this.getMainTurretCount(target);
                if (totalTurrets > 0 && (target.disabledTurrets ?? 0) < totalTurrets) {
                    target.disabledTurrets = (target.disabledTurrets ?? 0) + 1;
                    target.turretRepairTimer = 3;
                    const remaining = totalTurrets - target.disabledTurrets;
                    const pct = Math.round((remaining / totalTurrets) * 100);
                    disableMessage = `\n⚙️ **DISABLING HIT!** ${targetName}'s **turret** has been knocked out! (${remaining}/${totalTurrets} operational — damage reduced to ${pct}%)`;
                }
            }
        }
```

- [ ] **Step 3: Append `disableMessage` to the combat message**

Find this block near the end of `executeAttack` (around line 8686):
```js
        // Build message with overpenetration info
        let message = `💥 ${attackerName} hit ${targetName} at ${target.position} for ${finalDamage} damage!`;
        if (isCritical) message += ' 🎯 CRITICAL HIT!';
        if (penetrated) message += ' (Penetration!)';
        else if (finalDamage === 0) message += ' (Ricochet!)';
        else message += ' (Spall damage)';

        // **NEW: Add overpenetration message**
        const overpenetrationMessage = this.getOverpenetrationMessage(overpenetrationModifier);
        message += overpenetrationMessage;

        if (target.onFire && target.fireTimer > 0) message += ' 🔥 Target is on fire!';
```

Replace with:
```js
        // Build message with overpenetration info
        let message = `💥 ${attackerName} hit ${targetName} at ${target.position} for ${finalDamage} damage!`;
        if (isCritical) message += ' 🎯 CRITICAL HIT!';
        if (penetrated) message += ' (Penetration!)';
        else if (finalDamage === 0) message += ' (Ricochet!)';
        else message += ' (Spall damage)';

        // **NEW: Add overpenetration message**
        const overpenetrationMessage = this.getOverpenetrationMessage(overpenetrationModifier);
        message += overpenetrationMessage;

        if (disableMessage) message += disableMessage;
        if (target.onFire && target.fireTimer > 0) message += ' 🔥 Target is on fire!';
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: add disabling hit roll in executeAttack with turret damage scaling"
```

---

### Task 4: Add "all turrets disabled" guard to Discord attack handlers

**Files:**
- Modify: `bot.js` — two Discord attack call sites (lines ~8160 and ~8462)

When all of a player's main turrets are disabled, the main gun cannot fire at all.

- [ ] **Step 1: Add guard to `handleShoot`**

Find this block in `handleShoot` (around line 8160):
```js
    async handleShoot(interaction, player, game) {
       if (player.actionPoints < 1) return interaction.reply({ content: 'Not enough Action Points!', flags: MessageFlags.Ephemeral });
       
       const targets = this.getTargetsInRange(player, game, player.stats.range);
       if (targets.length === 0) return interaction.reply({ content: 'No targets in range!', flags: MessageFlags.Ephemeral });

       const target = targets[0];
       const result = this.executeAttack(player, target, 'main', 'ap', game);
```

Replace with:
```js
    async handleShoot(interaction, player, game) {
       if (player.actionPoints < 1) return interaction.reply({ content: 'Not enough Action Points!', flags: MessageFlags.Ephemeral });

       if ((player.disabledTurrets ?? 0) > 0) {
           const totalTurrets = this.getMainTurretCount(player);
           if (totalTurrets > 0 && player.disabledTurrets >= totalTurrets) {
               return interaction.reply({ content: '❌ All turrets are disabled — main guns cannot fire!', flags: MessageFlags.Ephemeral });
           }
       }

       const targets = this.getTargetsInRange(player, game, player.stats.range);
       if (targets.length === 0) return interaction.reply({ content: 'No targets in range!', flags: MessageFlags.Ephemeral });

       const target = targets[0];
       const result = this.executeAttack(player, target, 'main', 'ap', game);
```

- [ ] **Step 2: Add guard to the weapon-selection Discord attack handler**

Find this block (around line 8462):
```js
        if (weaponType === 'main' && player.shipClass?.includes('Battleship') && player.weaponsFiredThisTurn.has('main')) {
            return interaction.update({ content: '❌ Battleship main guns can only be fired once per turn!', embeds: [], components: [] });
        }

        // Execute the attack
        const result = this.executeAttack(player, target, weaponType, shellType, game);
```

Replace with:
```js
        if (weaponType === 'main' && player.shipClass?.includes('Battleship') && player.weaponsFiredThisTurn.has('main')) {
            return interaction.update({ content: '❌ Battleship main guns can only be fired once per turn!', embeds: [], components: [] });
        }

        if (weaponType === 'main' && (player.disabledTurrets ?? 0) > 0) {
            const totalTurrets = this.getMainTurretCount(player);
            if (totalTurrets > 0 && player.disabledTurrets >= totalTurrets) {
                return interaction.update({ content: '❌ All turrets are disabled — main guns cannot fire!', embeds: [], components: [] });
            }
        }

        // Execute the attack
        const result = this.executeAttack(player, target, weaponType, shellType, game);
```

- [ ] **Step 3: Add guard to web API attack endpoint**

Find this block in the `/api/game/:channelId/attack` handler (around line 21549):
```js
                if (weaponType === 'main' && player.shipClass?.includes('Battleship') && player.weaponsFiredThisTurn.has('main')) {
                    return res.status(400).json({ error: 'Battleship main guns can only be fired once per turn' });
                }

                // Perform attack using existing combat system
                const attackResult = this.executeAttack(player, target, weaponType, shellType || 'ap', game);
```

Replace with:
```js
                if (weaponType === 'main' && player.shipClass?.includes('Battleship') && player.weaponsFiredThisTurn.has('main')) {
                    return res.status(400).json({ error: 'Battleship main guns can only be fired once per turn' });
                }

                if (weaponType === 'main' && (player.disabledTurrets ?? 0) > 0) {
                    const totalTurrets = this.getMainTurretCount(player);
                    if (totalTurrets > 0 && player.disabledTurrets >= totalTurrets) {
                        return res.status(400).json({ error: 'All turrets are disabled — main guns cannot fire' });
                    }
                }

                // Perform attack using existing combat system
                const attackResult = this.executeAttack(player, target, weaponType, shellType || 'ap', game);
```

- [ ] **Step 4: Commit**

```bash
git add bot.js
git commit -m "feat: block main gun fire when all turrets are disabled"
```

---

### Task 5: Add engine and rudder movement restrictions

**Files:**
- Modify: `bot.js` — Discord move handler (~line 7733) and web API move endpoint (~line 21347)

- [ ] **Step 1: Add engine/rudder checks to Discord move handler**

Find this block in the Discord move handler (around line 7733):
```js
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }
```

After that block (before the "stay" command check), insert:
```js
        if (player.enginesDamaged) {
            return interaction.reply({ content: '❌ Your engines are disabled — you cannot move!', flags: MessageFlags.Ephemeral });
        }
```

Then find the range/distance check block (around line 7780):
```js
        // Check range using Chebyshev distance (diagonal = 1)
        const currentPos = this.coordToNumbers(player.position);
        const destPos = this.coordToNumbers(destination);
        const deltaX = Math.abs(destPos.x - currentPos.x);
        const deltaY = Math.abs(destPos.y - currentPos.y);
        const distance = Math.max(deltaX, deltaY); // Chebyshev distance
        
        const maxMoveRange = diveSystem.isSubmarine(player)
            ? diveSystem.getEffectiveSpeed(player)
            : (player.stats.speed || 3);
        if (distance > maxMoveRange) {
            return interaction.reply({
                content: `❌ Too far! Max: ${maxMoveRange}, Distance: ${distance}`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Execute movement
        await this.executeMovement(player, game, destination, interaction);
```

Replace with:
```js
        // Check range using Chebyshev distance (diagonal = 1)
        const currentPos = this.coordToNumbers(player.position);
        const destPos = this.coordToNumbers(destination);
        const deltaX = Math.abs(destPos.x - currentPos.x);
        const deltaY = Math.abs(destPos.y - currentPos.y);
        const distance = Math.max(deltaX, deltaY); // Chebyshev distance
        
        const maxMoveRange = diveSystem.isSubmarine(player)
            ? diveSystem.getEffectiveSpeed(player)
            : (player.stats.speed || 3);
        if (distance > maxMoveRange) {
            return interaction.reply({
                content: `❌ Too far! Max: ${maxMoveRange}, Distance: ${distance}`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (player.rudderDamaged) {
            const dx = destPos.x - currentPos.x;
            const dy = (destPos.y - 1) - (currentPos.y - 1); // y is 1-indexed from coordToNumbers
            if (!this.isAlongFacing(player, dx, dy)) {
                return interaction.reply({ content: '❌ Your rudder is damaged — you can only move forward or backward!', flags: MessageFlags.Ephemeral });
            }
        }

        // Execute movement
        await this.executeMovement(player, game, destination, interaction);
```

- [ ] **Step 2: Add engine/rudder checks to web API move endpoint**

Find this block in `/api/game/:channelId/move` (around line 21372):
```js
                if (player.actionsThisTurn >= player.maxActions) {
                    return res.status(400).json({ error: 'No actions remaining this turn' });
                }

                // Validate coordinates
                if (x < 0 || x >= game.mapSize || y < 0 || y >= game.mapSize) {
```

After the `actionsThisTurn` check, insert:
```js
                if (player.enginesDamaged) {
                    return res.status(400).json({ error: 'Your engines are disabled — you cannot move' });
                }
```

Then find the reef-check block in the web API move handler (around line 21402):
```js
                // Submerged submarines cannot land on or path through reef squares
                if (diveSystem.isSubmarine(player) && player.depth !== 'surface') {
                    if (destCell?.type === 'reef') {
                        return res.status(400).json({ error: 'Submerged submarines cannot move onto reef squares.' });
                    }
                    if (player.position && this.hasReefAlongPath(game, player.position, destCoord)) {
                        return res.status(400).json({ error: 'Submerged submarines cannot move through reef squares.' });
                    }
                }

                // Track distance travelled before updating position
```

Insert the rudder check between the reef check and the "Track distance" comment:
```js
                if (player.rudderDamaged && player.x != null && player.y != null) {
                    const dx = x - player.x;
                    const dy = y - player.y;
                    if (!this.isAlongFacing(player, dx, dy)) {
                        return res.status(400).json({ error: 'Your rudder is damaged — you can only move forward or backward' });
                    }
                }

                // Track distance travelled before updating position
```

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: enforce engine and rudder movement restrictions"
```

---

### Task 6: Extend Damage Control to clear component damage

**Files:**
- Modify: `bot.js` — Discord DC handler (`handleDamageControl`) and web API DC endpoint

- [ ] **Step 1: Extend Discord DC handler**

Find `handleDamageControl` (around line 9247):
```js
        const hadStatusEffects = player.onFire || player.flooding || player.bleeding;

        player.onFire = false;
        player.flooding = false;
        player.bleeding = false;
        player.fireTimer = 0;
        player.floodTimer = 0;
        player.damageControlCooldown = 8;
```

Replace with:
```js
        const hadStatusEffects = player.onFire || player.flooding || player.bleeding ||
            player.rudderDamaged || player.enginesDamaged || (player.disabledTurrets ?? 0) > 0;

        player.onFire = false;
        player.flooding = false;
        player.bleeding = false;
        player.fireTimer = 0;
        player.floodTimer = 0;
        player.rudderDamaged = false;
        player.rudderRepairTimer = 0;
        player.enginesDamaged = false;
        player.enginesRepairTimer = 0;
        player.disabledTurrets = 0;
        player.turretRepairTimer = 0;
        player.damageControlCooldown = 8;
```

- [ ] **Step 2: Extend web API DC endpoint**

Find this block in the web API DC endpoint (around line 21828):
```js
                if (!player.onFire && !player.flooding && !player.bleeding) {
                    return res.status(400).json({ error: 'No damage conditions to control' });
                }
                player.onFire = false;
                player.flooding = false;
                player.bleeding = false;
                player.fireTimer = 0;
                player.floodTimer = 0;
                player.damageControlCooldown = 8;
```

Replace with:
```js
                const hasComponentDamage = player.rudderDamaged || player.enginesDamaged || (player.disabledTurrets ?? 0) > 0;
                if (!player.onFire && !player.flooding && !player.bleeding && !hasComponentDamage) {
                    return res.status(400).json({ error: 'No damage conditions to control' });
                }
                player.onFire = false;
                player.flooding = false;
                player.bleeding = false;
                player.fireTimer = 0;
                player.floodTimer = 0;
                player.rudderDamaged = false;
                player.rudderRepairTimer = 0;
                player.enginesDamaged = false;
                player.enginesRepairTimer = 0;
                player.disabledTurrets = 0;
                player.turretRepairTimer = 0;
                player.damageControlCooldown = 8;
```

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: extend damage control to repair disabled components"
```

---

### Task 7: Add repair timer processing to `processTurnEffects`

**Files:**
- Modify: `bot.js` — `processTurnEffects` (around line 18468)

- [ ] **Step 1: Insert repair timer countdown after the existing cooldown processing**

Find this block in `processTurnEffects` (around line 18468):
```js
        // Process cooldowns
        if (player.damageControlCooldown > 0) {
            player.damageControlCooldown--;
        }

        // Process item buff expiry
```

Replace with:
```js
        // Process cooldowns
        if (player.damageControlCooldown > 0) {
            player.damageControlCooldown--;
        }

        // Process component repair timers
        if (player.rudderRepairTimer > 0) {
            player.rudderRepairTimer--;
            if (player.rudderRepairTimer <= 0) {
                player.rudderDamaged = false;
                const shipName = player.characterAlias || player.shipClass || 'Ship';
                messages.push(`🔧 **${shipName}**'s **rudder** has been repaired.`);
            }
        }
        if (player.enginesRepairTimer > 0) {
            player.enginesRepairTimer--;
            if (player.enginesRepairTimer <= 0) {
                player.enginesDamaged = false;
                const shipName = player.characterAlias || player.shipClass || 'Ship';
                messages.push(`🔧 **${shipName}**'s **engines** have been repaired.`);
            }
        }
        if (player.turretRepairTimer > 0) {
            player.turretRepairTimer--;
            if (player.turretRepairTimer <= 0 && (player.disabledTurrets ?? 0) > 0) {
                player.disabledTurrets = 0;
                const shipName = player.characterAlias || player.shipClass || 'Ship';
                messages.push(`🔧 **${shipName}**'s **turrets** have been fully repaired.`);
            }
        }

        // Process item buff expiry
```

- [ ] **Step 2: Commit**

```bash
git add bot.js
git commit -m "feat: add component repair timer countdown in processTurnEffects"
```

---

### Task 8: Include new fields in game state serialization

**Files:**
- Modify: `bot.js` — game state API player/enemy serialization (~line 21054)

The frontend receives player data via the broadcastGameUpdate serialization. The new fields must be included.

- [ ] **Step 1: Add fields to player serialization**

Find this block in the players serialization map (around line 21063):
```js
                    onFire: p.onFire,
                    flooding: p.flooding,
                    sunk: p.sunk ?? !p.alive,
```

Replace with:
```js
                    onFire: p.onFire,
                    flooding: p.flooding,
                    sunk: p.sunk ?? !p.alive,
                    rudderDamaged: p.rudderDamaged ?? false,
                    enginesDamaged: p.enginesDamaged ?? false,
                    disabledTurrets: p.disabledTurrets ?? 0,
```

- [ ] **Step 2: Commit**

```bash
git add bot.js
git commit -m "feat: include component damage fields in game state serialization"
```

---

### Task 9: Frontend — status icons, log entries, DC button condition

**Files:**
- Modify: `web-server/client/src/components/GameView.js`

Three display locations, event log detection, and the DC button condition.

- [ ] **Step 1: Add status icons in the cell-popup friendly unit list**

Find this block (around line 1166):
```jsx
                  {p.onFire && <span className="unit-status">🔥</span>}
                  {p.flooding && <span className="unit-status">💧</span>}
                  {p.bleeding && <span className="unit-status">🩸</span>}
```

Replace with:
```jsx
                  {p.onFire && <span className="unit-status">🔥</span>}
                  {p.flooding && <span className="unit-status">💧</span>}
                  {p.bleeding && <span className="unit-status">🩸</span>}
                  {p.rudderDamaged && <span className="unit-status" title="Rudder Damaged">⚙️</span>}
                  {p.enginesDamaged && <span className="unit-status" title="Engines Out">⚙️</span>}
                  {(p.disabledTurrets ?? 0) > 0 && <span className="unit-status" title={`Turret Damaged (${p.disabledTurrets} out)`}>💥</span>}
```

- [ ] **Step 2: Add status icons in the sidebar ship list**

Find this block (around line 1441):
```jsx
                          {player.onFire   && '🔥'}
                          {player.flooding && '💧'}
                          {player.bleeding && '🩸'}
```

Replace with:
```jsx
                          {player.onFire        && '🔥'}
                          {player.flooding      && '💧'}
                          {player.bleeding      && '🩸'}
                          {player.rudderDamaged && '⚙️'}
                          {player.enginesDamaged && '⚙️'}
                          {(player.disabledTurrets ?? 0) > 0 && '💥'}
```

- [ ] **Step 3: Add component status event log entries for players**

Find this block (around line 397):
```js
      // Status applied
      if (!pp.onFire   && p.onFire)   addE(`🔥 ${name} caught fire!`,         'status');
      if (!pp.flooding && p.flooding) addE(`💧 ${name} started flooding!`,     'status');
      if (!pp.bleeding && p.bleeding) addE(`🩸 ${name} is bleeding!`,           'status');

      // Status cleared
      if (pp.onFire   && !p.onFire   && !p.sunk) addE(`🔧 ${name}'s fire was extinguished`,    'status-clear');
      if (pp.flooding && !p.flooding && !p.sunk) addE(`🔧 ${name} stopped flooding`,            'status-clear');
```

Replace with:
```js
      // Status applied
      if (!pp.onFire   && p.onFire)   addE(`🔥 ${name} caught fire!`,         'status');
      if (!pp.flooding && p.flooding) addE(`💧 ${name} started flooding!`,     'status');
      if (!pp.bleeding && p.bleeding) addE(`🩸 ${name} is bleeding!`,           'status');
      if (!pp.rudderDamaged  && p.rudderDamaged)  addE(`⚙️ ${name}'s rudder has been damaged!`,   'status');
      if (!pp.enginesDamaged && p.enginesDamaged) addE(`⚙️ ${name}'s engines have been disabled!`, 'status');
      if (!(pp.disabledTurrets > 0) && p.disabledTurrets > 0) addE(`💥 ${name}'s turret has been knocked out!`, 'status');

      // Status cleared
      if (pp.onFire   && !p.onFire   && !p.sunk) addE(`🔧 ${name}'s fire was extinguished`,    'status-clear');
      if (pp.flooding && !p.flooding && !p.sunk) addE(`🔧 ${name} stopped flooding`,            'status-clear');
      if (pp.rudderDamaged  && !p.rudderDamaged  && !p.sunk) addE(`🔧 ${name}'s rudder has been repaired`,   'status-clear');
      if (pp.enginesDamaged && !p.enginesDamaged && !p.sunk) addE(`🔧 ${name}'s engines have been repaired`, 'status-clear');
      if ((pp.disabledTurrets > 0) && !(p.disabledTurrets > 0) && !p.sunk) addE(`🔧 ${name}'s turrets have been repaired`, 'status-clear');
```

- [ ] **Step 4: Update the DC button disabled condition**

Find this block (around line 1515):
```jsx
                      disabled={
                        (selectedPlayer.damageControlCooldown ?? 0) > 0 ||
                        (!selectedPlayer.onFire && !selectedPlayer.flooding && !selectedPlayer.bleeding) ||
                        selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions
                      }
```

Replace with:
```jsx
                      disabled={
                        (selectedPlayer.damageControlCooldown ?? 0) > 0 ||
                        (!selectedPlayer.onFire && !selectedPlayer.flooding && !selectedPlayer.bleeding &&
                         !selectedPlayer.rudderDamaged && !selectedPlayer.enginesDamaged && !(selectedPlayer.disabledTurrets > 0)) ||
                        selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions
                      }
```

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/components/GameView.js
git commit -m "feat: display component damage status in GameView (icons, log, DC button)"
```

---

## Self-Review

### Spec coverage check
- ✅ Trigger: disable roll after crit (Task 3)
- ✅ Probabilities: 50/25/15/10 split (Task 3, Step 2)
- ✅ No turret disable if no mountGroups (Task 3, `totalTurrets > 0` guard)
- ✅ Rudder: forward/backward only (Task 5)
- ✅ Engines: no movement (Task 5)
- ✅ Turrets: damage scaling + all-out guard (Tasks 3 + 4)
- ✅ Natural repair: 3-turn timer (Task 7)
- ✅ DC repair: immediate clear (Task 6)
- ✅ Timer reset on re-hit (executeAttack overwrites timer to 3 unconditionally)
- ✅ AI ships affected: they go through same `executeAttack` and `processTurnEffects`
- ✅ UI: icons, log, DC button (Task 9)
- ✅ Fields serialized to frontend (Task 8)
- ✅ Icons are placeholder emoji (will be swapped later)

### Type consistency check
- `getMainTurretCount` defined in Task 1, used in Tasks 3, 4
- `isAlongFacing` defined in Task 1, used in Task 5
- `disabledTurrets` initialized as `0` (number), compared with `> 0`, incremented with `+ 1` — consistent
- `rudderDamaged`/`enginesDamaged` initialized as `false`, set to `true` on disable, `false` on repair — consistent
- All timer fields start at `0`, set to `3` on disable, decremented in `processTurnEffects` — consistent
