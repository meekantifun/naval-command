// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            CARRIER SYSTEM MODULE                             ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

const AIRCRAFT_MOVEMENT_RANGES = {
    'fighter': 10,
    'dive_bomber': 8, 
    'torpedo_bomber': 5
};

class CarrierSystem {

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             INITIALIZATION & SETUP                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    constructor(bot) {
        this.bot = bot;
        this.aircraftTypes = this.initializeAircraftTypes();
    }

    initializeAircraftTypes() {
        return {
            'fighter': {
                name: 'Fighter Squadron',
                type: 'fighter',
                baseDamage: 40,
                range: 12, // Movement range per turn
                combatRange: 12, // Auto-engagement range
                speed: 12,
                health: 35,
                maxHealth: 35,
                accuracy: 85,
                evasion: 45,
                fuel: 15,
                maxFuel: 15,
                ammo: 3,
                maxAmmo: 3,
                speciality: 'Anti-aircraft and escort',
                targets: ['aircraft'], // Can only attack aircraft (unless depth charges)
                autoEngage: true // Automatically engages enemy aircraft in range
            },
            'dive_bomber': {
                name: 'Dive Bomber Squadron',
                type: 'dive_bomber',
                baseDamage: 65,
                range: 12,
                combatRange: 10, // Attack range
                speed: 10,
                health: 30,
                maxHealth: 30,
                accuracy: 80,
                evasion: 25,
                fuel: 12,
                maxFuel: 12,
                ammo: 2,
                maxAmmo: 2,
                speciality: 'Precision ship and aircraft strikes',
                targets: ['ship', 'aircraft'], // Can attack both, debuffed vs aircraft
                bombType: null // Will be set to 'ap' or 'he' when launched
            },
            'torpedo_bomber': {
                name: 'Torpedo Bomber Squadron',
                type: 'torpedo_bomber',
                baseDamage: 95,
                range: 7,
                combatRange: 7, // Torpedo range
                speed: 7,
                health: 25,
                maxHealth: 25,
                accuracy: 75,
                evasion: 20,
                fuel: 10,
                maxFuel: 10,
                ammo: 1,
                maxAmmo: 1,
                speciality: 'Heavy anti-ship attacks',
                targets: ['ship'], // Only ships at sea, no installations
                floodingChance: 0.3
            }
        };
    }

    createAircraftSquadron(type, squadronSize, position, owner, carrierID, options = {}) {
        const aircraftData = this.aircraftTypes[type];
        if (!aircraftData) return null;

        const aircraft = {
            id: `aircraft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            name: `${aircraftData.name} (${squadronSize} aircraft)`,
            squadronSize: squadronSize,
            position: position,
            owner: owner,
            carrierID: carrierID,
            health: 100,
            maxHealth: 100,
            alive: true,
            currentHealth: aircraftData.health || squadronSize * 10,
            maxHealth: aircraftData.maxHealth || squadronSize * 10,
            
            // Combat stats
            stats: {
                baseDamage: aircraftData.baseDamage || aircraftData.damage || 50,
                range: AIRCRAFT_MOVEMENT_RANGES[type] || aircraftData.range || 8, // Use 'type' instead of 'aircraftType'
                accuracy: aircraftData.accuracy || 70,
                evasion: aircraftData.evasion || 30,
                combatRange: 1 // Close range for actual attacks
            },
                        
            // Also store range at top level for easier access
            range: aircraftData.range || 10,
            
            // Add ammo tracking
            ammo: global.navalBot.getAmmunitionCount(type),
            maxAmmo: global.navalBot.getAmmunitionCount(type),
                        
            // Resources
            fuel: aircraftData.fuel,
            maxFuel: aircraftData.maxFuel,
            ammo: aircraftData.ammo,
            maxAmmo: aircraftData.maxAmmo,
            
            // Mission state
            mission: 'patrol', // patrol, cap, attack, returning, landed
            target: null,
            capTarget: null, // Player to protect during CAP
            actionPoints: 2,

            // Direction for icon rotation (0° = East, 90° = North, 180° = West, 270° = South)
            direction: 0,
            
            // Special equipment/options
            depthCharges: options.depthCharges || false, // Fighters only
            bombType: options.bombType || null, // Dive bombers: 'ap' or 'he'
            
            // Combat properties
            targets: [...aircraftData.targets], // Copy array
            autoEngage: aircraftData.autoEngage || false,
            floodingChance: aircraftData.floodingChance || 0
        };

        // Modify targets and stats based on equipment
        if (aircraft.depthCharges && aircraft.type === 'fighter') {
            aircraft.targets.push('submarine');
            // Debuff when attacking aircraft
            aircraft.stats.accuracy -= 15; // -15% accuracy vs aircraft when carrying depth charges
        }

        return aircraft;
    }

    getSquadronSize(shipClass) {
        // ADD THIS CHECK:
        if (!shipClass) {
            console.error('❌ shipClass is undefined in getSquadronSize');
            return 12; // Default squadron size
        }
        
        if (shipClass.includes('Light') || shipClass.includes('CVL')) {
            return 6;  // Light carrier squadrons
        }
        return 12;  // Fleet carrier squadrons
    }

    getAmmunitionCount(aircraftType) {
        switch (aircraftType) {
            case 'fighter':
            case 'fighters':
                return 3;  // Fighters have 3 ammo for dogfighting
            case 'dive_bomber':
            case 'dive_bombers':
                return 2;  // Dive bombers have 2 bombs
            case 'torpedo_bomber':
            case 'torpedo_bombers':
                return 1;  // Torpedo bombers have 1 torpedo
            default:
                return 2;  // Default ammo count
        }
    }

    getLaunchOptions(carrierType, aircraftType) {
        const options = {};
        
        if (aircraftType === 'fighter') {
            options.depthCharges = {
                label: 'Depth Charges',
                description: 'Can attack submarines, -15% accuracy vs aircraft'
            };
        } else if (aircraftType === 'dive_bomber') {
            options.bombType = {
                label: 'Bomb Type',
                choices: [
                    { value: 'ap', label: 'AP Bombs', description: '+30% vs heavy ships, -60% vs light ships, no fire' },
                    { value: 'he', label: 'HE Bombs', description: '35% fire chance, +20% vs Harbor Princess' }
                ]
            };
        }
        
        return options;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          UTILITY & CALCULATIONS                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    calculateDistance(pos1, pos2) {
        const [col1, row1] = this.parsePosition(pos1);
        const [col2, row2] = this.parsePosition(pos2);
        
        const colDiff = Math.abs(col1 - col2);
        const rowDiff = Math.abs(row1 - row2);
        
        return Math.max(colDiff, rowDiff); // Grid distance (king's move)
    }

    parsePosition(position) {
        const col = position.charCodeAt(0) - 65; // A=0, B=1, etc.
        const row = parseInt(position.slice(1)) - 1; // 1-based to 0-based
        return [col, row];
    }

    isInstallation(target) {
        // Check if target is an installation (can't be torpedoed)
        return target.type === 'outpost' || 
               target.type === 'resource_zone' || 
               target.customName?.includes('Harbor Princess') ||
               target.position && this.isOnLand(target.position);
    }

    isOnLand(position) {
        // This would check if the position is on an island
        // Implementation depends on your map system
        return false; // Simplified for now
    }

    getHangarCost(aircraftType, squadronSize) {
        // Calculate hangar space cost based on type and size
        const baseCost = {
            'fighter': 1,
            'dive_bomber': 1.5,
            'torpedo_bomber': 2
        };
        
        return Math.ceil((baseCost[aircraftType] || 1) * (squadronSize / 6));
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         AUTOMATED COMBAT SYSTEMS                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    checkAutoEngagement(game) {
        const messages = [];
        const fighters = Array.from(game.aircraft.values()).filter(a => 
            a.alive && a.type === 'fighter' && a.autoEngage && a.ammo > 0
        );

        for (const fighter of fighters) {
            const enemyAircraft = Array.from(game.aircraft.values()).filter(a => 
                a.alive && a.owner !== fighter.owner
            );

            for (const enemy of enemyAircraft) {
                const distance = game.calculateDistance(fighter.position, enemy.position);
                
                if (distance <= fighter.stats.combatRange) {
                    // Auto-engage!
                    fighter.mission = 'attack';
                    fighter.target = enemy.id;
                    
                    const fighterName = `${fighter.owner === 'player' ? '🔵' : '🔴'} ${fighter.name}`;
                    const enemyName = `${enemy.owner === 'player' ? '🔵' : '🔴'} ${enemy.name}`;
                    
                    messages.push(`⚡ ${fighterName} auto-engaging ${enemyName} at ${enemy.position}!`);
                    break; // One engagement per fighter per turn
                }
            }
        }

        return messages;
    }

    checkCAPEngagement(game) {
        const messages = [];
        const capFighters = Array.from(game.aircraft.values()).filter(a => 
            a.alive && a.type === 'fighter' && a.mission === 'cap' && a.capTarget && a.ammo > 0
        );

        for (const fighter of capFighters) {
            // Find the player being protected
            const protectedPlayer = game.players.get(fighter.capTarget) || game.enemies.get(fighter.capTarget);
            if (!protectedPlayer || !protectedPlayer.alive) {
                fighter.mission = 'patrol'; // Protected target lost
                fighter.capTarget = null;
                continue;
            }

            // Check for enemy aircraft near protected player
            const enemyAircraft = Array.from(game.aircraft.values()).filter(a => 
                a.alive && a.owner !== fighter.owner
            );

            for (const enemy of enemyAircraft) {
                const distanceToProtected = game.calculateDistance(enemy.position, protectedPlayer.position);
                
                if (distanceToProtected <= 10) { // CAP engagement range
                    fighter.mission = 'attack';
                    fighter.target = enemy.id;
                    
                    const fighterName = `${fighter.owner === 'player' ? '🔵' : '🔴'} ${fighter.name}`;
                    const enemyName = `${enemy.owner === 'player' ? '🔵' : '🔴'} ${enemy.name}`;
                    const playerName = protectedPlayer.customName || protectedPlayer.shipClass;
                    
                    messages.push(`🛡️ ${fighterName} intercepting ${enemyName} near ${playerName}!`);
                    break;
                }
            }
        }

        return messages;
    }

    calculateAircraftDamage(aircraft, target) {
        let baseDamage = aircraft.stats.baseDamage;
        
        // Squadron size multiplier
        const squadronMultiplier = aircraft.squadronSize / 12; // Normalized to CV size
        baseDamage *= squadronMultiplier;

        // Type-specific mechanics
        if (aircraft.type === 'fighter') {
            if (target.type?.includes('aircraft')) {
                // Normal damage vs aircraft
                if (aircraft.depthCharges) {
                    baseDamage *= 0.85; // -15% damage when carrying depth charges
                }
            } else if (target.shipClass?.includes('Submarine') && aircraft.depthCharges) {
                // Depth charges vs submarines
                baseDamage *= 0.6; // Moderate damage vs subs
            } else {
                // Fighters can't attack ships without depth charges
                return 0;
            }
        } else if (aircraft.type === 'dive_bomber') {
            if (target.type?.includes('aircraft')) {
                baseDamage *= 0.5; // -50% damage vs aircraft
            } else if (target.shipClass) {
                // Ship targeting with bomb types
                if (aircraft.bombType === 'ap') {
                    // AP bombs - good vs heavy ships
                    if (target.shipClass.includes('Heavy Cruiser') || 
                        target.shipClass.includes('Battleship') || 
                        target.shipClass.includes('Carrier')) {
                        baseDamage *= 1.3; // +30% vs heavy ships
                    } else if (target.shipClass.includes('Destroyer') || 
                               target.shipClass.includes('Submarine')) {
                        baseDamage *= 0.4; // -60% vs light ships
                    }
                } else if (aircraft.bombType === 'he') {
                    // HE bombs - consistent damage, fire chance
                    if (target.customName?.includes('Harbor Princess')) {
                        baseDamage *= 1.2; // +20% vs Harbor Princess
                    }
                }
            }
        } else if (aircraft.type === 'torpedo_bomber') {
            if (target.shipClass && !this.isInstallation(target)) {
                // Normal torpedo damage vs ships at sea
                baseDamage *= 1.0;
            } else {
                // Can't attack installations or land targets
                return 0;
            }
        }

        return Math.round(baseDamage);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RESOURCE MANAGEMENT                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    processResources(aircraft, game) {
        const messages = [];
        
        // Fuel consumption
        aircraft.fuel--;
        
        if (aircraft.fuel <= 2 && aircraft.mission !== 'returning') {
            aircraft.mission = 'returning';
            messages.push(`⛽ ${aircraft.name} low on fuel, returning to carrier!`);
        } else if (aircraft.fuel <= 0) {
            aircraft.alive = false;
            aircraft.mission = 'crashed';
            messages.push(`💥 ${aircraft.name} crashed - out of fuel!`);
            return messages;
        }

        // Ammo check
        if (aircraft.ammo <= 0 && aircraft.mission === 'attack') {
            aircraft.mission = 'returning';
            messages.push(`🔫 ${aircraft.name} out of ammo, returning to carrier!`);
        }

        return messages;
    }

    attemptLanding(aircraft, carrier, game) {
        const distance = game.calculateDistance(aircraft.position, carrier.position);
        
        if (distance <= 2) {
            // Successful landing
            const hangarCost = this.getHangarCost(aircraft.type, aircraft.squadronSize);
            
            if (carrier.hangar >= hangarCost) {
                carrier.hangar -= hangarCost; // Return to hangar
                
                // Rearm and refuel
                aircraft.fuel = aircraft.maxFuel;
                aircraft.ammo = aircraft.maxAmmo;
                aircraft.currentHealth = Math.min(aircraft.maxHealth, aircraft.currentHealth + 5);
                aircraft.mission = 'landed';
                
                return `🛬 ${aircraft.name} landed and rearmed on ${carrier.customName || carrier.shipClass}!`;
            } else {
                // Carrier hangar full - aircraft lost
                aircraft.alive = false;
                return `💥 ${aircraft.name} lost - carrier hangar full!`;
            }
        }
        
        return null; // Still approaching
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PLAYER ACTIONS & MOVEMENT                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async moveAircraft(interaction, game, aircraftId, targetPosition) {
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) {
            return interaction.reply({ content: '❌ You are not in this game or your ship is destroyed!', ephemeral: true });
        }

        const aircraft = game.aircraft.get(aircraftId);
        if (!aircraft || aircraft.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found or not yours!', ephemeral: true });
        }

        // Check if aircraft can move
        if (aircraft.actionPoints <= 0) {
            return interaction.reply({ content: '❌ Aircraft has no action points remaining!', ephemeral: true });
        }

        // Calculate distance
        const distance = this.calculateDistance(aircraft.position, targetPosition);
        if (distance > aircraft.range) {
            return interaction.reply({ 
                content: `❌ Target position too far! Range: ${aircraft.range}, Distance: ${distance}`, 
                ephemeral: true 
            });
        }

        // Move aircraft
        aircraft.position = targetPosition;
        aircraft.actionPoints--;

        // Check for targets in range after movement
        await this.checkForTargetsInRange(interaction, game, aircraft);

        await interaction.reply({ 
            content: `✈️ ${aircraft.name} moved to ${targetPosition}`, 
            ephemeral: true 
        });
    }

    async checkForTargetsInRange(interaction, game, aircraft) {
        const shipTargets = [];
        const aircraftTargets = [];

        // Check for enemy ships in range
        for (const [playerId, target] of game.players.entries()) {
            if (playerId !== aircraft.ownerId && target.alive && target.position) {
                const distance = this.calculateDistance(aircraft.position, target.position);
                if (distance <= aircraft.range && aircraft.count > 0) { // Use count instead of ammunition
                    shipTargets.push({
                        type: 'ship',
                        id: playerId,
                        name: target.username,
                        position: target.position,
                        distance: distance
                    });
                }
            }
        }

        // Check for enemy aircraft in range (from other players' active squadrons)
        const allPlayers = Array.from(game.players.keys());
        for (const playerId of allPlayers) {
            if (playerId !== aircraft.ownerId) {
                const playerEntry = this.bot.playerData.get(playerId);
                const otherCharacter = playerEntry?.characters?.get(playerEntry?.activeCharacter);
                
                if (otherCharacter?.activeSquadrons) {
                    for (const [squadronId, enemyAircraft] of otherCharacter.activeSquadrons.entries()) {
                        if (enemyAircraft.position && enemyAircraft.count > 0) {
                            const distance = this.calculateDistance(aircraft.position, enemyAircraft.position);
                            if (distance <= aircraft.range) {
                                aircraftTargets.push({
                                    type: 'aircraft',
                                    id: squadronId,
                                    ownerId: playerId,
                                    name: enemyAircraft.name,
                                    position: enemyAircraft.position,
                                    distance: distance
                                });
                            }
                        }
                    }
                }
            }
        }

        // Show combat options if targets available
        if (shipTargets.length > 0 || aircraftTargets.length > 0) {
            await this.showAircraftCombatOptions(interaction, game, aircraft, shipTargets, aircraftTargets);
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             COMBAT INTERFACE                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async showAircraftCombatOptions(interaction, game, aircraft, shipTargets, aircraftTargets) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        let combatButtons = [];
        let description = `**${aircraft.name}** at ${aircraft.position}\n` +
                         `**Action Points:** ${aircraft.actionPoints}\n` +
                         `**Ammunition:** ${aircraft.ammunition}\n\n`;

        // Add ship attack options based on aircraft type
        if (shipTargets.length > 0 && aircraft.ammunition > 0) {
            if (aircraft.specialAbility === 'dive_bomb') {
                combatButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_bomb_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`💣 Bomb Ships (${shipTargets.length})`)
                        .setStyle(ButtonStyle.Danger)
                );
                description += `🎯 **Bombing Targets:**\n`;
            } else if (aircraft.specialAbility === 'torpedo') {
                combatButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_torpedo_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`🚀 Torpedo Attack (${shipTargets.length})`)
                        .setStyle(ButtonStyle.Danger)
                );
                description += `🎯 **Torpedo Targets:**\n`;
            }

            shipTargets.forEach(target => {
                description += `• ${target.name} at ${target.position} (${target.distance} squares)\n`;
            });
            description += '\n';
        }

        // Add dogfight options
        if (aircraftTargets.length > 0) {
            if (aircraft.specialAbility === 'fighter_ace') {
                // Fighters auto-engage, but show button for manual control
                combatButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_dogfight_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`✈️ Dogfight (Auto) (${aircraftTargets.length})`)
                        .setStyle(ButtonStyle.Secondary)
                );
                description += `⚔️ **Auto-Dogfight Targets:**\n`;
            } else if (aircraft.specialAbility === 'dive_bomb') {
                // Dive bombers require manual dogfight selection
                combatButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_dogfight_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`🥊 DOGFIGHT (Manual) (${aircraftTargets.length})`)
                        .setStyle(ButtonStyle.Secondary)
                );
                description += `⚔️ **Dogfight Available (Manual):**\n`;
            }

            aircraftTargets.forEach(target => {
                description += `• ${target.name} at ${target.position} (${target.distance} squares)\n`;
            });
            description += '\n';
        }

        // Add pass/continue button
        combatButtons.push(
            new ButtonBuilder()
                .setCustomId(`aircraft_pass_${aircraft.id}_${interaction.user.id}`)
                .setLabel('⏭️ Pass Turn')
                .setStyle(ButtonStyle.Primary)
        );

        // Organize buttons into rows (max 5 per row)
        const actionRows = [];
        for (let i = 0; i < combatButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(combatButtons.slice(i, i + 5)));
        }

        const embed = new EmbedBuilder()
            .setTitle('✈️ Aircraft Combat Options')
            .setDescription(description)
            .setColor(0x0099FF)
            .setFooter({ text: 'Select an action or pass turn' });

        await interaction.followUp({
            embeds: [embed],
            components: actionRows,
            ephemeral: true
        });
    }

    async handleAircraftBomb(interaction, game, aircraftId) {
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || aircraft.carrierID !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found or not yours!', ephemeral: true });
        }
        
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', ephemeral: true });
        }
        
        if (aircraft.ammo <= 0) {
            return interaction.reply({ content: '❌ Aircraft is out of ammunition!', ephemeral: true });
        }
        
        // Get valid bomb targets - use the bot's method
        const targets = global.navalBot.getEnemyShipsInRange(aircraft, game);
        
        if (targets.length === 0) {
            return interaction.reply({ content: '❌ No valid targets in range!', ephemeral: true });
        }
        
        // Create target selection buttons
        const targetButtons = [];
        for (let i = 0; i < Math.min(targets.length, 20); i++) {
            const target = targets[i];
            const distance = game.calculateDistance(aircraft.position, target.position);
            const targetName = target.customName || target.shipClass || 'Unknown';
            const healthInfo = `${target.currentHealth}/${target.maxHealth}HP`;
            
            targetButtons.push(
                new ButtonBuilder()
                    .setCustomId(`bomb_target_${target.id}_${aircraftId}_${interaction.user.id}`)
                    .setLabel(`${targetName} (${distance.toFixed(1)}⚡ ${healthInfo})`)
                    .setStyle(ButtonStyle.Danger)
            );
        }
        
        // Add cancel button
        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`bomb_target_cancel_${aircraftId}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }
        
        const embed = new EmbedBuilder()
            .setTitle('💣 Select Bombing Target')
            .setDescription(`**${aircraft.name}** - Choose target for dive bombing:\n` +
                           `**Ammo:** ${aircraft.ammo}/${aircraft.maxAmmo}\n` +
                           `**Bomb Type:** ${aircraft.bombType || 'HE'}\n\n` +
                           `Select a target to attack:`)
            .setColor(0xFF0000);
        
        await interaction.update({ embeds: [embed], components: actionRows });
    }

    async handleAircraftTorpedo(interaction, game, aircraftId) {
        const aircraft = game.aircraft.get(aircraftId);
        if (!aircraft || aircraft.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found!', ephemeral: true });
        }

        if (aircraft.ammunition <= 0) {
            return interaction.reply({ content: '❌ No ammunition remaining!', ephemeral: true });
        }

        // Show target selection for torpedo attack
        await this.showTorpedoTargets(interaction, game, aircraft);
    }

    async handleAircraftDogfight(interaction, game, aircraftId) {
        const aircraft = game.aircraft.get(aircraftId);
        if (!aircraft || aircraft.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found!', ephemeral: true });
        }

        // Show target selection for dogfight
        await this.showDogfightTargets(interaction, game, aircraft);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          TARGET SELECTION UI                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async showBombingTargets(interaction, game, aircraft) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const targets = [];
        for (const [playerId, target] of game.players.entries()) {
            if (playerId !== aircraft.ownerId && target.alive && target.position) {
                const distance = this.calculateDistance(aircraft.position, target.position);
                if (distance <= aircraft.range) {
                    targets.push({
                        id: playerId,
                        name: target.username,
                        position: target.position,
                        distance: distance
                    });
                }
            }
        }

        if (targets.length === 0) {
            return interaction.update({ 
                content: '❌ No valid targets in range!', 
                components: [], 
                embeds: [] 
            });
        }

        const targetButtons = targets.map(target => 
            new ButtonBuilder()
                .setCustomId(`bomb_target_${target.id}_${aircraft.id}_${interaction.user.id}`)
                .setLabel(`💣 ${target.name} (${target.distance} sq)`)
                .setStyle(ButtonStyle.Danger)
        );

        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`bomb_cancel_${aircraft.id}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }

        const embed = new EmbedBuilder()
            .setTitle('💣 Select Bombing Target')
            .setDescription(`**${aircraft.name}** preparing to bomb...\n` +
                           `**Ammunition:** ${aircraft.ammunition}\n\n` +
                           `**Available Targets:**`)
            .setColor(0xFF6600);

        await interaction.update({
            embeds: [embed],
            components: actionRows
        });
    }

    async showTorpedoTargets(interaction, game, aircraft) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const targets = [];
        for (const [playerId, target] of game.players.entries()) {
            if (playerId !== aircraft.ownerId && target.alive && target.position) {
                const distance = this.calculateDistance(aircraft.position, target.position);
                if (distance <= aircraft.range) {
                    targets.push({
                        id: playerId,
                        name: target.username,
                        position: target.position,
                        distance: distance
                    });
                }
            }
        }

        if (targets.length === 0) {
            return interaction.update({ 
                content: '❌ No valid targets in range!', 
                components: [], 
                embeds: [] 
            });
        }

        const targetButtons = targets.map(target => 
            new ButtonBuilder()
                .setCustomId(`torpedo_target_${target.id}_${aircraft.id}_${interaction.user.id}`)
                .setLabel(`🚀 ${target.name} (${target.distance} sq)`)
                .setStyle(ButtonStyle.Danger)
        );

        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`torpedo_cancel_${aircraft.id}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }

        const embed = new EmbedBuilder()
            .setTitle('🚀 Select Torpedo Target')
            .setDescription(`**${aircraft.name}** preparing torpedo attack...\n` +
                           `**Ammunition:** ${aircraft.ammunition}\n\n` +
                           `**Available Targets:**`)
            .setColor(0x0066FF);

        await interaction.update({
            embeds: [embed],
            components: actionRows
        });
    }

    async showDogfightTargets(interaction, game, aircraft) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const targets = [];
        for (const [aircraftId, target] of game.aircraft.entries()) {
            if (target.ownerId !== aircraft.ownerId && target.position) {
                const distance = this.calculateDistance(aircraft.position, target.position);
                if (distance <= aircraft.range) {
                    targets.push({
                        id: aircraftId,
                        name: target.name,
                        position: target.position,
                        distance: distance
                    });
                }
            }
        }

        if (targets.length === 0) {
            return interaction.update({ 
                content: '❌ No enemy aircraft in range!', 
                components: [], 
                embeds: [] 
            });
        }

        const targetButtons = targets.map(target => 
            new ButtonBuilder()
                .setCustomId(`dogfight_target_${target.id}_${aircraft.id}_${interaction.user.id}`)
                .setLabel(`⚔️ ${target.name} (${target.distance} sq)`)
                .setStyle(ButtonStyle.Secondary)
        );

        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`dogfight_cancel_${aircraft.id}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }

        const embed = new EmbedBuilder()
            .setTitle('⚔️ Select Dogfight Target')
            .setDescription(`**${aircraft.name}** preparing to engage...\n` +
                           `**Type:** ${aircraft.specialAbility === 'fighter_ace' ? 'Auto-Dogfight' : 'Manual Dogfight'}\n\n` +
                           `**Available Targets:**`)
            .setColor(0x666666);

        await interaction.update({
            embeds: [embed],
            components: actionRows
        });
    }
}

module.exports = CarrierSystem;
module.exports.AIRCRAFT_MOVEMENT_RANGES = AIRCRAFT_MOVEMENT_RANGES;