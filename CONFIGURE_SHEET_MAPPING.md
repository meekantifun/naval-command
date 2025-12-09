# Configure Google Sheets Cell Mapping

## Overview

The bot now supports **custom cell references** so you can use your existing template without restructuring it!

---

## How It Works

The bot reads from a configuration file that tells it exactly where to find each piece of data in your Google Sheets template.

### Configuration File Location:

**Per-Server:**
```
servers/{YourServerName}/sheet-mapping.json
```

**Default Template:**
```
config/sheet-mapping-template.json
```

---

## Setup Steps

### 1. Copy the Template

Copy the default template to your server folder:

```bash
cp config/sheet-mapping-template.json "servers/YourServerName/sheet-mapping.json"
```

Or manually create the file in your server's folder.

### 2. Edit Cell References

Open `servers/YourServerName/sheet-mapping.json` and update the cell references to match your template.

### Example Configuration:

```json
{
  "basic": {
    "sheetName": "Character Info",
    "username": "C6",       // ← Your character name is in C6
    "shipClass": "C7",      // ← Ship class in C7
    "tonnage": "C8",        // ← Tonnage in C8
    "speedKnots": "C9",
    "hangar": "C10",
    "belt": "C11",          // ← Belt armor in C11
    "deck": "C12",
    "turret": "C13",
    "level": "C14",
    "experience": "C15",
    "currency": "C16",
    "battles": "C17",
    "victories": "C18"
  },

  "weapons": {
    "sheetName": "Weapons",
    "startRow": 2,          // ← Data starts at row 2
    "endRow": 100,          // ← Read up to row 100
    "columns": {
      "name": "A",          // ← Weapon name in column A
      "type": "B",          // ← Type (main/secondary/torpedo) in B
      "caliber": "C",
      "damage": "D",
      "range": "E",
      "accuracy": "F",
      "turrets": "G",
      "barrels": "H"
    }
  },

  "aa": {
    "sheetName": "AA Systems",
    "startRow": 2,
    "endRow": 100,
    "columns": {
      "name": "A",
      "caliber": "B",
      "mountType": "C",
      "damage": "D",
      "range": "E",
      "accuracy": "F",
      "mounts": "G",
      "barrels": "H"
    }
  },

  "aircraft": {
    "sheetName": "Aircraft",
    "startRow": 2,
    "endRow": 100,
    "columns": {
      "type": "A",
      "name": "B",
      "damage": "C",
      "range": "D",
      "accuracy": "E",
      "health": "F",
      "speed": "G",
      "count": "H"
    }
  }
}
```

---

## Your Current Template

Based on your example where **name is in C6**, here's what you need to do:

### 1. Identify Your Cell Locations

Look at your Google Sheet and note where each field is located:

| Field | Your Cell |
|-------|-----------|
| Character Name | C6 |
| Ship Class | C7 (?) |
| Tonnage | C8 (?) |
| Speed | C9 (?) |
| etc... | ... |

### 2. Update the Config File

Edit `sheet-mapping.json` with your actual cell references:

```json
{
  "basic": {
    "sheetName": "Character Info",
    "username": "C6",           // ✅ You specified this
    "shipClass": "C7",          // Update to your location
    "tonnage": "C8",            // Update to your location
    // ... etc
  }
}
```

### 3. Test It

After updating the config:

1. Restart the bot
2. Run `/register @user [sheet_url]`
3. The bot will read from YOUR cell locations!

---

## Configuration Options

### Basic Info Section

All values are **individual cell references** (e.g., "C6", "D10", "F5"):

- `sheetName` - Name of the sheet tab (e.g., "Character Info")
- `username` - Character name cell
- `shipClass` - Ship class cell (Battleship, Destroyer, etc.)
- `tonnage` - Ship tonnage in tons
- `speedKnots` - Speed in knots
- `hangar` - Hangar capacity (0 for non-carriers)
- `belt` - Belt armor thickness (mm)
- `deck` - Deck armor thickness (mm)
- `turret` - Turret armor thickness (mm)
- `level` - Starting level
- `experience` - Experience points
- `currency` - Currency amount
- `battles` - Battles fought
- `victories` - Victories

### Weapons/AA/Aircraft Sections

These are **table ranges** with columns:

- `sheetName` - Sheet tab name
- `startRow` - First row of data (usually 2, after header)
- `endRow` - Last row to read (default: 100)
- `columns` - Column letters for each field

---

## Multiple Sheet Tabs?

If your weapons are on different sheets, just update the `sheetName`:

```json
"weapons": {
  "sheetName": "Armament",    // ← Different sheet name
  "startRow": 5,              // ← Data starts at row 5
  "endRow": 50,
  "columns": {
    "name": "B",              // ← Name is in column B
    "type": "C",
    // ...
  }
}
```

---

## Different Column Layout?

If your weapons table has columns in a different order:

```json
"weapons": {
  "sheetName": "Weapons",
  "startRow": 2,
  "endRow": 100,
  "columns": {
    "name": "A",
    "type": "E",      // ← Type moved to column E
    "caliber": "B",   // ← Caliber in column B
    "damage": "C",
    "range": "D",
    "accuracy": "F",
    "turrets": "G",
    "barrels": "H"
  }
}
```

The bot will automatically map the data correctly!

---

## Troubleshooting

### "Failed to read character sheet"

1. Check that cell references are correct (e.g., "C6", not "c6" or "C 6")
2. Verify sheet names match exactly (case-sensitive)
3. Make sure cells contain the expected data types

### "Character has missing data"

- Empty cells will use default values (0, 'Unknown', etc.)
- Check that your formulas are calculating correctly
- Ensure data is in the right format (numbers vs text)

### Bot uses wrong cells

1. Check that `sheet-mapping.json` is in the correct server folder
2. Restart the bot after changing the config
3. Look for console message: `📋 Using custom sheet mapping for guild {id}`

---

## Per-Server Configuration

Each server can have its own cell mapping:

```
servers/
├── Server A/
│   ├── sheet-mapping.json    ← Custom for Server A
│   └── playerData.json
├── Server B/
│   ├── sheet-mapping.json    ← Different layout for Server B
│   └── playerData.json
└── Server C/
    └── playerData.json       ← Uses default template
```

---

## Quick Reference

**Default template location:**
```
config/sheet-mapping-template.json
```

**Server-specific config:**
```
servers/{ServerName}/sheet-mapping.json
```

**After editing config:**
```bash
# Restart bot to apply changes
npm start
```

**Test registration:**
```
/register @user https://docs.google.com/spreadsheets/d/.../edit
```

---

## Example: Your Template

Since you mentioned name is in **C6**, here's a starter config:

```json
{
  "basic": {
    "sheetName": "Character Info",
    "username": "C6",
    "shipClass": "C7",
    "tonnage": "C8",
    "speedKnots": "C9",
    "hangar": "C10",
    "belt": "C11",
    "deck": "C12",
    "turret": "C13",
    "level": "C14",
    "experience": "C15",
    "currency": "C16",
    "battles": "C17",
    "victories": "C18"
  },
  "weapons": {
    "sheetName": "Weapons",
    "startRow": 2,
    "endRow": 100,
    "columns": {
      "name": "A", "type": "B", "caliber": "C", "damage": "D",
      "range": "E", "accuracy": "F", "turrets": "G", "barrels": "H"
    }
  },
  "aa": {
    "sheetName": "AA Systems",
    "startRow": 2,
    "endRow": 100,
    "columns": {
      "name": "A", "caliber": "B", "mountType": "C", "damage": "D",
      "range": "E", "accuracy": "F", "mounts": "G", "barrels": "H"
    }
  },
  "aircraft": {
    "sheetName": "Aircraft",
    "startRow": 2,
    "endRow": 100,
    "columns": {
      "type": "A", "name": "B", "damage": "C", "range": "D",
      "accuracy": "E", "health": "F", "speed": "G", "count": "H"
    }
  }
}
```

Copy this to `servers/YourServerName/sheet-mapping.json` and adjust as needed!

---

## Need Help?

Run `/template` in Discord to see the configuration guide, or check the console logs when running `/register` to see which cells the bot is trying to read.
