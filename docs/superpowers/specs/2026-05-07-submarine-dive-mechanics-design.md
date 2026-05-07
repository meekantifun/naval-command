# Submarine Dive Mechanics — Design Spec
*Date: 2026-05-07*

## Overview

Submarines gain a unique **Dive** ability allowing them to submerge to four discrete depth levels. Depth affects targeting eligibility, weapon availability, movement speed, spotting range, and detectability. A finite oxygen supply limits time underwater; running out forces an immediate emergency surface.

---

## Architecture

A new module `/systems/diveSystem.js` owns all dive logic. No other file hardcodes depth-level rules — they call into this module at defined hookpoints.

**Hookpoints in existing code:**
- `processTurnEffects()` → calls `processDiveTick()` at turn start
- `canTarget()` check in combat → calls `diveSystem.canTarget()`
- `hasVisionOf()` / `canSpot()` → calls `diveSystem.canSpot()`
- Movement speed calculation → calls `diveSystem.getEffectiveSpeed()`
- Spotting range calculation → calls `diveSystem.getEffectiveSpotRange()`
- `/dive` and `/surface` Discord commands → call `dive()` / `surface()`
- Web dashboard action buttons → same functions via API

---

## Data Model

Two fields added to every submarine ship object at battle initialisation:

```js
depth: 'surface',     // 'surface' | 'periscope' | 'deep' | 'veryDeep'
oxygen: <maxOxygen>,  // current turns of air remaining
maxOxygen: <number>,  // defined per ship class in factionConfig.js
```

Depth charges and sonar are tracked as flags:

```js
hasDepthCharges: false,  // true for DD, CL, CA (built-in)
hasSonar: false,         // true if sonar shop upgrade purchased
aswUpgrade: false,       // true if dive bomber has ASW shop upgrade
```

Non-submarine ships do not receive `depth` or `oxygen` fields.

---

## `diveSystem.js` Public API

```js
// Costs 1 AP — player dives to any depth in one action
dive(submarine, targetDepth, game)
  → { success: bool, message: string, apCost: 1 }

// Free action — surfaces from any depth instantly
surface(submarine, game)
  → { success: bool, message: string }

// Called at start of submarine's turn in processTurnEffects()
processDiveTick(submarine, game)
  → { forcedSurface: bool, oxygenRemaining: number }

// Returns speed after depth modifier applied to base speed
getEffectiveSpeed(submarine)
  → number

// Returns spotting range after depth modifier applied to base range
getEffectiveSpotRange(submarine, baseRange)
  → number

// Returns whether attacker can target submarine with a given weapon type
canTarget(attacker, submarine, weaponType)
  → { canTarget: bool, reason: string }

// Returns whether spotter can detect submarine
canSpot(spotter, submarine)
  → bool
```

---

## Depth Level Rules

| Rule | Surface | Periscope | Deep | Very Deep |
|---|---|---|---|---|
| Targetable by guns | ✅ | ❌ | ❌ | ❌ |
| Targetable by torpedoes | ✅ | ✅ | ❌ | ❌ |
| Targetable by bombs | ✅ | ✅ | ❌ | ❌ |
| Targetable by ship depth charges (2×2) | ❌ | ✅ | ✅ | ✅ |
| Targetable by plane depth charges (1×1) | ❌ | ✅ | ✅ | ✅ |
| Speed modifier | ×1.0 | ×0.75 | ×0.50 | ×0.10 |
| Sub's own spotting range | Normal | ×0.5 | Max 3 tiles | 0 |
| Enemy spotting range vs. sub | Normal | ×0.5 | Sonar only | Sonar only |
| Can use guns | ✅ | ❌ | ❌ | ❌ |
| Can use torpedoes | ✅ | ✅ | ✅ (−20% acc) | ❌ |
| Oxygen regen per turn | +2 | 0 | 0 | 0 |

---

## Oxygen & Forced Surfacing

`processDiveTick()` runs at the **start of each submarine's turn**, before any player actions:

- **At surface:** `oxygen = Math.min(maxOxygen, oxygen + 2)`. No other checks.
- **Submerged:** `oxygen -= 1`. If `oxygen <= 0`:
  - `depth` set to `'surface'` immediately.
  - `oxygen` set to `0`.
  - Warning message sent to player and GM log.
  - Sub still gets its full turn at surface.

**Dive blocked if `oxygen === 0`** — error message: *"No air remaining — surface to replenish oxygen before diving."*

**Diving costs 1 AP.** A submarine can change multiple depth levels in a single dive action (e.g. Surface → Very Deep in one AP). **Surfacing is always free (0 AP)** and can be used at any point in the turn.

---

## Depth Charges

### Ship-Dropped (DD, CL, CA — built-in)
- Player targets a grid coordinate.
- Hits all submarines in a **2×2 tile** area centered on the target.
- Higher base damage than plane-dropped.
- Costs 1 AP. Has its own ammo count defined in `factionConfig.js`.
- Only affects submarines — surface ships in the AoE are unaffected.

### Plane-Dropped (Dive Bomber + ASW Shop Upgrade)
- Targets a grid coordinate during an air strike.
- Hits submarines in a **1×1 tile** (single cell).
- Lower base damage.
- Uses the aircraft's action slot like a normal strike.
- `aswUpgrade: true` required on the aircraft.

Both variants work at Periscope, Deep, and Very Deep. Neither works against surface submarines.

---

## Sonar

- Shop upgrade purchasable by any ship class.
- Stored as `hasSonar: true` on the ship object.
- In `canSpot()`: if spotter has sonar, they can detect submarines at Periscope, Deep, and Very Deep depth within their normal spotting range (weather and line-of-sight checks still apply).
- Sonar grants **detection only** — a ship with sonar can see a Very Deep submarine but cannot attack it. No weapon type can reach Very Deep depth.
- Without sonar: submarines at Deep or Very Deep are completely invisible.

---

## Player Commands & UI

### Discord
- `/dive <depth>` — valid values: `periscope`, `deep`, `verydeep`. Costs 1 AP. **Dive only descends** — the target depth must be deeper than current depth. Blocked if: not a submarine, already at or deeper than target depth, or `oxygen === 0`. To ascend without fully surfacing is not possible — use `/surface` to return to Surface level, then dive again.
- `/surface` — free action. Blocked if already at surface.

### Web Dashboard
- Submarine ship cards show two new buttons: **Dive** (opens depth selector) and **Surface** (greyed out at surface).
- Both buttons are hidden for non-submarine ships.

### Status Display
- Submarine card shows a depth badge: `[SURFACE]` / `[PERISCOPE]` / `[DEEP]` / `[VERY DEEP]`.
- Oxygen displayed as: `Oxygen: 7/10`.

### Turn Messages
Turn start messages for submarine players include a depth context line, e.g.:
> *"You are at Periscope depth. Torpedoes only. Enemy spotting range against you is halved."*

---

## Edge Cases

- **Forced surface:** Oxygen only ticks on the submarine's own turn (start of turn). A forced surface therefore happens at the start of the sub's turn, before any player actions. The sub then acts normally at surface level.
- **Depth charge AoE and multiple submarines:** All submarines within the AoE radius take damage independently.
- **Sonar range vs. weather:** Sonar still uses the ship's normal weather-modified spotting range, not a fixed range.
- **AI submarines:** AI-controlled submarines use dive mechanics. The AI will dive when under fire from guns and surface when oxygen is critical or when targeting opportunities exist.
