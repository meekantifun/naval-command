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
        // Mark all boss entries so they are excluded from regular random pools
        for (const [key, ai] of this.aiTypes.entries()) {
            if (key.includes('_boss_')) ai.isBoss = true;
        }
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
            armorThickness: { belt: 20, deck: 10, turret: 12 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(2000, 'Destroyer'),
                armor: this.calculateArmor(20, 10, 12),
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
            armorThickness: { belt: 25, deck: 12, turret: 15 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(2200, 'Destroyer'),
                armor: this.calculateArmor(25, 12, 15),
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

        this.aiTypes.set('abyssal_i_class', {
            universe: 'abyssal',
            name: '[DD] I-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1800,
            speedKnots: 36,
            armorThickness: { belt: 18, deck: 9, turret: 10 },
            baseAccuracy: 73,
            stats: {
                health: this.calculateHP(1800, 'Destroyer'),
                armor: this.calculateArmor(18, 9, 10),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 1800),
                range: 8,
                baseAccuracy: 73
            },
            weapons: {
                primary: {
                    name: '120mm Single',
                    shellWeight: 20, barrelCount: 2, caliber: 120,
                    damage: this.calculateWeaponDamage(20, 2, 'Standard'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 100, penetration: 110,
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

        this.aiTypes.set('abyssal_i_class_elite', {
            universe: 'abyssal',
            name: '[DD] I-Class Elite',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2000,
            speedKnots: 37,
            armorThickness: { belt: 22, deck: 11, turret: 13 },
            baseAccuracy: 78,
            stats: {
                health: this.calculateHP(2000, 'Destroyer'),
                armor: this.calculateArmor(22, 11, 13),
                speed: this.calculateSpeed(37),
                evasion: this.calculateEvasion(37, 2000),
                range: 8,
                baseAccuracy: 78
            },
            weapons: {
                primary: {
                    name: '120mm Twin',
                    shellWeight: 20, barrelCount: 4, caliber: 120,
                    damage: this.calculateWeaponDamage(20, 4, 'High'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 120, penetration: 120,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 400, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 4, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 315,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ha_class', {
            universe: 'abyssal',
            name: '[DD] Ha-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2100,
            speedKnots: 34,
            armorThickness: { belt: 20, deck: 10, turret: 12 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(2100, 'Destroyer'),
                armor: this.calculateArmor(20, 10, 12),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 2100),
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
                    shellWeight: 420, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(420, 4, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 305,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ha_class_elite', {
            universe: 'abyssal',
            name: '[DD] Ha-Class Elite',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2300,
            speedKnots: 35,
            armorThickness: { belt: 26, deck: 13, turret: 15 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(2300, 'Destroyer'),
                armor: this.calculateArmor(26, 13, 15),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 2300),
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
                    shellWeight: 420, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(420, 6, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 325,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ni_class', {
            universe: 'abyssal',
            name: '[DD] Ni-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2300,
            speedKnots: 33,
            armorThickness: { belt: 19, deck: 9, turret: 11 },
            baseAccuracy: 74,
            stats: {
                health: this.calculateHP(2300, 'Destroyer'),
                armor: this.calculateArmor(19, 9, 11),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 2300),
                range: 8,
                baseAccuracy: 74
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
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 4, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 4, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 12, penetration: 340,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ni_class_elite', {
            universe: 'abyssal',
            name: '[DD] Ni-Class Elite',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2500,
            speedKnots: 34,
            armorThickness: { belt: 24, deck: 12, turret: 14 },
            baseAccuracy: 79,
            stats: {
                health: this.calculateHP(2500, 'Destroyer'),
                armor: this.calculateArmor(24, 12, 14),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 2500),
                range: 8,
                baseAccuracy: 79
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
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 6, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 6, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 16, penetration: 360,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_na_class', {
            universe: 'abyssal',
            name: '[DD] Na-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2400,
            speedKnots: 32,
            armorThickness: { belt: 22, deck: 11, turret: 13 },
            baseAccuracy: 77,
            stats: {
                health: this.calculateHP(2400, 'Destroyer'),
                armor: this.calculateArmor(22, 11, 13),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 2400),
                range: 9,
                baseAccuracy: 77
            },
            weapons: {
                primary: {
                    name: '127mm Twin',
                    shellWeight: 25, barrelCount: 4, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 4, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 110, penetration: 125,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 420, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(420, 4, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 308,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_na_class_elite', {
            universe: 'abyssal',
            name: '[DD] Na-Class Elite',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2600,
            speedKnots: 33,
            armorThickness: { belt: 28, deck: 14, turret: 17 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(2600, 'Destroyer'),
                armor: this.calculateArmor(28, 14, 17),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 2600),
                range: 9,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '127mm Triple',
                    shellWeight: 25, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 6, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 130, penetration: 135,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 420, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(420, 6, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 328,
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
            armorThickness: { belt: 50, deck: 25, turret: 60 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(6000, 'Light Cruiser'),
                armor: this.calculateArmor(50, 25, 60),
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

        this.aiTypes.set('abyssal_he_class_elite', {
            universe: 'abyssal',
            name: '[CL] He-Class Elite',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 6500,
            speedKnots: 33,
            armorThickness: { belt: 55, deck: 28, turret: 65 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(6500, 'Light Cruiser'),
                armor: this.calculateArmor(55, 28, 65),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 6500),
                range: 10,
                baseAccuracy: 84
            },
            weapons: {
                primary: {
                    name: '152mm Triple',
                    shellWeight: 45, barrelCount: 9, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 9, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 180, penetration: 150,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 10, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 10, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 240, penetration: 85,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_ho_class', {
            universe: 'abyssal',
            name: '[CL] Ho-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 5500,
            speedKnots: 33,
            armorThickness: { belt: 48, deck: 24, turret: 58 },
            baseAccuracy: 78,
            stats: {
                health: this.calculateHP(5500, 'Light Cruiser'),
                armor: this.calculateArmor(48, 24, 58),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 5500),
                range: 9,
                baseAccuracy: 78
            },
            weapons: {
                primary: {
                    name: '140mm Twin',
                    shellWeight: 38, barrelCount: 6, caliber: 140,
                    damage: this.calculateWeaponDamage(38, 6, 'Standard'),
                    range: this.calculateGunRange(140),
                    reload: 2, ammo: 140, penetration: 130,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA',
                    shellWeight: 6, barrelCount: 6, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 6, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 180, penetration: 80,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_ho_class_elite', {
            universe: 'abyssal',
            name: '[CL] Ho-Class Elite',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 6000,
            speedKnots: 34,
            armorThickness: { belt: 53, deck: 27, turret: 62 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(6000, 'Light Cruiser'),
                armor: this.calculateArmor(53, 27, 62),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 6000),
                range: 10,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '140mm Triple',
                    shellWeight: 38, barrelCount: 9, caliber: 140,
                    damage: this.calculateWeaponDamage(38, 9, 'High'),
                    range: this.calculateGunRange(140),
                    reload: 2, ammo: 160, penetration: 142,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 8, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 8, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 220, penetration: 85,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_to_class', {
            universe: 'abyssal',
            name: '[CL] To-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 7000,
            speedKnots: 31,
            armorThickness: { belt: 52, deck: 26, turret: 60 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(7000, 'Light Cruiser'),
                armor: this.calculateArmor(52, 26, 60),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 7000),
                range: 10,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: '152mm Triple',
                    shellWeight: 45, barrelCount: 9, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 9, 'Standard'),
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

        this.aiTypes.set('abyssal_to_class_elite', {
            universe: 'abyssal',
            name: '[CL] To-Class Elite',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 7500,
            speedKnots: 32,
            armorThickness: { belt: 58, deck: 29, turret: 66 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(7500, 'Light Cruiser'),
                armor: this.calculateArmor(58, 29, 66),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 7500),
                range: 11,
                baseAccuracy: 84
            },
            weapons: {
                primary: {
                    name: '152mm Triple',
                    shellWeight: 45, barrelCount: 9, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 9, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 170, penetration: 152,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 10, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 10, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 240, penetration: 85,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_tsu_class', {
            universe: 'abyssal',
            name: '[CL] Tsu-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 6200,
            speedKnots: 32,
            armorThickness: { belt: 50, deck: 25, turret: 60 },
            baseAccuracy: 79,
            stats: {
                health: this.calculateHP(6200, 'Light Cruiser'),
                armor: this.calculateArmor(50, 25, 60),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 6200),
                range: 10,
                baseAccuracy: 79
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

        this.aiTypes.set('abyssal_tsu_class_elite', {
            universe: 'abyssal',
            name: '[CL] Tsu-Class Elite',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 6800,
            speedKnots: 33,
            armorThickness: { belt: 56, deck: 28, turret: 64 },
            baseAccuracy: 83,
            stats: {
                health: this.calculateHP(6800, 'Light Cruiser'),
                armor: this.calculateArmor(56, 28, 64),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 6800),
                range: 10,
                baseAccuracy: 83
            },
            weapons: {
                primary: {
                    name: '152mm Triple',
                    shellWeight: 45, barrelCount: 9, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 9, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 170, penetration: 152,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 400, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 6, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 320,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_chi_class', {
            universe: 'abyssal',
            name: '[CL] Chi-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 7500,
            speedKnots: 30,
            armorThickness: { belt: 54, deck: 27, turret: 62 },
            baseAccuracy: 81,
            stats: {
                health: this.calculateHP(7500, 'Light Cruiser'),
                armor: this.calculateArmor(54, 27, 62),
                speed: this.calculateSpeed(30),
                evasion: this.calculateEvasion(30, 7500),
                range: 11,
                baseAccuracy: 81
            },
            weapons: {
                primary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 9, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 9, 'Standard'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 140, penetration: 148,
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

        this.aiTypes.set('abyssal_chi_class_elite', {
            universe: 'abyssal',
            name: '[CL] Chi-Class Elite',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 8200,
            speedKnots: 31,
            armorThickness: { belt: 60, deck: 30, turret: 68 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(8200, 'Light Cruiser'),
                armor: this.calculateArmor(60, 30, 68),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 8200),
                range: 11,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 9, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 9, 'High'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 160, penetration: 160,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 10, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 10, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 240, penetration: 85,
                    quality: 'High', ammoTypes: ['ap', 'he']
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
            armorThickness: { belt: 180, deck: 90, turret: 180 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(10000, 'Heavy Cruiser'),
                armor: this.calculateArmor(180, 90, 180),
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

        this.aiTypes.set('abyssal_ri_class_elite', {
            universe: 'abyssal',
            name: '[CA] Ri-Class Elite',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 11000,
            speedKnots: 31,
            armorThickness: { belt: 200, deck: 100, turret: 200 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(11000, 'Heavy Cruiser'),
                armor: this.calculateArmor(200, 100, 200),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 11000),
                range: 13,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: '203mm Triple',
                    shellWeight: 122, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 6, 'High'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 120, penetration: 215,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 10, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 10, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 220, penetration: 130,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 20, penetration: 360,
                    quality: 'High', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ne_class', {
            universe: 'abyssal',
            name: '[CA] Ne-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 12000,
            speedKnots: 29,
            armorThickness: { belt: 190, deck: 95, turret: 190 },
            baseAccuracy: 83,
            stats: {
                health: this.calculateHP(12000, 'Heavy Cruiser'),
                armor: this.calculateArmor(190, 95, 190),
                speed: this.calculateSpeed(29),
                evasion: this.calculateEvasion(29, 12000),
                range: 13,
                baseAccuracy: 83
            },
            weapons: {
                primary: {
                    name: '203mm Triple',
                    shellWeight: 130, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(130, 6, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 110, penetration: 205,
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
                    damage: this.calculateWeaponDamage(500, 8, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 350,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_ne_class_elite', {
            universe: 'abyssal',
            name: '[CA] Ne-Class Elite',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 13000,
            speedKnots: 30,
            armorThickness: { belt: 210, deck: 105, turret: 210 },
            baseAccuracy: 87,
            stats: {
                health: this.calculateHP(13000, 'Heavy Cruiser'),
                armor: this.calculateArmor(210, 105, 210),
                speed: this.calculateSpeed(30),
                evasion: this.calculateEvasion(30, 13000),
                range: 14,
                baseAccuracy: 87
            },
            weapons: {
                primary: {
                    name: '203mm Triple',
                    shellWeight: 130, barrelCount: 9, caliber: 203,
                    damage: this.calculateWeaponDamage(130, 9, 'High'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 130, penetration: 220,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 10, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 10, 'High'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 240, penetration: 135,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 20, penetration: 370,
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
            armorThickness: { belt: 280, deck: 100, turret: 380 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(35000, 'Battleship'),
                armor: this.calculateArmor(280, 100, 380),
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

        this.aiTypes.set('abyssal_ru_class_elite', {
            universe: 'abyssal',
            name: '[BB] Ru-Class Elite',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 38000,
            speedKnots: 24,
            armorThickness: { belt: 295, deck: 108, turret: 400 },
            baseAccuracy: 87,
            stats: {
                health: this.calculateHP(38000, 'Battleship'),
                armor: this.calculateArmor(295, 108, 400),
                speed: this.calculateSpeed(24),
                evasion: this.calculateEvasion(24, 38000),
                range: 19,
                baseAccuracy: 87
            },
            weapons: {
                primary: {
                    name: '406mm Triple',
                    shellWeight: 870, barrelCount: 9, caliber: 406,
                    damage: this.calculateWeaponDamage(870, 9, 'High'),
                    range: this.calculateGunRange(406),
                    reload: 4, ammo: 70, penetration: 415,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '152mm Twin',
                    shellWeight: 45, barrelCount: 14, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 14, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 220, penetration: 148,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_ta_class', {
            universe: 'abyssal',
            name: '[BB] Ta-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 40000,
            speedKnots: 22,
            armorThickness: { belt: 300, deck: 110, turret: 410 },
            baseAccuracy: 86,
            stats: {
                health: this.calculateHP(40000, 'Battleship'),
                armor: this.calculateArmor(300, 110, 410),
                speed: this.calculateSpeed(22),
                evasion: this.calculateEvasion(22, 40000),
                range: 19,
                baseAccuracy: 86
            },
            weapons: {
                primary: {
                    name: '410mm Triple',
                    shellWeight: 1000, barrelCount: 9, caliber: 410,
                    damage: this.calculateWeaponDamage(1000, 9, 'High'),
                    range: this.calculateGunRange(410),
                    reload: 4, ammo: 65, penetration: 430,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '152mm Twin',
                    shellWeight: 45, barrelCount: 14, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 14, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 210, penetration: 140,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_ta_class_elite', {
            universe: 'abyssal',
            name: '[BB] Ta-Class Elite',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 43000,
            speedKnots: 23,
            armorThickness: { belt: 315, deck: 118, turret: 425 },
            baseAccuracy: 89,
            stats: {
                health: this.calculateHP(43000, 'Battleship'),
                armor: this.calculateArmor(315, 118, 425),
                speed: this.calculateSpeed(23),
                evasion: this.calculateEvasion(23, 43000),
                range: 20,
                baseAccuracy: 89
            },
            weapons: {
                primary: {
                    name: '410mm Triple',
                    shellWeight: 1000, barrelCount: 9, caliber: 410,
                    damage: this.calculateWeaponDamage(1000, 9, 'High'),
                    range: this.calculateGunRange(410),
                    reload: 4, ammo: 75, penetration: 445,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '152mm Triple',
                    shellWeight: 45, barrelCount: 15, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 15, 'High'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 230, penetration: 150,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_re_class', {
            universe: 'abyssal',
            name: '[BB] Re-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 50000,
            speedKnots: 21,
            armorThickness: { belt: 320, deck: 120, turret: 430 },
            baseAccuracy: 88,
            stats: {
                health: this.calculateHP(50000, 'Battleship'),
                armor: this.calculateArmor(320, 120, 430),
                speed: this.calculateSpeed(21),
                evasion: this.calculateEvasion(21, 50000),
                range: 21,
                baseAccuracy: 88
            },
            weapons: {
                primary: {
                    name: '460mm Triple',
                    shellWeight: 1460, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1460, 9, 'High'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 60, penetration: 480,
                    quality: 'High', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '155mm Twin',
                    shellWeight: 55, barrelCount: 16, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 16, 'Standard'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 250, penetration: 148,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_re_class_elite', {
            universe: 'abyssal',
            name: '[BB] Re-Class Elite',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 55000,
            speedKnots: 22,
            armorThickness: { belt: 335, deck: 128, turret: 445 },
            baseAccuracy: 91,
            stats: {
                health: this.calculateHP(55000, 'Battleship'),
                armor: this.calculateArmor(335, 128, 445),
                speed: this.calculateSpeed(22),
                evasion: this.calculateEvasion(22, 55000),
                range: 22,
                baseAccuracy: 91
            },
            weapons: {
                primary: {
                    name: '460mm Triple',
                    shellWeight: 1460, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1460, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 70, penetration: 495,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 18, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 18, 'High'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 280, penetration: 155,
                    quality: 'High', ammoTypes: ['ap', 'he']
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
            armorThickness: { belt: 40, deck: 40, turret: 20 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(25000, 'Aircraft Carrier'),
                armor: this.calculateArmor(40, 40, 20),
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
            armorThickness: { belt: 50, deck: 45, turret: 25 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(28000, 'Aircraft Carrier'),
                armor: this.calculateArmor(50, 45, 25),
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
            armorThickness: { belt: 30, deck: 25, turret: 15 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(15000, 'Light Aircraft Carrier'),
                armor: this.calculateArmor(30, 25, 15),
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

        this.aiTypes.set('abyssal_nu_class_elite', {
            universe: 'abyssal',
            name: '[CVL] Nu-Class Elite',
            type: 'lightcarrier',
            shipClass: 'AI Light Aircraft Carrier',
            tonnage: 17000,
            speedKnots: 29,
            armorThickness: { belt: 35, deck: 28, turret: 18 },
            baseAccuracy: 74,
            stats: {
                health: this.calculateHP(17000, 'Light Aircraft Carrier'),
                armor: this.calculateArmor(35, 28, 18),
                speed: this.calculateSpeed(29),
                evasion: this.calculateEvasion(29, 17000),
                range: 13,
                baseAccuracy: 74
            },
            hangar: 22,
            weapons: {
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 8, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 8, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 350, penetration: 85,
                    quality: 'High', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_squadron', {
                    name: 'Elite Abyssal Light Fighter Squadron',
                    count: 8, maxCount: 8, range: 11, damage: 52,
                    hp: 26, maxHP: 26, squadronHP: 26 * 8, maxSquadronHP: 26 * 8,
                    quality: 'High', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_squadron', {
                    name: 'Elite Abyssal Light Bomber Squadron',
                    count: 5, maxCount: 5, range: 9, damage: 82,
                    hp: 35, maxHP: 35, squadronHP: 35 * 5, maxSquadronHP: 35 * 5,
                    quality: 'High', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_squadron', {
                    name: 'Elite Abyssal Light Torpedo Squadron',
                    count: 4, maxCount: 4, range: 8, damage: 110,
                    hp: 32, maxHP: 32, squadronHP: 32 * 4, maxSquadronHP: 32 * 4,
                    quality: 'High', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

// ── SUBMARINES ────────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_ka_class', {
            universe: 'abyssal',
            name: '[SS] Ka-Class',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 1200,
            speedKnots: 17,
            armorThickness: { belt: 22, deck: 13, turret: 10 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(1200, 'Submarine'),
                armor: this.calculateArmor(22, 13, 10),
                speed: this.calculateSpeed(17),
                evasion: this.calculateEvasion(17, 1200),
                range: 8,
                baseAccuracy: 80
            },
            weapons: {
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 400, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 4, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 300,
                    quality: 'Standard', ammoTypes: ['torpedo']
                },
                primary: {
                    name: '76mm Deck Gun',
                    shellWeight: 6, barrelCount: 1, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 1, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 2, ammo: 60, penetration: 70,
                    quality: 'Standard', ammoTypes: ['he']
                }
            }
        });

        this.aiTypes.set('abyssal_ka_class_elite', {
            universe: 'abyssal',
            name: '[SS] Ka-Class Elite',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 1400,
            speedKnots: 18,
            armorThickness: { belt: 26, deck: 15, turret: 12 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(1400, 'Submarine'),
                armor: this.calculateArmor(26, 15, 12),
                speed: this.calculateSpeed(18),
                evasion: this.calculateEvasion(18, 1400),
                range: 9,
                baseAccuracy: 84
            },
            weapons: {
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 400, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 6, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 320,
                    quality: 'High', ammoTypes: ['torpedo']
                },
                primary: {
                    name: '76mm Deck Gun',
                    shellWeight: 6, barrelCount: 1, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 1, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 2, ammo: 80, penetration: 75,
                    quality: 'High', ammoTypes: ['he']
                }
            }
        });

        this.aiTypes.set('abyssal_yo_class', {
            universe: 'abyssal',
            name: '[SS] Yo-Class',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 1800,
            speedKnots: 18,
            armorThickness: { belt: 24, deck: 14, turret: 11 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(1800, 'Submarine'),
                armor: this.calculateArmor(24, 14, 11),
                speed: this.calculateSpeed(18),
                evasion: this.calculateEvasion(18, 1800),
                range: 9,
                baseAccuracy: 82
            },
            weapons: {
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 450, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(450, 6, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 14, penetration: 315,
                    quality: 'Standard', ammoTypes: ['torpedo']
                },
                primary: {
                    name: '100mm Deck Gun',
                    shellWeight: 14, barrelCount: 1, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 1, 'Standard'),
                    range: this.calculateGunRange(100),
                    reload: 2, ammo: 60, penetration: 90,
                    quality: 'Standard', ammoTypes: ['he']
                }
            }
        });

        this.aiTypes.set('abyssal_yo_class_elite', {
            universe: 'abyssal',
            name: '[SS] Yo-Class Elite',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 2000,
            speedKnots: 19,
            armorThickness: { belt: 28, deck: 16, turret: 13 },
            baseAccuracy: 86,
            stats: {
                health: this.calculateHP(2000, 'Submarine'),
                armor: this.calculateArmor(28, 16, 13),
                speed: this.calculateSpeed(19),
                evasion: this.calculateEvasion(19, 2000),
                range: 10,
                baseAccuracy: 86
            },
            weapons: {
                torpedoes: {
                    name: '533mm Torpedo',
                    shellWeight: 450, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(450, 8, 'High'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 18, penetration: 335,
                    quality: 'High', ammoTypes: ['torpedo']
                },
                primary: {
                    name: '100mm Deck Gun',
                    shellWeight: 14, barrelCount: 1, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 1, 'High'),
                    range: this.calculateGunRange(100),
                    reload: 2, ammo: 80, penetration: 98,
                    quality: 'High', ammoTypes: ['he']
                }
            }
        });

        this.aiTypes.set('abyssal_so_class', {
            universe: 'abyssal',
            name: '[SS] So-Class',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 2500,
            speedKnots: 19,
            armorThickness: { belt: 24, deck: 14, turret: 11 },
            baseAccuracy: 83,
            stats: {
                health: this.calculateHP(2500, 'Submarine'),
                armor: this.calculateArmor(24, 14, 11),
                speed: this.calculateSpeed(19),
                evasion: this.calculateEvasion(19, 2500),
                range: 10,
                baseAccuracy: 83
            },
            weapons: {
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 6, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 6, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 12, penetration: 340,
                    quality: 'Standard', ammoTypes: ['torpedo']
                },
                primary: {
                    name: '120mm Deck Gun',
                    shellWeight: 20, barrelCount: 1, caliber: 120,
                    damage: this.calculateWeaponDamage(20, 1, 'Standard'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 60, penetration: 100,
                    quality: 'Standard', ammoTypes: ['he']
                }
            }
        });

        this.aiTypes.set('abyssal_so_class_elite', {
            universe: 'abyssal',
            name: '[SS] So-Class Elite',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 2800,
            speedKnots: 20,
            armorThickness: { belt: 28, deck: 16, turret: 13 },
            baseAccuracy: 87,
            stats: {
                health: this.calculateHP(2800, 'Submarine'),
                armor: this.calculateArmor(28, 16, 13),
                speed: this.calculateSpeed(20),
                evasion: this.calculateEvasion(20, 2800),
                range: 11,
                baseAccuracy: 87
            },
            weapons: {
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'High'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 360,
                    quality: 'High', ammoTypes: ['torpedo']
                },
                primary: {
                    name: '120mm Deck Gun',
                    shellWeight: 20, barrelCount: 1, caliber: 120,
                    damage: this.calculateWeaponDamage(20, 1, 'High'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 80, penetration: 110,
                    quality: 'High', ammoTypes: ['he']
                }
            }
        });

// ── AUXILIARY ─────────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_wa_class', {
            universe: 'abyssal',
            name: '[AX] Wa-Class',
            type: 'auxiliary',
            shipClass: 'AI Auxiliary',
            tonnage: 8000,
            speedKnots: 18,
            armorThickness: { belt: 15, deck: 10, turret: 8 },
            baseAccuracy: 65,
            stats: {
                health: this.calculateHP(8000, 'Auxiliary'),
                armor: this.calculateArmor(15, 10, 8),
                speed: this.calculateSpeed(18),
                evasion: this.calculateEvasion(18, 8000),
                range: 6,
                baseAccuracy: 65
            },
            weapons: {
                primary: {
                    name: '76mm AA',
                    shellWeight: 6, barrelCount: 4, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 4, 'Standard'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 200, penetration: 70,
                    quality: 'Standard', ammoTypes: ['he']
                }
            }
        });

        this.aiTypes.set('abyssal_wa_class_elite', {
            universe: 'abyssal',
            name: '[AX] Wa-Class Elite',
            type: 'auxiliary',
            shipClass: 'AI Auxiliary',
            tonnage: 9000,
            speedKnots: 19,
            armorThickness: { belt: 18, deck: 12, turret: 10 },
            baseAccuracy: 68,
            stats: {
                health: this.calculateHP(9000, 'Auxiliary'),
                armor: this.calculateArmor(18, 12, 10),
                speed: this.calculateSpeed(19),
                evasion: this.calculateEvasion(19, 9000),
                range: 7,
                baseAccuracy: 68
            },
            weapons: {
                primary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 6, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 6, 'High'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 250, penetration: 75,
                    quality: 'High', ammoTypes: ['he']
                },
                secondary: {
                    name: '20mm CIWS',
                    shellWeight: 0.1, barrelCount: 8, caliber: 20,
                    damage: this.calculateWeaponDamage(0.1, 8, 'High'),
                    range: this.calculateGunRange(20),
                    reload: 1, ammo: 500, penetration: 30,
                    quality: 'High', ammoTypes: ['he']
                }
            }
        });

// ── BOSSES ────────────────────────────────────────────────────────────────────

        this.aiTypes.set('abyssal_destroyer_princess', {
            universe: 'abyssal',
            name: '[DD] Destroyer Princess',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 3500,
            speedKnots: 38,
            armorThickness: { belt: 38, deck: 22, turret: 24 },
            baseAccuracy: 88,
            stats: {
                health: this.calculateHP(3500, 'Destroyer'),
                armor: this.calculateArmor(38, 22, 24),
                speed: this.calculateSpeed(38),
                evasion: this.calculateEvasion(38, 3500),
                range: 10,
                baseAccuracy: 88
            },
            weapons: {
                primary: {
                    name: '127mm Triple',
                    shellWeight: 25, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 6, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 160, penetration: 150,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 4, ammo: 20, penetration: 400,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_destroyer_demon', {
            universe: 'abyssal',
            name: '[DD] Destroyer Demon',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 4000,
            speedKnots: 40,
            armorThickness: { belt: 45, deck: 25, turret: 28 },
            baseAccuracy: 92,
            stats: {
                health: this.calculateHP(4000, 'Destroyer'),
                armor: this.calculateArmor(45, 25, 28),
                speed: this.calculateSpeed(40),
                evasion: this.calculateEvasion(40, 4000),
                range: 11,
                baseAccuracy: 92
            },
            weapons: {
                primary: {
                    name: '127mm Quad',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 180, penetration: 160,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 10, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 10, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 4, ammo: 24, penetration: 420,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_light_cruiser_princess', {
            universe: 'abyssal',
            name: '[CL] Light Cruiser Princess',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 10000,
            speedKnots: 34,
            armorThickness: { belt: 80, deck: 40, turret: 90 },
            baseAccuracy: 88,
            stats: {
                health: this.calculateHP(10000, 'Light Cruiser'),
                armor: this.calculateArmor(80, 40, 90),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 10000),
                range: 12,
                baseAccuracy: 88
            },
            weapons: {
                primary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 9, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 9, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 200, penetration: 172,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 12, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 12, 'Exceptional'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 300, penetration: 90,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 6, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 6, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 16, penetration: 370,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_light_cruiser_demon', {
            universe: 'abyssal',
            name: '[CL] Light Cruiser Demon',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 12000,
            speedKnots: 35,
            armorThickness: { belt: 90, deck: 45, turret: 100 },
            baseAccuracy: 91,
            stats: {
                health: this.calculateHP(12000, 'Light Cruiser'),
                armor: this.calculateArmor(90, 45, 100),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 12000),
                range: 13,
                baseAccuracy: 91
            },
            weapons: {
                primary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 12, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 12, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 220, penetration: 182,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '76mm AA Twin',
                    shellWeight: 6, barrelCount: 14, caliber: 76,
                    damage: this.calculateWeaponDamage(6, 14, 'Exceptional'),
                    range: this.calculateGunRange(76),
                    reload: 1, ammo: 350, penetration: 95,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 20, penetration: 385,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_heavy_cruiser_princess', {
            universe: 'abyssal',
            name: '[CA] Heavy Cruiser Princess',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 18000,
            speedKnots: 31,
            armorThickness: { belt: 240, deck: 120, turret: 240 },
            baseAccuracy: 89,
            stats: {
                health: this.calculateHP(18000, 'Heavy Cruiser'),
                armor: this.calculateArmor(240, 120, 240),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 18000),
                range: 15,
                baseAccuracy: 89
            },
            weapons: {
                primary: {
                    name: '203mm Triple',
                    shellWeight: 130, barrelCount: 9, caliber: 203,
                    damage: this.calculateWeaponDamage(130, 9, 'Exceptional'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 140, penetration: 245,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 12, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 12, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 260, penetration: 145,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 10, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 10, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 20, penetration: 390,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_heavy_cruiser_demon', {
            universe: 'abyssal',
            name: '[CA] Heavy Cruiser Demon',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 21000,
            speedKnots: 32,
            armorThickness: { belt: 260, deck: 130, turret: 260 },
            baseAccuracy: 92,
            stats: {
                health: this.calculateHP(21000, 'Heavy Cruiser'),
                armor: this.calculateArmor(260, 130, 260),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 21000),
                range: 16,
                baseAccuracy: 92
            },
            weapons: {
                primary: {
                    name: '203mm Triple',
                    shellWeight: 130, barrelCount: 12, caliber: 203,
                    damage: this.calculateWeaponDamage(130, 12, 'Exceptional'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 160, penetration: 260,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 14, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 14, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 300, penetration: 155,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance',
                    shellWeight: 500, barrelCount: 12, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 12, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 24, penetration: 410,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_anchorage_princess', {
            universe: 'abyssal',
            name: '[BB] Anchorage Princess',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 55000,
            speedKnots: 22,
            armorThickness: { belt: 360, deck: 135, turret: 470 },
            baseAccuracy: 91,
            stats: {
                health: this.calculateHP(55000, 'Battleship'),
                armor: this.calculateArmor(360, 135, 470),
                speed: this.calculateSpeed(22),
                evasion: this.calculateEvasion(22, 55000),
                range: 23,
                baseAccuracy: 91
            },
            weapons: {
                primary: {
                    name: '460mm Triple',
                    shellWeight: 1460, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1460, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 80, penetration: 510,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 18, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 18, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 300, penetration: 160,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('abyssal_anchorage_demon', {
            universe: 'abyssal',
            name: '[BB] Anchorage Demon',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 62000,
            speedKnots: 23,
            armorThickness: { belt: 380, deck: 145, turret: 490 },
            baseAccuracy: 93,
            stats: {
                health: this.calculateHP(62000, 'Battleship'),
                armor: this.calculateArmor(380, 145, 490),
                speed: this.calculateSpeed(23),
                evasion: this.calculateEvasion(23, 62000),
                range: 24,
                baseAccuracy: 93
            },
            weapons: {
                primary: {
                    name: '460mm Triple',
                    shellWeight: 1460, barrelCount: 12, caliber: 460,
                    damage: this.calculateWeaponDamage(1460, 12, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 90, penetration: 530,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '155mm Triple',
                    shellWeight: 55, barrelCount: 20, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 20, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 350, penetration: 168,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Capital Torpedo',
                    shellWeight: 600, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(600, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 480,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('abyssal_armored_carrier_princess', {
            universe: 'abyssal',
            name: '[CV] Armored Carrier Princess',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 35000,
            speedKnots: 24,
            armorThickness: { belt: 65, deck: 55, turret: 35 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(35000, 'Aircraft Carrier'),
                armor: this.calculateArmor(65, 55, 35),
                speed: this.calculateSpeed(24),
                evasion: this.calculateEvasion(24, 35000),
                range: 20,
                baseAccuracy: 80
            },
            hangar: 30,
            weapons: {
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 14, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 14, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 300, penetration: 140,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_1', {
                    name: 'Princess Fighter Squadron',
                    count: 12, maxCount: 12, range: 16, damage: 65,
                    hp: 32, maxHP: 32, squadronHP: 32 * 12, maxSquadronHP: 32 * 12,
                    quality: 'Exceptional', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_1', {
                    name: 'Princess Dive Bomber Squadron',
                    count: 10, maxCount: 10, range: 14, damage: 110,
                    hp: 42, maxHP: 42, squadronHP: 42 * 10, maxSquadronHP: 42 * 10,
                    quality: 'Exceptional', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_1', {
                    name: 'Princess Torpedo Squadron',
                    count: 8, maxCount: 8, range: 12, damage: 150,
                    hp: 38, maxHP: 38, squadronHP: 38 * 8, maxSquadronHP: 38 * 8,
                    quality: 'Exceptional', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('abyssal_armored_carrier_demon', {
            universe: 'abyssal',
            name: '[CV] Armored Carrier Demon',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 40000,
            speedKnots: 25,
            armorThickness: { belt: 70, deck: 60, turret: 38 },
            baseAccuracy: 83,
            stats: {
                health: this.calculateHP(40000, 'Aircraft Carrier'),
                armor: this.calculateArmor(70, 60, 38),
                speed: this.calculateSpeed(25),
                evasion: this.calculateEvasion(25, 40000),
                range: 22,
                baseAccuracy: 83
            },
            hangar: 36,
            weapons: {
                secondary: {
                    name: '127mm DP Twin',
                    shellWeight: 25, barrelCount: 16, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 16, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 350, penetration: 148,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_1', {
                    name: 'Demon Fighter Squadron',
                    count: 14, maxCount: 14, range: 18, damage: 72,
                    hp: 36, maxHP: 36, squadronHP: 36 * 14, maxSquadronHP: 36 * 14,
                    quality: 'Exceptional', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_1', {
                    name: 'Demon Dive Bomber Squadron',
                    count: 12, maxCount: 12, range: 16, damage: 120,
                    hp: 46, maxHP: 46, squadronHP: 46 * 12, maxSquadronHP: 46 * 12,
                    quality: 'Exceptional', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_1', {
                    name: 'Demon Torpedo Squadron',
                    count: 10, maxCount: 10, range: 14, damage: 165,
                    hp: 42, maxHP: 42, squadronHP: 42 * 10, maxSquadronHP: 42 * 10,
                    quality: 'Exceptional', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

    }

// ════════════════════════════════════════════════════════════════════════════════
// ████████████████████████████  SIRENS (AZUR LANE)  █████████████████████████████
// ════════════════════════════════════════════════════════════════════════════════

    initializeSirens() {


// ── DESTROYERS ────────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_mutsuki', {
            universe: 'siren',
            name: '[DD] Mass Produced Mutsuki-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1445,
            speedKnots: 33,
            armorThickness: { belt: 15, deck: 8, turret: 9 },
            baseAccuracy: 72,
            stats: {
                health: this.calculateHP(1445, 'Destroyer'),
                armor: this.calculateArmor(15, 8, 9),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 1445),
                range: 8,
                baseAccuracy: 72
            },
            weapons: {
                primary: {
                    name: '120mm/45 Type 3 Battery',
                    shellWeight: 22, barrelCount: 4, caliber: 120,
                    damage: this.calculateWeaponDamage(22, 4, 'Standard'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 90, penetration: 98,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Type 8 Torpedo',
                    shellWeight: 390, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(390, 6, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 10, penetration: 275,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_shiratsuyu', {
            universe: 'siren',
            name: '[DD] Mass Produced Shiratsuyu-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1685,
            speedKnots: 34,
            armorThickness: { belt: 18, deck: 9, turret: 11 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(1685, 'Destroyer'),
                armor: this.calculateArmor(18, 9, 11),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 1685),
                range: 8,
                baseAccuracy: 75
            },
            weapons: {
                primary: {
                    name: '127mm/50 Type 3 Battery',
                    shellWeight: 25, barrelCount: 5, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 5, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 100, penetration: 112,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 90',
                    shellWeight: 490, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 8, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 12, penetration: 340,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_yuugumo', {
            universe: 'siren',
            name: '[DD] Mass Produced Yuugumo-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2077,
            speedKnots: 35,
            armorThickness: { belt: 21, deck: 10, turret: 13 },
            baseAccuracy: 77,
            stats: {
                health: this.calculateHP(2077, 'Destroyer'),
                armor: this.calculateArmor(21, 10, 13),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 2077),
                range: 8,
                baseAccuracy: 77
            },
            weapons: {
                primary: {
                    name: '127mm/50 Type 3 Twin Battery',
                    shellWeight: 25, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 6, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 110, penetration: 115,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 93',
                    shellWeight: 490, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 8, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 12, penetration: 345,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_kagerou', {
            universe: 'siren',
            name: '[DD] Mass Produced Kagerou-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2033,
            speedKnots: 35,
            armorThickness: { belt: 20, deck: 10, turret: 12 },
            baseAccuracy: 76,
            stats: {
                health: this.calculateHP(2033, 'Destroyer'),
                armor: this.calculateArmor(20, 10, 12),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 2033),
                range: 8,
                baseAccuracy: 76
            },
            weapons: {
                primary: {
                    name: '127mm/50 Type 3 Twin Battery',
                    shellWeight: 25, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 6, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 110, penetration: 113,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 93',
                    shellWeight: 490, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 8, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 12, penetration: 342,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_fubuki', {
            universe: 'siren',
            name: '[DD] Mass Produced Fubuki-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2090,
            speedKnots: 34,
            armorThickness: { belt: 18, deck: 9, turret: 11 },
            baseAccuracy: 76,
            stats: {
                health: this.calculateHP(2090, 'Destroyer'),
                armor: this.calculateArmor(18, 9, 11),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 2090),
                range: 8,
                baseAccuracy: 76
            },
            weapons: {
                primary: {
                    name: '127mm/50 Type 3 Twin Battery',
                    shellWeight: 25, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 6, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 110, penetration: 113,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 93 (3×3)',
                    shellWeight: 490, barrelCount: 9, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 9, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 14, penetration: 348,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_type1936a', {
            universe: 'siren',
            name: '[DD] Mass Produced Type 1936A-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2603,
            speedKnots: 38,
            armorThickness: { belt: 23, deck: 12, turret: 14 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(2603, 'Destroyer'),
                armor: this.calculateArmor(23, 12, 14),
                speed: this.calculateSpeed(38),
                evasion: this.calculateEvasion(38, 2603),
                range: 8,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: '128mm/45 SK C/41 Battery',
                    shellWeight: 28, barrelCount: 5, caliber: 128,
                    damage: this.calculateWeaponDamage(28, 5, 'Standard'),
                    range: this.calculateGunRange(128),
                    reload: 2, ammo: 110, penetration: 120,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm G7a Torpedo',
                    shellWeight: 400, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 295,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_mahan', {
            universe: 'siren',
            name: '[DD] Mass Produced Mahan-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1488,
            speedKnots: 36,
            armorThickness: { belt: 16, deck: 8, turret: 10 },
            baseAccuracy: 74,
            stats: {
                health: this.calculateHP(1488, 'Destroyer'),
                armor: this.calculateArmor(16, 8, 10),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 1488),
                range: 8,
                baseAccuracy: 74
            },
            weapons: {
                primary: {
                    name: '127mm/38 Mk 12 Battery',
                    shellWeight: 25, barrelCount: 5, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 5, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 100, penetration: 110,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Mk 15 Torpedo (4×3)',
                    shellWeight: 400, barrelCount: 12, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 12, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 18, penetration: 290,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_fletcher', {
            universe: 'siren',
            name: '[DD] Mass Produced Fletcher-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 2050,
            speedKnots: 36,
            armorThickness: { belt: 21, deck: 10, turret: 13 },
            baseAccuracy: 78,
            stats: {
                health: this.calculateHP(2050, 'Destroyer'),
                armor: this.calculateArmor(21, 10, 13),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 2050),
                range: 8,
                baseAccuracy: 78
            },
            weapons: {
                primary: {
                    name: '127mm/38 Mk 12 Battery',
                    shellWeight: 25, barrelCount: 5, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 5, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 110, penetration: 112,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Mk 15 Torpedo (2×5)',
                    shellWeight: 400, barrelCount: 10, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 10, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 14, penetration: 292,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_g_class', {
            universe: 'siren',
            name: '[DD] Mass Produced G-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1350,
            speedKnots: 35,
            armorThickness: { belt: 15, deck: 8, turret: 9 },
            baseAccuracy: 73,
            stats: {
                health: this.calculateHP(1350, 'Destroyer'),
                armor: this.calculateArmor(15, 8, 9),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 1350),
                range: 8,
                baseAccuracy: 73
            },
            weapons: {
                primary: {
                    name: '120mm/45 QF Mk IX Battery',
                    shellWeight: 22, barrelCount: 4, caliber: 120,
                    damage: this.calculateWeaponDamage(22, 4, 'Standard'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 90, penetration: 100,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Mk IX Torpedo (2×4)',
                    shellWeight: 400, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 285,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_j_class', {
            universe: 'siren',
            name: '[DD] Mass Produced J-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1690,
            speedKnots: 36,
            armorThickness: { belt: 17, deck: 9, turret: 10 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(1690, 'Destroyer'),
                armor: this.calculateArmor(17, 9, 10),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 1690),
                range: 8,
                baseAccuracy: 75
            },
            weapons: {
                primary: {
                    name: '120mm/45 QF Mk XII Battery',
                    shellWeight: 22, barrelCount: 6, caliber: 120,
                    damage: this.calculateWeaponDamage(22, 6, 'Standard'),
                    range: this.calculateGunRange(120),
                    reload: 2, ammo: 100, penetration: 103,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Mk IX Torpedo (2×5)',
                    shellWeight: 400, barrelCount: 10, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 10, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 14, penetration: 288,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_bourrasque', {
            universe: 'siren',
            name: '[DD] Mass Produced Bourrasque-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1319,
            speedKnots: 33,
            armorThickness: { belt: 14, deck: 7, turret: 8 },
            baseAccuracy: 72,
            stats: {
                health: this.calculateHP(1319, 'Destroyer'),
                armor: this.calculateArmor(14, 7, 8),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 1319),
                range: 8,
                baseAccuracy: 72
            },
            weapons: {
                primary: {
                    name: '130mm/40 Mle 1919 Battery',
                    shellWeight: 33, barrelCount: 4, caliber: 130,
                    damage: this.calculateWeaponDamage(33, 4, 'Standard'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 90, penetration: 118,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '550mm Mle 1919 Torpedo (2×3)',
                    shellWeight: 440, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(440, 6, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 10, penetration: 298,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_clemenceau_dd', {
            universe: 'siren',
            name: '[DD] Mass Produced Clemenceau-Class',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 1500,
            speedKnots: 35,
            armorThickness: { belt: 16, deck: 8, turret: 10 },
            baseAccuracy: 73,
            stats: {
                health: this.calculateHP(1500, 'Destroyer'),
                armor: this.calculateArmor(16, 8, 10),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 1500),
                range: 8,
                baseAccuracy: 73
            },
            weapons: {
                primary: {
                    name: '130mm/40 Mle 1924 Battery',
                    shellWeight: 33, barrelCount: 4, caliber: 130,
                    damage: this.calculateWeaponDamage(33, 4, 'Standard'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 95, penetration: 120,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '550mm Mle 1924 Torpedo (2×4)',
                    shellWeight: 440, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(440, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 300,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });


// ── LIGHT CRUISERS ────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_nagara', {
            universe: 'siren',
            name: '[CL] Mass Produced Nagara-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 5170,
            speedKnots: 36,
            armorThickness: { belt: 50, deck: 25, turret: 58 },
            baseAccuracy: 76,
            stats: {
                health: this.calculateHP(5170, 'Light Cruiser'),
                armor: this.calculateArmor(50, 25, 58),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 5170),
                range: 9,
                baseAccuracy: 76
            },
            weapons: {
                primary: {
                    name: '140mm/50 3rd Year Type Battery',
                    shellWeight: 38, barrelCount: 7, caliber: 140,
                    damage: this.calculateWeaponDamage(38, 7, 'Standard'),
                    range: this.calculateGunRange(140),
                    reload: 2, ammo: 140, penetration: 132,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Type 8 Torpedo (2×4)',
                    shellWeight: 390, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(390, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 278,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_isuzu', {
            universe: 'siren',
            name: '[CL] Mass Produced Isuzu-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 5500,
            speedKnots: 35,
            armorThickness: { belt: 48, deck: 24, turret: 56 },
            baseAccuracy: 78,
            stats: {
                health: this.calculateHP(5500, 'Light Cruiser'),
                armor: this.calculateArmor(48, 24, 56),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 5500),
                range: 9,
                baseAccuracy: 78
            },
            weapons: {
                primary: {
                    name: '127mm/40 Type 89 DP Twin Battery',
                    shellWeight: 25, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 6, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 160, penetration: 112,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '25mm AA Battery',
                    shellWeight: 0.25, barrelCount: 12, caliber: 25,
                    damage: this.calculateWeaponDamage(0.25, 12, 'Standard'),
                    range: this.calculateGunRange(25),
                    reload: 1, ammo: 500, penetration: 25,
                    quality: 'Standard', ammoTypes: ['he']
                },
                torpedoes: {
                    name: '533mm Type 8 Torpedo (4 tubes)',
                    shellWeight: 390, barrelCount: 4, caliber: 533,
                    damage: this.calculateWeaponDamage(390, 4, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 8, penetration: 275,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_sendai', {
            universe: 'siren',
            name: '[CL] Mass Produced Sendai-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 5195,
            speedKnots: 35,
            armorThickness: { belt: 50, deck: 25, turret: 58 },
            baseAccuracy: 77,
            stats: {
                health: this.calculateHP(5195, 'Light Cruiser'),
                armor: this.calculateArmor(50, 25, 58),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 5195),
                range: 9,
                baseAccuracy: 77
            },
            weapons: {
                primary: {
                    name: '140mm/50 3rd Year Type Battery',
                    shellWeight: 38, barrelCount: 7, caliber: 140,
                    damage: this.calculateWeaponDamage(38, 7, 'Standard'),
                    range: this.calculateGunRange(140),
                    reload: 2, ammo: 140, penetration: 133,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 90 (2×4)',
                    shellWeight: 490, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 8, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 12, penetration: 335,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_kuma', {
            universe: 'siren',
            name: '[CL] Mass Produced Kuma-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 5100,
            speedKnots: 36,
            armorThickness: { belt: 48, deck: 24, turret: 56 },
            baseAccuracy: 75,
            stats: {
                health: this.calculateHP(5100, 'Light Cruiser'),
                armor: this.calculateArmor(48, 24, 56),
                speed: this.calculateSpeed(36),
                evasion: this.calculateEvasion(36, 5100),
                range: 9,
                baseAccuracy: 75
            },
            weapons: {
                primary: {
                    name: '140mm/50 3rd Year Type Battery',
                    shellWeight: 38, barrelCount: 7, caliber: 140,
                    damage: this.calculateWeaponDamage(38, 7, 'Standard'),
                    range: this.calculateGunRange(140),
                    reload: 2, ammo: 140, penetration: 130,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Type 8 Torpedo (2×4)',
                    shellWeight: 390, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(390, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 276,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_konigsberg', {
            universe: 'siren',
            name: '[CL] Mass Produced Konigsberg-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 6650,
            speedKnots: 32,
            armorThickness: { belt: 52, deck: 26, turret: 60 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(6650, 'Light Cruiser'),
                armor: this.calculateArmor(52, 26, 60),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 6650),
                range: 10,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: '150mm/60 SK C/25 Triple Battery',
                    shellWeight: 45, barrelCount: 9, caliber: 150,
                    damage: this.calculateWeaponDamage(45, 9, 'Standard'),
                    range: this.calculateGunRange(150),
                    reload: 2, ammo: 150, penetration: 142,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm G7a Torpedo (4×3)',
                    shellWeight: 400, barrelCount: 12, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 12, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 16, penetration: 288,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_cleveland', {
            universe: 'siren',
            name: '[CL] Mass Produced Cleveland-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 11744,
            speedKnots: 32,
            armorThickness: { belt: 60, deck: 30, turret: 68 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(11744, 'Light Cruiser'),
                armor: this.calculateArmor(60, 30, 68),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 11744),
                range: 10,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '152mm/47 Mk 16 Triple Battery',
                    shellWeight: 55, barrelCount: 12, caliber: 152,
                    damage: this.calculateWeaponDamage(55, 12, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 160, penetration: 148,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm/38 Mk 12 DP Battery',
                    shellWeight: 25, barrelCount: 12, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 12, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 108,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_leander', {
            universe: 'siren',
            name: '[CL] Mass Produced Leander-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 7270,
            speedKnots: 32,
            armorThickness: { belt: 56, deck: 28, turret: 64 },
            baseAccuracy: 79,
            stats: {
                health: this.calculateHP(7270, 'Light Cruiser'),
                armor: this.calculateArmor(56, 28, 64),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 7270),
                range: 10,
                baseAccuracy: 79
            },
            weapons: {
                primary: {
                    name: '152mm/50 Mk XXIII Twin Battery',
                    shellWeight: 55, barrelCount: 8, caliber: 152,
                    damage: this.calculateWeaponDamage(55, 8, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 150, penetration: 144,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Mk IX Torpedo (2×4)',
                    shellWeight: 400, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 285,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_fiji', {
            universe: 'siren',
            name: '[CL] Mass Produced Fiji-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 8530,
            speedKnots: 31,
            armorThickness: { belt: 58, deck: 29, turret: 66 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(8530, 'Light Cruiser'),
                armor: this.calculateArmor(58, 29, 66),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 8530),
                range: 10,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: '152mm/50 Mk XXIII Triple Battery',
                    shellWeight: 55, barrelCount: 12, caliber: 152,
                    damage: this.calculateWeaponDamage(55, 12, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 155, penetration: 146,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '102mm/45 QF Mk XVI DP Battery',
                    shellWeight: 14, barrelCount: 8, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 8, 'Standard'),
                    range: this.calculateGunRange(100),
                    reload: 1, ammo: 200, penetration: 88,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_emile_bertin', {
            universe: 'siren',
            name: '[CL] Mass Produced Emile Bertin-Class',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 5886,
            speedKnots: 39,
            armorThickness: { belt: 46, deck: 23, turret: 55 },
            baseAccuracy: 78,
            stats: {
                health: this.calculateHP(5886, 'Light Cruiser'),
                armor: this.calculateArmor(46, 23, 55),
                speed: this.calculateSpeed(39),
                evasion: this.calculateEvasion(39, 5886),
                range: 10,
                baseAccuracy: 78
            },
            weapons: {
                primary: {
                    name: '152mm/55 Mle 1930 Triple Battery',
                    shellWeight: 55, barrelCount: 9, caliber: 152,
                    damage: this.calculateWeaponDamage(55, 9, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 145, penetration: 145,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '550mm Mle 1930 Torpedo (2×3)',
                    shellWeight: 440, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(440, 6, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 10, penetration: 298,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });


// ── HEAVY CRUISERS ────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_mogami', {
            universe: 'siren',
            name: '[CA] Mass Produced Mogami-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 11200,
            speedKnots: 35,
            armorThickness: { belt: 180, deck: 90, turret: 180 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(11200, 'Heavy Cruiser'),
                armor: this.calculateArmor(180, 90, 180),
                speed: this.calculateSpeed(35),
                evasion: this.calculateEvasion(35, 11200),
                range: 12,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '203mm/50 Type 3 No.2 Twin Battery',
                    shellWeight: 122, barrelCount: 10, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 10, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 110, penetration: 192,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 93 (3×4)',
                    shellWeight: 490, barrelCount: 12, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 12, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 338,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_myoukou', {
            universe: 'siren',
            name: '[CA] Mass Produced Myoukou-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 13000,
            speedKnots: 34,
            armorThickness: { belt: 185, deck: 92, turret: 185 },
            baseAccuracy: 83,
            stats: {
                health: this.calculateHP(13000, 'Heavy Cruiser'),
                armor: this.calculateArmor(185, 92, 185),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 13000),
                range: 13,
                baseAccuracy: 83
            },
            weapons: {
                primary: {
                    name: '203mm/50 3rd Year Type Twin Battery',
                    shellWeight: 122, barrelCount: 10, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 10, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 110, penetration: 195,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm/40 Type 89 DP Battery',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 108,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 93 (4×4)',
                    shellWeight: 490, barrelCount: 16, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 16, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 18, penetration: 342,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_aoba', {
            universe: 'siren',
            name: '[CA] Mass Produced Aoba-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 7950,
            speedKnots: 34,
            armorThickness: { belt: 170, deck: 85, turret: 170 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(7950, 'Heavy Cruiser'),
                armor: this.calculateArmor(170, 85, 170),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 7950),
                range: 12,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: '203mm/50 3rd Year Type Twin Battery',
                    shellWeight: 122, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 6, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 100, penetration: 188,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 90 (3×4)',
                    shellWeight: 490, barrelCount: 12, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 12, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 14, penetration: 332,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_takao', {
            universe: 'siren',
            name: '[CA] Mass Produced Takao-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 13400,
            speedKnots: 34,
            armorThickness: { belt: 190, deck: 95, turret: 190 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(13400, 'Heavy Cruiser'),
                armor: this.calculateArmor(190, 95, 190),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 13400),
                range: 13,
                baseAccuracy: 84
            },
            weapons: {
                primary: {
                    name: '203mm/50 3rd Year Type Twin Battery',
                    shellWeight: 122, barrelCount: 10, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 10, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 110, penetration: 196,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm/40 Type 89 DP Battery',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 108,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 93 (4×4)',
                    shellWeight: 490, barrelCount: 16, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 16, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 18, penetration: 345,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_furutaka', {
            universe: 'siren',
            name: '[CA] Mass Produced Furutaka-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 7950,
            speedKnots: 34,
            armorThickness: { belt: 165, deck: 82, turret: 165 },
            baseAccuracy: 79,
            stats: {
                health: this.calculateHP(7950, 'Heavy Cruiser'),
                armor: this.calculateArmor(165, 82, 165),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 7950),
                range: 12,
                baseAccuracy: 79
            },
            weapons: {
                primary: {
                    name: '203mm/50 3rd Year Type Twin Battery',
                    shellWeight: 122, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 6, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 100, penetration: 185,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '610mm Long Lance Type 90 (3×4)',
                    shellWeight: 490, barrelCount: 12, caliber: 610,
                    damage: this.calculateWeaponDamage(490, 12, 'Standard'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 14, penetration: 330,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_deutschland', {
            universe: 'siren',
            name: '[CA] Mass Produced Deutschland-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 12000,
            speedKnots: 28,
            armorThickness: { belt: 200, deck: 100, turret: 200 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(12000, 'Heavy Cruiser'),
                armor: this.calculateArmor(200, 100, 200),
                speed: this.calculateSpeed(28),
                evasion: this.calculateEvasion(28, 12000),
                range: 16,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: '280mm/54.5 SK C/28 Triple Battery',
                    shellWeight: 330, barrelCount: 6, caliber: 280,
                    damage: this.calculateWeaponDamage(330, 6, 'Standard'),
                    range: this.calculateGunRange(280),
                    reload: 4, ammo: 70, penetration: 278,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '150mm/55 SK C/28 Twin Battery',
                    shellWeight: 45, barrelCount: 8, caliber: 150,
                    damage: this.calculateWeaponDamage(45, 8, 'Standard'),
                    range: this.calculateGunRange(150),
                    reload: 2, ammo: 180, penetration: 138,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm G7a Torpedo (2×4)',
                    shellWeight: 400, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 290,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_norfolk', {
            universe: 'siren',
            name: '[CA] Mass Produced Norfolk-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 9975,
            speedKnots: 32,
            armorThickness: { belt: 180, deck: 90, turret: 180 },
            baseAccuracy: 81,
            stats: {
                health: this.calculateHP(9975, 'Heavy Cruiser'),
                armor: this.calculateArmor(180, 90, 180),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 9975),
                range: 12,
                baseAccuracy: 81
            },
            weapons: {
                primary: {
                    name: '203mm/50 Mk VIII Twin Battery',
                    shellWeight: 122, barrelCount: 8, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 8, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 105, penetration: 190,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '102mm/45 QF Mk XVI DP Battery',
                    shellWeight: 14, barrelCount: 8, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 8, 'Standard'),
                    range: this.calculateGunRange(100),
                    reload: 1, ammo: 200, penetration: 85,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Mk IX Torpedo (2×4)',
                    shellWeight: 400, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 282,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_algerie', {
            universe: 'siren',
            name: '[CA] Mass Produced Algerie-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 10000,
            speedKnots: 31,
            armorThickness: { belt: 195, deck: 98, turret: 195 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(10000, 'Heavy Cruiser'),
                armor: this.calculateArmor(195, 98, 195),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 10000),
                range: 12,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '203mm/55 Mle 1931 Twin Battery',
                    shellWeight: 123, barrelCount: 8, caliber: 203,
                    damage: this.calculateWeaponDamage(123, 8, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 105, penetration: 192,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '100mm/45 Mle 1930 Twin Battery',
                    shellWeight: 14, barrelCount: 12, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 12, 'Standard'),
                    range: this.calculateGunRange(100),
                    reload: 1, ammo: 220, penetration: 84,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '550mm Mle 1930 Torpedo (2×3)',
                    shellWeight: 440, barrelCount: 6, caliber: 533,
                    damage: this.calculateWeaponDamage(440, 6, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 10, penetration: 295,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_zara', {
            universe: 'siren',
            name: '[CA] Mass Produced Zara-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 11870,
            speedKnots: 32,
            armorThickness: { belt: 200, deck: 100, turret: 200 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(11870, 'Heavy Cruiser'),
                armor: this.calculateArmor(200, 100, 200),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 11870),
                range: 12,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '203mm/53 Ansaldo Twin Battery',
                    shellWeight: 125, barrelCount: 8, caliber: 203,
                    damage: this.calculateWeaponDamage(125, 8, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 108, penetration: 194,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '100mm/47 OTO Twin DP Battery',
                    shellWeight: 14, barrelCount: 16, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 16, 'Standard'),
                    range: this.calculateGunRange(100),
                    reload: 1, ammo: 240, penetration: 84,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_zhusanuo', {
            universe: 'siren',
            name: '[CA] Mass Produced Zhusanuo-Class',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 10500,
            speedKnots: 30,
            armorThickness: { belt: 180, deck: 90, turret: 180 },
            baseAccuracy: 80,
            stats: {
                health: this.calculateHP(10500, 'Heavy Cruiser'),
                armor: this.calculateArmor(180, 90, 180),
                speed: this.calculateSpeed(30),
                evasion: this.calculateEvasion(30, 10500),
                range: 12,
                baseAccuracy: 80
            },
            weapons: {
                primary: {
                    name: '203mm/50 Twin Battery',
                    shellWeight: 122, barrelCount: 8, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 8, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 100, penetration: 188,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm DP Battery',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 108,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: '533mm Torpedo (2×4)',
                    shellWeight: 400, barrelCount: 8, caliber: 533,
                    damage: this.calculateWeaponDamage(400, 8, 'Standard'),
                    range: this.calculateGunRange(533),
                    reload: 5, ammo: 12, penetration: 283,
                    quality: 'Standard', ammoTypes: ['torpedo']
                }
            }
        });


// ── BATTLESHIPS ───────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_kongou', {
            universe: 'siren',
            name: '[BB] Mass Produced Kongou-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 27500,
            speedKnots: 30,
            armorThickness: { belt: 270, deck: 95, turret: 360 },
            baseAccuracy: 83,
            stats: {
                health: this.calculateHP(27500, 'Battleship'),
                armor: this.calculateArmor(270, 95, 360),
                speed: this.calculateSpeed(30),
                evasion: this.calculateEvasion(30, 27500),
                range: 20,
                baseAccuracy: 83
            },
            weapons: {
                primary: {
                    name: '356mm/45 41st Year Type Twin Battery',
                    shellWeight: 635, barrelCount: 8, caliber: 356,
                    damage: this.calculateWeaponDamage(635, 8, 'Standard'),
                    range: this.calculateGunRange(356),
                    reload: 4, ammo: 65, penetration: 385,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '152mm/50 41st Year Type Twin Battery',
                    shellWeight: 45, barrelCount: 16, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 16, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 200, penetration: 135,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_ise', {
            universe: 'siren',
            name: '[BB] Mass Produced Ise-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 36000,
            speedKnots: 25,
            armorThickness: { belt: 280, deck: 100, turret: 375 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(36000, 'Battleship'),
                armor: this.calculateArmor(280, 100, 375),
                speed: this.calculateSpeed(25),
                evasion: this.calculateEvasion(25, 36000),
                range: 20,
                baseAccuracy: 84
            },
            weapons: {
                primary: {
                    name: '356mm/45 41st Year Type Twin Battery',
                    shellWeight: 635, barrelCount: 12, caliber: 356,
                    damage: this.calculateWeaponDamage(635, 12, 'Standard'),
                    range: this.calculateGunRange(356),
                    reload: 4, ammo: 72, penetration: 388,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '140mm/50 3rd Year Type Twin Battery',
                    shellWeight: 38, barrelCount: 12, caliber: 140,
                    damage: this.calculateWeaponDamage(38, 12, 'Standard'),
                    range: this.calculateGunRange(140),
                    reload: 2, ammo: 210, penetration: 128,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_fusou', {
            universe: 'siren',
            name: '[BB] Mass Produced Fusou-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 34700,
            speedKnots: 24,
            armorThickness: { belt: 280, deck: 100, turret: 375 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(34700, 'Battleship'),
                armor: this.calculateArmor(280, 100, 375),
                speed: this.calculateSpeed(24),
                evasion: this.calculateEvasion(24, 34700),
                range: 20,
                baseAccuracy: 84
            },
            weapons: {
                primary: {
                    name: '356mm/45 41st Year Type Twin Battery',
                    shellWeight: 635, barrelCount: 12, caliber: 356,
                    damage: this.calculateWeaponDamage(635, 12, 'Standard'),
                    range: this.calculateGunRange(356),
                    reload: 4, ammo: 70, penetration: 386,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '152mm/50 41st Year Type Twin Battery',
                    shellWeight: 45, barrelCount: 16, caliber: 152,
                    damage: this.calculateWeaponDamage(45, 16, 'Standard'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 205, penetration: 135,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_north_carolina', {
            universe: 'siren',
            name: '[BB] Mass Produced North Carolina-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 36600,
            speedKnots: 28,
            armorThickness: { belt: 295, deck: 108, turret: 395 },
            baseAccuracy: 86,
            stats: {
                health: this.calculateHP(36600, 'Battleship'),
                armor: this.calculateArmor(295, 108, 395),
                speed: this.calculateSpeed(28),
                evasion: this.calculateEvasion(28, 36600),
                range: 22,
                baseAccuracy: 86
            },
            weapons: {
                primary: {
                    name: '406mm/45 Mk 6 Triple Battery',
                    shellWeight: 862, barrelCount: 9, caliber: 406,
                    damage: this.calculateWeaponDamage(862, 9, 'Standard'),
                    range: this.calculateGunRange(406),
                    reload: 4, ammo: 70, penetration: 428,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm/38 Mk 12 DP Twin Battery',
                    shellWeight: 25, barrelCount: 12, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 12, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 220, penetration: 108,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_colorado', {
            universe: 'siren',
            name: '[BB] Mass Produced Colorado-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 32500,
            speedKnots: 21,
            armorThickness: { belt: 290, deck: 105, turret: 390 },
            baseAccuracy: 85,
            stats: {
                health: this.calculateHP(32500, 'Battleship'),
                armor: this.calculateArmor(290, 105, 390),
                speed: this.calculateSpeed(21),
                evasion: this.calculateEvasion(21, 32500),
                range: 22,
                baseAccuracy: 85
            },
            weapons: {
                primary: {
                    name: '406mm/45 Mk 5 Twin Battery',
                    shellWeight: 862, barrelCount: 8, caliber: 406,
                    damage: this.calculateWeaponDamage(862, 8, 'Standard'),
                    range: this.calculateGunRange(406),
                    reload: 4, ammo: 68, penetration: 425,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '127mm/51 Mk 7 Battery',
                    shellWeight: 25, barrelCount: 8, caliber: 127,
                    damage: this.calculateWeaponDamage(25, 8, 'Standard'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 200, penetration: 106,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_king_george_v', {
            universe: 'siren',
            name: '[BB] Mass Produced King George V-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 36727,
            speedKnots: 28,
            armorThickness: { belt: 300, deck: 110, turret: 405 },
            baseAccuracy: 86,
            stats: {
                health: this.calculateHP(36727, 'Battleship'),
                armor: this.calculateArmor(300, 110, 405),
                speed: this.calculateSpeed(28),
                evasion: this.calculateEvasion(28, 36727),
                range: 20,
                baseAccuracy: 86
            },
            weapons: {
                primary: {
                    name: '356mm/45 Mk VII Battery',
                    shellWeight: 721, barrelCount: 10, caliber: 356,
                    damage: this.calculateWeaponDamage(721, 10, 'Standard'),
                    range: this.calculateGunRange(356),
                    reload: 4, ammo: 70, penetration: 395,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '133mm/50 Mk I DP Twin Battery',
                    shellWeight: 37, barrelCount: 16, caliber: 130,
                    damage: this.calculateWeaponDamage(37, 16, 'Standard'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 210, penetration: 122,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_bretagne', {
            universe: 'siren',
            name: '[BB] Mass Produced Bretagne-Class',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 23230,
            speedKnots: 20,
            armorThickness: { belt: 265, deck: 90, turret: 355 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(23230, 'Battleship'),
                armor: this.calculateArmor(265, 90, 355),
                speed: this.calculateSpeed(20),
                evasion: this.calculateEvasion(20, 23230),
                range: 19,
                baseAccuracy: 82
            },
            weapons: {
                primary: {
                    name: '340mm/45 Mle 1912 Twin Battery',
                    shellWeight: 575, barrelCount: 10, caliber: 330,
                    damage: this.calculateWeaponDamage(575, 10, 'Standard'),
                    range: this.calculateGunRange(330),
                    reload: 4, ammo: 62, penetration: 360,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: '138mm/55 Mle 1910 Battery',
                    shellWeight: 36, barrelCount: 12, caliber: 130,
                    damage: this.calculateWeaponDamage(36, 12, 'Standard'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 200, penetration: 118,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            }
        });


// ── AIRCRAFT CARRIERS ─────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_akagi', {
            universe: 'siren',
            name: '[CV] Mass Produced Akagi-Class',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 36500,
            speedKnots: 31,
            armorThickness: { belt: 40, deck: 38, turret: 18 },
            baseAccuracy: 72,
            stats: {
                health: this.calculateHP(36500, 'Aircraft Carrier'),
                armor: this.calculateArmor(40, 38, 18),
                speed: this.calculateSpeed(31),
                evasion: this.calculateEvasion(31, 36500),
                range: 15,
                baseAccuracy: 72
            },
            hangar: 28,
            weapons: {
                secondary: {
                    name: '203mm/50 3rd Year Type Twin Battery',
                    shellWeight: 122, barrelCount: 6, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 6, 'Standard'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 60, penetration: 180,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'A6M Zero Fighter Squadron',
                    count: 8, maxCount: 8, range: 12, damage: 48,
                    hp: 24, maxHP: 24, squadronHP: 24 * 8, maxSquadronHP: 24 * 8,
                    quality: 'Standard', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'D3A Val Dive Bomber Squadron',
                    count: 8, maxCount: 8, range: 10, damage: 80,
                    hp: 30, maxHP: 30, squadronHP: 30 * 8, maxSquadronHP: 30 * 8,
                    quality: 'Standard', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_sq', {
                    name: 'B5N Kate Torpedo Squadron',
                    count: 6, maxCount: 6, range: 9, damage: 110,
                    hp: 28, maxHP: 28, squadronHP: 28 * 6, maxSquadronHP: 28 * 6,
                    quality: 'Standard', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('siren_taihou', {
            universe: 'siren',
            name: '[CV] Mass Produced Taihou-Class',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 29300,
            speedKnots: 33,
            armorThickness: { belt: 55, deck: 75, turret: 25 },
            baseAccuracy: 73,
            stats: {
                health: this.calculateHP(29300, 'Aircraft Carrier'),
                armor: this.calculateArmor(55, 75, 25),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 29300),
                range: 16,
                baseAccuracy: 73
            },
            hangar: 22,
            weapons: {
                secondary: {
                    name: '100mm/65 Type 98 Twin DP Battery',
                    shellWeight: 14, barrelCount: 12, caliber: 100,
                    damage: this.calculateWeaponDamage(14, 12, 'Standard'),
                    range: this.calculateGunRange(100),
                    reload: 1, ammo: 300, penetration: 85,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'A7M Reppu Fighter Squadron',
                    count: 7, maxCount: 7, range: 13, damage: 52,
                    hp: 28, maxHP: 28, squadronHP: 28 * 7, maxSquadronHP: 28 * 7,
                    quality: 'Standard', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'D4Y Suisei Dive Bomber Squadron',
                    count: 6, maxCount: 6, range: 11, damage: 85,
                    hp: 32, maxHP: 32, squadronHP: 32 * 6, maxSquadronHP: 32 * 6,
                    quality: 'Standard', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_sq', {
                    name: 'B6N Tenzan Torpedo Squadron',
                    count: 5, maxCount: 5, range: 10, damage: 118,
                    hp: 30, maxHP: 30, squadronHP: 30 * 5, maxSquadronHP: 30 * 5,
                    quality: 'Standard', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('siren_illustrious', {
            universe: 'siren',
            name: '[CV] Mass Produced Illustrious-Class',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 23207,
            speedKnots: 30,
            armorThickness: { belt: 52, deck: 68, turret: 22 },
            baseAccuracy: 71,
            stats: {
                health: this.calculateHP(23207, 'Aircraft Carrier'),
                armor: this.calculateArmor(52, 68, 22),
                speed: this.calculateSpeed(30),
                evasion: this.calculateEvasion(30, 23207),
                range: 14,
                baseAccuracy: 71
            },
            hangar: 18,
            weapons: {
                secondary: {
                    name: '114mm/45 QF Mk III Twin DP Battery',
                    shellWeight: 25, barrelCount: 16, caliber: 114,
                    damage: this.calculateWeaponDamage(25, 16, 'Standard'),
                    range: this.calculateGunRange(114),
                    reload: 2, ammo: 280, penetration: 108,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'Seafire Fighter Squadron',
                    count: 8, maxCount: 8, range: 10, damage: 46,
                    hp: 26, maxHP: 26, squadronHP: 26 * 8, maxSquadronHP: 26 * 8,
                    quality: 'Standard', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'Barracuda Dive Bomber Squadron',
                    count: 6, maxCount: 6, range: 9, damage: 78,
                    hp: 30, maxHP: 30, squadronHP: 30 * 6, maxSquadronHP: 30 * 6,
                    quality: 'Standard', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }]
            ])
        });

        this.aiTypes.set('siren_bearn', {
            universe: 'siren',
            name: '[CV] Mass Produced Bearn-Class',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 22146,
            speedKnots: 21,
            armorThickness: { belt: 40, deck: 38, turret: 18 },
            baseAccuracy: 70,
            stats: {
                health: this.calculateHP(22146, 'Aircraft Carrier'),
                armor: this.calculateArmor(40, 38, 18),
                speed: this.calculateSpeed(21),
                evasion: this.calculateEvasion(21, 22146),
                range: 13,
                baseAccuracy: 70
            },
            hangar: 20,
            weapons: {
                secondary: {
                    name: '155mm/50 Mle 1920 Twin Battery',
                    shellWeight: 55, barrelCount: 8, caliber: 155,
                    damage: this.calculateWeaponDamage(55, 8, 'Standard'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 150, penetration: 140,
                    quality: 'Standard', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'MS.406 Fighter Squadron',
                    count: 4, maxCount: 4, range: 8, damage: 40,
                    hp: 22, maxHP: 22, squadronHP: 22 * 4, maxSquadronHP: 22 * 4,
                    quality: 'Standard', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'LN.401 Dive Bomber Squadron',
                    count: 5, maxCount: 5, range: 8, damage: 72,
                    hp: 26, maxHP: 26, squadronHP: 26 * 5, maxSquadronHP: 26 * 5,
                    quality: 'Standard', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_sq', {
                    name: 'Levasseur PL.7 Torpedo Squadron',
                    count: 5, maxCount: 5, range: 7, damage: 98,
                    hp: 24, maxHP: 24, squadronHP: 24 * 5, maxSquadronHP: 24 * 5,
                    quality: 'Standard', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });


// ── BOSSES ────────────────────────────────────────────────────────────────────────

        this.aiTypes.set('siren_boss_observer_alpha', {
            universe: 'siren',
            name: '[DD] Observer α',
            type: 'destroyer',
            shipClass: 'AI Destroyer',
            tonnage: 10000,
            speedKnots: 42,
            armorThickness: { belt: 38, deck: 22, turret: 24 },
            baseAccuracy: 90,
            stats: {
                health: this.calculateHP(10000, 'Destroyer'),
                armor: this.calculateArmor(38, 22, 24),
                speed: this.calculateSpeed(42),
                evasion: this.calculateEvasion(42, 10000),
                range: 10,
                baseAccuracy: 90
            },
            weapons: {
                primary: {
                    name: 'Observer Pulse Cannon Array',
                    shellWeight: 35, barrelCount: 6, caliber: 127,
                    damage: this.calculateWeaponDamage(35, 6, 'Exceptional'),
                    range: this.calculateGunRange(127),
                    reload: 2, ammo: 180, penetration: 165,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'High-Speed Anomalous Torpedo',
                    shellWeight: 550, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(550, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 4, ammo: 16, penetration: 420,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_boss_tester_beta', {
            universe: 'siren',
            name: '[CL] Tester β',
            type: 'lightcruiser',
            shipClass: 'AI Light Cruiser',
            tonnage: 20000,
            speedKnots: 34,
            armorThickness: { belt: 85, deck: 42, turret: 95 },
            baseAccuracy: 90,
            stats: {
                health: this.calculateHP(20000, 'Light Cruiser'),
                armor: this.calculateArmor(85, 42, 95),
                speed: this.calculateSpeed(34),
                evasion: this.calculateEvasion(34, 20000),
                range: 13,
                baseAccuracy: 90
            },
            weapons: {
                primary: {
                    name: 'Tester Adaptive Main Battery',
                    shellWeight: 68, barrelCount: 9, caliber: 155,
                    damage: this.calculateWeaponDamage(68, 9, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 200, penetration: 195,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Tester AA Array',
                    shellWeight: 12, barrelCount: 12, caliber: 100,
                    damage: this.calculateWeaponDamage(12, 12, 'Exceptional'),
                    range: this.calculateGunRange(100),
                    reload: 1, ammo: 350, penetration: 95,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Tester Depth Charge Torpedo',
                    shellWeight: 500, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(500, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 14, penetration: 400,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_boss_purifier', {
            universe: 'siren',
            name: '[BB] Purifier',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 80000,
            speedKnots: 23,
            armorThickness: { belt: 370, deck: 140, turret: 480 },
            baseAccuracy: 91,
            stats: {
                health: this.calculateHP(80000, 'Battleship'),
                armor: this.calculateArmor(370, 140, 480),
                speed: this.calculateSpeed(23),
                evasion: this.calculateEvasion(23, 80000),
                range: 24,
                baseAccuracy: 91
            },
            weapons: {
                primary: {
                    name: 'Purifier Dual-Bore Siege Cannon',
                    shellWeight: 1800, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1800, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 80, penetration: 560,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Purifier Secondary Battery',
                    shellWeight: 68, barrelCount: 20, caliber: 155,
                    damage: this.calculateWeaponDamage(68, 20, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 350, penetration: 175,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_boss_dreamweaver', {
            universe: 'siren',
            name: '[CV] Dreamweaver',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 55000,
            speedKnots: 26,
            armorThickness: { belt: 72, deck: 62, turret: 40 },
            baseAccuracy: 82,
            stats: {
                health: this.calculateHP(55000, 'Aircraft Carrier'),
                armor: this.calculateArmor(72, 62, 40),
                speed: this.calculateSpeed(26),
                evasion: this.calculateEvasion(26, 55000),
                range: 22,
                baseAccuracy: 82
            },
            hangar: 42,
            weapons: {
                secondary: {
                    name: 'Dreamweaver Anti-Air Battery',
                    shellWeight: 35, barrelCount: 16, caliber: 130,
                    damage: this.calculateWeaponDamage(35, 16, 'Exceptional'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 320, penetration: 138,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'Dreamweaver Phantom Fighter Wing',
                    count: 14, maxCount: 14, range: 18, damage: 70,
                    hp: 36, maxHP: 36, squadronHP: 36 * 14, maxSquadronHP: 36 * 14,
                    quality: 'Exceptional', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'Dreamweaver Nightmare Bomber Wing',
                    count: 12, maxCount: 12, range: 15, damage: 118,
                    hp: 44, maxHP: 44, squadronHP: 44 * 12, maxSquadronHP: 44 * 12,
                    quality: 'Exceptional', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_sq', {
                    name: 'Dreamweaver Spectral Torpedo Wing',
                    count: 10, maxCount: 10, range: 13, damage: 155,
                    hp: 40, maxHP: 40, squadronHP: 40 * 10, maxSquadronHP: 40 * 10,
                    quality: 'Exceptional', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('siren_boss_omitter', {
            universe: 'siren',
            name: '[SS] Omitter',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 6000,
            speedKnots: 20,
            armorThickness: { belt: 45, deck: 28, turret: 22 },
            baseAccuracy: 92,
            stats: {
                health: this.calculateHP(6000, 'Submarine'),
                armor: this.calculateArmor(45, 28, 22),
                speed: this.calculateSpeed(20),
                evasion: this.calculateEvasion(20, 6000),
                range: 12,
                baseAccuracy: 92
            },
            weapons: {
                torpedoes: {
                    name: 'Omitter Phase Torpedo Array',
                    shellWeight: 650, barrelCount: 12, caliber: 610,
                    damage: this.calculateWeaponDamage(650, 12, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 20, penetration: 480,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                },
                primary: {
                    name: 'Omitter Deck Cannon',
                    shellWeight: 55, barrelCount: 2, caliber: 152,
                    damage: this.calculateWeaponDamage(55, 2, 'Exceptional'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 80, penetration: 155,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_boss_complier', {
            universe: 'siren',
            name: '[CA] Complier',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 28000,
            speedKnots: 32,
            armorThickness: { belt: 240, deck: 120, turret: 240 },
            baseAccuracy: 91,
            stats: {
                health: this.calculateHP(28000, 'Heavy Cruiser'),
                armor: this.calculateArmor(240, 120, 240),
                speed: this.calculateSpeed(32),
                evasion: this.calculateEvasion(32, 28000),
                range: 16,
                baseAccuracy: 91
            },
            weapons: {
                primary: {
                    name: 'Complier Heavy Main Battery',
                    shellWeight: 200, barrelCount: 9, caliber: 203,
                    damage: this.calculateWeaponDamage(200, 9, 'Exceptional'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 140, penetration: 285,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Complier Secondary Battery',
                    shellWeight: 35, barrelCount: 14, caliber: 130,
                    damage: this.calculateWeaponDamage(35, 14, 'Exceptional'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 280, penetration: 145,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Complier Heavy Torpedo Rack',
                    shellWeight: 600, barrelCount: 10, caliber: 610,
                    damage: this.calculateWeaponDamage(600, 10, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 16, penetration: 460,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_boss_arbiter_empress_iii', {
            universe: 'siren',
            name: '[CV] Arbiter: The Empress III',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 40000,
            speedKnots: 27,
            armorThickness: { belt: 310, deck: 115, turret: 415 },
            baseAccuracy: 84,
            stats: {
                health: this.calculateHP(40000, 'Aircraft Carrier'),
                armor: this.calculateArmor(310, 115, 415),
                speed: this.calculateSpeed(27),
                evasion: this.calculateEvasion(27, 40000),
                range: 20,
                baseAccuracy: 84
            },
            hangar: 36,
            weapons: {
                secondary: {
                    name: 'Empress Sovereign Battery',
                    shellWeight: 35, barrelCount: 14, caliber: 130,
                    damage: this.calculateWeaponDamage(35, 14, 'Exceptional'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 300, penetration: 140,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'Empress Royal Fighter Wing',
                    count: 12, maxCount: 12, range: 16, damage: 65,
                    hp: 34, maxHP: 34, squadronHP: 34 * 12, maxSquadronHP: 34 * 12,
                    quality: 'Exceptional', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'Empress Wrath Bomber Wing',
                    count: 10, maxCount: 10, range: 13, damage: 108,
                    hp: 42, maxHP: 42, squadronHP: 42 * 10, maxSquadronHP: 42 * 10,
                    quality: 'Exceptional', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_sq', {
                    name: 'Empress Dominion Torpedo Wing',
                    count: 8, maxCount: 8, range: 12, damage: 145,
                    hp: 38, maxHP: 38, squadronHP: 38 * 8, maxSquadronHP: 38 * 8,
                    quality: 'Exceptional', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('siren_boss_arbiter_hierophant_v', {
            universe: 'siren',
            name: '[BB] Arbiter: The Hierophant V',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 52000,
            speedKnots: 23,
            armorThickness: { belt: 320, deck: 120, turret: 425 },
            baseAccuracy: 91,
            stats: {
                health: this.calculateHP(52000, 'Battleship'),
                armor: this.calculateArmor(320, 120, 425),
                speed: this.calculateSpeed(23),
                evasion: this.calculateEvasion(23, 52000),
                range: 23,
                baseAccuracy: 91
            },
            weapons: {
                primary: {
                    name: 'Hierophant Sacred Cannon',
                    shellWeight: 1400, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1400, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 82, penetration: 525,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Hierophant Secondary Battery',
                    shellWeight: 68, barrelCount: 18, caliber: 155,
                    damage: this.calculateWeaponDamage(68, 18, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 310, penetration: 168,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_boss_arbiter_lovers_vi', {
            universe: 'siren',
            name: '[CA] Arbiter: The Lovers VI',
            type: 'cruiser',
            shipClass: 'AI Heavy Cruiser',
            tonnage: 20000,
            speedKnots: 33,
            armorThickness: { belt: 245, deck: 122, turret: 245 },
            baseAccuracy: 90,
            stats: {
                health: this.calculateHP(20000, 'Heavy Cruiser'),
                armor: this.calculateArmor(245, 122, 245),
                speed: this.calculateSpeed(33),
                evasion: this.calculateEvasion(33, 20000),
                range: 15,
                baseAccuracy: 90
            },
            weapons: {
                primary: {
                    name: 'Lovers Dual-Aligned Main Battery',
                    shellWeight: 155, barrelCount: 8, caliber: 203,
                    damage: this.calculateWeaponDamage(155, 8, 'Exceptional'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 130, penetration: 252,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Lovers Harmony Secondary',
                    shellWeight: 35, barrelCount: 12, caliber: 130,
                    damage: this.calculateWeaponDamage(35, 12, 'Exceptional'),
                    range: this.calculateGunRange(130),
                    reload: 2, ammo: 250, penetration: 140,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Lovers Entwined Torpedo Rack',
                    shellWeight: 550, barrelCount: 10, caliber: 610,
                    damage: this.calculateWeaponDamage(550, 10, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 16, penetration: 430,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_boss_arbiter_strength_viii', {
            universe: 'siren',
            name: '[BB] Arbiter: Strength VIII',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 65000,
            speedKnots: 23,
            armorThickness: { belt: 330, deck: 125, turret: 435 },
            baseAccuracy: 92,
            stats: {
                health: this.calculateHP(65000, 'Battleship'),
                armor: this.calculateArmor(330, 125, 435),
                speed: this.calculateSpeed(23),
                evasion: this.calculateEvasion(23, 65000),
                range: 24,
                baseAccuracy: 92
            },
            weapons: {
                primary: {
                    name: 'Strength Unstoppable Siege Cannon',
                    shellWeight: 1600, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1600, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 85, penetration: 545,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Strength Overwhelming Secondary',
                    shellWeight: 68, barrelCount: 20, caliber: 155,
                    damage: this.calculateWeaponDamage(68, 20, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 330, penetration: 172,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_boss_arbiter_hermit_ix', {
            universe: 'siren',
            name: '[SS] Arbiter: The Hermit IX',
            type: 'submarine',
            shipClass: 'AI Submarine',
            tonnage: 8000,
            speedKnots: 20,
            armorThickness: { belt: 55, deck: 35, turret: 28 },
            baseAccuracy: 93,
            stats: {
                health: this.calculateHP(8000, 'Submarine'),
                armor: this.calculateArmor(55, 35, 28),
                speed: this.calculateSpeed(20),
                evasion: this.calculateEvasion(20, 8000),
                range: 14,
                baseAccuracy: 93
            },
            weapons: {
                torpedoes: {
                    name: 'Hermit Abyss Torpedo Array',
                    shellWeight: 700, barrelCount: 12, caliber: 610,
                    damage: this.calculateWeaponDamage(700, 12, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 5, ammo: 22, penetration: 510,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                },
                primary: {
                    name: 'Hermit Heavy Deck Cannon',
                    shellWeight: 68, barrelCount: 2, caliber: 155,
                    damage: this.calculateWeaponDamage(68, 2, 'Exceptional'),
                    range: this.calculateGunRange(155),
                    reload: 2, ammo: 70, penetration: 162,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            }
        });

        this.aiTypes.set('siren_boss_arbiter_temperance_xiv', {
            universe: 'siren',
            name: '[CV] Arbiter: Temperance XIV',
            type: 'carrier',
            shipClass: 'AI Aircraft Carrier',
            tonnage: 48000,
            speedKnots: 28,
            armorThickness: { belt: 75, deck: 65, turret: 35 },
            baseAccuracy: 86,
            stats: {
                health: this.calculateHP(48000, 'Aircraft Carrier'),
                armor: this.calculateArmor(75, 65, 35),
                speed: this.calculateSpeed(28),
                evasion: this.calculateEvasion(28, 48000),
                range: 22,
                baseAccuracy: 86
            },
            hangar: 40,
            weapons: {
                secondary: {
                    name: 'Temperance Balance Battery',
                    shellWeight: 55, barrelCount: 16, caliber: 152,
                    damage: this.calculateWeaponDamage(55, 16, 'Exceptional'),
                    range: this.calculateGunRange(152),
                    reload: 2, ammo: 320, penetration: 155,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                }
            },
            aircraft: new Map([
                ['fighter_sq', {
                    name: 'Temperance Equilibrium Fighter Wing',
                    count: 13, maxCount: 13, range: 17, damage: 68,
                    hp: 36, maxHP: 36, squadronHP: 36 * 13, maxSquadronHP: 36 * 13,
                    quality: 'Exceptional', specialAbility: 'fighter',
                    fuel: 100, readiness: 100, aircraftType: 'fighter', isAI: true
                }],
                ['bomber_sq', {
                    name: 'Temperance Measured Bomber Wing',
                    count: 11, maxCount: 11, range: 14, damage: 115,
                    hp: 44, maxHP: 44, squadronHP: 44 * 11, maxSquadronHP: 44 * 11,
                    quality: 'Exceptional', specialAbility: 'bomb',
                    fuel: 100, readiness: 100, aircraftType: 'bomber', isAI: true
                }],
                ['torpedo_sq', {
                    name: 'Temperance Poised Torpedo Wing',
                    count: 9, maxCount: 9, range: 13, damage: 152,
                    hp: 40, maxHP: 40, squadronHP: 40 * 9, maxSquadronHP: 40 * 9,
                    quality: 'Exceptional', specialAbility: 'torpedo',
                    fuel: 100, readiness: 100, aircraftType: 'torpedo', isAI: true
                }]
            ])
        });

        this.aiTypes.set('siren_boss_arbiter_devil_xv', {
            universe: 'siren',
            name: '[BB] Arbiter: The Devil XV',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 75000,
            speedKnots: 21,
            armorThickness: { belt: 345, deck: 132, turret: 450 },
            baseAccuracy: 93,
            stats: {
                health: this.calculateHP(75000, 'Battleship'),
                armor: this.calculateArmor(345, 132, 450),
                speed: this.calculateSpeed(21),
                evasion: this.calculateEvasion(21, 75000),
                range: 25,
                baseAccuracy: 93
            },
            weapons: {
                primary: {
                    name: 'Devil Hellfire Main Battery',
                    shellWeight: 1900, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(1900, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 5, ammo: 90, penetration: 570,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Devil Wrath Secondary Battery',
                    shellWeight: 122, barrelCount: 20, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 20, 'Exceptional'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 350, penetration: 228,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Devil Temptation Torpedo Array',
                    shellWeight: 650, barrelCount: 8, caliber: 610,
                    damage: this.calculateWeaponDamage(650, 8, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 16, penetration: 490,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });

        this.aiTypes.set('siren_boss_arbiter_tower_xvi', {
            universe: 'siren',
            name: '[BB] Arbiter: The Tower XVI',
            type: 'battleship',
            shipClass: 'AI Battleship',
            tonnage: 90000,
            speedKnots: 20,
            armorThickness: { belt: 370, deck: 142, turret: 470 },
            baseAccuracy: 94,
            stats: {
                health: this.calculateHP(90000, 'Battleship'),
                armor: this.calculateArmor(370, 142, 470),
                speed: this.calculateSpeed(20),
                evasion: this.calculateEvasion(20, 90000),
                range: 26,
                baseAccuracy: 94
            },
            weapons: {
                primary: {
                    name: 'Tower Apocalypse Siege Cannon',
                    shellWeight: 2200, barrelCount: 9, caliber: 460,
                    damage: this.calculateWeaponDamage(2200, 9, 'Exceptional'),
                    range: this.calculateGunRange(460),
                    reload: 6, ammo: 95, penetration: 610,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                secondary: {
                    name: 'Tower Ruin Secondary Battery',
                    shellWeight: 122, barrelCount: 20, caliber: 203,
                    damage: this.calculateWeaponDamage(122, 20, 'Exceptional'),
                    range: this.calculateGunRange(203),
                    reload: 3, ammo: 380, penetration: 235,
                    quality: 'Exceptional', ammoTypes: ['ap', 'he']
                },
                torpedoes: {
                    name: 'Tower Collapse Torpedo Array',
                    shellWeight: 700, barrelCount: 10, caliber: 610,
                    damage: this.calculateWeaponDamage(700, 10, 'Exceptional'),
                    range: this.calculateGunRange(610),
                    reload: 6, ammo: 18, penetration: 520,
                    quality: 'Exceptional', ammoTypes: ['torpedo']
                }
            }
        });    

    } // end initializeSirens()

// ════════════════════════════════════════════════════════════════════════════════
// ██████████████████████████  CALCULATION HELPERS  ██████████████████████████████
// ════════════════════════════════════════════════════════════════════════════════
// These mirror aiConfig.js exactly — use the same values for stat consistency.

    calculateHP(tonnage, shipClass) {
        const shipParams = {
            'Destroyer':              { baseHP: 120, multiplier: 0.040, bonus: 0   },
            'Light Cruiser':          { baseHP: 200, multiplier: 0.025, bonus: 30  },
            'Heavy Cruiser':          { baseHP: 200, multiplier: 0.025, bonus: 70  },
            'Battleship':             { baseHP: 300, multiplier: 0.009, bonus: 0   },
            'Aircraft Carrier':       { baseHP: 250, multiplier: 0.010, bonus: 40  },
            'Light Aircraft Carrier': { baseHP: 200, multiplier: 0.012, bonus: 30  },
            'Submarine':              { baseHP: 100, multiplier: 0.050, bonus: 0   },
            'Auxiliary':              { baseHP: 120, multiplier: 0.015, bonus: 20  }
        };
        const params = shipParams[shipClass];
        if (!params) return 100;
        const scale = ['Destroyer', 'Submarine'].includes(shipClass) ? 1.5 : 2.0;
        return Math.min(2000, Math.max(Math.round((params.baseHP + (tonnage * params.multiplier) + params.bonus) * scale), 20));
    }

    calculateArmor(beltMM, deckMM, turretMM) {
        return Math.max(5, Math.min(Math.round((beltMM * 0.50) + (deckMM * 0.30) + (turretMM * 0.20)), 500));
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
        const pool = this.getAIsByFaction(faction).filter(ai => !ai.isBoss);
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
        const pool = this.getAIsByFaction(faction).filter(ai => !ai.isBoss && this._matchesType(ai, shipType));
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /** Get all AI entries for a faction (or mixed). */
    getAIsByFaction(faction) {
        const all = Array.from(this.aiTypes.values());
        if (faction === 'mixed') return all;
        return all.filter(ai => ai.universe === faction);
    }

    /**
     * Get a random boss AI template.
     * Bosses are entries whose map key contains '_boss_'.
     * @param {'abyssal'|'siren'|'mixed'} faction
     * @returns {object|null}
     */
    getRandomBoss(faction = 'siren') {
        const pool = this.getAIsByFaction(faction === 'abyssal' ? 'abyssal' : 'siren').filter(ai => ai.isBoss);
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
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
