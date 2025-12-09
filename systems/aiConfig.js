// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           AI CONFIGURATION MODULE                            ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class AIConfig {
    constructor() {
        this.aiTypes = new Map();
        this.initializeAI();
    }

    initializeAI() {

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               DESTROYERS                                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

        this.aiTypes.set('ro_class', {
            name: "[DD] Ro-Class",
            type: "destroyer",
            shipClass: "AI Destroyer",
            tonnage: 2000,
            speedKnots: 35,
            armorThickness: { belt: 15, deck: 10, turret: 8 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(2000, 'Destroyer'),
                armor: this.calculateArmor(15, 10, 8),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 2000),
                range: 8, // Will be set from primary weapon
                baseAccuracy: 75
            },
            weapons: {
                primary: {
                    name: "127mm Single",
                    shellWeight: 25,
                    barrelCount: 2,
                    caliber: 127,
                    damage: this.calculateWeaponDamage(25, 2, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2,
                    ammo: 100,
                    penetration: 120,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: "533mm Torpedo",
                    shellWeight: 400,
                    barrelCount: 4,
                    caliber: 533,
                    damage: this.calculateWeaponDamage(400, 4, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5,
                    ammo: 12,
                    penetration: 300,
                    quality: 'Standard',
                    ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('ro_class_elite', {
            name: "[DD] Ro-Class Elite",
            type: "destroyer",
            shipClass: "AI Destroyer",
            tonnage: 2200,
            speedKnots: 36,
            armorThickness: { belt: 18, deck: 12, turret: 10 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(2200, 'Destroyer'),
                armor: this.calculateArmor(18, 12, 10),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 2200),
                range: 8,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: "127mm Twin",
                    shellWeight: 25,
                    barrelCount: 4,
                    caliber: 127,
                    damage: this.calculateWeaponDamage(25, 4, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2,
                    ammo: 120,
                    penetration: 130,
                    quality: 'High',
                    ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: "533mm Torpedo",
                    shellWeight: 400,
                    barrelCount: 4,
                    caliber: 533,
                    damage: this.calculateWeaponDamage(400, 4, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5,
                    ammo: 16,
                    penetration: 320,
                    quality: 'High',
                    ammoTypes: ['torpedo']
                }
            }
        });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              LIGHT CRUISERS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

        this.aiTypes.set('he_class', {
            name: "[CL] He-Class",
            type: "lightcruiser",
            shipClass: "AI Light Cruiser",
            tonnage: 6000,
            speedKnots: 32,
            armorThickness: { belt: 25, deck: 15, turret: 15 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(6000, 'Light Cruiser'),
                armor: this.calculateArmor(25, 15, 15),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 6000),
                range: 10,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: "152mm Twin",
                    shellWeight: 45,
                    barrelCount: 6,
                    caliber: 152,
                    damage: this.calculateWeaponDamage(45, 6, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2,
                    ammo: 150,
                    penetration: 140,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: "76mm AA",
                    shellWeight: 6,
                    barrelCount: 8,
                    caliber: 76,
                    damage: this.calculateWeaponDamage(6, 8, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 1,
                    ammo: 200,
                    penetration: 80,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                }
            }
        });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               HEAVY CRUISERS                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

        this.aiTypes.set('ri_class', {
            name: "[CA] Ri-Class",
            type: "cruiser",
            shipClass: "AI Heavy Cruiser",
            tonnage: 10000,
            speedKnots: 30,
            armorThickness: { belt: 40, deck: 20, turret: 25 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(10000, 'Heavy Cruiser'),
                armor: this.calculateArmor(40, 20, 25),
                speed: this.calculateSpeed(30),
                evasion: this.calculateEvasion(30, 10000),
                range: 12,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: "203mm Triple",
                    shellWeight: 122,
                    barrelCount: 6,
                    caliber: 203,
                    damage: this.calculateWeaponDamage(122, 6, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3,
                    ammo: 100,
                    penetration: 200,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: "127mm DP",
                    shellWeight: 25,
                    barrelCount: 8,
                    caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2,
                    ammo: 200,
                    penetration: 120,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: "610mm Long Lance",
                    shellWeight: 500,
                    barrelCount: 8,
                    caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 6,
                    ammo: 16,
                    penetration: 350,
                    quality: 'High',
                    ammoTypes: ['torpedo']
                }
            }
        });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               BATTLESHIPS                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

        this.aiTypes.set('ru_class', {
            name: "[BB] Ru-Class",
            type: "battleship",
            shipClass: "AI Battleship",
            tonnage: 35000,
            speedKnots: 23,
            armorThickness: { belt: 80, deck: 30, turret: 50 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(35000, 'Battleship'),
                armor: this.calculateArmor(80, 30, 50),
                speed: this.calculateSpeed(23),
                evasion: this.calculateEvasion(23, 35000),
                range: 18,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: "406mm Triple",
                    shellWeight: 870,
                    barrelCount: 6,
                    caliber: 406,
                    damage: this.calculateWeaponDamage(870, 6, 'High'),
                    range: this.calculateGunRange(406),
                    reload: 4,
                    ammo: 60,
                    penetration: 400,
                    quality: 'High',
                    ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: "152mm Twin",
                    shellWeight: 45,
                    barrelCount: 12,
                    caliber: 152,
                    damage: this.calculateWeaponDamage(45, 12, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2,
                    ammo: 200,
                    penetration: 140,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                }
            }
        });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        AIRCRAFT CARRIERS WITH HP SYSTEM                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

        this.aiTypes.set('wo_class', {
            name: "[CV] Wo-Class",
            type: "carrier",
            shipClass: "AI Aircraft Carrier",
            tonnage: 25000,
            speedKnots: 25,
            armorThickness: { belt: 30, deck: 25, turret: 15 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(25000, 'Aircraft Carrier'),
                armor: this.calculateArmor(30, 25, 15),
                speed: this.calculateSpeed(25),
                evasion: this.calculateEvasion(25, 25000),
                range: 15, // Aircraft range
                baseAccuracy: 70
            },
            hangar: 24, // AI carrier aircraft capacity
            weapons: {
                secondary: {
                    name: "127mm DP",
                    shellWeight: 25,
                    barrelCount: 8,
                    caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2,
                    ammo: 200,
                    penetration: 120,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                }
            },
            // NEW: AI Aircraft with HP System
            aircraft: new Map([
                ['fighter_squadron', {
                    name: "AI Zero Fighter Squadron",
                    count: 8,
                    maxCount: 8,
                    range: 12,
                    damage: 50,
                    hp: 25,                          // Individual aircraft HP
                    maxHP: 25,
                    squadronHP: 25 * 8,              // Squadron HP = 200
                    maxSquadronHP: 25 * 8,
                    quality: 'Standard',
                    specialAbility: 'fighter',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'fighter',
                    isAI: true
                }],
                ['bomber_squadron', {
                    name: "AI Dive Bomber Squadron",
                    count: 6,
                    maxCount: 6,
                    range: 10,
                    damage: 85,
                    hp: 35,                          // Individual aircraft HP
                    maxHP: 35,
                    squadronHP: 35 * 6,              // Squadron HP = 210
                    maxSquadronHP: 35 * 6,
                    quality: 'Standard',
                    specialAbility: 'bomb',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'bomber',
                    isAI: true
                }]
            ])
        });

        // Enhanced AI Carrier
        this.aiTypes.set('wo_class_elite', {
            name: "[CV] Wo-Class Elite",
            type: "carrier",
            shipClass: "AI Aircraft Carrier",
            tonnage: 28000,
            speedKnots: 27,
            armorThickness: { belt: 35, deck: 30, turret: 20 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(28000, 'Aircraft Carrier'),
                armor: this.calculateArmor(35, 30, 20),
                speed: this.calculateSpeed(27),
                evasion: this.calculateEvasion(27, 28000),
                range: 18, // Aircraft range
                baseAccuracy: 75
            },
            hangar: 32, // Larger aircraft capacity
            weapons: {
                secondary: {
                    name: "127mm DP Twin",
                    shellWeight: 25,
                    barrelCount: 12,
                    caliber: 127,
                    damage: this.calculateWeaponDamage(25, 12, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2,
                    ammo: 250,
                    penetration: 130,
                    quality: 'High',
                    ammoTypes: ['ap', 'he']
                }
            },
            // Elite AI Aircraft with better stats and HP
            aircraft: new Map([
                ['fighter_squadron_1', {
                    name: "Elite Zero Fighter Squadron",
                    count: 10,
                    maxCount: 10,
                    range: 14,
                    damage: 60,
                    hp: 30,                          // Higher HP for elite
                    maxHP: 30,
                    squadronHP: 30 * 10,             // Squadron HP = 300
                    maxSquadronHP: 30 * 10,
                    quality: 'High',
                    specialAbility: 'fighter',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'fighter',
                    isAI: true
                }],
                ['bomber_squadron_1', {
                    name: "Elite Dive Bomber Squadron",
                    count: 8,
                    maxCount: 8,
                    range: 12,
                    damage: 95,
                    hp: 40,                          // Higher HP for elite
                    maxHP: 40,
                    squadronHP: 40 * 8,              // Squadron HP = 320
                    maxSquadronHP: 40 * 8,
                    quality: 'High',
                    specialAbility: 'bomb',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'bomber',
                    isAI: true
                }],
                ['torpedo_squadron_1', {
                    name: "Elite Torpedo Bomber Squadron",
                    count: 6,
                    maxCount: 6,
                    range: 10,
                    damage: 130,
                    hp: 35,                          // Moderate HP but deadly
                    maxHP: 35,
                    squadronHP: 35 * 6,              // Squadron HP = 210
                    maxSquadronHP: 35 * 6,
                    quality: 'High',
                    specialAbility: 'torpedo',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'torpedo',
                    isAI: true
                }]
            ])
        });

        // Light AI Carrier
        this.aiTypes.set('nu_class', {
            name: "[CVL] Nu-Class",
            type: "lightcarrier",
            shipClass: "AI Light Aircraft Carrier",
            tonnage: 15000,
            speedKnots: 28,
            armorThickness: { belt: 20, deck: 15, turret: 10 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(15000, 'Light Aircraft Carrier'),
                armor: this.calculateArmor(20, 15, 10),
                speed: this.calculateSpeed(28),
                evasion: this.calculateEvasion(28, 15000),
                range: 12, // Aircraft range
                baseAccuracy: 70
            },
            hangar: 18, // Smaller aircraft capacity
            weapons: {
                secondary: {
                    name: "76mm AA",
                    shellWeight: 6,
                    barrelCount: 6,
                    caliber: 76,
                    damage: this.calculateWeaponDamage(6, 6, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 1,
                    ammo: 300,
                    penetration: 80,
                    quality: 'Standard',
                    ammoTypes: ['ap', 'he']
                }
            },
            // Light carrier aircraft with HP
            aircraft: new Map([
                ['fighter_squadron', {
                    name: "Light Fighter Squadron",
                    count: 6,
                    maxCount: 6,
                    range: 10,
                    damage: 45,
                    hp: 22,                          // Slightly lower HP
                    maxHP: 22,
                    squadronHP: 22 * 6,              // Squadron HP = 132
                    maxSquadronHP: 22 * 6,
                    quality: 'Standard',
                    specialAbility: 'fighter',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'fighter',
                    isAI: true
                }],
                ['bomber_squadron', {
                    name: "Light Bomber Squadron",
                    count: 4,
                    maxCount: 4,
                    range: 8,
                    damage: 75,
                    hp: 32,                          // Standard bomber HP
                    maxHP: 32,
                    squadronHP: 32 * 4,              // Squadron HP = 128
                    maxSquadronHP: 32 * 4,
                    quality: 'Standard',
                    specialAbility: 'bomb',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: 'bomber',
                    isAI: true
                }]
            ])
        });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               SUBMARINES                                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
        // TO BE IMPLEMENTED LATER
    }

    // Calculation methods (same as player creation)
    calculateHP(tonnage, shipClass) {
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
        if (!params) return 100;
        
        const calculatedHP = Math.round(params.baseHP + (tonnage * params.multiplier) + params.bonus);
        return Math.max(calculatedHP, 20);
    }

    calculateArmor(beltMM, deckMM, turretMM) {
        const calculatedArmor = (beltMM * 0.6) + (deckMM * 0.25) + (turretMM * 0.15);
        return Math.max(5, Math.min(Math.round(calculatedArmor), 500));
    }

    calculateSpeed(speedKnots) {
        if (speedKnots < 20) return 3;
        if (speedKnots >= 21 && speedKnots <= 24) return 4;
        if (speedKnots >= 25 && speedKnots <= 28) return 5;
        if (speedKnots >= 29 && speedKnots <= 31) return 6;
        if (speedKnots >= 32 && speedKnots <= 35) return 7;
        if (speedKnots >= 36 && speedKnots <= 39) return 8;
        if (speedKnots >= 40) return 9;
        return 3;
    }

    calculateEvasion(speedKnots, tonnage) {
        const baseEvasion = 0.1;
        const referenceSpeed = 25;
        const referenceSize = 8000;
        
        const speedFactor = Math.pow(speedKnots / referenceSpeed, 2);
        const sizeFactor = Math.sqrt(referenceSize / tonnage);
        const evasionChance = baseEvasion * speedFactor * sizeFactor;
        const evasionPercentage = Math.round(evasionChance * 1000) / 10;
        
        return Math.max(1.0, Math.min(evasionPercentage, 75.0));
    }

    calculateWeaponDamage(shellWeight, barrelCount, quality = 'Standard') {
        const qualityModifiers = {
            'Poor': 0.85,
            'Standard': 1.0,
            'High': 1.15,
            'Exceptional': 1.3
        };
        
        const qualityModifier = qualityModifiers[quality] || 1.0;
        const baseDamage = (shellWeight * 0.2) + (barrelCount * 4);
        const barrelEfficiency = Math.max(0.8, 1.0 - ((barrelCount - 1) * 0.05));
        
        return Math.round(baseDamage * barrelEfficiency * qualityModifier);
    }

    calculateGunRange(caliberMM) {
        const rangeTable = {
            20: 2, 25: 2, 30: 2, 37: 3, 40: 3, 50: 4, 76: 5, 88: 6, 100: 6,
            114: 7, 127: 8, 130: 8, 140: 9, 150: 9, 152: 9, 155: 10, 180: 10,
            203: 12, 234: 13, 280: 16, 305: 18, 330: 19, 356: 20, 380: 21,
            381: 21, 406: 22, 410: 22, 420: 23, 467: 24, 460: 24, 480: 25,
            508: 26, 530: 27, 533: 27, 610: 27
        };
        
        if (rangeTable[caliberMM]) {
            return rangeTable[caliberMM];
        }
        
        // Find closest caliber
        const calibers = Object.keys(rangeTable).map(Number).sort((a, b) => a - b);
        let closestCaliber = calibers[0];
        let minDifference = Math.abs(caliberMM - calibers[0]);
        
        for (const cal of calibers) {
            const difference = Math.abs(caliberMM - cal);
            if (difference < minDifference) {
                minDifference = difference;
                closestCaliber = cal;
            }
        }
        
        return rangeTable[closestCaliber];
    }

    // NEW: Aircraft HP Management Methods for AI
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

    damageAISquadron(squadron, damageAmount) {
        if (!squadron || !squadron.squadronHP) {
            return {
                success: false,
                error: 'Invalid AI squadron data'
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

    // Public methods
    getRandomAI() {
        const aiKeys = Array.from(this.aiTypes.keys());
        const randomKey = aiKeys[Math.floor(Math.random() * aiKeys.length)];
        return this.aiTypes.get(randomKey);
    }

    getAIByType(type) {
        return this.aiTypes.get(type);
    }

    getAllAITypes() {
        return this.aiTypes;
    }

    getAIByShipClass(shipClass) {
        const filtered = [];
        for (const [key, ai] of this.aiTypes.entries()) {
            if (ai.type === shipClass.toLowerCase() || 
                ai.shipClass.toLowerCase().includes(shipClass.toLowerCase())) {
                filtered.push(ai);
            }
        }
        return filtered;
    }

    // NEW: Get AI carriers with aircraft
    getAICarriers() {
        const carriers = [];
        for (const [key, ai] of this.aiTypes.entries()) {
            if (ai.type === 'carrier' || ai.type === 'lightcarrier') {
                carriers.push({ key, ...ai });
            }
        }
        return carriers;
    }

    // NEW: Create AI squadron for battle
    createAISquadronForBattle(carrierType, squadronType, difficulty = 'normal') {
        const carrier = this.aiTypes.get(carrierType);
        if (!carrier || !carrier.aircraft) {
            return { error: 'Invalid AI carrier type or no aircraft available' };
        }

        const template = Array.from(carrier.aircraft.values()).find(a => a.aircraftType === squadronType);
        if (!template) {
            return { error: `No ${squadronType} squadron available for ${carrierType}` };
        }

        // Adjust stats based on difficulty
        const difficultyModifiers = {
            easy: { hpMod: 0.8, damageMod: 0.9, countMod: 0.8 },
            normal: { hpMod: 1.0, damageMod: 1.0, countMod: 1.0 },
            hard: { hpMod: 1.2, damageMod: 1.15, countMod: 1.2 },
            nightmare: { hpMod: 1.5, damageMod: 1.3, countMod: 1.4 }
        };

        const modifier = difficultyModifiers[difficulty] || difficultyModifiers.normal;
        
        // Create modified squadron
        const adjustedCount = Math.round(template.count * modifier.countMod);
        const adjustedHP = Math.round(template.hp * modifier.hpMod);
        const adjustedDamage = Math.round(template.damage * modifier.damageMod);

        return {
            name: `${template.name} (${difficulty.toUpperCase()})`,
            count: adjustedCount,
            maxCount: adjustedCount,
            range: template.range,
            damage: adjustedDamage,
            hp: adjustedHP,
            maxHP: adjustedHP,
            squadronHP: adjustedHP * adjustedCount,
            maxSquadronHP: adjustedHP * adjustedCount,
            quality: template.quality,
            specialAbility: template.specialAbility,
            fuel: 100,
            readiness: 100,
            aircraftType: template.aircraftType,
            isAI: true,
            difficulty: difficulty
        };
    }

    // NEW: Display AI squadron status
    displayAISquadronStatus(squadron, squadronName) {
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
        
        const difficultyTag = squadron.difficulty ? ` [${squadron.difficulty.toUpperCase()}]` : '';
        
        return `${statusEmoji} **[AI] ${squadronName}**${difficultyTag} - ${status.status}\n` +
               `  • Aircraft: ${status.effectiveCount}/${squadron.maxCount} operational\n` +
               `  • Squadron HP: ${squadron.squadronHP}/${squadron.maxSquadronHP} (${status.hpPercentage}%)\n` +
               `  • Individual HP: ${squadron.hp}/${squadron.maxHP} per aircraft\n` +
               `  • Type: ${squadron.aircraftType} (${squadron.specialAbility})\n` +
               `  • Damage: ${squadron.damage} per attack\n` +
               `  • ${status.canOperate ? 'Combat capable' : 'Cannot engage'}`;
    }

    // NEW: Calculate AI aircraft combat effectiveness
    calculateAIAircraftEffectiveness(squadron) {
        const status = this.calculateSquadronStatus(squadron);
        
        // AI aircraft effectiveness based on remaining HP and fuel/readiness
        const hpEffectiveness = status.hpPercentage / 100;
        const fuelEffectiveness = (squadron.fuel || 100) / 100;
        const readinessEffectiveness = (squadron.readiness || 100) / 100;
        
        const overallEffectiveness = hpEffectiveness * fuelEffectiveness * readinessEffectiveness;
        
        return {
            effectiveAircraft: status.effectiveCount,
            combatEffectiveness: Math.round(overallEffectiveness * 100),
            effectiveDamage: Math.round(squadron.damage * overallEffectiveness),
            canAttack: status.canOperate && squadron.fuel > 10 && squadron.readiness > 20,
            recommendedAction: overallEffectiveness < 0.3 ? 'Withdraw for repairs' : 
                              overallEffectiveness < 0.6 ? 'Reduced combat role' : 'Full combat capability',
            statusSummary: status
        };
    }

    // NEW: Generate AI air raid formation
    generateAIAirRaid(raidType = 'balanced', difficulty = 'normal', totalAircraft = 30) {
        const raidCompositions = {
            fighter_sweep: { fighter: 1.0, bomber: 0.0, torpedo: 0.0 },
            balanced: { fighter: 0.5, bomber: 0.3, torpedo: 0.2 },
            strike: { fighter: 0.3, bomber: 0.5, torpedo: 0.2 },
            torpedo_attack: { fighter: 0.3, bomber: 0.1, torpedo: 0.6 },
            heavy_bomber: { fighter: 0.2, bomber: 0.8, torpedo: 0.0 }
        };

        const composition = raidCompositions[raidType] || raidCompositions.balanced;
        const squadrons = new Map();

        // Calculate aircraft distribution
        const fighterCount = Math.round(totalAircraft * composition.fighter);
        const bomberCount = Math.round(totalAircraft * composition.bomber);
        const torpedoCount = Math.round(totalAircraft * composition.torpedo);

        let squadronIndex = 1;

        // Create fighter squadrons
        if (fighterCount > 0) {
            const squadronsNeeded = Math.ceil(fighterCount / 12); // Max 12 per squadron
            for (let i = 0; i < squadronsNeeded; i++) {
                const aircraftInSquadron = Math.min(12, fighterCount - (i * 12));
                if (aircraftInSquadron > 0) {
                    const squadron = this.createCustomAISquadron(
                        `AI Fighter Squadron ${squadronIndex}`,
                        'fighter',
                        aircraftInSquadron,
                        { damage: 50, hp: 25, range: 12 },
                        difficulty
                    );
                    squadrons.set(`fighter_${squadronIndex}`, squadron);
                    squadronIndex++;
                }
            }
        }

        // Create bomber squadrons
        if (bomberCount > 0) {
            const squadronsNeeded = Math.ceil(bomberCount / 10); // Max 10 per squadron
            for (let i = 0; i < squadronsNeeded; i++) {
                const aircraftInSquadron = Math.min(10, bomberCount - (i * 10));
                if (aircraftInSquadron > 0) {
                    const squadron = this.createCustomAISquadron(
                        `AI Bomber Squadron ${squadronIndex}`,
                        'bomber',
                        aircraftInSquadron,
                        { damage: 85, hp: 35, range: 10 },
                        difficulty
                    );
                    squadrons.set(`bomber_${squadronIndex}`, squadron);
                    squadronIndex++;
                }
            }
        }

        // Create torpedo squadrons
        if (torpedoCount > 0) {
            const squadronsNeeded = Math.ceil(torpedoCount / 8); // Max 8 per squadron
            for (let i = 0; i < squadronsNeeded; i++) {
                const aircraftInSquadron = Math.min(8, torpedoCount - (i * 8));
                if (aircraftInSquadron > 0) {
                    const squadron = this.createCustomAISquadron(
                        `AI Torpedo Squadron ${squadronIndex}`,
                        'torpedo',
                        aircraftInSquadron,
                        { damage: 120, hp: 30, range: 8 },
                        difficulty
                    );
                    squadrons.set(`torpedo_${squadronIndex}`, squadron);
                    squadronIndex++;
                }
            }
        }

        return {
            raidType: raidType,
            difficulty: difficulty,
            totalAircraft: fighterCount + bomberCount + torpedoCount,
            composition: {
                fighters: fighterCount,
                bombers: bomberCount,
                torpedoes: torpedoCount
            },
            squadrons: squadrons,
            squadronCount: squadrons.size
        };
    }

    // NEW: Create custom AI squadron with HP
    createCustomAISquadron(name, aircraftType, count, stats, difficulty = 'normal') {
        const difficultyModifiers = {
            easy: { hpMod: 0.8, damageMod: 0.9 },
            normal: { hpMod: 1.0, damageMod: 1.0 },
            hard: { hpMod: 1.2, damageMod: 1.15 },
            nightmare: { hpMod: 1.5, damageMod: 1.3 }
        };

        const modifier = difficultyModifiers[difficulty] || difficultyModifiers.normal;
        
        const adjustedHP = Math.round(stats.hp * modifier.hpMod);
        const adjustedDamage = Math.round(stats.damage * modifier.damageMod);

        return {
            name: name,
            count: count,
            maxCount: count,
            range: stats.range,
            damage: adjustedDamage,
            hp: adjustedHP,
            maxHP: adjustedHP,
            squadronHP: adjustedHP * count,
            maxSquadronHP: adjustedHP * count,
            quality: 'Standard',
            specialAbility: aircraftType,
            fuel: 100,
            readiness: 100,
            aircraftType: aircraftType,
            isAI: true,
            difficulty: difficulty
        };
    }

    // NEW: AI tactical decision making for aircraft
    calculateAITacticalDecision(aiSquadrons, playerTargets, situation = {}) {
        const decisions = [];
        
        for (const [squadronId, squadron] of aiSquadrons.entries()) {
            const effectiveness = this.calculateAIAircraftEffectiveness(squadron);
            
            if (!effectiveness.canAttack) {
                decisions.push({
                    squadronId: squadronId,
                    action: 'withdraw',
                    reason: 'Squadron cannot attack - low fuel/readiness or destroyed',
                    priority: 0
                });
                continue;
            }

            // Determine best target based on squadron type
            let bestTarget = null;
            let targetPriority = 0;

            for (const target of playerTargets) {
                let priority = 0;
                
                switch (squadron.aircraftType) {
                    case 'fighter':
                        // Fighters prioritize enemy aircraft, then carriers, then other ships
                        if (target.type === 'aircraft') priority = 10;
                        else if (target.shipClass?.includes('Carrier')) priority = 7;
                        else priority = 3;
                        break;
                        
                    case 'bomber':
                        // Bombers prioritize battleships, cruisers, then carriers
                        if (target.shipClass?.includes('Battleship')) priority = 10;
                        else if (target.shipClass?.includes('Cruiser')) priority = 8;
                        else if (target.shipClass?.includes('Carrier')) priority = 6;
                        else priority = 4;
                        break;
                        
                    case 'torpedo':
                        // Torpedo bombers prioritize large, valuable targets
                        if (target.shipClass?.includes('Battleship')) priority = 10;
                        else if (target.shipClass?.includes('Carrier')) priority = 9;
                        else if (target.shipClass?.includes('Heavy Cruiser')) priority = 7;
                        else priority = 3;
                        break;
                }

                // Adjust priority based on target health and threat level
                if (target.stats?.health) {
                    const healthPercent = target.stats.health / target.stats.maxHealth || 1;
                    if (healthPercent < 0.3) priority += 2; // Finish off weak targets
                }

                if (priority > targetPriority) {
                    targetPriority = priority;
                    bestTarget = target;
                }
            }

            if (bestTarget) {
                decisions.push({
                    squadronId: squadronId,
                    action: 'attack',
                    target: bestTarget,
                    expectedDamage: effectiveness.effectiveDamage,
                    priority: targetPriority,
                    reason: `${squadron.aircraftType} targeting ${bestTarget.name || bestTarget.type}`
                });
            } else {
                decisions.push({
                    squadronId: squadronId,
                    action: 'patrol',
                    reason: 'No suitable targets found',
                    priority: 1
                });
            }
        }

        // Sort decisions by priority (highest first)
        return decisions.sort((a, b) => b.priority - a.priority);
    }
}
module.exports = AIConfig;