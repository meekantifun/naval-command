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
2. It has no web equivalent; the web join endpoint always calls `game.addPlayer()` regardless.

---

## Requirements

- `isOPFOR` is stored on the character record, not on the user.
- GMs can toggle the flag in Admin Panel → Characters.
- Players can set the flag during character creation (Step 1, below the Hybrid checkbox).
- The web join flow and the Discord join flow both respect the flag.
- After a battle concludes, sunk **human** players are offered a conversion prompt (Discord + web).
- The Discord role check (`hasOPFORRole`) is removed entirely.

---

## Data Layer

Add `isOPFOR: false` to character defaults in:
- `CharacterCreationWizard` initial form state (`formData` default and `initialData` merge)
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
1. Reads the current character data, flips `isOPFOR`, and sends a `POST /api/admin/characters` request with the full updated `characterData` object (reusing the existing create/update endpoint — no new route needed).
2. Reflects the new state immediately in the UI (optimistic update, revert on error).

GMs only (permission check already enforced by the Admin Panel access gate).

---

## Join Flow

### Web (`/api/game/:channelId/join` in `bot.js`)

**Duplicate-join guard:** Before calling any `addPlayer` variant, check both `game.players.has(userId)` **and** `game.enemies.has(userId)`. Reject with `400 Already in this game` if either is true.

After resolving the character record, check `character.isOPFOR`:

- **`false` (default):** call `game.addPlayer()` — existing behavior, no change.
- **`true`:** call `game.addOPFORPlayer()` — stores player in `game.enemies` with `isOPFOR: true`.

Return `{ success: true, isOPFOR: true }` in the response when the player joined as OPFOR, so the frontend can route to the OPFOR spawn selector instead of the normal spawn flow.

### Discord (bot join interaction handlers)

Replace all three call sites of `this.hasOPFORRole(interaction.member)` with a read of `character.isOPFOR` from the resolved character object. The `hasOPFORRole` method is then dead code and is deleted.

No other changes to the Discord OPFOR turn logic, spawn selection, or action handling — those already key off `player.isOPFOR` on the game object, not on the Discord role.

---

## End-of-Battle Prompts

Fires inside `endBattleInternal()`, **after** XP and currency rewards are awarded and **before** `this.games.delete(game.channelId)`. At that point `game.phase` is already `'ended'` and all player objects are still available.

### Identifying sunk human players

Scan both `game.players.values()` (BLUFOR) and `game.enemies.values()` (includes OPFOR human players and AI). Include a player in the prompt if **all** of:

- `player.isPlayer === true` — excludes AI units (AI entries in `game.enemies` do not have this flag)
- `!player.alive` — sunk during battle (all players enter the game with `alive: true`, so any dead player was sunk this battle)

**Alive BLUFOR players:** No prompt. Flag unchanged.
**Alive OPFOR players:** No prompt. Flag unchanged — they remain OPFOR for future battles.

---

### Sunk BLUFOR player (`player.isPlayer && !player.alive && !player.isOPFOR`)

**Discord:** Send a regular channel message (not ephemeral — no live interaction is available at battle end) via `channel.send()`, mentioning the player:

> `⚔️ <@userId>, you were sunk. Convert to OPFOR for future battles, or remain sunk?`
> Buttons: [ Convert to OPFOR ] [ Remain Sunk ]

Button custom IDs:
- `opfor_convert_yes_<userId>_<guildId>_<characterName>`
- `opfor_convert_no_<userId>`

**Web:** The `endSnapshot` object (built in `endBattleInternal` before calling `broadcastGameUpdate`) gains an `opforChoices` array. Each entry: `{ userId, characterName, currentIsOPFOR: false, guildId }`. The socket event that delivers this snapshot to clients is the existing `broadcastGameUpdate` call — `opforChoices` is a new field on the snapshot object. The GameView component checks if the current logged-in user's `userId` appears in `opforChoices`; if so, it renders a modal with the appropriate prompt and choice buttons.

**On "Convert to OPFOR":** Call `POST /api/game/:channelId/opfor-choice` (see New API Endpoint below) with `{ userId, guildId, characterName, choice: 'convert' }`. Sets `character.isOPFOR = true`, persists, and syncs in-memory.
**On "Remain Sunk":** No change. Message/modal is dismissed.

---

### Sunk OPFOR player (`player.isPlayer && !player.alive && player.isOPFOR`)

**Discord:** Channel message via `channel.send()`:

> `🏳️ <@userId>, you were sunk. Return to BLUFOR (be recovered), or remain OPFOR?`
> Buttons: [ Be Recovered ] [ Remain OPFOR ]

Button custom IDs:
- `opfor_recover_yes_<userId>_<guildId>_<characterName>`
- `opfor_recover_no_<userId>`

**Web:** Same `opforChoices` mechanism. Entry has `currentIsOPFOR: true`. The GameView modal shows the recover/remain variant for this user.

**On "Be Recovered":** Call `POST /api/game/:channelId/opfor-choice` with `{ userId, guildId, characterName, choice: 'recover' }`. Sets `character.isOPFOR = false`, persists, and syncs in-memory.
**On "Remain OPFOR":** No change.

---

### Discord Button Handler

Add a new interaction handler case in `bot.js` for custom IDs starting with `opfor_convert_` and `opfor_recover_`. Logic:

- **`opfor_convert_no_<userId>` / `opfor_recover_no_<userId>`:** Parse `userId` only. Reply ephemerally: "Got it — no change." Remove buttons from the original message.
- **`opfor_convert_yes_<userId>_<guildId>_<characterName>` / `opfor_recover_yes_...`:** Parse all three fields from the custom ID. Call the same persistence logic as the `/api/game/:channelId/opfor-choice` endpoint. Reply ephemerally with confirmation. Remove buttons from the original message.

The handler must verify `interaction.user.id === userId` to prevent other users from clicking on someone else's prompt buttons.

---

### New API Endpoint

`POST /api/game/:channelId/opfor-choice`

Request body: `{ userId, guildId, characterName, choice }` where `choice` is `'convert'` or `'recover'`.

1. Load `playerData` via `characterManager.loadPlayerData(guildId)`.
2. Verify `playerData[userId]?.characters[characterName]` exists; return `400` if not.
3. Set `playerData[userId].characters[characterName].isOPFOR = (choice === 'convert')`.
4. Save via `characterManager.savePlayerData(guildId, playerData)`.
5. Sync via `characterManager.syncInMemoryData(guildId, userId, playerData[userId])`.
6. Return `{ success: true }`.

The endpoint does **not** require the game to still be active. `channelId` is used for routing only.

This endpoint is added in:
- `bot.js` Express app (authenticated with `authenticateAPIKey`)
- `web-server/src/server.js` (proxied to bot API, authenticated with `ensureAuthenticated`)

---

## `syncInMemoryData` Reference

`characterManager.syncInMemoryData(guildId, userId, userData)` exists in `systems/characterManager.js:82`. Signature and usage match the pattern used throughout `bot.js` (e.g., lines 22330, 22483, 22521). No changes needed to this method.

---

## OPFOR Human Players and XP

Existing XP and currency logic at the end of `endBattleInternal` only iterates `game.players` (BLUFOR). OPFOR human players in `game.enemies` do not receive XP. This is pre-existing behavior and is **out of scope** for this feature.

---

## Removal

- Delete `hasOPFORRole(member)` method from `bot.js`.
- Remove all three call sites in the Discord join handlers.

---

## Out of Scope

- Immediate in-battle OPFOR conversion (flag is for future battles only).
- OPFOR turn logic, targeting, spawn zones — these already work off `player.isOPFOR` on the game object and need no changes.
- Per-game OPFOR assignment (flag is persistent on the character).
- XP awards for OPFOR human players (pre-existing gap, separate concern).
