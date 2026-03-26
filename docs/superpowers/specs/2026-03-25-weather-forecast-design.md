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
  condition: 'thunderstorm',   // target weather value
  turnsUntil: 3,               // countdown; 0 = apply this turn
  eventName: 'Sudden Storm',   // display name (null for GM-set)
  isGMSet: false               // true when a GM initiated it
}
```

- `null` when no change is pending.
- Only one pending change at a time. A newer GM command overwrites any existing pending change (random or GM). A new random roll does NOT overwrite an existing pending change.

---

## Weather Progression Chains

Each target weather type has a fixed ramp-up sequence. Intermediate states are anchored to the end of the countdown, not the beginning — so the chain always "lands" correctly regardless of how far out the event is scheduled.

| Target | Progression |
|---|---|
| `hurricane` | rainy → thunderstorm → hurricane |
| `thunderstorm` | rainy → thunderstorm |
| `rainy` | rainy |
| `foggy` | foggy |
| `clear` | rainy → clear *(if prior weather was thunderstorm or hurricane)*, otherwise just clear |

**Mapping rule:** For a chain of length N, each intermediate step fires at `turnsUntil = N - 1 - stepIndex`. Steps earlier than the chain length are forecast-only (no weather change yet).

**Example — hurricane in 4 turns** (chain length 3):

| turnsUntil | Weather change | Message |
|---|---|---|
| 4 | none | forecast only |
| 3 | → rainy | "Seas are building…" + forecast |
| 2 | → thunderstorm | "Storm intensifying…" + forecast |
| 1 | none | "Hurricane imminent…" + forecast |
| 0 | → hurricane | "Hurricane has arrived!" |

**Example — hurricane in 2 turns** (chain truncated, skip earliest step):

| turnsUntil | Weather change | Message |
|---|---|---|
| 2 | → thunderstorm | "Storm intensifying…" + forecast |
| 1 | none | "Hurricane imminent…" + forecast |
| 0 | → hurricane | "Hurricane has arrived!" |

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

When an intermediate weather state is applied (e.g. clear → rainy during a hurricane ramp), an additional brief line is prepended:
```
🌧️ Seas are building — weather deteriorating to rainy.
```

Flavor text varies by target weather and current ramp stage so repeated messages don't feel identical.

---

## Random Event Scheduling

`processWeatherEvents()` already has a 6% per-turn random roll. Change:

- On a successful roll, **do not apply weather immediately**. Instead, set `game.pendingWeather` with `turnsUntil` = random integer between 2 and 4.
- If `game.pendingWeather` is already set (from a prior random roll), skip the new roll. GMs may still override.

---

## GM Interface

### Discord `/weather` command

Add an optional `turns` integer option (min 0, max 10, default 0):

```
/weather condition:hurricane turns:3
```

- `turns:0` — instant apply, identical to current behavior (no forecast).
- `turns:1+` — sets `game.pendingWeather`, announces forecast.

### Web Dashboard

- Add a numeric "Turns delay" input (default 0) alongside the existing weather buttons.
- When delay > 0, POST to the weather endpoint with `turnsDelay` in the body.
- Show a small status indicator when a pending change is active: `🌀 Hurricane in 2 turns`.

### Overriding

A GM command always replaces any active `pendingWeather` (cancels the old forecast, announces the new one).

---

## Implementation Integration

All logic lives inside `processWeatherEvents()` in `bot.js`. Execution order each turn:

1. **Random roll** — if no pending weather, 6% chance to schedule one (2–4 turns out).
2. **Process pending** — if `game.pendingWeather` exists:
   a. Determine intermediate weather step for this `turnsUntil` value; apply if mapped.
   b. Emit forecast message (flavor + mechanical warning).
   c. Decrement `turnsUntil`.
   d. If `turnsUntil` was 0: apply final weather, clear `game.pendingWeather`, emit arrival message.
3. Set `game.weatherChangedThisTurn` if weather changed (existing logic, unchanged).

`setWeather()` in `bot.js` and the web API endpoint (`POST /api/game/:channelId/weather`) both gain a `turnsDelay` parameter. When `turnsDelay === 0`, behavior is unchanged. When `turnsDelay > 0`, they populate `game.pendingWeather` instead of `game.weather`.

No changes to `battleManager.js` or the main turn loop.

---

## Scope Boundary

- No stacking of multiple pending weather changes.
- No player-visible forecast UI on the web map (Discord messages and web event log only).
- No persistence of `pendingWeather` across bot restarts (consistent with existing game state behavior).
