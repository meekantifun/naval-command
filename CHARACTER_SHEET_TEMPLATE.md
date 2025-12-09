# Character Sheet Template Guide

## Overview
This document explains how to create and use character sheets for the Naval Command bot registration system.

## Google Sheets Template Structure

### Sheet 1: Character Info
Place character basic information in column B, starting from row 2:

| Row | Label | Value (Column B) | Notes |
|-----|-------|------------------|-------|
| 2 | Character Name | USS Iowa | Required |
| 3 | Ship Class | Battleship | Required (e.g., Battleship, Cruiser, Destroyer, etc.) |
| 4 | Tonnage | 48000 | Required (in tons) |
| 5 | Speed | 33 | Required (in knots) |
| 6 | Hangar Capacity | 0 | Required (0 for non-carriers) |
| 7 | Belt Armor | 307 | Required (in mm) |
| 8 | Deck Armor | 184 | Required (in mm) |
| 9 | Turret Armor | 439 | Required (in mm) |
| 10 | Level | 1 | Optional (default: 1) |
| 11 | Experience | 0 | Optional (default: 0) |
| 12 | Currency | 0 | Optional (default: 0) |
| 13 | Battles | 0 | Optional (default: 0) |
| 14 | Victories | 0 | Optional (default: 0) |

### Sheet 2: Weapons
Header row (row 1): Name | Type | Caliber | Damage | Range | Accuracy | Turrets | Barrels

Starting from row 2, add weapons (one per row):

| Name | Type | Caliber | Damage | Range | Accuracy | Turrets | Barrels |
|------|------|---------|---------|-------|----------|---------|---------|
| 16"/50 Mark 7 | main | 406mm | 150 | 38 | 85 | 3 | 3 |
| 5"/38 caliber | secondary | 127mm | 50 | 14 | 90 | 10 | 2 |
| Mk 15 Torpedo | torpedo | 533mm | 200 | 8 | 75 | 2 | 5 |

**Type options:** main, secondary, torpedo, special

### Sheet 3: AA Systems
Header row (row 1): Name | Caliber | Mount Type | Damage | Range | Accuracy | Mounts | Barrels

Starting from row 2, add AA systems (one per row):

| Name | Caliber | Mount Type | Damage | Range | Accuracy | Mounts | Barrels |
|------|---------|------------|---------|-------|----------|--------|---------|
| Bofors 40mm | 40mm | quad | 30 | 5 | 80 | 20 | 4 |
| Oerlikon 20mm | 20mm | single | 15 | 3 | 85 | 50 | 1 |

**Mount Type options:** single, dual, quad, octuple

### Sheet 4: Aircraft (For Carriers Only)
Header row (row 1): Type | Name | Damage | Range | Accuracy | Health | Speed | Count

Starting from row 2, add aircraft types (one per row):

| Type | Name | Damage | Range | Accuracy | Health | Speed | Count |
|------|------|---------|-------|----------|--------|-------|-------|
| Fighter | F6F Hellcat | 40 | 15 | 85 | 50 | 60 | 36 |
| Dive Bomber | SB2C Helldiver | 120 | 20 | 70 | 40 | 50 | 24 |
| Torpedo Bomber | TBF Avenger | 180 | 18 | 65 | 45 | 48 | 24 |

## Setup Instructions

### 1. Create Template (One Time)
1. Create a new Google Sheet
2. Create 4 sheets named exactly: `Character Info`, `Weapons`, `AA Systems`, `Aircraft`
3. Set up the structure as shown above
4. Share with "Anyone with the link can view" OR share with your bot's service account email

### 2. For Each Character
1. Make a copy of your template
2. Fill in all the character data
3. Make sure the sheet is shared properly
4. Copy the sheet URL
5. Give URL to GM who runs: `/register @player [url]`

### 3. Server Setup (GM)
1. Create a master character log sheet (same structure)
2. Run `/setmastersheet [master_sheet_url]`
3. All registered characters will be logged there

## Google API Setup (Bot Administrator)

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable Google Sheets API

### 2. Create Service Account
1. Go to "Credentials" → "Create Credentials" → "Service Account"
2. Create the service account
3. Click on the service account
4. Go to "Keys" → "Add Key" → "Create New Key" → JSON
5. Download the JSON file

### 3. Configure Bot
1. Create `config/` folder in bot directory
2. Save the JSON file as `config/google-credentials.json`
3. Restart the bot

### 4. Share Sheets
Share your template and master sheet with the service account email found in the credentials JSON file (field: `client_email`)

## Ship Classes

Valid ship classes:
- Battleship
- Battlecruiser
- Heavy Cruiser
- Light Cruiser
- Destroyer
- Submarine
- Aircraft Carrier
- Light Aircraft Carrier
- Escort Carrier
- Monitor
- Coastal Defense Ship

## Calculated Stats

The bot automatically calculates:
- **HP**: `(tonnage / 100) + 50`
- **Armor**: `(belt + deck + turret) / 15`
- **Speed**: `speedKnots / 5`
- **Evasion**: Based on speed and tonnage ratio
- **Range**: Maximum range from all weapons

## Troubleshooting

### "Failed to read character sheet"
- Make sure sheet is shared with service account
- Check that sheet names match exactly
- Verify all required fields are filled

### "Invalid Google Sheets URL"
- URL must be in format: `https://docs.google.com/spreadsheets/d/SHEET_ID/...`
- Copy from browser address bar

### "Player already has maximum characters"
- Delete an existing character first using `/deletechar`
- Or contact server administrator to increase character limit

## Example Template URL
Create your own template or use the provided template and replace the ID:
```
https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_ID/copy
```

## Commands

- `/register @user [sheet_url]` - Register a character from a sheet (GM only)
- `/setmastersheet [sheet_url]` - Set the master log for this server (Admin only)
- `/template` - Get template information and instructions
