// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            PLAYER CREATION MODULE                            ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder,TextInputBuilder,TextInputStyle, PermissionFlagsBits, MessageFlags} = require('discord.js');

const AA_CALIBERS = {
  // Short-range AA (≤ 25mm)
  "7.62mm":  { "damage": 4,  "range": 1,  "accuracy": 0.45, "rateOfFire": 15, "category": "short" },
  "12.7mm":  { "damage": 8,  "range": 2,  "accuracy": 0.60, "rateOfFire": 12, "category": "short" },
  "13.2mm":  { "damage": 9,  "range": 2,  "accuracy": 0.58, "rateOfFire": 11, "category": "short" },
  "14.5mm":  { "damage": 10, "range": 2,  "accuracy": 0.60, "rateOfFire": 10, "category": "short" },
  "20mm":    { "damage": 12, "range": 3,  "accuracy": 0.65, "rateOfFire": 10, "category": "short" },
  "23mm":    { "damage": 13, "range": 3,  "accuracy": 0.66, "rateOfFire": 9,  "category": "short" },
  "25mm":    { "damage": 14, "range": 3,  "accuracy": 0.62, "rateOfFire": 9,  "category": "short" },

  // Medium-range AA (26mm–57mm)
  "28mm":    { "damage": 15, "range": 4,  "accuracy": 0.64, "rateOfFire": 7,  "category": "medium" },
  "30mm":    { "damage": 16, "range": 4,  "accuracy": 0.60, "rateOfFire": 8,  "category": "medium" },
  "35mm":    { "damage": 18, "range": 4,  "accuracy": 0.63, "rateOfFire": 7,  "category": "medium" },
  "37mm":    { "damage": 20, "range": 5,  "accuracy": 0.68, "rateOfFire": 7,  "category": "medium" },
  "40mm":    { "damage": 22, "range": 5,  "accuracy": 0.70, "rateOfFire": 6,  "category": "medium" },
  "45mm":    { "damage": 24, "range": 5,  "accuracy": 0.66, "rateOfFire": 5,  "category": "medium" },
  "50mm":    { "damage": 26, "range": 6,  "accuracy": 0.68, "rateOfFire": 4,  "category": "medium" },
  "57mm":    { "damage": 30, "range": 7,  "accuracy": 0.70, "rateOfFire": 4,  "category": "medium" },

  // Long-range AA (> 57mm)
  "75mm":    { "damage": 36, "range": 8,  "accuracy": 0.72, "rateOfFire": 3,  "category": "long" },
  "76.2mm":  { "damage": 38, "range": 8,  "accuracy": 0.74, "rateOfFire": 3,  "category": "long" },
  "76.5mm":  { "damage": 39, "range": 8,  "accuracy": 0.74, "rateOfFire": 3,  "category": "long" },
  "77mm":    { "damage": 40, "range": 8,  "accuracy": 0.74, "rateOfFire": 3,  "category": "long" },
  "80mm":    { "damage": 41, "range": 9,  "accuracy": 0.75, "rateOfFire": 2,  "category": "long" },
  "83.5mm":  { "damage": 42, "range": 9,  "accuracy": 0.75, "rateOfFire": 2,  "category": "long" },
  "85mm":    { "damage": 44, "range": 9,  "accuracy": 0.76, "rateOfFire": 2,  "category": "long" },
  "88mm":    { "damage": 46, "range": 10, "accuracy": 0.78, "rateOfFire": 2,  "category": "long" },
  "90mm":    { "damage": 48, "range": 10, "accuracy": 0.77, "rateOfFire": 2,  "category": "long" },
  "94mm":    { "damage": 50, "range": 10, "accuracy": 0.78, "rateOfFire": 2,  "category": "long" },
  "100mm":   { "damage": 52, "range": 11, "accuracy": 0.80, "rateOfFire": 2,  "category": "long" },
  "102mm":   { "damage": 53, "range": 11, "accuracy": 0.79, "rateOfFire": 2,  "category": "long" },
  "105mm":   { "damage": 55, "range": 11, "accuracy": 0.79, "rateOfFire": 2,  "category": "long" },
  "113mm":   { "damage": 58, "range": 12, "accuracy": 0.80, "rateOfFire": 2,  "category": "long" },
  "120mm":   { "damage": 64, "range": 12, "accuracy": 0.82, "rateOfFire": 2,  "category": "long" },
  "127mm":   { "damage": 68, "range": 13, "accuracy": 0.83, "rateOfFire": 2,  "category": "long" },
  "128mm":   { "damage": 70, "range": 13, "accuracy": 0.84, "rateOfFire": 2,  "category": "long" },
  "130mm":   { "damage": 72, "range": 13, "accuracy": 0.84, "rateOfFire": 2,  "category": "long" },
  "133mm":   { "damage": 74, "range": 14, "accuracy": 0.85, "rateOfFire": 2,  "category": "long" },
  "150mm":   { "damage": 80, "range": 15, "accuracy": 0.86, "rateOfFire": 1,  "category": "long" },
  "152mm":   { "damage": 82, "range": 15, "accuracy": 0.87, "rateOfFire": 1,  "category": "long" }
};

// Mount multipliers for different configurations
const AA_MOUNT_MULTIPLIERS = {
    'single': 1.0,
    'twin': 1.8,
    'triple': 2.5,
    'quad': 3.2,
    'sextuple': 4.5,
    'octuple': 5.5
};

const WEAPON_TEMPLATES = {
    // Secondary / Dual‑Purpose Guns
    '65mm':   { type: 'secondary', damage: 50,  range: 6,  reload: 3, penetration: 55,  ammo: 160, barrels: 1 },
    '75mm':   { type: 'secondary', damage: 60,  range: 7,  reload: 3, penetration: 65,  ammo: 150, barrels: 1 },
    '76mm':   { type: 'secondary', damage: 65,  range: 8,  reload: 3, penetration: 70,  ammo: 150, barrels: 1 },
    '76.2mm': { type: 'secondary', damage: 66,  range: 8,  reload: 3, penetration: 71,  ammo: 149, barrels: 1 },
    '76.5mm': { type: 'secondary', damage: 67,  range: 8,  reload: 3, penetration: 72,  ammo: 148, barrels: 1 },
    '77mm':   { type: 'secondary', damage: 68,  range: 8,  reload: 3, penetration: 73,  ammo: 147, barrels: 1 },
    '80mm':   { type: 'secondary', damage: 70,  range: 8,  reload: 3, penetration: 74,  ammo: 140, barrels: 1 },
    '88mm':   { type: 'secondary', damage: 72,  range: 9,  reload: 3, penetration: 76,  ammo: 130, barrels: 1 },
    '90mm':   { type: 'secondary', damage: 73,  range: 9,  reload: 3, penetration: 78,  ammo: 125, barrels: 1 },
    '94mm':   { type: 'secondary', damage: 74,  range: 9,  reload: 3, penetration: 79,  ammo: 120, barrels: 1 },

    // Destroyer / Light‑DP Main Guns
    '100mm':  { type: 'main',      damage: 75,  range: 10, reload: 4, penetration: 80,  ammo: 100, barrels: 1 },
    '102mm':  { type: 'main',      damage: 78,  range: 11, reload: 4, penetration: 82,  ammo: 95,  barrels: 1 },
    '105mm':  { type: 'main',      damage: 82,  range: 11, reload: 4, penetration: 85,  ammo: 92,  barrels: 1 },
    '113mm':  { type: 'main',      damage: 87,  range: 11, reload: 4, penetration: 87,  ammo: 89,  barrels: 1 },
    '114mm':  { type: 'main',      damage: 88,  range: 12, reload: 4, penetration: 88,  ammo: 88,  barrels: 1 },
    '120mm':  { type: 'main',      damage: 85,  range: 12, reload: 4, penetration: 90,  ammo: 90,  barrels: 1 },
    '122mm':  { type: 'main',      damage: 90,  range: 13, reload: 4, penetration: 94,  ammo: 85,  barrels: 1 },
    '127mm':  { type: 'main',      damage: 95,  range: 14, reload: 5, penetration: 100, ammo: 80,  barrels: 1 },
    '128mm':  { type: 'main',      damage: 96,  range: 14, reload: 5, penetration: 102, ammo: 78,  barrels: 1 },
    '130mm':  { type: 'main',      damage: 98,  range: 15, reload: 5, penetration: 105, ammo: 75,  barrels: 1 },
    '133mm':  { type: 'main',      damage: 100, range: 15, reload: 5, penetration: 108, ammo: 75,  barrels: 1 },

    // Light‑Cruiser Guns
    '138.6mm':{ type: 'main',      damage: 110, range: 16, reload: 6, penetration: 115, ammo: 70,  barrels: 1 },
    '140mm':  { type: 'main',      damage: 112, range: 16, reload: 6, penetration: 118, ammo: 68,  barrels: 1 },
    '150mm':  { type: 'main',      damage: 118, range: 17, reload: 6, penetration: 122, ammo: 62,  barrels: 1 },
    '152mm':  { type: 'main',      damage: 120, range: 18, reload: 6, penetration: 125, ammo: 60,  barrels: 1 },
    '155mm':  { type: 'main',      damage: 125, range: 19, reload: 7, penetration: 130, ammo: 55,  barrels: 1 },
    '164.7mm':{ type: 'main',      damage: 140, range: 20, reload: 7, penetration: 138, ammo: 50,  barrels: 1 },

    // Heavy‑Cruiser Guns
    '180mm':  { type: 'main',      damage: 160, range: 22, reload: 8, penetration: 160, ammo: 45,  barrels: 1 },
    '190mm':  { type: 'main',      damage: 170, range: 23, reload: 8, penetration: 170, ammo: 42,  barrels: 1 },
    '200mm':  { type: 'main',      damage: 175, range: 23, reload: 8, penetration: 175, ammo: 41,  barrels: 1 },
    '203mm':  { type: 'main',      damage: 180, range: 24, reload: 9, penetration: 180, ammo: 40,  barrels: 1 },
    '210mm':  { type: 'main',      damage: 190, range: 25, reload: 9, penetration: 190, ammo: 38,  barrels: 1 },
    '229mm':  { type: 'main',      damage: 205, range: 26, reload: 10,penetration: 200, ammo: 36,  barrels: 1 },
    '234mm':  { type: 'main',      damage: 210, range: 26, reload: 10,penetration: 205, ammo: 35,  barrels: 1 },
    '240mm':  { type: 'main',      damage: 215, range: 27, reload: 10,penetration: 210, ammo: 34,  barrels: 1 },
    '254mm':  { type: 'main',      damage: 225, range: 27, reload: 11,penetration: 220, ammo: 32,  barrels: 1 },

    // Battleship / Capital‑Ship Guns
    '280mm':  { type: 'main',      damage: 275, range: 28, reload: 12,penetration: 245, ammo: 32,  barrels: 1 },
    '283mm':  { type: 'main',      damage: 280, range: 28, reload: 12,penetration: 250, ammo: 30,  barrels: 1 },
    '305mm':  { type: 'main',      damage: 350, range: 32, reload: 15,penetration: 300, ammo: 25,  barrels: 1 },
    '320mm':  { type: 'main',      damage: 380, range: 33, reload: 16,penetration: 320, ammo: 23,  barrels: 1 },
    '330mm':  { type: 'main',      damage: 400, range: 34, reload: 17,penetration: 340, ammo: 22,  barrels: 1 },
    '340mm':  { type: 'main',      damage: 410, range: 34, reload: 17,penetration: 350, ammo: 21,  barrels: 1 },
    '343mm':  { type: 'main',      damage: 420, range: 35, reload: 17,penetration: 360, ammo: 21,  barrels: 1 },
    '356mm':  { type: 'main',      damage: 450, range: 36, reload: 18,penetration: 380, ammo: 20,  barrels: 1 },
    '380mm':  { type: 'main',      damage: 480, range: 38, reload: 19,penetration: 400, ammo: 18,  barrels: 1 },
    '381mm':  { type: 'main',      damage: 500, range: 38, reload: 20,penetration: 420, ammo: 17,  barrels: 1 },
    '406mm':  { type: 'main',      damage: 580, range: 40, reload: 22,penetration: 480, ammo: 15,  barrels: 1 },
    '410mm':  { type: 'main',      damage: 600, range: 41, reload: 23,penetration: 500, ammo: 14,  barrels: 1 },
    '457mm':  { type: 'main',      damage: 720, range: 44, reload: 28,penetration: 580, ammo: 10,  barrels: 1 },
    '460mm':  { type: 'main',      damage: 750, range: 45, reload: 30,penetration: 600, ammo: 8,   barrels: 1 },
    '480mm':  { type: 'main',      damage: 850, range: 48, reload: 35,penetration: 680, ammo: 6,   barrels: 1 },

    // Torpedoes (by warhead diameter/tube size)
    '324mm': { type: 'torpedo',    damage: 120,  range: 4,    reload: 25, penetration: 100,  ammo: 4, barrels: 1 },
    '356mm': { type: 'torpedo',    damage: 150,  range: 5,    reload: 30, penetration: 150,  ammo: 4, barrels: 1 },
    '450mm': { type: 'torpedo',    damage: 400,  range: 8,    reload: 45, penetration: 999,  ammo: 6, barrels: 1 },
    '483mm': { type: 'torpedo',    damage: 420,  range: 8.5,  reload: 47, penetration: 999,  ammo: 6, barrels: 1 },
    '533mm': { type: 'torpedo',    damage: 500,  range: 10,   reload: 50, penetration: 1100, ammo: 6, barrels: 1 },
    '550mm': { type: 'torpedo',    damage: 520,  range: 10.5, reload: 52, penetration: 1150, ammo: 6, barrels: 1 },
    '610mm': { type: 'torpedo',    damage: 700,  range: 20,   reload: 60, penetration: 1400, ammo: 6, barrels: 1 },
    '650mm': { type: 'torpedo',    damage: 800,  range: 22,   reload: 65, penetration: 1500, ammo: 4, barrels: 1 },
    '750mm': { type: 'torpedo',    damage: 1000, range: 25,   reload: 75, penetration: 2000, ammo: 2, barrels: 1 },
    '850mm': { type: 'torpedo',    damage: 1250, range: 20,   reload: 90, penetration: 999,  ammo: 1, barrels: 1 }
};

const CONFIG_MULTIPLIERS = {
    'single': { damage: 1.0, barrels: 1, reload: 1.0, name: 'Single Mount' },
    'twin': { damage: 1.8, barrels: 2, reload: 0.9, name: 'Twin Mount' },
    'triple': { damage: 2.6, barrels: 3, reload: 0.85, name: 'Triple Mount' },
    'quad': { damage: 3.2, barrels: 4, reload: 0.8, name: 'Quad Mount' },
    'quin': { damage: 3.8, barrels: 5, reload: 0.75, name: 'Quintuple Mount' },
    'sext': { damage: 4.4, barrels: 6, reload: 0.7, name: 'Sextuple Mount' }
};

const QUALITY_MODIFIERS = {
    'standard': { damage: 1.0, reload: 1.0, accuracy: 1.0,  name: 'Standard Quality' },
    'enhanced': { damage: 1.1, reload: 0.9, accuracy: 1.1,  name: 'Enhanced Quality' },
    'elite':    { damage: 1.2, reload: 0.8, accuracy: 1.25, name: 'Elite Quality' }
};

const AIRCRAFT_DEFAULTS = {
    'fighter': { damage: 45,  range: 10, hp: 25, specialAbility: 'fighter', description: 'Air superiority and fleet defense' },
    'bomber':  { damage: 80,  range: 8,  hp: 35, specialAbility: 'bomb',    description: 'Precision anti-ship strikes' },
    'torpedo': { damage: 120, range: 7,  hp: 30, specialAbility: 'torpedo', description: 'Heavy torpedo attacks' }
};

function calculateAAEffectiveness(caliber, mountType, barrels, experienceLevel) {
    const caliberData = AA_CALIBERS[caliber];
    if (!caliberData) return null;
    
    const mountMultiplier = AA_MOUNT_MULTIPLIERS[mountType] || 1.0;
    
    // Experience bonus: Level 1 = 60%, Level 10 = 95% effectiveness
    const experienceBonus = 0.6 + (experienceLevel - 1) * 0.035;
    
    // Barrel count affects total firepower (diminishing returns)
    const barrelMultiplier = 1 + (barrels - 1) * 0.15;
    
    return {
        damage: Math.round(caliberData.damage * mountMultiplier * experienceBonus * barrelMultiplier),
        range: Math.round(caliberData.range * experienceBonus),
        accuracy: Math.min(0.95, caliberData.accuracy * experienceBonus), // Cap at 95%
        rateOfFire: Math.round(caliberData.rateOfFire * mountMultiplier),
        category: caliberData.category
    };
}

function getCalibersByCategory(category) {
    return Object.keys(AA_CALIBERS).filter(caliber => AA_CALIBERS[caliber].category === category);
}

// Helper function to get category description
function getCategoryDescription(category) {
    const descriptions = {
        'short': 'High rate of fire, close-in defense against low-flying aircraft',
        'medium': 'Balanced performance, main AA defense zone',
        'long': 'Heavy guns with long range, early warning and high-altitude engagement'
    };
    return descriptions[category] || 'Unknown category';
}

class PlayerCreationModule {

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             INITIALIZATION & SETUP                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    constructor(bot) {
        this.bot = bot;
        this.initializePenetrationCalculator(); // ADD THIS LINE

        
        // Initialize temp data storage
        if (!this.bot.tempPlayerData) {
            this.bot.tempPlayerData = new Map();
        }
    }

    async createPlayers(interaction) {
        // Check staff permissions
        if (!this.bot.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to create characters.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        await this.showPlayerCreationForm(interaction);
    }

    initializePenetrationCalculator() {
        this.penetrationCalculator = new PenetrationCalculator();
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          MATHEMATICAL CALCULATIONS                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    // Ship Statistics
    calculateShipHP(tonnage, shipClass) {
        const shipParams = {
            'Destroyer': { baseHP: 40, multiplier: 0.012, bonus: 0 },
            'Light Cruiser': { baseHP: 80, multiplier: 0.008, bonus: 20 },
            'Heavy Cruiser': { baseHP: 100, multiplier: 0.007, bonus: 30 },
            'Battleship': { baseHP: 200, multiplier: 0.005, bonus: 100 },
            'Aircraft Carrier': { baseHP: 150, multiplier: 0.006, bonus: 50 },
            'Light Aircraft Carrier': { baseHP: 120, multiplier: 0.007, bonus: 30 },
            'Submarine': { baseHP: 30, multiplier: 0.015, bonus: -10 },
            'Auxiliary': { baseHP: 60, multiplier: 0.004, bonus: 10 }
        };
        
        const params = shipParams[shipClass];
        if (!params) {
            console.warn(`Unknown ship class: ${shipClass}, using default values`);
            return 100;
        }
        
        const calculatedHP = Math.round(params.baseHP + (tonnage * params.multiplier) + params.bonus);
        return Math.max(calculatedHP, 20);
    }

    calculateShipArmor(beltMM, deckMM, turretMM) {
        // Simplified formula: Belt × 0.6 + Deck × 0.25 + Turret × 0.15
        const calculatedArmor = (beltMM * 0.6) + (deckMM * 0.25) + (turretMM * 0.15);
        
        // Apply bounds: minimum 5, maximum 500
        const finalArmor = Math.max(5, Math.min(Math.round(calculatedArmor), 500));
        
        return finalArmor;
    }

    calculateShipSpeed(speedKnots) {
        // Speed thresholds based on knots
        if (speedKnots < 20) return 3;
        if (speedKnots >= 21 && speedKnots <= 24) return 4;
        if (speedKnots >= 25 && speedKnots <= 28) return 5;
        if (speedKnots >= 29 && speedKnots <= 31) return 6;
        if (speedKnots >= 32 && speedKnots <= 35) return 7;
        if (speedKnots >= 36 && speedKnots <= 39) return 8;
        if (speedKnots >= 40) return 9;
        
        // Fallback for edge cases
        return 3;
    }

    calculateShipEvasion(speedKnots, tonnage) {
        const baseEvasion = 0.1; // 10% baseline chance
        const referenceSpeed = 25; // knots (typical cruiser speed)
        const referenceSize = 8000; // tons (heavy cruiser)
        
        // Speed Factor: (Ship Speed / Reference Speed)²
        const speedFactor = Math.pow(speedKnots / referenceSpeed, 2);
        
        // Size Factor: √(Reference Size / Ship Displacement)
        const sizeFactor = Math.sqrt(referenceSize / tonnage);
        
        // Final evasion calculation
        const evasionChance = baseEvasion * speedFactor * sizeFactor;
        
        // Convert to percentage and round to 1 decimal place
        const evasionPercentage = Math.round(evasionChance * 1000) / 10;
        
        // Cap between 1% and 75% for game balance
        const finalEvasion = Math.max(1.0, Math.min(evasionPercentage, 75.0));
        
        return {
            evasionPercentage: finalEvasion,
            speedFactor: Math.round(speedFactor * 100) / 100,
            sizeFactor: Math.round(sizeFactor * 100) / 100,
            calculation: {
                baseEvasion: baseEvasion,
                referenceSpeed: referenceSpeed,
                referenceSize: referenceSize,
                rawEvasion: Math.round(evasionChance * 1000) / 1000
            }
        };
    }

    // Weapon Statistics
    calculateWeaponDamage(shellWeight, barrelCount, quality = 'Standard', weaponBonus = 0) {
        const qualityModifiers = {
            'Poor': 0.85,
            'Standard': 1.0, 
            'High': 1.15,
            'Exceptional': 1.3
        };
        
        const qualityModifier = qualityModifiers[quality] || 1.0;
        
        const baseDamage = (shellWeight * 0.2) + (barrelCount * 4) + weaponBonus;
        
        const barrelEfficiency = Math.max(0.8, 1.0 - ((barrelCount - 1) * 0.05));
        
        const finalDamage = Math.round(baseDamage * barrelEfficiency * qualityModifier);
        
        return {
            baseDamage: Math.round(baseDamage),
            barrelEfficiency: barrelEfficiency,
            qualityModifier: qualityModifier,
            finalDamage: finalDamage
        };
    }

    calculateGunRange(caliberMM) {
        // Range table based on caliber
        const rangeTable = {
            20: 2, 25: 2, 30: 2, 37: 3, 40: 3, 50: 4, 76: 5, 88: 6, 100: 6,
            114: 7, 127: 8, 130: 8, 140: 9, 150: 9, 152: 9, 155: 10, 180: 10,
            203: 12, 234: 13, 280: 16, 305: 18, 330: 19, 356: 20, 380: 21,
            381: 21, 406: 22, 410: 22, 420: 23, 467: 24, 460: 24, 480: 25,
            508: 26, 530: 27
        };
        
        // Check for exact match first
        if (rangeTable[caliberMM]) {
            return rangeTable[caliberMM];
        }
        
        // Get sorted caliber array
        const calibers = Object.keys(rangeTable).map(Number).sort((a, b) => a - b);
        
        // Handle edge cases
        if (caliberMM <= calibers[0]) {
            return rangeTable[calibers[0]];
        }
        if (caliberMM >= calibers[calibers.length - 1]) {
            return rangeTable[calibers[calibers.length - 1]];
        }
        
        // Find the two calibers to interpolate between
        let lowerCaliber = calibers[0];
        let upperCaliber = calibers[calibers.length - 1];
        
        for (let i = 0; i < calibers.length - 1; i++) {
            if (caliberMM >= calibers[i] && caliberMM <= calibers[i + 1]) {
                lowerCaliber = calibers[i];
                upperCaliber = calibers[i + 1];
                break;
            }
        }
        
        // Interpolate between the two values
        const lowerRange = rangeTable[lowerCaliber];
        const upperRange = rangeTable[upperCaliber];
        const ratio = (caliberMM - lowerCaliber) / (upperCaliber - lowerCaliber);
        
        return Math.round(lowerRange + (upperRange - lowerRange) * ratio);
    }

    calculateAccuracy(attacker, target, distance, weapon, weather) {
        // Use base accuracy instead of fixed accuracy
        let baseAccuracy = (attacker.stats.baseAccuracy || attacker.stats.accuracy) / 100;
        
        // Get weapon range for distance penalty calculation
        const weaponData = attacker.weapons[weapon];
        const maxRange = weaponData ? weaponData.range : (attacker.stats.range || 8);
        
        // IMPROVED RANGE PENALTY SYSTEM:
        // Calculate range ratio (0.0 = point blank, 1.0 = maximum range)
        const rangeRatio = Math.min(distance / maxRange, 1.2); // Allow slight over-range shots
        
        // Range penalty curve - more realistic falloff
        let rangePenalty;
        if (rangeRatio <= 0.3) {
            // Point blank to close range: minimal penalty
            rangePenalty = rangeRatio * 0.05; // 0% to 1.5% penalty
        } else if (rangeRatio <= 0.6) {
            // Close to medium range: moderate penalty  
            rangePenalty = 0.015 + (rangeRatio - 0.3) * 0.15; // 1.5% to 6% penalty
        } else if (rangeRatio <= 1.0) {
            // Medium to maximum range: steep penalty
            rangePenalty = 0.06 + (rangeRatio - 0.6) * 0.35; // 6% to 20% penalty
        } else {
            // Over maximum range: severe penalty
            rangePenalty = 0.20 + (rangeRatio - 1.0) * 0.4; // 20%+ penalty
        }
        
        baseAccuracy -= rangePenalty;
        
        // Evasion bonus (unchanged)
        let targetEvasion;
        if (target.tonnage && target.speedKnots) {
            targetEvasion = this.calculateShipEvasion(target.speedKnots, target.tonnage);
        } else {
            targetEvasion = target.stats.evasion || 20;
        }
        
        const evasionBonus = (targetEvasion / 100) * 0.2;
        baseAccuracy -= evasionBonus;
        
        // Weather modifier (unchanged)
        const weatherModifier = this.getWeatherAccuracyModifier(weather);
        baseAccuracy *= weatherModifier;
        
        // Final accuracy bounds
        return Math.max(0.05, Math.min(0.95, baseAccuracy));
    }

    // Aircraft Statistics
    calculateHangarCapacity(tonnage, shipClass) {
        if (shipClass !== 'Aircraft Carrier' && shipClass !== 'Light Aircraft Carrier') return 0;
        
        let baseCapacity;
        
        if (shipClass === 'Light Aircraft Carrier') {
            // Light carriers: more efficient per ton but smaller overall
            if (tonnage <= 10000) {
                baseCapacity = Math.floor(tonnage / 150);
            } else if (tonnage <= 20000) {
                baseCapacity = Math.floor(tonnage / 200) + 8;
            } else {
                baseCapacity = Math.floor(tonnage / 300) + 18;
            }
            return Math.max(18, Math.min(baseCapacity, 60));
        } else {
            // Regular Aircraft Carriers
            if (tonnage <= 15000) {
                // Light carriers: very efficient
                baseCapacity = Math.floor(tonnage / 180);
            } else if (tonnage <= 30000) {
                // Fleet carriers: optimal sweet spot
                baseCapacity = Math.floor(tonnage / 280) + 12;
            } else if (tonnage <= 50000) {
                // Large carriers: noticeable diminishing returns
                baseCapacity = Math.floor(tonnage / 450) + 25;
            } else {
                // Super-heavy carriers: heavy penalty
                baseCapacity = Math.floor(tonnage / 700) + 35;
            }
            return Math.max(30, Math.min(baseCapacity, 110));
        }
    }

    calculateMaxSquadrons(tonnage, shipClass) {
        const squadronSize = this.getSquadronSize(shipClass);
        if (squadronSize === 0) return 0;
        
        const hangarCapacity = this.calculateHangarCapacity(tonnage, shipClass);
        const maxSquadrons = Math.floor(hangarCapacity / squadronSize);
        
        // Limit to 3 squadrons maximum for gameplay balance
        return Math.min(maxSquadrons, 3);
    }

    getSquadronSize(shipClass) {
        switch (shipClass) {
            case 'Aircraft Carrier':
                return 12;
            case 'Light Aircraft Carrier':
                return 6;
            default:
                return 0; 
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           PARSAING & VALIDATION                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝  

    // Aircraft Parsing
    parseAircraftString(aircraftString, squadronType, shipClass) {
        const parts = aircraftString.split(',').map(part => part.trim());
        
        if (parts.length < 3) {
            return { error: `${squadronType} must have format: Name,Range,Damage[,HP][,SpecialAbility]` };
        }

        const [name, range, damage, hpOrAbility, specialAbility] = parts;

        // Parse numeric values
        const rangeNum = parseInt(range);
        const damageNum = parseInt(damage);
        
        // Determine if 4th parameter is HP or special ability
        let hpNum = 25; // Default HP
        let finalSpecialAbility = 'none';
        
        if (hpOrAbility) {
            const hpCandidate = parseInt(hpOrAbility);
            if (!isNaN(hpCandidate)) {
                // 4th parameter is HP
                hpNum = hpCandidate;
                finalSpecialAbility = specialAbility || 'none';
            } else {
                // 4th parameter is special ability
                finalSpecialAbility = hpOrAbility.toLowerCase();
            }
        }

        // Validate numeric values
        if (isNaN(rangeNum) || isNaN(damageNum)) {
            return { error: 'Range and Damage must be numbers' };
        }

        // Validate ranges
        if (rangeNum < 1 || rangeNum > 30) {
            return { error: 'Range must be between 1 and 30 cells' };
        }
        if (damageNum < 1 || damageNum > 500) {
            return { error: 'Damage must be between 1 and 500' };
        }
        if (hpNum < 1 || hpNum > 100) {
            return { error: 'Aircraft HP must be between 1 and 100' };
        }

        // Validate special abilities
        const validAbilities = ['none', 'torpedo', 'bomb', 'fighter', 'reconnaissance', 'anti_sub'];
        if (!validAbilities.includes(finalSpecialAbility)) {
            return { error: `Special ability must be one of: ${validAbilities.join(', ')}` };
        }

        // Get fixed squadron size based on ship class
        const squadronSize = this.getSquadronSize(shipClass);
        if (squadronSize === 0) {
            return { error: 'This ship class cannot carry aircraft squadrons' };
        }

        return {
            name: name,
            count: squadronSize,
            maxCount: squadronSize,
            range: rangeNum,
            damage: damageNum,
            hp: hpNum,                                    // NEW: Individual aircraft HP
            maxHP: hpNum,                                 // NEW: For repairs
            squadronHP: hpNum * squadronSize,             // NEW: Total squadron HP
            maxSquadronHP: hpNum * squadronSize,          // NEW: Max squadron HP
            quality: 'Standard',
            specialAbility: finalSpecialAbility,
            fuel: 100,
            readiness: 100
        };
    }

    calculateSquadronStatus(squadron) {
        if (!squadron || !squadron.squadronHP || !squadron.maxSquadronHP) {
            return {
                effectiveCount: squadron.count || 0,
                hpPercentage: 100,
                status: 'Unknown',
                canOperate: true
            };
        }

        const hpPercentage = Math.round((squadron.squadronHP / squadron.maxSquadronHP) * 100);
        
        // Calculate effective aircraft count based on HP
        const effectiveCount = Math.ceil((squadron.squadronHP / squadron.hp) * squadron.count / squadron.maxCount);
        
        let status;
        let canOperate = true;
        
        if (hpPercentage >= 90) {
            status = 'Combat Ready';
        } else if (hpPercentage >= 70) {
            status = 'Light Damage';
        } else if (hpPercentage >= 50) {
            status = 'Moderate Damage';
        } else if (hpPercentage >= 25) {
            status = 'Heavy Damage';
        } else if (hpPercentage > 0) {
            status = 'Critical Damage';
        } else {
            status = 'Destroyed';
            canOperate = false;
        }

        return {
            effectiveCount: Math.max(0, effectiveCount),
            hpPercentage: hpPercentage,
            status: status,
            canOperate: canOperate,
            aircraftLost: squadron.maxCount - effectiveCount
        };
    }

    damageSquadron(squadron, damageAmount) {
        if (!squadron || !squadron.squadronHP) {
            return {
                success: false,
                error: 'Invalid squadron data'
            };
        }

        const previousHP = squadron.squadronHP;
        const previousStatus = this.calculateSquadronStatus(squadron);
        
        // Apply damage
        squadron.squadronHP = Math.max(0, squadron.squadronHP - damageAmount);
        
        // Update individual aircraft count based on remaining HP
        const hpPerAircraft = squadron.maxSquadronHP / squadron.maxCount;
        const newCount = Math.ceil(squadron.squadronHP / hpPerAircraft);
        squadron.count = Math.max(0, newCount);
        
        const newStatus = this.calculateSquadronStatus(squadron);
        
        return {
            success: true,
            damageDealt: damageAmount,
            damageAbsorbed: previousHP - squadron.squadronHP,
            previousHP: previousHP,
            currentHP: squadron.squadronHP,
            aircraftLost: previousStatus.effectiveCount - newStatus.effectiveCount,
            statusChange: {
                from: previousStatus.status,
                to: newStatus.status
            },
            destroyed: squadron.squadronHP <= 0
        };
    }

    repairSquadron(squadron, repairAmount) {
        if (!squadron || !squadron.squadronHP) {
            return {
                success: false,
                error: 'Invalid squadron data'
            };
        }

        const previousHP = squadron.squadronHP;
        const previousStatus = this.calculateSquadronStatus(squadron);
        
        // Apply repairs (cannot exceed max HP)
        squadron.squadronHP = Math.min(squadron.maxSquadronHP, squadron.squadronHP + repairAmount);
        
        // Update aircraft count
        const hpPerAircraft = squadron.maxSquadronHP / squadron.maxCount;
        const newCount = Math.ceil(squadron.squadronHP / hpPerAircraft);
        squadron.count = Math.min(squadron.maxCount, newCount);
        
        const newStatus = this.calculateSquadronStatus(squadron);
        
        return {
            success: true,
            repairAmount: repairAmount,
            hpRestored: squadron.squadronHP - previousHP,
            previousHP: previousHP,
            currentHP: squadron.squadronHP,
            aircraftRepaired: newStatus.effectiveCount - previousStatus.effectiveCount,
            statusChange: {
                from: previousStatus.status,
                to: newStatus.status
            },
            fullyRepaired: squadron.squadronHP >= squadron.maxSquadronHP
        };
    }

    calculateAircraftDamage(attackDamage, targetSquadron, attackerAccuracy = 0.7) {
        // Apply accuracy to determine if attack hits
        const hitRoll = Math.random();
        if (hitRoll > attackerAccuracy) {
            return {
                hit: false,
                damage: 0,
                result: 'Miss - No damage to squadron'
            };
        }
        
        // Calculate actual damage (some randomization)
        const damageVariation = 0.8 + (Math.random() * 0.4); // 80% to 120% of base damage
        const actualDamage = Math.round(attackDamage * damageVariation);
        
        // Apply damage to squadron
        const damageResult = this.damageSquadron(targetSquadron, actualDamage);
        
        let resultMessage = `Hit! ${damageResult.damageAbsorbed} damage dealt`;
        if (damageResult.aircraftLost > 0) {
            resultMessage += ` - ${damageResult.aircraftLost} aircraft shot down!`;
        }
        if (damageResult.destroyed) {
            resultMessage += ' - Squadron destroyed!';
        }
        
        return {
            hit: true,
            damage: actualDamage,
            damageAbsorbed: damageResult.damageAbsorbed,
            aircraftLost: damageResult.aircraftLost,
            destroyed: damageResult.destroyed,
            result: resultMessage,
            statusChange: damageResult.statusChange
        };
    }

    // Weapon Parsing
    parseWeaponString(weaponString, weaponType) {
        return this.parseWeaponStringWithAutoPenetration(weaponString, weaponType);
    }

    parseWeaponStringWithAutoPenetration(weaponString, weaponType) {
        const parts = weaponString.split(',').map(part => part.trim());
        
        // New simplified format: Name,ShellWeight,BarrelCount,Caliber,Reload,Ammo,BarrelLength,AmmoTypes
        if (parts.length < 7) {
            return { error: `${weaponType} must have format: Name,ShellWeight,BarrelCount,Caliber,Reload,Ammo,BarrelLength,AmmoTypes` };
        }

        const [name, shellWeight, barrelCount, caliber, reload, ammo, barrelLength, ...ammoTypes] = parts;

        // Validate numeric values
        const shellWeightNum = parseFloat(shellWeight);
        const barrelCountNum = parseInt(barrelCount);
        const caliberMM = parseInt(caliber);
        const reloadNum = parseInt(reload);
        const ammoNum = parseInt(ammo);
        const barrelLengthNum = parseInt(barrelLength) || 50; // Default L/50

        if (isNaN(shellWeightNum) || isNaN(barrelCountNum) || isNaN(caliberMM) || isNaN(reloadNum) || isNaN(ammoNum)) {
            return { error: 'Shell Weight, Barrel Count, Caliber, Reload, and Ammo must be numbers' };
        }

        // Validate ranges
        if (shellWeightNum < 0.1 || shellWeightNum > 2000) {
            return { error: 'Shell Weight must be between 0.1kg and 2000kg' };
        }
        if (barrelCountNum < 1 || barrelCountNum > 50) { // Increased for AA guns
            return { error: 'Barrel Count must be between 1 and 50' };
        }
        if (caliberMM < 20 || caliberMM > 600) {
            return { error: 'Caliber must be between 20mm and 600mm' };
        }
        if (reloadNum < 1 || reloadNum > 10) {
            return { error: 'Reload must be between 1 and 10' };
        }
        if (ammoNum < 1 || ammoNum > 1000) {
            return { error: 'Ammo must be between 1 and 1000' };
        }

        // Validate ammo types
        const validAmmoTypes = ['ap', 'he', 'torpedo'];
        const invalidAmmoTypes = ammoTypes.filter(type => !validAmmoTypes.includes(type.toLowerCase()));
        if (invalidAmmoTypes.length > 0) {
            return { error: `Invalid ammo types: ${invalidAmmoTypes.join(', ')}. Valid types: ${validAmmoTypes.join(', ')}` };
        }

        // Calculate penetration for each ammo type (all standard quality)
        const penetrationData = {};
        const primaryAmmoType = ammoTypes[0]?.toLowerCase() || 'ap';
        
        for (const ammoType of ammoTypes) {
            const penetrationResult = this.penetrationCalculator.calculatePenetration(
                caliberMM, 
                ammoType.toLowerCase(), 
                barrelLengthNum
            );
            penetrationData[ammoType.toLowerCase()] = penetrationResult;
        }

        // Use primary ammo type for main penetration value
        const primaryPenetration = penetrationData[primaryAmmoType]?.penetration || 0;

        // Calculate damage and range automatically
        const damageCalc = this.calculateWeaponDamage(shellWeightNum, barrelCountNum, 'Standard', 0);
        const calculatedRange = this.calculateGunRange(caliberMM);

        return {
            name: name,
            shellWeight: shellWeightNum,
            barrelCount: barrelCountNum,
            caliber: caliberMM,
            damage: damageCalc.finalDamage,
            range: calculatedRange,
            reload: reloadNum,
            ammo: ammoNum,
            penetration: primaryPenetration, // Auto-calculated
            quality: 'Standard', // All weapons are standard quality
            barrelLength: barrelLengthNum,
            ammoTypes: ammoTypes.map(type => type.toLowerCase()),
            penetrationData: penetrationData, // Detailed penetration for all ammo types
            // Store calculation details for reference
            damageCalculation: damageCalc,
            rangeCalculation: {
                baseRange: Math.floor(caliberMM / 25),
                caliberBonus: calculatedRange - Math.floor(caliberMM / 25)
            }
        };
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PLAYER CREATION WORKFLOW                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝  

    // Basic Information
    async showPlayerCreationForm(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(`create_player_${interaction.user.id}`)
            .setTitle('Create Player Entry');

        const characterNameInput = new TextInputBuilder()
            .setCustomId('character_name')
            .setLabel('Character Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('USS Enterprise, KMS Bismarck, etc.')
            .setRequired(true)
            .setMaxLength(50);

        const playerIdInput = new TextInputBuilder()
            .setCustomId('player_id')
            .setLabel('Player Discord ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('123456789012345678')
            .setRequired(true)
            .setMaxLength(20);

        const usernameInput = new TextInputBuilder()
            .setCustomId('username')
            .setLabel('Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('PlayerName')
            .setRequired(true)
            .setMaxLength(32);

        const shipClassInput = new TextInputBuilder()
            .setCustomId('ship_class')
            .setLabel('Ship Class')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Destroyer, Light Cruiser, Heavy Cruiser, etc.')
            .setRequired(true)
            .setMaxLength(50);

        const tonnageSpeedInput = new TextInputBuilder()
            .setCustomId('tonnage_speed')
            .setLabel('Tonnage,Speed (e.g., 2500,35)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('2500,35')
            .setRequired(true)
            .setMaxLength(15);

        const armorInput = new TextInputBuilder()
            .setCustomId('armor_thicknesses')
            .setLabel('Belt,Deck,Turret Armor (mm) e.g., 25,15,10')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('25,15,10')
            .setRequired(true)
            .setMaxLength(20);

        modal.addComponents(
            new ActionRowBuilder().addComponents(playerIdInput),
            new ActionRowBuilder().addComponents(usernameInput),
            new ActionRowBuilder().addComponents(shipClassInput),
            new ActionRowBuilder().addComponents(tonnageSpeedInput),
            new ActionRowBuilder().addComponents(armorInput)
        );

        await interaction.showModal(modal);
    }

    async handlePlayerCreationSubmit(interaction) {
        const playerId = interaction.fields.getTextInputValue('player_id');
        const username = interaction.fields.getTextInputValue('username');
        const shipClass = interaction.fields.getTextInputValue('ship_class').trim();
        const tonnageSpeed = interaction.fields.getTextInputValue('tonnage_speed').split(',');
        const armorThicknesses = interaction.fields.getTextInputValue('armor_thicknesses').split(',');

        // Validate inputs
        if (!playerId.match(/^\d{17,20}$/)) {
            return interaction.reply({ content: '❌ Invalid Discord ID format!', flags: MessageFlags.Ephemeral });
        }

        // Validate tonnage and speed
        if (tonnageSpeed.length !== 2) {
            return interaction.reply({ content: '❌ Tonnage and Speed must be in format: tonnage,speed (e.g., 2500,35)!', flags: MessageFlags.Ephemeral });
        }

        const tonnage = parseInt(tonnageSpeed[0].trim());
        const speedKnots = parseFloat(tonnageSpeed[1].trim());

        if (isNaN(tonnage) || tonnage < 100 || tonnage > 100000) {
            return interaction.reply({ content: '❌ Tonnage must be a number between 100 and 100,000!', flags: MessageFlags.Ephemeral });
        }

        if (isNaN(speedKnots) || speedKnots < 5 || speedKnots > 50) {
            return interaction.reply({ content: '❌ Speed must be a number between 5 and 50 knots!', flags: MessageFlags.Ephemeral });
        }

        // Validate armor
        if (armorThicknesses.length !== 3) {
            return interaction.reply({ content: '❌ Armor must be in format: belt,deck,turret (e.g., 25,15,10)!', flags: MessageFlags.Ephemeral });
        }

        const beltMM = parseInt(armorThicknesses[0].trim());
        const deckMM = parseInt(armorThicknesses[1].trim());
        const turretMM = parseInt(armorThicknesses[2].trim());

        if (isNaN(beltMM) || isNaN(deckMM) || isNaN(turretMM)) {
            return interaction.reply({ content: '❌ All armor values must be numbers!', flags: MessageFlags.Ephemeral });
        }

        if (beltMM < 0 || beltMM > 500 || deckMM < 0 || deckMM > 300 || turretMM < 0 || turretMM > 700) {
            return interaction.reply({ content: '❌ Armor values out of range! Belt: 0-500mm, Deck: 0-300mm, Turret: 0-700mm', flags: MessageFlags.Ephemeral });
        }

        // Validate and normalize ship class (accept abbreviations)
        const shipClassMapping = {
            'DD': 'Destroyer',
            'CL': 'Light Cruiser',
            'CA': 'Heavy Cruiser',
            'BB': 'Battleship',
            'CV': 'Aircraft Carrier',
            'CVL': 'Light Aircraft Carrier',
            'SS': 'Submarine',
            'AX': 'Auxiliary',
            'Destroyer': 'Destroyer',
            'Light Cruiser': 'Light Cruiser',
            'Heavy Cruiser': 'Heavy Cruiser',
            'Battleship': 'Battleship',
            'Aircraft Carrier': 'Aircraft Carrier',
            'Light Aircraft Carrier': 'Light Aircraft Carrier',
            'Submarine': 'Submarine',
            'Auxiliary': 'Auxiliary'
        };

        const normalizedShipClass = shipClassMapping[shipClass];
        if (!normalizedShipClass) {
            return interaction.reply({
                content: `❌ Invalid ship class! Must be one of: DD (Destroyer), CL (Light Cruiser), CA (Heavy Cruiser), BB (Battleship), CV (Aircraft Carrier), CVL (Light Aircraft Carrier), SS (Submarine), AX (Auxiliary)`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Use the normalized (full) ship class name
        const finalShipClass = normalizedShipClass;

        // Check player entry and character slots (FIXED VERSION - guild-scoped)
        const guildId = interaction.guildId;
        let playerEntry = this.bot.getGuildPlayerData(guildId, playerId);

        // Check if player exists and how many characters they have
        if (playerEntry) {
            // If old data structure (no characters property), migrate it first
            if (!playerEntry.characters) {
                // Convert old single character to new structure
                const oldCharacterData = playerEntry;
                const newPlayerEntry = {
                    characters: new Map([[oldCharacterData.username || 'Character 1', oldCharacterData]]),
                    activeCharacter: oldCharacterData.username || 'Character 1',
                    maxCharacters: 2
                };
                this.bot.setGuildPlayerData(guildId, playerId, newPlayerEntry);
                playerEntry = newPlayerEntry; // Update reference
            }

            // Check character limit
            if (playerEntry.characters.size >= 2) {
                return interaction.reply({
                    content: '❌ Player already has maximum number of characters (2)! Delete a character first using character management commands.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // Check for duplicate usernames across all characters
        let existingPlayerWithUsername = null;
        for (const [pid, pEntry] of this.bot.playerData.entries()) {
            if (pEntry.characters) {
                // New multi-character structure
                for (const [charName, charData] of pEntry.characters) {
                    if (charData.username && charData.username.toLowerCase() === username.toLowerCase()) {
                        existingPlayerWithUsername = charData;
                        break;
                    }
                }
            } else if (pEntry.username && pEntry.username.toLowerCase() === username.toLowerCase()) {
                // Old single-character structure
                existingPlayerWithUsername = pEntry;
            }
            if (existingPlayerWithUsername) break;
        }

        if (existingPlayerWithUsername) {
            // Handle overwrite confirmation if needed
            // For now, just prevent duplicate usernames
            return interaction.reply({ 
                content: `❌ A character with username "${username}" already exists! Please choose a different username.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Calculate HP, Armor, Speed, and Aircraft Capacity
        const calculatedHP = this.calculateShipHP(tonnage, finalShipClass);
        const calculatedArmor = this.calculateShipArmor(beltMM, deckMM, turretMM);
        const calculatedSpeed = this.calculateShipSpeed(speedKnots);
        const calculatedEvasion = this.calculateShipEvasion(speedKnots, tonnage);
        const hangarCapacity = this.calculateHangarCapacity(tonnage, finalShipClass);

        // Create player data with calculated values
        const basicPlayerData = {
            id: playerId,
            username: username,
            shipClass: finalShipClass,
            tonnage: tonnage,
            speedKnots: speedKnots,
            armorThickness: {
                belt: beltMM,
                deck: deckMM,
                turret: turretMM
            },
            calculatedHP: calculatedHP,
            calculatedArmor: calculatedArmor,
            calculatedSpeed: calculatedSpeed,
            calculatedEvasion: calculatedEvasion,
            hangar: hangarCapacity,
            level: 1, // Default values
            experience: 0,
            currency: 0
        };

        // Store temp data
        if (!this.bot.tempPlayerData) this.bot.tempPlayerData = new Map();
        this.bot.tempPlayerData.set(interaction.user.id, basicPlayerData);

        // If Aircraft Carrier, show aircraft configuration first
        if (finalShipClass === 'Aircraft Carrier' || finalShipClass === 'Light Aircraft Carrier') {
            await this.continueToAircraftConfiguration(interaction, basicPlayerData);
        } else {
            await this.continueToStats(interaction, basicPlayerData);
        }
    }

    // Aircraft Configuration
    async continueToAircraftConfiguration(interaction, playerData) {
        this.bot.tempPlayerData.set(interaction.user.id, playerData);

        const squadronSize = this.getSquadronSize(playerData.shipClass);
        const maxSquadrons = this.calculateMaxSquadrons(playerData.tonnage, playerData.shipClass);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_aircraft_${interaction.user.id}`)
            .setLabel('Assign Available Aircraft Types')
            .setStyle(ButtonStyle.Primary);

        const skipButton = new ButtonBuilder()
            .setCustomId(`skip_aircraft_${interaction.user.id}`)
            .setLabel('Skip Aircraft (No Aircraft Available)')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton, skipButton);

        const embed = new EmbedBuilder()
            .setTitle('🛩️ Aircraft Carrier Detected!')
            .setDescription(`**Ship:** ${playerData.username} (${playerData.shipClass})\n` +
                           `**Hangar Capacity:** ${playerData.hangar} aircraft\n` +
                           `**Squadron Size:** ${squadronSize} aircraft per squadron\n` +
                           `**Maximum Squadrons:** ${maxSquadrons}\n\n` +
                           `**Aircraft Assignment (GM assigns available types):**\n` +
                           `• **Assign Aircraft Types**: Choose which aircraft types this player can use\n` +
                           `• **Skip Aircraft**: Create a carrier with no available aircraft\n\n` +
                           `**Note:** Players will select their actual squadrons when the battle starts.`)
            .setColor(0x0099FF);

        if (interaction.replied) {
            await interaction.followUp({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        }
    }

    async handleContinueAircraft(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (!interaction.customId.startsWith('continue_aircraft_')) {
            return interaction.reply({ content: '❌ Invalid aircraft configuration request!', flags: MessageFlags.Ephemeral });
        }
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your aircraft configuration!', flags: MessageFlags.Ephemeral });
        }
        
        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }
        
        // Show aircraft type assignment form
        await this.showAircraftAssignmentForm(interaction, playerData);
    }

    async showAircraftAssignmentForm(interaction, playerData) {
        const modal = new ModalBuilder()
            .setCustomId(`assign_simple_aircraft_${interaction.user.id}`)
            .setTitle(`Aircraft Assignment - ${playerData.username}`);

        const fighterNameInput = new TextInputBuilder()
            .setCustomId('fighter_name')
            .setLabel('Fighter Aircraft Name (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('F6F Hellcat, A6M Zero, Spitfire, etc.')
            .setRequired(false)
            .setMaxLength(50);

        const bomberNameInput = new TextInputBuilder()
            .setCustomId('bomber_name')
            .setLabel('Dive Bomber Aircraft Name (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('SBD Dauntless, D3A Val, Stuka, etc.')
            .setRequired(false)
            .setMaxLength(50);

        const torpedoNameInput = new TextInputBuilder()
            .setCustomId('torpedo_name')
            .setLabel('Torpedo Bomber Aircraft Name (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('TBF Avenger, B5N Kate, Swordfish, etc.')
            .setRequired(false)
            .setMaxLength(50);

        const instructionsInput = new TextInputBuilder()
            .setCustomId('instructions')
            .setLabel('Auto-Stats Info (Read Only)')
            .setStyle(TextInputStyle.Paragraph)
            .setValue('Fighters: 45 dmg, 10 range, 25 HP | Bombers: 80 dmg, 8 range, 35 HP | Torpedoes: 120 dmg, 7 range, 30 HP')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(fighterNameInput),
            new ActionRowBuilder().addComponents(bomberNameInput),
            new ActionRowBuilder().addComponents(torpedoNameInput),
            new ActionRowBuilder().addComponents(instructionsInput)
        );

        await interaction.showModal(modal);
    }

    createSimpleAircraft(customName, aircraftType, shipClass) {
        const defaults = AIRCRAFT_DEFAULTS[aircraftType.toLowerCase()];
        if (!defaults) {
            return { error: `Invalid aircraft type! Use: fighter, bomber, or torpedo` };
        }
        
        const squadronSize = this.getSquadronSize(shipClass);
        if (squadronSize === 0) {
            return { error: 'This ship class cannot carry aircraft squadrons' };
        }
        
        return {
            name: customName,
            count: squadronSize,
            maxCount: squadronSize,
            range: defaults.range,
            damage: defaults.damage,
            hp: defaults.hp,                          // NEW: Individual aircraft HP
            maxHP: defaults.hp,                       // NEW: For repair calculations
            squadronHP: defaults.hp * squadronSize,   // NEW: Total squadron HP
            maxSquadronHP: defaults.hp * squadronSize, // NEW: Max squadron HP
            quality: 'Standard',
            specialAbility: defaults.specialAbility,
            fuel: 100,
            readiness: 100,
            aircraftType: aircraftType.toLowerCase()
        };
    }

    async handleAircraftAssignmentSubmit(interaction) {
        const fighterName = interaction.fields.getTextInputValue('fighter_name')?.trim() || '';
        const bomberName = interaction.fields.getTextInputValue('bomber_name')?.trim() || '';
        const torpedoName = interaction.fields.getTextInputValue('torpedo_name')?.trim() || '';

        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }

        let availableAircraft = new Map();
        let aircraftDescriptions = [];

        // Create aircraft types based on what GM entered
        const aircraftInputs = [
            { name: fighterName, type: 'fighter', label: 'Fighter Aircraft' },
            { name: bomberName, type: 'bomber', label: 'Dive Bomber Aircraft' },
            { name: torpedoName, type: 'torpedo', label: 'Torpedo Bomber Aircraft' }
        ];

        for (const aircraft of aircraftInputs) {
            if (aircraft.name) {
                const created = this.createSimpleAircraft(aircraft.name, aircraft.type, playerData.shipClass);
                if (created.error) {
                    return interaction.reply({ content: `❌ ${aircraft.label} error: ${created.error}`, flags: MessageFlags.Ephemeral });
                }
                
                availableAircraft.set(aircraft.type, created);
                aircraftDescriptions.push(
                    `**${aircraft.label}:** ${created.name}\n` +
                    `  • Damage: ${created.damage}, Range: ${created.range} cells\n` +
                    `  • Aircraft HP: ${created.hp}, Squadron HP: ${created.squadronHP}\n` +
                    `  • Special: ${created.specialAbility}, Squadron Size: ${created.count} aircraft`
                );
            }
        }

        if (availableAircraft.size === 0) {
            return interaction.reply({ content: '❌ You must assign at least one aircraft type!', flags: MessageFlags.Ephemeral });
        }

        // Store available aircraft
        playerData.availableAircraft = availableAircraft;
        playerData.activeSquadrons = new Map();
        
        this.bot.tempPlayerData.set(interaction.user.id, playerData);

        // Show confirmation with HP information
        const squadronSize = this.getSquadronSize(playerData.shipClass);
        const maxSquadrons = this.calculateMaxSquadrons(playerData.tonnage, playerData.shipClass);

        const embed = new EmbedBuilder()
            .setTitle('✅ Aircraft Types Assigned with HP System!')
            .setDescription(
                `**Carrier:** ${playerData.username} (${playerData.shipClass})\n` +
                `**Squadron Size:** ${squadronSize} aircraft per squadron\n` +
                `**Maximum Squadrons:** ${maxSquadrons}\n\n` +
                `**Available Aircraft Types:**\n${aircraftDescriptions.join('\n\n')}\n\n` +
                `🛡️ **HP System:** Each aircraft has individual HP, squadrons have total HP!\n` +
                `💥 **Combat:** Damaged squadrons lose effectiveness as aircraft are shot down!\n` +
                `🔧 **Repairs:** Squadron HP can be restored to bring aircraft back into service!\n\n` +
                `✈️ **Note:** Player will select ${maxSquadrons} squadrons from these types when battle starts.`
            )
            .setColor(0x00FF00);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_stats_${interaction.user.id}`)
            .setLabel('Continue to Stats Configuration')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton);

        await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    async handleSkipAircraft(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your configuration!', flags: MessageFlags.Ephemeral });
        }
        
        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }

        // Add empty aircraft data
        playerData.availableAircraft = new Map();
        playerData.activeSquadrons = new Map();
        
        await this.continueToStats(interaction, playerData);
    }

    // Stats Configuration
    async continueToStats(interaction, playerData) {
        this.bot.tempPlayerData.set(interaction.user.id, playerData);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_stats_${interaction.user.id}`)
            .setLabel('Continue to Stats Configuration')
            .setStyle(ButtonStyle.Primary);

        const editButton = new ButtonBuilder()
            .setCustomId(`edit_player_info_${interaction.user.id}`)
            .setLabel('Edit Basic Info')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton, editButton);

        // Build description based on ship type
        let description = `**Player:** ${playerData.username}\n` +
                         `**Ship Class:** ${playerData.shipClass}\n` +
                         `**Tonnage:** ${playerData.tonnage.toLocaleString()} tons\n` +
                         `**Speed:** ${playerData.speedKnots} knots\n\n` +
                         `**Armor Thickness:**\n` +
                         `• Belt: ${playerData.armorThickness.belt}mm\n` +
                         `• Deck: ${playerData.armorThickness.deck}mm\n` +
                         `• Turret: ${playerData.armorThickness.turret}mm\n\n` +
                         `**Calculated Values:**\n` +
                         `• HP: ${playerData.calculatedHP}\n` +
                         `• Armor: ${playerData.calculatedArmor}\n` +
                         `• Speed: ${playerData.calculatedSpeed} (from ${playerData.speedKnots} knots)\n` +
                         `• Evasion: ${playerData.calculatedEvasion.evasionPercentage}% (Speed×${playerData.calculatedEvasion.speedFactor}, Size×${playerData.calculatedEvasion.sizeFactor})\n`;

        // Add aircraft info for carriers
        if (playerData.shipClass === 'Aircraft Carrier') {
            const aircraftCount = playerData.aircraft ? Array.from(playerData.aircraft.values()).reduce((sum, squad) => sum + squad.count, 0) : 0;
            description += `• Hangar: ${aircraftCount}/${playerData.hangar} aircraft\n`;
        }

        description += `\nClick the button below to configure other stats.`;

        const embed = new EmbedBuilder()
            .setTitle('✅ Basic Info, HP, Armor, Speed & Evasion Calculated')
            .setDescription(description)
            .setColor(0x00FF00);

        if (interaction.replied) {
            await interaction.followUp({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        }
    }

    displaySquadronStatus(squadron, squadronName) {
        const status = this.calculateSquadronStatus(squadron);
        
        let statusEmoji;
        switch (status.status) {
            case 'Combat Ready': statusEmoji = '🟢'; break;
            case 'Light Damage': statusEmoji = '🟡'; break;
            case 'Moderate Damage': statusEmoji = '🟠'; break;
            case 'Heavy Damage': statusEmoji = '🔴'; break;
            case 'Critical Damage': statusEmoji = '💀'; break;
            case 'Destroyed': statusEmoji = '☠️'; break;
            default: statusEmoji = '❓'; break;
        }
        
        return `${statusEmoji} **${squadronName}** - ${status.status}\n` +
               `  • Aircraft: ${status.effectiveCount}/${squadron.maxCount} operational\n` +
               `  • Squadron HP: ${squadron.squadronHP}/${squadron.maxSquadronHP} (${status.hpPercentage}%)\n` +
               `  • Individual HP: ${squadron.hp}/${squadron.maxHP} per aircraft\n` +
               `  • ${status.canOperate ? 'Ready for combat' : 'Cannot operate'}`;
    }

    async handleContinueStats(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your stats configuration!', flags: MessageFlags.Ephemeral });
        }
        
        const basicPlayerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!basicPlayerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }
        
        const modal = new ModalBuilder()
            .setCustomId(`create_stats_${interaction.user.id}`)
            .setTitle(`Stats for ${basicPlayerData.username}`);

        // Only optional overrides field - no accuracy field
        const optionalInput = new TextInputBuilder()
            .setCustomId('optional_overrides')
            .setLabel('Override defaults? (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('battles,victories,level,exp,currency')
            .setRequired(false)
            .setMaxLength(20);

        const skipInput = new TextInputBuilder()
            .setCustomId('skip_stats')
            .setLabel('Skip Stats Configuration?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Type "skip" to use all defaults')
            .setRequired(false)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(optionalInput),
            new ActionRowBuilder().addComponents(skipInput)
        );

        await interaction.showModal(modal);
    }

    async handleStatsCreationSubmit(interaction) {
        const optionalOverrides = interaction.fields.getTextInputValue('optional_overrides').trim();
        const skipStats = interaction.fields.getTextInputValue('skip_stats')?.trim().toLowerCase() || '';

        // Default values (including default accuracy of 85)
        let battles = 0;
        let victories = 0;
        let level = 1;
        let experience = 0;
        let currency = 0;
        const baseAccuracy = 85; // AUTOMATIC DEFAULT

        // Parse optional overrides if provided
        if (optionalOverrides && skipStats !== 'skip') {
            const overrideParts = optionalOverrides.split(',').map(part => part.trim());
            
            if (overrideParts.length === 5) {
                battles = parseInt(overrideParts[0]);
                victories = parseInt(overrideParts[1]);
                level = parseInt(overrideParts[2]);
                experience = parseInt(overrideParts[3]);
                currency = parseInt(overrideParts[4]);

                // Validation for overrides
                if (isNaN(battles) || battles < 0) {
                    return interaction.reply({ content: '❌ Battles must be 0 or greater!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(victories) || victories < 0 || victories > battles) {
                    return interaction.reply({ content: '❌ Victories must be between 0 and battles count!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(level) || level < 1 || level > 100) {
                    return interaction.reply({ content: '❌ Level must be between 1 and 100!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(experience) || experience < 0) {
                    return interaction.reply({ content: '❌ Experience must be 0 or greater!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(currency) || currency < 0) {
                    return interaction.reply({ content: '❌ Currency must be 0 or greater!', flags: MessageFlags.Ephemeral });
                }
            } else if (overrideParts.length !== 0) {
                return interaction.reply({ content: '❌ Override format must be: battles,victories,level,experience,currency or leave blank!', flags: MessageFlags.Ephemeral });
            }
        }

        const basicPlayerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!basicPlayerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }

        // Create stats data with automatic accuracy
        const statsData = {
            ...basicPlayerData,
            stats: {
                health: basicPlayerData.calculatedHP, // Auto-calculated
                armor: basicPlayerData.calculatedArmor, // Auto-calculated  
                speed: basicPlayerData.calculatedSpeed, // Auto-calculated
                evasion: basicPlayerData.calculatedEvasion.evasionPercentage, // Auto-calculated
                range: 8, // Temporary default - will be updated from primary weapon
                baseAccuracy: baseAccuracy, // AUTOMATIC DEFAULT (85)
                accuracy: baseAccuracy // Legacy field for compatibility
            },
            battles: battles,
            victories: victories,
            level: level,
            experience: experience,
            currency: currency
        };

        this.bot.tempPlayerData.set(interaction.user.id, statsData);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_weapons_${interaction.user.id}`)
            .setLabel('Continue to Weapons Configuration')
            .setStyle(ButtonStyle.Primary);

        const editButton = new ButtonBuilder()
            .setCustomId(`edit_stats_${interaction.user.id}`)
            .setLabel('Edit Stats')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton, editButton);

        const overrideText = optionalOverrides && skipStats !== 'skip' ? 
            `\n• Battles/Victories: ${battles}/${victories}\n• Level: ${level}, Experience: ${experience}, Currency: ${currency}` :
            `\n• Battles/Victories: ${battles}/${victories} (default)\n• Level: ${level}, Experience: ${experience}, Currency: ${currency} (defaults)`;

        const embed = new EmbedBuilder()
            .setTitle('✅ Stats Configured')
            .setDescription(`**Stats for ${basicPlayerData.username}:**\n` +
                           `• Health: ${basicPlayerData.calculatedHP} (auto-calculated)\n` +
                           `• Armor: ${basicPlayerData.calculatedArmor} (auto-calculated)\n` +
                           `• Speed: ${basicPlayerData.calculatedSpeed} (from ${basicPlayerData.speedKnots} knots)\n` +
                           `• Evasion: ${basicPlayerData.calculatedEvasion.evasionPercentage}% (auto-calculated)\n` +
                           `• Base Accuracy: ${baseAccuracy}% (standard default)\n` +
                           `• Range: Will be calculated from primary weapon${overrideText}\n\n` +
                           `Click the button below to configure weapons.`)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    async handleEditBasicInfo(interaction) {
        // Handle both old format (edit_basic_info_userId) and new format (edit_player_info_userId)
        const parts = interaction.customId.split('_');
        const userId = parts[parts.length - 1]; // Last part is always the user ID

        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your character creation!', flags: MessageFlags.Ephemeral });
        }

        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit_player_info_${interaction.user.id}`)
            .setTitle('Edit Basic Info');

        const usernameInput = new TextInputBuilder()
            .setCustomId('username')
            .setLabel('Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('PlayerName')
            .setRequired(true)
            .setMaxLength(32)
            .setValue(playerData.username || '');

        const shipClassInput = new TextInputBuilder()
            .setCustomId('ship_class')
            .setLabel('Ship Class')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Destroyer, Light Cruiser, Heavy Cruiser, etc.')
            .setRequired(true)
            .setMaxLength(50)
            .setValue(playerData.shipClass || '');

        const tonnageSpeedInput = new TextInputBuilder()
            .setCustomId('tonnage_speed')
            .setLabel('Tonnage,Speed (e.g., 2500,35)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('2500,35')
            .setRequired(true)
            .setMaxLength(15)
            .setValue(`${playerData.tonnage || ''},${playerData.speedKnots || ''}`);

        const armorInput = new TextInputBuilder()
            .setCustomId('armor_thicknesses')
            .setLabel('Belt,Deck,Turret Armor (mm) e.g., 25,15,10')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('25,15,10')
            .setRequired(true)
            .setMaxLength(20)
            .setValue(`${playerData.armorThickness?.belt || ''},${playerData.armorThickness?.deck || ''},${playerData.armorThickness?.turret || ''}`);

        modal.addComponents(
            new ActionRowBuilder().addComponents(usernameInput),
            new ActionRowBuilder().addComponents(shipClassInput),
            new ActionRowBuilder().addComponents(tonnageSpeedInput),
            new ActionRowBuilder().addComponents(armorInput)
        );

        await interaction.showModal(modal);
    }

    async handleEditBasicInfoSubmit(interaction) {
        const username = interaction.fields.getTextInputValue('username');
        const shipClass = interaction.fields.getTextInputValue('ship_class').trim();
        const tonnageSpeed = interaction.fields.getTextInputValue('tonnage_speed').split(',');
        const armorThicknesses = interaction.fields.getTextInputValue('armor_thicknesses').split(',');

        // Get existing player data
        const existingPlayerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!existingPlayerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }

        // Validate tonnage and speed
        if (tonnageSpeed.length !== 2) {
            return interaction.reply({ content: '❌ Tonnage and Speed must be in format: tonnage,speed (e.g., 2500,35)!', flags: MessageFlags.Ephemeral });
        }

        const tonnage = parseInt(tonnageSpeed[0].trim());
        const speedKnots = parseFloat(tonnageSpeed[1].trim());

        if (isNaN(tonnage) || tonnage < 100 || tonnage > 100000) {
            return interaction.reply({ content: '❌ Tonnage must be a number between 100 and 100,000!', flags: MessageFlags.Ephemeral });
        }

        if (isNaN(speedKnots) || speedKnots < 5 || speedKnots > 50) {
            return interaction.reply({ content: '❌ Speed must be a number between 5 and 50 knots!', flags: MessageFlags.Ephemeral });
        }

        // Validate armor
        if (armorThicknesses.length !== 3) {
            return interaction.reply({ content: '❌ Armor must be in format: belt,deck,turret (e.g., 25,15,10)!', flags: MessageFlags.Ephemeral });
        }

        const beltMM = parseInt(armorThicknesses[0].trim());
        const deckMM = parseInt(armorThicknesses[1].trim());
        const turretMM = parseInt(armorThicknesses[2].trim());

        if (isNaN(beltMM) || isNaN(deckMM) || isNaN(turretMM)) {
            return interaction.reply({ content: '❌ All armor values must be numbers!', flags: MessageFlags.Ephemeral });
        }

        if (beltMM < 0 || beltMM > 500 || deckMM < 0 || deckMM > 300 || turretMM < 0 || turretMM > 700) {
            return interaction.reply({ content: '❌ Armor values out of range! Belt: 0-500mm, Deck: 0-300mm, Turret: 0-700mm', flags: MessageFlags.Ephemeral });
        }

        // Validate and normalize ship class
        const shipClassMapping = {
            'DD': 'Destroyer',
            'CL': 'Light Cruiser',
            'CA': 'Heavy Cruiser',
            'BB': 'Battleship',
            'CV': 'Aircraft Carrier',
            'CVL': 'Light Aircraft Carrier',
            'SS': 'Submarine',
            'AX': 'Auxiliary',
            'Destroyer': 'Destroyer',
            'Light Cruiser': 'Light Cruiser',
            'Heavy Cruiser': 'Heavy Cruiser',
            'Battleship': 'Battleship',
            'Aircraft Carrier': 'Aircraft Carrier',
            'Light Aircraft Carrier': 'Light Aircraft Carrier',
            'Submarine': 'Submarine',
            'Auxiliary': 'Auxiliary'
        };

        const normalizedShipClass = shipClassMapping[shipClass];
        if (!normalizedShipClass) {
            return interaction.reply({
                content: `❌ Invalid ship class! Must be one of: DD (Destroyer), CL (Light Cruiser), CA (Heavy Cruiser), BB (Battleship), CV (Aircraft Carrier), CVL (Light Aircraft Carrier), SS (Submarine), AX (Auxiliary)`,
                flags: MessageFlags.Ephemeral
            });
        }

        const finalShipClass = normalizedShipClass;

        // Check for duplicate usernames if username changed
        if (username !== existingPlayerData.username) {
            let existingPlayerWithUsername = null;
            for (const [pid, pEntry] of this.bot.playerData.entries()) {
                if (pEntry.characters) {
                    // New multi-character structure
                    for (const [charName, charData] of pEntry.characters) {
                        if (charData.username && charData.username.toLowerCase() === username.toLowerCase()) {
                            existingPlayerWithUsername = charData;
                            break;
                        }
                    }
                } else if (pEntry.username && pEntry.username.toLowerCase() === username.toLowerCase()) {
                    // Old single-character structure
                    existingPlayerWithUsername = pEntry;
                }
                if (existingPlayerWithUsername) break;
            }

            if (existingPlayerWithUsername) {
                return interaction.reply({
                    content: `❌ A character with username "${username}" already exists! Please choose a different username.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // Recalculate values with new data
        const calculatedHP = this.calculateShipHP(tonnage, finalShipClass);
        const calculatedArmor = this.calculateShipArmor(beltMM, deckMM, turretMM);
        const calculatedSpeed = this.calculateShipSpeed(speedKnots);
        const calculatedEvasion = this.calculateShipEvasion(speedKnots, tonnage);
        const hangarCapacity = this.calculateHangarCapacity(tonnage, finalShipClass);

        // Update player data with new values
        const updatedPlayerData = {
            ...existingPlayerData,
            username: username,
            shipClass: finalShipClass,
            tonnage: tonnage,
            speedKnots: speedKnots,
            armorThickness: {
                belt: beltMM,
                deck: deckMM,
                turret: turretMM
            },
            calculatedHP: calculatedHP,
            calculatedArmor: calculatedArmor,
            calculatedSpeed: calculatedSpeed,
            calculatedEvasion: calculatedEvasion,
            hangar: hangarCapacity
        };

        // Store updated temp data
        this.bot.tempPlayerData.set(interaction.user.id, updatedPlayerData);

        // If ship class changed to/from carrier, handle appropriately
        const wasCarrier = existingPlayerData.shipClass === 'Aircraft Carrier' || existingPlayerData.shipClass === 'Light Aircraft Carrier';
        const isCarrier = finalShipClass === 'Aircraft Carrier' || finalShipClass === 'Light Aircraft Carrier';

        if (isCarrier && !wasCarrier) {
            // Changed to carrier - show aircraft configuration
            await this.continueToAircraftConfiguration(interaction, updatedPlayerData);
        } else if (!isCarrier && wasCarrier) {
            // Changed from carrier - remove aircraft data and show stats
            delete updatedPlayerData.aircraft;
            delete updatedPlayerData.availableAircraft;
            delete updatedPlayerData.activeSquadrons;
            this.bot.tempPlayerData.set(interaction.user.id, updatedPlayerData);
            await this.continueToStats(interaction, updatedPlayerData);
        } else {
            // Same ship type or both carriers - show updated confirmation
            await this.continueToStats(interaction, updatedPlayerData);
        }
    }

    async handleEditStats(interaction) {
        const userId = interaction.customId.split('_')[2];

        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your stats configuration!', flags: MessageFlags.Ephemeral });
        }

        const statsData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!statsData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit_stats_${interaction.user.id}`)
            .setTitle(`Edit Stats for ${statsData.username}`);

        // Pre-fill current values if they exist
        const currentOverrides = statsData.battles !== 0 || statsData.victories !== 0 ||
                                statsData.level !== 1 || statsData.experience !== 0 ||
                                statsData.currency !== 0;

        const currentOverrideText = currentOverrides ?
            `${statsData.battles},${statsData.victories},${statsData.level},${statsData.experience},${statsData.currency}` : '';

        const optionalInput = new TextInputBuilder()
            .setCustomId('optional_overrides')
            .setLabel('Override defaults? (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('battles,victories,level,exp,currency')
            .setRequired(false)
            .setMaxLength(20)
            .setValue(currentOverrideText);

        const skipInput = new TextInputBuilder()
            .setCustomId('skip_stats')
            .setLabel('Skip Stats Configuration?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Type "skip" to use all defaults')
            .setRequired(false)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(optionalInput),
            new ActionRowBuilder().addComponents(skipInput)
        );

        await interaction.showModal(modal);
    }

    async handleEditStatsSubmit(interaction) {
        const optionalOverrides = interaction.fields.getTextInputValue('optional_overrides').trim();
        const skipStats = interaction.fields.getTextInputValue('skip_stats')?.trim().toLowerCase() || '';

        // Default values (including default accuracy of 85)
        let battles = 0;
        let victories = 0;
        let level = 1;
        let experience = 0;
        let currency = 0;
        const baseAccuracy = 85; // AUTOMATIC DEFAULT

        // Parse optional overrides if provided
        if (optionalOverrides && skipStats !== 'skip') {
            const overrideParts = optionalOverrides.split(',').map(part => part.trim());

            if (overrideParts.length === 5) {
                battles = parseInt(overrideParts[0]);
                victories = parseInt(overrideParts[1]);
                level = parseInt(overrideParts[2]);
                experience = parseInt(overrideParts[3]);
                currency = parseInt(overrideParts[4]);

                // Validation for overrides
                if (isNaN(battles) || battles < 0) {
                    return interaction.reply({ content: '❌ Battles must be 0 or greater!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(victories) || victories < 0 || victories > battles) {
                    return interaction.reply({ content: '❌ Victories must be between 0 and battles count!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(level) || level < 1 || level > 100) {
                    return interaction.reply({ content: '❌ Level must be between 1 and 100!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(experience) || experience < 0) {
                    return interaction.reply({ content: '❌ Experience must be 0 or greater!', flags: MessageFlags.Ephemeral });
                }
                if (isNaN(currency) || currency < 0) {
                    return interaction.reply({ content: '❌ Currency must be 0 or greater!', flags: MessageFlags.Ephemeral });
                }
            } else if (overrideParts.length !== 0) {
                return interaction.reply({ content: '❌ Override format must be: battles,victories,level,experience,currency or leave blank!', flags: MessageFlags.Ephemeral });
            }
        }

        const basicPlayerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!basicPlayerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }

        // Update stats data with edited values
        const statsData = {
            ...basicPlayerData,
            stats: {
                health: basicPlayerData.calculatedHP, // Auto-calculated
                armor: basicPlayerData.calculatedArmor, // Auto-calculated
                speed: basicPlayerData.calculatedSpeed, // Auto-calculated
                evasion: basicPlayerData.calculatedEvasion.evasionPercentage, // Auto-calculated
                range: 8, // Temporary default - will be updated from primary weapon
                baseAccuracy: baseAccuracy, // AUTOMATIC DEFAULT (85)
                accuracy: baseAccuracy // Legacy field for compatibility
            },
            battles: battles,
            victories: victories,
            level: level,
            experience: experience,
            currency: currency
        };

        this.bot.tempPlayerData.set(interaction.user.id, statsData);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_weapons_${interaction.user.id}`)
            .setLabel('Continue to Weapons Configuration')
            .setStyle(ButtonStyle.Primary);

        const editButton = new ButtonBuilder()
            .setCustomId(`edit_stats_${interaction.user.id}`)
            .setLabel('Edit Stats')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton, editButton);

        const overrideText = optionalOverrides && skipStats !== 'skip' ?
            `\n• Battles/Victories: ${battles}/${victories}\n• Level: ${level}, Experience: ${experience}, Currency: ${currency}` :
            `\n• Battles/Victories: ${battles}/${victories} (default)\n• Level: ${level}, Experience: ${experience}, Currency: ${currency} (defaults)`;

        const embed = new EmbedBuilder()
            .setTitle('✅ Stats Updated')
            .setDescription(`**Stats for ${basicPlayerData.username}:**\n` +
                           `• Health: ${basicPlayerData.calculatedHP} (auto-calculated)\n` +
                           `• Armor: ${basicPlayerData.calculatedArmor} (auto-calculated)\n` +
                           `• Speed: ${basicPlayerData.calculatedSpeed} (from ${basicPlayerData.speedKnots} knots)\n` +
                           `• Evasion: ${basicPlayerData.calculatedEvasion.evasionPercentage}% (auto-calculated)\n` +
                           `• Base Accuracy: ${baseAccuracy}% (standard default)\n` +
                           `• Range: Will be calculated from primary weapon${overrideText}\n\n` +
                           `Click the button below to configure weapons or edit stats again.`)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    async showWeaponsCreationForm(interaction, playerData) {
        const modal = new ModalBuilder()
            .setCustomId(`create_weapons_${interaction.user.id}`)
            .setTitle(`Add Weapons - ${playerData.username}`);

        // Weapon Type
        const typeInput = new TextInputBuilder()
            .setCustomId('weapon_type')
            .setLabel('Weapon Type (main, secondary, torpedo)') // 37 chars - OK
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('main')
            .setRequired(true)
            .setMaxLength(10);

        // Caliber - SHORTENED LABEL
        const caliberInput = new TextInputBuilder()
            .setCustomId('weapon_caliber')
            .setLabel('Caliber (76mm-480mm guns, 450mm-850mm torps)') // 44 chars - fits!
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('203mm or 533mm')
            .setRequired(true)
            .setMaxLength(8);

        // Configuration
        const configInput = new TextInputBuilder()
            .setCustomId('weapon_config')
            .setLabel('Mount (1/single, 2/twin, 3/triple, 4/quad)') // Updated to show both formats
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('2 or twin')
            .setRequired(true)
            .setMaxLength(10);

        // Custom Name (Optional)
        const nameInput = new TextInputBuilder()
            .setCustomId('weapon_name')
            .setLabel('Custom Name (Optional)') // 24 chars - OK
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('8-inch/55 Mark 12 or Long Lance Type 93')
            .setRequired(false)
            .setMaxLength(50);

        const firstRow = new ActionRowBuilder().addComponents(typeInput);
        const secondRow = new ActionRowBuilder().addComponents(caliberInput);
        const thirdRow = new ActionRowBuilder().addComponents(configInput);
        const fourthRow = new ActionRowBuilder().addComponents(nameInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        await interaction.showModal(modal);
    }

    generateWeaponStats(type, caliber, configuration, quality, customName) {
        const baseStats = WEAPON_TEMPLATES[caliber];
        const configMod = CONFIG_MULTIPLIERS[configuration];
        const qualityMod = QUALITY_MODIFIERS[quality];

        // Generate automatic name if none provided
        let weaponName = customName;
        if (!weaponName) {
            if (baseStats.type === 'torpedo') {
                weaponName = `${caliber} ${configMod.name} Torpedo`;
            } else {
                const caliberDisplay = caliber.replace('mm', '') + 'mm';
                weaponName = `${caliberDisplay} ${configMod.name}`;
            }
            if (quality !== 'standard') {
                weaponName += ` (${qualityMod.name})`;
            }
        }

        // Calculate final stats
        const finalStats = {
            name: weaponName,
            type: type,
            caliber: caliber,
            damage: Math.round(baseStats.damage * configMod.damage * qualityMod.damage),
            range: baseStats.range,
            reload: Math.round(baseStats.reload * configMod.reload * qualityMod.reload),
            penetration: baseStats.penetration,
            ammo: baseStats.ammo * configMod.barrels,
            barrels: baseStats.barrels * configMod.barrels,
            accuracy: Math.round((baseStats.accuracy || 75) * qualityMod.accuracy),
            configuration: configuration,
            quality: quality,
            // Legacy compatibility fields
            shellWeight: Math.round(baseStats.damage * 4),
            barrelCount: baseStats.barrels * configMod.barrels
        };

        return finalStats;
    }

    async handleTemplateWeaponCreation(interaction) {
        try {
            const userId = interaction.customId.split('_')[2];
            
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your weapon creation form!', flags: MessageFlags.Ephemeral });
            }

            const weaponType = interaction.fields.getTextInputValue('weapon_type').toLowerCase();
            let caliber = interaction.fields.getTextInputValue('weapon_caliber').toLowerCase().trim();

            // Normalize caliber input - accept both "76" and "76mm"
            if (caliber && !caliber.endsWith('mm')) {
                // If it's just a number, add 'mm'
                if (/^\d+(\.\d+)?$/.test(caliber)) {
                    caliber = caliber + 'mm';
                }
            }

            const configurationRaw = interaction.fields.getTextInputValue('weapon_config').toLowerCase().trim();
            const quality = 'standard'; // Always set to standard
            const customName = interaction.fields.getTextInputValue('weapon_name') || '';

            // Normalize mount configuration - accept both numbers and words
            const mountMapping = {
                '1': 'single',
                'single': 'single',
                '2': 'twin',
                'twin': 'twin',
                'dual': 'twin',
                '3': 'triple',
                'triple': 'triple',
                'tri': 'triple',
                '4': 'quad',
                'quad': 'quad',
                'quadruple': 'quad',
                '5': 'quin',
                'quin': 'quin',
                'quintuple': 'quin',
                '6': 'sext',
                'sext': 'sext',
                'sextuple': 'sext'
            };

            const configuration = mountMapping[configurationRaw];

            // Validate inputs
            const validTypes = ['main', 'secondary', 'torpedo'];
            const validConfigs = ['single', 'twin', 'triple', 'quad', 'quin', 'sext'];

            if (!validTypes.includes(weaponType)) {
                return interaction.reply({
                    content: `❌ Invalid weapon type! Use: ${validTypes.join(', ')}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!configuration || !validConfigs.includes(configuration)) {
                return interaction.reply({
                    content: `❌ Invalid mount configuration! Use: 1/single, 2/twin, 3/triple, 4/quad, 5/quin, 6/sext`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check if caliber exists in templates
            if (!WEAPON_TEMPLATES[caliber]) {
                const gunCalibers = Object.keys(WEAPON_TEMPLATES).filter(k => WEAPON_TEMPLATES[k].type !== 'torpedo').join(', ');
                const torpedoCalibers = Object.keys(WEAPON_TEMPLATES).filter(k => WEAPON_TEMPLATES[k].type === 'torpedo').join(', ');
                return interaction.reply({ 
                    content: `❌ Caliber ${caliber} not supported!\n\n**Gun Calibers:** ${gunCalibers}\n\n**Torpedo Sizes:** ${torpedoCalibers}`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Validate weapon type matches caliber type
            const template = WEAPON_TEMPLATES[caliber];
            if (weaponType === 'torpedo' && template.type !== 'torpedo') {
                return interaction.reply({
                    content: `❌ ${caliber} is not a torpedo caliber! Use torpedo sizes: 450mm, 533mm, 610mm, 750mm, 850mm`,
                    flags: MessageFlags.Ephemeral
                });
            }
            if (weaponType !== 'torpedo' && template.type === 'torpedo') {
                return interaction.reply({
                    content: `❌ ${caliber} is a torpedo size, not a gun caliber! Set weapon type to 'torpedo'`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Generate weapon stats
            const weaponStats = this.generateWeaponStats(weaponType, caliber, configuration, quality, customName);

            // Get temp player data
            const tempData = this.bot.tempPlayerData.get(userId);
            if (!tempData) {
                return interaction.reply({ 
                    content: '❌ Character creation session expired!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Add weapon to character
            if (!tempData.weapons) {
                tempData.weapons = {};
            }

            const weaponKey = `${weaponType}_${Date.now()}`;
            tempData.weapons[weaponKey] = weaponStats;

            // Update range if this is a main weapon
            if (weaponType === 'main') {
                if (tempData.stats) {
                    tempData.stats.range = weaponStats.range;
                }
            }

            // Show confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle(weaponStats.type === 'torpedo' ? '🚀 Torpedo Added!' : '⚔️ Weapon Added!')
                .setDescription(`**Character:** ${tempData.username}\n\n` +
                               `**Weapon:** ${weaponStats.name}\n` +
                               `**Type:** ${weaponType.toUpperCase()}\n` +
                               `**Configuration:** ${CONFIG_MULTIPLIERS[configuration].name}\n\n` +
                               `**Performance:**\n` +
                               `• Damage: ${weaponStats.damage}\n` +
                               `• Range: ${weaponStats.range} cells\n` +
                               `• Reload: ${weaponStats.reload} seconds\n` +
                               `• Penetration: ${weaponStats.penetration}${weaponStats.type === 'torpedo' ? ' (Ignores armor)' : 'mm'}\n` +
                               `• Ammunition: ${weaponStats.ammo} ${weaponStats.type === 'torpedo' ? 'torpedoes' : 'rounds'}\n` +
                               `• ${weaponStats.type === 'torpedo' ? 'Tubes' : 'Barrels'}: ${weaponStats.barrels}`)
                .setColor(weaponStats.type === 'torpedo' ? 0x0099FF : 0xFF6600);

            const continueButton = new ButtonBuilder()
                .setCustomId(`continue_weapons_${userId}`)
                .setLabel('✅ Add Another Weapon')
                .setStyle(ButtonStyle.Primary);

            const finishButton = new ButtonBuilder()
                .setCustomId(`finish_weapons_${userId}`)
                .setLabel('➡️ Continue to AA Setup')
                .setStyle(ButtonStyle.Success);

            const actionRow = new ActionRowBuilder().addComponents(continueButton, finishButton);

            await interaction.reply({ 
                embeds: [confirmEmbed], 
                components: [actionRow], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('❌ Error in handleTemplateWeaponCreation:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while creating weapon!', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    async handleContinueWeaponsButton(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your weapon creation!', flags: MessageFlags.Ephemeral });
        }

        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Show the weapon creation form again
        await this.showWeaponsCreationForm(interaction, tempData);
    }

    async handleFinishWeaponsButton(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your weapon creation!', flags: MessageFlags.Ephemeral });
        }

        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Calculate primary weapon range for stats
        let primaryWeaponRange = 8; // Default
        if (tempData.weapons) {
            const mainWeapons = Object.values(tempData.weapons).filter(w => w.type === 'main');
            if (mainWeapons.length > 0) {
                primaryWeaponRange = mainWeapons[0].range;
            } else {
                const secondaryWeapons = Object.values(tempData.weapons).filter(w => w.type === 'secondary');
                if (secondaryWeapons.length > 0) {
                    primaryWeaponRange = secondaryWeapons[0].range;
                }
            }
        }

        // Update stats with calculated range
        if (tempData.stats) {
            tempData.stats.range = primaryWeaponRange;
        }

        // Continue to AA setup
        const weaponCount = Object.keys(tempData.weapons || {}).length;
        const weaponsList = Object.values(tempData.weapons || {}).map(w => 
            `• ${w.name} (${w.type})`
        ).join('\n') || '• No weapons configured';

        const embed = new EmbedBuilder()
            .setTitle('✅ Weapons Configuration Complete!')
            .setDescription(`**Character:** ${tempData.username}\n` +
                           `**Weapons Configured:** ${weaponCount}\n\n` +
                           `**Weapon List:**\n${weaponsList}\n\n` +
                           `**Primary Weapon Range:** ${primaryWeaponRange} cells\n\n` +
                           `**Next Step:** Configure Anti-Aircraft (AA) guns`)
            .setColor(0x00FF00);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_aa_setup_${userId}`)
            .setLabel('🎯 Configure AA Guns')
            .setStyle(ButtonStyle.Primary);

        const skipButton = new ButtonBuilder()
            .setCustomId(`skip_aa_setup_${userId}`)
            .setLabel('⏭️ Skip AA Setup')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton, skipButton);

        await interaction.reply({ 
            embeds: [embed], 
            components: [actionRow], 
            flags: MessageFlags.Ephemeral 
        });
    }

    async handleContinueAASetup(interaction) {
        console.log('🎯 handleContinueAASetup called');
        const userId = interaction.customId.split('_')[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA setup!', flags: MessageFlags.Ephemeral });
        }
        
        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Initialize AA systems array
        if (!tempData.aaSystems) {
            tempData.aaSystems = [];
        }

        // Show AA range selection menu
        await this.showAARangeSelection(interaction, tempData);
    }

    async handleSkipAASetup(interaction) {
        console.log('🎯 handleSkipAASetup called');
        const userId = interaction.customId.split('_')[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA setup!', flags: MessageFlags.Ephemeral });
        }
        
        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Set empty AA systems and finalize
        tempData.aaSystems = [];
        tempData.aaSystem = null;
        await this.finalizeCharacterWithoutAA(interaction);
    }

    async showAARangeSelection(interaction, tempData) {
        console.log('🎯 showAARangeSelection called');
        const embed = new EmbedBuilder()
            .setTitle('🎯 AA Gun Configuration')
            .setDescription(`**Character:** ${tempData.username}\n\n` +
                           `**Configure Anti-Aircraft guns by range:**\n` +
                           `• **Short Range (≤25mm):** Close-in defense, high rate of fire\n` +
                           `• **Medium Range (28mm-57mm):** Main AA defense zone, balanced\n` +
                           `• **Long Range (76mm+):** Heavy guns, long range engagement\n\n` +
                           `**Note:** You can skip ranges your ship doesn't have.`)
            .setColor(0xFF6600);

        const shortRangeButton = new ButtonBuilder()
            .setCustomId(`configure_short_aa_${interaction.user.id}`)
            .setLabel('📍 Configure Short Range AA')
            .setStyle(ButtonStyle.Primary);

        const mediumRangeButton = new ButtonBuilder()
            .setCustomId(`configure_medium_aa_${interaction.user.id}`)
            .setLabel('🎯 Configure Medium Range AA')
            .setStyle(ButtonStyle.Primary);

        const longRangeButton = new ButtonBuilder()
            .setCustomId(`configure_long_aa_${interaction.user.id}`)
            .setLabel('🚀 Configure Long Range AA')
            .setStyle(ButtonStyle.Primary);

        const skipAllButton = new ButtonBuilder()
            .setCustomId(`skip_all_aa_${interaction.user.id}`)
            .setLabel('⏭️ Skip All AA (No AA Guns)')
            .setStyle(ButtonStyle.Secondary);

        const finishButton = new ButtonBuilder()
            .setCustomId(`finish_aa_config_${interaction.user.id}`)
            .setLabel('✅ Finish AA Configuration')
            .setStyle(ButtonStyle.Success);

        const firstRow = new ActionRowBuilder().addComponents(shortRangeButton, mediumRangeButton, longRangeButton);
        const secondRow = new ActionRowBuilder().addComponents(skipAllButton, finishButton);

        await interaction.reply({ 
            embeds: [embed], 
            components: [firstRow, secondRow], 
            flags: MessageFlags.Ephemeral 
        });
    }

    async handleAAConfigButtons(interaction) {
        console.log('🎯 handleAAConfigButtons called');
        const customId = interaction.customId;
        console.log(`🔍 AA BUTTON: Custom ID = "${customId}"`);

        // Parse different custom ID formats
        let action, range, userId;

        if (customId.startsWith('configure_')) {
            // Format: configure_short_aa_${userId}, configure_medium_aa_${userId}, configure_long_aa_${userId}
            const parts = customId.split('_');
            action = parts[0]; // "configure"
            range = parts[1];  // "short", "medium", "long"
            userId = parts[3]; // the user ID after "aa"
        } else if (customId.startsWith('skip_all_aa_')) {
            // Format: skip_all_aa_${userId}
            action = 'skip';
            range = 'all';
            userId = customId.replace('skip_all_aa_', '');
        } else if (customId.startsWith('finish_aa_config_')) {
            // Format: finish_aa_config_${userId}
            action = 'finish';
            range = 'config';
            userId = customId.replace('finish_aa_config_', '');
        } else if (customId.startsWith('continue_next_aa_')) {
            // Format: continue_next_aa_${userId}
            action = 'continue';
            range = 'next';
            userId = customId.replace('continue_next_aa_', '');
        } else if (customId.startsWith('finish_aa_')) {
            // Format: finish_aa_${userId}
            action = 'finish';
            range = 'aa';
            userId = customId.replace('finish_aa_', '');
        } else if (customId.startsWith('confirm_all_aa_')) {
            // Format: confirm_all_aa_${userId}
            action = 'confirm';
            range = 'all';
            userId = customId.replace('confirm_all_aa_', '');
        } else if (customId.startsWith('reset_aa_')) {
            // Format: reset_aa_${userId}
            action = 'reset';
            range = 'aa';
            userId = customId.replace('reset_aa_', '');
        } else {
            console.error(`❌ Unknown AA button custom ID format: ${customId}`);
            return interaction.reply({ content: '❌ Unknown AA button interaction!', flags: MessageFlags.Ephemeral });
        }

        console.log(`🔍 Parsed: action="${action}", range="${range}", userId="${userId}"`);

        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA configuration!', flags: MessageFlags.Ephemeral });
        }

        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        if (action === 'configure') {
            // Show AA creation form for specific range
            await this.showSpecificAACreationForm(interaction, tempData, range);
        } else if (action === 'skip') {
            if (range === 'all') {
                // Skip all AA
                tempData.aaSystems = [];
                tempData.aaSystem = null;
                await this.finalizeCharacterWithoutAA(interaction);
            }
        } else if (action === 'finish') {
            // Finish AA configuration
            if (range === 'config' || range === 'aa') {
                await this.finalizeCharacterWithAA(interaction);
            }
        } else if (action === 'continue') {
            if (range === 'next') {
                // Continue to next AA range - show the AA range selection menu again
                await this.showAARangeSelection(interaction, tempData);
            }
        } else if (action === 'confirm') {
            if (range === 'all') {
                // Confirm all AA systems and finalize
                await this.finalizeCharacterWithAA(interaction);
            }
        } else if (action === 'reset') {
            if (range === 'aa') {
                // Reset AA configuration
                tempData.aaSystems = [];
                tempData.aaSystem = null;
                await this.showAARangeSelection(interaction, tempData);
            }
        } else {
            console.error(`❌ Unknown AA action: ${action}`);
            await interaction.reply({ content: '❌ Unknown AA configuration action!', flags: MessageFlags.Ephemeral });
        }
    }

    async showSpecificAACreationForm(interaction, tempData, aaRange) {
        console.log('🎯 showSpecificAACreationForm called for range:', aaRange);
        
        // Use your existing showAACreationForm as a fallback for now
        await this.showAACreationForm(interaction, tempData);
    }

    async handleBackToAAMenu(interaction) {
        console.log('🎯 handleBackToAAMenu called');
        const userId = interaction.customId.split('_')[4];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA menu!', flags: MessageFlags.Ephemeral });
        }

        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Show the AA range selection menu again
        await interaction.update({ components: [], embeds: [] });
        await this.showAARangeSelection(interaction, tempData);
    }

    async handleContinueWeapons(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your weapons configuration!', flags: MessageFlags.Ephemeral });
        }
        
        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }

        // Show the new template-based weapon creation form
        await this.showWeaponsCreationForm(interaction, playerData);
    }

    async handleWeaponsCreationSubmit(interaction) {
        try {
            // Check if this is the new template-based system
            if (interaction.customId.startsWith('create_weapons_')) {
                return await this.handleTemplateWeaponCreation(interaction);
            }

            // Otherwise use existing legacy weapon parsing
            const playerData = this.bot.tempPlayerData.get(interaction.user.id);
            if (!playerData) {
                return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
            }

            let weapons = {};
            let weaponDescriptions = [];
            let primaryWeaponRange = 8; // Default range
            const skipInfo = interaction.fields.getTextInputValue('skip_info')?.trim().toLowerCase() || '';

            if (skipInfo === 'skip') {
                weaponDescriptions.push('No weapons configured');
            } else if (playerData.shipClass === 'Aircraft Carrier' || playerData.shipClass === 'Light Aircraft Carrier') {
                // Handle carrier weapons
                const defensiveWeapon = interaction.fields.getTextInputValue('defensive')?.trim() || '';
                const aaWeapon = interaction.fields.getTextInputValue('anti_aircraft')?.trim() || '';

                if (defensiveWeapon) {
                    const defensive = this.parseWeaponString(defensiveWeapon, 'defensive');
                    if (defensive.error) {
                        return interaction.reply({ content: `❌ Defensive weapon error: ${defensive.error}`, flags: MessageFlags.Ephemeral });
                    }
                    weapons.defensive = defensive;
                    primaryWeaponRange = defensive.range; // Use defensive weapon range
                    weaponDescriptions.push(`Defensive: ${defensive.name}\n  • ${defensive.caliber}mm, ${defensive.barrelCount} guns\n  • Damage: ${defensive.damage}, Range: ${defensive.range} cells`);
                }

                if (aaWeapon) {
                    const aa = this.parseWeaponString(aaWeapon, 'anti_aircraft');
                    if (aa.error) {
                        return interaction.reply({ content: `❌ Anti-Aircraft weapon error: ${aa.error}`, flags: MessageFlags.Ephemeral });
                    }
                    weapons.antiAircraft = aa;
                    weaponDescriptions.push(`Anti-Aircraft: ${aa.name}\n  • ${aa.caliber}mm, ${aa.barrelCount} guns\n  • Damage: ${aa.damage}, Range: ${aa.range} cells`);
                }

                if (weaponDescriptions.length === 0) {
                    weaponDescriptions.push('No conventional weapons - Aircraft only');
                    primaryWeaponRange = 15; // Typical carrier aircraft range
                }
            } else {
                // Handle standard ship weapons
                const primaryWeapon = interaction.fields.getTextInputValue('primary')?.trim() || '';
                const secondaryWeapon = interaction.fields.getTextInputValue('secondary')?.trim() || '';
                const torpedoes = interaction.fields.getTextInputValue('torpedoes')?.trim() || '';

                if (primaryWeapon) {
                    const primary = this.parseWeaponString(primaryWeapon, 'primary');
                    if (primary.error) {
                        return interaction.reply({ content: `❌ Primary weapon error: ${primary.error}`, flags: MessageFlags.Ephemeral });
                    }
                    weapons.primary = primary;
                    primaryWeaponRange = primary.range; // Use primary weapon's calculated range
                    weaponDescriptions.push(`Primary: ${primary.name}\n  • ${primary.caliber}mm, ${primary.barrelCount} barrels\n  • Damage: ${primary.damage}, Range: ${primary.range} cells`);
                }

                if (secondaryWeapon) {
                    const secondary = this.parseWeaponString(secondaryWeapon, 'secondary');
                    if (secondary.error) {
                        return interaction.reply({ content: `❌ Secondary weapon error: ${secondary.error}`, flags: MessageFlags.Ephemeral });
                    }
                    weapons.secondary = secondary;
                    weaponDescriptions.push(`Secondary: ${secondary.name}\n  • ${secondary.caliber}mm, ${secondary.barrelCount} barrels\n  • Damage: ${secondary.damage}, Range: ${secondary.range} cells`);
                }

                if (torpedoes) {
                    const torpedo = this.parseWeaponString(torpedoes, 'torpedoes');
                    if (torpedo.error) {
                        return interaction.reply({ content: `❌ Torpedoes error: ${torpedo.error}`, flags: MessageFlags.Ephemeral });
                    }
                    weapons.torpedoes = torpedo;
                    weaponDescriptions.push(`Torpedoes: ${torpedo.name}\n  • ${torpedo.caliber}mm, ${torpedo.barrelCount} tubes\n  • Damage: ${torpedo.damage}, Range: ${torpedo.range} cells`);
                }

                if (weaponDescriptions.length === 0) {
                    weaponDescriptions.push('No weapons configured');
                }
            }

            // Create complete player data with final calculated range
            const completePlayerData = {
                ...playerData,
                weapons: weapons,
                stats: {
                    ...playerData.stats,
                    range: primaryWeaponRange // Set final range from primary weapon
                }
            };

            // Store available aircraft and empty active squadrons for carriers
            if (!completePlayerData.availableAircraft) {
                completePlayerData.availableAircraft = new Map();
            }
            if (!completePlayerData.activeSquadrons) {
                completePlayerData.activeSquadrons = new Map();
            }

            // Legacy compatibility - keep old 'aircraft' field empty
            completePlayerData.aircraft = new Map();

            // Store complete player data temporarily
            this.bot.tempPlayerData.set(interaction.user.id, completePlayerData);

            // === NEW APPROACH: Show buttons instead of modal ===
            const embed = new EmbedBuilder()
                .setTitle('✅ Weapons Configuration Complete!')
                .setDescription(`**Character:** ${completePlayerData.username}\n` +
                               `**Ship Class:** ${completePlayerData.shipClass}\n\n` +
                               `**Configured Weapons:**\n${weaponDescriptions.join('\n\n')}\n\n` +
                               `**Primary Weapon Range:** ${primaryWeaponRange} cells\n\n` +
                               `**Next Step:** Configure Anti-Aircraft (AA) guns for defense against aircraft`)
                .setColor(0x00FF00);

            const continueButton = new ButtonBuilder()
                .setCustomId(`continue_aa_setup_${interaction.user.id}`)
                .setLabel('🎯 Configure AA Guns')
                .setStyle(ButtonStyle.Primary);

            const skipButton = new ButtonBuilder()
                .setCustomId(`skip_aa_setup_${interaction.user.id}`)
                .setLabel('⏭️ Skip AA Setup')
                .setStyle(ButtonStyle.Secondary);

            const actionRow = new ActionRowBuilder().addComponents(continueButton, skipButton);

            await interaction.reply({ 
                embeds: [embed], 
                components: [actionRow], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('❌ Error in handleWeaponsCreationSubmit:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ An error occurred. Please try again.', flags: MessageFlags.Ephemeral });
            }
        }
    }

    getWeaponRecommendations(shipClass) {
        const recommendations = {
            'Destroyer': {
                main: ['76mm', '100mm', '102mm', '120mm', '127mm', '130mm', '133mm'],
                secondary: ['76mm'],
                torpedo: ['450mm', '533mm']
            },
            'Light Cruiser': {
                main: ['127mm', '138.6mm', '140mm', '152mm', '155mm'],
                secondary: ['76mm', '100mm', '127mm'],
                torpedo: ['533mm', '610mm']
            },
            'Heavy Cruiser': {
                main: ['180mm', '190mm', '203mm', '210mm'],
                secondary: ['100mm', '127mm'],
                torpedo: ['533mm', '610mm']
            },
            'Battleship': {
                main: ['283mm', '305mm', '356mm', '380mm', '381mm', '406mm', '410mm', '420mm', '457mm', '460mm', '480mm'],
                secondary: ['127mm', '152mm'],
                torpedo: ['610mm', '750mm']
            },
            'Battlecruiser': {
                main: ['283mm', '305mm', '356mm', '380mm', '381mm', '406mm', '410mm'],
                secondary: ['127mm', '152mm'],
                torpedo: ['533mm', '610mm']
            },
            'Monitor': {
                main: ['283mm', '305mm', '356mm', '380mm', '381mm', '406mm', '410mm', '420mm', '457mm', '460mm', '480mm'],
                secondary: ['127mm'],
                torpedo: ['450mm', '533mm']
            },
            'Aircraft Carrier': {
                main: [],
                secondary: ['76mm', '127mm'],
                torpedo: []
            },
            'Light Aircraft Carrier': {
                main: [],
                secondary: ['76mm', '127mm'],
                torpedo: []
            },
            'Submarine': {
                main: [],
                secondary: ['76mm', '100mm'],
                torpedo: ['450mm', '533mm', '610mm']
            },
            'Auxiliary': {
                main: ['76mm', '100mm', '127mm'],
                secondary: ['76mm'],
                torpedo: ['450mm']
            }
        };

        return recommendations[shipClass] || recommendations['Destroyer'];
    }

    calculateAAEfficiency(experienceLevel) {
        // Level 1 = 60% efficiency, Level 10 = 95% efficiency
        // Each level adds 3.5% efficiency (60 + (level-1) * 3.5)
        const efficiency = 60 + ((experienceLevel - 1) * 3.5);
        return Math.round(efficiency * 10) / 10; // Round to 1 decimal place
    }

    // Add this method to update AA stats when crew levels up
    updateAAEfficiency(aaSystem) {
        const newEfficiency = this.calculateAAEfficiency(aaSystem.experienceLevel);
        const caliberData = AA_CALIBERS[aaSystem.caliber];
        const mountMultiplier = { single: 1, twin: 1.8, quad: 3.2, octuple: 5.5 }[aaSystem.mountType];
        
        // Update all efficiency-dependent stats
        aaSystem.efficiency = newEfficiency;
        aaSystem.range = Math.round(caliberData.range * (newEfficiency / 100));
        aaSystem.damage = Math.round(caliberData.damage * mountMultiplier * (newEfficiency / 100));
        aaSystem.accuracy = caliberData.accuracy * (newEfficiency / 100);
        
        return aaSystem;
    }

    async showAACreationForm(interaction, playerData) {
        const modal = new ModalBuilder()
            .setCustomId(`create_aa_${interaction.user.id}`)
            .setTitle(`AA Guns for ${playerData.username}`);

        // AA Caliber input - SHORTENED LABEL
        const caliberInput = new TextInputBuilder()
            .setCustomId('aa_caliber')
            .setLabel('AA Gun Caliber') // ← SHORTENED FROM 45+ chars to 14 chars
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('40mm (20mm, 25mm, 37mm, 40mm, 76mm, 127mm)')
            .setRequired(true)
            .setMaxLength(6);

        // Number of barrels input - SHORTENED LABEL
        const barrelsInput = new TextInputBuilder()
            .setCustomId('aa_barrels')
            .setLabel('Number of Barrels') // ← SHORTENED FROM "Number of AA Gun Barrels (1-8)"
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4 (1-8 barrels)')
            .setRequired(true)
            .setMaxLength(3);

        // AA Gun Name input
        const nameInput = new TextInputBuilder()
            .setCustomId('aa_name')
            .setLabel('AA System Name') // ← SHORTENED FROM "AA Gun System Name"
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bofors 40mm Quad Mount')
            .setRequired(true)
            .setMaxLength(50);

        // Mount type input - SHORTENED LABEL
        const mountInput = new TextInputBuilder()
            .setCustomId('aa_mount')
            .setLabel('Mount Type') // ← SHORTENED FROM "Mount Type (single, twin, quad, octuple)"
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4 or quad (1/single, 2/twin, 4/quad, 6/sextuple, 8/octuple)')
            .setRequired(true)
            .setMaxLength(10);

        // AA Experience level input - SHORTENED LABEL
        const experienceInput = new TextInputBuilder()
            .setCustomId('aa_experience')
            .setLabel('Crew Experience Level') // ← SHORTENED FROM "Initial AA Crew Experience Level (1-10)"
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1 (1-10)')
            .setRequired(true)
            .setMaxLength(2);

        const firstRow = new ActionRowBuilder().addComponents(caliberInput);
        const secondRow = new ActionRowBuilder().addComponents(barrelsInput);
        const thirdRow = new ActionRowBuilder().addComponents(nameInput);
        const fourthRow = new ActionRowBuilder().addComponents(mountInput);
        const fifthRow = new ActionRowBuilder().addComponents(experienceInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    // Add this method to handle AA creation submission
    async handleAACreationSubmit(interaction) {
        try {
            const customIdParts = interaction.customId.split('_');
            let aaType, userId;
            
            // Handle different customId formats
            if (customIdParts.length === 3) {
                // Format: create_aa_userId (from showAACreationForm)
                aaType = 'general'; // Default type
                userId = customIdParts[2];
            } else if (customIdParts.length === 4) {
                // Format: create_aa_aaType_userId (from showAACreationModal)
                aaType = customIdParts[2];
                userId = customIdParts[3];
            } else {
                return interaction.reply({ content: '❌ Invalid AA creation form format!', flags: MessageFlags.Ephemeral });
            }
            
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your AA creation form!', flags: MessageFlags.Ephemeral });
            }

            const tempData = this.bot.tempPlayerData.get(userId);
            if (!tempData) {
                return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
            }

            let caliberInput = interaction.fields.getTextInputValue('aa_caliber').toLowerCase().trim();

            // Normalize caliber input - accept both "76" and "76mm"
            if (caliberInput && !caliberInput.endsWith('mm')) {
                // If it's just a number, add 'mm'
                if (/^\d+(\.\d+)?$/.test(caliberInput)) {
                    caliberInput = caliberInput + 'mm';
                }
            }

            const barrels = parseInt(interaction.fields.getTextInputValue('aa_barrels'));
            const aaName = interaction.fields.getTextInputValue('aa_name');
            const mountTypeRaw = interaction.fields.getTextInputValue('aa_mount').toLowerCase().trim();
            const experienceLevel = parseInt(interaction.fields.getTextInputValue('aa_experience'));

            // Normalize AA mount configuration - accept both numbers and words
            const aaMountMapping = {
                '1': 'single',
                'single': 'single',
                '2': 'twin',
                'twin': 'twin',
                'dual': 'twin',
                '4': 'quad',
                'quad': 'quad',
                'quadruple': 'quad',
                '6': 'sextuple',
                'sextuple': 'sextuple',
                '8': 'octuple',
                'octuple': 'octuple'
            };

            const mountType = aaMountMapping[mountTypeRaw];

            // Validate caliber exists
            if (!AA_CALIBERS[caliberInput]) {
                // For 'general' type, show all available calibers
                if (aaType === 'general') {
                    const validCalibers = Object.keys(AA_CALIBERS).join(', ');
                    return interaction.reply({ 
                        content: `❌ Invalid AA caliber! Valid options: ${validCalibers}`, 
                        flags: MessageFlags.Ephemeral 
                    });
                } else {
                    // For specific types, show category-specific calibers
                    const validCalibers = getCalibersByCategory(aaType);
                    return interaction.reply({ 
                        content: `❌ Invalid ${aaType} range caliber! Valid options:\n**${aaType.toUpperCase()} RANGE:** ${validCalibers.join(', ')}\n\n${getCategoryDescription(aaType)}`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            // Validate caliber matches the expected range category (only for specific types)
            if (aaType !== 'general' && AA_CALIBERS[caliberInput].category !== aaType) {
                const validCalibers = getCalibersByCategory(aaType);
                return interaction.reply({ 
                    content: `❌ ${caliberInput} is not a ${aaType} range caliber!\n**${aaType.toUpperCase()} RANGE:** ${validCalibers.join(', ')}\n\n${getCategoryDescription(aaType)}`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // SIMPLIFIED BARREL VALIDATION - Just check reasonable bounds
            if (isNaN(barrels) || barrels < 1 || barrels > 200) {
                return interaction.reply({ 
                    content: '❌ Number of barrels must be between 1 and 200!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Validate experience level
            if (isNaN(experienceLevel) || experienceLevel < 1 || experienceLevel > 10) {
                return interaction.reply({ content: '❌ AA crew experience level must be between 1 and 10!', flags: MessageFlags.Ephemeral });
            }

            // Validate mount type
            const validMounts = ['single', 'twin', 'quad', 'sextuple', 'octuple'];
            if (!mountType || !validMounts.includes(mountType)) {
                return interaction.reply({ content: `❌ Invalid mount type! Use: 1/single, 2/twin, 4/quad, 6/sextuple, 8/octuple`, flags: MessageFlags.Ephemeral });
            }

            // Calculate effectiveness
            const effectiveness = calculateAAEffectiveness(caliberInput, mountType, barrels, experienceLevel);
            if (!effectiveness) {
                return interaction.reply({ content: '❌ Error calculating AA effectiveness!', flags: MessageFlags.Ephemeral });
            }

            // Create AA system
            const caliberData = AA_CALIBERS[caliberInput];
            const finalAAType = aaType === 'general' ? caliberData.category : aaType; // Use caliber's category for general type
            
            const aaSystem = {
                name: aaName,
                type: finalAAType,
                caliber: caliberInput,
                fullName: caliberData.name,
                barrels: barrels,
                mountType: mountType,
                experienceLevel: experienceLevel,
                experience: 0,
                efficiency: Math.round((0.6 + (experienceLevel - 1) * 0.035) * 100 * 10) / 10,
                range: effectiveness.range,
                damage: effectiveness.damage,
                accuracy: Math.round(effectiveness.accuracy * 1000) / 10,
                rateOfFire: effectiveness.rateOfFire,
                ammo: 500,
                maxAmmo: 500,
                description: caliberData.description
            };

            // Initialize aaSystems array if it doesn't exist
            if (!tempData.aaSystems) {
                tempData.aaSystems = [];
            }

            // Add the new AA system
            tempData.aaSystems.push(aaSystem);

            // Show confirmation
            await this.showAAConfirmation(interaction, tempData, aaSystem);

        } catch (error) {
            console.error('❌ Error in handleAACreationSubmit:', error);
            await interaction.reply({ content: '❌ An error occurred while creating AA system!', flags: MessageFlags.Ephemeral });
        }
    }

    async showAAConfirmation(interaction, tempData, newAASystem) {
        const existingCount = tempData.aaSystems.length;
        
        // Build description of all AA systems
        let aaDescription = tempData.aaSystems.map((aa, index) => {
            return `**${aa.type.toUpperCase()} RANGE** - ${aa.name}\n` +
                   `• ${aa.barrels}x ${aa.caliber} ${aa.mountType} mount\n` +
                   `• Range: ${aa.range} cells, Damage: ${aa.damage}, ROF: ${aa.rateOfFire}\n`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🎯 AA System ${existingCount}/3 Complete!`)
            .setDescription(`**Character:** ${tempData.username}\n\n` +
                           `**AA Systems Configured:**\n${aaDescription}\n` +
                           `${existingCount < 3 ? '**Next:** Configure additional AA range' : '**All AA systems configured!**'}`)
            .setColor(existingCount === 3 ? 0x00FF00 : 0xFF6600);

        const buttons = [];
        
        if (existingCount < 3) {
            // Add button for next AA type
            const nextType = existingCount === 1 ? 'Medium' : 'Long';
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`continue_next_aa_${interaction.user.id}`)
                    .setLabel(`➕ Add ${nextType} Range AA`)
                    .setStyle(ButtonStyle.Primary)
            );
            
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`finish_aa_${interaction.user.id}`)
                    .setLabel('✅ Finish AA Setup')
                    .setStyle(ButtonStyle.Success)
            );
        } else {
            // All 3 systems configured
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`confirm_all_aa_${interaction.user.id}`)
                    .setLabel('✅ Confirm All AA Systems')
                    .setStyle(ButtonStyle.Success)
            );
        }

        buttons.push(
            new ButtonBuilder()
                .setCustomId(`reset_aa_${interaction.user.id}`)
                .setLabel('🔄 Reset AA Setup')
                .setStyle(ButtonStyle.Danger)
        );

        const actionRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        await interaction.reply({ 
            embeds: [embed], 
            components: actionRows, 
            flags: MessageFlags.Ephemeral 
        });
    }

    // Add this method to handle AA confirmation
    async handleAAConfirmation(interaction) {
        const action = interaction.customId.includes('confirm_aa_') ? 'confirm' : 'back';
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA confirmation!', flags: MessageFlags.Ephemeral });
        }

        if (action === 'back') {
            // Go back to AA creation form
            const tempData = this.bot.tempPlayerData.get(userId);
            if (tempData) {
                await this.showAACreationForm(interaction, tempData);
            }
            return;
        }

        // Confirm and finalize character creation
        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ 
                content: '❌ Character creation session expired!', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Continue to finalize character creation
        await this.finalizeCharacterCreation(interaction, tempData);
    }

    async showAACreationModal(interaction) {
        const tempData = this.bot.tempPlayerData.get(interaction.user.id);
        const existingAASystems = tempData.aaSystems || [];
        
        // Determine what type we're creating
        let aaType = 'short';
        let titleSuffix = 'Short Range AA (≤25mm)';
        let placeholderText = '20mm (12.7mm, 20mm, 25mm)';
        let categoryDesc = 'High ROF, close-in defense';
        
        if (existingAASystems.length === 1) {
            aaType = 'medium';
            titleSuffix = 'Medium Range AA (28mm-57mm)';
            placeholderText = '40mm (28mm, 37mm, 40mm, 57mm)';
            categoryDesc = 'Balanced performance, main defense';
        } else if (existingAASystems.length === 2) {
            aaType = 'long';
            titleSuffix = 'Long Range AA (76mm+)';
            placeholderText = '127mm (76mm, 100mm, 102mm, 105mm, 113mm, 127mm)';
            categoryDesc = 'High damage, long range engagement';
        }

        const modal = new ModalBuilder()
            .setCustomId(`create_aa_${aaType}_${interaction.user.id}`)
            .setTitle(titleSuffix);

        const caliberInput = new TextInputBuilder()
            .setCustomId('aa_caliber')
            .setLabel(`${aaType.charAt(0).toUpperCase() + aaType.slice(1)} Range Caliber`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(placeholderText)
            .setRequired(true)
            .setMaxLength(8);

        const barrelsInput = new TextInputBuilder()
            .setCustomId('aa_barrels')
            .setLabel('Number of Barrels')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('40 (1-200 barrels)') // INCREASED LIMIT TO 200
            .setRequired(true)
            .setMaxLength(3); // 3 digits to handle up to 999

        const nameInput = new TextInputBuilder()
            .setCustomId('aa_name')
            .setLabel('AA System Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`${aaType.charAt(0).toUpperCase() + aaType.slice(1)} Range AA Battery`)
            .setRequired(true)
            .setMaxLength(50);

        const mountInput = new TextInputBuilder()
            .setCustomId('aa_mount')
            .setLabel('Mount Type')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4 or quad (1/single, 2/twin, 4/quad, 6/sextuple, 8/octuple)')
            .setRequired(true)
            .setMaxLength(10);

        const experienceInput = new TextInputBuilder()
            .setCustomId('aa_experience')
            .setLabel('Crew Experience Level')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1 (1-10)')
            .setRequired(true)
            .setMaxLength(2);

        const firstRow = new ActionRowBuilder().addComponents(caliberInput);
        const secondRow = new ActionRowBuilder().addComponents(barrelsInput);
        const thirdRow = new ActionRowBuilder().addComponents(nameInput);
        const fourthRow = new ActionRowBuilder().addComponents(mountInput);
        const fifthRow = new ActionRowBuilder().addComponents(experienceInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);
        await interaction.showModal(modal);
    }

    async finalizeCharacterWithAA(interaction) {
        try {
            const userId = interaction.user.id;
            const tempData = this.bot.tempPlayerData.get(userId);
            
            if (!tempData) {
                return interaction.reply({ 
                    content: '❌ Character creation session expired!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Update the interaction to show finalizing
            await interaction.update({
                content: '✅ **Finalizing character with AA systems...**',
                components: [],
                embeds: []
            });

            // Convert aaSystems array to the format expected by the rest of the system
            if (tempData.aaSystems && tempData.aaSystems.length > 0) {
                // AA systems are already in tempData.aaSystems, no need to copy to 'character'
                console.log(`✅ Character ${tempData.username} created with ${tempData.aaSystems.length} AA systems:`);
                tempData.aaSystems.forEach(aa => {
                    console.log(`  - ${aa.name} (${aa.type}, ${aa.caliber})`);
                });
            } else {
                tempData.aaSystems = [];
            }

            // Proceed with character finalization
            await this.finalizeCharacterCreation(interaction, tempData);

        } catch (error) {
            console.error('❌ Error in finalizeCharacterWithAA:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ An error occurred while finalizing character!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    }

    async finalizeCharacterWithoutAA(interaction) {
        try {
            const userId = interaction.user.id;
            const tempData = this.bot.tempPlayerData.get(userId);
            
            if (!tempData) {
                return interaction.reply({ 
                    content: '❌ Character creation session expired!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Set both aaSystem and aaSystems to null/empty
            tempData.aaSystem = null;
            tempData.aaSystems = [];

            // Update the interaction to show skipping AA
            await interaction.update({
                content: '⏭️ **Skipped AA Setup** - Finalizing character...',
                components: [],
                embeds: []
            });

            // Proceed with character finalization
            await this.finalizeCharacterCreation(interaction, tempData);

        } catch (error) {
            console.error('❌ Error in finalizeCharacterWithoutAA:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ An error occurred while finalizing character!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    }

    // Add this method to finalize character creation with AA system
    async finalizeCharacterCreation(interaction, completePlayerData) {
        try {
            // Save available aircraft and empty active squadrons for carriers
            if (!completePlayerData.availableAircraft) {
                completePlayerData.availableAircraft = new Map();
            }
            if (!completePlayerData.activeSquadrons) {
                completePlayerData.activeSquadrons = new Map();
            }

            // Legacy compatibility - keep old 'aircraft' field empty
            completePlayerData.aircraft = new Map();

            // Save to playerData (guild-scoped)
            const guildId = interaction.guildId;
            let playerEntry = this.bot.getGuildPlayerData(guildId, completePlayerData.id);
            if (!playerEntry) {
                playerEntry = {
                    characters: new Map(),
                    activeCharacter: null,
                    maxCharacters: 2
                };
            }

            // Add character to player's character collection
            const characterName = completePlayerData.username;
            playerEntry.characters.set(characterName, completePlayerData);
            playerEntry.activeCharacter = characterName;
            this.bot.setGuildPlayerData(guildId, completePlayerData.id, playerEntry);

            // Save the updated player entry
            this.bot.savePlayerData();

            // Clean up temp data
            this.bot.tempPlayerData.delete(interaction.user.id);

            // Build final description
            let finalDescription = `**Player:** ${completePlayerData.username}\n` +
                                  `**Ship:** ${completePlayerData.shipClass} (${completePlayerData.tonnage.toLocaleString()} tons)\n` +
                                  `**Speed:** ${completePlayerData.speedKnots} knots\n` +
                                  `**HP:** ${completePlayerData.stats.health} (calculated)\n` +
                                  `**Armor:** ${completePlayerData.stats.armor} (calculated)\n` +
                                  `**Range:** ${completePlayerData.stats.range} (from ${(completePlayerData.shipClass === 'Aircraft Carrier' || completePlayerData.shipClass === 'Light Aircraft Carrier') ? 'aircraft/weapons' : 'primary weapon'})\n` +
                                  `**Evasion:** ${completePlayerData.stats.evasion}% (calculated)\n` +
                                  `**Level:** ${completePlayerData.level}\n\n`;

            // Add AA system info
            if (completePlayerData.aaSystem) {
                finalDescription += `**AA System:** ${completePlayerData.aaSystem.name}\n` +
                                   `• ${completePlayerData.aaSystem.barrels}x ${completePlayerData.aaSystem.caliber} ${completePlayerData.aaSystem.mountType} mount\n` +
                                   `• Level ${completePlayerData.aaSystem.experienceLevel} crew (${completePlayerData.aaSystem.efficiency}% efficiency)\n` +
                                   `• Range: ${completePlayerData.aaSystem.range} cells, Damage: ${completePlayerData.aaSystem.damage}\n\n`;
            }

            // Add available aircraft info for carriers
            if ((completePlayerData.shipClass === 'Aircraft Carrier' || completePlayerData.shipClass === 'Light Aircraft Carrier') && completePlayerData.availableAircraft.size > 0) {
                const squadronSize = this.getSquadronSize(completePlayerData.shipClass);
                const maxSquadrons = this.calculateMaxSquadrons(completePlayerData.tonnage, completePlayerData.shipClass);
                const aircraftList = Array.from(completePlayerData.availableAircraft.entries()).map(([type, aircraft]) => 
                    `• ${aircraft.name} (${aircraft.specialAbility})`
                ).join('\n');
                finalDescription += `**Available Aircraft Types:**\n${aircraftList}\n` +
                                   `**Squadron Configuration:** ${maxSquadrons} squadrons of ${squadronSize} aircraft each\n` +
                                   `**Note:** Player selects squadrons during battle\n\n`;
            }

            // Add weapons info
            const weaponDescriptions = [];
            for (const [weaponKey, weapon] of Object.entries(completePlayerData.weapons || {})) {
                // Clean up the caliber display (remove 'mm' if it's already there)
                const caliberDisplay = weapon.caliber.replace('mm', '') + 'mm';
                
                // Use weapon.name instead of the internal key, and use weapon.barrels instead of weapon.barrelCount
                const barrelCount = weapon.barrels || weapon.barrelCount || 1; // Fallback compatibility
                
                weaponDescriptions.push(`**${weapon.name}**\n  • ${caliberDisplay}, ${barrelCount} barrels\n  • Damage: ${weapon.damage}, Range: ${weapon.range} cells`);
            }

            if (weaponDescriptions.length === 0) {
                weaponDescriptions.push('No weapons configured');
            }

            finalDescription += `**Weapons (Auto-Calculated):**\n${weaponDescriptions.join('\n\n')}\n\n` +
                               `**Battle Record:** ${completePlayerData.victories}/${completePlayerData.battles}`;

            const embed = new EmbedBuilder()
                .setTitle('✅ Player Entry Created!')
                .setDescription(finalDescription)
                .setColor(0x00FF00);

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            console.log(`✅ GM created player entry for ${completePlayerData.username} (${completePlayerData.id}) - ${completePlayerData.shipClass}`);

        } catch (error) {
            console.error('❌ Error in finalizeCharacterCreation:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred finalizing character creation!', flags: MessageFlags.Ephemeral });
            }
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         AIRCRAFT SQUADRON SELECTION                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝  

    async showSquadronTypeSelection(interaction, playerData) {
        const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_squadron_type_${interaction.user.id}`)
            .setPlaceholder('Choose squadron type for Slot 1')
            .addOptions([
                {
                    label: 'Fighter Squadron',
                    description: 'Air superiority and fleet defense',
                    value: 'fighters',
                    emoji: '✈️'
                },
                {
                    label: 'Dive Bomber Squadron', 
                    description: 'Precision anti-ship strikes',
                    value: 'dive_bombers',
                    emoji: '💣'
                },
                {
                    label: 'Torpedo Bomber Squadron',
                    description: 'Heavy torpedo attacks',
                    value: 'torpedo_bombers', 
                    emoji: '🚀'
                }
            ]);
        
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle('🛩️ Squadron Selection - Slot 1/3')
            .setDescription(`**Carrier:** ${playerData.username}\n` +
                           `**Hangar Capacity:** ${playerData.hangar} aircraft\n\n` +
                           `**Choose your squadron types (3 total):**\n` +
                           `• You can pick any combination of Fighter, Dive Bomber, and Torpedo squadrons\n` +
                           `• Duplicates are allowed (e.g., 2 Fighter + 1 Torpedo)\n` +
                           `• Selection is permanent for the entire battle\n\n` +
                           `**Select your first squadron type:**`)
            .setColor(0x0099FF);
        
        // Initialize squadron selection tracking
        if (!this.bot.tempPlayerData.has(`${interaction.user.id}_squadrons`)) {
            this.bot.tempPlayerData.set(`${interaction.user.id}_squadrons`, {
                selections: [],
                currentSlot: 1
            });
        }
        
        await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    async handleSquadronTypeSelection(interaction) {
        const userId = interaction.customId.split('_')[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your squadron selection!', flags: MessageFlags.Ephemeral });
        }
        
        const squadronType = interaction.values[0];
        const squadronData = this.bot.tempPlayerData.get(`${interaction.user.id}_squadrons`);
        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        
        if (!squadronData || !playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }
        
        // Add selection
        squadronData.selections.push(squadronType);
        squadronData.currentSlot++;
        
        this.bot.tempPlayerData.set(`${interaction.user.id}_squadrons`, squadronData);
        
        if (squadronData.currentSlot <= 3) {
            // Continue to next slot
            await this.showNextSquadronSlot(interaction, playerData, squadronData);
        } else {
            // All 3 slots filled, show confirmation
            await this.showSquadronConfirmation(interaction, playerData, squadronData);
        }
    }

    async showNextSquadronSlot(interaction, playerData, squadronData) {
        const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_squadron_type_${interaction.user.id}`)
            .setPlaceholder(`Choose squadron type for Slot ${squadronData.currentSlot}`)
            .addOptions([
                {
                    label: 'Fighter Squadron',
                    description: 'Air superiority and fleet defense', 
                    value: 'fighters',
                    emoji: '✈️'
                },
                {
                    label: 'Dive Bomber Squadron',
                    description: 'Precision anti-ship strikes',
                    value: 'dive_bombers',
                    emoji: '💣'
                },
                {
                    label: 'Torpedo Bomber Squadron',
                    description: 'Heavy torpedo attacks',
                    value: 'torpedo_bombers',
                    emoji: '🚀'
                }
            ]);
        
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        
        // Show current selections
        const currentSelections = squadronData.selections.map((type, index) => {
            const typeNames = {
                'fighters': '✈️ Fighter Squadron',
                'dive_bombers': '💣 Dive Bomber Squadron', 
                'torpedo_bombers': '🚀 Torpedo Bomber Squadron'
            };
            return `**Slot ${index + 1}:** ${typeNames[type]}`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle(`🛩️ Squadron Selection - Slot ${squadronData.currentSlot}/3`)
            .setDescription(`**Current Selections:**\n${currentSelections}\n\n` +
                           `**Select squadron type for Slot ${squadronData.currentSlot}:**`)
            .setColor(0x0099FF);
        
        await interaction.update({ embeds: [embed], components: [actionRow] });
    }

    async showSquadronConfirmation(interaction, playerData, squadronData) {
        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm_squadrons_${interaction.user.id}`)
            .setLabel('Confirm Squadron Selection')
            .setStyle(ButtonStyle.Success);
        
        const resetButton = new ButtonBuilder()
            .setCustomId(`reset_squadrons_${interaction.user.id}`)
            .setLabel('Reset and Start Over')
            .setStyle(ButtonStyle.Secondary);
        
        const actionRow = new ActionRowBuilder().addComponents(confirmButton, resetButton);
        
        // Show final selections
        const finalSelections = squadronData.selections.map((type, index) => {
            const typeNames = {
                'fighters': '✈️ Fighter Squadron',
                'dive_bombers': '💣 Dive Bomber Squadron',
                'torpedo_bombers': '🚀 Torpedo Bomber Squadron'
            };
            return `**Slot ${index + 1}:** ${typeNames[type]}`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Squadron Selection Complete')
            .setDescription(`**Final Squadron Configuration:**\n${finalSelections}\n\n` +
                           `⚠️ **Warning:** This selection is permanent for the entire battle!\n\n` +
                           `Confirm your selection or reset to choose again.`)
            .setColor(0x00FF00);
        
        await interaction.update({ embeds: [embed], components: [actionRow] });
    }

    async handleSquadronConfirmation(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your confirmation!', flags: MessageFlags.Ephemeral });
        }
        
        const isConfirm = interaction.customId.includes('confirm_squadrons_');
        const squadronData = this.bot.tempPlayerData.get(`${interaction.user.id}_squadrons`);
        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        
        if (!squadronData || !playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }
        
        if (!isConfirm) {
            // Reset squadrons
            this.bot.tempPlayerData.delete(`${interaction.user.id}_squadrons`);
            await this.showSquadronTypeSelection(interaction, playerData);
            return;
        }
        
        // Confirm and configure actual squadrons
        await this.configureSelectedSquadrons(interaction, playerData, squadronData);
    }

    async configureSelectedSquadrons(interaction, playerData, squadronData) {
        const squadronSize = this.getSquadronSize(playerData.shipClass);
        const maxSquadrons = this.calculateMaxSquadrons(playerData.tonnage, playerData.shipClass);
        
        // Limit selections to available squadrons
        const actualSelections = squadronData.selections.slice(0, maxSquadrons);
        
        const aircraft = new Map();
        let aircraftDescriptions = [];
        let totalAircraft = 0;
        
        actualSelections.forEach((squadronType, index) => {
            // Create squadron data based on type with fixed squadron size
            let squadronInfo;
            switch (squadronType) {
                case 'fighters':
                    squadronInfo = {
                        name: `Fighter Squadron ${index + 1}`,
                        count: squadronSize,
                        maxCount: squadronSize,
                        range: 8,
                        damage: 45,
                        quality: 'Standard',
                        specialAbility: 'fighter',
                        fuel: 100,
                        readiness: 100
                    };
                    break;
                case 'dive_bombers':
                    squadronInfo = {
                        name: `Dive Bomber Squadron ${index + 1}`,
                        count: squadronSize,
                        maxCount: squadronSize,
                        range: 6,
                        damage: 80,
                        quality: 'Standard',
                        specialAbility: 'bomb',
                        fuel: 100,
                        readiness: 100
                    };
                    break;
                case 'torpedo_bombers':
                    squadronInfo = {
                        name: `Torpedo Bomber Squadron ${index + 1}`,
                        count: squadronSize,
                        maxCount: squadronSize,
                        range: 7,
                        damage: 120,
                        quality: 'Standard',
                        specialAbility: 'torpedo',
                        fuel: 100,
                        readiness: 100
                    };
                    break;
            }
            
            aircraft.set(`squadron_${index + 1}`, squadronInfo);
            totalAircraft += squadronSize;
            aircraftDescriptions.push(`**${squadronInfo.name}:** ${squadronInfo.count} aircraft (${squadronSize} per squadron)\n  • Range: ${squadronInfo.range} cells, Damage: ${squadronInfo.damage}\n  • Special: ${squadronInfo.specialAbility}`);
        });
        
        // Add aircraft to player data
        playerData.aircraft = aircraft;
        playerData.totalAircraft = totalAircraft;
        playerData.maxSquadrons = maxSquadrons;
        this.bot.tempPlayerData.set(interaction.user.id, playerData);
        
        // Clean up squadron selection data
        this.bot.tempPlayerData.delete(`${interaction.user.id}_squadrons`);
        
        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_stats_${interaction.user.id}`)
            .setLabel('Continue to Stats Configuration')
            .setStyle(ButtonStyle.Primary);
        
        const actionRow = new ActionRowBuilder().addComponents(continueButton);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Aircraft Configuration Complete')
            .setDescription(`**Carrier:** ${playerData.username} (${playerData.shipClass})\n` +
                           `**Squadron Size:** ${squadronSize} aircraft per squadron\n` +
                           `**Total Squadrons:** ${actualSelections.length}/${maxSquadrons}\n` +
                           `**Total Aircraft:** ${totalAircraft}/${playerData.hangar}\n\n` +
                           `**Squadron Configuration:**\n${aircraftDescriptions.join('\n\n')}\n\n` +
                           `Click the button below to configure stats.`)
            .setColor(0x00FF00);
        
        await interaction.update({ embeds: [embed], components: [actionRow] });
    }

    async selectBattleSquadrons(guildId, playerId, squadronSelections) {
        const playerEntry = this.bot.getGuildPlayerData(guildId, playerId);
        if (!playerEntry || !playerEntry.characters) {
            throw new Error('Player not found');
        }

        const activeCharacter = playerEntry.characters.get(playerEntry.activeCharacter);
        if (!activeCharacter) {
            throw new Error('No active character found');
        }

        const squadronSize = this.getSquadronSize(activeCharacter.shipClass);
        const maxSquadrons = this.calculateMaxSquadrons(activeCharacter.tonnage, activeCharacter.shipClass);

        if (squadronSelections.length > maxSquadrons) {
            throw new Error(`Cannot select more than ${maxSquadrons} squadrons`);
        }

        // Clear existing active squadrons
        activeCharacter.activeSquadrons = new Map();

        // Create active squadrons based on selections
        squadronSelections.forEach((selectedType, index) => {
            const availableAircraft = activeCharacter.availableAircraft.get(selectedType);
            if (!availableAircraft) {
                throw new Error(`Aircraft type ${selectedType} not available to this player`);
            }

            // Create squadron based on available aircraft template
            const squadron = {
                name: `${availableAircraft.name} Squadron ${index + 1}`,
                count: squadronSize,
                maxCount: squadronSize,
                range: availableAircraft.range,
                damage: availableAircraft.damage,
                quality: availableAircraft.quality,
                specialAbility: availableAircraft.specialAbility,
                fuel: 100,
                readiness: 100,
                aircraftType: selectedType
            };

            activeCharacter.activeSquadrons.set(`squadron_${index + 1}`, squadron);
        });

        // Save the updated data
        this.bot.savePlayerData();

        return {
            success: true,
            squadronsConfigured: squadronSelections.length,
            totalAircraft: squadronSelections.length * squadronSize
        };
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         LEGACY & UTILITY FUNCTIONS                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async handleDuplicateUsername(interaction, playerId, username, shipClass, tonnage, level, experience, currency, existingPlayer) {
        const overwriteButton = new ButtonBuilder()
            .setCustomId(`overwrite_confirm_${interaction.user.id}`)
            .setLabel('Overwrite Existing')
            .setStyle(ButtonStyle.Danger);

        const abortButton = new ButtonBuilder()
            .setCustomId(`overwrite_abort_${interaction.user.id}`)
            .setLabel('Abort Creation')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(overwriteButton, abortButton);

        const newPlayerData = { id: playerId, username, shipClass, tonnage, level, experience, currency };
        this.bot.tempPlayerData.set(`${interaction.user.id}_overwrite`, {
            newPlayer: newPlayerData,
            existingPlayerId: existingPlayer.id
        });

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Duplicate Username Detected')
            .setDescription(`**Warning:** A player with username "${username}" already exists!\n\n` +
                           `**Existing Player:**\n• ID: ${existingPlayer.id}\n• Level: ${existingPlayer.level}\n\n` +
                           `**New Player Data:**\n• ID: ${playerId}\n• Level: ${level}\n\n` +
                           `Do you want to overwrite the existing player or abort?`)
            .setColor(0xFF6600);

        return interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    async handleOverwriteConfirmation(interaction) {
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your confirmation!', flags: MessageFlags.Ephemeral });
        }

        const isConfirm = interaction.customId.includes('overwrite_confirm_');
        const overwriteData = this.bot.tempPlayerData.get(`${interaction.user.id}_overwrite`);
        
        if (!overwriteData) {
            return interaction.reply({ content: '❌ Session expired. Please start over with /newchar.', flags: MessageFlags.Ephemeral });
        }

        if (!isConfirm) {
            this.bot.tempPlayerData.delete(`${interaction.user.id}_overwrite`);
            return interaction.update({ 
                content: '❌ Player creation aborted.', 
                embeds: [], 
                components: [] 
            });
        }

        // Confirm overwrite (guild-scoped)
        const guildId = interaction.guildId;
        this.bot.deleteGuildPlayerData(guildId, overwriteData.existingPlayerId);
        
        const newPlayer = overwriteData.newPlayer;
        const calculatedHP = this.calculateShipHP(newPlayer.tonnage, newPlayer.shipClass);
        
        await this.continueToStats(interaction, newPlayer.id, newPlayer.username, newPlayer.shipClass, 
                                   newPlayer.tonnage, calculatedHP, newPlayer.level, newPlayer.experience, newPlayer.currency);
        
        this.bot.tempPlayerData.delete(`${interaction.user.id}_overwrite`);
    }

    async handleAircraftCreationSubmit(interaction) {
        const fighterSquad = interaction.fields.getTextInputValue('fighters')?.trim() || '';
        const bomberSquad = interaction.fields.getTextInputValue('bombers')?.trim() || '';
        const torpedoSquad = interaction.fields.getTextInputValue('torpedo_bombers')?.trim() || '';
        const scoutSquad = interaction.fields.getTextInputValue('scouts')?.trim() || '';

        const playerData = this.bot.tempPlayerData.get(interaction.user.id);
        if (!playerData) {
            return interaction.reply({ content: '❌ Session expired. Please start over.', flags: MessageFlags.Ephemeral });
        }

        let aircraft = new Map();
        let aircraftDescriptions = [];
        let totalAircraft = 0;

        // Parse each squadron type
        const squadronTypes = [
            { data: fighterSquad, type: 'fighters', name: 'Fighter Squadron' },
            { data: bomberSquad, type: 'bombers', name: 'Dive Bomber Squadron' },
            { data: torpedoSquad, type: 'torpedo_bombers', name: 'Torpedo Bomber Squadron' },
            { data: scoutSquad, type: 'scouts', name: 'Scout Squadron' }
        ];

        for (const squadron of squadronTypes) {
            if (squadron.data) {
                const parsed = this.parseAircraftString(squadron.data, squadron.name);
                if (parsed.error) {
                    return interaction.reply({ content: `❌ ${squadron.name} error: ${parsed.error}`, flags: MessageFlags.Ephemeral });
                }
                
                totalAircraft += parsed.count;
                aircraft.set(squadron.type, parsed);
                aircraftDescriptions.push(`**${squadron.name}:** ${parsed.name}\n  • Count: ${parsed.count}, Range: ${parsed.range} cells\n  • Damage: ${parsed.damage}, Quality: ${parsed.quality}\n  • Special: ${parsed.specialAbility}`);
            }
        }

        // Check hangar capacity
        if (totalAircraft > playerData.hangar) {
            return interaction.reply({ 
                content: `❌ Total aircraft (${totalAircraft}) exceeds hangar capacity (${playerData.hangar})! Reduce aircraft count or remove some squadrons.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Add aircraft data to player
        playerData.aircraft = aircraft;
        
        this.bot.tempPlayerData.set(interaction.user.id, playerData);

        const continueButton = new ButtonBuilder()
            .setCustomId(`continue_stats_${interaction.user.id}`)
            .setLabel('Continue to Stats Configuration')
            .setStyle(ButtonStyle.Primary);

        const actionRow = new ActionRowBuilder().addComponents(continueButton);

        const aircraftText = aircraftDescriptions.length > 0 ? 
            `**Aircraft Configured:**\n${aircraftDescriptions.join('\n\n')}\n\n**Total Aircraft:** ${totalAircraft}/${playerData.hangar}\n\n` :
            `**No aircraft configured** - Basic carrier setup\n\n`;

        const embed = new EmbedBuilder()
            .setTitle('✅ Aircraft Configuration Complete')
            .setDescription(`**Carrier:** ${playerData.username}\n` +
                           `**Hangar Capacity:** ${playerData.hangar}\n\n` +
                           aircraftText +
                           `Click the button below to configure stats.`)
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    getWeatherAccuracyModifier(weather) {
        const weatherModifiers = {
            'clear': 1.0,
            'cloudy': 0.95,
            'rain': 0.85,
            'storm': 0.7,
            'fog': 0.6
        };
        
        return weatherModifiers[weather] || 1.0;
    }
}

class PenetrationCalculator {

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PENETRATION CALCULATOR CLASS                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    constructor() {
        // Historical penetration data for different shell types
        this.shellTypeModifiers = {
            'ap': {
                name: 'Armor Piercing',
                basePenetration: 1.0,
                description: 'Standard armor-piercing shells with solid penetrators'
            },
            'he': {
                name: 'High Explosive',
                basePenetration: 0.08,
                description: 'Explosive shells designed for damage, minimal penetration'
            },
            'torpedo': {
                name: 'Torpedo',
                basePenetration: 2.2,
                description: 'Underwater explosive warheads with devastating penetration'
            }
        };

        // All shells are standard quality - no quality multipliers needed

        // Historical penetration benchmarks (caliber in mm : penetration at 1000m)
        this.historicalBenchmarks = {
            // Small caliber guns
            20: 15, 25: 20, 30: 25, 37: 30, 40: 35, 47: 40,
            
            // Medium caliber guns  
            50: 45, 57: 50, 75: 65, 76: 70, 88: 85, 90: 90,
            100: 95, 105: 100, 114: 110, 120: 115, 127: 120,
            
            // Heavy caliber guns
            130: 125, 140: 135, 150: 145, 152: 150, 155: 155,
            180: 170, 203: 190, 210: 200, 234: 220, 240: 230,
            
            // Battleship guns
            280: 260, 283: 265, 305: 280, 320: 295, 330: 305,
            340: 315, 356: 325, 380: 345, 381: 350, 406: 370,
            410: 375, 420: 385, 460: 420, 480: 440, 500: 460,
            
            // Super-heavy guns
            510: 470, 520: 480, 530: 490, 540: 500, 600: 550
        };
    }

    calculatePenetration(caliberMM, shellType, barrelLength = 50) {
        // Get base penetration from caliber
        const basePenetration = this.getBasePenetrationFromCaliber(caliberMM);
        
        // Get shell type modifier
        const shellData = this.shellTypeModifiers[shellType.toLowerCase()] || this.shellTypeModifiers['ap'];
        
        // Barrel length modifier (longer barrels = higher velocity = more penetration)
        const barrelLengthModifier = this.calculateBarrelLengthModifier(barrelLength);
        
        // Calculate final penetration (all shells are standard quality)
        const finalPenetration = Math.round(
            basePenetration * 
            shellData.basePenetration * 
            barrelLengthModifier
        );

        // Calculate penetration at different ranges
        const penetrationAtRange = this.calculatePenetrationAtRange(finalPenetration, shellType);

        return {
            penetration: Math.max(finalPenetration, 1), // Minimum 1mm penetration
            breakdown: {
                caliber: caliberMM,
                basePenetration: basePenetration,
                shellType: shellData.name,
                shellMultiplier: shellData.basePenetration,
                barrelLength: barrelLength,
                barrelModifier: barrelLengthModifier
            },
            rangeData: penetrationAtRange,
            description: shellData.description
        };
    }

    getBasePenetrationFromCaliber(caliberMM) {
        const calibers = Object.keys(this.historicalBenchmarks).map(Number).sort((a, b) => a - b);
        
        // Direct match
        if (this.historicalBenchmarks[caliberMM]) {
            return this.historicalBenchmarks[caliberMM];
        }
        
        // Handle edge cases
        if (caliberMM <= calibers[0]) {
            return this.historicalBenchmarks[calibers[0]];
        }
        if (caliberMM >= calibers[calibers.length - 1]) {
            return this.historicalBenchmarks[calibers[calibers.length - 1]];
        }
        
        // Linear interpolation between two closest values
        let lowerCaliber = calibers[0];
        let upperCaliber = calibers[calibers.length - 1];
        
        for (let i = 0; i < calibers.length - 1; i++) {
            if (caliberMM >= calibers[i] && caliberMM <= calibers[i + 1]) {
                lowerCaliber = calibers[i];
                upperCaliber = calibers[i + 1];
                break;
            }
        }
        
        const lowerPenetration = this.historicalBenchmarks[lowerCaliber];
        const upperPenetration = this.historicalBenchmarks[upperCaliber];
        const ratio = (caliberMM - lowerCaliber) / (upperCaliber - lowerCaliber);
        
        return Math.round(lowerPenetration + (upperPenetration - lowerPenetration) * ratio);
    }

    calculateBarrelLengthModifier(barrelLength) {
        // Standard barrel length is L/50
        const standardLength = 50;
        const lengthRatio = barrelLength / standardLength;
        
        // Barrel length affects muzzle velocity, which affects penetration
        // Longer barrels = higher velocity = more penetration
        // But with diminishing returns
        return Math.pow(lengthRatio, 0.3);
    }

    calculatePenetrationAtRange(basePenetration, shellType) {
        const shellData = this.shellTypeModifiers[shellType.toLowerCase()] || this.shellTypeModifiers['ap'];
        
        // Different shell types lose penetration at different rates
        const degradationRates = {
            'ap': 0.85,     // Good ballistic coefficient
            'he': 0.90,     // Doesn't matter much for HE
            'torpedo': 1.0  // No range degradation
        };
        
        const degradationRate = degradationRates[shellType.toLowerCase()] || 0.85;
        
        return {
            pointBlank: basePenetration,
            short: Math.round(basePenetration * Math.pow(degradationRate, 0.5)),
            medium: Math.round(basePenetration * degradationRate),
            long: Math.round(basePenetration * Math.pow(degradationRate, 1.5)),
            extreme: Math.round(basePenetration * Math.pow(degradationRate, 2))
        };
    }

    getRecommendedShellTypes(caliberMM) {
        if (caliberMM < 50) {
            return ['ap', 'he'];
        } else {
            return ['ap', 'he'];
        }
    }

    generatePenetrationDisplay(penetrationData) {
        const { penetration, breakdown, rangeData, description } = penetrationData;
        
        return `**${breakdown.shellType}**\n` +
               `• Penetration: ${penetration}mm\n` +
               `• Point Blank: ${rangeData.pointBlank}mm\n` +
               `• Short Range: ${rangeData.short}mm\n` +
               `• Medium Range: ${rangeData.medium}mm\n` +
               `• Long Range: ${rangeData.long}mm\n` +
               `• Extreme Range: ${rangeData.extreme}mm\n` +
               `*${description}*`;
    }
}

module.exports = PlayerCreationModule;