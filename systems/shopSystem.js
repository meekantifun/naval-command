// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               SHOP SYSTEM MODULE                             ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs').promises;

class ShopSystem {
	constructor(bot) {
	this.bot = bot;
	this.shopItems = new Map();
	this.categories = new Map();
	this.initializeShop();
	}
	initializeShop() {
	    // Equipment Category
	    this.addCategory('equipment', 'Equipment', '⚙️', 'Ship equipment and modifications');
	    
	    // Weapons Category
	    this.addCategory('weapons', 'Weapons', '🔫', 'Weapon systems and ammunition');
	    
	    // Aircraft Category
	    this.addCategory('aircraft', 'Aircraft', '✈️', 'Aircraft and aviation equipment');
	    
	    // Consumables Category
	    this.addCategory('consumables', 'Consumables', '📦', 'Single-use items and supplies');

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               EQUIPMENT MODULES                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
	    
	    this.addItem('advanced_radar', {
	        name: 'Advanced Radar System',
	        category: 'equipment',
	        price: 500,
	        description: 'Increases accuracy by 10% and detection range by 2 cells',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { accuracy: 10, range: 2 },
	        requirements: { level: 3 },
	        stackable: false,
	        emoji: '📡'
	    });

	    this.addItem('reinforced_armor', {
	        name: 'Reinforced Armor Plating',
	        category: 'equipment',
	        price: 800,
	        description: 'Increases armor by 20 points, reducing incoming damage',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { armor: 20 },
	        requirements: { level: 5 },
	        stackable: false,
	        emoji: '🛡️'
	    });

	    this.addItem('improved_engines', {
	        name: 'Improved Engine System',
	        category: 'equipment',
	        price: 1200,
	        description: 'Increases speed by 1 and evasion by 5%',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { speed: 1, evasion: 5 },
	        requirements: { level: 8, shipClass: ['Destroyer', 'Light Cruiser'] },
	        stackable: false,
	        emoji: '⚡'
	    });

	    this.addItem('fire_control_system', {
	        name: 'Advanced Fire Control',
	        category: 'equipment',
	        price: 2000,
	        description: 'Reduces weapon reload time and increases accuracy by 15%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { accuracy: 15, reload_speed: 20 },
	        requirements: { level: 12 },
	        stackable: false,
	        emoji: '🎯'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 WEAPON ITEMS                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('sh_ap_shells', {
	        name: 'Super Heavy Armor Piercing Shells',
	        category: 'weapons',
	        price: 100,
	        description: 'High-penetration ammunition for main guns (x20 rounds)',
	        type: 'ammunition',
	        rarity: 'common',
	        stats: { penetration: 25 },
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '💥'
	    });

	    this.addItem('he_shells', {
	        name: 'High Explosive Shells',
	        category: 'weapons',
	        price: 80,
	        description: 'High-damage ammunition with fire chance (x20 rounds)',
	        type: 'ammunition',
	        rarity: 'common',
	        stats: { damage: 15, fire_chance: 30 },
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '🔥'
	    });

	    this.addItem('torpedo_upgrade', {
	        name: 'Mark VIII Torpedoes',
	        category: 'weapons',
	        price: 1500,
	        description: 'Upgraded torpedoes with increased damage and flooding chance',
	        type: 'weapon_upgrade',
	        rarity: 'uncommon',
	        stats: { torpedo_damage: 40, flooding_chance: 25 },
	        requirements: { level: 6, hasTorpedoes: true },
	        stackable: false,
	        emoji: '🚀'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                AIRCRAFT ITEMS                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('fighter_squadron', {
	        name: 'F4F Wildcat Squadron',
	        category: 'aircraft',
	        price: 2500,
	        description: 'Additional fighter squadron for aircraft carriers',
	        type: 'aircraft',
	        rarity: 'rare',
	        aircraftType: 'fighter',
	        squadronData: {
	            name: 'F4F Wildcat',
	            damage: 45,
	            range: 15,
	            quality: 'Standard',
	            specialAbility: 'Air Superiority'
	        },
	        requirements: { level: 10, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 3,
	        emoji: '✈️'
	    });

	    this.addItem('dive_bomber_squadron', {
	        name: 'SBD Dauntless Squadron',
	        category: 'aircraft',
	        price: 3000,
	        description: 'Dive bomber squadron effective against ships',
	        type: 'aircraft',
	        rarity: 'rare',
	        aircraftType: 'dive_bomber',
	        squadronData: {
	            name: 'SBD Dauntless',
	            damage: 80,
	            range: 12,
	            quality: 'Standard',
	            specialAbility: 'Precision Strike'
	        },
	        requirements: { level: 12, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 2,
	        emoji: '💣'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              CONSUMABLE ITEMS                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('repair_kit', {
	        name: 'Emergency Repair Kit',
	        category: 'consumables',
	        price: 200,
	        description: 'Instantly repairs 50 HP and removes all status effects',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'heal',
	        healAmount: 50,
	        removeEffects: true,
	        requirements: {},
	        stackable: true,
	        maxStack: 10,
	        emoji: '🔧'
	    });

	    this.addItem('fuel_barrels', {
	        name: 'Extra Fuel Barrels',
	        category: 'consumables',
	        price: 150,
	        description: 'Extends aircraft fuel by 5 turns',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'fuel',
	        fuelBonus: 5,
	        requirements: { shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 5,
	        emoji: '⛽'
	    });

	    this.addItem('smoke_screen', {
	        name: 'Smoke Screen Generator',
	        category: 'consumables',
	        price: 300,
	        description: 'Creates smoke screen, increasing evasion by 50% for 3 turns',
	        type: 'consumable',
	        rarity: 'uncommon',
	        effect: 'smoke',
	        evasionBonus: 50,
	        duration: 3,
	        requirements: { level: 5 },
	        stackable: true,
	        maxStack: 3,
	        emoji: '💨'
	    });

	    this.addItem('lucky_charm', {
	        name: 'Admiral\'s Lucky Charm',
	        category: 'consumables',
	        price: 1000,
	        description: 'Increases critical hit chance by 25% for the entire battle',
	        type: 'consumable',
	        rarity: 'legendary',
	        effect: 'luck',
	        critBonus: 25,
	        duration: 'battle',
	        requirements: { level: 15 },
	        stackable: true,
	        maxStack: 1,
	        emoji: '🍀'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         FLAGSHIP CATEGORY                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addCategory('flagship', 'Flagship', '🚩', 'Fleet-wide buffs active while you are the flagship');

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     ADDITIONAL EQUIPMENT — ALL CLASSES                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('navigation_computer', {
	        name: 'Navigation Computer',
	        category: 'equipment',
	        price: 650,
	        description: 'Advanced plotting systems increase movement range by 1 cell each turn',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { movement: 1 },
	        requirements: {},
	        stackable: false,
	        emoji: '🧭'
	    });

	    this.addItem('rangefinder', {
	        name: 'Optical Rangefinder',
	        category: 'equipment',
	        price: 450,
	        description: 'Precision optics increase accuracy by 8% and attack range by 1',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { accuracy: 8, range: 1 },
	        requirements: { level: 2 },
	        stackable: false,
	        emoji: '🔭'
	    });

	    this.addItem('damage_control_team', {
	        name: 'Damage Control Team',
	        category: 'equipment',
	        price: 900,
	        description: 'Trained crew reduces fire and flood damage by 30% and halves status effect duration',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { fire_resist: 30, flood_resist: 30 },
	        requirements: { level: 4 },
	        stackable: false,
	        emoji: '🧯'
	    });

	    this.addItem('sonar_array', {
	        name: 'Surface Search Sonar',
	        category: 'equipment',
	        price: 750,
	        description: 'Passive sonar detects submarines within 4 cells and reveals their position',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { sonar_range: 4 },
	        requirements: { level: 5 },
	        stackable: false,
	        emoji: '📻'
	    });

	    this.addItem('medical_bay', {
	        name: 'Onboard Medical Bay',
	        category: 'equipment',
	        price: 1100,
	        description: 'Dedicated medical facilities passively restore 8 HP at the start of each turn',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { hp_regen: 8 },
	        requirements: { level: 6 },
	        stackable: false,
	        emoji: '⚕️'
	    });

	    this.addItem('camouflage_paint', {
	        name: 'Dazzle Camouflage Scheme',
	        category: 'equipment',
	        price: 400,
	        description: 'Disruptive paint pattern increases evasion by 8% against long-range attacks',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { evasion: 8 },
	        requirements: {},
	        stackable: false,
	        emoji: '🎨'
	    });

	    this.addItem('crew_training', {
	        name: 'Elite Crew Training',
	        category: 'equipment',
	        price: 1800,
	        description: 'Veteran crew improves all combat stats: +5% accuracy, +5% evasion, +3 armor',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { accuracy: 5, evasion: 5, armor: 3 },
	        requirements: { level: 10 },
	        stackable: false,
	        emoji: '👥'
	    });

// ── Destroyer-Specific Equipment ─────────────────────────────────────────────

	    this.addItem('high_speed_turbines', {
	        name: 'High-Speed Steam Turbines',
	        category: 'equipment',
	        price: 1400,
	        description: 'Upgraded propulsion increases speed by 2 knots, making you the fastest ship on the sea',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { speed: 2 },
	        requirements: { level: 7, shipClass: ['Destroyer'] },
	        stackable: false,
	        emoji: '💨'
	    });

	    this.addItem('torpedo_director', {
	        name: 'Torpedo Fire Director',
	        category: 'equipment',
	        price: 1600,
	        description: 'Precision targeting system improves torpedo accuracy by 20% and increases flooding chance by 15%',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { torpedo_accuracy: 20, flooding_chance: 15 },
	        requirements: { level: 6, shipClass: ['Destroyer'] },
	        stackable: false,
	        emoji: '🎯'
	    });

	    this.addItem('depth_charge_racks', {
	        name: 'Depth Charge Racks',
	        category: 'equipment',
	        price: 1200,
	        description: 'Anti-submarine weapon racks deal 60 damage to submerged submarines in adjacent cells',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { depth_charge_dmg: 60 },
	        requirements: { level: 5, shipClass: ['Destroyer'] },
	        stackable: false,
	        emoji: '💣'
	    });

	    this.addItem('enhanced_smoke_gen', {
	        name: 'Enhanced Smoke Generator',
	        category: 'equipment',
	        price: 850,
	        description: 'Improved smoke system creates a larger cloud, granting +65% evasion for 4 turns',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { smoke_evasion: 65, smoke_duration: 4 },
	        requirements: { level: 4, shipClass: ['Destroyer'] },
	        stackable: false,
	        emoji: '🌫️'
	    });

// ── Light Cruiser-Specific Equipment ─────────────────────────────────────────

	    this.addItem('aa_director', {
	        name: 'AA Fire Director Mk. III',
	        category: 'equipment',
	        price: 1300,
	        description: 'Centralized anti-aircraft fire control increases AA damage by 30% and effective AA range by 2',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { aa_damage: 30, aa_range: 2 },
	        requirements: { level: 7, shipClass: ['Light Cruiser'] },
	        stackable: false,
	        emoji: '🛡️'
	    });

	    this.addItem('high_pressure_boiler', {
	        name: 'High-Pressure Boiler System',
	        category: 'equipment',
	        price: 1500,
	        description: 'Upgraded boilers increase speed by 1 and movement range by 1 per turn',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { speed: 1, movement: 1 },
	        requirements: { level: 8, shipClass: ['Light Cruiser'] },
	        stackable: false,
	        emoji: '⚙️'
	    });

	    this.addItem('scout_floatplane', {
	        name: 'OS2U Kingfisher Floatplane',
	        category: 'equipment',
	        price: 1700,
	        description: 'Catapult-launched scout plane extends detection range by 5 cells and improves accuracy at range by 12%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { detection_range: 5, long_range_accuracy: 12 },
	        requirements: { level: 9, shipClass: ['Light Cruiser', 'Heavy Cruiser'] },
	        stackable: false,
	        emoji: '🛩️'
	    });

// ── Heavy Cruiser-Specific Equipment ─────────────────────────────────────────

	    this.addItem('heavy_armor_belt', {
	        name: 'Heavy Side Armor Belt',
	        category: 'equipment',
	        price: 2200,
	        description: 'Thick waterline armor plating adds 40 armor, significantly reducing penetrating hits',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { armor: 40 },
	        requirements: { level: 10, shipClass: ['Heavy Cruiser'] },
	        stackable: false,
	        emoji: '🪨'
	    });

	    this.addItem('dual_purpose_mount', {
	        name: 'Dual-Purpose Gun Mount',
	        category: 'equipment',
	        price: 2500,
	        description: 'Modified gun mounts allow secondary guns to engage both surface targets and aircraft',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { aa_damage: 20, secondary_damage: 10 },
	        requirements: { level: 11, shipClass: ['Heavy Cruiser'] },
	        stackable: false,
	        emoji: '🔫'
	    });

	    this.addItem('type94_fire_director', {
	        name: 'Type 94 Fire Director',
	        category: 'equipment',
	        price: 2800,
	        description: 'Precision fire-control computer increases accuracy by 20% and reduces shell spread at long range',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { accuracy: 20, reload_speed: 10 },
	        requirements: { level: 12, shipClass: ['Heavy Cruiser'] },
	        stackable: false,
	        emoji: '💻'
	    });

// ── Battleship-Specific Equipment ─────────────────────────────────────────────

	    this.addItem('turtleback_armor', {
	        name: 'Turtleback Armor Scheme',
	        category: 'equipment',
	        price: 3500,
	        description: 'Sloped internal armor belt dramatically reduces below-waterline penetration. Armor +60',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { armor: 60 },
	        requirements: { level: 14, shipClass: ['Battleship'] },
	        stackable: false,
	        emoji: '🛡️'
	    });

	    this.addItem('secondary_battery_director', {
	        name: 'Secondary Battery Director',
	        category: 'equipment',
	        price: 2000,
	        description: 'Dedicated fire control for secondary guns increases their damage by 35% and range by 2',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { secondary_damage: 35, secondary_range: 2 },
	        requirements: { level: 11, shipClass: ['Battleship'] },
	        stackable: false,
	        emoji: '🎯'
	    });

	    this.addItem('ford_rangekeeping', {
	        name: 'Ford Rangekeeping Computer',
	        category: 'equipment',
	        price: 3000,
	        description: 'Mechanical ballistic computer provides +25% accuracy at ranges beyond 5 cells',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { long_range_accuracy: 25 },
	        requirements: { level: 13, shipClass: ['Battleship'] },
	        stackable: false,
	        emoji: '📐'
	    });

	    this.addItem('conning_tower_armor', {
	        name: 'Conning Tower Reinforcement',
	        category: 'equipment',
	        price: 2600,
	        description: 'Armored conning tower reduces chance of crew casualty critical hits by 40%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { crit_reduction: 40 },
	        requirements: { level: 12, shipClass: ['Battleship'] },
	        stackable: false,
	        emoji: '🏰'
	    });

// ── Aircraft Carrier-Specific Equipment ───────────────────────────────────────

	    this.addItem('armored_flight_deck', {
	        name: 'Armored Flight Deck',
	        category: 'equipment',
	        price: 3200,
	        description: 'Steel-plated flight deck reduces bomb and strafing damage to the carrier by 35%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { air_damage_resist: 35 },
	        requirements: { level: 12, shipClass: ['Aircraft Carrier'] },
	        stackable: false,
	        emoji: '🛬'
	    });

	    this.addItem('expanded_hangar', {
	        name: 'Expanded Hangar Deck',
	        category: 'equipment',
	        price: 2800,
	        description: 'Additional hangar space allows carrying 2 extra aircraft squadrons',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { hangar_capacity: 2 },
	        requirements: { level: 11, shipClass: ['Aircraft Carrier'] },
	        stackable: false,
	        emoji: '🏗️'
	    });

	    this.addItem('advanced_cic', {
	        name: 'Advanced Combat Information Center',
	        category: 'equipment',
	        price: 3800,
	        description: 'Centralized command hub improves aircraft attack damage by 15% and reduces rearm time by 1 turn',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { aircraft_damage: 15, rearm_speed: 1 },
	        requirements: { level: 14, shipClass: ['Aircraft Carrier'] },
	        stackable: false,
	        emoji: '🖥️'
	    });

	    this.addItem('catapult_upgrade', {
	        name: 'H-4 Catapult Upgrade',
	        category: 'equipment',
	        price: 1800,
	        description: 'High-powered catapult launches aircraft faster, reducing launch delay by 1 turn',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { launch_speed: 1 },
	        requirements: { level: 9, shipClass: ['Aircraft Carrier'] },
	        stackable: false,
	        emoji: '🚀'
	    });

// ── Submarine-Specific Equipment ──────────────────────────────────────────────

	    this.addItem('improved_periscope', {
	        name: 'High-Power Attack Periscope',
	        category: 'equipment',
	        price: 1100,
	        description: 'Extended-range periscope allows observation and targeting while submerged from 6 cells',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { submerged_range: 6 },
	        requirements: { level: 5, shipClass: ['Submarine'] },
	        stackable: false,
	        emoji: '🔭'
	    });

	    this.addItem('silent_running', {
	        name: 'Silent Running System',
	        category: 'equipment',
	        price: 2000,
	        description: 'Vibration-dampened hull and quieted machinery reduce sonar detection chance by 40%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { stealth: 40 },
	        requirements: { level: 8, shipClass: ['Submarine'] },
	        stackable: false,
	        emoji: '🤫'
	    });

	    this.addItem('oxygen_recycler', {
	        name: 'Oxygen Recycling System',
	        category: 'equipment',
	        price: 1300,
	        description: 'Advanced air recyclers extend maximum dive time by 4 additional turns before being forced to surface',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { dive_time: 4 },
	        requirements: { level: 6, shipClass: ['Submarine'] },
	        stackable: false,
	        emoji: '💨'
	    });

	    this.addItem('magnetic_detonator', {
	        name: 'Magnetic Torpedo Detonator',
	        category: 'equipment',
	        price: 2400,
	        description: 'Proximity detonators trigger beneath the keel for maximum hull damage. Torpedo damage +25%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { torpedo_damage: 25 },
	        requirements: { level: 9, shipClass: ['Submarine'] },
	        stackable: false,
	        emoji: '🧲'
	    });

	    this.addItem('escape_hatch', {
	        name: 'Emergency Escape System',
	        category: 'equipment',
	        price: 1600,
	        description: 'Reinforced escape hatches allow the crew to survive one fatal hit, leaving the sub at 1 HP',
	        type: 'equipment',
	        rarity: 'rare',
	        effect: 'survive_once',
	        requirements: { level: 7, shipClass: ['Submarine'] },
	        stackable: false,
	        emoji: '🆘'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ADDITIONAL WEAPON ITEMS                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('ap_shells_mk2', {
	        name: 'Mk. 2 Common Piercing Shells',
	        category: 'weapons',
	        price: 90,
	        description: 'Standard armor-piercing rounds effective against medium armor (x20 rounds)',
	        type: 'ammunition',
	        rarity: 'common',
	        stats: { penetration: 15, damage: 10 },
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '🔩'
	    });

	    this.addItem('incendiary_he', {
	        name: 'Incendiary HE Shells',
	        category: 'weapons',
	        price: 120,
	        description: 'Thermite-filled shells with 45% fire chance on hit (x20 rounds)',
	        type: 'ammunition',
	        rarity: 'uncommon',
	        stats: { fire_chance: 45, damage: 8 },
	        requirements: { level: 4 },
	        stackable: true,
	        maxStack: 5,
	        emoji: '🔥'
	    });

	    this.addItem('long_lance_torpedo', {
	        name: 'Type 93 "Long Lance" Torpedo',
	        category: 'weapons',
	        price: 2200,
	        description: 'Oxygen-fueled torpedo with extreme range and 50% higher damage than standard torpedoes',
	        type: 'weapon_upgrade',
	        rarity: 'rare',
	        stats: { torpedo_damage: 50, torpedo_range: 4 },
	        requirements: { level: 8, shipClass: ['Destroyer', 'Light Cruiser'] },
	        stackable: false,
	        emoji: '🚀'
	    });

	    this.addItem('sub_torpedo_mk14', {
	        name: 'Mark 14 Submarine Torpedo',
	        category: 'weapons',
	        price: 1800,
	        description: 'Reliable steam-powered torpedo designed for submarine launch. Damage +35%, increased reload speed',
	        type: 'weapon_upgrade',
	        rarity: 'uncommon',
	        stats: { torpedo_damage: 35, reload_speed: 15 },
	        requirements: { level: 6, shipClass: ['Submarine'] },
	        stackable: false,
	        emoji: '💣'
	    });

	    this.addItem('16in_ap_shells', {
	        name: '16" Super-Heavy AP Shells',
	        category: 'weapons',
	        price: 500,
	        description: 'Massive armor-piercing shells for battleship main guns. Penetration +40, damage +25 (x10 rounds)',
	        type: 'ammunition',
	        rarity: 'rare',
	        stats: { penetration: 40, damage: 25 },
	        requirements: { level: 12, shipClass: ['Battleship'] },
	        stackable: true,
	        maxStack: 5,
	        emoji: '💥'
	    });

	    this.addItem('aa_rockets', {
	        name: '40mm Bofors AA Rocket Battery',
	        category: 'weapons',
	        price: 1400,
	        description: 'Rapid-fire anti-aircraft rockets deal 40 damage to aircraft squadrons within 3 cells',
	        type: 'weapon_upgrade',
	        rarity: 'uncommon',
	        stats: { aa_damage: 40, aa_range: 3 },
	        requirements: { level: 7, shipClass: ['Destroyer', 'Light Cruiser', 'Heavy Cruiser'] },
	        stackable: false,
	        emoji: '🎇'
	    });

	    this.addItem('shore_bombardment_shells', {
	        name: 'Shore Bombardment Shells',
	        category: 'weapons',
	        price: 350,
	        description: 'High-arc shells for engaging infrastructure and fortified positions. +30 damage vs structures (x15 rounds)',
	        type: 'ammunition',
	        rarity: 'uncommon',
	        stats: { structure_damage: 30 },
	        requirements: { level: 6, shipClass: ['Battleship', 'Heavy Cruiser'] },
	        stackable: true,
	        maxStack: 3,
	        emoji: '🏚️'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          ADDITIONAL AIRCRAFT ITEMS                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('torpedo_bomber_sqdn', {
	        name: 'TBF Avenger Squadron',
	        category: 'aircraft',
	        price: 3500,
	        description: 'Torpedo bomber squadron devastating against capital ships. High flooding chance on hit',
	        type: 'aircraft',
	        rarity: 'rare',
	        aircraftType: 'torpedo_bomber',
	        squadronData: {
	            name: 'TBF Avenger',
	            damage: 110,
	            range: 14,
	            quality: 'Standard',
	            specialAbility: 'Torpedo Strike',
	            floodingChance: 35
	        },
	        requirements: { level: 14, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 2,
	        emoji: '🛩️'
	    });

	    this.addItem('night_fighter_sqdn', {
	        name: 'F6F Hellcat Night Fighter Squadron',
	        category: 'aircraft',
	        price: 4200,
	        description: 'Radar-equipped fighters that can operate at night without penalty and intercept enemy bombers',
	        type: 'aircraft',
	        rarity: 'legendary',
	        aircraftType: 'night_fighter',
	        squadronData: {
	            name: 'F6F Hellcat',
	            damage: 65,
	            range: 16,
	            quality: 'Elite',
	            specialAbility: 'Night Operations'
	        },
	        requirements: { level: 16, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 2,
	        emoji: '🌙'
	    });

	    this.addItem('recon_squadron', {
	        name: 'PBY Catalina Reconnaissance Squadron',
	        category: 'aircraft',
	        price: 2000,
	        description: 'Long-range patrol aircraft reveal all enemy positions within 20 cells for 3 turns',
	        type: 'aircraft',
	        rarity: 'uncommon',
	        aircraftType: 'reconnaissance',
	        squadronData: {
	            name: 'PBY Catalina',
	            damage: 20,
	            range: 20,
	            quality: 'Standard',
	            specialAbility: 'Wide Area Recon'
	        },
	        requirements: { level: 10, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 2,
	        emoji: '👁️'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       ADDITIONAL CONSUMABLE ITEMS                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('emergency_speed_boost', {
	        name: 'Emergency Speed Boost',
	        category: 'consumables',
	        price: 250,
	        description: 'Pushes engines to maximum output. +3 speed for 2 turns at the cost of 10 HP',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'speed_boost',
	        speedBonus: 3,
	        duration: 2,
	        requirements: {},
	        stackable: true,
	        maxStack: 3,
	        emoji: '⚡'
	    });

	    this.addItem('radar_jamming', {
	        name: 'Radar Jamming Burst',
	        category: 'consumables',
	        price: 400,
	        description: 'Powerful ECM burst reduces all enemies\' accuracy by 20% for 3 turns',
	        type: 'consumable',
	        rarity: 'uncommon',
	        effect: 'jam_radar',
	        accuracyDebuff: 20,
	        duration: 3,
	        requirements: { level: 8 },
	        stackable: true,
	        maxStack: 2,
	        emoji: '📡'
	    });

	    this.addItem('decoy_buoy', {
	        name: 'Acoustic Decoy Buoy',
	        category: 'consumables',
	        price: 180,
	        description: 'Creates a false sonar contact, redirecting enemy torpedo attacks for 2 turns (Submarine)',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'decoy',
	        duration: 2,
	        requirements: { shipClass: ['Submarine'] },
	        stackable: true,
	        maxStack: 5,
	        emoji: '🎣'
	    });

	    this.addItem('fire_suppression', {
	        name: 'CO₂ Fire Suppression System',
	        category: 'consumables',
	        price: 160,
	        description: 'Instantly extinguishes all fires aboard the ship',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'extinguish',
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '🧪'
	    });

	    this.addItem('emergency_patch', {
	        name: 'Emergency Hull Patch',
	        category: 'consumables',
	        price: 140,
	        description: 'Quick-setting sealant immediately stops flooding and prevents further water ingress',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'stop_flood',
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '🔩'
	    });

	    this.addItem('combat_stimulants', {
	        name: 'Combat Stimulants',
	        category: 'consumables',
	        price: 600,
	        description: 'Crew performance drugs grant 1 extra action point this turn only',
	        type: 'consumable',
	        rarity: 'uncommon',
	        effect: 'extra_action',
	        requirements: { level: 5 },
	        stackable: true,
	        maxStack: 2,
	        emoji: '💉'
	    });

	    this.addItem('repair_ship_contract', {
	        name: 'Repair Ship Contract',
	        category: 'consumables',
	        price: 800,
	        description: 'Calls in a tender to restore 120 HP over 3 turns. Cannot be interrupted by attacks',
	        type: 'consumable',
	        rarity: 'uncommon',
	        effect: 'repair_over_time',
	        healAmount: 120,
	        duration: 3,
	        requirements: { level: 8 },
	        stackable: true,
	        maxStack: 2,
	        emoji: '🚢'
	    });

	    this.addItem('air_support_marker', {
	        name: 'Air Support Marker',
	        category: 'consumables',
	        price: 1200,
	        description: 'Calls in a flight of B-17 Flying Fortresses. After a random delay (1-5 turns), the bombers arrive and drop 2 x 4,000 lb HE bombs on a target of your choice. Enemy AA can intercept the formation.',
	        type: 'consumable',
	        rarity: 'rare',
	        effect: 'air_support',
	        stackable: true,
	        maxStack: 2,
	        emoji: '✈️',
	        requirements: {}
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            FLAGSHIP ITEMS                                    ║
// ║  Active only when the purchasing ship is designated as the fleet flagship.   ║
// ║  Buff applies to ALL allied ships within the battle.                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('admirals_bridge', {
	        name: "Admiral's Bridge Suite",
	        category: 'flagship',
	        price: 3000,
	        description: 'Upgraded flag bridge with superior optics and communications. Fleet-wide +8% accuracy while flagship is alive',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { accuracy: 8 },
	        requirements: { level: 10 },
	        stackable: false,
	        emoji: '🔭'
	    });

	    this.addItem('battle_ensign', {
	        name: 'Grand Battle Ensign',
	        category: 'flagship',
	        price: 2500,
	        description: 'A legendary war banner flown from the masthead. Inspires the fleet for +10% damage output fleet-wide',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { damage: 10 },
	        requirements: { level: 8 },
	        stackable: false,
	        emoji: '🚩'
	    });

	    this.addItem('veteran_crew_roster', {
	        name: 'Veteran Crew Roster',
	        category: 'flagship',
	        price: 3500,
	        description: 'A complement of battle-hardened veterans. All allied ships gain +25 maximum HP',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { max_hp: 25 },
	        requirements: { level: 12 },
	        stackable: false,
	        emoji: '👥'
	    });

	    this.addItem('signal_corps_relay', {
	        name: 'Signal Corps Relay Network',
	        category: 'flagship',
	        price: 4000,
	        description: 'Fleet-wide communication system grants all allied ships +1 action point at the start of each turn',
	        type: 'flagship',
	        rarity: 'legendary',
	        flagship: true,
	        flagshipEffect: { action_points: 1 },
	        requirements: { level: 15 },
	        stackable: false,
	        emoji: '📡'
	    });

	    this.addItem('fleet_medical_corps', {
	        name: 'Fleet Medical Corps',
	        category: 'flagship',
	        price: 3800,
	        description: 'Coordinated medical teams across the fleet. All allied ships passively regenerate 10 HP per turn',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { hp_regen: 10 },
	        requirements: { level: 13 },
	        stackable: false,
	        emoji: '⚕️'
	    });

	    this.addItem('fleet_coordination_net', {
	        name: 'Fleet Coordination Network',
	        category: 'flagship',
	        price: 3200,
	        description: 'Synchronized maneuver doctrine grants all allied ships +1 movement range per turn',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { movement: 1 },
	        requirements: { level: 11 },
	        stackable: false,
	        emoji: '🗺️'
	    });

	    this.addItem('ebc_system', {
	        name: 'Emergency Broadcast System',
	        category: 'flagship',
	        price: 2800,
	        description: 'Real-time threat warnings let allied ships brace for impact. Critical hit damage taken by all allies reduced by 25%',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { crit_reduction: 25 },
	        requirements: { level: 10 },
	        stackable: false,
	        emoji: '📢'
	    });

	    this.addItem('resupply_network', {
	        name: 'Fleet Resupply Network',
	        category: 'flagship',
	        price: 2200,
	        description: 'Continuous at-sea resupply reduces ammunition costs. Allied ships\' consumables last 1 extra use',
	        type: 'flagship',
	        rarity: 'uncommon',
	        flagship: true,
	        flagshipEffect: { consumable_bonus: 1 },
	        requirements: { level: 9 },
	        stackable: false,
	        emoji: '⚓'
	    });

	    this.addItem('armor_piercing_doctrine', {
	        name: 'AP Fire Doctrine',
	        category: 'flagship',
	        price: 3000,
	        description: 'Coordinated gunnery drills train all allied ships for deep penetration shots. +15% armor penetration fleet-wide',
	        type: 'flagship',
	        rarity: 'rare',
	        flagship: true,
	        flagshipEffect: { penetration: 15 },
	        requirements: { level: 12 },
	        stackable: false,
	        emoji: '🎯'
	    });

	    this.addItem('combined_fleet_doctrine', {
	        name: 'Combined Fleet Doctrine',
	        category: 'flagship',
	        price: 10000,
	        description: 'The pinnacle of naval doctrine. Fleet-wide +5% accuracy, +5% damage, +10 armor, and +5 HP regen per turn',
	        type: 'flagship',
	        rarity: 'legendary',
	        flagship: true,
	        flagshipEffect: { accuracy: 5, damage: 5, armor: 10, hp_regen: 5 },
	        requirements: { level: 20 },
	        stackable: false,
	        emoji: '👑'
	    });
	}

	getGuildDataDir(guildId) {
	    const folderName = this.bot.getGuildFolderName(guildId);
	    return `./servers/${folderName}`;
	}

	async loadCustomItems(guildId) {
	    const filePath = `${this.getGuildDataDir(guildId)}/customShopItems.json`;
	    try {
	        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
	        for (const item of data) {
	            this.shopItems.set(item.id, item);
	        }
	        console.log(`🛒 Loaded ${data.length} custom items for guild ${guildId}`);
	    } catch { /* no file = no custom items */ }
	}

	async saveCustomItems(guildId) {
	    const items = Array.from(this.shopItems.values()).filter(i => i.isCustom && i.guildId === guildId);
	    const dir = this.getGuildDataDir(guildId);
	    await fs.mkdir(dir, { recursive: true });
	    await fs.writeFile(`${dir}/customShopItems.json`, JSON.stringify(items, null, 2));
	}

	removeCustomItem(itemId) {
	    this.shopItems.delete(itemId);
	}

	addCategory(id, name, emoji, description) {
	    this.categories.set(id, {
	        id,
	        name,
	        emoji,
	        description
	    });
	}

	addItem(id, itemData) {
	    this.shopItems.set(id, {
	        id,
	        ...itemData
	    });
	}

	getItem(id) {
	    return this.shopItems.get(id);
	}

	getItemsByCategory(categoryId) {
	    return Array.from(this.shopItems.values()).filter(item => item.category === categoryId);
	}

	getAllCategories() {
	    return Array.from(this.categories.values());
	}

	async showShop(interaction, categoryId = null) {
	    if (categoryId) {
	        return await this.showCategoryItems(interaction, categoryId);
	    }

	    // Show category selection
	    const categories = this.getAllCategories();
	    const categoryButtons = categories.map(category => 
	        new ButtonBuilder()
	            .setCustomId(`shop_category_${category.id}_${interaction.user.id}`)
	            .setLabel(`${category.emoji} ${category.name}`)
	            .setStyle(ButtonStyle.Primary)
	    );

	    // Add currency display and close button
	    categoryButtons.push(
	        new ButtonBuilder()
	            .setCustomId(`shop_close_${interaction.user.id}`)
	            .setLabel('Close Shop')
	            .setStyle(ButtonStyle.Secondary)
	    );

	    const actionRows = [];
	    for (let i = 0; i < categoryButtons.length; i += 5) {
	        actionRows.push(new ActionRowBuilder().addComponents(categoryButtons.slice(i, i + 5)));
	    }

	    const playerData = this.bot.playerData.get(interaction.user.id);
	    const currency = playerData?.currency || 0;

	    const shopEmbed = new EmbedBuilder()
	        .setTitle('🛒 Naval Equipment Shop')
	        .setDescription('Welcome to the Naval Equipment Shop! Select a category to browse items.\n\n' +
	                       `💰 **Your Currency:** ${currency} credits\n\n` +
	                       '**Categories:**\n' +
	                       categories.map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`).join('\n'))
	        .setColor(0x00FF00)
	        .setFooter({ text: 'Purchase items to enhance your ship\'s capabilities!' });

	    await interaction.reply({ embeds: [shopEmbed], components: actionRows, flags: MessageFlags.Ephemeral });
	}

	async showCategoryItems(interaction, categoryId) {
	    const category = this.categories.get(categoryId);
	    if (!category) {
	        return interaction.update({ content: '❌ Category not found!', embeds: [], components: [] });
	    }

	    const items = this.getItemsByCategory(categoryId);
	    const playerData = this.bot.playerData.get(interaction.user.id);
	    const currency = playerData?.currency || 0;

	    if (items.length === 0) {
	        return interaction.update({ 
	            content: `${category.emoji} **${category.name}** category is currently empty.`,
	            embeds: [], 
	            components: [this.createBackButton(interaction.user.id)]
	        });
	    }

	    // Create item buttons (max 20 items per page)
	    const itemButtons = items.slice(0, 20).map(item => {
	        const affordable = currency >= item.price;
	        const meetsRequirements = this.checkRequirements(item, playerData);
	        
	        return new ButtonBuilder()
	            .setCustomId(`shop_buy_${item.id}_${interaction.user.id}`)
	            .setLabel(`${item.emoji} ${item.name} (${item.price}¢)`)
	            .setStyle(affordable && meetsRequirements ? ButtonStyle.Success : ButtonStyle.Secondary)
	            .setDisabled(!affordable || !meetsRequirements);
	    });

	    // Add navigation buttons
	    itemButtons.push(
	        new ButtonBuilder()
	            .setCustomId(`shop_back_${interaction.user.id}`)
	            .setLabel('← Back to Categories')
	            .setStyle(ButtonStyle.Primary)
	    );

	    const actionRows = [];
	    for (let i = 0; i < itemButtons.length; i += 5) {
	        actionRows.push(new ActionRowBuilder().addComponents(itemButtons.slice(i, i + 5)));
	    }

	    const itemDescriptions = items.slice(0, 10).map(item => {
	        const affordable = currency >= item.price;
	        const meetsRequirements = this.checkRequirements(item, playerData);
	        const statusIcon = affordable && meetsRequirements ? '✅' : '❌';
	        
	        let description = `${statusIcon} **${item.name}** - ${item.price} credits\n${item.description}`;
	        
	        if (item.requirements && Object.keys(item.requirements).length > 0) {
	            description += `\n*Requirements: ${this.formatRequirements(item.requirements)}*`;
	        }
	        
	        return description;
	    }).join('\n\n');

	    const categoryEmbed = new EmbedBuilder()
	        .setTitle(`${category.emoji} ${category.name}`)
	        .setDescription(`${category.description}\n\n` +
	                       `💰 **Your Currency:** ${currency} credits\n\n` +
	                       `**Available Items:**\n${itemDescriptions}`)
	        .setColor(0x0099FF)
	        .setFooter({ text: 'Click on an item to purchase it!' });

	    await interaction.update({ embeds: [categoryEmbed], components: actionRows });
	}

	checkRequirements(item, playerData) {
	    if (!item.requirements || Object.keys(item.requirements).length === 0) {
	        return true;
	    }

	    const requirements = item.requirements;
	    
	    // Check level requirement
	    if (requirements.level && (!playerData || playerData.level < requirements.level)) {
	        return false;
	    }

	    // Check ship class requirement
	    if (requirements.shipClass) {
	        const activeCharacter = this.getActiveCharacter(playerData);
	        if (!activeCharacter || !requirements.shipClass.includes(activeCharacter.shipClass)) {
	            return false;
	        }
	    }

	    // Check torpedo requirement
	    if (requirements.hasTorpedoes) {
	        const activeCharacter = this.getActiveCharacter(playerData);
	        if (!activeCharacter || !activeCharacter.hasTorpedoes) {
	            return false;
	        }
	    }

	    return true;
	}

	getActiveCharacter(playerData) {
	    if (!playerData || !playerData.activeCharacter || !playerData.characters) {
	        return null;
	    }
	    
	    if (playerData.characters instanceof Map) {
	        return playerData.characters.get(playerData.activeCharacter);
	    } else if (typeof playerData.characters === 'object') {
	        return playerData.characters[playerData.activeCharacter];
	    }
	    
	    return null;
	}

	formatRequirements(requirements) {
	    const parts = [];
	    
	    if (requirements.level) {
	        parts.push(`Level ${requirements.level}`);
	    }
	    
	    if (requirements.shipClass) {
	        parts.push(`Ship: ${requirements.shipClass.join(' or ')}`);
	    }
	    
	    if (requirements.hasTorpedoes) {
	        parts.push('Torpedo-capable ship');
	    }
	    
	    return parts.join(', ');
	}

	createBackButton(userId) {
	    return new ActionRowBuilder().addComponents(
	        new ButtonBuilder()
	            .setCustomId(`shop_back_${userId}`)
	            .setLabel('← Back to Categories')
	            .setStyle(ButtonStyle.Primary)
	    );
	}

	async handleShopInteraction(interaction) {
	    const customId = interaction.customId;
	    const userId = customId.split('_').pop();

	    if (userId !== interaction.user.id) {
	        return interaction.reply({ content: '❌ This is not your shop interaction!', flags: MessageFlags.Ephemeral });
	    }

	    if (customId.includes('shop_category_')) {
	        const categoryId = customId.split('_')[2];
	        await this.showCategoryItems(interaction, categoryId);
	    } else if (customId.includes('shop_buy_')) {
	        const itemId = customId.split('_')[2];
	        await this.handlePurchase(interaction, itemId);
	    } else if (customId.includes('shop_back_')) {
	        await this.showShop(interaction);
	    } else if (customId.includes('shop_close_')) {
	        await interaction.update({ 
	            content: '🛒 Thank you for visiting the Naval Equipment Shop!', 
	            embeds: [], 
	            components: [] 
	        });
	    }
	}

	async handlePurchase(interaction, itemId) {
	    const item = this.getItem(itemId);
	    if (!item) {
	        return interaction.update({ content: '❌ Item not found!', embeds: [], components: [] });
	    }

	    const playerData = this.bot.playerData.get(interaction.user.id);
	    if (!playerData) {
	        return interaction.update({ content: '❌ Player data not found!', embeds: [], components: [] });
	    }

	    // Check currency
	    if (playerData.currency < item.price) {
	        return interaction.reply({ 
	            content: `❌ Insufficient funds! You need ${item.price} credits but only have ${playerData.currency}.`, 
	            flags: MessageFlags.Ephemeral 
	        });
	    }

	    // Check requirements
	    if (!this.checkRequirements(item, playerData)) {
	        return interaction.reply({ 
	            content: `❌ You don't meet the requirements for this item: ${this.formatRequirements(item.requirements)}`, 
	            flags: MessageFlags.Ephemeral 
	        });
	    }

	    // Process purchase
	    playerData.currency -= item.price;
	    
	    // Add item to inventory
	    if (!playerData.inventory) {
	        playerData.inventory = new Map();
	    }

	    const currentAmount = playerData.inventory.get(itemId) || 0;
	    playerData.inventory.set(itemId, currentAmount + 1);

	    // Save data
	    this.bot.savePlayerData();

	    const purchaseEmbed = new EmbedBuilder()
	        .setTitle('✅ Purchase Successful!')
	        .setDescription(`You have purchased **${item.name}** for ${item.price} credits!\n\n` +
	                       `${item.description}\n\n` +
	                       `💰 **Remaining Currency:** ${playerData.currency} credits`)
	        .setColor(0x00FF00)
	        .setFooter({ text: 'Use /equip to use your purchased items!' });

	    await interaction.update({ embeds: [purchaseEmbed], components: [this.createBackButton(interaction.user.id)] });
	}
}

module.exports = ShopSystem;