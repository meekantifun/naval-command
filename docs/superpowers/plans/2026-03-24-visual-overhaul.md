# Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all raw hex values and generic system font across 16 CSS files with a unified design token system — dark navy base, cyan-blue accent, Barlow typography.

**Architecture:** A new `variables.css` defines all CSS custom properties and is imported once in `index.css`. All component CSS files reference `var(--token-name)` — no raw hex values in component files. No JS, no HTML restructuring.

**Tech Stack:** Plain CSS custom properties (no preprocessor), Google Fonts (Barlow), React CRA frontend at `web-server/client/src/`.

**Spec:** `docs/superpowers/specs/2026-03-24-visual-overhaul-design.md`

---

## Token Reference (used throughout all tasks)

```
--surface-0: #101e2e       --surface-1: #162b3b
--surface-2: rgba(255,255,255,0.06)   --surface-3: rgba(255,255,255,0.09)
--surface-glass: rgba(10,18,32,0.88)

--accent: #1a6aff          --accent-light: #00b4ff
--accent-gradient: linear-gradient(135deg, #1a6aff, #00b4ff)
--accent-subtle: rgba(0,180,255,0.12)
--brand-gradient: linear-gradient(90deg, #4facfe, #00f2fe)

--border: rgba(255,255,255,0.08)      --border-accent: rgba(0,180,255,0.25)
--text-primary: #ffffff               --text-secondary: rgba(255,255,255,0.60)
--text-muted: rgba(255,255,255,0.35)

--color-success: #22c55e   --color-warning: #f59e0b
--color-danger: #ef4444    --color-special: #a78bfa

--radius-sm: 4px   --radius-md: 8px   --radius-lg: 12px   --radius-pill: 999px
--shadow-md: 0 4px 20px rgba(0,0,0,0.4)
--shadow-lg: 0 8px 32px rgba(0,0,0,0.5)
--shadow-glow: 0 0 16px rgba(0,180,255,0.15)
```

---

## Task 1: Create `variables.css`

**Files:**
- Create: `web-server/client/src/variables.css`

- [ ] **Step 1: Create the token file**

Create `web-server/client/src/variables.css` with this exact content:

```css
:root {
  /* ── Surfaces ─────────────────────────────────────────────── */
  --surface-0:     #101e2e;                  /* sidebar bg, input bg */
  --surface-1:     #162b3b;                  /* page background */
  --surface-2:     rgba(255, 255, 255, 0.06); /* card default */
  --surface-3:     rgba(255, 255, 255, 0.09); /* card hover */
  --surface-glass: rgba(10, 18, 32, 0.88);   /* header / modals */

  /* ── Accent ───────────────────────────────────────────────── */
  --accent:          #1a6aff;
  --accent-light:    #00b4ff;
  --accent-gradient: linear-gradient(135deg, #1a6aff, #00b4ff);
  --accent-subtle:   rgba(0, 180, 255, 0.12);
  --brand-gradient:  linear-gradient(90deg, #4facfe, #00f2fe); /* logo only */

  /* ── Borders ──────────────────────────────────────────────── */
  --border:        rgba(255, 255, 255, 0.08);
  --border-accent: rgba(0, 180, 255, 0.25);

  /* ── Text ─────────────────────────────────────────────────── */
  --text-primary:   #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.60);
  --text-muted:     rgba(255, 255, 255, 0.35);

  /* ── Status Colors ────────────────────────────────────────── */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger:  #ef4444;
  --color-special: #a78bfa;  /* GM / special events */

  /* ── Border Radius ────────────────────────────────────────── */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-pill: 999px;

  /* ── Shadows ──────────────────────────────────────────────── */
  --shadow-md:   0 4px 20px rgba(0, 0, 0, 0.4);
  --shadow-lg:   0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 16px rgba(0, 180, 255, 0.15);
}
```

- [ ] **Step 2: Verify all tokens are present**

```bash
grep -c "^  --" "web-server/client/src/variables.css"
```

Expected: `26` (26 tokens total)

- [ ] **Step 3: Commit**

```bash
git add web-server/client/src/variables.css
git commit -m "feat: add CSS design token system (variables.css)"
```

---

## Task 2: Update `index.css` — Global Body Styles

**Files:**
- Modify: `web-server/client/src/index.css`

- [ ] **Step 1: Check current state**

```bash
grep -n "background\|font-family" "web-server/client/src/index.css"
```

Expected: body with `linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)` and system font stack.

- [ ] **Step 2: Replace `index.css` content**

```css
@import './variables.css';
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--surface-1);
  color: var(--text-primary);
  min-height: 100vh;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

#root {
  min-height: 100vh;
}
```

- [ ] **Step 3: Verify no raw hex in index.css**

```bash
grep -E "#[0-9a-fA-F]{3,6}" "web-server/client/src/index.css"
```

Expected: no output (no raw hex values)

- [ ] **Step 4: Commit**

```bash
git add web-server/client/src/index.css
git commit -m "feat: apply Barlow font and dark navy body via design tokens"
```

---

## Task 3: Update `App.css` — Header, Buttons, Global Utilities

**Files:**
- Modify: `web-server/client/src/App.css`

- [ ] **Step 1: Check current button/header values**

```bash
grep -n "667eea\|764ba2\|1e3c72\|gradient" "web-server/client/src/App.css"
```

Expected: lines with purple gradient (`#667eea`, `#764ba2`) and blue gradient on `.btn-primary`.

- [ ] **Step 2: Replace `App.css` content**

```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Header ────────────────────────────────────────────────── */

.app-header {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0 2rem;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 2rem;
}

.app-header h1 {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 2px;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-nav {
  display: flex;
  gap: 4px;
}

.nav-btn {
  padding: 6px 14px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: 'Barlow', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.nav-btn.active {
  background: var(--accent-subtle);
  color: var(--accent-light);
  border-color: var(--border-accent);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* ── Loading ────────────────────────────────────────────────── */

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent-light);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Buttons ────────────────────────────────────────────────── */

.btn {
  padding: 8px 18px;
  border: none;
  border-radius: var(--radius-md);
  font-family: 'Barlow', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-primary {
  background: var(--accent-gradient);
  color: #fff;
  box-shadow: 0 2px 12px rgba(26, 106, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 18px rgba(26, 106, 255, 0.45);
}

.btn-secondary {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-3);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.15);
}

.btn-ghost {
  background: transparent;
  color: var(--accent-light);
  border: 1px solid var(--border-accent);
}

.btn-ghost:hover {
  background: var(--accent-subtle);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.btn-large {
  padding: 12px 28px;
  font-size: 15px;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 11px;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn:disabled:hover {
  transform: none;
  box-shadow: none;
}
```

- [ ] **Step 3: Verify no raw hex values remain**

```bash
grep -En "#[0-9a-fA-F]{3,6}" "web-server/client/src/App.css"
```

Expected: no output (allowed exception: `rgba(26, 106, 255, 0.3)` shadow values which reference accent colors — these are acceptable since CSS custom properties can't be used inside `rgba()` in all browsers without `color-mix`).

- [ ] **Step 4: Visual check**

Start the dev server if not running: `cd web-server/client && npm start`

Navigate to any page in the browser. Check:
- Header is glassmorphism (blurred dark bg) not solid black
- Brand title has cyan gradient
- Active nav button has cyan pill highlight (not purple)
- Primary buttons are cyan-blue gradient

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/App.css
git commit -m "feat: apply design tokens to header, nav, and all button variants"
```

---

## Task 4: Update `Login.css`

**Files:**
- Modify: `web-server/client/src/components/Login.css`

**Important:** `.video-background`, `.video-overlay`, `.video-credit`, `.mute-btn` are **NOT changed** — leave them exactly as-is.

- [ ] **Step 1: Check current login card styles**

```bash
grep -n "login-card\|login-title\|feature\|btn-large" "web-server/client/src/components/Login.css"
```

- [ ] **Step 2: Update only the non-video rules**

Replace the `.login-card`, `.login-title`, `.login-subtitle`, `.login-content`, `.feature-list`, `.feature`, `.feature-icon`, `.btn-large` rules. Keep everything else untouched.

```css
/* ── Keep as-is (do not edit) ───────────────────────────────
   .login-container, .video-background, .video-background iframe,
   .video-overlay, .mute-btn, .mute-btn:hover,
   .video-credit, .video-credit a, .video-credit a:hover
   ─────────────────────────────────────────────────────────── */

.login-card {
  background: rgba(10, 18, 34, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2.5rem 2.75rem;
  max-width: 460px;
  width: 100%;
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(255, 255, 255, 0.10);
  position: relative;
  z-index: 2;
}

.login-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 3px;
  text-align: center;
  margin-bottom: 0.4rem;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtitle {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.login-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.feature:hover {
  background: var(--surface-3);
}

.feature-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.btn-large {
  padding: 13px 28px;
  font-size: 15px;
}
```

- [ ] **Step 3: Verify video elements untouched**

```bash
grep -n "video-background\|video-overlay\|mute-btn\|video-credit" "web-server/client/src/components/Login.css"
```

Expected: all four selectors still present.

- [ ] **Step 4: Visual check**

Navigate to `http://localhost:3000`. Confirm:
- Video background still plays
- Login card is frosted glass (not solid)
- Title has cyan gradient
- Feature items are subtle dark cards (not bright white)
- Login button is cyan-blue gradient

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/components/Login.css
git commit -m "feat: update login card, title, and features to design tokens"
```

---

## Task 5: Update `ServerSelector.css`

**Files:**
- Modify: `web-server/client/src/components/ServerSelector.css`

- [ ] **Step 1: Check existing Discord colors**

```bash
grep -En "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/ServerSelector.css"
```

Expected: lines with `#2f3136`, `#36393f`, `#40444b`, `#5865F2`, `#4752c4`, `#72767d`, `#b9bbbe`.

- [ ] **Step 2: Replace `ServerSelector.css` content**

```css
.server-selector {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.selector-header {
  text-align: center;
  margin-bottom: 36px;
}

.selector-header h2 {
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.selector-header p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.server-search {
  margin-top: 16px;
  width: 100%;
  max-width: 340px;
  padding: 9px 14px;
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.server-search::placeholder {
  color: var(--text-muted);
}

.server-search:focus {
  border-color: var(--accent-light);
  box-shadow: 0 0 0 3px rgba(0, 180, 255, 0.12);
}

.invite-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 18px;
  background: var(--accent-gradient);
  color: #fff;
  font-family: 'Barlow', sans-serif;
  font-size: 13px;
  font-weight: 700;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: opacity 0.15s;
}

.invite-btn:hover {
  opacity: 0.85;
}

.no-results {
  color: var(--text-muted);
  font-size: 14px;
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 0;
}

.guild-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.guild-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.guild-card:hover {
  background: var(--surface-3);
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.guild-card.selected {
  border-color: var(--accent-light);
  background: rgba(0, 180, 255, 0.08);
  box-shadow: 0 0 0 1px rgba(0, 180, 255, 0.2), var(--shadow-glow);
}

.guild-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}

.guild-icon-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: white;
}

.guild-info h3 {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  word-break: break-word;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-state h2 {
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 8px 0;
}

.btn-retry {
  margin-top: 20px;
  padding: 9px 22px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  font-weight: 700;
  transition: opacity 0.15s;
}

.btn-retry:hover {
  opacity: 0.85;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.spinner {
  border: 3px solid var(--border);
  border-top: 3px solid var(--accent-light);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading p {
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .guild-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
```

- [ ] **Step 3: Verify no raw hex remains**

```bash
grep -En "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/ServerSelector.css"
```

Expected: no output.

- [ ] **Step 4: Visual check**

Navigate to the server selector page. Confirm:
- Guild cards use the dark card style (not Discord gray)
- Selected server has cyan border + glow
- Search input has dark background and cyan focus ring

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/components/ServerSelector.css
git commit -m "feat: restyle server selector with design tokens"
```

---

## Task 6: Update `GameView.css`

**Files:**
- Modify: `web-server/client/src/components/GameView.css`

**Key change:** Sidebar width intentionally reduced from 350px to 300px — the map expands to fill the extra space.

- [ ] **Step 1: Check current sidebar width and colors**

```bash
grep -n "width: 350px\|4facfe\|background: rgba(0" "web-server/client/src/components/GameView.css"
```

- [ ] **Step 2: Apply token replacements**

Replace all raw hex values and hard-coded colors. Key rules to update:

```css
/* Game header */
.game-header {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0 1.5rem;
  height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.game-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.game-info {
  color: var(--text-secondary);
  font-size: 12px;
}

.user-name {
  color: var(--text-secondary);
  font-size: 13px;
}

/* Sidebar */
.game-sidebar {
  width: 300px;  /* intentionally reduced from 350px */
  background: rgba(10, 18, 30, 0.5);
  border-right: 1px solid var(--border);
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-section {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}

.sidebar-section h3 {
  margin: 0 0 10px 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(0, 180, 255, 0.55);
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

/* Ship / enemy cards */
.ship-card,
.enemy-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ship-card:hover,
.enemy-card:hover {
  background: var(--surface-3);
  border-color: rgba(255, 255, 255, 0.14);
  transform: translateX(3px);
}

.ship-card.selected {
  border-color: var(--accent-light);
  background: rgba(0, 180, 255, 0.08);
}

.ship-card.sunk,
.enemy-card.sunk {
  opacity: 0.4;
  cursor: not-allowed;
}

.ship-card.sunk:hover,
.enemy-card.sunk:hover {
  transform: none;
  background: var(--surface-2);
}
```

For all remaining selectors in the file, replace:
- `#4facfe` / `#00f2fe` / `rgba(79, 172, 254, ...)` → `var(--accent-light)` or `var(--accent-subtle)`
- `rgba(255, 255, 255, 0.05)` → `var(--surface-2)`
- `rgba(255, 255, 255, 0.1)` → `var(--surface-2)`
- `rgba(255, 255, 255, 0.15)` → `var(--surface-3)`
- `rgba(255, 255, 255, 0.2)` → `var(--border)`
- Hard-coded border radius values → `var(--radius-md)` or `var(--radius-lg)`

- [ ] **Step 3: Verify sidebar width change**

```bash
grep -n "width:" "web-server/client/src/components/GameView.css" | grep -i "sidebar\|300\|350"
```

Expected: `300px` not `350px`.

- [ ] **Step 4: Verify no raw Discord grays remain**

```bash
grep -En "#2f3136|#36393f|#40444b|#5865f2" "web-server/client/src/components/GameView.css"
```

Expected: no output.

- [ ] **Step 5: Visual check**

Open the game view. Confirm:
- Sidebar is slightly narrower, map fills more space
- Ship cards use dark card style with cyan selected state
- Section headers are small uppercase cyan labels

- [ ] **Step 6: Commit**

```bash
git add web-server/client/src/components/GameView.css
git commit -m "feat: apply design tokens to game view — sidebar, ship cards, header"
```

---

## Task 7: Update `PlayerPanel.css` — Full Discord Gray Purge

**Files:**
- Modify: `web-server/client/src/components/PlayerPanel.css`

This is the largest file (~1350 lines). It uses Discord grays extensively: `#2f3136`, `#36393f`, `#40444b`, `#202225`, `#5865f2`, `#4752c4`, `#72767d`, `#b9bbbe`, `#dcddde`, `#8e9297`, `#ed4245`.

- [ ] **Step 1: Count raw hex instances to track progress**

```bash
grep -cE "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/PlayerPanel.css"
```

Note the number — the goal is to get it to 0 (or near 0 for intentional one-off rgba values).

- [ ] **Step 2: Apply the token mapping**

Do a systematic find-and-replace using this mapping:

| Old value | New value | Rationale |
|---|---|---|
| `#2f3136` | `var(--surface-1)` | Main content area bg |
| `#36393f` | `var(--surface-2)` | Card default |
| `#3e4147` | `var(--surface-3)` | Card hover |
| `#40444b` | `var(--border)` in borders, `var(--surface-2)` in backgrounds | Context-dependent |
| `#202225` | `var(--surface-0)` | Sidebar / deepest bg |
| `#2a2d31` | `var(--surface-2)` | Hover bg |
| `#4f545c` | `var(--surface-3)` | Hover state |
| `#5865f2` | `var(--accent)` | Discord blue → accent |
| `#4752c4` | `var(--accent)` | Discord blue hover |
| `#72767d` | `var(--text-muted)` | Muted text |
| `#8e9297` | `var(--text-secondary)` | Secondary text |
| `#b9bbbe` | `var(--text-secondary)` | Secondary text |
| `#dcddde` | `var(--text-primary)` | Primary text |
| `#ed4245` | `var(--color-danger)` | Danger/error red |
| `#f04747` | `var(--color-danger)` | Danger variant |
| `#43b581` | `var(--color-success)` | Success green |
| `#3ba55c` | `var(--color-success)` | Success green |
| `#faa61a` | `var(--color-warning)` | Warning amber |

For the sidebar nav specifically:
```css
.pp-nav {
  width: 200px;
  background: var(--surface-0);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
}

.pp-nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Barlow', sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  width: 100%;
  transition: background 0.12s, color 0.12s;
}

.pp-nav-btn:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.pp-nav-btn.active {
  background: var(--accent-subtle);
  color: var(--accent-light);
  border-left: 2px solid var(--accent-light);
  padding-left: 14px;
  font-weight: 700;
}

.pp-main-header {
  padding: 16px 24px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-1);
}

.pp-main-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}

.pp-fullscreen {
  position: fixed;
  inset: 0;
  display: flex;
  z-index: 1000;
  background: var(--surface-1);
}
```

- [ ] **Step 3: Verify purge is complete**

```bash
grep -En "#2f3136|#36393f|#40444b|#202225|#5865f2|#4752c4|#72767d|#b9bbbe|#dcddde|#8e9297|#ed4245" "web-server/client/src/components/PlayerPanel.css"
```

Expected: no output.

- [ ] **Step 4: Visual check**

Open the player panel. Confirm:
- Sidebar is dark (`--surface-0`), main area is `--surface-1`
- Active nav item has cyan left border and cyan text
- Character cards expand correctly
- Shop items render with amber prices

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/components/PlayerPanel.css
git commit -m "feat: purge all Discord grays from PlayerPanel, apply design tokens"
```

---

## Task 8: Update `CharacterCreationWizard.css`

**Files:**
- Modify: `web-server/client/src/components/CharacterCreationWizard.css`

- [ ] **Step 1: Check raw hex count**

```bash
grep -cE "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/CharacterCreationWizard.css"
```

- [ ] **Step 2: Apply token mapping**

Use the same mapping table from Task 7. Additional rules for wizard-specific elements:

```css
/* Overlay scrim */
.wizard-overlay {
  /* keep position/z-index/display, only change background */
  background: rgba(0, 0, 0, 0.65);
}

/* Modal container */
.wizard-container {
  /* keep position/width/padding, update colors */
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

/* Step indicator — replace hard-coded progress bar colors with accent */
/* Any .step-active or .progress-fill → background: var(--accent-gradient) */
/* Any .step-complete → background: var(--color-success) */
/* Any .step-inactive → background: var(--border) */
```

Replace `#23272a`, `#40444b`, `#2f3136`, `#5865F2`, `#2c2f33`, `#b9bbbe`, `#72767d`, `#1a1c1f`, `#202225`, `#faa61a` with tokens per the mapping table.

- [ ] **Step 3: Verify no raw hex remains**

```bash
grep -En "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/CharacterCreationWizard.css"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add web-server/client/src/components/CharacterCreationWizard.css
git commit -m "feat: apply design tokens to character creation wizard"
```

---

## Task 9: Update Remaining 8 Files

**Files:**
- Modify: `GameSelector.css`, `GameStarter.css`, `AdminPanel.css`, `MapMaker.css`, `MapManager.css`, `ShopEditor.css`, `ServerDashboard.css`, `CharacterManager.css`

Apply the same token mapping from Task 7 to each file. File-specific notes:

**`AdminPanel.css`** — Extra hex values to replace: `#2c2f33`, `#5865F2`, `#4752C4`, `#b9bbbe`. Danger action buttons → `.btn-danger` style (`rgba(239,68,68,0.15)` bg, `var(--color-danger)` color).

**`ServerDashboard.css`** — Extra hex values: `#3ba55d`, `#2d7d46` → `var(--color-success)`. `#faa61a` → `var(--color-warning)`. `#4f545c`, `#72767d` → `var(--text-muted)`.

**`CharacterManager.css`** — `#3ba55d`, `#2d7d46` → `var(--color-success)`. `#faa61a` → `var(--color-warning)`.

**`MapMaker.css`** — Toolbar background → `var(--surface-0)`. Active tool → `var(--accent-subtle)` bg + `var(--border-accent)` border.

**`GameSelector.css`, `GameStarter.css`, `MapManager.css`, `ShopEditor.css`** — Standard token mapping only.

- [ ] **Step 1: Check all 8 files for raw hex counts**

```bash
for f in GameSelector GameStarter AdminPanel MapMaker MapManager ShopEditor ServerDashboard CharacterManager; do
  count=$(grep -cE "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/${f}.css" 2>/dev/null || echo 0)
  echo "${f}.css: ${count} raw hex values"
done
```

- [ ] **Step 2: Update each file**

For each file, do a targeted find-and-replace of all raw hex values using the mapping table from Task 7 plus any file-specific values noted above.

Quick reference for each file — what classes need work:
- **GameSelector.css**: game cards, selected state, loading/empty states
- **GameStarter.css**: game setup form, map preview cards, start button
- **AdminPanel.css**: stat cards, tables, danger buttons
- **MapMaker.css**: toolbar, tool buttons active state, canvas area
- **MapManager.css**: map list cards, delete/edit buttons
- **ShopEditor.css**: item grid, price inputs, category buttons
- **ServerDashboard.css**: stat cards, tables, status indicators
- **CharacterManager.css**: character list cards, stat display, action buttons

- [ ] **Step 3: Verify all 8 files are clean**

```bash
for f in GameSelector GameStarter AdminPanel MapMaker MapManager ShopEditor ServerDashboard CharacterManager; do
  count=$(grep -cE "#[0-9a-fA-F]{3,6}" "web-server/client/src/components/${f}.css" 2>/dev/null || echo 0)
  echo "${f}.css: ${count} remaining raw hex values"
done
```

Expected: all show `0`.

- [ ] **Step 4: Final visual sweep**

Navigate through each page in the browser and confirm consistent dark navy + cyan styling throughout.

- [ ] **Step 5: Commit all at once**

```bash
git add web-server/client/src/components/GameSelector.css \
        web-server/client/src/components/GameStarter.css \
        web-server/client/src/components/AdminPanel.css \
        web-server/client/src/components/MapMaker.css \
        web-server/client/src/components/MapManager.css \
        web-server/client/src/components/ShopEditor.css \
        web-server/client/src/components/ServerDashboard.css \
        web-server/client/src/components/CharacterManager.css
git commit -m "feat: apply design tokens to remaining 8 component CSS files"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Check no CSS file references old blue gradient body background**

```bash
grep -rn "1e3c72\|2a5298\|667eea\|764ba2" web-server/client/src/
```

Expected: no output.

- [ ] **Step 2: Check Barlow font is loading**

In the browser DevTools → Network → filter by "font" — confirm `Barlow` woff2 files are being loaded from Google Fonts.

- [ ] **Step 3: Check `variables.css` is imported**

```bash
grep "variables.css" web-server/client/src/index.css
```

Expected: `@import './variables.css';`

- [ ] **Step 4: Check no component imports variables.css (should be global only)**

```bash
grep -rn "import.*variables" web-server/client/src/components/
```

Expected: no output.

- [ ] **Step 5: Visual tour — navigate every page**

| Page | URL path | Check |
|---|---|---|
| Login | `/` | Video plays, frosted card, cyan gradient title |
| Server Selector | (after login) | Dark cards, cyan on selected |
| Game Selector | (pick server) | Dark card grid |
| Game View | (enter game) | Sidebar 300px, cyan selected ship |
| Player Panel | (profile icon) | Dark sidebar, cyan active nav |
| Character Wizard | (create char) | Dark modal overlay |
| Admin Panel | (GM only) | Consistent dark theme |
| Map Maker | (GM only) | Dark toolbar, cyan active tool |

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete visual overhaul — all pages unified to Naval Command design system"
```
