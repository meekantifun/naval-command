# Disabling Hits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a critical hit lands, a secondary roll may disable a ship component — rudder, engines, or turrets — with distinct gameplay effects and a timer-based repair system.

**Architecture:** Individual flags and timers per component, matching the existing `onFire`/`fireTimer` pattern. No new subsystems; changes are spread across the critical hit handler, movement validation, damage calculation, turn processing, damage control handler, and web dashboard player panel.

**Tech Stack:** Node.js (bot.js, statusManager.js), React (PlayerPanel.js)

---

## Data Model

Six new fields on player objects (both players and AI enemies), initialized alongside `onFire`/`flooding`:

```js
rudderDamaged: false,
rudderRepairTimer: 0,
enginesDamaged: false,
enginesRepairTimer: 0,
disabledTurrets: 0,       // count of knocked-out turret mounts
turretRepairTimer: 0,
```

`disabledTurrets` is a count (not boolean) because multiple crits can stack. Repair restores all disabled turrets at once when the timer expires.

---

## Trigger & Probabilities

On every critical hit, one additional d100 roll (internal, not shown to players) determines the outcome:

| Roll | Outcome |
|---|---|
| 1–50 | No disable |
| 51–75 | Rudder disabled |
| 76–90 | Engines disabled |
| 91–100 | Turret disabled |

If Turret is rolled but the target has no main weapon with `mountGroups` data, treat as no disable.

Only what was disabled is announced — the roll itself is never shown.

---

## Component Effects

### Rudder Disabled (`rudderDamaged: true`)
Movement is restricted to the ship's current facing direction or directly opposite (forward/backward only).

- Facing is determined by rounding `player.direction` (degrees, 0=east SVG convention) to nearest 45°
- Maps to a unit vector `(dx, dy)` where each component is -1, 0, or +1
- A movement target is valid only if `(targetX - currentX)` and `(targetY - currentY)` are both proportional to that unit vector (same ratio, same or opposite sign, any magnitude ≤ speed)
- All other movement destinations are rejected

### Engines Disabled (`enginesDamaged: true`)
All movement attempts are rejected. Firing, items, damage control, and all other actions still work.

### Turrets Disabled (`disabledTurrets > 0`)
- Total turret count = sum of `g.count` across the main weapon's `mountGroups` array
- Main gun damage is scaled: `damage × (totalTurrets - disabledTurrets) / totalTurrets`
- If `disabledTurrets >= totalTurrets`: main gun cannot fire at all
- Each crit that rolls a turret adds 1 to `disabledTurrets` (capped at total turret count)
- Secondary weapons and torpedoes are unaffected

---

## Repair Logic

### Natural Repair (3 turns)
- On disable, set the component's repair timer to 3
- Each end-of-turn, active repair timers decrement by 1 (processed in the same loop as fire/flooding timers)
- When a timer hits 0: component is restored, timer reset to 0
- If a second crit hits the same already-damaged component: timer resets to 3 (no credit for partial progress)

### Damage Control (1 turn)
The existing DC action is extended to also clear component damage:
- Sets `rudderDamaged = false`, `rudderRepairTimer = 0`
- Sets `enginesDamaged = false`, `enginesRepairTimer = 0`
- Sets `disabledTurrets = 0`, `turretRepairTimer = 0`
- Applies to both Discord DC button and web API DC endpoint
- DC still costs 1 action as today

---

## Announcement Messages

### On disable (appended to combat embed)
```
⚙️ DISABLING HIT! [Ship Name]'s rudder has been damaged — can only move forward or backward!
⚙️ DISABLING HIT! [Ship Name]'s engines have been disabled — cannot move!
⚙️ DISABLING HIT! [Ship Name]'s turret has been knocked out! (2/3 operational — damage reduced to 67%)
```
Icons (⚙️ placeholders) will be replaced with custom icons by the GM later.

### On natural repair (end-of-turn, same pattern as fire/flooding)
```
🔧 [Ship Name]'s rudder has been repaired.
🔧 [Ship Name]'s engines have been repaired.
🔧 [Ship Name]'s turrets have been fully repaired.
```

### On movement blocked
```
❌ Your rudder is damaged — you can only move forward or backward!
❌ Your engines are disabled — you cannot move!
```

### On main gun fire blocked (all turrets out)
```
❌ All turrets are disabled — main guns cannot fire!
```

---

## Web Dashboard UI

In `PlayerPanel.js`, disabled components appear as status badges alongside the existing Fire / Flooding indicators:

- `⚙️ Rudder Damaged` (placeholder icon)
- `⚙️ Engines Out` (placeholder icon)
- `💥 Turret X/Y` (placeholder icon, shows remaining/total)

The badge structure mirrors Fire/Flooding badges so custom icons can be dropped in as a string swap later.

---

## Files Changed

| File | Change |
|---|---|
| `bot.js` | Critical hit handler: add disable roll. Movement validation: rudder/engine checks. Discord attack handler: turret damage scaling. Discord DC handler: clear component damage. Turn processing: decrement repair timers and announce repairs. Web API attack, move, DC endpoints: same changes mirrored. |
| `systems/statusManager.js` | End-of-turn timer decrements for rudder/engine/turret repair timers, alongside existing fire/flood processing. |
| `web-server/client/src/components/PlayerPanel.js` | Status badges for three disabled components. |

---

## Scope Notes

- AI ships (enemies) are subject to the same disable mechanics; their movement AI already uses `isValidMovementDestination` which will pick up engine/rudder blocks naturally
- Submarines with torpedoes only and no main `mountGroups` are immune to turret disable (no-disable fallback)
- No changes to the character creation wizard or weapon data — turret count is read at runtime from `weapon.mountGroups`
