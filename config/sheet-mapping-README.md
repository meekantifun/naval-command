# Sheet Mapping Configuration

## Quick Start

The bot can now read from **your existing Google Sheets template** using custom cell mappings!

### Your Template Configuration

Since your character name is in cell **C6**, here's how to set it up:

## Step 1: Create Your Mapping File

Create this file in your server folder:
```
servers/{YourServerName}/sheet-mapping.json
```

## Step 2: Copy & Customize

Copy the contents of `config/sheet-mapping-template.json` and update the cell references to match YOUR template:

```json
{
  "basic": {
    "sheetName": "Character Info",
    "username": "C6",       // ← YOUR character name location
    "shipClass": "C7",      // ← Update these to match your sheet
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
  }
}
```

## Step 3: Set Weapons/AA/Aircraft Tables

For table data (weapons, AA, aircraft), specify:
- Sheet name
- Starting row
- Column letters for each field

```json
{
  "weapons": {
    "sheetName": "Weapons",
    "startRow": 2,
    "endRow": 100,
    "columns": {
      "name": "A",
      "type": "B",
      "caliber": "C",
      // ... etc
    }
  }
}
```

## Step 4: Test

1. Save your `sheet-mapping.json`
2. Restart the bot
3. Run `/register @user [sheet_url]`
4. Check console for: `📋 Using custom sheet mapping for guild {id}`

## Full Documentation

See `CONFIGURE_SHEET_MAPPING.md` for complete details and examples.

## Default Mapping

The default template (already configured for C6) is at:
```
config/sheet-mapping-template.json
```

If no server-specific mapping exists, the bot uses this default!
