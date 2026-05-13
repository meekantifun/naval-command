# Recon Aircraft Auto-Strip on Class Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically set `reconAircraft` to `null` when a character's class is changed to one that is not eligible to carry a recon aircraft, across all three save paths.

**Architecture:** Four surgical edits — one to the eligible class list in the Discord creation flow, two to the Discord GM character edit handlers, and one to the bot API endpoint that handles web UI saves. No new abstractions needed.

**Tech Stack:** Node.js, Discord.js, Express

---

## Files

- Modify: `handlers/playerCreation.js` — fix eligible class list in `promptReconAircraft`
- Modify: `systems/characterManager.js` — strip reconAircraft in both edit submit handlers
- Modify: `bot.js` — strip reconAircraft in `POST /api/admin/characters` handler

---

## Task 1: Fix eligible class list in `promptReconAircraft`

**Files:**
- Modify: `handlers/playerCreation.js` (line ~3133)

The Discord creation flow only lists `['Battleship', 'Heavy Cruiser', 'Light Cruiser']` as eligible — missing Battlecruiser, which the web wizard already includes.

- [ ] **Step 1: Open `handlers/playerCreation.js` and find `promptReconAircraft`**

Search for the string `reconEligible`. It is around line 3133 and looks like:

```js
const reconEligible = ['Battleship', 'Heavy Cruiser', 'Light Cruiser'].includes(tempData.shipClass);
```

- [ ] **Step 2: Update the eligible class list**

Change that line to:

```js
const reconEligible = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'].includes(tempData.shipClass);
```

- [ ] **Step 3: Commit**

```bash
git add handlers/playerCreation.js
git commit -m "fix: add Battlecruiser to recon aircraft eligible classes in Discord creation flow"
```

---

## Task 2: Strip reconAircraft in `handleBasicCharacterEditSubmit`

**Files:**
- Modify: `systems/characterManager.js` (around line 622–629)

This handler is called when a GM edits a character's basic info (name, class, tonnage, speed, hangar) through Discord. The `updatedCharacter` is built by spreading the existing character then overwriting specific fields. We need to strip `reconAircraft` if the new class is ineligible.

- [ ] **Step 1: Open `systems/characterManager.js` and find `handleBasicCharacterEditSubmit`**

Look for the block that builds `updatedCharacter`:

```js
const updatedCharacter = {
    ...character,
    username: newUsername,
    shipClass: newShipClass,
    tonnage: newTonnage,
    speedKnots: newSpeed,
    hangar: newHangar
};
```

- [ ] **Step 2: Add the strip check immediately after that block**

```js
const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(newShipClass)) updatedCharacter.reconAircraft = null;
```

The full block should now look like:

```js
const updatedCharacter = {
    ...character,
    username: newUsername,
    shipClass: newShipClass,
    tonnage: newTonnage,
    speedKnots: newSpeed,
    hangar: newHangar
};

const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(newShipClass)) updatedCharacter.reconAircraft = null;

// Recalculate stats based on new values
this.recalculateCharacterStats(updatedCharacter);
```

- [ ] **Step 3: Commit**

```bash
git add systems/characterManager.js
git commit -m "fix: strip reconAircraft when class changes to ineligible type (handleBasicCharacterEditSubmit)"
```

---

## Task 3: Strip reconAircraft in `handleCharacterEditSubmit`

**Files:**
- Modify: `systems/characterManager.js` (around line 940–947)

This is the second Discord edit handler (used for a different edit modal — it also edits currency). Same fix as Task 2.

- [ ] **Step 1: Find `handleCharacterEditSubmit` in `systems/characterManager.js`**

Look for the block that builds `updatedCharacter` inside `handleCharacterEditSubmit`:

```js
const updatedCharacter = {
    ...character,
    username: newUsername,
    shipClass: newShipClass,
    tonnage: newTonnage,
    speedKnots: newSpeed,
    currency: newCurrency
};
```

- [ ] **Step 2: Add the strip check immediately after that block**

```js
const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(newShipClass)) updatedCharacter.reconAircraft = null;
```

The full block should now look like:

```js
const updatedCharacter = {
    ...character,
    username: newUsername,
    shipClass: newShipClass,
    tonnage: newTonnage,
    speedKnots: newSpeed,
    currency: newCurrency
};

const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(newShipClass)) updatedCharacter.reconAircraft = null;

// Recalculate stats based on new values
updatedCharacter.calculatedHP = this.bot.playerCreation.calculateShipHP(newTonnage, newShipClass);
```

- [ ] **Step 3: Commit**

```bash
git add systems/characterManager.js
git commit -m "fix: strip reconAircraft when class changes to ineligible type (handleCharacterEditSubmit)"
```

---

## Task 4: Strip reconAircraft in the bot API character save endpoint

**Files:**
- Modify: `bot.js` (around line 23262–23266)

All web UI character saves (CharacterCreationWizard → CharacterManager → server.js → botAPI) land at `POST /api/admin/characters`. There is already an HP recalculation block here. Add the strip check right after it.

- [ ] **Step 1: Find the `POST /api/admin/characters` handler in `bot.js`**

Search for `app.post('/api/admin/characters'`. The HP recalculation block looks like:

```js
// Always recalculate HP server-side so the client formula can't override it
if (characterData.tonnage && characterData.shipClass) {
    const hp = this.playerCreation.calculateShipHP(characterData.tonnage, characterData.shipClass);
    characterData.calculatedHP = hp;
    if (characterData.stats) characterData.stats.health = hp;
}
```

- [ ] **Step 2: Add the strip check immediately after that block**

```js
const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(characterData.shipClass)) characterData.reconAircraft = null;
```

The full block should now look like:

```js
// Always recalculate HP server-side so the client formula can't override it
if (characterData.tonnage && characterData.shipClass) {
    const hp = this.playerCreation.calculateShipHP(characterData.tonnage, characterData.shipClass);
    characterData.calculatedHP = hp;
    if (characterData.stats) characterData.stats.health = hp;
}

const RECON_ELIGIBLE = ['Battleship', 'Battlecruiser', 'Heavy Cruiser', 'Light Cruiser'];
if (!RECON_ELIGIBLE.includes(characterData.shipClass)) characterData.reconAircraft = null;

// Add/update character
playerData[userId].characters[characterName] = characterData;
```

- [ ] **Step 3: Commit**

```bash
git add bot.js
git commit -m "fix: strip reconAircraft on ineligible class in admin character API"
```

---

## Task 5: Manual verification

No automated test suite exists. Verify each path manually.

- [ ] **Step 1: Restart the bot**

```bash
pm2 restart naval-bot
```

Or if running locally: stop and re-run `node bot.js`.

- [ ] **Step 2: Verify web UI path**

1. Open the web Character Manager
2. Find a character that has a `reconAircraft` set (visible in the character card under "Reconnaissance Aircraft")
3. Edit that character and change their Ship Class to `Destroyer` (or any ineligible class)
4. Save
5. Reload the character list — confirm the Reconnaissance Aircraft section is gone from the card

- [ ] **Step 3: Verify eligible classes still keep reconAircraft**

1. Find or create a Battleship character with a reconAircraft
2. Edit and save WITHOUT changing the class
3. Confirm reconAircraft is still present after save

- [ ] **Step 4: Verify Battlecruiser is now eligible**

1. Edit a character and change their class to `Battlecruiser`
2. Save
3. Confirm reconAircraft is NOT stripped (if they had one)
4. In Discord, run `/newchar` and walk through creation with class `Battlecruiser` — confirm the recon aircraft prompt appears

- [ ] **Step 5: Final commit if any adjustments were made**

```bash
git add -A
git commit -m "fix: manual verification adjustments for recon aircraft strip"
```
