# Weather Forecast System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-announce weather changes several turns in advance with flavor text, mechanical warnings, and a gradual ramp through intermediate weather states.

**Architecture:** A `pendingWeather` object on the game stores the scheduled change; `processWeatherEvents()` in `bot.js` manages the countdown, applies intermediate states each turn, and sends forecast messages. The GM Discord command and web API both gain a delay parameter.

**Tech Stack:** Node.js/Discord.js (bot), React (web dashboard), Express (web API)

**Spec:** `docs/superpowers/specs/2026-03-25-weather-forecast-design.md`

---

## File Map

| File | Change |
|---|---|
| `bot.js:21603` — `NavalBattle` constructor | Add `this.pendingWeather = null` |
| `bot.js:~17494` — inside `NavalBattle` class body, above `processWeatherEvents` | Add `static WEATHER_CHAINS` |
| `bot.js:17495` — `processWeatherEvents()` | Full rewrite with scheduling, ramp, forecast |
| `bot.js:459` — `/weather` slash command builder | Add `turns` integer option |
| `bot.js:18403` — `setWeather()` | Handle `turns` option; schedule vs instant |
| `bot.js:20500` — POST `/api/game/:channelId/weather` | Accept `turnsDelay`, schedule or apply |
| `bot.js:19970` — GET `/api/game/:channelId/state` response | Expose `pendingWeather` to GMs only |
| `web-server/client/src/components/GameView.js:179` — state | Add `gmWeatherDelay` state |
| `web-server/client/src/components/GameView.js:563` — `handleWeather()` | Pass `turnsDelay` in POST body |
| `web-server/client/src/components/GameView.js:1187` — GM weather row | Add delay input + pending indicator |

---

## Task 1: Add `pendingWeather` field and `WEATHER_CHAINS` constant

**Files:**
- Modify: `bot.js:21603` (NavalBattle constructor)
- Modify: `bot.js:~17494` (inside NavalBattle class body, immediately above `processWeatherEvents`)

- [ ] **Step 1: Add `pendingWeather = null` to the NavalBattle constructor**

  In `bot.js`, find line ~21603 (`this.activeWeatherEvent = null;`). Add immediately after it:

  ```js
  this.pendingWeather = null;
  ```

- [ ] **Step 2: Add the `WEATHER_CHAINS` static field inside the NavalBattle class body**

  In `bot.js`, find the line `processWeatherEvents(game) {` (~line 17495). Immediately **above it, still inside the NavalBattle class body**, add:

  ```js
  // Progression chain for each target weather.
  // step[i] fires when pendingWeather.turnsUntil === (N - 1 - i)
  // The final element in each chain is the arrival weather.
  static WEATHER_CHAINS = {
      hurricane:    ['rainy', 'thunderstorm', 'hurricane'],
      thunderstorm: ['rainy', 'thunderstorm'],
      rainy:        ['rainy'],
      foggy:        ['foggy'],
      clear:        ['clear'],          // for clearing from rainy/foggy
      clear_heavy:  ['rainy', 'clear'], // for clearing from thunderstorm/hurricane
  };
  ```

  > **Important:** This is a `static` class field and must be placed inside the `NavalBattle` class body, between two methods — not outside the class or in the global scope.

- [ ] **Step 3: Verify the file parses (no syntax errors)**

  ```bash
  node --check bot.js
  ```

  Expected: no output (clean parse).

- [ ] **Step 4: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: add pendingWeather field and WEATHER_CHAINS to NavalBattle"
  ```

---

## Task 2: Rewrite `processWeatherEvents()` with forecast + ramp logic

**Files:**
- Modify: `bot.js:17495` — replace entire `processWeatherEvents()` body

The method signature and return type are unchanged (returns an array of message strings).

- [ ] **Step 1: Replace the entire body of `processWeatherEvents()` with the following**

  ```js
  processWeatherEvents(game) {
      const messages = [];
      let weatherChanged = false;

      // Flavor text per target weather and ramp stage.
      // Index matches the chain position (0 = first intermediate, last = arrival).
      // Each entry has >=2 variants alternated by turn parity.
      const FORECAST_FLAVOR = {
          hurricane: [
              // stage 0 — building toward rainy
              [
                  'Swells are building on the horizon. Barometric pressure dropping sharply.',
                  'Heavy squalls reported across the operational area. Sea state deteriorating.',
              ],
              // stage 1 — building toward thunderstorm
              [
                  'Wind speeds increasing rapidly. All aircraft operations advised to suspend.',
                  'Lightning observed across the fleet position. Storm intensifying ahead of schedule.',
              ],
              // arrival
              [
                  'Category-force winds have arrived. All hands brace for impact.',
                  'Hurricane conditions are now in full effect. Seek shelter immediately.',
              ],
          ],
          thunderstorm: [
              // stage 0 — building toward rainy
              [
                  'Dark clouds massing to the northeast. Rain squalls inbound.',
                  'Fleet meteorology warns of deteriorating conditions within the hour.',
              ],
              // arrival
              [
                  'Thunderstorm has arrived. Lightning strikes reducing visibility.',
                  'Heavy storm overhead. Accuracy and visibility significantly impaired.',
              ],
          ],
          rainy: [
              // arrival (single-step chain — no intermediate)
              [
                  'Rain bands moving in from the south. Expect reduced visibility.',
                  'Steady rainfall beginning across the operational area.',
              ],
          ],
          foggy: [
              // arrival (single-step chain — no intermediate)
              [
                  'A dense fog bank is rolling in from the sea.',
                  'Visibility dropping rapidly. Fog blanketing the operational area.',
              ],
          ],
          clear: [
              // arrival
              [
                  'Skies are clearing. Visibility improving across the fleet.',
                  'Weather system passing. Conditions returning to normal.',
              ],
          ],
          clear_heavy: [
              // stage 0 — rainy intermediate while clearing from a major storm
              [
                  'The storm is weakening. Rain continues but conditions improving.',
                  'Wind speeds dropping. Fleet meteorology reports the worst has passed.',
              ],
              // arrival
              [
                  'Storm has fully cleared. Clear skies and full visibility restored.',
                  'All-clear issued. Operational conditions have returned to normal.',
              ],
          ],
      };

      const WEATHER_EFFECTS = {
          hurricane:    'visibility 5 cells, aircraft ops suspended, accuracy severely reduced',
          thunderstorm: 'visibility 10 cells, accuracy -20%',
          rainy:        'mild accuracy penalty, no visibility reduction',
          foggy:        'visibility 15 cells',
          clear:        'full visibility restored',
      };

      // ── 1. RANDOM SCHEDULING ─────────────────────────────────────────────────
      // Only schedule if no pending change is already in flight.
      if (!game.pendingWeather && Math.random() < 0.06) {
          const availableEvents = Array.from(this.weatherEvents.values());
          if (availableEvents.length > 0) {
              const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
              const targetCondition = event.weatherChange || 'clear';
              const turnsUntil = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
              game.pendingWeather = {
                  condition: targetCondition,
                  turnsUntil,
                  eventName: event.name,
                  isGMSet: false,
                  originWeather: game.weather,
                  _event: event, // retained to set activeWeatherEvent on arrival
              };
          }
      }

      // ── 2. PROCESS PENDING WEATHER ────────────────────────────────────────────
      if (game.pendingWeather) {
          const pw = game.pendingWeather;

          // Resolve which chain to use (clear has two variants based on origin)
          const chainKey = (pw.condition === 'clear' &&
                            (pw.originWeather === 'thunderstorm' || pw.originWeather === 'hurricane'))
              ? 'clear_heavy'
              : pw.condition;
          const chain = NavalBattle.WEATHER_CHAINS[chainKey] || [pw.condition];
          const N = chain.length;

          // (a) Apply intermediate ramp step if this turnsUntil maps to one.
          // Intermediate steps are indices 0 to N-2; step[i] fires at turnsUntil = N-1-i.
          for (let i = 0; i < N - 1; i++) {
              if (pw.turnsUntil === (N - 1 - i)) {
                  const intermediateWeather = chain[i];
                  game.weather = intermediateWeather;
                  weatherChanged = true;
                  const intEmoji = { rainy: '🌧️', thunderstorm: '⛈️', foggy: '🌫️', clear: '🌤️', hurricane: '🌀' }[intermediateWeather] || '🌦️';
                  messages.push(`${intEmoji} **Conditions deteriorating** — weather shifting to **${intermediateWeather}** ahead of incoming ${pw.condition}.`);
                  break;
              }
          }

          // (b) Check arrival BEFORE decrement.
          if (pw.turnsUntil === 0) {
              game.weather = pw.condition;
              weatherChanged = true; // ensures section 4 flags the map update

              // Set activeWeatherEvent for random events (handles auto-revert duration)
              if (!pw.isGMSet && pw._event) {
                  game.activeWeatherEvent = {
                      ...pw._event,
                      turnsRemaining: pw._event.duration,
                  };
              }

              // Arrival flavor — last index in the flavor array
              const arrivalFlavor = FORECAST_FLAVOR[chainKey];
              const arrivalLines = arrivalFlavor?.[N - 1] || arrivalFlavor?.[arrivalFlavor.length - 1];
              const arrivalText = arrivalLines?.[game.turnNumber % arrivalLines.length] || '';
              const arrivalEmoji = { rainy: '🌧️', thunderstorm: '⛈️', foggy: '🌫️', clear: '🌤️', hurricane: '🌀' }[pw.condition] || '🌦️';
              messages.push(`${arrivalEmoji} **${pw.condition.toUpperCase()} — weather has arrived!**\n*"${arrivalText}"*`);

              game.pendingWeather = null;

          } else {
              // (c) Emit forecast message, then decrement.

              const headerEmoji = pw.isGMSet ? '📡' : '🌦️';
              const headerLabel = pw.isGMSet ? 'FLEET WEATHER FORECAST' : 'WEATHER FORECAST';
              const conditionLabel = pw.condition.charAt(0).toUpperCase() + pw.condition.slice(1);

              // Determine flavor stage: how far into the ramp chain we are.
              // Formula: stageIndex = clamp(N - 1 - turnsUntil, 0, N-1)
              // This maps "no steps fired yet" → 0 and "last intermediate fired" → N-2.
              const stageIndex = Math.max(0, Math.min(N - 1, N - 1 - pw.turnsUntil));
              const flavorOptions = FORECAST_FLAVOR[chainKey]?.[stageIndex];
              const flavorLine = flavorOptions?.[game.turnNumber % flavorOptions.length] || '';
              const effectDesc = WEATHER_EFFECTS[pw.condition] || '';

              messages.push(
                  `${headerEmoji} **${headerLabel}** — ${conditionLabel} in **${pw.turnsUntil}** turn${pw.turnsUntil !== 1 ? 's' : ''}\n` +
                  `*"${flavorLine}"*\n` +
                  `⚠️ Incoming: **${pw.condition}** — ${effectDesc}`
              );

              pw.turnsUntil--;
          }
      }

      // ── 3. ACTIVE WEATHER EVENT EXPIRY (existing logic, unchanged) ─────────────
      // Note: if a new activeWeatherEvent was just set in block (b), this block will
      // decrement it on its very first turn. This is a pre-existing behavior consistent
      // with the original code's pattern — the event's `duration` accounts for this.
      if (game.activeWeatherEvent) {
          game.activeWeatherEvent.turnsRemaining--;

          if (game.activeWeatherEvent.turnsRemaining <= 0) {
              const oldWeather = game.weather;

              if (game.activeWeatherEvent.name === 'Sudden Storm') {
                  game.weather = 'clear';
                  weatherChanged = true;
              }

              if (weatherChanged) {
                  messages.push(`🌤️ Weather event "${game.activeWeatherEvent.name}" has ended.`);
                  messages.push(`🌤️ Weather cleared from ${oldWeather} to ${game.weather}!`);
              } else {
                  messages.push(`🌤️ Weather event "${game.activeWeatherEvent.name}" has ended.`);
              }

              game.activeWeatherEvent = null;
          }
      }

      // ── 4. FLAG WEATHER CHANGE FOR MAP UPDATE ────────────────────────────────
      game.weatherChangedThisTurn = weatherChanged;

      return messages;
  }
  ```

- [ ] **Step 2: Verify parse**

  ```bash
  node --check bot.js
  ```

  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: rewrite processWeatherEvents with forecast scheduling and ramp logic"
  ```

---

## Task 3: Add `turns` option to Discord `/weather` slash command and `setWeather()`

**Files:**
- Modify: `bot.js:459` — slash command builder
- Modify: `bot.js:18403` — `setWeather()` method

- [ ] **Step 1: Add `turns` integer option to the `/weather` slash command**

  Find the `/weather` slash command builder (~line 459). Add an integer option before `.setDefaultMemberPermissions(...)`:

  ```js
  new SlashCommandBuilder().setName('weather').setDescription('Set weather conditions')
      .addStringOption(option => option.setName('condition').setDescription('Weather condition').setRequired(true)
          .addChoices({name: 'Clear', value: 'clear'}, {name: 'Rainy', value: 'rainy'}, {name: 'Foggy', value: 'foggy'},
                     {name: 'Thunderstorm', value: 'thunderstorm'}, {name: 'Hurricane', value: 'hurricane'}))
      .addIntegerOption(option => option.setName('turns')
          .setDescription('Turns until weather takes effect (0 = instant, default 0)')
          .setMinValue(0).setMaxValue(10).setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  ```

- [ ] **Step 2: Replace the body of `setWeather()` to handle delayed scheduling**

  ```js
  async setWeather(interaction) {
      if (!this.hasStaffPermission(interaction.member)) {
          return interaction.reply({
              content: '❌ You need staff permissions to set weather.\n\n' +
                       'Contact an administrator to:\n' +
                       '• Give you the configured staff role, or\n' +
                       '• Give you Manage Messages permission',
              flags: MessageFlags.Ephemeral
          });
      }

      const game = this.games.get(interaction.channelId);
      if (!game) {
          return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });
      }

      const condition = interaction.options.getString('condition');
      const turnsDelay = interaction.options.getInteger('turns') ?? 0;

      if (turnsDelay === 0) {
          // Instant apply — original behavior preserved exactly.
          const oldWeather = game.weather;
          game.weather = condition;
          game.pendingWeather = null; // cancel any pending forecast

          // Note: the existing code checks 'fog' but the valid value is 'foggy' — left as-is
          // to preserve existing behavior. The 'foggy' visibility branch never fires.
          let weatherMessage = `🌤️ Weather changed from ${oldWeather.charAt(0).toUpperCase() + oldWeather.slice(1)} to ${condition.charAt(0).toUpperCase() + condition.slice(1)}!`;
          if (condition === 'hurricane') {
              weatherMessage += `\n⚠️ **Severe conditions reduce visibility to 5 cells!** Enemy forces outside this range are hidden.`;
          } else if (condition === 'thunderstorm') {
              weatherMessage += `\n⚠️ **Heavy clouds reduce visibility to 10 cells!** Enemy forces outside this range are hidden.`;
          } else if (condition === 'fog') {
              weatherMessage += `\n⚠️ **Fog reduces visibility to 15 cells!** Enemy forces outside this range are hidden.`;
          } else if (oldWeather === 'thunderstorm' || oldWeather === 'hurricane' || oldWeather === 'fog') {
              weatherMessage += `\n✨ **Visibility restored!** All enemy forces are now visible.`;
          }

          await interaction.reply({ content: weatherMessage });

          // updateGameDisplay() must be preserved on the turns:0 path
          try {
              await this.updateGameDisplay(game, interaction.channel);
          } catch (error) {
              console.error('❌ Error updating map after weather change:', error);
              await interaction.followUp({
                  content: '⚠️ Weather changed successfully, but map update failed. Map will update on next turn.',
                  flags: MessageFlags.Ephemeral
              });
          }
      } else {
          // Scheduled — populate pendingWeather (overrides any existing pending change)
          game.pendingWeather = {
              condition,
              turnsUntil: turnsDelay,
              eventName: null,
              isGMSet: true,
              originWeather: game.weather,
          };

          const conditionLabel = condition.charAt(0).toUpperCase() + condition.slice(1);
          const effectDescs = {
              hurricane:    'visibility 5 cells, aircraft ops suspended',
              thunderstorm: 'visibility 10 cells, accuracy -20%',
              rainy:        'mild accuracy penalty',
              foggy:        'visibility 15 cells',
              clear:        'full visibility restored',
          };
          await interaction.reply({
              content:
                  `📡 **FLEET WEATHER FORECAST** — ${conditionLabel} in **${turnsDelay}** turn${turnsDelay !== 1 ? 's' : ''}\n` +
                  `*"Fleet meteorology has issued an official weather advisory."*\n` +
                  `⚠️ Incoming: **${condition}** — ${effectDescs[condition] || ''}`
          });
          // No updateGameDisplay() call here — no visual change until weather actually shifts
      }
  }
  ```

- [ ] **Step 3: Verify parse**

  ```bash
  node --check bot.js
  ```

  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: add turns delay option to /weather command and setWeather()"
  ```

---

## Task 4: Add `turnsDelay` to web API weather endpoint and expose `pendingWeather` in game state

**Files:**
- Modify: `bot.js:20500` — POST `/api/game/:channelId/weather`
- Modify: `bot.js:19970` — game state response

- [ ] **Step 1: Update the web API weather endpoint**

  Find and replace the handler at `app.post('/api/game/:channelId/weather', ...)` (~line 20500):

  ```js
  app.post('/api/game/:channelId/weather', authenticateAPIKey, async (req, res) => {
      try {
          const { channelId } = req.params;
          const { userId, condition, turnsDelay = 0 } = req.body;
          const game = this.games.get(channelId);
          if (!game) return res.status(404).json({ error: 'Game not found' });
          if (!game.gmIds?.includes(userId)) return res.status(403).json({ error: 'Not the GM' });
          const valid = ['clear', 'rainy', 'foggy', 'thunderstorm', 'hurricane'];
          if (!valid.includes(condition)) return res.status(400).json({ error: 'Invalid weather condition' });

          if (turnsDelay === 0) {
              // Instant apply — original behavior
              game.weather = condition;
              game.pendingWeather = null;
              await this.broadcastGameUpdate(channelId);
              game.addGMLog(`Set weather to ${condition}`);
              res.json({ success: true });
              this.client.channels.fetch(channelId)
                  .then(ch => { if (ch) ch.send({ content: `🌦️ Weather conditions have shifted to **${condition}**.` }); })
                  .catch(() => {});
          } else {
              // Scheduled
              game.pendingWeather = {
                  condition,
                  turnsUntil: turnsDelay,
                  eventName: null,
                  isGMSet: true,
                  originWeather: game.weather,
              };
              game.addGMLog(`Scheduled weather change to ${condition} in ${turnsDelay} turns`);
              await this.broadcastGameUpdate(channelId);
              res.json({ success: true });
              const condLabel = condition.charAt(0).toUpperCase() + condition.slice(1);
              this.client.channels.fetch(channelId)
                  .then(ch => {
                      if (ch) ch.send({
                          content:
                              `📡 **FLEET WEATHER FORECAST** — ${condLabel} in **${turnsDelay}** turn${turnsDelay !== 1 ? 's' : ''}\n` +
                              `*"Fleet meteorology has issued an official weather advisory."*`
                      });
                  })
                  .catch(() => {});
          }
      } catch (error) {
          console.error('Error changing weather:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
  ```

- [ ] **Step 2: Add `pendingWeather` to the game state API response (GM-only)**

  In the `res.json({...})` block of `/api/game/:channelId/state` (~line 19970), find `weather: game.weather,` and add below it:

  ```js
  weather: game.weather,
  // pendingWeather is GM-only — do not expose to players
  pendingWeather: requesterIsGM && game.pendingWeather ? {
      condition: game.pendingWeather.condition,
      turnsUntil: game.pendingWeather.turnsUntil,
      isGMSet: game.pendingWeather.isGMSet,
  } : null,
  ```

  > `requesterIsGM` is already computed at line ~19856 in the same handler.

- [ ] **Step 3: Verify parse**

  ```bash
  node --check bot.js
  ```

  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add bot.js
  git commit -m "feat: add turnsDelay to web API weather endpoint, expose pendingWeather to GMs in game state"
  ```

---

## Task 5: Update GameView web dashboard with delay input and pending weather indicator

**Files:**
- Modify: `web-server/client/src/components/GameView.js`

- [ ] **Step 1: Add `gmWeatherDelay` state**

  Find (~line 179):
  ```js
  const [gmWeather, setGmWeather] = useState('clear');
  ```

  Add below it:
  ```js
  const [gmWeatherDelay, setGmWeatherDelay] = useState(0);
  ```

- [ ] **Step 2: Update `handleWeather()` to pass `turnsDelay`**

  Replace `handleWeather` (~line 563):

  ```js
  const handleWeather = async (condition, delay = 0) => {
    try {
      await axios.post(`${API_URL}/api/game/${channelId}/weather`,
        { condition, turnsDelay: delay },
        { withCredentials: true }
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set weather');
    }
  };
  ```

  > Note: `userId` is intentionally absent from the body — the web server proxy (`server.js`) injects `userId: req.user.id` from the authenticated session before forwarding to the bot API.

- [ ] **Step 3: Replace the GM weather row in the render**

  Find the existing weather row (~line 1187):

  ```jsx
  <div className="gm-row">
    <select value={gmWeather} onChange={e => setGmWeather(e.target.value)}>
      ...
    </select>
    <button onClick={() => handleWeather(gmWeather)}>Set Weather</button>
  </div>
  ```

  Replace with:

  ```jsx
  <div className="gm-row">
    <select value={gmWeather} onChange={e => setGmWeather(e.target.value)}>
      <option value="clear">Clear</option>
      <option value="rainy">Rainy</option>
      <option value="foggy">Foggy</option>
      <option value="thunderstorm">Thunderstorm</option>
      <option value="hurricane">Hurricane</option>
    </select>
    <input
      type="number"
      min="0"
      max="10"
      value={gmWeatherDelay}
      onChange={e => setGmWeatherDelay(Number(e.target.value))}
      title="Turns delay (0 = instant)"
      style={{ width: '48px', textAlign: 'center' }}
    />
    <button onClick={() => handleWeather(gmWeather, gmWeatherDelay)}>
      {gmWeatherDelay > 0 ? `Schedule (${gmWeatherDelay}t)` : 'Set Weather'}
    </button>
  </div>
  {gameState?.pendingWeather && (
    <div className="gm-row" style={{ opacity: 0.8, fontSize: '0.85em' }}>
      {{
        clear: '☀️', rainy: '🌧️', foggy: '🌫️',
        thunderstorm: '⛈️', hurricane: '🌀'
      }[gameState.pendingWeather.condition] || '🌦️'}
      {' '}
      <em>
        {gameState.pendingWeather.condition.charAt(0).toUpperCase() +
         gameState.pendingWeather.condition.slice(1)} in {gameState.pendingWeather.turnsUntil} turn{gameState.pendingWeather.turnsUntil !== 1 ? 's' : ''}
      </em>
    </div>
  )}
  ```

- [ ] **Step 4: Verify React build compiles**

  ```bash
  cd "web-server/client" && npx react-scripts build 2>&1 | tail -20
  ```

  Expected: `Compiled successfully.`

- [ ] **Step 5: Commit**

  ```bash
  git add web-server/client/src/components/GameView.js
  git commit -m "feat: add weather delay input and pending forecast indicator to GM dashboard"
  ```

---

## Task 6: Manual smoke test

No automated test framework is configured for bot.js. Verify the full feature in-game.

- [ ] **Test 1 — Instant GM weather (delay=0, no forecast):**
  - Start a game, open the web dashboard as GM
  - Leave delay at 0, click "Set Weather" → hurricane
  - Expected: weather changes immediately in the next broadcastGameUpdate, no forecast message in Discord

- [ ] **Test 2 — Delayed GM weather via Discord (turnsDelay=3):**
  - Run `/weather condition:hurricane turns:3`
  - Expected: immediate Discord reply "FLEET WEATHER FORECAST — Hurricane in 3 turns"
  - `game.pendingWeather = { condition:'hurricane', turnsUntil:3, ... }`
  - Advance Turn 1 (end player turn → processWeatherEvents fires with turnsUntil=3):
    - No chain step maps to turnsUntil=3 for hurricane (N=3) — forecast "Hurricane in 3 turns", decrement to 2
  - Advance Turn 2 (turnsUntil=2 on entry):
    - Chain step[0] maps to turnsUntil=2 → weather shifts to rainy + intermediate message
    - Forecast "Hurricane in 2 turns", decrement to 1
  - Advance Turn 3 (turnsUntil=1 on entry):
    - Chain step[1] maps to turnsUntil=1 → weather shifts to thunderstorm + intermediate message
    - Forecast "Hurricane in 1 turn", decrement to 0
  - Advance Turn 4 (turnsUntil=0 on entry):
    - Arrival: weather becomes hurricane, arrival message posted, pendingWeather cleared
    - `game.weatherChangedThisTurn = true` → map updates

- [ ] **Test 3 — Delayed GM weather via web dashboard (delay=2):**
  - Set delay to 2, select Thunderstorm, click "Schedule (2t)"
  - Expected: pending indicator shows "⛈️ Thunderstorm in 2 turns" in GM panel
  - Thunderstorm chain: `['rainy', 'thunderstorm']`, N=2. step[0] triggers at turnsUntil === 1.
  - Advance turns:
    - Turn 1 (turnsUntil=2 on entry): no chain step maps to 2; forecast "Thunderstorm in 2 turns" only; decrement → 1
    - Turn 2 (turnsUntil=1 on entry): step[0] fires → weather shifts to rainy + intermediate message; forecast "Thunderstorm in 1 turn"; decrement → 0
    - Turn 3 (turnsUntil=0 on entry): arrival → thunderstorm, indicator disappears

- [ ] **Test 4 — GM override cancels existing pending:**
  - Schedule hurricane in 4 turns
  - After 1 turn, run `/weather condition:rainy turns:0` (instant)
  - Expected: pendingWeather cleared, rainy applied immediately, no further forecast

- [ ] **Test 5 — Random event scheduling:**
  - Let game run ~20 turns until the 6% roll fires
  - Expected: forecast message appears with "in N turns" (N = 2, 3, or 4)
  - Verify gradual ramp through intermediate states (per chain table in spec)
  - Verify `game.activeWeatherEvent` is set on arrival and auto-reverts weather after its duration

- [ ] **Step 6: Push**

  ```bash
  git push
  ```
