# Automatic Caliber Extraction

## Overview

The bot now **automatically extracts and converts calibers** from weapon and AA system names! You no longer need to fill in a separate caliber column in your Google Sheets.

---

## How It Works

The bot intelligently parses weapon names to extract caliber information and converts everything to millimeters.

### Examples:

| Weapon Name | Extracted Caliber | Notes |
|-------------|-------------------|-------|
| `20cm/50 3rd Year Type No.2` | `200mm` | Centimeters → Millimeters (20cm × 10) |
| `16 inch/50 Mark 7` | `406.4mm` | Inches → Millimeters (16" × 25.4) |
| `5"/38 caliber` | `127mm` | Quote format (5" × 25.4) |
| `127mm/38 Mark 12` | `127mm` | Already in millimeters |
| `40 mm Bofors` | `40mm` | Already in millimeters |
| `25mm Type 96` | `25mm` | Already in millimeters |
| `12.7cm/50 Type 89` | `127mm` | Centimeters to millimeters |

---

## Supported Formats

### ✅ Centimeters
- `20cm/50` → 200mm
- `20 cm` → 200mm
- `20-cm` → 200mm
- `12.7cm` → 127mm

### ✅ Inches (with quote)
- `16"` → 406.4mm
- `5"/38` → 127mm
- `14"` → 355.6mm

### ✅ Inches (spelled out)
- `16 inch` → 406.4mm
- `5 in` → 127mm
- `16-inch` → 406.4mm
- `3 inches` → 76.2mm

### ✅ Millimeters
- `127mm` → 127mm
- `40 mm` → 40mm
- `20-mm` → 20mm

---

## Google Sheets Setup

### Option 1: No Caliber Column (Recommended)

Just put the full weapon name with caliber in it:

| Name | Type | Damage | Range | Accuracy | Turrets | Barrels |
|------|------|---------|-------|----------|---------|---------|
| 20cm/50 3rd Year Type No.2 | main | 150 | 25 | 85 | 3 | 2 |
| 127mm/50 Type 89 | secondary | 50 | 14 | 90 | 8 | 2 |
| 40 mm Bofors | aa | 30 | 5 | 85 | 20 | 4 |

The bot will automatically:
- Extract `20cm` → `200mm`
- Extract `127mm` → `127mm`
- Extract `40 mm` → `40mm`
- Keep full names intact

### Option 2: Override with Caliber Column

If you want to manually specify calibers (to override automatic extraction):

| Name | Type | Caliber | Damage | Range | Accuracy | Turrets | Barrels |
|------|------|---------|---------|-------|----------|---------|---------|
| Main Battery | main | 406mm | 200 | 38 | 85 | 3 | 3 |
| Secondary | secondary | 127mm | 50 | 14 | 90 | 10 | 2 |

**Priority:** Manual caliber column > Automatic extraction

---

## Real World Examples

### Japanese Naval Guns

```
20cm/50 3rd Year Type No.2    → 200mm
15.5cm/60 3rd Year Type       → 155mm
12.7cm/50 Type 89             → 127mm
25mm Type 96                  → 25mm
```

### US Naval Guns

```
16 inch/50 Mark 7             → 406.4mm
8 inch/55 Mark 12             → 203.2mm
5"/38 caliber Mark 12         → 127mm
40 mm Bofors                  → 40mm
20 mm Oerlikon                → 20mm
```

### British Naval Guns

```
15 inch/42 Mark I             → 381mm
6 inch/50 BL Mark XXIII       → 152.4mm
4.5"/45 QF Mark I             → 114.3mm
40mm Pom-Pom                  → 40mm
```

### German Naval Guns

```
38cm SK C/34                  → 380mm
15cm SK C/28                  → 150mm
10.5cm SK C/33                → 105mm
37 mm SK C/30                 → 37mm
```

---

## How Conversion Works

### Centimeters → Millimeters
Formula: `cm × 10 = mm`

Examples:
- 20cm × 10 = 200mm
- 15.5cm × 10 = 155mm
- 12.7cm × 10 = 127mm

### Inches → Millimeters
Formula: `inches × 25.4 = mm`

Examples:
- 16" × 25.4 = 406.4mm
- 8" × 25.4 = 203.2mm
- 5" × 25.4 = 127mm
- 3" × 25.4 = 76.2mm

### Millimeters → Millimeters
No conversion needed!

---

## Benefits

### ✅ Simplified Data Entry
- Just write the weapon name as it appears historically
- No need to calculate calibers yourself
- No separate caliber column required

### ✅ Accurate Conversions
- Proper inch-to-mm conversion (25.4mm per inch)
- Proper cm-to-mm conversion (10mm per cm)
- Rounded to 1 decimal place for precision

### ✅ Flexible
- Auto-detection works with various formats
- Can still override with manual caliber column
- Supports mixed units in the same sheet

### ✅ Historical Accuracy
- Use authentic weapon designation names
- Preserves historical naming conventions
- Bot handles the math automatically

---

## In Your Sheets

### Before (Old Way)
You had to manually fill caliber:

| Name | Caliber | Type |
|------|---------|------|
| Main Gun | 406mm | main |
| Secondary | 127mm | secondary |

### After (New Way)
Just use the full weapon name:

| Name | Type |
|------|------|
| 16 inch/50 Mark 7 | main |
| 5"/38 caliber Mark 12 | secondary |

The bot extracts: `406.4mm` and `127mm` automatically!

---

## Console Output

When registering a character, you'll see:

```
🔧 Extracted caliber from "20cm/50 3rd Year Type No.2": 200mm
🔧 Extracted caliber from "127mm/50 Type 89": 127mm
🔧 Extracted caliber from "16 inch/50 Mark 7": 406.4mm
🔧 Extracted caliber from "40 mm Bofors": 40mm
```

This confirms the bot is correctly parsing your weapon names!

---

## No Caliber Found?

If the bot can't extract a caliber from the name, it will:
- Use `0mm` as default
- Log a warning
- Still register the character successfully

You can then either:
1. Add caliber info to the weapon name
2. Add a caliber column with manual values

---

## Migration Guide

### If You're Already Using Sheets

**Good news:** Your existing sheets still work!

1. **With Caliber Column:** Bot will use your manual calibers
2. **Without Caliber Column:** Bot will extract from names
3. **Mixed:** Bot uses manual caliber if provided, otherwise extracts

### To Switch to Auto-Extraction

1. Remove caliber column from your template (optional)
2. Update weapon names to include caliber info
3. Example: Change "Main Gun" → "16 inch/50 Mark 7"
4. Register characters as normal

---

## Tips

### ✅ DO:
- Use standard naval gun notation: `20cm/50`, `16"/50`, `127mm/38`
- Include caliber at the start of the name
- Use authentic historical designations

### ⚠️ DON'T:
- Don't abbreviate inconsistently: use `cm` not `c.m.`
- Don't use mixed notations in one name: `20cm/5inch`
- Don't put caliber at the end if other numbers come first

### 💡 TIPS:
- If extraction fails, add a caliber column
- Check console logs to verify extraction
- Use format: `{caliber}{unit}/{barrel length} {name}`

---

## Examples by Nation

### Japan (cm-based)
```
46cm/45 Type 94                    → 460mm
41cm/45 3rd Year Type              → 410mm
36cm/45 41st Year Type             → 360mm
20.3cm/50 No.2                     → 203mm
```

### USA (inch-based)
```
18"/48 Mark 1                      → 457.2mm
16"/50 Mark 7                      → 406.4mm
14"/50 Mark 11                     → 355.6mm
8"/55 Mark 12                      → 203.2mm
```

### Germany (cm-based)
```
40.6cm SK C/34                     → 406mm
38cm SK C/34                       → 380mm
28cm SK L/40                       → 280mm
15cm SK C/28                       → 150mm
```

---

## Summary

✅ **Automatic extraction from weapon names**
✅ **Supports cm, mm, inches, and " notation**
✅ **Accurate unit conversion**
✅ **Optional caliber column for overrides**
✅ **Works with existing sheets**
✅ **Console logging for verification**

Your Atago's `20cm/50 3rd Year Type No.2` will automatically become `200mm` caliber with the full name preserved! 🎯
