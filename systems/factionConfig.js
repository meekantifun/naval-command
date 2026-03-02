// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         FACTION AI CONFIGURATION                             ║
// ║                                                                              ║
// ║   Two enemy universes are defined here. Add new entries following the        ║
// ║   same schema — the game picks randomly from the selected universe(s).       ║
// ║                                                                              ║
// ║   UNIVERSES                                                                  ║
// ║     'abyssal' — Abyssals (KanColle)                                          ║
// ║     'siren'   — Sirens (Azur Lane)                                           ║
// ║     'mixed'   — Random from either universe each spawn                       ║
// ║                                                                              ║
// ║   HOW TO ADD A SHIP                                                          ║
// ║     1. Copy any existing entry block below.                                  ║
// ║     2. Give it a unique key in aiTypes.set('your_key', { ... }).             ║
// ║     3. Set universe: 'abyssal' or universe: 'siren'.                         ║
// ║     4. Fill in tonnage, speedKnots, armorThickness, and weapons.             ║
// ║     5. The calc helpers at the bottom handle HP/armor/speed/evasion/damage.  ║
// ║                                                                              ║
// ║   SHIP TYPE VALUES                                                           ║
// ║     destroyer · lightcruiser · cruiser · battleship · carrier · submarine   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class FactionConfig {
    constructor() {
        this.aiTypes = new Map();
        this.initializeAbyssals();
        this.initializeSirens();
    }

// ════════════════════════════════════════════════════════════════════════════════
// ██████████████████████████  ABYSSALS (KANCOLLE)  ██████████████████████████████
// ════════════════════════════════════════════════════════════════════════════════

    initializeAbyssals() {

// ── DESTROYERS ──────────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_ro_class', {
            universe: 'abyssal',
            name: '[DD] Ro-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2000,
            speedKnots: 35,
            armorThickness: { belt: 15, deck: 10, turret: 8 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(2000, 'Destroyer'),
                armor: this.calculateArmor(15, 10, 8),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 2000),
                range: 8,
                baseAccuracy: 75
            },
            weapons: {
                primary: {
                    name: '127mm Single',
                    shellWeight: 25, barrelCount: 2, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 2, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 100, penetration: 120,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 400, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 4, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 300,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ro_class_elite', {
            universe: 'abyssal',
            name: '[DD] Ro-Class Elite',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
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
                    name: '127mm Twin',
                    shellWeight: 25, barrelCount: 4, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 4, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 120, penetration: 130,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 400, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 4, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 320,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

// ── LIGHT CRUISERS ───────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_he_class', {
            universe: 'abyssal',
            name: '[CL] He-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
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
                    name: '152mm Twin',
                    shellWeight: 45, barrelCount: 6, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 6, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 150, penetration: 140,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA',
                    shellWeight: 6, barrelCount: 8, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 8, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 200, penetration: 80,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

// ── HEAVY CRUISERS ───────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_ri_class', {
            universe: 'abyssal',
            name: '[CA] Ri-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
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
                    name: '203mm Triple',
                    shellWeight: 122, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 6, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 100, penetration: 200,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm DP',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 120,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 350,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

// ── BATTLESHIPS ──────────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_ru_class', {
            universe: 'abyssal',
            name: '[BB] Ru-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
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
                    name: '406mm Triple',
                    shellWeight: 870, barrelCount: 6, caliber: 406,
                    damage: this.calculateWeaponDamage(870, 6, 'High'),
                    range: this.calculateGunRange(406),
                    reload: 4, ammo: 60, penetration: 400,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '152mm Twin',
                    shellWeight: 45, barrelCount: 12, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 12, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 200, penetration: 140,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

// ── AIRCRAFT CARRIERS ────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_wo_class', {
            universe: 'abyssal',
            name: '[CV] Wo-Class',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 25000,
            speedKnots: 25,
            armorThickness: { belt: 30, deck: 25, turret: 15 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(25000, 'Aircraft Carrier'),
                armor: this.calculateArmor(30, 25, 15),
                speed: this.calculateSpeed(25),
                evasion: this.calculateEvasion(25, 25000),
                range: 15,
                baseAccuracy: 70
            },
            hangar: 24,
            weapons: {
                secondary: {
                    name: '127mm DP',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 120,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_squadron', {
                    name: 'Abyssal Zero Fighter Squadron',
                    count: 8, maxCount: 8, range: 12, damage: 50,
                    hp: 25, maxHP: 25, squadronHP: 25 * 8, maxSquadronHP: 25 * 8,
                    quality: 'Standard', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_squadron', {
                    name: 'Abyssal Dive Bomber Squadron',
                    count: 6, maxCount: 6, range: 10, damage: 85,
                    hp: 35, maxHP: 35, squadronHP: 35 * 6, maxSquadronHP: 35 * 6,
                    quality: 'Standard', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }]
            ])
        });

        this.aiTypes.set('abyssal_wo_class_elite', {
            universe: 'abyssal',
            name: '[CV] Wo-Class Elite',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 28000,
            speedKnots: 27,
            armorThickness: { belt: 35, deck: 30, turret: 20 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(28000, 'Aircraft Carrier'),
                armor: this.calculateArmor(35, 30, 20),
                speed: this.calculateSpeed(27),
                evasion: this.calculateEvasion(27, 28000),
                range: 18,
                baseAccuracy: 75
            },
            hangar: 32,
            weapons: {
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 12, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 12, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 250, penetration: 130,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_squadron_1', {
                    name: 'Elite Abyssal Fighter Squadron',
                    count: 10, maxCount: 10, range: 14, damage: 60,
                    hp: 30, maxHP: 30, squadronHP: 30 * 10, maxSquadronHP: 30 * 10,
                    quality: 'High', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_squadron_1', {
                    name: 'Elite Abyssal Bomber Squadron',
                    count: 8, maxCount: 8, range: 12, damage: 95,
                    hp: 40, maxHP: 40, squadronHP: 40 * 8, maxSquadronHP: 40 * 8,
                    quality: 'High', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_squadron_1', {
                    name: 'Elite Abyssal Torpedo Squadron',
                    count: 6, maxCount: 6, range: 10, damage: 130,
                    hp: 35, maxHP: 35, squadronHP: 35 * 6, maxSquadronHP: 35 * 6,
                    quality: 'High', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('abyssal_nu_class', {
            universe: 'abyssal',
            name: '[CVL] Nu-Class',
            type: 'lightcarrier',
            shipClass: 'AI Light Aircraft Carrier',
            tonnage: 15000,
            speedKnots: 28,
            armorThickness: { belt: 20, deck: 15, turret: 10 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(15000, 'Light Aircraft Carrier'),
                armor: this.calculateArmor(20, 15, 10),
                speed: this.calculateSpeed(28),
                evasion: this.calculateEvasion(28, 15000),
                range: 12,
                baseAccuracy: 70
            },
            hangar: 18,
            weapons: {
                secondary: {
                    name: '76mm AA',
                    shellWeight: 6, barrelCount: 6, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 6, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 300, penetration: 80,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_squadron', {
                    name: 'Abyssal Light Fighter Squadron',
                    count: 6, maxCount: 6, range: 10, damage: 45,
                    hp: 22, maxHP: 22, squadronHP: 22 * 6, maxSquadronHP: 22 * 6,
                    quality: 'Standard', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_squadron', {
                    name: 'Abyssal Light Bomber Squadron',
                    count: 4, maxCount: 4, range: 8, damage: 75,
                    hp: 32, maxHP: 32, squadronHP: 32 * 4, maxSquadronHP: 32 * 4,
                    quality: 'Standard', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }]
            ])
        });

// ════════════════════════════════════════════════════════════════════════════════
// ████████████████████████████  SIRENS (AZUR LANE)  █████████████████████████████
// ════════════════════════════════════════════════════════════════════════════════

    }

    initializeSirens() {

// ── DESTROYERS ───────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_observer', {
            universe: 'siren',
            name: '[DD] Observer-class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2500,
            speedKnots: 38,                // Sirens are faster
            armorThickness: { belt: 20, deck: 12, turret: 10 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(2500, 'Destroyer'),
                armor: this.calculateArmor(20, 12, 10),
                speed: this.calculateSpeed(38),
                evasion: this.calculateEvasion(38, 2500),
                range: 8,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: 'Siren 127mm Energy Cannon',
                    shellWeight: 28, barrelCount: 2, caliber: 127,
                    damage: this.calculateWeaponDamage(28, 2, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 120, penetration: 135,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Siren Energy Torpedo',
                    shellWeight: 430, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(430, 4, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 4, ammo: 12, penetration: 330,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_observer_mkii', {
            universe: 'siren',
            name: '[DD] Observer-class Mk.II',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2800,
            speedKnots: 40,
            armorThickness: { belt: 24, deck: 15, turret: 13 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(2800, 'Destroyer'),
                armor: this.calculateArmor(24, 15, 13),
                speed: this.calculateSpeed(40),
                evasion: this.calculateEvasion(40, 2800),
                range: 8,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: 'Siren 127mm Twin Energy Cannon',
                    shellWeight: 28, barrelCount: 4, caliber: 127,
                    damage: this.calculateWeaponDamage(28, 4, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 140, penetration: 145,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Siren Mk.II Energy Torpedo',
                    shellWeight: 460, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(460, 6, 'Exceptional'),
                    range: this.calculateGunRange(533),
                    reload: 4, ammo: 16, penetration: 360,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

// ── LIGHT CRUISERS ───────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_searcher', {
            universe: 'siren',
            name: '[CL] Searcher-class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 8000,
            speedKnots: 34,
            armorThickness: { belt: 35, deck: 20, turret: 20 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(8000, 'Light Cruiser'),
                armor: this.calculateArmor(35, 20, 20),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 8000),
                range: 10,
                baseAccuracy: 84
            },
            weapons: {
                primary: {
                    name: 'Siren 152mm Energy Dual Cannon',
                    shellWeight: 50, barrelCount: 6, caliber: 152,
                    damage: this.calculateWeaponDamage(50, 6, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 160, penetration: 155,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Siren 76mm Energy AA',
                    shellWeight: 8, barrelCount: 8, caliber: 76,
                    damage: this.calculateWeaponDamage(8, 8, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 250, penetration: 90,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

// ── HEAVY CRUISERS ───────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_tester', {
            universe: 'siren',
            name: '[CA] Tester-class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 14000,
            speedKnots: 31,
            armorThickness: { belt: 55, deck: 28, turret: 32 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(14000, 'Heavy Cruiser'),
                armor: this.calculateArmor(55, 28, 32),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 14000),
                range: 13,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: 'Siren 203mm Energy Cannon',
                    shellWeight: 135, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(135, 6, 'High'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 110, penetration: 220,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Siren 155mm Energy Secondary',
                    shellWeight: 55, barrelCount: 8, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 8, 'High'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 220, penetration: 145,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Siren High-Speed Torpedo',
                    shellWeight: 520, barrelCount: 6, caliber: 610,
                    damage: this.calculateWeaponDamage(520, 6, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 12, penetration: 370,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

// ── BATTLESHIPS ──────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_executor', {
            universe: 'siren',
            name: '[BB] Executor-class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 42000,
            speedKnots: 25,
            armorThickness: { belt: 95, deck: 38, turret: 60 },
            baseAccuracy: 87,
            stats: {
                health: this.calculateHP(42000, 'Battleship'),
                armor: this.calculateArmor(95, 38, 60),
                speed: this.calculateSpeed(25),
                evasion: this.calculateEvasion(25, 42000),
                range: 20,
                baseAccuracy: 87
            },
            weapons: {
                primary: {
                    name: 'Siren 406mm Rail Cannon',
                    shellWeight: 920, barrelCount: 6, caliber: 406,
                    damage: this.calculateWeaponDamage(920, 6, 'Exceptional'),
                    range: this.calculateGunRange(406),
                    reload: 4, ammo: 70, penetration: 440,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Siren 152mm Energy Secondary',
                    shellWeight: 50, barrelCount: 12, caliber: 152,
                    damage: this.calculateWeaponDamage(50, 12, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 250, penetration: 155,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

        // Heavy hitter — treat as a rare boss-tier battleship
        this.aiTypes.set('siren_purifier', {
            universe: 'siren',
            name: '[BB-S] Purifier-class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 60000,
            speedKnots: 22,
            armorThickness: { belt: 120, deck: 50, turret: 80 },
            baseAccuracy: 88,
            stats: {
                health: this.calculateHP(60000, 'Battleship'),
                armor: this.calculateArmor(120, 50, 80),
                speed: this.calculateSpeed(22),
                evasion: this.calculateEvasion(22, 60000),
                range: 22,
                baseAccuracy: 88
            },
            weapons: {
                primary: {
                    name: 'Siren 460mm Ultra Rail Cannon',
                    shellWeight: 1200, barrelCount: 6, caliber: 460,
                    damage: this.calculateWeaponDamage(1200, 6, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 50, penetration: 520,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Siren 203mm Energy Battery',
                    shellWeight: 135, barrelCount: 12, caliber: 203,
                    damage: this.calculateWeaponDamage(135, 12, 'High'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 300, penetration: 220,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Siren Capital Ship Torpedo Rack',
                    shellWeight: 600, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(600, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 480,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

// ── AIRCRAFT CARRIERS ────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_arbiter', {
            universe: 'siren',
            name: '[CV] Arbiter-class',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 32000,
            speedKnots: 27,
            armorThickness: { belt: 40, deck: 30, turret: 20 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(32000, 'Aircraft Carrier'),
                armor: this.calculateArmor(40, 30, 20),
                speed: this.calculateSpeed(27),
                evasion: this.calculateEvasion(27, 32000),
                range: 18,
                baseAccuracy: 75
            },
            hangar: 30,
            weapons: {
                secondary: {
                    name: 'Siren 127mm Energy DP',
                    shellWeight: 28, barrelCount: 10, caliber: 127,
                    damage: this.calculateWeaponDamage(28, 10, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 250, penetration: 130,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['siren_fighter_1', {
                    name: 'Siren Drone Fighter Squadron',
                    count: 10, maxCount: 10, range: 14, damage: 65,
                    hp: 30, maxHP: 30, squadronHP: 30 * 10, maxSquadronHP: 30 * 10,
                    quality: 'High', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['siren_bomber_1', {
                    name: 'Siren Dive Drone Squadron',
                    count: 8, maxCount: 8, range: 12, damage: 100,
                    hp: 38, maxHP: 38, squadronHP: 38 * 8, maxSquadronHP: 38 * 8,
                    quality: 'High', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['siren_torpedo_1', {
                    name: 'Siren Torpedo Drone Squadron',
                    count: 6, maxCount: 6, range: 10, damage: 140,
                    hp: 36, maxHP: 36, squadronHP: 36 * 6, maxSquadronHP: 36 * 6,
                    quality: 'High', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

    } // end initializeSirens()

// ════════════════════════════════════════════════════════════════════════════════
// ██████████████████████████  CALCULATION HELPERS  ██████████████████████████████
// ════════════════════════════════════════════════════════════════════════════════
// These mirror aiConfig.js exactly — use the same values for stat consistency.

    calculateHP(tonnage, shipClass) {
        const shipParams = {
            'Destroyer':              { baseHP: 40,  multiplier: 0.012, bonus: 0   },
            'Light Cruiser':          { baseHP: 80,  multiplier: 0.008, bonus: 20  },
            'Heavy Cruiser':          { baseHP: 100, multiplier: 0.007, bonus: 30  },
            'Battleship':             { baseHP: 200, multiplier: 0.005, bonus: 100 },
            'Aircraft Carrier':       { baseHP: 150, multiplier: 0.006, bonus: 50  },
            'Light Aircraft Carrier': { baseHP: 120, multiplier: 0.007, bonus: 30  },
            'Submarine':              { baseHP: 30,  multiplier: 0.015, bonus: -10 },
            'Auxiliary':              { baseHP: 60,  multiplier: 0.004, bonus: 10  }
        };
        const params = shipParams[shipClass];
        if (!params) return 100;
        return Math.max(Math.round(params.baseHP + (tonnage * params.multiplier) + params.bonus), 20);
    }

    calculateArmor(beltMM, deckMM, turretMM) {
        return Math.max(5, Math.min(Math.round((beltMM * 0.6) + (deckMM * 0.25) + (turretMM * 0.15)), 500));
    }

    calculateSpeed(speedKnots) {
        if (speedKnots < 20)  return 3;
        if (speedKnots <= 24) return 4;
        if (speedKnots <= 28) return 5;
        if (speedKnots <= 31) return 6;
        if (speedKnots <= 35) return 7;
        if (speedKnots <= 39) return 8;
        return 9;
    }

    calculateEvasion(speedKnots, tonnage) {
        const speedFactor = Math.pow(speedKnots / 25, 2);
        const sizeFactor  = Math.sqrt(8000 / tonnage);
        const evasion     = 0.1 * speedFactor * sizeFactor;
        return Math.max(1.0, Math.min(Math.round(evasion * 1000) / 10, 75.0));
    }

    calculateWeaponDamage(shellWeight, barrelCount, quality = 'Standard') {
        const qualityModifiers = { 'Poor': 0.85, 'Standard': 1.0, 'High': 1.15, 'Exceptional': 1.3 };
        const mod = qualityModifiers[quality] || 1.0;
        const base = (shellWeight * 0.2) + (barrelCount * 4);
        const efficiency = Math.max(0.8, 1.0 - ((barrelCount - 1) * 0.05));
        return Math.round(base * efficiency * mod);
    }

    calculateGunRange(caliberMM) {
        const rangeTable = {
            20: 2, 25: 2, 30: 2, 37: 3, 40: 3, 50: 4, 76: 5, 88: 6, 100: 6,
            114: 7, 127: 8, 130: 8, 140: 9, 150: 9, 152: 9, 155: 10, 180: 10,
            203: 12, 234: 13, 280: 16, 305: 18, 330: 19, 356: 20, 380: 21,
            381: 21, 406: 22, 410: 22, 420: 23, 460: 24, 467: 24, 480: 25,
            508: 26, 530: 27, 533: 27, 610: 27
        };
        if (rangeTable[caliberMM]) return rangeTable[caliberMM];
        const calibers = Object.keys(rangeTable).map(Number).sort((a, b) => a - b);
        let closest = calibers[0], minDiff = Math.abs(caliberMM - calibers[0]);
        for (const c of calibers) {
            const d = Math.abs(caliberMM - c);
            if (d < minDiff) { minDiff = d; closest = c; }
        }
        return rangeTable[closest];
    }

// ════════════════════════════════════════════════════════════════════════════════
// ██████████████████████████  PUBLIC API  ████████████████████████████████████████
// ════════════════════════════════════════════════════════════════════════════════

    /**
     * Get a random AI template from the specified faction.
     * @param {'abyssal'|'siren'|'mixed'} faction
     * @returns {object} AI template
     */
    getRandomAI(faction = 'mixed') {
        const pool = this.getAIsByFaction(faction);
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /**
     * Get a random AI of a specific ship type from the specified faction.
     * @param {'abyssal'|'siren'|'mixed'} faction
     * @param {string} shipType  e.g. 'destroyer', 'cruiser', 'battleship', 'carrier', 'submarine'
     * @returns {object|null}
     */
    getRandomAIOfType(faction, shipType) {
        const pool = this.getAIsByFaction(faction).filter(ai => this._matchesType(ai, shipType));
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /** Get all AI entries for a faction (or mixed). */
    getAIsByFaction(faction) {
        const all = Array.from(this.aiTypes.values());
        if (faction === 'mixed') return all;
        return all.filter(ai => ai.universe === faction);
    }

    /** Get an AI entry by its map key. */
    getAIByKey(key) {
        return this.aiTypes.get(key);
    }

    /** List all registered keys and names, useful for debugging. */
    listAll() {
        for (const [key, ai] of this.aiTypes.entries()) {
            console.log(`[${ai.universe}] ${key}: ${ai.name} (${ai.type})`);
        }
    }

    // Internal type matcher (same logic as bot.js isAIOfType)
    _matchesType(ai, requested) {
        const t  = (ai.type       || '').toLowerCase();
        const sc = (ai.shipClass  || '').toLowerCase();
        const r  = requested.toLowerCase();

        if (r === 'destroyer')   return t === 'destroyer';
        if (r === 'cruiser')     return t === 'cruiser' || t === 'lightcruiser' || sc.includes('cruiser');
        if (r === 'battleship')  return t === 'battleship';
        if (r === 'carrier')     return t === 'carrier' || t === 'lightcarrier';
        if (r === 'submarine')   return t === 'submarine';
        return t === r || sc.includes(r);
    }
}

module.exports = FactionConfig;
