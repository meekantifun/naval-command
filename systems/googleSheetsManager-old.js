// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         GOOGLE SHEETS MANAGER                                ║
// ║              Character registration via Google Sheets integration            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsManager {
    constructor(bot) {
        this.bot = bot;
        this.sheetsAPI = null;
        this.masterSheetId = null; // Will be set per guild
        this.initialized = false;
    }

    /**
     * Initialize Google Sheets API with credentials
     * You'll need to set up a Google Cloud Project and download credentials
     */
    async initialize() {
        try {
            // Check for credentials file
            const credentialsPath = path.join(__dirname, '..', 'config', 'google-credentials.json');

            if (!fs.existsSync(credentialsPath)) {
                console.log('⚠️ Google Sheets credentials not found. Character registration via sheets will be disabled.');
                console.log('📄 Place your credentials at: config/google-credentials.json');
                return false;
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

            // Create auth client
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheetsAPI = google.sheets({ version: 'v4', auth });
            this.initialized = true;

            console.log('✅ Google Sheets API initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Sheets API:', error.message);
            return false;
        }
    }

    /**
     * Extract spreadsheet ID from Google Sheets URL
     */
    extractSpreadsheetId(url) {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    /**
     * Read character data from a user's character sheet
     */
    async readCharacterSheet(sheetUrl) {
        if (!this.initialized) {
            throw new Error('Google Sheets API not initialized');
        }

        const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
        if (!spreadsheetId) {
            throw new Error('Invalid Google Sheets URL');
        }

        try {
            // Define the expected structure of the character sheet template
            // Adjust these ranges based on your template
            const response = await this.sheetsAPI.spreadsheets.values.batchGet({
                spreadsheetId,
                ranges: [
                    'Character Info!B2:B20',  // Basic character info
                    'Weapons!A2:H50',         // Weapons data
                    'AA Systems!A2:H50',      // AA systems data
                    'Aircraft!A2:H50'         // Aircraft data (for carriers)
                ]
            });

            const [basicInfo, weaponsData, aaData, aircraftData] = response.data.valueRanges;

            return this.parseCharacterData(basicInfo.values, weaponsData.values, aaData.values, aircraftData.values);
        } catch (error) {
            console.error('Error reading character sheet:', error);
            throw new Error(`Failed to read character sheet: ${error.message}`);
        }
    }

    /**
     * Parse the raw sheet data into character object
     */
    parseCharacterData(basicInfo, weaponsData, aaData, aircraftData) {
        // Extract basic info (adjust indices based on your template layout)
        const character = {
            username: basicInfo[0]?.[0] || 'Unknown',
            shipClass: basicInfo[1]?.[0] || 'Unknown',
            tonnage: parseInt(basicInfo[2]?.[0]) || 0,
            speedKnots: parseInt(basicInfo[3]?.[0]) || 0,
            hangar: parseInt(basicInfo[4]?.[0]) || 0,
            armorThickness: {
                belt: parseInt(basicInfo[5]?.[0]) || 0,
                deck: parseInt(basicInfo[6]?.[0]) || 0,
                turret: parseInt(basicInfo[7]?.[0]) || 0
            },
            level: parseInt(basicInfo[8]?.[0]) || 1,
            experience: parseInt(basicInfo[9]?.[0]) || 0,
            currency: parseInt(basicInfo[10]?.[0]) || 0,
            battles: parseInt(basicInfo[11]?.[0]) || 0,
            victories: parseInt(basicInfo[12]?.[0]) || 0,
            weapons: {},
            aaSystems: [],
            availableAircraft: new Map(),
            activeSquadrons: new Map(),
            aircraft: new Map()
        };

        // Parse weapons
        if (weaponsData && weaponsData.length > 0) {
            weaponsData.forEach((row, index) => {
                if (row[0]) { // If weapon name exists
                    const weaponId = `${row[1]}_${Date.now()}_${index}`;
                    character.weapons[weaponId] = {
                        name: row[0],
                        type: (row[1] || 'main').toLowerCase(),
                        caliber: row[2] || '0mm',
                        damage: parseInt(row[3]) || 0,
                        range: parseInt(row[4]) || 0,
                        accuracy: parseInt(row[5]) || 0,
                        turrets: parseInt(row[6]) || 1,
                        barrels: parseInt(row[7]) || 1
                    };
                }
            });
        }

        // Parse AA systems
        if (aaData && aaData.length > 0) {
            aaData.forEach(row => {
                if (row[0]) { // If AA system name exists
                    character.aaSystems.push({
                        name: row[0],
                        caliber: row[1] || '0mm',
                        mountType: (row[2] || 'single').toLowerCase(),
                        damage: parseInt(row[3]) || 0,
                        range: parseInt(row[4]) || 0,
                        accuracy: parseInt(row[5]) || 0,
                        mounts: parseInt(row[6]) || 1,
                        barrels: parseInt(row[7]) || 1
                    });
                }
            });
        }

        // Parse aircraft (for carriers)
        if (aircraftData && aircraftData.length > 0) {
            aircraftData.forEach(row => {
                if (row[0]) { // If aircraft type exists
                    const aircraftType = row[0];
                    character.availableAircraft.set(aircraftType, {
                        name: row[1] || aircraftType,
                        type: aircraftType,
                        damage: parseInt(row[2]) || 0,
                        range: parseInt(row[3]) || 0,
                        accuracy: parseInt(row[4]) || 0,
                        health: parseInt(row[5]) || 0,
                        speed: parseInt(row[6]) || 0,
                        count: parseInt(row[7]) || 0
                    });
                }
            });
        }

        // Calculate stats
        character.calculatedHP = Math.floor(character.tonnage / 100) + 50;
        character.calculatedSpeed = Math.floor(character.speedKnots / 5);
        character.calculatedArmor = Math.floor(
            (character.armorThickness.belt + character.armorThickness.deck + character.armorThickness.turret) / 15
        );

        // Calculate evasion
        const baseEvasion = 0.1;
        const referenceSpeed = 25;
        const referenceSize = 8000;
        const speedFactor = character.speedKnots / referenceSpeed;
        const sizeFactor = referenceSize / character.tonnage;
        const rawEvasion = baseEvasion * speedFactor * sizeFactor;
        const evasionPercentage = Math.min(rawEvasion * 100, 95);

        character.calculatedEvasion = {
            evasionPercentage: parseFloat(evasionPercentage.toFixed(1)),
            speedFactor: parseFloat(speedFactor.toFixed(2)),
            sizeFactor: parseFloat(sizeFactor.toFixed(2)),
            calculation: {
                baseEvasion,
                referenceSpeed,
                referenceSize,
                rawEvasion: parseFloat(rawEvasion.toFixed(3))
            }
        };

        // Calculate range from weapons
        let maxRange = 0;
        Object.values(character.weapons).forEach(weapon => {
            if (weapon.range > maxRange) maxRange = weapon.range;
        });

        character.stats = {
            health: character.calculatedHP,
            armor: character.calculatedArmor,
            speed: character.calculatedSpeed,
            evasion: character.calculatedEvasion.evasionPercentage,
            range: maxRange,
            baseAccuracy: 85,
            accuracy: 85
        };

        return character;
    }

    /**
     * Write character data to master sheet
     */
    async writeToMasterSheet(guildId, characterData) {
        if (!this.initialized) {
            throw new Error('Google Sheets API not initialized');
        }

        // Get master sheet ID for this guild
        const masterSheetId = await this.getMasterSheetId(guildId);
        if (!masterSheetId) {
            console.warn(`No master sheet configured for guild ${guildId}`);
            return false;
        }

        try {
            // Prepare row data
            const row = [
                new Date().toISOString(),
                characterData.username,
                characterData.shipClass,
                characterData.tonnage,
                characterData.speedKnots,
                characterData.calculatedHP,
                characterData.calculatedArmor,
                characterData.calculatedEvasion.evasionPercentage,
                characterData.level,
                characterData.currency,
                Object.keys(characterData.weapons).length,
                characterData.aaSystems.length,
                characterData.battles,
                characterData.victories
            ];

            // Append to master sheet
            await this.sheetsAPI.spreadsheets.values.append({
                spreadsheetId: masterSheetId,
                range: 'Characters!A:N',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [row]
                }
            });

            console.log(`✅ Character ${characterData.username} added to master sheet`);
            return true;
        } catch (error) {
            console.error('Error writing to master sheet:', error);
            return false;
        }
    }

    /**
     * Get or set master sheet ID for a guild
     */
    async getMasterSheetId(guildId) {
        const configPath = path.join(__dirname, '..', 'servers', this.bot.getGuildFolderName(guildId), 'config.json');

        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.masterSheetId || null;
        }

        return null;
    }

    async setMasterSheetId(guildId, sheetUrl) {
        const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
        if (!spreadsheetId) {
            throw new Error('Invalid Google Sheets URL');
        }

        const guildFolder = path.join(__dirname, '..', 'servers', this.bot.getGuildFolderName(guildId));
        const configPath = path.join(guildFolder, 'config.json');

        // Ensure guild folder exists
        if (!fs.existsSync(guildFolder)) {
            fs.mkdirSync(guildFolder, { recursive: true });
        }

        // Load or create config
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        config.masterSheetId = spreadsheetId;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        return spreadsheetId;
    }
}

module.exports = GoogleSheetsManager;
