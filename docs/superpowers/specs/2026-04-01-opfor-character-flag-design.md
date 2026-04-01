# OPFOR Character Flag — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Overview

Replace the Discord server-role-based OPFOR detection with a persistent `isOPFOR` boolean flag stored directly on each character. Characters flagged as OPFOR join battles on the enemy side: they treat AI enemies as allies and players as enemies. GMs can set the flag manually; players can set it during character creation or earn it mid-campaign via a post-battle conversion prompt.

---

## Background

The existing system calls `hasOPFORRole(member)` to check a Discord member's server roles (matching "opfor", "enemy", "hostile", "red team", "opposition") at join time. This has two problems:

1. A user with multiple characters can only be OPFOR with all of them or none — the role applies to the user, not the character.
2. It has no web equivalent; the web join endpoint (`/api/game/:channelId/join`) always calls `game.addPlayer()` regardless.

---

## Requirements

- `isOPFOR` is stored on the character record, not on the user.
- GMs can toggle the flag in Admin Panel → Characters.
- Players can set the flag during character creation (Step 1, below the Hybrid checkbox).
- The web join flow and the Discord join flow both respect the flag.
- After a battle concludes, sunk players are offered a conversion prompt (Discord + web).
- The Discord role check (`hasOPFORRole`) is removed entirely.

---

## Data Layer

Add `isOPFOR: false` to character defaults in:
- `CharacterCreationWizard` initial form state
- `characterManager` character schema / save logic

The flag is a plain boolean. No history or audit trail is needed.

---

## Character Creation (CharacterCreationWizard)

**Location:** Step 1 (Basic Info), below the existing Hybrid checkbox.

Add a checkbox:
```
☐ OPFOR — this character fights for the enemy side
```

- Bound to `formData.isOPFOR`
- Saved to character data on submit alongside all other fields
- No conditional steps or branching — purely a data flag

---

## Admin Panel → Characters

**Location:** Character list in Admin Panel → Characters tab.

Add a toggleable **OPFOR** badge next to each character card. Clicking the badge:
1. Sends a PATCH request to update the character's `isOPFOR` field.
2. Reflects the new state immediately in the UI (optimistic or confirmed update).

GMs only (permission check already enforced by the Admin Panel access gate).

---

## Join Flow

### Web (`/api/game/:channelId/join` in `bot.js`)

After resolving the character record, check `character.isOPFOR`:

- **`false` (default):** call `game.addPlayer()` — existing behavior, no change.
- **`true`:** call `game.addOPFORPlayer()` — stores player in `game.enemies` with `isOPFOR: true`.

Return `{ success: true, isOPFOR: true }` in the response when the player joined as OPFOR, so the frontend can route to the OPFOR spawn selector instead of the normal spawn flow.

### Discord (bot join interaction handlers)

Replace all three call sites of `this.hasOPFORRole(interaction.member)` with a read of `character.isOPFOR` from the resolved character object. The `hasOPFORRole` method is then dead code and can be deleted.

No other changes to the Discord OPFOR turn logic, spawn selection, or action handling — those already key off `player.isOPFOR` on the game object, not on the Discord role.

---

## End-of-Battle Prompts

Fires once, after the game transitions to `completed` phase. For each player who was sunk during the battle:

### Sunk BLUFOR player

**Discord:** Ephemeral message sent to the player:
> "⚔️ You were sunk. Do you want to convert to OPFOR for future battles?"
> [ Convert to OPFOR ] [ Remain Sunk ]

**Web:** Modal on the end-of-battle results screen with the same two options.

**On "Convert to OPFOR":** Set `character.isOPFOR = true` and persist. No in-battle effect (battle is already over).
**On "Remain Sunk":** No change.

---

### Sunk OPFOR player

**Discord:** Ephemeral message:
> "🏳️ You were sunk. Do you want to be recovered (return to BLUFOR) or remain OPFOR?"
> [ Be Recovered ] [ Remain OPFOR ]

**Web:** Same modal.

**On "Be Recovered":** Set `character.isOPFOR = false` and persist.
**On "Remain OPFOR":** No change.

---

## Removal

- Delete `hasOPFORRole(member)` method from `bot.js`.
- Remove all call sites (3 locations in the Discord join handlers).

---

## Out of Scope

- Immediate in-battle OPFOR conversion (flag is for future battles only).
- OPFOR turn logic, targeting, spawn zones — these already work off `player.isOPFOR` and need no changes.
- Per-game OPFOR assignment (flag is persistent on the character).
