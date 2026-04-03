# Combat Balance Design — HP Scaling & Weapon Rebalance

**Date:** 2026-04-03
**Status:** Approved

---

## Problem Statement

The current combat system has three compounding balance problems:

1. **Ship HP is too low.** Destroyers sit at ~200 HP and battleships at 615–795 HP, making nearly every weapon capable of a one-shot kill.
2. **Player weapon damage values are misaligned with AI.** The player gun/torpedo tables use hand-tuned "realistic" values (up to 1,250 per torpedo) while AI weapons use a weight-based formula that produces values 5–12× lower. The 2.2× torpedo multiplier in `bot.js` was added for AI weapons (which need it) but also applies to player weapons (which don't), inflating player torpedo damage to 1,100–2,750 per hit.
3. **Big guns one-shot everything.** Player 460mm guns deal 750 damage against battleships with 660–795 HP. A single critical hit makes this worse (1.5× = 1,125). No ship class meaningfully survives sustained fire.

### Design Goals

- Big guns (381mm+) require **multiple critical hits** to eliminate a light cruiser or larger vessel — a single critical hit must not kill.
- Torpedoes can one-shot destroyers but **cannot one-shot light cruisers or larger** under any normal (non-crit) hit.
- Battleships have **meaningfully differentiated HP** based on tonnage — larger hulls are tankier.
- Boss ships remain imposing and are exempt from the regular HP cap.

---

## Approach

**Tiered HP Scaling + Torpedo Multiplier Split**

- Scale up all ship HP using class-specific multipliers applied to the existing formula output.
- Hard-cap regular ships at **2,000 HP** (bosses exempt — their +60% multiplier runs after the cap).
- Split the 2.2× torpedo multiplier in `bot.js` so it only applies to AI attackers. Player torpedo table values already encode real-world lethality and do not need amplification.
- Reduce player torpedo base values for 650mm+ and player gun base values for 381mm+ so they respect the new HP floor for light cruisers.

---

## Section 1 — HP Scaling

### Files
- `systems/factionConfig.js` — `calculateHP()`
- `handlers/playerCreation.js` — `calculateShipHP()`

### Formula Change

Both functions use the same formula. Add a per-class scale multiplier and a 2,000 HP cap:

```js
calculateHP(tonnage, shipClass) {
    const shipParams = {
        'Destroyer':              { baseHP: 120, multiplier: 0.040, bonus: 0   },
        'Light Cruiser':          { baseHP: 200, multiplier: 0.025, bonus: 30  },
        'Heavy Cruiser':          { baseHP: 200, multiplier: 0.025, bonus: 70  },
        'Battleship':             { baseHP: 300, multiplier: 0.009, bonus: 0   },
        'Aircraft Carrier':       { baseHP: 250, multiplier: 0.010, bonus: 40  },
        'Light Aircraft Carrier': { baseHP: 200, multiplier: 0.012, bonus: 30  },
        'Submarine':              { baseHP: 100, multiplier: 0.050, bonus: 0   },
        'Auxiliary':              { baseHP: 120, multiplier: 0.015, bonus: 20  }
    };
    const params = shipParams[shipClass];
    if (!params) return 100;
    const scale = ['Destroyer', 'Submarine'].includes(shipClass) ? 1.5 : 2.0;
    return Math.min(2000, Math.max(Math.round((params.baseHP + (tonnage * params.multiplier) + params.bonus) * scale), 20));
}
```

### Resulting HP Ranges

| Ship Class | Scale | HP Range |
|---|---|---|
| Destroyer | ×1.5 | 288–336 HP |
| Submarine | ×1.5 | 240–360 HP |
| Light Cruiser | ×2.0 | 735–870 HP |
| Heavy Cruiser | ×2.0 | 1,040–1,190 HP |
| Light Aircraft Carrier | ×2.0 | 820–870 HP |
| Aircraft Carrier | ×2.0 | 1,080–1,140 HP |
| Battleship (35kt Ru-Class) | ×2.0 | 1,230 HP |
| Battleship (40kt Ta-Class) | ×2.0 | 1,320 HP |
| Battleship (50kt Re-Class) | ×2.0 | 1,500 HP |
| Battleship (55kt Re-Class Elite) | ×2.0 | 1,590 HP |

Battleships now have meaningful HP spread (1,230–1,590) rather than all clustering at the old cap. The 2,000 HP ceiling is only hit by very large custom player ships.

### Boss HP

Boss enhancement (`× 1.6`) is applied in `bot.js` **after** spawning, using the already-set `currentHealth`. This is unchanged. Because regular ship HP can now reach 2,000, bosses can reach up to ~3,200 HP on the largest hulls. No cap is applied to bosses.

### Migration — Existing Player Characters

Player characters have `calculatedHP` stored in their JSON data file. The stored value is used directly when a player joins a game. Two options at implementation time:

- **Option A (recommended):** On player join (`/join`), recalculate HP from the stored `tonnage` and `shipClass` fields using the new formula and write it back to the character record.
- **Option B:** Require players to re-register to get updated HP. Simpler but disruptive.

Implementer should confirm which approach to take at implementation time based on code structure.

---

## Section 2 — Torpedo Multiplier Split

### File
- `bot.js` — `attackTarget()` (or equivalent combat resolution function)

### Change

The 2.2× torpedo multiplier currently applies to all attackers. It exists because the AI weapon formula (weight-based) produces low torpedo values (~80–120) that would otherwise feel weak. Player torpedo values are already hand-tuned to real-world lethality — applying the multiplier to them results in 1,100–2,750 damage per hit.

Split the multiplier by attacker type using the existing `hasGuildPlayerData` check pattern.

**Important — insertion point:** In `bot.js`, `guildId` is declared a couple of lines *after* the current torpedo multiplier line. The new `isPlayerAttacker` check must be placed **after** `guildId` is in scope, not at the current torpedo line position. Verify declaration order before inserting.

```js
// Before:
if (weapon === 'torpedoes') baseDamage = Math.round(baseDamage * 2.2);

// After (placed after guildId is declared):
const isPlayerAttacker = Boolean(attacker.id && guildId && this.hasGuildPlayerData(guildId, attacker.id));
if (weapon === 'torpedoes' && !isPlayerAttacker) baseDamage = Math.round(baseDamage * 2.2);
```

**AI torpedo impact (unchanged):** AI destroyer torpedoes calculate to ~82 base, × 2.2 = ~180 damage. Against new destroyer HP of 288–336, this does 54–63% per hit — takes 2 hits to kill a destroyer, which is appropriately threatening without being instant.

**Player torpedo impact (new):** Base values land directly with no multiplier. See Section 3 for adjusted values.

---

## Section 3 — Player Torpedo Damage Table

### File
- `handlers/playerCreation.js` — torpedo entries in the weapon caliber table

### Constraint

With the torpedo multiplier removed for players, base damage values are final. The constraint is:

> Torpedo damage must be **below 735** (the minimum light cruiser HP — a 5,500t CL at ×2.0 scale)

Everything 610mm and below already satisfies this constraint. Only 650mm+ requires adjustment.

### Changes

| Caliber | Current Damage | New Damage | Notes |
|---|---|---|---|
| 324mm | 120 | **120** | Unchanged |
| 356mm | 150 | **150** | Unchanged |
| 450mm | 400 | **400** | Unchanged; one-shots destroyers ✓ |
| 483mm | 420 | **420** | Unchanged |
| 533mm | 500 | **500** | Unchanged; under 735 ✓ |
| 550mm | 520 | **520** | Unchanged |
| 610mm | 700 | **700** | Unchanged; 700 < 735 ✓ |
| 650mm | 800 | **730** | Reduced; 730 < 735 ✓ |
| 750mm | 1,000 | **730** | Reduced; differentiated by range/reload |
| 850mm | 1,250 | **730** | Reduced; 1 shot total — scarcity is its identity |

The 650–850mm torpedoes share 730 damage. Their distinct identities come from:
- **Range:** 22 / 25 / 20 cells respectively
- **Reload:** 65 / 75 / 90 turns
- **Ammo:** 4 / 2 / 1 shots per battle
- **Flooding chance** (existing mechanic, unchanged)

---

## Section 4 — Player Big Gun Damage Table

### File
- `handlers/playerCreation.js` — main gun entries in the weapon caliber table

### Constraint

> `damage × 1.5 (single critical hit) < 735`  →  `damage < 490`

All calibers at 380mm and below already satisfy this (380mm crit = 720 < 735). Only 381mm+ needs reduction.

### Changes

| Caliber | Current Damage | New Damage | Crit Damage | Passes |
|---|---|---|---|---|
| 380mm | 480 | **480** | 720 | ✓ |
| 381mm | 500 | **470** | 705 | ✓ |
| 406mm | 580 | **480** | 720 | ✓ |
| 410mm | 600 | **483** | 725 | ✓ |
| 457mm | 720 | **486** | 729 | ✓ |
| 460mm | 750 | **488** | 732 | ✓ |
| 480mm | 850 | **489** | 734 | ✓ |

### Differentiation at the Top End

The 381–480mm calibers cluster in the 470–489 damage range. They remain meaningfully distinct through:

| Caliber | Penetration | Reload | Range | Ammo |
|---|---|---|---|---|
| 381mm | 420 | 20 | 38 | 17 |
| 406mm | 480 | 22 | 40 | 15 |
| 410mm | 500 | 23 | 41 | 14 |
| 457mm | 580 | 28 | 44 | 10 |
| 460mm | 600 | 30 | 45 | 8 |
| 480mm | 680 | 35 | 48 | 6 |

A 480mm gun vs a 381mm gun trades similar hit damage for longer range, far higher penetration, slower reload, and fewer shots. The choice is meaningful.

---

## Summary of File Changes

| File | Change |
|---|---|
| `systems/factionConfig.js` | Add scale multiplier + 2,000 cap to `calculateHP()` |
| `handlers/playerCreation.js` | Same change to `calculateShipHP()`; reduce torpedo 650mm–850mm; reduce gun 381mm–480mm |
| `bot.js` | Split torpedo 2.2× multiplier — AI only, not players |

No changes to AI weapon values, armor, penetration, or the critical hit mechanic (5% / 1.5×).
