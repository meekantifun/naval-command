# Recon Aircraft Auto-Strip on Class Change

## Problem

When a player who has a reconnaissance aircraft is changed to a class that is not eligible to carry one, the `reconAircraft` field is silently preserved on the character. The plane cannot be used in battle for that class, but its data lingers — confusing and inconsistent.

Additionally, the eligible class list was inconsistent: the Discord creation flow excluded Battlecruiser, while the web wizard included it.

## Goal

Automatically strip `reconAircraft` (set to `null`) whenever a character's ship class is changed to an ineligible class, at every save point. Unify the eligible class list across all paths.

## Canonical Eligible Classes

```
['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser']
```

Battlecruiser is added to the Discord creation flow to match the existing web wizard behavior.

## Changes

### 1. `systems/characterManager.js` — `handleBasicCharacterEditSubmit`

After building `updatedCharacter` (the `{ ...character, shipClass: newShipClass, ... }` spread), add:

```js
const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(newShipClass)) updatedCharacter.reconAircraft = null;
```

### 2. `systems/characterManager.js` — `handleCharacterEditSubmit`

Same check, same location (after the `updatedCharacter` spread).

### 3. `bot.js` — `POST /api/admin/characters`

After the HP recalculation block (~line 23262), add:

```js
const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(characterData.shipClass)) characterData.reconAircraft = null;
```

### 4. `handlers/playerCreation.js` — `promptReconAircraft`

Update the existing eligibility check from:
```js
['Battleship', 'Heavy Cruiser', 'Light Cruiser']
```
to:
```js
['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser']
```

## Out of Scope

- No UI feedback/warning before stripping (that was option A from brainstorm)
- No shop item interaction changes
- No battle-time reconAircraft validation changes
