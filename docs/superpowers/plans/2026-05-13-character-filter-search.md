# Character List Filter & Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search bar (by name or Discord ID) and a class filter dropdown to the Characters tab in the web admin UI.

**Architecture:** Pure client-side React state in `CharacterManager.js` — no API changes. Three changes: stabilise the expanded-card key so filtering doesn't collapse open cards, add filter state and computed lists, then add the toolbar UI and CSS.

**Tech Stack:** React (useState), existing CSS design tokens (`--surface-2`, `--accent`, `--text-primary`)

---

## Files

- Modify: `web-server/client/src/components/CharacterManager.js`
- Modify: `web-server/client/src/components/CharacterManager.css`

---

## Task 1: Fix `expandedCards` to use a stable string key

**Files:**
- Modify: `web-server/client/src/components/CharacterManager.js` (lines ~273–278, ~469–473)

Currently `expandedCards` is a `Set<number>` of array indices. When the list is filtered the indices shift and any open card collapses. Fix: key on `"${char.userId}:${char.name}"` which is stable regardless of list order or filtering.

- [ ] **Step 1: Find `toggleCard` (around line 273) and note it already accepts any key type — no change needed there. Find the render loop (around line 469) and replace the index-based variables.**

Current code in the render loop (lines ~469–473):
```jsx
{characters.map((char, idx) => {
  const isExpanded = expandedCards.has(idx);
  return (
  <div key={idx} className={`character-card${isExpanded ? ' expanded' : ' collapsed'}`}>
    <div className="character-header" onClick={() => toggleCard(idx)} style={{cursor:'pointer'}}>
```

- [ ] **Step 2: Replace those lines with the stable-key version**

```jsx
{characters.map((char) => {
  const cardKey = `${char.userId}:${char.name}`;
  const isExpanded = expandedCards.has(cardKey);
  return (
  <div key={cardKey} className={`character-card${isExpanded ? ' expanded' : ' collapsed'}`}>
    <div className="character-header" onClick={() => toggleCard(cardKey)} style={{cursor:'pointer'}}>
```

- [ ] **Step 3: Verify visually** — reload the Characters tab, expand a card, confirm it stays open and the toggle still works.

- [ ] **Step 4: Commit**

```bash
git add web-server/client/src/components/CharacterManager.js
git commit -m "fix: use stable userId:name key for expandedCards instead of array index"
```

---

## Task 2: Add filter state, filtered list computation, and update render loop

**Files:**
- Modify: `web-server/client/src/components/CharacterManager.js` (lines ~262–272, ~428–470)

- [ ] **Step 1: Add two new state variables after the existing state declarations (around line 271)**

Find this block:
```js
const [deleteItemModal, setDeleteItemModal] = useState(null); // { char, itemId, itemName, qty, price }
```

Add immediately after it:
```js
const [searchQuery, setSearchQuery] = useState('');
const [classFilter, setClassFilter] = useState('');
```

- [ ] **Step 2: Add filtered list computation before the `return` statement**

Find this line (around line 431):
```js
if (loading) {
  return <div className="loading">Loading characters...</div>;
}

return (
```

Insert the computation block between the loading guard and the `return (`:
```js
if (loading) {
  return <div className="loading">Loading characters...</div>;
}

const q = searchQuery.toLowerCase().trim();
const availableClasses = [...new Set(characters.map(c => c.shipClass).filter(Boolean))].sort();
const filteredChars = characters
  .filter(c => classFilter === '' || c.shipClass === classFilter)
  .filter(c => q === '' || c.name.toLowerCase().includes(q) || (c.userId && c.userId.includes(q)));

return (
```

- [ ] **Step 3: Update the "All Characters" heading and render loop to use `filteredChars`**

Find this block (around line 463):
```jsx
<div className="manager-section">
  <h3>All Characters ({characters.length})</h3>
  {characters.length === 0 ? (
    <p className="no-data">No characters found. Create one above!</p>
  ) : (
    <div className="character-list">
      {characters.map((char) => {
```

Replace with:
```jsx
<div className="manager-section">
  <h3>All Characters ({filteredChars.length !== characters.length ? `${filteredChars.length} of ${characters.length}` : characters.length})</h3>
  {filteredChars.length === 0 ? (
    <p className="no-data">{characters.length === 0 ? 'No characters found. Create one above!' : 'No characters match your search.'}</p>
  ) : (
    <div className="character-list">
      {filteredChars.map((char) => {
```

- [ ] **Step 4: Verify** — reload the tab, confirm the character count still displays correctly and all cards still render. Since `searchQuery` and `classFilter` both default to `''`, `filteredChars` equals `characters` at this point.

- [ ] **Step 5: Commit**

```bash
git add web-server/client/src/components/CharacterManager.js
git commit -m "feat: add filter state and filtered list computation to CharacterManager"
```

---

## Task 3: Add toolbar JSX and CSS

**Files:**
- Modify: `web-server/client/src/components/CharacterManager.js` (inside the "All Characters" section)
- Modify: `web-server/client/src/components/CharacterManager.css`

- [ ] **Step 1: Insert the toolbar between the heading and the filtered list**

Find this block (updated in Task 2):
```jsx
  <h3>All Characters ({filteredChars.length !== characters.length ? `${filteredChars.length} of ${characters.length}` : characters.length})</h3>
  {filteredChars.length === 0 ? (
```

Insert the toolbar between the `<h3>` and the conditional:
```jsx
  <h3>All Characters ({filteredChars.length !== characters.length ? `${filteredChars.length} of ${characters.length}` : characters.length})</h3>
  {characters.length > 0 && (
    <div className="char-filter-bar">
      <input
        type="text"
        className="char-search-input"
        placeholder="Search by name or Discord ID…"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      <select
        className="char-class-select"
        value={classFilter}
        onChange={e => setClassFilter(e.target.value)}
      >
        <option value="">All Classes</option>
        {availableClasses.map(cls => (
          <option key={cls} value={cls}>{cls}</option>
        ))}
      </select>
    </div>
  )}
  {filteredChars.length === 0 ? (
```

- [ ] **Step 2: Add CSS for the toolbar**

Open `web-server/client/src/components/CharacterManager.css` and append at the end:

```css
/* ── Character filter toolbar ── */
.char-filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.char-search-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px solid var(--surface-0);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
}

.char-search-input::placeholder {
  color: var(--text-muted);
}

.char-search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.char-class-select {
  width: 160px;
  padding: 10px;
  background: var(--surface-2);
  border: 1px solid var(--surface-0);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.char-class-select:focus {
  outline: none;
  border-color: var(--accent);
}
```

- [ ] **Step 3: Manual verification**

1. Reload the Characters tab — confirm the search input and class dropdown appear below the "All Characters" heading.
2. Type a character name fragment into the search box — confirm only matching cards remain.
3. Type a Discord user ID (or partial ID) — confirm matching cards remain.
4. Select a class from the dropdown — confirm only characters of that class are shown and the count updates (e.g. "3 of 12").
5. Expand a card, then type in the search box — confirm the card stays expanded.
6. Clear the search and reset the dropdown — confirm all characters return and count shows without the "of N" suffix.

- [ ] **Step 4: Commit**

```bash
git add web-server/client/src/components/CharacterManager.js web-server/client/src/components/CharacterManager.css
git commit -m "feat: add search bar and class filter to Characters tab"
```
