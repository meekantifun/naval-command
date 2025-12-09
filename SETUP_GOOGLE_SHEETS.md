# Google Sheets Character Registration Setup Guide

## ✅ Implementation Complete!

The Google Sheets-based character registration system has been fully implemented. Follow this guide to set it up and start using it.

---

## 📋 What Was Implemented

### New Files Created:
1. **`systems/googleSheetsManager.js`** - Handles all Google Sheets API interactions
2. **`commands/characterRegistration.js`** - Slash commands for registration
3. **`CHARACTER_SHEET_TEMPLATE.md`** - Template documentation
4. **`SETUP_GOOGLE_SHEETS.md`** - This setup guide

### New Commands:
- `/register @user [sheet_url]` - Register a character from Google Sheets (GM only)
- `/setmastersheet [sheet_url]` - Set the master character log (Admin only)
- `/template` - Get template information

### Features:
- ✅ Per-server character isolation
- ✅ Automatic data extraction from Google Sheets
- ✅ Master sheet logging for all registered characters
- ✅ Full character validation
- ✅ Supports all ship types including carriers
- ✅ Automatic stat calculation

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

The `googleapis` package has already been added to `package.json`.

### Step 2: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in the details:
   - **Service account name**: Naval Command Bot
   - **Description**: Character registration service
4. Click "Create and Continue"
5. Skip optional steps and click "Done"

### Step 4: Generate Credentials

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create New Key"
4. Select **JSON** format
5. Click "Create"
6. A JSON file will be downloaded

### Step 5: Configure the Bot

1. Create a `config/` folder in your bot directory:
   ```bash
   mkdir config
   ```

2. Save the downloaded JSON file as:
   ```
   config/google-credentials.json
   ```

3. Make sure the file structure looks like this:
   ```
   Naval Command/
   ├── config/
   │   └── google-credentials.json
   ├── systems/
   │   └── googleSheetsManager.js
   ├── commands/
   │   └── characterRegistration.js
   └── ... other files
   ```

### Step 6: Restart the Bot

```bash
npm start
```

You should see:
```
✅ Google Sheets API initialized successfully
```

If you see a warning instead, check your credentials file path.

---

## 📊 Create Character Sheet Template

### 1. Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Naval Command Character Template"

### 2. Set Up the Sheets

Create **4 sheets** (tabs) with these exact names:

#### Sheet 1: `Character Info`
- Put labels in Column A, values in Column B
- Starting from Row 2:

| Row | A (Label) | B (Value) |
|-----|-----------|-----------|
| 2 | Character Name | USS Example |
| 3 | Ship Class | Battleship |
| 4 | Tonnage | 48000 |
| 5 | Speed | 33 |
| 6 | Hangar | 0 |
| 7 | Belt Armor | 307 |
| 8 | Deck Armor | 184 |
| 9 | Turret Armor | 439 |
| 10 | Level | 1 |
| 11 | Experience | 0 |
| 12 | Currency | 0 |
| 13 | Battles | 0 |
| 14 | Victories | 0 |

#### Sheet 2: `Weapons`
Header row (Row 1): `Name | Type | Caliber | Damage | Range | Accuracy | Turrets | Barrels`

Add weapons starting from Row 2

#### Sheet 3: `AA Systems`
Header row (Row 1): `Name | Caliber | Mount Type | Damage | Range | Accuracy | Mounts | Barrels`

Add AA systems starting from Row 2

#### Sheet 4: `Aircraft`
Header row (Row 1): `Type | Name | Damage | Range | Accuracy | Health | Speed | Count`

Add aircraft starting from Row 2 (for carriers only)

### 3. Share the Template

1. Click the "Share" button
2. Copy the **service account email** from your `google-credentials.json` (look for `client_email`)
3. Add it with **Viewer** permissions
4. OR set to "Anyone with the link can view"

### 4. Get the Template URL

Copy the URL from your browser. It should look like:
```
https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_ID_HERE/edit
```

---

## 🎮 How to Use

### For Players:

1. Get the template URL from your GM
2. Make a copy (File → Make a copy)
3. Fill in your character data in all 4 sheets
4. Share the sheet with the bot's service account email (or set to "Anyone with link")
5. Copy your sheet URL
6. Give the URL to your GM

### For GMs:

1. **First Time Setup (per server)**:
   ```
   /setmastersheet [master_log_sheet_url]
   ```
   This creates a master log where all registered characters will be recorded.

2. **Register a Character**:
   ```
   /register @player [their_character_sheet_url]
   ```

3. **Give Players Template Info**:
   ```
   /template
   ```

---

## 📝 Example Workflow

### Setting Up Your Server:

1. **Create Master Log Sheet**:
   - Create a Google Sheet for tracking all characters
   - Add header row in "Characters" tab:
     ```
     Date | Name | Ship Class | Tonnage | Speed | HP | Armor | Evasion | Level | Currency | Weapons | AA Systems | Battles | Victories
     ```
   - Share with service account
   - Run `/setmastersheet [url]`

2. **Provide Template**:
   - Share your character template with players
   - Tell them to run `/template` for instructions

3. **Register Characters**:
   - When a player submits their sheet URL, run:
     ```
     /register @player https://docs.google.com/spreadsheets/d/.../edit
     ```

---

## 🔍 Troubleshooting

### "Google Sheets integration is not set up"
- Check that `config/google-credentials.json` exists
- Verify the JSON file is valid
- Restart the bot

### "Failed to read character sheet"
- Make sure the sheet is shared with the service account email
- Verify sheet names match exactly: `Character Info`, `Weapons`, `AA Systems`, `Aircraft`
- Check that required fields are filled in Column B

### "Invalid Google Sheets URL"
- URL must start with `https://docs.google.com/spreadsheets/d/`
- Copy the full URL from your browser

### "Player already has maximum characters"
- Use `/deletechar` to remove an existing character first
- Or contact admin to increase character limit

---

## 🎯 Benefits of This System

1. **No More Manual Data Entry**: GMs don't need to type stats manually
2. **Player Control**: Players design their own characters
3. **Validation**: Bot automatically validates and calculates stats
4. **Master Log**: All characters recorded in one central sheet
5. **Per-Server**: Each server has isolated character data
6. **Backup**: Character sheets serve as backups

---

## 📚 Additional Resources

- See `CHARACTER_SHEET_TEMPLATE.md` for detailed template structure
- Template includes examples for all ship types
- Master sheet automatically updates with each registration

---

## 🚀 Next Steps

1. ✅ Complete Google Cloud setup
2. ✅ Add credentials to `config/google-credentials.json`
3. ✅ Restart bot
4. ✅ Create character template
5. ✅ Create master log sheet
6. ✅ Run `/setmastersheet`
7. ✅ Test with `/register`

---

**The old `/newchar` command still works** if you want to use manual character creation. Both systems work side-by-side!
