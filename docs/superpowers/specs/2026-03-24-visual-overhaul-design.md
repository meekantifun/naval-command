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
--surface-0: #101e2e;        /* Deepest — sidebar bg, input bg */
--surface-1: #162b3b;        /* Page background */
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

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-xs` | 11px | 600 + uppercase + tracking | Section labels |
| `--text-sm` | 13px | 400 | Secondary body, hints |
| `--text-base` | 15px | 500 | Primary body, ship names, stats |
| `--text-lg` | 18px | 600 | Section headings |
| `--text-xl` | 22px | 700 | Page titles |
| `--text-brand` | 17px | 800 + tracking 2px | NAVAL COMMAND header logo |

---

## 4. Global Styles (`index.css`)

- Import `variables.css`
- Import Barlow from Google Fonts
- Set `body` background to `var(--surface-1)`
- Set `body` font to Barlow
- Remove the existing `linear-gradient(135deg, #1e3c72, #2a5298)` gradient

---

## 5. Component Designs

### Header (`App.css` — `.app-header`)

- Background: `var(--surface-glass)` with `backdrop-filter: blur(12px)`
- Border-bottom: `1px solid var(--border)`
- Height: `56px`
- Brand title: `font-size: 17px; font-weight: 800; letter-spacing: 2px; background: var(--brand-gradient)`
- Active nav button: `background: var(--accent-subtle); color: var(--accent-light); border: 1px solid var(--border-accent); border-radius: var(--radius-md)`
- Inactive nav button: `color: var(--text-secondary)`, hover lifts to `var(--surface-2)`

### Buttons (`App.css` — `.btn-*`)

All buttons use `font-family: 'Barlow'`, `font-weight: 700`, `letter-spacing: 0.4px`.

| Variant | Background | Color | Border |
|---|---|---|---|
| `.btn-primary` | `var(--accent-gradient)` | `#fff` | none — `box-shadow: 0 2px 12px rgba(26,106,255,0.3)` |
| `.btn-secondary` | `var(--surface-2)` | `var(--text-secondary)` | `1px solid var(--border)` |
| `.btn-ghost` | transparent | `var(--accent-light)` | `1px solid var(--border-accent)` |
| `.btn-danger` | `rgba(239,68,68,0.15)` | `var(--color-danger)` | `1px solid rgba(239,68,68,0.3)` |

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
- Error: `border-color: var(--color-danger)` + matching focus ring

### Progress Bars

6px tall, `border-radius: var(--radius-pill)`, track at `rgba(255,255,255,0.07)`.
Fill color matches value health:
- > 60%: green gradient `#16a34a → #22c55e`
- 30–60%: amber gradient `#d97706 → #f59e0b`
- < 30%: red gradient `#b91c1c → #ef4444`
- Action points / neutral: `var(--accent-gradient)`

### Status Badges / Pills

Pill shape (`border-radius: var(--radius-pill)`), `font-size: 11px`, `font-weight: 700`.
Each uses a 15% opacity tinted background + colored text + 30% opacity border.

### Sidebar Navigation (Player Panel)

- Sidebar background: `var(--surface-0)` (darker than page)
- Active item: `background: var(--accent-subtle); color: var(--accent-light); border-left: 2px solid var(--accent-light)`
- Inactive item: `color: var(--text-secondary)`, hover `var(--surface-2)`
- Section labels: `font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted)`

---

## 6. Page-by-Page Notes

### Login (`Login.css`)
- Keep video background and existing structure
- Update login card: `background: rgba(10,18,34,0.72); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.10); border-radius: 20px`
- Title: `var(--brand-gradient)`, `font-size: 28px`, `font-weight: 800`, `letter-spacing: 3px`
- Feature list items: subtle `var(--surface-2)` cards with `var(--border)` border
- Login button: `.btn-primary .btn-lg` with Discord icon

### Server Selector (`ServerSelector.css`)
- Page background inherits `var(--surface-1)` from body
- Guild cards: use standard card design, `text-align: center`
- Active/selected server: selected card state with cyan border + glow
- Status badges (active battle etc.) on cards
- "Invite Bot" card: dashed border `rgba(255,255,255,0.10)`, `+` icon, muted label
- Search input: standard input design, centered, max-width 340px

### Game View (`GameView.css`)
- Header: breadcrumb trail (Server › Game name), round badge in `--accent` pill on right
- Sidebar: `background: rgba(10,18,30,0.5)`, `border-right: 1px solid var(--border)`, width 300px
- Ship cards in sidebar: collapsible with HP bar + status badge
- Action panel at sidebar bottom: primary button full-width, secondary buttons in 2-col grid, ghost End Turn
- Map area: dark ocean gradient background + subtle grid overlay

### Player Panel (`PlayerPanel.css`)
- Full `var(--surface-0)` sidebar, `var(--surface-1)` main area
- Section group labels above nav items
- Character cards: expandable with stats grid (4-col) + skill tags + weapon rows
- Shop: item cards use standard card design, price in `--color-warning` amber
- All Discord-specific grays (`#2f3136`, `#36393f`, `#40444b`, `#5865f2`) replaced with design tokens

### Game Selector / Starter (`GameSelector.css`, `GameStarter.css`)
- Apply standard card grid layout
- Active game: selected card state

### Character Creation Wizard (`CharacterCreationWizard.css`)
- Step indicator: horizontal pill progress bar in `--accent-gradient`
- Form fields: standard input design
- Navigation buttons: primary/secondary pair

### Admin Panel (`AdminPanel.css`)
- Full token replacement — Discord grays → design tokens
- Danger actions use `.btn-danger` style

### Map Maker (`MapMaker.css`)
- Toolbar: `var(--surface-0)` background with `var(--border)` separator
- Tool buttons: `var(--surface-2)` default, `var(--accent-subtle)` active

### Shop Editor (`ShopEditor.css`)
- Item grid: standard card grid
- Price fields: amber `var(--color-warning)` tint

### Server Dashboard (`ServerDashboard.css`)
- Stat cards: standard card design with label + large value
- Replace all Discord grays with tokens

---

## 7. Files to Create / Modify

| File | Change |
|---|---|
| `src/variables.css` | **Create** — all CSS custom properties |
| `src/index.css` | Import variables.css + Barlow, update body styles |
| `src/App.css` | Header, buttons, global utilities |
| `src/components/Login.css` | Login card, title, feature list |
| `src/components/ServerSelector.css` | Guild cards, search, empty state |
| `src/components/GameView.css` | Header, sidebar, ship cards, action panel |
| `src/components/PlayerPanel.css` | Full Discord-gray replacement, sidebar nav, all sub-sections |
| `src/components/CharacterCreationWizard.css` | Wizard steps, form fields |
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
- Login page video background mechanism is unchanged
- GameMap.css (the canvas map) is out of scope — it has its own rendering system
