// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               MISSIONS MODULE                                ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class MissionObjectives {

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             INITIALIZATION & SETUP                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    constructor(bot) {
        this.bot = bot; // Reference to the main bot instance
        this.objectives = new Map();
        this.initializeObjectives();
    }

    initializeObjectives() {
        // Default objective
        this.objectives.set('destroy_all', {
            name: 'Destroy All Enemies',
            description: 'Eliminate all hostile forces',
            setup: (game) => {},
            check: (game) => Array.from(game.enemies.values()).filter(e => e.alive).length === 0,
            reward: { xp: 200, currency: 500 }
        });

        // Custom objectives - properly bound methods
        this.objectives.set('resource_acquisition', {
            name: 'Resource Acquisition',
            description: 'Secure the resource zone and extract valuable materials',
            setup: (game) => this.setupResourceAcquisition(game),
            check: (game) => this.checkResourceAcquisition(game),
            process: (game) => this.processResourceAcquisition(game),
            reward: { xp: 300, currency: 750 }
        });

        this.objectives.set('convoy_escort', {
            name: 'Convoy Escort',
            description: 'Escort friendly vessels safely to their destination',
            setup: (game) => this.setupConvoyEscort(game),
            check: (game) => {return game.objective.shipsDelivered >= game.objective.requiredDeliveries;},
            process: (game) => this.processConvoyEscort(game),
            reward: { xp: 350, currency: 800 }
        });

        this.objectives.set('capture_outpost', {
            name: 'Capture Outpost',
            description: 'Destroy the enemy fortification and secure the area',
            setup: (game) => this.setupCaptureOutpost(game),
            check: (game) => this.checkCaptureOutpost(game),
            process: (game) => this.processCaptureOutpost(game),
            reward: { xp: 400, currency: 900 }
        });

        this.objectives.set('defeat_boss', {
            name: 'Defeat Boss',
            description: 'Eliminate the enemy flagship and its escort',
            setup: (game) => this.setupDefeatBoss(game),
            check: (game) => this.checkDefeatBoss(game),
            process: (game) => this.processDefeatBoss(game),
            reward: { xp: 500, currency: 1200 },
            availableBosses: [
                {
                    name: 'Harbor Princess',
                    type: 'harbor_princess',
                    health: 2000,
                    description: 'Immobile fortress with aircraft and coastal guns',
                    needsIsland: true
                },
                {
                    name: 'Battleship Princess',
                    type: 'battleship_princess',
                    health: 1800,
                    description: 'Heavily armored and armed battleship',
                    needsIsland: false
                },
                {
                    name: 'Heavy Cruiser Princess',
                    type: 'cruiser_princess',
                    health: 1200,
                    description: 'Up-armed and armored heavy cruiser with extended range',
                    needsIsland: false
                },
                {
                    name: 'Light Cruiser Princess',
                    type: 'light_cruiser_princess',
                    health: 900,
                    description: 'Fast and agile cruiser with enhanced firepower',
                    needsIsland: false
                },
                {
                    name: 'Destroyer Princess',
                    type: 'destroyer_princess',
                    health: 600,
                    description: 'Extremely fast destroyer with long-range capabilities',
                    needsIsland: false
                }
            ]
        });

        this.objectives.set('salvage_supplies', {
            name: 'Salvage Supplies',
            description: 'Recover valuable cargo from sunken vessels',
            setup: (game) => this.setupSalvageSupplies(game),
            check: (game) => this.checkSalvageSupplies(game),
            process: (game) => this.processSalvageSupplies(game),
            reward: { xp: 250, currency: 600 }
        });

        this.objectives.set('convoy_interception', {
            name: 'Convoy Interception',
            description: 'Intercept and capture the enemy supply convoy',
            setup: (game) => this.setupConvoyInterception(game),
            check: (game) => this.checkConvoyInterception(game),
            process: (game) => this.processConvoyInterception(game),
            reward: { xp: 375, currency: 850 }
        });
    }

    getAllObjectives() {
        return this.objectives;
    }

    getObjective(type) {
        return this.objectives.get(type);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      OBJECTIVE: RESOURCE ACQUISITION                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupResourceAcquisition(game) {
        // Find an island edge for the resource zone
        let resourceZone = null;
        let islandFound = false;
        
        // Look for existing islands
        for (const [coord, cell] of game.map.entries()) {
            if (cell.type === 'island') {
                const coords = this.bot.coordToNumbers(coord);
                
                // Check edges of islands (adjacent ocean cells)
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const edgeX = coords.x + dx;
                        const edgeY = coords.y + dy;
                        
                        if (edgeX >= 0 && edgeX < 75 && edgeY >= 1 && edgeY <= 75) {
                            const edgeCoord = game.generateExtendedCoordinate(edgeX, edgeY);
                            const edgeCell = game.getMapCell(edgeCoord);
                            
                            if (edgeCell && edgeCell.type === 'ocean') {
                                resourceZone = edgeCoord;
                                islandFound = true;
                                break;
                            }
                        }
                    }
                    if (resourceZone) break;
                }
                if (resourceZone) break;
            }
        }
        
        // If no island found, create a small 5-tile island
        if (!islandFound) {
            const centerX = 30 + Math.floor(Math.random() * 15);
            const centerY = 30 + Math.floor(Math.random() * 15);
                        
            // Create 5-tile cross-shaped island
            const islandTiles = [
                {x: centerX, y: centerY},     // Center
                {x: centerX-1, y: centerY},   // West
                {x: centerX+1, y: centerY},   // East
                {x: centerX, y: centerY-1},   // North
                {x: centerX, y: centerY+1}    // South
            ];
            
            for (const tile of islandTiles) {
                if (tile.x >= 0 && tile.x < 75 && tile.y >= 1 && tile.y <= 75) {
                    const coord = game.generateExtendedCoordinate(tile.x, tile.y);
                    const cell = game.getMapCell(coord);
                    if (cell) cell.type = 'island';
                }
            }
            
            // Resource zone on the edge
            resourceZone = game.generateExtendedCoordinate(centerX + 2, centerY);
        }
        
        // Mark resource zone and radius
        const resourceCell = game.getMapCell(resourceZone);
        if (resourceCell) resourceCell.type = 'resource_zone';
        
        // Mark radius area
        const resourcePos = this.bot.coordToNumbers(resourceZone);
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= 3 && distance > 0) {
                    const radiusX = resourcePos.x + dx;
                    const radiusY = resourcePos.y + dy;
                    
                    if (radiusX >= 0 && radiusX < 75 && radiusY >= 1 && radiusY <= 75) {
                        const radiusCoord = game.generateExtendedCoordinate(radiusX, radiusY);
                        const radiusCell = game.getMapCell(radiusCoord);
                        if (radiusCell && radiusCell.type === 'ocean') {
                            radiusCell.type = 'resource_radius';
                        }
                    }
                }
            }
        }
        
        game.objective = {
            type: 'resource_acquisition',
            resourceZone: resourceZone,
            radius: 3,
            turnsRequired: 8,
            turnsProgress: 0,
            playersInZone: 0
        };
        
        console.log(`🎯 Resource zone established at ${resourceZone} with 3-tile radius`);
    }

    checkResourceAcquisition(game) {
        return game.objective?.turnsProgress >= game.objective?.turnsRequired;
    }

    processResourceAcquisition(game) {
        const messages = [];
        if (!game.objective) return messages;
        
        // Count players in the resource zone
        let playersInZone = 0;
        const resourcePos = this.bot.coordToNumbers(game.objective.resourceZone);
        
        for (const player of game.players.values()) {
            if (!player.alive) continue;
            const playerPos = this.bot.coordToNumbers(player.position);
            const distance = Math.sqrt(Math.pow(playerPos.x - resourcePos.x, 2) + Math.pow(playerPos.y - resourcePos.y, 2));
            
            if (distance <= game.objective.radius) {
                playersInZone++;
            }
        }
        
        game.objective.playersInZone = playersInZone;
        
        if (playersInZone > 0) {
            // Progress based on number of players (more players = faster progress)
            const progressThisTurn = Math.min(playersInZone, 3); // Max 3 progress per turn
            game.objective.turnsProgress += progressThisTurn;
            
            const remaining = Math.max(0, game.objective.turnsRequired - game.objective.turnsProgress);
            messages.push(`⛏️ **Resource Extraction:** ${playersInZone} ships extracting. Progress: ${game.objective.turnsProgress}/${game.objective.turnsRequired} (${remaining} remaining)`);
            
            if (remaining === 0) {
                messages.push(`✅ **Resources fully extracted!** Mission objective complete!`);
            }
        }
        
        return messages;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          OBJECTIVE: CONVOY ESCORT                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupConvoyEscort(game) {
        const convoyCount = 3 + Math.floor(Math.random() * 3); // 3-5 ships
        game.objective = {
            type: 'convoy_escort',
            convoyShips: []
        };
        
        // Select a random player for convoys to follow
        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
        if (alivePlayers.length > 0) {
            const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            game.objective.followTarget = randomPlayer.id;
            game.objective.followTargetName = randomPlayer.displayName || randomPlayer.username || 'Unknown Player';
            console.log(`🎯 Convoy ships will follow ${game.objective.followTargetName}`);
        }
        
        // Create SINGLE destination point on right side of map
        const destX = 65 + Math.floor(Math.random() * 8);
        const destY = 30 + Math.floor(Math.random() * 15);
        game.objective.destinationZone = game.generateExtendedCoordinate(destX, destY);
        game.objective.destinationRadius = 5; // Radius of 5
        
        // Clear any existing destination zones first (in case of multiple setups)
        for (const [coord, cell] of game.map.entries()) {
            if (cell.type === 'destination_zone') {
                cell.type = cell.originalType || 'ocean';
                cell.isDestinationCenter = false;
            }
        }
        
        // Mark destination zone on map - CIRCULAR with radius 5
        let zonesCreated = 0;
        for (let dx = -5; dx <= 5; dx++) {
            for (let dy = -5; dy <= 5; dy++) {
                // Check if point is within circular radius
                const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
                if (distanceFromCenter <= 5) {
                    const zoneX = destX + dx;
                    const zoneY = destY + dy;
                    if (zoneX >= 0 && zoneX < 75 && zoneY >= 1 && zoneY <= 75) {
                        const coord = game.generateExtendedCoordinate(zoneX, zoneY);
                        const cell = game.map.get(coord); // Use map.get instead of getMapCell
                        if (cell && (cell.type === 'ocean' || cell.type === 'reef')) {
                            cell.originalType = cell.type;
                            cell.type = 'destination_zone';
                            zonesCreated++;
                            
                            // Mark the center point
                            if (dx === 0 && dy === 0) {
                                cell.isDestinationCenter = true;
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`📍 Created destination zone at ${game.objective.destinationZone} with ${zonesCreated} cells`);
        
        // SINGLE convoy ship creation loop (removed the duplicate)
        console.log(`🚢 Creating ${convoyCount} convoy ships...`);
        for (let i = 0; i < convoyCount; i++) {
            const spawnPos = this.getConvoySpawnPosition(game);
            console.log(`🚢 Convoy ${i + 1} spawn position: ${spawnPos}`);
            
            const convoy = {
                id: `convoy_${i}`,
                name: `Convoy ${i + 1}`,
                position: spawnPos,
                health: 50,
                maxHealth: 50,
                alive: true,
                canMove: false,
                hasReachedDestination: false
            };
            game.objective.convoyShips.push(convoy);
            
            // Mark position on map
            const cell = game.map.get(spawnPos);
            if (cell) {
                cell.occupant = 'convoy';
                console.log(`✅ Marked cell ${spawnPos} as occupied by convoy`);
            } else {
                console.log(`❌ Could not find cell at ${spawnPos}`);
            }
        }

        // Verify convoys were created
        console.log(`✅ Created ${game.objective.convoyShips.length} convoy ships`);
        for (const convoy of game.objective.convoyShips) {
            console.log(`  - ${convoy.name} at ${convoy.position}`);
        }
        
        game.objective.shipsDelivered = 0;
        game.objective.requiredDeliveries = Math.ceil(convoyCount * 0.6); // Need 60% to succeed
        
        console.log(`🚢 Convoy Escort mission started with ${convoyCount} ships`);
        console.log(`📍 Single destination at: ${game.objective.destinationZone}`);
        console.log(`👥 Following: ${game.objective.followTargetName}`);
        
        // Return message to be displayed
        return {
            message: `🚢 **CONVOY ESCORT MISSION**\n` +
                    `${convoyCount} convoy ships need escort to ${game.objective.destinationZone}\n` +
                    `📍 **Following:** ${game.objective.followTargetName}\n` +
                    `⚠️ At least ${game.objective.requiredDeliveries} ships must reach the destination zone!`
        };
    }

    // Fix the helper method to spawn in the actual spawn zone
    getConvoySpawnPosition(game) {
        // First, find all actual spawn zone cells
        const spawnCells = [];
        
        // Search the entire map for cells marked as 'spawn'
        for (let x = 0; x < 75; x++) {
            for (let y = 1; y <= 75; y++) {
                const coord = game.generateExtendedCoordinate(x, y);
                const cell = game.map.get(coord); // Use map.get directly
                
                // Only look for cells specifically marked as spawn type
                if (cell && cell.type === 'spawn' && !cell.occupant) {
                    spawnCells.push(coord);
                }
            }
        }
        
        console.log(`🔍 Found ${spawnCells.length} available spawn cells for convoy`);
        
        // If we found spawn cells, use one randomly
        if (spawnCells.length > 0) {
            const chosen = spawnCells[Math.floor(Math.random() * spawnCells.length)];
            console.log(`📍 Convoy spawning at ${chosen}`);
            return chosen;
        }
        
        // If no spawn cells found, use ocean cells in spawn area
        console.log('⚠️ No spawn cells found, using ocean cells in spawn area');
        
        const oceanFallbacks = [];
        for (let x = 0; x < 5; x++) { // Spawn zone is typically columns A-E
            for (let y = 35; y < 50; y++) {
                const coord = game.generateExtendedCoordinate(x, y);
                const cell = game.map.get(coord);
                
                if (cell && cell.type === 'ocean' && !cell.occupant) {
                    oceanFallbacks.push(coord);
                }
            }
        }
        
        if (oceanFallbacks.length > 0) {
            const chosen = oceanFallbacks[Math.floor(Math.random() * oceanFallbacks.length)];
            console.log(`📍 Convoy spawning at ocean fallback ${chosen}`);
            return chosen;
        }
        
        // Final fallback
        console.log('❌ No suitable spawn position found, using default B40');
        return 'B40';
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       OBJECTIVE: CAPTURE OUTPOST                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupCaptureOutpost(game) {
        // Find an island edge for the outpost
        let outpostLocation = null;
        let islandFound = false;
        
        // Look for existing islands
        for (const [coord, cell] of game.map.entries()) {
            if (cell.type === 'island') {
                outpostLocation = coord;
                islandFound = true;
                break;
            }
        }
        
        // If no island found, create a small 5-tile island
        if (!islandFound) {
            const centerX = 35 + Math.floor(Math.random() * 15);
            const centerY = 35 + Math.floor(Math.random() * 15);

            // Create 5-tile cross-shaped island
            const islandTiles = [
                {x: centerX, y: centerY},     // Center - this will be the outpost
                {x: centerX-1, y: centerY},   // West
                {x: centerX+1, y: centerY},   // East
                {x: centerX, y: centerY-1},   // North
                {x: centerX, y: centerY+1}    // South
            ];
            
            for (const tile of islandTiles) {
                if (tile.x >= 0 && tile.x < 75 && tile.y >= 1 && tile.y <= 75) {
                    const coord = game.generateExtendedCoordinate(tile.x, tile.y);
                    const cell = game.getMapCell(coord);
                    if (cell) cell.type = 'island';
                }
            }
            
            outpostLocation = game.generateExtendedCoordinate(centerX, centerY);
        }
        
        // Mark as outpost
        const outpostCell = game.getMapCell(outpostLocation);
        if (outpostCell) outpostCell.type = 'outpost';
        
        game.objective = {
            type: 'capture_outpost',
            outpostLocation: outpostLocation,
            outpostHealth: 1500,
            outpostMaxHealth: 1500,
            outpostDestroyed: false,
            captureRadius: 3,
            captureProgress: 0,
            captureRequired: 5
        };
        
        console.log(`🏰 Outpost established at ${outpostLocation} with 1500 HP`);
    }

    checkCaptureOutpost(game) {
        return game.objective?.outpostDestroyed && game.objective?.captureProgress >= game.objective?.captureRequired;
    }

    processCaptureOutpost(game) {
        const messages = [];
        if (!game.objective) return messages;
        
        // Check if outpost is being attacked
        if (!game.objective.outpostDestroyed && game.objective.outpostHealth <= 0) {
            game.objective.outpostDestroyed = true;
            messages.push(`💥 **Outpost destroyed!** Begin capture operations within ${game.objective.captureRadius} cells.`);
        }
        
        // If outpost is destroyed, check for capture progress
        if (game.objective.outpostDestroyed) {
            let playersInArea = 0;
            const outpostPos = this.bot.coordToNumbers(game.objective.outpostLocation);
            
            for (const player of game.players.values()) {
                if (!player.alive) continue;
                const playerPos = this.bot.coordToNumbers(player.position);
                const distance = Math.sqrt(Math.pow(playerPos.x - outpostPos.x, 2) + Math.pow(playerPos.y - outpostPos.y, 2));
                
                if (distance <= game.objective.captureRadius) {
                    playersInArea++;
                }
            }
            
            if (playersInArea > 0) {
                game.objective.captureProgress++;
                const remaining = game.objective.captureRequired - game.objective.captureProgress;
                messages.push(`🏴 **Capturing Outpost:** ${playersInArea} ships securing area. Progress: ${game.objective.captureProgress}/${game.objective.captureRequired} (${remaining} remaining)`);
            }
        }
        
        return messages;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         OBJECTIVE: DEFEAT BOSS                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupDefeatBoss(game) {
        // Prevent multiple boss setups
        const existingBoss = Array.from(game.enemies.values()).find(enemy => enemy.type === 'boss');
        if (existingBoss) {
            console.log(`🚫 Boss already exists: ${existingBoss.customName}, skipping setup`);
            
            // Set up objective with existing boss
            game.objective = {
                type: 'defeat_boss',
                bossId: existingBoss.id,
                bossName: existingBoss.customName,
                bossDescription: existingBoss.description || 'Destroy the enemy flagship'
            };
            return;
        }

        const bossList = [
            {
                name: 'Harbor Princess',
                shipClass: 'Harbor Princess',
                type: 'harbor_princess',
                health: 2000,
                armor: 200,
                stats: { speed: 0, range: 20, accuracy: 95, evasion: 0 },
                needsIsland: true,
                description: 'Immobile fortress with aircraft and coastal guns'
            },
            {
                name: 'Battleship Princess',
                shipClass: 'Battleship Princess',
                type: 'battleship_princess',
                health: 1800,
                armor: 180,
                stats: { speed: 3, range: 25, accuracy: 98, evasion: 20 },
                needsIsland: false,
                description: 'Heavily armored and armed battleship'
            },
            {
                name: 'Heavy Cruiser Princess',
                shipClass: 'Heavy Cruiser Princess',
                type: 'cruiser_princess',
                health: 1200,
                armor: 140,
                stats: { speed: 6, range: 18, accuracy: 92, evasion: 35 },
                needsIsland: false,
                description: 'Up-armed and armored heavy cruiser with extended range'
            },
            {
                name: 'Light Cruiser Princess',
                shipClass: 'Light Cruiser Princess',
                type: 'light_cruiser_princess',
                health: 900,
                armor: 100,
                stats: { speed: 8, range: 15, accuracy: 90, evasion: 45 },
                needsIsland: false,
                description: 'Fast and agile cruiser with enhanced firepower'
            },
            {
                name: 'Destroyer Princess',
                shipClass: 'Destroyer Princess',
                type: 'destroyer_princess',
                health: 600,
                armor: 80,
                stats: { speed: 12, range: 12, accuracy: 88, evasion: 60 },
                needsIsland: false,
                description: 'Extremely fast destroyer with long-range capabilities'
            }
        ];
        
        let selectedBoss;
        
        // Check if GM selected a specific boss
        if (game.setupState?.objectiveConfig?.selectedBoss) {
            selectedBoss = bossList.find(boss => boss.type === game.setupState.objectiveConfig.selectedBoss);
            console.log(`🎯 GM selected boss: ${selectedBoss ? selectedBoss.name : 'not found'}`);
        }
        
        // If no specific boss selected or not found, pick randomly
        if (!selectedBoss) {
            selectedBoss = bossList[Math.floor(Math.random() * bossList.length)];
            console.log(`🎲 Random boss selected: ${selectedBoss.name}`);
        }

        // *** NEW APPROACH: PROMOTE EXISTING ENEMY TO BOSS ***
        const availableEnemies = Array.from(game.enemies.values()).filter(enemy => 
            enemy.alive && !enemy.isOPFOR && enemy.type !== 'boss'
        );

        if (availableEnemies.length > 0) {
            console.log(`🔍 Found ${availableEnemies.length} existing enemies to promote to boss`);
            
            // Find the best candidate for promotion based on ship class
            let bossCandidate = availableEnemies[0];
            const preferredOrder = ['battleship', 'carrier', 'cruiser', 'destroyer', 'submarine'];
            
            for (const preferredType of preferredOrder) {
                const candidate = availableEnemies.find(enemy => 
                    enemy.shipClass.toLowerCase().includes(preferredType)
                );
                if (candidate) {
                    bossCandidate = candidate;
                    break;
                }
            }
            
            console.log(`👑 Promoting ${bossCandidate.customName} (${bossCandidate.shipClass}) to boss`);
            
            // Transform existing enemy into the selected boss type
            bossCandidate.type = 'boss';
            bossCandidate.bossType = selectedBoss.type;
            bossCandidate.shipClass = selectedBoss.shipClass;
            bossCandidate.customName = `[BOSS] ${selectedBoss.name}`;
            
            // Enhance stats to boss level
            const healthMultiplier = selectedBoss.health / bossCandidate.maxHealth;
            bossCandidate.maxHealth = selectedBoss.health;
            bossCandidate.currentHealth = selectedBoss.health;
            
            // Update other stats
            bossCandidate.stats = {
                ...bossCandidate.stats,
                ...selectedBoss.stats
            };
            
            // Handle position for Harbor Princess (needs island)
            if (selectedBoss.needsIsland) {
                let islandLocation = this.findOrCreateIslandForBoss(game);
                if (islandLocation) {
                    // Clear old position
                    const oldCell = game.getMapCell(bossCandidate.position);
                    if (oldCell) oldCell.occupant = null;
                    
                    // Move boss to island
                    bossCandidate.position = islandLocation;
                    bossCandidate.isImmobile = true;
                    
                    console.log(`🏝️ Moved Harbor Princess to island at ${islandLocation}`);
                }
            }
            
            // Set up objective
            game.objective = {
                type: 'defeat_boss',
                bossId: bossCandidate.id,
                bossName: selectedBoss.name,
                bossDescription: selectedBoss.description
            };
            
            console.log(`✅ Successfully promoted existing enemy to boss: ${selectedBoss.name}`);
            
            return {
                message: `👹 **BOSS ENHANCED!** ${bossCandidate.customName} has been reinforced and is now the primary target!\n` +
                        `💀 **Threat Level:** EXTREME\n` +
                        `📍 **Location:** ${bossCandidate.position}\n` +
                        `⚡ **Special Abilities:** ${selectedBoss.description}`
            };
            
        } else {
            // Only spawn a new boss if NO enemies exist at all
            console.log(`⚠️ No existing enemies found for promotion, spawning new boss: ${selectedBoss.name}`);
            
            // Find position for boss
            let bossPosition;
            if (selectedBoss.needsIsland) {
                bossPosition = this.findOrCreateIslandForBoss(game);
            } else {
                bossPosition = game.getRandomAISpawnPosition();
            }
            
            // Create new boss enemy (only as last resort)
            const bossEnemy = {
                id: `boss_${Date.now()}`,
                type: 'boss',
                bossType: selectedBoss.type,
                shipClass: selectedBoss.shipClass,
                customName: `[BOSS] ${selectedBoss.name}`,
                position: bossPosition,
                alive: true,
                currentHealth: selectedBoss.health,
                maxHealth: selectedBoss.health,
                stats: selectedBoss.stats,
                weapons: ['main', 'secondary'],
                onFire: false,
                flooding: false,
                fireTimer: 0,
                floodTimer: 0,
                damageControlCooldown: 0,
                isImmobile: selectedBoss.needsIsland
            };

            // Set facing direction based on spawn side (face toward player side +-90°)
            if (bossEnemy.direction === undefined) {
                const GameUtils = require('./utils/gameUtils');
                bossEnemy.direction = GameUtils.getSpawnFacingDirection(game.oppositeSide || 'right');
            }

            game.enemies.set(bossEnemy.id, bossEnemy);
            
            game.objective = {
                type: 'defeat_boss',
                bossId: bossEnemy.id,
                bossName: selectedBoss.name,
                bossDescription: selectedBoss.description
            };
            
            console.log(`👹 New boss spawned: ${selectedBoss.name} at ${bossPosition}`);
            
            return {
                message: `👹 **BOSS SPAWNED!** ${selectedBoss.name} has appeared!\n` +
                        `💀 **Threat Level:** EXTREME\n` +
                        `📍 **Location:** ${bossPosition}\n` +
                        `⚡ **Special Abilities:** ${selectedBoss.description}`
            };
        }
    }

    findOrCreateIslandForBoss(game) {
        // First, try to find an existing island
        for (const [coord, cell] of game.map.entries()) {
            if (cell.type === 'island' && !cell.occupant) {
                return coord;
            }
        }
        
        // If no suitable island found, create one
        const centerX = 45 + Math.floor(Math.random() * 15);
        const centerY = 30 + Math.floor(Math.random() * 15);
        
        const islandTiles = [
            {x: centerX, y: centerY},     // Center (boss location)
            {x: centerX-1, y: centerY},   // West
            {x: centerX+1, y: centerY},   // East
            {x: centerX, y: centerY-1},   // North
            {x: centerX, y: centerY+1}    // South
        ];
        
        for (const tile of islandTiles) {
            if (tile.x >= 0 && tile.x < 75 && tile.y >= 1 && tile.y <= 75) {
                const coord = game.generateExtendedCoordinate(tile.x, tile.y);
                const cell = game.getMapCell(coord);
                if (cell) {
                    cell.type = 'island';
                }
            }
        }
        
        const islandCenter = game.generateExtendedCoordinate(centerX, centerY);
        console.log(`🏝️ Created new island for Harbor Princess at ${islandCenter}`);
        
        return islandCenter;
    }
    
    checkDefeatBoss(game) {
        if (!game.objective?.bossId) return false;
        const boss = game.enemies.get(game.objective.bossId);
        return !boss || !boss.alive;
    }

    processDefeatBoss(game) {
        const messages = [];
        if (!game.objective) return messages;
        
        const boss = game.enemies.get(game.objective.bossId);
        if (boss && boss.alive) {
            const healthPercent = (boss.currentHealth / boss.maxHealth * 100);
            if (game.turnNumber % 5 === 0) { // Every 5 turns
                messages.push(`👹 **${game.objective.bossName}** health: ${boss.currentHealth}/${boss.maxHealth} (${healthPercent.toFixed(0)}%)`);
            }
        }
        
        return messages;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       OBJECTIVE: SALVAGE SUPPLIES                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupSalvageSupplies(game) {
        // Clear any existing salvage zones first to prevent duplicates
        for (const [coord, cell] of game.map.entries()) {
            if (cell.type === 'salvage_zone' || cell.type === 'salvage_radius') {
                cell.type = cell.originalType || 'ocean';
                cell.occupant = null;
            }
        }
        
        // Clear any existing salvage wrecks from enemies
        for (const [enemyId, enemy] of game.enemies.entries()) {
            if (enemy.id && enemy.id.startsWith('salvage_aux_')) {
                game.enemies.delete(enemyId);
            }
        }
        
        console.log('🧹 Cleared existing salvage zones and wrecks');
        
        const salvageZones = [];
        
        // Create exactly 3 salvage zones with destroyed auxiliary ships
        for (let i = 0; i < 3; i++) {
            let zoneLocation;
            let attempts = 0;
            
            // Find a valid ocean location for the zone
            do {
                const x = 15 + Math.floor(Math.random() * 45);
                const y = 15 + Math.floor(Math.random() * 45);
                zoneLocation = game.generateExtendedCoordinate(x, y);
                attempts++;
            } while (game.getMapCell(zoneLocation).type !== 'ocean' && attempts < 50);
            
            // Ensure zones are spaced apart (minimum 20 cells)
            if (salvageZones.length > 0) {
                let tooClose = false;
                for (const existingZone of salvageZones) {
                    const distance = game.calculateDistance(zoneLocation, existingZone.location);
                    if (distance < 20) {
                        tooClose = true;
                        break;
                    }
                }
                
                // If too close, try a few more times
                if (tooClose && attempts < 30) {
                    i--; // Retry this zone
                    continue;
                }
            }
            
            // Create the destroyed auxiliary ship and place it in the enemies map
            const destroyedAuxiliary = {
                id: `salvage_aux_${i}`,
                type: 'wreck',
                shipClass: 'Auxiliary', 
                customName: `Destroyed Supply Ship ${String.fromCharCode(65 + i)}`, // A, B, C
                position: zoneLocation,
                alive: false,
                currentHealth: 0,
                maxHealth: 100,
                isWreck: true,
                neutral: true,
                salvageZone: `Zone ${String.fromCharCode(65 + i)}`
            };
            
            // game.enemies.set(destroyedAuxiliary.id, destroyedAuxiliary);
            
            console.log(`💥 Created destroyed auxiliary "${destroyedAuxiliary.customName}" at ${zoneLocation} (${i + 1}/3)`);
            
            // Mark the center cell as salvage_zone (this will show the wreck)
            const centerCell = game.getMapCell(zoneLocation);
            if (centerCell) {
                centerCell.originalType = centerCell.type; // Save original type
                centerCell.type = 'salvage_zone';
                centerCell.occupant = 'wreck';
            }
            
            // Only mark the radius area around the center
            const zonePos = this.bot.coordToNumbers(zoneLocation);
            for (let dx = -5; dx <= 5; dx++) {
                for (let dy = -5; dy <= 5; dy++) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= 5 && distance > 0) { // Don't overwrite the center
                        const radiusX = zonePos.x + dx;
                        const radiusY = zonePos.y + dy;
                        
                        if (radiusX >= 0 && radiusX < 75 && radiusY >= 1 && radiusY <= 75) {
                            const radiusCoord = game.generateExtendedCoordinate(radiusX, radiusY);
                            const radiusCell = game.getMapCell(radiusCoord);
                            if (radiusCell && radiusCell.type === 'ocean') {
                                radiusCell.originalType = radiusCell.type; // Save original type
                                radiusCell.type = 'salvage_radius';
                            }
                        }
                    }
                }
            }
            
            // Create the salvage zone data
            salvageZones.push({
                id: `zone_${i}`,
                name: `Salvage Zone ${String.fromCharCode(65 + i)}`, // A, B, C
                location: zoneLocation,
                radius: 5,
                progress: 0,
                required: 5,
                currentPlayer: null,
                captured: false,
                wreck: destroyedAuxiliary
            });
        }
        
        // Set up the objective with the wrecks stored in the objective data
        game.objective = {
            type: 'salvage_supplies',
            salvageZones: salvageZones,
            zonesCompleted: 0,
            description: 'Salvage supplies from 3 destroyed auxiliary ships scattered across the battlefield',
            wrecks: salvageZones.map(zone => zone.wreck) // Store wrecks in objective for Objective panel display
        };
        
        console.log(`🔍 Successfully created exactly 3 salvage zones with destroyed auxiliaries at: ${salvageZones.map(z => z.location).join(', ')}`);
        console.log(`📊 Total zones created: ${salvageZones.length}`);
        
        // Double-check that we only have 3 zones
        if (salvageZones.length !== 3) {
            console.error(`❌ ERROR: Expected 3 salvage zones, but created ${salvageZones.length}`);
        }    
        return {
            message: `🚢 **SALVAGE MISSION ACTIVE**\n` +
                    `Three auxiliary ships have been destroyed and their supply caches are scattered!\n` +
                    `📍 **Zones:** ${salvageZones.map(z => `${z.name} (${z.location})`).join(', ')}\n` +
                    `⚓ Move within 5 cells of each destroyed ship to begin salvage operations.\n` +
                    `🕐 Each zone requires 5 turns of salvage work to complete.`
        };
    }

    checkSalvageSupplies(game) {
        return game.objective?.zonesCompleted >= 3;
    }

    processSalvageSupplies(game) {
        const messages = [];
        if (!game.objective) return messages;
        
        for (const zone of game.objective.salvageZones) {
            if (zone.captured) continue;
            
            const zonePos = this.bot.coordToNumbers(zone.location);
            let playerInZone = null;
            
            // Find player in zone
            for (const player of game.players.values()) {
                if (!player.alive) continue;
                const playerPos = this.bot.coordToNumbers(player.position);
                const distance = Math.sqrt(Math.pow(playerPos.x - zonePos.x, 2) + Math.pow(playerPos.y - zonePos.y, 2));
                
                if (distance <= zone.radius) {
                    playerInZone = player;
                    break;
                }
            }
            
            if (playerInZone) {
                zone.currentPlayer = playerInZone.shipClass;
                zone.progress++;
                
                if (zone.progress >= zone.required) {
                    zone.captured = true;
                    game.objective.zonesCompleted++;
                    messages.push(`✅ **${zone.name}** salvage completed by ${playerInZone.shipClass}!`);
                }
            } else {
                zone.currentPlayer = null;
            }
        }
        
        return messages;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      OBJECTIVE: CONVOY INTERCEPTION                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
    
    setupConvoyInterception(game) {
        // Find furthest point from players
        const playerPositions = Array.from(game.players.values()).map(p => this.bot.coordToNumbers(p.position));
        let spawnX = 90, spawnY = 50;
        
        if (playerPositions.length > 0) {
            const avgX = playerPositions.reduce((sum, pos) => sum + pos.x, 0) / playerPositions.length;
            const avgY = playerPositions.reduce((sum, pos) => sum + pos.y, 0) / playerPositions.length;
            
            // Spawn on opposite side of map from players
            spawnX = avgX < 37 ? 65 + Math.floor(Math.random() * 8) : 5 + Math.floor(Math.random() * 8);
            spawnY = Math.max(20, Math.min(80, Math.floor(avgY)));
        }
        
        // Create 5 enemy AX convoy ships in proximity
        const convoyShips = [];
        for (let i = 0; i < 5; i++) {
            const offsetX = Math.floor(Math.random() * 4) - 2; // -2 to +2
            const offsetY = Math.floor(Math.random() * 4) - 2;
            
            const destination = spawnX > 37 ? 
                game.generateExtendedCoordinate(5, spawnY + offsetY) : 
                game.generateExtendedCoordinate(70, spawnY + offsetY);
            
            const convoyShip = {
                id: `enemy_convoy_${i}`,
                name: `Enemy Supply ${i + 1}`,
                position: game.generateExtendedCoordinate(spawnX + offsetX, spawnY + offsetY),
                destination: destination,
                health: 60,
                maxHealth: 60,
                alive: true,
                speed: 5, // Fast moving
                captured: false,
                escaped: false
            };
            
            convoyShips.push(convoyShip);
        }
        
        game.objective = {
            type: 'convoy_interception',
            convoyShips: convoyShips,
            captureRadius: 2,
            shipsCaptured: 0,
            requiredCaptures: 3, // Need to capture 3 out of 5 ships
            startSide: spawnX > 50 ? 'right' : 'left'
        };
        
        console.log(`🚢 Enemy convoy: 5 AX ships spawned at furthest point, moving at 5 tiles/turn`);
    }

    checkConvoyInterception(game) {
        return game.objective?.shipsCaptured >= game.objective?.requiredCaptures;
    }

    processConvoyInterception(game) {
        const messages = [];
        if (!game.objective) return messages;
        
        for (const convoy of game.objective.convoyShips) {
            if (!convoy.alive || convoy.captured || convoy.escaped) continue;
            
            // Check if players are near convoy ship for capture
            let playersNearby = 0;
            const convoyPos = this.bot.coordToNumbers(convoy.position);
            
            for (const player of game.players.values()) {
                if (!player.alive) continue;
                const playerPos = this.bot.coordToNumbers(player.position);
                const distance = Math.sqrt(Math.pow(playerPos.x - convoyPos.x, 2) + Math.pow(playerPos.y - convoyPos.y, 2));
                
                if (distance <= game.objective.captureRadius) {
                    playersNearby++;
                }
            }
            
            if (playersNearby > 0) {
                // Convoy ship is being captured
                convoy.captured = true;
                game.objective.shipsCaptured++;
                messages.push(`⚓ **${convoy.name} captured!** (${game.objective.shipsCaptured}/${game.objective.requiredCaptures})`);
            } else {
                // Move convoy towards destination
                const destPos = this.bot.coordToNumbers(convoy.destination);
                const distanceToDestination = Math.sqrt(Math.pow(convoyPos.x - destPos.x, 2) + Math.pow(convoyPos.y - destPos.y, 2));
                
                if (distanceToDestination <= 3) {
                    // Convoy escaped
                    convoy.escaped = true;
                    messages.push(`💨 **${convoy.name} escaped!** Reached the destination zone.`);
                } else {
                    // Continue moving
                    const newPos = game.moveTowards(convoy.position, convoy.destination, convoy.speed);
                    convoy.position = newPos;
                    
                    if (game.turnNumber % 3 === 0) { // Every 3 turns
                        messages.push(`🚢 **${convoy.name}** moving to ${newPos} (${distanceToDestination.toFixed(1)} cells from escape)`);
                    }
                }
            }
        }
        
        // Check if mission failed (too many ships escaped)
        const shipsEscaped = game.objective.convoyShips.filter(ship => ship.escaped).length;
        const maxAllowedEscapes = game.objective.convoyShips.length - game.objective.requiredCaptures;
        
        if (shipsEscaped > maxAllowedEscapes) {
            messages.push(`❌ **Mission Failed!** Too many convoy ships escaped (${shipsEscaped} escaped, max allowed: ${maxAllowedEscapes})`);
            game.objectiveFailed = true;
        }
        
        return messages;
    }
}

module.exports = MissionObjectives;