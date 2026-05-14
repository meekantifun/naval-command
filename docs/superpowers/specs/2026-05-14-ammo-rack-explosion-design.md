# Ammo Rack Explosion Design Spec

## Goal

Add an extremely rare devastating hit outcome: a penetrating critical hit that rolls a turret disable may further detonate the target's ammo rack, permanently destroying a turret, dealing 25% max HP damage, and setting the ship on fire and flooding. Only an AX (Auxiliary) ship can repair the destroyed turret, over 3 turns.

---

## Trigger Chain

1. Shell penetrates armor (existing penetration check)
2. Critical hit landed (`isCritical === true`)
3. Disable roll fires — lands on turret outcome (roll > 90)
4. **Ammo rack sub-roll:** `Math.random() < 0.05` (5% chance)
   - Hit → ammo rack explosion
   - Miss → normal turret disable (existing 3-turn timer path)

The ammo rack and regular turret disable are mutually exclusive from a single hit.

---

## Data Model

Two new fields on all player/AI/OPFOR objects, initialized alongside `disabledTurrets`:

```js
ammoRackTurrets: 0,      // count of permanently destroyed turrets
ammoRackRepairTimer: 0,  // turns remaining until AX repair completes (0 = no repair in progress)
```

`ammoRackTurrets` is never cleared by Damage Control. It can only decrease when `ammoRackRepairTimer` reaches 0.

---

## Ammo Rack Explosion Effects

When the sub-roll fires, inside `executeAttack` (within the turret outcome branch, before the normal `disabledTurrets` increment):

- **Damage:** Replace normal penetration damage with `Math.round(target.maxHealth * 0.25)`
- **Fire:** `target.onFire = true`, `target.fireTimer = 10`
- **Flooding:** `target.flooding = true`, `target.floodTimer = 10`
- **Turret:** `target.ammoRackTurrets = Math.min(target.ammoRackTurrets + 1, totalTurrets)`
- **Message:** Appended to combat embed (see Announcements)
- The normal turret disable path (`disabledTurrets++`, `turretRepairTimer = 3`) is **skipped**

---

## Damage Scaling & Fire Guard Updates

All locations that reference `disabledTurrets` for damage scaling and the all-turrets-out guard must include `ammoRackTurrets`:

**Damage scaling (attacker side, `executeAttack`):**
```js
const operational = Math.max(0, totalTurrets - (attacker.disabledTurrets ?? 0) - (attacker.ammoRackTurrets ?? 0));
baseDamage = Math.round(baseDamage * (operational / totalTurrets));
```

**All-turrets-out guard (3 locations: `handleShoot`, Discord weapon-select handler, web API attack endpoint):**
```js
if (totalTurrets > 0 && (player.disabledTurrets ?? 0) + (player.ammoRackTurrets ?? 0) >= totalTurrets) {
    // block firing
}
```

---

## Damage Control Behaviour

The damaged ship's DC clears fire, flooding, `disabledTurrets`, and the regular repair timers — **exactly as today**. It does **not** touch `ammoRackTurrets` or `ammoRackRepairTimer`. No changes needed to the DC guard conditions; DC remains available as long as fire/flooding/component damage is present.

---

## AX Repair Action

A new "Repair Ally" action available only to AX-class ships.

### Requirements (checked before allowing the action)
- Player's `shipClass` is `'AX'`
- Player has at least 1 action point
- A valid target exists: allied ship within 3 tiles (Chebyshev distance) with `ammoRackTurrets > 0`
- Target does not already have `ammoRackRepairTimer > 0` (repair already in progress)

### Effect
- Sets `target.ammoRackRepairTimer = 3`
- Costs 1 action (same as other actions)
- Announces repair started (see Announcements)

### Surfaces
- **Discord:** "Repair Ally" button in the AX player's action UI, showing nearby allied targets with ammo rack damage as a select menu
- **Web API:** New endpoint `POST /api/game/:channelId/ax-repair` with body `{ targetId }` — same validation as Discord path

### Repair Countdown (processTurnEffects)
After the existing component repair timers:

```js
if (player.ammoRackRepairTimer > 0) {
    player.ammoRackRepairTimer--;
    if (player.ammoRackRepairTimer <= 0 && (player.ammoRackTurrets ?? 0) > 0) {
        player.ammoRackTurrets = Math.max(0, player.ammoRackTurrets - 1);
        const shipName = player.characterAlias || player.shipClass || 'Ship';
        messages.push(`🔧 **${shipName}**'s destroyed turret has been restored by AX repair.`);
    }
}
```

---

## Announcements

### On ammo rack explosion (appended to combat embed)
```
💥 AMMO RACK DETONATION! [Ship]'s turret has been catastrophically destroyed! ([remaining]/[total] operational — requires AX to repair)
```

### On AX initiating repair
```
🔧 [AX Ship] has begun emergency repairs on [Target]'s turret! (3 turns remaining)
```

### On repair completion (end-of-turn, via processTurnEffects)
```
🔧 [Ship]'s destroyed turret has been restored by AX repair.
```

### On blocked main gun fire (all turrets out, combined)
```
❌ All turrets are disabled or destroyed — main guns cannot fire!
```

---

## Game State Serialization

Add two fields to the player map in `broadcastGameUpdate`:
```js
ammoRackTurrets: p.ammoRackTurrets ?? 0,
ammoRackRepairTimer: p.ammoRackRepairTimer ?? 0,
```

---

## Web Dashboard (GameView.js)

### Status badge
In cell popup and sidebar, alongside existing turret badge:
- `💥 Turret X/Y (AMMO RACK)` — shown when `ammoRackTurrets > 0`
- Distinct label from the regular turret disable badge so players know it won't auto-repair

### Event log
- Applied: when `ammoRackTurrets` increases — `💥 [Ship]'s ammo rack has been detonated!`
- Cleared: when `ammoRackTurrets` decreases — `🔧 [Ship]'s turret has been restored`

### DC button
No change — condition already handles fire/flooding/component damage correctly.

---

## Files Changed

| File | Changes |
|---|---|
| `bot.js` | Init fields (3 locations); ammo rack sub-roll in `executeAttack`; updated damage scaling; updated all-turrets guard (3 locations); DC handlers unchanged; `processTurnEffects` ammo rack timer; game state serialization; new AX repair Discord handler; new AX repair web API endpoint |
| `web-server/client/src/components/GameView.js` | Ammo rack status badge, event log entries |

---

## Scope Notes

- AI AX ships already have a `processAIAuxiliaryTurn` that heals nearby allies — AI AX does not auto-repair ammo rack damage (that function only heals HP, not component damage)
- If `ammoRackTurrets + disabledTurrets >= totalTurrets`, the all-turrets-out guard blocks main gun fire; both sources are combined
- A ship with no `mountGroups` (e.g. torpedo-only submarine) cannot trigger the ammo rack outcome — the `totalTurrets > 0` guard already covers this
- The `ammoRackRepairTimer` lives on the target's object; once started, the 3-turn countdown continues even if the AX ship is destroyed before completion
