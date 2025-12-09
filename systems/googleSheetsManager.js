// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         GOOGLE SHEETS MANAGER V2                             ║
// ║          Character registration with configurable cell mappings              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsManager {
    constructor(bot) {
        this.bot = bot;
        this.sheetsAPI = null;
        this.masterSheetId = null;
        this.initialized = false;
    }

    /**
     * Initialize Google Sheets API with credentials
     */
    async initialize() {
        try {
            const credentialsPath = path.join(__dirname, '..', 'config', 'google-credentials.json');

            if (!fs.existsSync(credentialsPath)) {
                console.log('⚠️ Google Sheets credentials not found. Character registration via sheets will be disabled.');
                console.log('📄 Place your credentials at: config/google-credentials.json');
                return false;
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

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
     * Extract and convert caliber from weapon name
     * Examples:
     *   "20cm/50 3rd Year Type No.2" → { caliber: "200mm", originalName: "20cm/50 3rd Year Type No.2" }
     *   "16 inch/50 Mark 7" → { caliber: "406.4mm", originalName: "16 inch/50 Mark 7" }
     *   "127mm/38 Mark 12" → { caliber: "127mm", originalName: "127mm/38 Mark 12" }
     *   "5"/38 caliber" → { caliber: "127mm", originalName: "5\"/38 caliber" }
     */
    parseCaliberFromName(weaponName) {
        if (!weaponName) {
            return { caliber: '0mm', originalName: weaponName };
        }

        // Try to match various caliber formats
        const patterns = [
            // Centimeters: "20cm", "20 cm", "20-cm"
            /(\d+(?:\.\d+)?)\s*[-]?\s*cm/i,

            // Inches with quote: 5", 16", 18"
            /(\d+(?:\.\d+)?)\s*"/,

            // Inches spelled out: "16 inch", "5 in", "16-inch"
            /(\d+(?:\.\d+)?)\s*[-]?\s*(?:inch|in)(?:es)?/i,

            // Millimeters: "127mm", "127 mm", "40-mm"
            /(\d+(?:\.\d+)?)\s*[-]?\s*mm/i
        ];

        for (const pattern of patterns) {
            const match = weaponName.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                let caliberMm;

                // Determine unit and convert to mm
                const matchedText = match[0].toLowerCase();
                if (matchedText.includes('cm')) {
                    // Centimeters to millimeters
                    caliberMm = value * 10;
                } else if (matchedText.includes('inch') || matchedText.includes('in') || matchedText.includes('"')) {
                    // Inches to millimeters (1 inch = 25.4mm)
                    caliberMm = value * 25.4;
                } else if (matchedText.includes('mm')) {
                    // Already in millimeters
                    caliberMm = value;
                }

                // Round to 1 decimal place if not a whole number
                const roundedCaliber = Math.round(caliberMm * 10) / 10;
                const caliberStr = Number.isInteger(roundedCaliber)
                    ? `${roundedCaliber}mm`
                    : `${roundedCaliber}mm`;

                console.log(`🔧 Extracted caliber from "${weaponName}": ${caliberStr}`);

                return {
                    caliber: caliberStr,
                    originalName: weaponName
                };
            }
        }

        // No caliber found, return original
        return {
            caliber: '0mm',
            originalName: weaponName
        };
    }

    /**
     * Get cell mapping configuration for a guild
     */
    getCellMapping(guildId) {
        // Try to load guild-specific mapping
        const guildFolder = path.join(__dirname, '..', 'servers', this.bot.getGuildFolderName(guildId));
        const guildMappingPath = path.join(guildFolder, 'sheet-mapping.json');

        if (fs.existsSync(guildMappingPath)) {
            try {
                const mapping = JSON.parse(fs.readFileSync(guildMappingPath, 'utf8'));
                console.log(`📋 Using custom sheet mapping for guild ${guildId}`);
                return mapping;
            } catch (error) {
                console.warn('⚠️ Error loading custom sheet mapping, using default:', error);
            }
        }

        // Load default template
        const templatePath = path.join(__dirname, '..', 'config', 'sheet-mapping-template.json');
        if (fs.existsSync(templatePath)) {
            return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
        }

        // Fallback hardcoded default
        return {
            basic: {
                sheetName: 'Character Info',
                username: 'C6',
                shipClass: 'C7',
                tonnage: 'C8',
                speedKnots: 'C9',
                hangar: 'C10',
                belt: 'C11',
                deck: 'C12',
                turret: 'C13',
                level: 'C14',
                experience: 'C15',
                currency: 'C16',
                battles: 'C17',
                victories: 'C18'
            },
            weapons: {
                sheetName: 'Weapons',
                startRow: 2,
                endRow: 100,
                columns: { name: 'A', type: 'B', caliber: 'C', damage: 'D', range: 'E', accuracy: 'F', turrets: 'G', barrels: 'H' }
            },
            aa: {
                sheetName: 'AA Systems',
                startRow: 2,
                endRow: 100,
                columns: { name: 'A', caliber: 'B', mountType: 'C', damage: 'D', range: 'E', accuracy: 'F', mounts: 'G', barrels: 'H' }
            },
            aircraft: {
                sheetName: 'Aircraft',
                startRow: 2,
                endRow: 100,
                columns: { type: 'A', name: 'B', damage: 'C', range: 'D', accuracy: 'E', health: 'F', speed: 'G', count: 'H' }
            }
        };
    }

    /**
     * Build column range from columns config
     */
    buildColumnRange(columns) {
        const cols = Object.values(columns);
        const minCol = cols.reduce((min, col) => col < min ? col : min);
        const maxCol = cols.reduce((max, col) => col > max ? col : max);
        return `${minCol}:${maxCol}`;
    }

    /**
     * Read character data from a user's character sheet using configured mappings
     */
    async readCharacterSheet(guildId, sheetUrl) {
        if (!this.initialized) {
            throw new Error('Google Sheets API not initialized');
        }

        const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
        if (!spreadsheetId) {
            throw new Error('Invalid Google Sheets URL');
        }

        try {
            const mapping = this.getCellMapping(guildId);

            // Build ranges to fetch
            const ranges = [];

            // Add basic info individual cells
            const basicFields = ['username', 'shipClass', 'tonnage', 'speedKnots', 'hangar', 'belt', 'deck', 'turret', 'level', 'experience', 'currency', 'battles', 'victories'];
            basicFields.forEach(field => {
                if (mapping.basic[field]) {
                    ranges.push(`${mapping.basic.sheetName}!${mapping.basic[field]}`);
                }
            });

            // Add weapons range
            const weaponCols = this.buildColumnRange(mapping.weapons.columns);
            ranges.push(`${mapping.weapons.sheetName}!${weaponCols}${mapping.weapons.startRow}:${weaponCols}${mapping.weapons.endRow}`);

            // Add AA systems range
            const aaCols = this.buildColumnRange(mapping.aa.columns);
            ranges.push(`${mapping.aa.sheetName}!${aaCols}${mapping.aa.startRow}:${aaCols}${mapping.aa.endRow}`);

            // Add aircraft range
            const aircraftCols = this.buildColumnRange(mapping.aircraft.columns);
            ranges.push(`${mapping.aircraft.sheetName}!${aircraftCols}${mapping.aircraft.startRow}:${aircraftCols}${mapping.aircraft.endRow}`);

            console.log(`📊 Fetching character data from ${ranges.length} ranges`);

            const response = await this.sheetsAPI.spreadsheets.values.batchGet({
                spreadsheetId,
                ranges
            });

            return this.parseCharacterDataWithMapping(response.data.valueRanges, mapping);
        } catch (error) {
            console.error('❌ Error reading character sheet:', error);
            throw new Error(`Failed to read character sheet: ${error.message}`);
        }
    }

    /**
     * Parse character data using custom cell mapping
     */
    parseCharacterDataWithMapping(valueRanges, mapping) {
        // Extract basic info from individual cells (first 13 ranges)
        const character = {
            username: valueRanges[0]?.values?.[0]?.[0] || 'Unknown',
            shipClass: valueRanges[1]?.values?.[0]?.[0] || 'Unknown',
            tonnage: parseInt(valueRanges[2]?.values?.[0]?.[0]) || 0,
            speedKnots: parseInt(valueRanges[3]?.values?.[0]?.[0]) || 0,
            hangar: parseInt(valueRanges[4]?.values?.[0]?.[0]) || 0,
            armorThickness: {
                belt: parseInt(valueRanges[5]?.values?.[0]?.[0]) || 0,
                deck: parseInt(valueRanges[6]?.values?.[0]?.[0]) || 0,
                turret: parseInt(valueRanges[7]?.values?.[0]?.[0]) || 0
            },
            level: parseInt(valueRanges[8]?.values?.[0]?.[0]) || 1,
            experience: parseInt(valueRanges[9]?.values?.[0]?.[0]) || 0,
            currency: parseInt(valueRanges[10]?.values?.[0]?.[0]) || 0,
            battles: parseInt(valueRanges[11]?.values?.[0]?.[0]) || 0,
            victories: parseInt(valueRanges[12]?.values?.[0]?.[0]) || 0,
            weapons: {},
            aaSystems: [],
            availableAircraft: new Map(),
            activeSquadrons: new Map(),
            aircraft: new Map()
        };

        // Parse weapons (range index 13)
        const weaponsData = valueRanges[13]?.values || [];
        const weaponCols = mapping.weapons.columns;
        weaponsData.forEach((row, index) => {
            const colIndices = this.getColumnIndices(weaponCols);
            if (row[colIndices.name]) {
                // Parse caliber from weapon name
                const { caliber, originalName } = this.parseCaliberFromName(row[colIndices.name]);

                // Use sheet caliber if provided, otherwise use extracted caliber
                const finalCaliber = row[colIndices.caliber] || caliber;

                const weaponId = `${row[colIndices.type]}_${Date.now()}_${index}`;
                character.weapons[weaponId] = {
                    name: originalName,
                    type: (row[colIndices.type] || 'main').toLowerCase(),
                    caliber: finalCaliber,
                    damage: parseInt(row[colIndices.damage]) || 0,
                    range: parseInt(row[colIndices.range]) || 0,
                    accuracy: parseInt(row[colIndices.accuracy]) || 0,
                    turrets: parseInt(row[colIndices.turrets]) || 1,
                    barrels: parseInt(row[colIndices.barrels]) || 1
                };
            }
        });

        // Parse AA systems (range index 14)
        const aaData = valueRanges[14]?.values || [];
        const aaCols = mapping.aa.columns;
        aaData.forEach(row => {
            const colIndices = this.getColumnIndices(aaCols);
            if (row[colIndices.name]) {
                // Parse caliber from AA system name
                const { caliber, originalName } = this.parseCaliberFromName(row[colIndices.name]);

                // Use sheet caliber if provided, otherwise use extracted caliber
                const finalCaliber = row[colIndices.caliber] || caliber;

                character.aaSystems.push({
                    name: originalName,
                    caliber: finalCaliber,
                    mountType: (row[colIndices.mountType] || 'single').toLowerCase(),
                    damage: parseInt(row[colIndices.damage]) || 0,
                    range: parseInt(row[colIndices.range]) || 0,
                    accuracy: parseInt(row[colIndices.accuracy]) || 0,
                    mounts: parseInt(row[colIndices.mounts]) || 1,
                    barrels: parseInt(row[colIndices.barrels]) || 1
                });
            }
        });

        // Parse aircraft (range index 15)
        const aircraftData = valueRanges[15]?.values || [];
        const aircraftCols = mapping.aircraft.columns;
        aircraftData.forEach(row => {
            const colIndices = this.getColumnIndices(aircraftCols);
            if (row[colIndices.type]) {
                const aircraftType = row[colIndices.type];
                character.availableAircraft.set(aircraftType, {
                    name: row[colIndices.name] || aircraftType,
                    type: aircraftType,
                    damage: parseInt(row[colIndices.damage]) || 0,
                    range: parseInt(row[colIndices.range]) || 0,
                    accuracy: parseInt(row[colIndices.accuracy]) || 0,
                    health: parseInt(row[colIndices.health]) || 0,
                    speed: parseInt(row[colIndices.speed]) || 0,
                    count: parseInt(row[colIndices.count]) || 0
                });
            }
        });

        return this.calculateCharacterStats(character);
    }

    /**
     * Convert column letters to 0-based indices
     */
    getColumnIndices(columns) {
        const indices = {};
        const minCol = Object.values(columns).reduce((min, col) => col < min ? col : min);

        for (const [key, col] of Object.entries(columns)) {
            indices[key] = this.columnToIndex(col) - this.columnToIndex(minCol);
        }
        return indices;
    }

    /**
     * Convert column letter to 0-based index
     */
    columnToIndex(col) {
        let index = 0;
        for (let i = 0; i < col.length; i++) {
            index = index * 26 + (col.charCodeAt(i) - 64);
        }
        return index - 1;
    }

    /**
     * Calculate character stats
     */
    calculateCharacterStats(character) {
        // Calculate HP, armor, speed, evasion
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

        const masterSheetId = await this.getMasterSheetId(guildId);
        if (!masterSheetId) {
            console.warn(`⚠️ No master sheet configured for guild ${guildId}`);
            return false;
        }

        try {
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

            await this.sheetsAPI.spreadsheets.values.append({
                spreadsheetId: masterSheetId,
                range: 'Characters!A:N',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [row] }
            });

            console.log(`✅ Character ${characterData.username} added to master sheet`);
            return true;
        } catch (error) {
            console.error('❌ Error writing to master sheet:', error);
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

        if (!fs.existsSync(guildFolder)) {
            fs.mkdirSync(guildFolder, { recursive: true });
        }

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
