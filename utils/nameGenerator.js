// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          NAME GENERATOR UTILITY                              ║
// ║                    Random city and town name generation                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class NameGenerator {
    constructor() {
        // Prefixes for city names
        this.cityPrefixes = [
            'New', 'Port', 'Fort', 'Saint', 'San', 'North', 'South', 'East', 'West',
            'Mount', 'Lake', 'Bay', 'Cape', 'Point', 'Isle', 'Harbor'
        ];

        // Base names for cities/towns
        this.cityBases = [
            'Haven', 'Cross', 'Dale', 'View', 'Bridge', 'Field', 'Wood', 'Stone',
            'Mill', 'Shore', 'Bay', 'Cove', 'Landing', 'Point', 'Ridge', 'Valley',
            'Springs', 'Falls', 'Creek', 'River', 'Lake', 'Harbor', 'Beach', 'Coast'
        ];

        // Naval-themed names
        this.navalNames = [
            'Anchor', 'Compass', 'Helm', 'Tide', 'Wave', 'Storm', 'Sail', 'Reef',
            'Pearl', 'Shell', 'Coral', 'Seaborn', 'Marina', 'Wharf', 'Quay', 'Dock'
        ];

        // Single-word city names
        this.singleWordCities = [
            'Alexandria', 'Portsmouth', 'Gibraltar', 'Halifax', 'Singapore', 'Manila',
            'Yokohama', 'Vladivostok', 'Melbourne', 'Sydney', 'Auckland', 'Wellington',
            'Copenhagen', 'Rotterdam', 'Hamburg', 'Liverpool', 'Bristol', 'Plymouth',
            'Marseille', 'Barcelona', 'Lisbon', 'Genoa', 'Venice', 'Athens',
            'Istanbul', 'Beirut', 'Mumbai', 'Karachi', 'Shanghai', 'Nagasaki'
        ];

        // Town suffixes
        this.townSuffixes = [
            'ton', 'ville', 'burg', 'shire', 'ford', 'ham', 'stead', 'mouth',
            'port', 'by', 'thorpe', 'wick', 'field'
        ];

        // First parts for compound town names
        this.townFirstParts = [
            'Blue', 'Green', 'Red', 'White', 'Gray', 'Black', 'Silver', 'Gold',
            'Oak', 'Pine', 'Cedar', 'Ash', 'Elm', 'Willow', 'Birch',
            'High', 'Low', 'Fair', 'Grand', 'Little', 'Old', 'New'
        ];

        // Second parts for compound town names
        this.townSecondParts = [
            'water', 'cliff', 'hill', 'glen', 'brook', 'wood', 'rock', 'moss',
            'wind', 'sun', 'moon', 'star', 'rose', 'thorn', 'frost'
        ];
    }

    /**
     * Generate a random city name
     * @returns {string} Generated city name
     */
    generateCityName() {
        const rand = Math.random();

        if (rand < 0.4) {
            // 40% chance: Single word famous city name
            return this.randomChoice(this.singleWordCities);
        } else if (rand < 0.7) {
            // 30% chance: Prefix + Base (e.g., "Port Haven")
            const prefix = this.randomChoice(this.cityPrefixes);
            const base = this.randomChoice(this.cityBases);
            return `${prefix} ${base}`;
        } else {
            // 30% chance: Naval-themed + Base (e.g., "Anchor Bay")
            const naval = this.randomChoice(this.navalNames);
            const base = this.randomChoice(this.cityBases);
            return `${naval} ${base}`;
        }
    }

    /**
     * Generate a random town name
     * @returns {string} Generated town name
     */
    generateTownName() {
        const rand = Math.random();

        if (rand < 0.5) {
            // 50% chance: First part + Second part + Suffix (e.g., "Bluewaterton")
            const first = this.randomChoice(this.townFirstParts);
            const second = this.randomChoice(this.townSecondParts);
            const suffix = this.randomChoice(this.townSuffixes);
            return `${first}${second}${suffix}`;
        } else {
            // 50% chance: Naval/Base + Suffix (e.g., "Harborville")
            const base = Math.random() < 0.5
                ? this.randomChoice(this.navalNames)
                : this.randomChoice(this.cityBases);
            const suffix = this.randomChoice(this.townSuffixes);
            return `${base}${suffix}`;
        }
    }

    /**
     * Generate a name based on terrain type
     * @param {string} type - 'city' or 'town'
     * @returns {string} Generated name
     */
    generateName(type) {
        if (type === 'city') {
            return this.generateCityName();
        } else if (type === 'town') {
            return this.generateTownName();
        }
        return 'Settlement';
    }

    /**
     * Get a random choice from an array
     * @param {Array} array - Array to choose from
     * @returns {*} Random element
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}

module.exports = NameGenerator;
