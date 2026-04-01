# OPFOR Character Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Discord OPFOR role detection with a persistent `isOPFOR` flag on each character, supporting web and Discord join flows, GM toggles, and post-battle conversion prompts.

**Architecture:** The flag lives in the character data record and is read at join time to route the player to `addOPFORPlayer()` instead of `addPlayer()`. The three join handler locations in `bot.js` are updated to read `character.isOPFOR` instead of calling `hasOPFORRole()`. End-of-battle prompts fire inside `endBattleInternal()` after XP awards, sending Discord channel messages with buttons and adding an `opforChoices` array to the game's end-snapshot for the web client.

**Tech Stack:** Discord.js (bot), Node.js/Express (bot API + web server proxy), React (CharacterCreationWizard, CharacterManager, GameView)

---

## File Map

| File | Change |
|------|--------|
| `web-server/client/src/components/CharacterCreationWizard.js` | Add `isOPFOR` default + checkbox below Hybrid |
| `web-server/client/src/components/CharacterManager.js` | Add OPFOR toggle badge + handleOPFORToggle |
| `bot.js:3334` | Replace `hasOPFORRole` with `character.isOPFOR` |
| `bot.js:3401` | Replace `hasOPFORRole` with `character.isOPFOR` |
| `bot.js:3955` | Replace `hasOPFORRole` with `character.isOPFOR` |
| `bot.js:21035` (web join endpoint) | OPFOR routing + fix duplicate-join guard |
| `bot.js:20439` (/api/games) | Fix `isPlayer` to include OPFOR in `game.enemies` |
| `bot.js:20682` (game state response) | Add `requestingUserIsOPFOR` + `opforSpawnZoneCoords` |
| `bot.js:21096` (spawn endpoint) | Handle OPFOR players in spawn selection |
| `bot.js` (new endpoint) | `POST /api/game/:channelId/opfor-choice` |
| `bot.js:5661` (endBattleInternal) | Post-battle OPFOR prompts + opforChoices in endSnapshot |
| `bot.js` (interaction handler) | Handle `opfor_convert_` / `opfor_recover_` button IDs |
| `bot.js:3538` | Delete `hasOPFORRole` method (final cleanup) |
| `web-server/src/server.js` | Proxy `POST /api/game/:channelId/opfor-choice` |
| `web-server/client/src/components/GameView.js` | OPFOR choice modal on game end |

---

## Task 1: Character Creation — isOPFOR defaults + checkbox

**Files:**
- Modify: `web-server/client/src/components/CharacterCreationWizard.js`

- [ ] **Step 1: Add `isOPFOR: false` to both branches of `buildInitialFormData`**

  In the `if (!initialData)` branch (around line 102), add after `isHybrid: false,`:
  ```js
  isOPFOR: false,
  ```

  In the `return { ... }` branch (around line 120), add after `isHybrid: initialData.isHybrid || false,`:
  ```js
  isOPFOR: initialData.isOPFOR || false,
  ```

- [ ] **Step 2: Add `isOPFOR` to `handleSubmit` characterData object**

  In the `characterData` object inside `handleSubmit` (around line 327), add after `isHybrid: formData.isHybrid || false,`:
  ```js
  isOPFOR: formData.isOPFOR || false,
  ```

- [ ] **Step 3: Add the OPFOR checkbox below the Hybrid checkbox**

  The Hybrid checkbox block ends around line 451 with `</div>`. Immediately after it, add:
  ```jsx
  <div className="form-group form-group-inline">
    <label>
      <input
        type="checkbox"
        checked={formData.isOPFOR || false}
        onChange={(e) => setFormData({ ...formData, isOPFOR: e.target.checked })}
        style={{ marginRight: '8px' }}
      />
      OPFOR — this character fights for the enemy side
    </label>
  </div>
  ```

- [ ] **Step 4: Verify**

  Open the web app character creation wizard. In Step 1, confirm the OPFOR checkbox appears below the Hybrid checkbox. Check the box, complete the wizard, and confirm `isOPFOR: true` is saved on the character (check via Admin Panel or browser network tab).

- [ ] **Step 5: Commit**
  ```bash
  git add web-server/client/src/components/CharacterCreationWizard.js
  git commit -m "feat: add isOPFOR flag to character creation wizard"
  ```

---

## Task 2: AdminPanel — OPFOR toggle in CharacterManager

**Files:**
- Modify: `web-server/client/src/components/CharacterManager.js`

- [ ] **Step 1: Add `handleOPFORToggle` function**

  Find the `handleDelete` function (around line 385). Add a new function directly before it:
  ```js
  const handleOPFORToggle = async (char) => {
    const updatedData = { ...char, isOPFOR: !char.isOPFOR };
    const previousState = char.isOPFOR;
    // Optimistic update
    setCharacters(prev => prev.map(c => c.name === char.name && c.userId === char.userId ? { ...c, isOPFOR: !c.isOPFOR } : c));
    try {
      await axios.post(`${API_URL}/api/admin/characters`, {
        guildId,
        userId: char.userId,
        characterName: char.name,
        characterData: updatedData
      }, { withCredentials: true });
    } catch (err) {
      // Revert on failure
      setCharacters(prev => prev.map(c => c.name === char.name && c.userId === char.userId ? { ...c, isOPFOR: previousState } : c));
      console.error('Failed to toggle OPFOR flag', err);
    }
  };
  ```

  Note: `API_URL` should already be defined at the top of the file. If it isn't, look for how existing axios calls are made and follow the same pattern.

- [ ] **Step 2: Add OPFOR toggle button to the character-actions div**

  Find the `character-actions` div (around line 464). It currently has Edit and Delete buttons. Add an OPFOR button before the Edit button:
  ```jsx
  <button
    onClick={() => handleOPFORToggle(char)}
    className={`btn-opfor-toggle${char.isOPFOR ? ' opfor-active' : ''}`}
    title={char.isOPFOR ? 'Remove OPFOR flag' : 'Set as OPFOR'}
  >
    {char.isOPFOR ? '🔴 OPFOR' : '⚪ OPFOR'}
  </button>
  ```

- [ ] **Step 3: Verify**

  Open Admin Panel → Characters. Each character card should show an OPFOR button. Clicking it should toggle from `⚪ OPFOR` to `🔴 OPFOR` instantly (optimistic update) and persist through a page refresh.

- [ ] **Step 4: Commit**
  ```bash
  git add web-server/client/src/components/CharacterManager.js
  git commit -m "feat: add OPFOR toggle button to character manager"
  ```

---

## Task 3: Discord Join Flow — Replace hasOPFORRole with character.isOPFOR

**Files:**
- Modify: `bot.js` (three locations)

The three locations all have the same pattern: `const isOPFOR = this.hasOPFORRole(interaction.member);`. Replace each with `const isOPFOR = character.isOPFOR || false;`. In each case, `character` is the resolved character object already in scope.

- [ ] **Step 1: First location — around line 3334**

  The surrounding context:
  ```js
  // Get ship class from character data
  const shipClass = character.shipClass || 'Unknown';

  // Check OPFOR role
  const isOPFOR = this.hasOPFORRole(interaction.member);  // <-- replace this line
  ```

  Replace with:
  ```js
  const isOPFOR = character.isOPFOR || false;
  ```

- [ ] **Step 2: Second location — `joinWithCharacter` around line 3401**

  The surrounding context:
  ```js
  const shipClass = character.shipClass || this.getPlayerShipClass(interaction.member);

  // CHECK FOR OPFOR ROLE
  const isOPFOR = this.hasOPFORRole(interaction.member);  // <-- replace this line
  ```

  Replace with:
  ```js
  const isOPFOR = character.isOPFOR || false;
  ```

- [ ] **Step 3: Third location — around line 3955**

  The surrounding context:
  ```js
  // Get ship class and check OPFOR
  const shipClass = activeCharacter.shipClass || this.getPlayerShipClass(interaction.member);
  const isOPFOR = this.hasOPFORRole(interaction.member);  // <-- replace this line
  ```

  Replace with:
  ```js
  const isOPFOR = activeCharacter.isOPFOR || false;
  ```

- [ ] **Step 4: Verify**

  Restart the bot. Confirm it starts without errors. Test that a character with `isOPFOR: true` joins as OPFOR when using the `/join` Discord command.

- [ ] **Step 5: Commit**
  ```bash
  git add bot.js
  git commit -m "feat: read isOPFOR from character record instead of Discord role"
  ```

---

## Task 4: Web Join API — OPFOR routing, duplicate guard, and game state

**Files:**
- Modify: `bot.js`

This task has four sub-changes, all in `bot.js`:
1. Fix duplicate-join guard in `/api/game/:channelId/join`
2. Add OPFOR routing in `/api/game/:channelId/join`
3. Fix `isPlayer` in `/api/games` to include OPFOR players
4. Add `requestingUserIsOPFOR` + `opforSpawnZoneCoords` to game state response

- [ ] **Step 1: Fix duplicate-join guard (around line 21050)**

  Find:
  ```js
  if (game.players.has(userId)) {
      return res.status(400).json({ error: 'You are already in this game' });
  }
  ```

  Replace with:
  ```js
  if (game.players.has(userId) || game.enemies.has(userId)) {
      return res.status(400).json({ error: 'You are already in this game' });
  }
  ```

- [ ] **Step 2: Add OPFOR routing after fixCharacterDataStructure (around line 21073)**

  Find:
  ```js
  character = this.fixCharacterDataStructure(character);
  const shipClass = character.shipClass;

  const mockMember = {
      displayName: displayName || username,
      user: { username: username }
  };

  character.characterAlias = resolvedName;
  const success = game.addPlayer(userId, character, shipClass, mockMember);
  if (!success) {
      return res.status(400).json({ error: 'Failed to join game' });
  }

  await this.broadcastGameUpdate(channelId);
  res.json({ success: true, characterName: resolvedName });
  ```

  Replace with:
  ```js
  character = this.fixCharacterDataStructure(character);
  const shipClass = character.shipClass;
  const isOPFOR = character.isOPFOR || false;

  const mockMember = {
      displayName: displayName || username,
      user: { username: username }
  };

  character.characterAlias = resolvedName;
  let success;
  if (isOPFOR) {
      success = game.addOPFORPlayer(userId, character, shipClass, mockMember);
  } else {
      success = game.addPlayer(userId, character, shipClass, mockMember);
  }
  if (!success) {
      return res.status(400).json({ error: 'Failed to join game' });
  }

  await this.broadcastGameUpdate(channelId);
  res.json({ success: true, characterName: resolvedName, isOPFOR });
  ```

- [ ] **Step 3: Fix `isPlayer` in `/api/games` (around line 20439)**

  Find:
  ```js
  const isPlayer = userId ? game.players.has(userId) : false;
  ```

  Replace with:
  ```js
  const isPlayer = userId ? (game.players.has(userId) || game.enemies.has(userId)) : false;
  ```

- [ ] **Step 4: Add `requestingUserIsOPFOR` and `opforSpawnZoneCoords` to game state response (around line 20682)**

  In the `res.json({...})` block, add two new fields after the existing `spawnZoneCoords` field (after line 20719):
  ```js
  requestingUserIsOPFOR: requestingUserId
      ? (!!game.enemies.get(requestingUserId)?.isOPFOR)
      : false,
  opforSpawnZoneCoords: (() => {
      const opforOccupied = new Set(
          Array.from(game.enemies.values())
              .filter(e => e.isOPFOR && e.x != null)
              .map(e => game.generateExtendedCoordinate(e.x, e.y + 1))
      );
      const results = [];
      for (let x = 70; x < 100; x++) {
          for (let y = 1; y <= 100; y++) {
              const coord = game.generateExtendedCoordinate(x, y);
              const cell = game.getMapCell(coord);
              if (cell && (cell.type === 'ocean' || cell.type === 'reef') && !cell.occupant && !opforOccupied.has(coord)) {
                  try {
                      const nums = game.coordToNumbers(coord);
                      results.push({ x: nums.x, y: nums.y - 1 });
                  } catch (_) {}
              }
          }
      }
      return results;
  })(),
  ```

- [ ] **Step 5: Verify**

  Restart the bot. Use the web UI to join a game with an OPFOR-flagged character. Confirm:
  - The game card shows "You're in this game" for OPFOR players
  - The join response includes `isOPFOR: true`
  - The game state response includes `requestingUserIsOPFOR: true` and a non-empty `opforSpawnZoneCoords`

- [ ] **Step 6: Commit**
  ```bash
  git add bot.js
  git commit -m "feat: route web OPFOR players via addOPFORPlayer and expose spawn coords"
  ```

---

## Task 5: Web Spawn API — Handle OPFOR players

**Files:**
- Modify: `bot.js` (spawn endpoint around line 21096)

The current spawn endpoint looks up `game.players.get(userId)` only. OPFOR players are in `game.enemies`, so they'd get a 404. This task fixes that.

- [ ] **Step 1: Update spawn endpoint to handle OPFOR players**

  Find the spawn endpoint body (around lines 21100–21127). Replace it with:
  ```js
  const game = this.games.get(channelId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.phase !== 'joining') return res.status(400).json({ error: 'Game is not in joining phase' });

  // Check BLUFOR players first, then OPFOR players in enemies
  let player = game.players.get(userId);
  let isOPFOR = false;
  if (!player) {
      const opforCandidate = game.enemies.get(userId);
      if (opforCandidate?.isOPFOR) {
          player = opforCandidate;
          isOPFOR = true;
      }
  }
  if (!player) return res.status(404).json({ error: 'Player not found in game' });

  const coordStr = game.generateExtendedCoordinate(x, y + 1);

  if (isOPFOR) {
      // OPFOR spawn zone: columns 70-99
      const col = x; // x is 0-indexed column number
      if (col < 70 || col >= 100) {
          return res.status(400).json({ error: 'Cell is not in OPFOR spawn zone' });
      }
      const cell = game.getMapCell(coordStr);
      if (!cell || (cell.type !== 'ocean' && cell.type !== 'reef')) {
          return res.status(400).json({ error: 'Cell is not a valid OPFOR spawn position' });
      }
  } else {
      if (!(game.spawnZoneCoords || []).includes(coordStr)) {
          return res.status(400).json({ error: 'Cell is not in spawn zone' });
      }
  }

  // Check occupancy across both collections
  const occupied = Array.from(game.players.values()).some(p => p.x === x && p.y === y)
      || Array.from(game.enemies.values()).some(e => e.x === x && e.y === y);
  if (occupied) return res.status(400).json({ error: 'Cell is already occupied' });

  player.x = x;
  player.y = y;
  player.position = coordStr;
  await this.broadcastGameUpdate(channelId);
  res.json({ success: true });

  this.client.channels.fetch(channelId)
      .then(ch => {
          if (!ch) return;
          const pName = player.characterAlias || player.displayName || player.username || 'A player';
          const label = isOPFOR ? `🔴 **[OPFOR] ${pName}**` : `⚓ **${pName}**`;
          ch.send({ content: `${label} selected spawn position **${coordStr}**.` });
      })
      .catch(() => {});
  ```

- [ ] **Step 2: Verify**

  With an OPFOR character joined via web, confirm that clicking a cell in the right-side zone (columns 70–99) successfully sets the OPFOR player's spawn. Confirm clicking a left-side cell returns a 400 error.

- [ ] **Step 3: Commit**
  ```bash
  git add bot.js
  git commit -m "feat: handle OPFOR player spawn selection via web API"
  ```

---

## Task 6: opfor-choice API Endpoint

**Files:**
- Modify: `bot.js` (add new endpoint)
- Modify: `web-server/src/server.js` (add proxy route)

- [ ] **Step 1: Add the endpoint to `bot.js`**

  Find the spawn endpoint (around line 21095) and add the new endpoint directly after it (after the closing `});`):
  ```js
  // OPFOR conversion choice (post-battle)
  app.post('/api/game/:channelId/opfor-choice', authenticateAPIKey, async (req, res) => {
      try {
          const { userId, guildId, characterName, choice } = req.body;
          if (!userId || !guildId || !characterName || !['convert', 'recover'].includes(choice)) {
              return res.status(400).json({ error: 'userId, guildId, characterName, and choice (convert|recover) are required' });
          }
          const playerData = this.characterManager.loadPlayerData(guildId);
          if (!playerData[userId]?.characters?.[characterName]) {
              return res.status(400).json({ error: 'Character not found' });
          }
          playerData[userId].characters[characterName].isOPFOR = (choice === 'convert');
          const saved = this.characterManager.savePlayerData(guildId, playerData);
          if (!saved) return res.status(500).json({ error: 'Failed to save character' });
          this.characterManager.syncInMemoryData(guildId, userId, playerData[userId]);
          res.json({ success: true });
      } catch (error) {
          console.error('Error processing OPFOR choice:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
  ```

- [ ] **Step 2: Add the proxy route to `web-server/src/server.js`**

  Find the `/api/game/:channelId/join` proxy (around line 277). Add the new route directly after its closing `});`:
  ```js
  app.post('/api/game/:channelId/opfor-choice', ensureAuthenticated, async (req, res) => {
    try {
      const { characterName, guildId, choice } = req.body;
      const response = await botAPI.post(`/api/game/${req.params.channelId}/opfor-choice`, {
        userId: req.user.id,
        characterName,
        guildId,
        choice
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error processing OPFOR choice:', error.message);
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || 'Failed to process OPFOR choice'
      });
    }
  });
  ```

- [ ] **Step 3: Verify**

  Restart both bot and web server. Use curl or the browser network tab to POST to `/api/game/fake-channel/opfor-choice` with `{ guildId, characterName, choice: 'convert' }` and confirm it sets `isOPFOR: true` on the character, then `choice: 'recover'` to set it back.

- [ ] **Step 4: Commit**
  ```bash
  git add bot.js web-server/src/server.js
  git commit -m "feat: add opfor-choice API endpoint for post-battle conversion"
  ```

---

## Task 7: endBattleInternal — Post-Battle Prompts

**Files:**
- Modify: `bot.js` (endBattleInternal, around lines 5661–5720)

This task adds OPFOR conversion prompts to the end-of-battle flow. The prompts fire after XP is awarded and before `this.games.delete()`. Discord prompts are channel messages (not ephemeral — no live interaction is available). The web prompt is delivered via `opforChoices` in the `endSnapshot`.

- [ ] **Step 1: Add OPFOR prompt logic after the XP loop and before `endSnapshot` construction**

  The XP loop ends around line 5661. The `endSnapshot` block starts around line 5671. Add the following between them (after line 5661):

  ```js
  // Identify sunk human players for post-battle OPFOR prompts
  // game.players contains only human players by construction — no isPlayer check needed
  // game.enemies contains AI + OPFOR humans; filter to isPlayer to skip AI units
  const sunkHumans = [
      ...Array.from(game.players.values()).filter(p => !p.alive),
      ...Array.from(game.enemies.values()).filter(p => p.isPlayer && !p.alive)
  ];

  const opforChoices = sunkHumans.map(p => ({
      userId: p.id || p.userId,
      characterName: p.characterAlias || p.displayName,
      currentIsOPFOR: p.isOPFOR || false,
      guildId: channel.guild.id
  }));

  // Send Discord channel messages for sunk human players
  for (const sunk of sunkHumans) {
      const userId = sunk.id || sunk.userId;
      const charName = sunk.characterAlias || sunk.displayName;
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      if (sunk.isOPFOR) {
          // Sunk OPFOR: offer recovery
          const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                  .setCustomId(`opfor_recover_yes_${userId}_${channel.guild.id}_${charName}`)
                  .setLabel('Be Recovered')
                  .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                  .setCustomId(`opfor_recover_no_${userId}`)
                  .setLabel('Remain OPFOR')
                  .setStyle(ButtonStyle.Danger)
          );
          await channel.send({
              content: `🏳️ <@${userId}>, you were sunk. Return to BLUFOR (be recovered), or remain OPFOR?`,
              components: [row]
          });
      } else {
          // Sunk BLUFOR: offer conversion
          const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                  .setCustomId(`opfor_convert_yes_${userId}_${channel.guild.id}_${charName}`)
                  .setLabel('Convert to OPFOR')
                  .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                  .setCustomId(`opfor_convert_no_${userId}`)
                  .setLabel('Remain Sunk')
                  .setStyle(ButtonStyle.Secondary)
          );
          await channel.send({
              content: `⚔️ <@${userId}>, you were sunk. Convert to OPFOR for future battles, or remain sunk?`,
              components: [row]
          });
      }
  }
  ```

  > **Note:** `ActionRowBuilder`, `ButtonBuilder`, and `ButtonStyle` are already imported at the top of `bot.js` via `const { ..., ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');`. If they are not destructured at the top level, use the already-available references instead of requiring them inline.

- [ ] **Step 2: Add `opforChoices` to the `endSnapshot` object**

  Inside the `endSnapshot` object (around line 5680, the big object passed to `this.endedGames.set`), add `opforChoices` as a field after `mvp: ...`:
  ```js
  opforChoices: opforChoices,
  ```

- [ ] **Step 3: Verify**

  End a battle where at least one player was sunk. Confirm:
  - Discord channel gets a prompt message for each sunk human player
  - The `endSnapshot` (retrievable via `/api/game/:channelId/state` for 30 mins after battle ends) includes `opforChoices`

- [ ] **Step 4: Commit**
  ```bash
  git add bot.js
  git commit -m "feat: send OPFOR conversion prompts at end of battle"
  ```

---

## Task 8: Discord Button Handler — opfor_convert_ / opfor_recover_

**Files:**
- Modify: `bot.js` (interaction handler section)

Discord.js button interactions are handled in the main `interactionCreate` handler. Look for where other custom button IDs are dispatched (search for `customId.startsWith` or `customId.includes` patterns) to find the right place to add the new case.

- [ ] **Step 1: Find the interaction router**

  Search for `opfor_spawn_select_` to find the section that dispatches OPFOR-related interactions. The new handler should be added nearby, in the same dispatch chain.

- [ ] **Step 2: Add the handler case**

  Add a check for OPFOR choice buttons. This should be placed where other `customId` checks are made (in `bot.js`, look for the block that handles button interactions — likely inside an `if (interaction.isButton())` block):

  ```js
  if (interaction.customId.startsWith('opfor_convert_') || interaction.customId.startsWith('opfor_recover_')) {
      return await this.handleOPFORChoiceButton(interaction);
  }
  ```

- [ ] **Step 3: Add the `handleOPFORChoiceButton` method to the bot class**

  Add this method near `handleOPFORSpawnSelection` (around line 4789):
  ```js
  async handleOPFORChoiceButton(interaction) {
      const parts = interaction.customId.split('_');
      // Format: opfor_convert_yes/no_userId[_guildId_charName]
      //         opfor_recover_yes/no_userId[_guildId_charName]
      const action = parts[1];   // 'convert' or 'recover'
      const answer = parts[2];   // 'yes' or 'no'
      const userId = parts[3];

      // Only the intended player can respond
      if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ This prompt is not for you.', ephemeral: true });
      }

      if (answer === 'no') {
          await interaction.update({ content: interaction.message.content + '\n*(No change made.)*', components: [] });
          return;
      }

      // 'yes' path: parts[4] = guildId, parts[5] = characterName (may have underscores — rejoin remaining parts)
      const guildId = parts[4];
      const characterName = parts.slice(5).join('_');
      const choice = action === 'convert' ? 'convert' : 'recover';

      try {
          const playerData = this.characterManager.loadPlayerData(guildId);
          if (!playerData[userId]?.characters?.[characterName]) {
              return interaction.reply({ content: '❌ Character not found.', ephemeral: true });
          }
          playerData[userId].characters[characterName].isOPFOR = (choice === 'convert');
          this.characterManager.savePlayerData(guildId, playerData);
          this.characterManager.syncInMemoryData(guildId, userId, playerData[userId]);

          const msg = choice === 'convert'
              ? `✅ **${characterName}** is now flagged as OPFOR for future battles.`
              : `✅ **${characterName}** has been recovered — OPFOR flag removed.`;

          await interaction.update({ content: interaction.message.content + `\n${msg}`, components: [] });
      } catch (err) {
          console.error('Error handling OPFOR choice button:', err);
          await interaction.reply({ content: '❌ An error occurred. Please try again.', ephemeral: true });
      }
  }
  ```

- [ ] **Step 4: Verify**

  After a battle ends with a sunk player, click the Discord button. Confirm:
  - "Yes" button sets the flag and updates the message
  - "No" button dismisses with "No change made"
  - Clicking someone else's button returns the "not for you" error

- [ ] **Step 5: Commit**
  ```bash
  git add bot.js
  git commit -m "feat: handle OPFOR conversion choice Discord buttons"
  ```

---

## Task 9: GameView — OPFOR Choice Modal

**Files:**
- Modify: `web-server/client/src/components/GameView.js`

The `gameUpdate` socket event calls `fetchGameState()`, which returns the `endSnapshot` including `opforChoices`. When the game is ended and the current user appears in `opforChoices`, show a modal.

- [ ] **Step 1: Add `opforChoiceData` state**

  Find the existing `useState` declarations near the top of the `GameView` function (around line 197). Add:
  ```js
  const [opforChoiceData, setOpforChoiceData] = useState(null);
  ```

- [ ] **Step 2: Check for OPFOR choice on game state change**

  Find the `useEffect` that syncs `selectedPlayer` with fresh game state (around line 246). Add a new `useEffect` after it:
  ```js
  useEffect(() => {
    if (gameState?.phase === 'ended' && gameState.opforChoices?.length > 0) {
      const myChoice = gameState.opforChoices.find(c => c.userId === user.id);
      if (myChoice && !opforChoiceData) {
        setOpforChoiceData(myChoice);
      }
    }
  }, [gameState]);
  ```

- [ ] **Step 3: Add `handleOpforChoice` function**

  Add this function near the other handler functions (around line 550):
  ```js
  const handleOpforChoice = async (choice) => {
    if (!opforChoiceData) return;
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/opfor-choice`, {
        characterName: opforChoiceData.characterName,
        guildId: opforChoiceData.guildId,
        choice
      }, { withCredentials: true });
    } catch (err) {
      console.error('Failed to save OPFOR choice:', err);
    } finally {
      setOpforChoiceData(null);
    }
  };
  ```

- [ ] **Step 4: Render the OPFOR choice modal**

  Find the existing `{gameState?.phase === 'ended' && ...}` block (around line 1239). Add the modal just before it:
  ```jsx
  {opforChoiceData && (
    <div className="opfor-choice-overlay">
      <div className="opfor-choice-modal">
        {opforChoiceData.currentIsOPFOR ? (
          <>
            <h3>🏳️ You Were Sunk</h3>
            <p>Do you want to return to BLUFOR (be recovered), or remain OPFOR for future battles?</p>
            <div className="opfor-choice-buttons">
              <button className="btn-opfor-recover" onClick={() => handleOpforChoice('recover')}>
                Be Recovered
              </button>
              <button className="btn-opfor-stay" onClick={() => handleOpforChoice('convert')}>
                Remain OPFOR
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>⚔️ You Were Sunk</h3>
            <p>Convert to OPFOR for future battles, or remain sunk?</p>
            <div className="opfor-choice-buttons">
              <button className="btn-opfor-convert" onClick={() => handleOpforChoice('convert')}>
                Convert to OPFOR
              </button>
              <button className="btn-opfor-stay" onClick={() => setOpforChoiceData(null)}>
                Remain Sunk
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )}
  ```

- [ ] **Step 5: Add basic styles**

  The modal needs minimal CSS. Find the GameView's CSS file (`GameView.css`) and add at the end:
  ```css
  .opfor-choice-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .opfor-choice-modal {
    background: #1a1a2e;
    border: 2px solid #e63946;
    border-radius: 8px;
    padding: 2rem;
    max-width: 400px;
    text-align: center;
    color: #fff;
  }
  .opfor-choice-modal h3 { margin-top: 0; font-size: 1.4rem; }
  .opfor-choice-modal p { margin-bottom: 1.5rem; color: #ccc; }
  .opfor-choice-buttons { display: flex; gap: 1rem; justify-content: center; }
  .btn-opfor-convert { background: #e63946; color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; font-weight: bold; }
  .btn-opfor-recover { background: #2a9d8f; color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; font-weight: bold; }
  .btn-opfor-stay { background: #444; color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }
  ```

- [ ] **Step 6: Verify**

  End a battle where the current web user was sunk. After the `gameUpdate` fires and the state refreshes, the OPFOR choice modal should appear. Choosing an option should dismiss the modal and persist the flag.

- [ ] **Step 7: Commit**
  ```bash
  git add web-server/client/src/components/GameView.js web-server/client/src/components/GameView.css
  git commit -m "feat: add OPFOR conversion modal to post-battle web screen"
  ```

---

## Task 10: Cleanup — Remove hasOPFORRole

**Files:**
- Modify: `bot.js`

- [ ] **Step 1: Verify no remaining references**

  Search for `hasOPFORRole` in `bot.js`. By this point, there should be exactly one result — the method definition itself at line ~3538. (The three call sites were replaced in Task 3.)

  ```bash
  grep -n "hasOPFORRole" bot.js
  ```

  Expected output: one line showing the method definition.

- [ ] **Step 2: Delete the `hasOPFORRole` method**

  Find and delete the entire method (lines ~3538–3547):
  ```js
  hasOPFORRole(member) {
      return member.roles.cache.some(role => {
          const roleName = role.name.toLowerCase();
          return roleName.includes('opfor') ||
                 roleName.includes('enemy') ||
                 roleName.includes('hostile') ||
                 roleName.includes('red team') ||
                 roleName.includes('opposition');
      });
  }
  ```

- [ ] **Step 3: Confirm bot still starts cleanly**

  Restart the bot and confirm no errors appear.

- [ ] **Step 4: Commit**
  ```bash
  git add bot.js
  git commit -m "chore: remove dead hasOPFORRole method"
  ```
