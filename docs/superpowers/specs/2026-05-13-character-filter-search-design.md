# Character List Filter & Search Design

## Problem

The Characters tab loads all characters in a flat list with no way to narrow it down. As the roster grows, finding a specific character or class requires scrolling through every card.

## Goal

Add a search bar and class filter dropdown above the character list in `CharacterManager.js`. All filtering is client-side — no API changes needed.

## State

Two new React state variables in `CharacterManager`:

```js
const [searchQuery, setSearchQuery] = useState('');
const [classFilter, setClassFilter] = useState('');
```

## Filtered List

Computed from `characters` before the render loop:

```js
const q = searchQuery.toLowerCase().trim();
const filteredChars = characters
  .filter(c => classFilter === '' || c.shipClass === classFilter)
  .filter(c => q === '' ||
    c.name.toLowerCase().includes(q) ||
    (c.userId && c.userId.includes(q))
  );
```

Search is case-insensitive on character name and exact-substring on Discord user ID (numeric, so no case concern).

## Dynamic Class List

Derived from loaded data — only classes that exist in the current character list appear:

```js
const availableClasses = [...new Set(characters.map(c => c.shipClass).filter(Boolean))].sort();
```

## Toolbar UI

A `.char-filter-bar` row placed between the "All Characters" heading and the character card list:

- **Search input**: `type="text"`, placeholder `"Search by name or Discord ID…"`, bound to `searchQuery`
- **Class dropdown**: `<select>` with first option `"All Classes"` (value `''`), followed by one `<option>` per entry in `availableClasses`

Both controls reset to their defaults (`''`) independently — they are not linked.

## Count Line

Updated from:
```
All Characters ({characters.length})
```
to:
```
All Characters ({filteredChars.length} of {characters.length})
```

When no filter is active (`filteredChars.length === characters.length`), display `All Characters ({characters.length})` (no "of N" suffix) to keep it clean.

## Card Key Fix

Currently `expandedCards` is a `Set<number>` of array indices. When the list is filtered, indices shift and expanded cards collapse unexpectedly.

Fix: change the key from `idx` (array index) to `${char.userId}:${char.name}` (stable identity). Update all three call sites:
- `toggleCard(idx)` → `toggleCard(\`${char.userId}:${char.name}\`)`
- `expandedCards.has(idx)` → `expandedCards.has(\`${char.userId}:${char.name}\`)`
- `character-card` key prop: `key={idx}` → `key={\`${char.userId}:${char.name}\`}`

## Styling

Add `.char-filter-bar` styles to `CharacterManager.css`:
- Flex row, gap between items, bottom margin before the card list
- Search input: grows to fill available space (`flex: 1`)
- Class dropdown: fixed width (~160px), consistent with existing `.pp-select` style

## Out of Scope

- No server-side filtering or API changes
- No "clear filters" button (clearing each control independently is sufficient)
- No debouncing (list is small, instant filter is fine)
