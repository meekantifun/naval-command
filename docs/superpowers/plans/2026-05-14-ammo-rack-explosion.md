# Ammo Rack Explosion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an extremely rare ammo rack explosion outcome to penetrating critical turret hits — permanent turret destruction, 25% max HP damage, fire and flooding — repairable only by an AX ship over 3 turns.

**Architecture:** Two new fields (`ammoRackTurrets`, `ammoRackRepairTimer`) on all player objects, following the existing `disabledTurrets`/`turretRepairTimer` pattern. The ammo rack is a sub-roll inside the existing turret disable branch of `executeAttack`. A new AX repair action (Discord button + web API endpoint) sets the repair timer. All turn-end countdown lives in `processTurnEffects`.

**Tech Stack:** Node.js (`bot.js`), React (`GameView.js`)

---

## File Structure

| File | Changes |
|---|---|
| `bot.js` | Init fields (3 locations); ammo rack sub-roll in `executeAttack`; damage scaling + 3 all-turrets guards updated; `processTurnEffects` repair countdown; game state serialization; Discord `handleRepairAlly`/`executeRepairAlly` methods + button + select handler; web API `/api/game/:channelId/ax-repair` |
| `web-server/client/src/components/GameView.js` | Ammo rack status badges (cell popup + sidebar), event log entries, AX repair button |

---

### Task 1: Initialize ammoRackTurrets and ammoRackRepairTimer fields

**Files:**
- Modify: `bot.js` — three player init locations

- [ ] **Step 1: Add fields to `addPlayer` (~line 24539)**

Find this block in `bot.js`:
```js
            disabledTurrets: 0,
            turretRepairTimer: 0,
            fuel: 100,
            ammo: new Map([['main', 50], ['secondary', 100], ['torpedoes', 12]]),
            hasTorpedoes: ['Destroyer', 'Submarine', 'Light Cruiser'].includes(shipClass),
```

Replace with:
```js
            disabledTurrets: 0,
            turretRepairTimer: 0,
            ammoRackTurrets: 0,
            ammoRackRepairTimer: 0,
            fuel: 100,
            ammo: new Map([['main', 50], ['secondary', 100], ['torpedoes', 12]]),
            hasTorpedoes: ['Destroyer', 'Submarine', 'Light Cruiser'].includes(shipClass),
```

- [ ] **Step 2: Add fields to `addOPFORPlayer` (~line 24594)**

Find this block in `bot.js`:
```js
            disabledTurrets: 0,
            turretRepairTimer: 0,
            fuel: 100,
            ammo: new Map([['main', 50], ['secondary', 100], ['torpedoes', 12]]),
            hasTorpedoes: ['Destroyer', 'Submarine', 'Light Cruiser'].includes(shipClass),
            aircraft: shipClass.includes('Carrier') ? new Map() : null,
```

Replace with:
```js
            disabledTurrets: 0,
            turretRepairTimer: 0,
            ammoRackTurrets: 0,
            ammoRackRepairTimer: 0,
            fuel: 100,
            ammo: new Map([['main', 50], ['secondary', 100], ['torpedoes', 12]]),
            hasTorpedoes: ['Destroyer', 'Submarine', 'Light Cruiser'].includes(shipClass),
            aircraft: shipClass.includes('Carrier') ? new Map() : null,
```

- [ ] **Step 3: Add fields to `spawnRandomAI` (~line 25533)**

Find this block in `bot.js`:
```js
            disabledTurrets: 0,
            turretRepairTimer: 0,
            tonnage: customAI.tonnage,
```

Replace with:
```js
            disabledTurrets: 0,
            turretRepairTimer: 0,
            ammoRackTurrets: 0,
            ammoRackRepairTimer: 0,
            tonnage: customAI.tonnage,
```

- [ ] **Step 4: Verify — search for `ammoRackTurrets: 0` in bot.js**

Should appear exactly 3 times.

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "feat: initialize ammoRackTurrets and ammoRackRepairTimer on player/AI objects"
```

---

### Task 2: Update turret damage scaling and all-turrets-out guards

**Files:**
- Modify: `bot.js` — `executeAttack` damage scaling + 3 all-turrets guards

All four changes fold `ammoRackTurrets` into the turret count so permanently destroyed turrets reduce damage and block firing the same way as temporarily disabled ones.

- [ ] **Step 1: Update damage scaling in `executeAttack`**

Find this block (search for `Turret damage scaling:`):
```js
        // Turret damage scaling: each disabled turret reduces main-gun output proportionally
        if (weapon === 'main' && (attacker.disabledTurrets ?? 0) > 0) {
            const totalTurrets = this.getMainTurretCount(attacker);
            if (totalTurrets > 0) {
                const operational = Math.max(0, totalTurrets - attacker.disabledTurrets);
                baseDamage = Math.round(baseDamage * (operational / totalTurrets));
            }
        }
```

Replace with:
```js
        // Turret damage scaling: each disabled or destroyed turret reduces main-gun output proportionally
        if (weapon === 'main' && ((attacker.disabledTurrets ?? 0) > 0 || (attacker.ammoRackTurrets ?? 0) > 0)) {
            const totalTurrets = this.getMainTurretCount(attacker);
            if (totalTurrets > 0) {
                const operational = Math.max(0, totalTurrets - (attacker.disabledTurrets ?? 0) - (attacker.ammoRackTurrets ?? 0));
                baseDamage = Math.round(baseDamage * (operational / totalTurrets));
            }
        }
```

- [ ] **Step 2: Update all-turrets guard in `handleShoot`**

Find this block (search for `All turrets are disabled — main guns cannot fire!` in the `handleShoot` method, around line 8193):
```js
       if ((player.disabledTurrets ?? 0) > 0) {
           const totalTurrets = this.getMainTurretCount(player);
           if (totalTurrets > 0 && player.disabledTurrets >= totalTurrets) {
               return interaction.reply({ content: '❌ All turrets are disabled — main guns cannot fire!', flags: MessageFlags.Ephemeral });
           }
       }
```

Replace with:
```js
       if ((player.disabledTurrets ?? 0) > 0 || (player.ammoRackTurrets ?? 0) > 0) {
           const totalTurrets = this.getMainTurretCount(player);
           if (totalTurrets > 0 && (player.disabledTurrets ?? 0) + (player.ammoRackTurrets ?? 0) >= totalTurrets) {
               return interaction.reply({ content: '❌ All turrets are disabled or destroyed — main guns cannot fire!', flags: MessageFlags.Ephemeral });
           }
       }
```

- [ ] **Step 3: Update all-turrets guard in the Discord weapon-select handler**

Find this block (the `interaction.update` version that uses `embeds: [], components: []`):
```js
        if (weaponType === 'main' && (player.disabledTurrets ?? 0) > 0) {
            const totalTurrets = this.getMainTurretCount(player);
            if (totalTurrets > 0 && player.disabledTurrets >= totalTurrets) {
                return interaction.update({ content: '❌ All turrets are disabled — main guns cannot fire!', embeds: [], components: [] });
            }
        }
```

Replace with:
```js
        if (weaponType === 'main' && ((player.disabledTurrets ?? 0) > 0 || (player.ammoRackTurrets ?? 0) > 0)) {
            const totalTurrets = this.getMainTurretCount(player);
            if (totalTurrets > 0 && (player.disabledTurrets ?? 0) + (player.ammoRackTurrets ?? 0) >= totalTurrets) {
                return interaction.update({ content: '❌ All turrets are disabled or destroyed — main guns cannot fire!', embeds: [], components: [] });
            }
        }
```

- [ ] **Step 4: Update all-turrets guard in the web API attack endpoint**

Find this block (the `res.status(400).json` version, around line 21677):
```js
                if (weaponType === 'main' && (player.disabledTurrets ?? 0) > 0) {
                    const totalTurrets = this.getMainTurretCount(player);
                    if (totalTurrets > 0 && player.disabledTurrets >= totalTurrets) {
                        return res.status(400).json({ error: 'All turrets are disabled — main guns cannot fire' });
                    }
                }
```

Replace with:
```js
                if (weaponType === 'main' && ((player.disabledTurrets ?? 0) > 0 || (player.ammoRackTurrets ?? 0) > 0)) {
                    const totalTurrets = this.getMainTurretCount(player);
                    if (totalTurrets > 0 && (player.disabledTurrets ?? 0) + (player.ammoRackTurrets ?? 0) >= totalTurrets) {
                        return res.status(400).json({ error: 'All turrets are disabled or destroyed — main guns cannot fire' });
                    }
                }
```

- [ ] **Step 5: Verify — search for `All turrets are disabled` in bot.js**

Should find 0 results (all three have been updated to "disabled or destroyed").

- [ ] **Step 6: Commit**

```bash
git add bot.js
git commit -m "feat: fold ammoRackTurrets into turret damage scaling and all-turrets-out guards"
```

---

### Task 3: Add ammo rack sub-roll to executeAttack

**Files:**
- Modify: `bot.js` — inside the turret disable branch (`roll > 90`) of `executeAttack`

The ammo rack sub-roll replaces the normal turret disable path when it fires. At this point in the code, `finalDamage` is already set to `baseDamage` — overwriting it with `Math.round(target.maxHealth * 0.25)` is correct because `target.currentHealth` is not decremented until later in the function.

- [ ] **Step 1: Replace the turret outcome branch**

Find this exact block in `executeAttack`:
```js
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
```

Replace with:
```js
                } else if (roll > 90) {
                    const totalTurrets = this.getMainTurretCount(target);
                    const totalOut = (target.disabledTurrets ?? 0) + (target.ammoRackTurrets ?? 0);
                    if (totalTurrets > 0 && totalOut < totalTurrets) {
                        if (Math.random() < 0.05) {
                            target.ammoRackTurrets = (target.ammoRackTurrets ?? 0) + 1;
                            target.onFire = true;
                            target.fireTimer = 10;
                            target.flooding = true;
                            target.floodTimer = 10;
                            finalDamage = Math.round(target.maxHealth * 0.25);
                            const remaining = totalTurrets - (target.disabledTurrets ?? 0) - target.ammoRackTurrets;
                            disableMessage = `\n💥 **AMMO RACK DETONATION!** ${targetName}'s **turret** has been catastrophically destroyed! (${remaining}/${totalTurrets} operational — requires AX to repair)`;
                        } else {
                            target.disabledTurrets = (target.disabledTurrets ?? 0) + 1;
                            target.turretRepairTimer = 3;
                            const remaining = totalTurrets - target.disabledTurrets;
                            const pct = Math.round((remaining / totalTurrets) * 100);
                            disableMessage = `\n⚙️ **DISABLING HIT!** ${targetName}'s **turret** has been knocked out! (${remaining}/${totalTurrets} operational — damage reduced to ${pct}%)`;
                        }
                    }
                }
```

- [ ] **Step 2: Verify — search for `AMMO RACK DETONATION` in bot.js**

Should appear exactly once.

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: add ammo rack sub-roll to executeAttack turret outcome"
```

---

### Task 4: Add ammoRackRepairTimer countdown to processTurnEffects

**Files:**
- Modify: `bot.js` — `processTurnEffects` (~line 18581)

- [ ] **Step 1: Insert repair timer after the existing turret timer block**

Find this exact block in `processTurnEffects`:
```js
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

Replace with:
```js
        if (player.turretRepairTimer > 0) {
            player.turretRepairTimer--;
            if (player.turretRepairTimer <= 0 && (player.disabledTurrets ?? 0) > 0) {
                player.disabledTurrets = 0;
                const shipName = player.characterAlias || player.shipClass || 'Ship';
                messages.push(`🔧 **${shipName}**'s **turrets** have been fully repaired.`);
            }
        }
        if (player.ammoRackRepairTimer > 0) {
            player.ammoRackRepairTimer--;
            if (player.ammoRackRepairTimer <= 0 && (player.ammoRackTurrets ?? 0) > 0) {
                player.ammoRackTurrets = Math.max(0, player.ammoRackTurrets - 1);
                const shipName = player.characterAlias || player.shipClass || 'Ship';
                messages.push(`🔧 **${shipName}**'s destroyed turret has been restored by AX repair.`);
            }
        }

        // Process item buff expiry
```

- [ ] **Step 2: Commit**

```bash
git add bot.js
git commit -m "feat: add ammoRackRepairTimer countdown in processTurnEffects"
```

---

### Task 5: Add ammoRackTurrets and ammoRackRepairTimer to game state serialization

**Files:**
- Modify: `bot.js` — player map in `broadcastGameUpdate` (~line 21178)

- [ ] **Step 1: Add fields to the serialization map**

Find this block:
```js
                    disabledTurrets: p.disabledTurrets ?? 0,
                    weapons: p.weapons,
```

Replace with:
```js
                    disabledTurrets: p.disabledTurrets ?? 0,
                    ammoRackTurrets: p.ammoRackTurrets ?? 0,
                    ammoRackRepairTimer: p.ammoRackRepairTimer ?? 0,
                    weapons: p.weapons,
```

- [ ] **Step 2: Commit**

```bash
git add bot.js
git commit -m "feat: include ammoRackTurrets and ammoRackRepairTimer in game state serialization"
```

---

### Task 6: Add Discord AX repair handler

**Files:**
- Modify: `bot.js` — `createActionButtons`, `handlePlayerAction`, `handleStringSelectMenu`, new methods after `handleDamageControl`

- [ ] **Step 1: Add `handleRepairAlly` and `executeRepairAlly` methods after `handleDamageControl`**

Find this exact line (end of `handleDamageControl`):
```js
        // Sync web dashboard
        this.broadcastGameUpdate(game.channelId).catch(() => {});
    }

    getRangeModifier(distance, maxRange) {
```

Replace with:
```js
        // Sync web dashboard
        this.broadcastGameUpdate(game.channelId).catch(() => {});
    }

    async handleRepairAlly(interaction, player, game) {
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }
        if (player.shipClass !== 'AX') {
            return interaction.reply({ content: '❌ Only AX ships can perform turret repairs!', flags: MessageFlags.Ephemeral });
        }
        const allPlayers = Array.from(game.players.values());
        const targets = allPlayers.filter(p =>
            p.id !== player.id &&
            !p.isOPFOR &&
            (p.ammoRackTurrets ?? 0) > 0 &&
            (p.ammoRackRepairTimer ?? 0) === 0 &&
            p.x != null && p.y != null &&
            player.x != null && player.y != null &&
            Math.max(Math.abs(p.x - player.x), Math.abs(p.y - player.y)) <= 3
        );
        if (targets.length === 0) {
            return interaction.reply({ content: '❌ No allies with ammo rack damage within 3 tiles!', flags: MessageFlags.Ephemeral });
        }
        if (targets.length === 1) {
            return this.executeRepairAlly(interaction, player, targets[0], game);
        }
        const options = targets.map(t => ({
            label: (t.characterAlias || t.shipClass || 'Ship').slice(0, 100),
            description: `${t.ammoRackTurrets} turret(s) destroyed`,
            value: t.id
        }));
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`repair_ally_select_${player.id}`)
            .setPlaceholder('Select ally to repair')
            .addOptions(options);
        await interaction.reply({
            content: '🔧 Select an ally to begin turret repairs:',
            components: [new ActionRowBuilder().addComponents(menu)],
            flags: MessageFlags.Ephemeral
        });
    }

    async executeRepairAlly(interaction, player, target, game) {
        target.ammoRackRepairTimer = 3;
        this.consumeAction(player);
        const axName = player.characterAlias || player.displayName || player.username || 'AX';
        const targetName = target.characterAlias || target.displayName || target.username || 'Ship';
        await this.broadcastGameUpdate(game.channelId);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: `✅ Repair started on **${targetName}**! (3 turns)`, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: `✅ Repair started on **${targetName}**! (3 turns)`, flags: MessageFlags.Ephemeral });
        }
        const channel = this.client.channels.cache.get(game.channelId);
        if (channel) {
            channel.send({ content: `🔧 **${axName}** has begun emergency repairs on **${targetName}**'s turret! (3 turns remaining)` }).catch(() => {});
        }
    }

    getRangeModifier(distance, maxRange) {
```

- [ ] **Step 2: Add Repair Ally button to `createActionButtons`**

Find this block in `createActionButtons` (search for `launch_recon`):
```js
        // Add Launch Recon button if player has a recon aircraft and hasn't used it yet
        if (player.reconAircraft && !player.reconUsed) {
            buttons.splice(-1, 0, new ButtonBuilder()
                .setCustomId('launch_recon')
                .setLabel('🛩️ Launch Recon')
                .setStyle(ButtonStyle.Primary)
            );
        }
```

Replace with:
```js
        // Add Launch Recon button if player has a recon aircraft and hasn't used it yet
        if (player.reconAircraft && !player.reconUsed) {
            buttons.splice(-1, 0, new ButtonBuilder()
                .setCustomId('launch_recon')
                .setLabel('🛩️ Launch Recon')
                .setStyle(ButtonStyle.Primary)
            );
        }

        // Add Repair Ally button for AX ships with valid nearby targets
        if (player.shipClass === 'AX' && game) {
            const hasRepairTargets = Array.from(game.players.values()).some(p =>
                p.id !== player.id &&
                !p.isOPFOR &&
                (p.ammoRackTurrets ?? 0) > 0 &&
                (p.ammoRackRepairTimer ?? 0) === 0 &&
                p.x != null && p.y != null &&
                player.x != null && player.y != null &&
                Math.max(Math.abs(p.x - player.x), Math.abs(p.y - player.y)) <= 3
            );
            if (hasRepairTargets) {
                buttons.splice(-1, 0, new ButtonBuilder()
                    .setCustomId('repair_ally')
                    .setLabel('🔧 Repair Ally')
                    .setStyle(ButtonStyle.Success)
                );
            }
        }
```

- [ ] **Step 3: Add `repair_ally` case to `handlePlayerAction`**

Find this block in `handlePlayerAction`:
```js
                case 'dmg_control':
                    await this.handleDamageControl(interaction, player, game);
                    break;
```

Replace with:
```js
                case 'dmg_control':
                    await this.handleDamageControl(interaction, player, game);
                    break;
                case 'repair_ally':
                    await this.handleRepairAlly(interaction, player, game);
                    break;
```

- [ ] **Step 4: Add `repair_ally_select_` handler to `handleStringSelectMenu`**

Find this block in `handleStringSelectMenu`:
```js
            // Handle character selection (if you have this)
            if (interaction.customId.startsWith('select_character_')) {
                await this.handleCharacterSelection(interaction);
                return;
            }
            
            // Add other string select menu handlers here as needed
```

Replace with:
```js
            // Handle character selection (if you have this)
            if (interaction.customId.startsWith('select_character_')) {
                await this.handleCharacterSelection(interaction);
                return;
            }

            // AX repair ally target selection
            if (interaction.customId.startsWith('repair_ally_select_')) {
                const game = this.games.get(interaction.channelId);
                if (!game) return interaction.update({ content: '❌ No active game.', components: [] });
                const playerId = interaction.customId.replace('repair_ally_select_', '');
                const player = game.players.get(playerId);
                const target = game.players.get(interaction.values[0]);
                if (!player || !target) return interaction.update({ content: '❌ Player not found.', components: [] });
                await interaction.update({ content: '✅ Processing repair...', components: [] });
                await this.executeRepairAlly(interaction, player, target, game);
                return;
            }
            
            // Add other string select menu handlers here as needed
```

- [ ] **Step 5: Commit**

```bash
git add bot.js
git commit -m "feat: add Discord AX repair ally action (button, select menu, handler)"
```

---

### Task 7: Add web API AX repair endpoint

**Files:**
- Modify: `bot.js` — new route after the DC endpoint (~line 21998)

- [ ] **Step 1: Insert the endpoint after the damage-control route**

Find this exact block (the closing of the damage-control route, right before `// Launch recon aircraft`):
```js
            } catch (error) {
                console.error('Error performing damage control:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Launch recon aircraft (non-CV players with a configured reconAircraft)
```

Replace with:
```js
            } catch (error) {
                console.error('Error performing damage control:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // AX turret repair action
        app.post('/api/game/:channelId/ax-repair', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId, targetId } = req.body;
                const game = this.games.get(channelId);
                if (!game) return res.status(404).json({ error: 'Game not found' });
                const player = game.players.get(userId);
                if (!player) return res.status(404).json({ error: 'Player not found in game' });
                if (player.sunk ?? !player.alive) return res.status(400).json({ error: 'Ship is sunk' });
                if (player.shipClass !== 'AX') return res.status(400).json({ error: 'Only AX ships can perform turret repairs' });
                if (player.actionsThisTurn >= player.maxActions) return res.status(400).json({ error: 'No actions remaining this turn' });
                const target = game.players.get(targetId);
                if (!target) return res.status(404).json({ error: 'Target not found in game' });
                if (target.id === player.id) return res.status(400).json({ error: 'Cannot repair yourself' });
                if (target.isOPFOR) return res.status(400).json({ error: 'Cannot repair enemy ships' });
                if ((target.ammoRackTurrets ?? 0) === 0) return res.status(400).json({ error: 'Target has no ammo rack damage' });
                if ((target.ammoRackRepairTimer ?? 0) > 0) return res.status(400).json({ error: 'Target already being repaired' });
                if (player.x == null || player.y == null || target.x == null || target.y == null) {
                    return res.status(400).json({ error: 'Position data unavailable' });
                }
                const dist = Math.max(Math.abs(target.x - player.x), Math.abs(target.y - player.y));
                if (dist > 3) return res.status(400).json({ error: `Target is out of repair range (${dist} tiles, max 3)` });
                target.ammoRackRepairTimer = 3;
                this.consumeAction(player);
                const needsEndTurn = player.actionsThisTurn >= player.maxActions;
                if (needsEndTurn) player.actionPoints = 0;
                await this.broadcastGameUpdate(channelId);
                res.json({ success: true });
                const axName = player.characterAlias || player.displayName || player.username || 'AX';
                const targetName = target.characterAlias || target.displayName || target.username || 'Ship';
                this.client.channels.fetch(channelId)
                    .then(ch => {
                        if (!ch) return;
                        ch.send({ content: `🔧 **${axName}** has begun emergency repairs on **${targetName}**'s turret! (3 turns remaining)` })
                            .then(() => { if (needsEndTurn) this.endPlayerTurn(player); })
                            .catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
                    })
                    .catch(() => { if (needsEndTurn) this.endPlayerTurn(player); });
            } catch (error) {
                console.error('Error performing AX repair:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Launch recon aircraft (non-CV players with a configured reconAircraft)
```

- [ ] **Step 2: Verify — search for `ax-repair` in bot.js**

Should appear exactly once.

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "feat: add web API /api/game/:channelId/ax-repair endpoint"
```

---

### Task 8: Update GameView.js — status badges, event log, and AX repair button

**Files:**
- Modify: `web-server/client/src/components/GameView.js`

- [ ] **Step 1: Add ammo rack badge to cell-popup unit list**

Find this block (~line 1175):
```jsx
                  {(p.disabledTurrets ?? 0) > 0 && <span className="unit-status" title={`Turret Damaged (${p.disabledTurrets} out)`}>💥</span>}
```

Replace with:
```jsx
                  {(p.disabledTurrets ?? 0) > 0 && <span className="unit-status" title={`Turret Damaged (${p.disabledTurrets} out)`}>💥</span>}
                  {(p.ammoRackTurrets ?? 0) > 0 && <span className="unit-status" title={`Ammo Rack (${p.ammoRackTurrets} destroyed — AX repair required)`}>💥</span>}
```

- [ ] **Step 2: Add ammo rack badge to sidebar ship list**

Find this block (~line 1453):
```jsx
                          {(player.disabledTurrets ?? 0) > 0 && '💥'}
```

Replace with:
```jsx
                          {(player.disabledTurrets ?? 0) > 0 && '💥'}
                          {(player.ammoRackTurrets ?? 0) > 0 && '💥'}
```

- [ ] **Step 3: Add ammo rack event log entries**

Find this block in the state-change event detection (~line 402):
```js
      if (!(pp.disabledTurrets > 0) && p.disabledTurrets > 0) addE(`💥 ${name}'s turret has been knocked out!`, 'status');
```

Replace with:
```js
      if (!(pp.disabledTurrets > 0) && p.disabledTurrets > 0) addE(`💥 ${name}'s turret has been knocked out!`, 'status');
      if (!(pp.ammoRackTurrets > 0) && p.ammoRackTurrets > 0) addE(`💥 ${name}'s ammo rack has been detonated!`, 'status');
```

Then find:
```js
      if ((pp.disabledTurrets > 0) && !(p.disabledTurrets > 0) && !p.sunk) addE(`🔧 ${name}'s turrets have been repaired`, 'status-clear');
```

Replace with:
```js
      if ((pp.disabledTurrets > 0) && !(p.disabledTurrets > 0) && !p.sunk) addE(`🔧 ${name}'s turrets have been repaired`, 'status-clear');
      if ((pp.ammoRackTurrets > 0) && !(p.ammoRackTurrets > 0) && !p.sunk) addE(`🔧 ${name}'s turret has been restored by AX repair`, 'status-clear');
```

- [ ] **Step 4: Add AX Repair button in the player action panel**

Find the DC button in the player action panel. Search for `Damage Control` in GameView.js to find the button. It will be inside a section that checks `selectedPlayer`. Find a block like:

```jsx
                      disabled={
                        (selectedPlayer.damageControlCooldown ?? 0) > 0 ||
                        (!selectedPlayer.onFire && !selectedPlayer.flooding && !selectedPlayer.bleeding &&
                         !selectedPlayer.rudderDamaged && !selectedPlayer.enginesDamaged && !(selectedPlayer.disabledTurrets > 0)) ||
                        selectedPlayer.actionsThisTurn >= selectedPlayer.maxActions
                      }
```

Read the broader context (~20 lines) around this DC button to understand the JSX structure, then add an AX Repair button immediately after the DC button's closing tag. The button should only render when `selectedPlayer.shipClass === 'AX'`.

The button should:
1. Show a list of `players` (from the game state) who have `ammoRackTurrets > 0` and `ammoRackRepairTimer === 0`
2. Let the user pick a target (using an HTML `<select>` or a button per target if only one)
3. Call `POST /api/game/:channelId/ax-repair` with `{ userId: selectedPlayer.id, targetId }`

For simplicity, render one button per eligible target. Read the file around the DC button to see the exact JSX pattern, then mirror it.

Find the `onClick` handler of the DC button to understand how API calls are made. It will use `fetch` or a helper. Mirror that pattern for the AX repair call.

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/components/GameView.js
git commit -m "feat: add ammo rack status badges, event log, and AX repair button to GameView"
```

---

## Self-Review

### Spec coverage check
- ✅ Trigger: 5% sub-roll inside turret outcome (Task 3)
- ✅ Effects: fire, flooding, 25% maxHealth damage, ammoRackTurrets++ (Task 3)
- ✅ Permanent turret: separate `ammoRackTurrets` field, never cleared by DC (Task 1 + DC untouched)
- ✅ Damage scaling includes ammoRackTurrets (Task 2, Step 1)
- ✅ All-turrets-out guard uses combined count at all 3 locations (Task 2, Steps 2–4)
- ✅ Natural repair: none — ammoRackRepairTimer only set by AX action (Tasks 4, 6, 7)
- ✅ AX repair: sets `ammoRackRepairTimer = 3`, costs 1 action (Tasks 6, 7)
- ✅ Repair countdown: decrements each turn, restores 1 turret at 0 (Task 4)
- ✅ AX range check: Chebyshev ≤ 3 (Tasks 6, 7)
- ✅ Serialization: both new fields in game state (Task 5)
- ✅ Frontend badges and log (Task 8)
- ✅ 3-tile repair continues even if AX destroyed (timer on target's object, not AX's)

### Type consistency check
- `ammoRackTurrets`: number, initialized `0`, incremented by `1`, decremented by `Math.max(0, x - 1)` in repair
- `ammoRackRepairTimer`: number, initialized `0`, set to `3` by AX action, decremented each turn
- Both use `?? 0` nullish coalescing consistently throughout all references
