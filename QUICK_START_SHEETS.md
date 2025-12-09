# Quick Start: Google Sheets Character Registration

## ✨ New Feature: Automatic Caliber Extraction!

The bot now automatically extracts calibers from weapon names!

**Example:** `20cm/50 3rd Year Type No.2` → Bot extracts `200mm` caliber

---

## Your Template Setup

Since your character name is in **C6**, the default configuration is already set up for you!

### Step 1: Create Your Character Sheet

Just fill in your Google Sheet with:

**Character Info (Column C):**
- C6: Character name (e.g., "Atago")
- C7: Ship class (e.g., "Heavy Cruiser")
- C8: Tonnage (e.g., "13160")
- C9: Speed in knots (e.g., "35")
- C10: Hangar capacity (0 for non-carriers)
- C11-C13: Armor (belt, deck, turret in mm)
- C14-C18: Level, experience, currency, battles, victories

**Weapons Sheet:**
Just put the weapon name with caliber in it!

| Name | Type | Damage | Range | Accuracy | Turrets | Barrels |
|------|------|---------|-------|----------|---------|---------|
| 20cm/50 3rd Year Type No.2 | main | 150 | 25 | 85 | 5 | 2 |
| 127mm/50 Type 89 | secondary | 50 | 14 | 90 | 8 | 2 |
| 610mm Type 90 | torpedo | 200 | 8 | 75 | 4 | 4 |

The bot will automatically:
- Extract `20cm` and convert to `200mm`
- Extract `127mm` (already in mm)
- Extract `610mm` (already in mm)

### Step 2: Share Your Sheet

Share with the bot's service account email or make it "Anyone with link can view"

### Step 3: Get GM to Register

Give your sheet URL to a GM who runs:
```
/register @you https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

---

## Supported Caliber Formats

✅ **Centimeters:** `20cm`, `15.5cm`, `12.7cm` → Auto-converts to mm
✅ **Inches:** `16"`, `5"/38`, `14 inch` → Auto-converts to mm
✅ **Millimeters:** `127mm`, `40mm`, `25 mm` → Used as-is

---

## Example Weapons

### Japanese Guns
```
20cm/50 3rd Year Type No.2     → 200mm (auto)
15.5cm/60 3rd Year Type        → 155mm (auto)
12.7cm/50 Type 89              → 127mm (auto)
610mm Type 90 Torpedo          → 610mm (auto)
```

### US Guns
```
16 inch/50 Mark 7              → 406.4mm (auto)
5"/38 caliber Mark 12          → 127mm (auto)
21 inch Mark 15 Torpedo        → 533.4mm (auto)
```

### AA Systems
```
40 mm Bofors                   → 40mm (auto)
25mm Type 96                   → 25mm (auto)
20 mm Oerlikon                 → 20mm (auto)
```

---

## Commands

### For GMs:

```
/register @player [sheet_url]          # Register a character
/setmastersheet [master_log_url]       # Set up master log (once per server)
/template                               # Show template guide
```

### For Players:

1. Fill out character sheet
2. Share sheet with bot's service account
3. Give URL to GM
4. Done! ✅

---

## Files & Documentation

- **`CALIBER_AUTO_EXTRACTION.md`** - Complete caliber extraction guide
- **`CONFIGURE_SHEET_MAPPING.md`** - Cell mapping configuration
- **`SETUP_GOOGLE_SHEETS.md`** - Full Google API setup
- **`config/sheet-mapping-template.json`** - Default cell configuration

---

## What's Configured Already

✅ Character name in **C6**
✅ Other basic stats in **C7-C18**
✅ Weapons table with auto-caliber extraction
✅ AA systems with auto-caliber extraction
✅ Aircraft for carriers
✅ Per-server isolation
✅ Master sheet logging

---

## Console Logs

When registering, you'll see:
```
📋 Using custom sheet mapping for guild {id}
🔧 Extracted caliber from "20cm/50 3rd Year Type No.2": 200mm
🔧 Extracted caliber from "127mm/50 Type 89": 127mm
📊 Fetching character data from 16 ranges
✅ Character Atago registered successfully
```

---

## Benefits

✅ **No separate caliber column needed**
✅ **Use authentic weapon names** (20cm/50 3rd Year Type No.2)
✅ **Automatic unit conversion** (cm→mm, inch→mm)
✅ **Simplified data entry**
✅ **Per-server character isolation**
✅ **Master sheet logging**

---

## Quick Test

1. Create a test character sheet
2. Put "Test Character" in C6
3. Add a weapon: "20cm/50 Test Gun" with type "main"
4. Share sheet
5. Run `/register @yourself [url]`
6. Check console for: `🔧 Extracted caliber from "20cm/50 Test Gun": 200mm`

---

## Need Help?

- Run `/template` in Discord
- Check console logs for extraction details
- See full docs in the md files
- Caliber not extracting? Make sure format is: `{number}{unit}` (e.g., `20cm`, `16"`, `127mm`)

---

**Your Atago with `20cm/50 3rd Year Type No.2` guns is ready to be registered!** 🚢⚓
