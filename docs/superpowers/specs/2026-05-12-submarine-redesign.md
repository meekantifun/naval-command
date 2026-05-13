# Submarine System Redesign

**Date:** 2026-05-12
**Status:** Approved

## Overview

Full replacement of the 4-level submarine dive system with a 3-level system featuring new oxygen rules, torpedo Armor Break mechanics, wake tracking, and two new special actions (Crash Dive Toggle, Ballast Blow).

All dive logic lives in `systems/diveSystem.js`. Bot integration points are updated in `bot.js`. Web dashboard updated in `web-server/client/src/components/GameView.js`.

---

## Section 1: Depth Levels & Rules

Three depth levels:

| Depth | Speed Mult | Enemy Spot Range | Can Fire | Vulnerable To |
|-------|-----------|-----------------|----------|---------------|
| `surface` | ×1.0 | Normal | Guns, AA, Torpedoes | Everything |
| `periscope` | ×0.50 | ×0.5 | Torpedoes only | Guns, torpedoes, bombs, depth charges |
| `runningDeep` | ×0.50 | Undetectable | Nothing | ASW weapons only |

```js
DEPTH_LEVELS = ['surface', 'periscope', 'runningDeep']

DEPTH_RULES = {
    surface:     { speedMult: 1.00, spotMult: 1.0,  spotMax: null, oxygenRegen: 2 },
    periscope:   { speedMult: 0.50, spotMult: 0.5,  spotMax: null, oxygenRegen: 0 },
    runningDeep: { speedMult: 0.50, spotMult: null, spotMax: 0,    oxygenRegen: 0 },
}

TARGETING_MATRIX = {
    surface:     { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: false, planeDepthCharge: false },
    periscope:   { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: true,  planeDepthCharge: true  },
    runningDeep: { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
}
```

**Movement:** 1 level per turn, 1 AP per shift. Cannot jump two levels in one turn.

---

## Section 2: Oxygen System

- `maxOxygen = 4` (turns of air)
- Each turn submerged (periscope or runningDeep): −1 oxygen
- At surface: +2 oxygen per turn (half of maxOxygen)
- Oxygen minimum is 0 — does not go negative
- At 0 oxygen: sub takes **10 damage per turn** and is NOT forced to surface
- Players choose when to surface; the damage is the consequence of staying under

Fields on submarine: `oxygen`, `maxOxygen`

---

## Section 3: Special Actions

### Crash Dive Toggle (`/crashdivetoggle`)

- Toggles a boolean flag `crashDiveToggle` on the submarine's ship state
- **When ON:** if any enemy targets the submarine with a non-ASW attack, the sub auto-dives to `runningDeep` *before* the attack resolves — the attack misses (non-ASW weapons cannot reach Running Deep)
- **AP cost:** −1 AP deducted at the start of the sub's *next* turn via `crashDiveApDebt = 1` flag
- Sub remains at Running Deep at the start of their next turn
- Toggle persists until the player toggles it off
- Crash Dive jumps directly to `runningDeep` regardless of current depth (bypasses the 1-level-per-turn movement rule — it's an emergency action)
- Crash Dive does not trigger if the sub is already at `runningDeep`

### Ballast Blow (`/ballastblow`)

- Immediately moves submarine to `surface` from any depth
- Costs 1 AP (via `consumeAction`)
- Sets `ballastBlewThisTurn = true` — blocks firing any weapon that turn
- `ballastBlewThisTurn` clears at the start of the sub's next turn

---

## Section 4: Torpedo Mechanics

### Armor Break (crit on torpedo hit)

- **Crit chance:** 9% per torpedo hit (rolled after hit confirms)
- On a crit, target receives or upgrades Armor Break status:
  - No existing Armor Break → apply **Armor Break I**
  - Armor Break I active → upgrade to **Armor Break II**
  - Armor Break II active → upgrade to **Armor Break III**
  - Armor Break III → stays at III, timer resets to 2
- **Timer resets to 2 turns on every upgrade**
- Effect per tier (applied to damage calculations only — `stats.armor` is not mutated):

| Tier | ARM Reduction | Duration |
|------|--------------|---------|
| I    | −3           | 2 turns |
| II   | −6           | 2 turns |
| III  | −9           | 2 turns |

- Reduction tracked as `armorBreakReduction` (number) and `armorBreakTurns` (number) on the target ship
- Decremented in `processTurnEffects`; cleared when `armorBreakTurns` reaches 0

### Wake Tracking

- When a torpedo **hits** a target that has LOS to the submarine, the sub becomes spotted by that target for **1 turn**
- Implemented as `wakeTrackedBy: [shipId, ...]` array on the submarine
- Cleared at the start of the submarine's next turn
- A ship present in `wakeTrackedBy` treats the sub as spotted regardless of depth or sonar

---

## Section 5: Integration Points (bot.js)

| Hookpoint | Change |
|-----------|--------|
| Attack handler (pre-resolve) | Check `crashDiveToggle`; auto-dive to `runningDeep` + set `crashDiveApDebt` before non-ASW attack resolves |
| Attack handler (torpedo hit) | Roll 9% crit → apply/upgrade Armor Break; check LOS → set `wakeTrackedBy` |
| Damage calculation | Subtract `armorBreakReduction` from effective armor before applying |
| `processTurnEffects` | Tick oxygen −1 if submerged; deal 10 dmg if oxygen = 0; decrement `armorBreakTurns`; clear `wakeTrackedBy`; clear `ballastBlewThisTurn`; deduct `crashDiveApDebt` from AP |
| `hasVisionOf` | Check `wakeTrackedBy`; Running Deep = undetectable unless viewer has sonar |
| `calculateAccuracy` | Remove old torpedo deep penalty |
| Status embed | Show oxygen bar, depth badge, Armor Break tier, crash dive toggle indicator |
| Slash commands | Add `/crashdivetoggle`, `/ballastblow` |
| Web dashboard | Update to 3-level depth selector; add Ballast Blow and Crash Dive Toggle buttons |
| Ship init | `maxOxygen = 4`, `oxygen = 4`, `crashDiveToggle = false`, `crashDiveApDebt = 0` |

---

## Out of Scope

- TRP (torpedo penetration) stat — not included
- Sonar / ASW shop items — existing items unchanged
- AI submarine behavior — existing AI dive logic adapted to new depth names only
