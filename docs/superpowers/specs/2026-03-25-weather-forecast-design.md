# Weather Forecast System — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Overview

Before any weather change takes effect, players receive forecast messages over several turns outlining the incoming conditions and their mechanical effects. Weather transitions ramp up gradually — a hurricane doesn't arrive out of nowhere, it builds through rain and storm first.

---

## Data Model

One new field on the game object:

```js
game.pendingWeather = {
  condition: 'thunderstorm',   // target weather value (final state)
  turnsUntil: 3,               // countdown; apply final state when this reaches 0
  eventName: 'Sudden Storm',   // display name (null for GM-set)
  isGMSet: false,              // true when a GM initiated it
  originWeather: 'clear'       // game.weather at the time pendingWeather was created
                               // used to determine the correct ramp for 'clear' targets
}
```

- `null` when no change is pending.
- Only one pending change at a time. A newer GM command overwrites any existing pending change (random or GM). A new random roll does NOT overwrite an existing pending change.
- `originWeather` is captured at the moment `pendingWeather` is created and never mutated thereafter, even as `game.weather` changes during ramp steps.

---

## Weather Progression Chains

Each target weather type has a fixed ramp-up sequence. Intermediate states are anchored to the end of the countdown. The formula for step `i` (0-indexed from the front of the chain) in a chain of length N is:

```
step[i] fires when turnsUntil === (N - 1 - i)
```

If `turnsUntil` at scheduling time is less than `N - 1` (i.e. the countdown is shorter than the chain), the earliest steps are never fired — only the steps whose `turnsUntil` trigger value fits within the scheduled window are applied.

| Target | Chain (in order) | Chain length N |
|---|---|---|
| `hurricane` | rainy → thunderstorm → hurricane | 3 |
| `thunderstorm` | rainy → thunderstorm | 2 |
| `rainy` | rainy | 1 |
| `foggy` | foggy | 1 |
| `clear` (from thunderstorm/hurricane) | rainy → clear | 2 |
| `clear` (from rainy/foggy/clear) | clear | 1 |

The `clear` ramp variant is selected using `originWeather` (captured at scheduling time), not the current `game.weather`, which may have already been mutated by ramp steps.

**Example — hurricane in 4 turns** (N=3, turnsUntil starts at 4):

| turnsUntil | Weather change | Ramp trigger |
|---|---|---|
| 4 | none | no step maps to turnsUntil=4 |
| 3 | none | no step maps to turnsUntil=3 |
| 2 | → rainy | step[0]: N-1-0 = 2 |
| 1 | → thunderstorm | step[1]: N-1-1 = 1 |
| 0 | → hurricane | step[2]: N-1-2 = 0 |

**Example — hurricane in 2 turns** (N=3, turnsUntil starts at 2; step[0]=rainy maps to turnsUntil=2):

| turnsUntil | Weather change | Ramp trigger |
|---|---|---|
| 2 | → rainy | step[0]: maps to turnsUntil=2 |
| 1 | → thunderstorm | step[1]: maps to turnsUntil=1 |
| 0 | → hurricane | step[2]: maps to turnsUntil=0 |

---

## Forecast Message Format

Each turn while `pendingWeather` is active, `processWeatherEvents()` emits a forecast message in this shape:

**Random event (organic):**
```
🌦️ WEATHER FORECAST — Thunderstorm in 2 turns
"The barometric pressure is dropping fast. Whitecaps forming across the fleet's position."
⚠️ Incoming: thunderstorm — accuracy -20%, visibility reduced to 10 cells
```

**GM-set (authoritative):**
```
📡 FLEET WEATHER FORECAST — Hurricane in 3 turns
"Fleet meteorology reports a Category 4 system approaching from the northwest."
⚠️ Brace for hurricane conditions — visibility drops to 5 cells, aircraft operations suspended
```

When an intermediate ramp step changes `game.weather`, a brief additional line is prepended:
```
🌧️ Seas are building — weather deteriorating to rainy.
```

Flavor text varies by target weather and current ramp stage. The specific strings are delegated to the implementer, with the requirement of **at least 2 distinct flavor lines per target/stage combination** to avoid identical repeated messages.

---

## Random Event Scheduling

`processWeatherEvents()` has an existing 6% per-turn random roll. Change:

- On a successful roll, do **not** apply weather immediately. Instead set `game.pendingWeather` with `turnsUntil` = random integer between 2 and 4.
- If `game.pendingWeather` is already set, skip the random roll. GMs may still override.

---

## Relationship to `activeWeatherEvent`

The existing `game.activeWeatherEvent` system tracks the **duration** of an ongoing weather event (how many turns until it expires and weather reverts). It is **preserved**:

- When `pendingWeather.turnsUntil` reaches 0 and the final weather is applied, set `game.activeWeatherEvent` as today's code does (with `turnsRemaining = event.duration`).
- For GM-set weather with `turnsDelay > 0`, do not set `activeWeatherEvent` (GM changes have no auto-revert).
- The existing `activeWeatherEvent` countdown/expiry logic in `processWeatherEvents()` runs **after** the `pendingWeather` block.
- If `activeWeatherEvent` expires and tries to change `game.weather` while a `pendingWeather` ramp is in flight, the ramp continues uninterrupted. The expiry change applies normally to `game.weather` but `pendingWeather` will overwrite it on its own schedule.

---

## Execution Order in `processWeatherEvents()`

```
1. Random roll — if no pendingWeather, 6% chance to schedule (2–4 turns out).

2. Process pendingWeather — if game.pendingWeather exists:
   a. Look up the ramp chain for pendingWeather.condition.
   b. Find which step (if any) maps to the current turnsUntil value.
      - If a step maps: update game.weather to that step's intermediate value,
        set game.weatherChangedThisTurn = true, emit intermediate-change line.
   c. Check if turnsUntil === 0:
      - YES: apply pendingWeather.condition as the final game.weather,
             set game.weatherChangedThisTurn = true,
             set game.activeWeatherEvent if this was a random event,
             emit arrival message, set game.pendingWeather = null.
      - NO:  emit forecast message, then decrement turnsUntil.

3. Process activeWeatherEvent expiry (existing logic, unchanged).

4. Set game.weatherChangedThisTurn (existing logic, unchanged).
```

Note: the turnsUntil === 0 check happens **before** decrement. Decrement only occurs when turnsUntil > 0.

---

## GM Interface

### Discord `/weather` command

Add an optional `turns` integer option (min 0, max 10, default 0):

```
/weather condition:hurricane turns:3
```

- `turns:0` — instant apply. Calls `game.weather = condition` then `updateGameDisplay()` immediately. Behavior identical to today.
- `turns:1+` — sets `game.pendingWeather`, announces a forecast. Does **not** call `updateGameDisplay()` (no visual change yet).

The `updateGameDisplay()` call must be preserved on the `turns:0` path when refactoring `setWeather()`.

### Web Dashboard

- Add a numeric "Turns delay" input (default 0) alongside the existing weather buttons.
- When delay > 0, POST to the weather endpoint with `turnsDelay` in the body.
- Show a small status indicator in the **GM weather controls panel** when a pending change is active: `🌀 Hurricane in 2 turns`. This indicator is **GM-only** (visible only within the GM controls section). It disappears when `pendingWeather` becomes null.

### Overriding

A GM command always replaces any active `pendingWeather` (cancels the old forecast, announces the new one).

---

## Battle End

When a battle ends, `game.pendingWeather` does not require explicit cleanup. The game object is removed from `this.games` on battle end and `processWeatherEvents()` is never called during teardown. No stale forecast messages will fire.

---

## Scope Boundary

- No stacking of multiple pending weather changes.
- No player-visible forecast UI on the web map (Discord messages and web event log only; the pending indicator is GM-only).
- No persistence of `pendingWeather` across bot restarts (consistent with existing game state behavior).
