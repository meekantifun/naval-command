# Naval Command — Visual Overhaul Design Spec

**Date:** 2026-03-24
**Scope:** Full visual overhaul of all web frontend pages
**Approach:** Design token system (CSS custom properties) + per-component CSS updates

---

## 1. Design Direction

**Modern Naval Operations** — deep navy base, electric cyan accents, clean Barlow typography.
Logo/brand title uses a cyan-to-aqua gradient (`#4facfe → #00f2fe`) inherited from C's cinematic style.

The login page retains its YouTube video background (WW2 footage). All other pages use a solid dark navy background.

---

## 2. Design Tokens (`variables.css`)

A new file `web-server/client/src/variables.css` will be imported in `index.css` and contain all tokens. Every CSS file references these — no raw hex values in component files.

### Surfaces

```css
--surface-0: #101e2e;                 /* Deepest — sidebar bg, input bg */
--surface-1: #162b3b;                 /* Page background */
--surface-2: rgba(255,255,255,0.06);  /* Card default */
--surface-3: rgba(255,255,255,0.09);  /* Card hover */
--surface-glass: rgba(10,18,32,0.88); /* Header / modal overlays (with backdrop-filter) */
```

### Accent — Cyan Blue

```css
--accent:          #1a6aff;
--accent-light:    #00b4ff;
--accent-gradient: linear-gradient(135deg, #1a6aff, #00b4ff);
--accent-subtle:   rgba(0,180,255,0.12);
--brand-gradient:  linear-gradient(90deg, #4facfe, #00f2fe); /* Title/logo only */
```

### Borders

```css
--border:        rgba(255,255,255,0.08);
--border-accent: rgba(0,180,255,0.25);
```

### Text

```css
--text-primary:   #ffffff;
--text-secondary: rgba(255,255,255,0.60);
--text-muted:     rgba(255,255,255,0.35);
```

### Status Colors

```css
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger:  #ef4444;
--color-special: #a78bfa;  /* GM / special events */
```

### Border Radius

```css
--radius-sm:   4px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-pill: 999px;
```

### Shadows

```css
--shadow-md:   0 4px 20px rgba(0,0,0,0.4);
--shadow-lg:   0 8px 32px rgba(0,0,0,0.5);
--shadow-glow: 0 0 16px rgba(0,180,255,0.15);
```

---

## 3. Typography

**Font family:** [Barlow](https://fonts.google.com/specimen/Barlow) — loaded from Google Fonts.

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap');

body {
  font-family: 'Barlow', sans-serif;
}
```

### Scale

These are reference values applied inline — they are **not** declared as CSS custom properties.

| Name | Size | Weight | Additional | Usage |
|---|---|---|---|---|
| xs label | 11px | 600 | uppercase, letter-spacing: 1.5px | Section labels (FLEET, HP, etc.) |
| sm | 13px | 400 | — | Secondary body, hints, descriptions |
| base | 15px | 500 | — | Primary body, ship names, stat values |
| lg | 18px | 600 | — | Section headings |
| xl | 22px | 700 | — | Page titles |
| brand | 17px | 800 | letter-spacing: 2px, `var(--brand-gradient)` clip | NAVAL COMMAND header logo |

---

## 4. Global Styles (`index.css`)

- Import `variables.css` at the top with `@import './variables.css';`
- Add Barlow `@import` from Google Fonts
- Set `body { background: var(--surface-1); font-family: 'Barlow', sans-serif; }`
- Remove the existing `linear-gradient(135deg, #1e3c72, #2a5298)` gradient from `body`

`variables.css` is imported **once** here and cascades globally. Component CSS files do **not** need their own `@import` of `variables.css` — tokens are available everywhere via the cascade.

---

## 5. Component Designs

### Header (`App.css` — `.app-header`, `.nav-btn`)

- Background: `var(--surface-glass)` with `backdrop-filter: blur(12px)`
- Border-bottom: `1px solid var(--border)`
- Height: `56px`
- Brand title (`.app-header h1`): `font-size: 17px; font-weight: 800; letter-spacing: 2px; background: var(--brand-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent`
- `.nav-btn.active`: replace the current purple gradient with `background: var(--accent-subtle); color: var(--accent-light); border: 1px solid var(--border-accent); border-radius: var(--radius-md)`. The `.nav-btn.active` class is **kept** — only its styles change.
- `.nav-btn` (inactive): `color: var(--text-secondary); background: transparent`, hover lifts to `background: var(--surface-2); color: var(--text-primary)`

### Buttons (`App.css` — `.btn-*`)

All buttons: `font-family: 'Barlow', sans-serif; font-weight: 700; letter-spacing: 0.4px; border-radius: var(--radius-md)`.

| Variant | Background | Color | Border / Shadow |
|---|---|---|---|
| `.btn-primary` | `var(--accent-gradient)` | `#fff` | `box-shadow: 0 2px 12px rgba(26,106,255,0.3)` |
| `.btn-secondary` | `var(--surface-2)` | `var(--text-secondary)` | `1px solid var(--border)` |
| `.btn-ghost` | `transparent` | `var(--accent-light)` | `1px solid var(--border-accent)` — defined for future use; no existing JSX uses this class yet |
| `.btn-danger` | `rgba(239,68,68,0.15)` | `var(--color-danger)` | `1px solid rgba(239,68,68,0.3)` |

**Size modifiers:**
- `.btn-large` (existing class name — keep as-is to avoid JSX changes): `padding: 12px 28px; font-size: 15px`
- `.btn-sm`: `padding: 5px 12px; font-size: 11px`

Note: the existing `.btn-large` class in Login.js is preserved. Do **not** rename it to `.btn-lg`.

### Cards

- Default: `background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-lg)`
- Hover: `background: var(--surface-3); border-color: rgba(255,255,255,0.12); transform: translateY(-2px); box-shadow: var(--shadow-md)`
- Selected: `border-color: var(--accent-light); background: rgba(0,180,255,0.08); box-shadow: 0 0 0 1px rgba(0,180,255,0.2), var(--shadow-glow)`
- Danger/critical: `border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.06)`

### Form Inputs

- Background: `var(--surface-0)`
- Border: `1px solid var(--border)`
- Border-radius: `var(--radius-md)`
- Focus: `border-color: var(--accent-light); box-shadow: 0 0 0 3px rgba(0,180,255,0.12)`
- Error: `border-color: var(--color-danger)` + `box-shadow: 0 0 0 3px rgba(239,68,68,0.12)` on focus

### Progress Bars

6px tall, `border-radius: var(--radius-pill)`, track at `rgba(255,255,255,0.07)`.
Fill color matches value health:
- > 60%: green gradient `#16a34a → #22c55e`
- 30–60%: amber gradient `#d97706 → #f59e0b`
- < 30%: red gradient `#b91c1c → #ef4444`
- Action points / neutral: `var(--accent-gradient)`

### Status Badges / Pills

Pill shape (`border-radius: var(--radius-pill)`), `font-size: 11px`, `font-weight: 700`.
Each uses a 15% opacity tinted background + colored text + 30% opacity border matching the status color.

### Sidebar Navigation (Player Panel)

- Sidebar background: `var(--surface-0)` (darker than page)
- Active item: `background: var(--accent-subtle); color: var(--accent-light); border-left: 2px solid var(--accent-light); padding-left` reduced by 2px to compensate
- Inactive item: `color: var(--text-secondary)`, hover `background: var(--surface-2); color: var(--text-primary)`
- Section group labels: `font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); padding: 10px 16px 4px`

### Scrollbars

Custom scrollbar styling (`::webkit-scrollbar`) is **out of scope**. Existing scrollbar styles in PlayerPanel.css are left as-is.

---

## 6. Page-by-Page Notes

### Login (`Login.css`)
- Keep video background and existing structure unchanged (`.video-background`, `.video-overlay`, `.video-credit`, `.mute-btn` are **not restyled** — they are already visually correct)
- Update `.login-card`: `background: rgba(10,18,34,0.72); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.10); border-radius: 20px`
- Update `.login-title`: use `var(--brand-gradient)` clip, `font-size: 28px`, `font-weight: 800`, `letter-spacing: 3px`
- Update `.feature` items: `background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-md)`
- Login button: `.btn.btn-primary.btn-large` — update button styles only (class name unchanged)

### Server Selector (`ServerSelector.css`)
- Page background inherits `var(--surface-1)` from body
- Guild cards: use standard card design, `text-align: center`
- Active/selected server: selected card state with cyan border + glow
- Status badges (active battle etc.) on cards
- "Invite Bot" card: `border: 2px dashed rgba(255,255,255,0.10)`, `+` icon, muted label
- Search input: standard input design, centered, `max-width: 340px`

### Game View (`GameView.css`)
- Header: breadcrumb trail (Server › Game name) on left, round/turn badge (`var(--accent-subtle)` pill) on right
- Sidebar: `background: rgba(10,18,30,0.5); border-right: 1px solid var(--border); width: 300px` (intentionally reduced from current 350px — the map area expands to fill the freed space)
- Ship cards in sidebar: collapsible with HP bar + status badge, use standard card design
- Action panel: primary button full-width, secondary buttons in 2-col grid, End Turn uses `.btn-secondary` (no JSX change)
- Map area: dark ocean gradient background + subtle CSS grid overlay

### Player Panel (`PlayerPanel.css`)
- Full `var(--surface-0)` sidebar, `var(--surface-1)` main area
- Section group labels above nav item groups
- Character cards: expandable accordion — header uses card hover style, body uses `var(--surface-0)` + `var(--border)` top separator
- Stats grid: `var(--surface-0)` tiles, cyan label, white value
- Shop item cards: standard card design, price in `var(--color-warning)` amber
- All Discord-specific grays (`#2f3136`, `#36393f`, `#40444b`, `#202225`, `#5865f2`, `#4752c4`, `#72767d`, `#b9bbbe`, `#dcddde`, `#8e9297`) replaced with design tokens

### Character Creation Wizard (`CharacterCreationWizard.css`)
- Wizard overlay (`.wizard-overlay` / full-screen scrim): `background: rgba(0,0,0,0.65)`
- Wizard container (modal panel): `background: var(--surface-0); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg)`
- Step indicator: horizontal pill progress bar using `var(--accent-gradient)`
- Form fields: standard input design
- Navigation buttons: `.btn-primary` / `.btn-secondary` pair
- **Replace all raw hex values** (`#23272a`, `#40444b`, `#2f3136`, `#5865F2`, `#2c2f33`, `#b9bbbe`, `#72767d`, `#1a1c1f`, `#202225`, `#faa61a`, and any others) with their design token equivalents

### Game Selector / Starter (`GameSelector.css`, `GameStarter.css`)
- Apply standard card grid layout
- Active game: selected card state

### Admin Panel (`AdminPanel.css`)
- Replace **all** raw hex values (including `#2c2f33`, `#5865F2`, `#4752C4`, `#b9bbbe`, and any others) with design tokens
- Danger actions use `.btn-danger` style

### Map Maker (`MapMaker.css`)
- Toolbar: `var(--surface-0)` background with `var(--border)` separator
- Tool buttons: `var(--surface-2)` default, `var(--accent-subtle)` + `var(--border-accent)` border when active

### Map Manager (`MapManager.css`)
- Standard card grid for map list

### Shop Editor (`ShopEditor.css`)
- Item grid: standard card grid
- Price fields: `var(--color-warning)` amber tint

### Server Dashboard (`ServerDashboard.css`)
- Stat cards: standard card design with xs-label + large value
- Replace **all** raw hex values (including `#3ba55d`, `#2d7d46`, `#4f545c`, `#faa61a`, `#72767d`, and any others) with design tokens

### Character Manager (`CharacterManager.css`)
- Character list: standard card design
- Replace **all** raw hex values (including hardcoded greens `#3ba55d`/`#2d7d46` → `var(--color-success)`, ambers `#faa61a` → `var(--color-warning)`, and any Discord grays) with design tokens

---

## 7. Files to Create / Modify

| File | Change |
|---|---|
| `src/variables.css` | **Create** — all CSS custom properties |
| `src/index.css` | Import variables.css + Barlow, update body styles |
| `src/App.css` | Header, buttons, global utilities |
| `src/components/Login.css` | Login card, title, feature list (video elements unchanged) |
| `src/components/ServerSelector.css` | Guild cards, search, empty state |
| `src/components/GameView.css` | Header, sidebar (300px), ship cards, action panel |
| `src/components/PlayerPanel.css` | Full Discord-gray replacement, sidebar nav, all sub-sections |
| `src/components/CharacterCreationWizard.css` | Overlay, modal container, wizard steps, form fields |
| `src/components/GameSelector.css` | Game cards |
| `src/components/GameStarter.css` | Starter layout |
| `src/components/AdminPanel.css` | Token replacement |
| `src/components/MapMaker.css` | Toolbar, tool buttons |
| `src/components/MapManager.css` | Card grid |
| `src/components/ShopEditor.css` | Item cards, price styling |
| `src/components/ServerDashboard.css` | Stat cards, tables |
| `src/components/CharacterManager.css` | Character list cards |

---

## 8. Implementation Order

1. Create `variables.css` with all tokens
2. Update `index.css` — Barlow font import + body styles
3. Update `App.css` — buttons, header, global utilities
4. `Login.css` — high visibility, sets the tone
5. `ServerSelector.css` — first page after login
6. `GameView.css` — most complex, most used
7. `PlayerPanel.css` — most lines of CSS, needs full Discord-gray purge
8. Remaining pages in any order: CharacterCreationWizard, GameSelector, GameStarter, AdminPanel, MapMaker, MapManager, ShopEditor, ServerDashboard, CharacterManager

---

## 9. Out of Scope

- No JavaScript/logic changes
- No layout restructuring (component HTML stays the same)
- No new features
- Login page video background mechanism (`Login.js` YouTube IFrame API) is unchanged
- `.mute-btn` and `.video-credit` in `Login.css` are unchanged — already visually correct
- Custom scrollbar styles (`::webkit-scrollbar`) — left as-is
- `GameMap.css` — out of scope, has its own canvas rendering system
