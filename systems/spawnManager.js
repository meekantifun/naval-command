// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             SPAWN MANAGER                                    ║
// ║                    Enemy and entity spawning system                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const GameUtils = require('../utils/gameUtils');
const AIConfig = require('./aiConfig');

class SpawnManager {
    constructor(bot) {
        this.bot = bot;
        this.aiConfig = new AIConfig();
    }

    async spawnConfiguredEnemies(game) {
        if (!game.setupState?.customEnemies) return;

        const enemies = game.setupState.customEnemies;
        const spawnPromises = [];

        // Spawn destroyers
        for (let i = 0; i < enemies.destroyers; i++) {
            spawnPromises.push(this.spawnEnemy(game, 'destroyer'));
        }

        // Spawn cruisers
        for (let i = 0; i < enemies.cruisers; i++) {
            spawnPromises.push(this.spawnEnemy(game, 'cruiser'));
        }

        // Spawn battleships
        for (let i = 0; i < enemies.battleships; i++) {
            spawnPromises.push(this.spawnEnemy(game, 'battleship'));
        }

        // Spawn carriers
        for (let i = 0; i < enemies.carriers; i++) {
            spawnPromises.push(this.spawnEnemy(game, 'carrier'));
        }

        // Spawn submarines
        for (let i = 0; i < enemies.submarines; i++) {
            spawnPromises.push(this.spawnEnemy(game, 'submarine'));
        }

        await Promise.all(spawnPromises);

        console.log(`Spawned ${spawnPromises.length} configured enemies for game ${game.channelId}`);
    }

    async spawnEnemy(game, shipType, customConfig = null) {
        const enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let enemyConfig;
        if (customConfig) {
            enemyConfig = customConfig;
        } else {
            enemyConfig = this.aiConfig.getRandomShipByType(shipType);
        }

        if (!enemyConfig) {
            console.error(`No configuration found for ship type: ${shipType}`);
            return null;
        }

        // Create enemy entity
        const enemy = {
            id: enemyId,
            shipClass: enemyConfig.shipClass || enemyConfig.class,
            customName: enemyConfig.customName || enemyConfig.shipClass,
            hp: enemyConfig.hp || 100,
            maxHp: enemyConfig.hp || 100,
            armor: enemyConfig.armor || 0,
            speed: enemyConfig.speed || 25,
            displacement: enemyConfig.displacement || 5000,
            weapons: enemyConfig.weapons || [],
            secondaryWeapons: enemyConfig.secondaryWeapons || [],
            aaWeapons: enemyConfig.aaWeapons || [],
            position: null,
            alive: true,
            actionPoints: 3,
            canMove: true,
            canAttack: true,
            faction: 'enemy',
            isAI: true,
            isOPFOR: false,
            statusEffects: {},
            // AI behavior settings
            aiPersonality: enemyConfig.aiPersonality || 'aggressive',
            preferredRange: enemyConfig.preferredRange || 'medium',
            aggroRadius: enemyConfig.aggroRadius || 15
        };

        // Add carrier-specific properties
        if (shipType === 'carrier') {
            enemy.hangar = enemyConfig.hangar || 36;
            enemy.maxHangar = enemyConfig.hangar || 36;
            enemy.squadrons = enemyConfig.squadrons || [];
        }

        // Find spawn position
        const spawnLocation = enemyConfig.spawnLocation || 'enemy_side';
        const position = GameUtils.getSpawnLocation(game, spawnLocation);

        if (!position) {
            console.error(`Could not find spawn position for enemy ${enemyId}`);
            return null;
        }

        enemy.position = position;

        // Set facing direction based on spawn side (face toward player side +-90°)
        if (enemy.direction === undefined) {
            enemy.direction = GameUtils.getSpawnFacingDirection(game.oppositeSide || 'right');
        }

        // Add to game
        game.enemies.set(enemyId, enemy);

        console.log(`✨ Spawned ${enemy.customName} at ${position}`);
        return enemy;
    }

    async spawnBossEnemy(game, bossType = 'harbor_princess') {
        const bossConfigs = {
            'harbor_princess': {
                shipClass: 'Harbor Princess',
                customName: '[BB] Harbor Princess',
                hp: 500,
                armor: 200,
                speed: 20,
                displacement: 65000,
                weapons: [
                    { name: '16-inch/45 Mark 6 (Triple)', damage: 120, range: 25, accuracy: 0.75, type: 'AP' },
                    { name: '16-inch/45 Mark 6 (Triple)', damage: 120, range: 25, accuracy: 0.75, type: 'AP' },
                    { name: '16-inch/45 Mark 6 (Triple)', damage: 120, range: 25, accuracy: 0.75, type: 'AP' }
                ],
                secondaryWeapons: [
                    { name: '5-inch/38 DP (Twin)', damage: 45, range: 12, accuracy: 0.80, type: 'HE' },
                    { name: '5-inch/38 DP (Twin)', damage: 45, range: 12, accuracy: 0.80, type: 'HE' }
                ],
                aaWeapons: [
                    { caliber: '127mm', mount: 'twin', count: 6 },
                    { caliber: '40mm', mount: 'quad', count: 10 },
                    { caliber: '20mm', mount: 'single', count: 20 }
                ],
                hangar: 180,
                squadrons: [
                    { type: 'fighter', count: 18, name: 'Princess Fighter Squadron' },
                    { type: 'dive_bomber', count: 18, name: 'Princess Dive Bomber Squadron' },
                    { type: 'torpedo_bomber', count: 18, name: 'Princess Torpedo Squadron' }
                ],
                aiPersonality: 'defensive',
                preferredRange: 'long',
                aggroRadius: 20,
                spawnLocation: 'center'
            }
        };

        const bossConfig = bossConfigs[bossType];
        if (!bossConfig) {
            console.error(`Unknown boss type: ${bossType}`);
            return null;
        }

        const boss = await this.spawnEnemy(game, 'boss', bossConfig);

        if (boss) {
            boss.isBoss = true;
            console.log(`👹 BOSS SPAWNED: ${boss.customName} has entered the battlefield!`);
        }

        return boss;
    }

    async spawnQRFReinforcements(game, playerId, reinforcementType = 'destroyer') {
        const qrfConfigs = {
            'destroyer': {
                shipClass: 'Fletcher Class Destroyer',
                customName: 'QRF Destroyer',
                hp: 120,
                armor: 15,
                speed: 35,
                displacement: 2500,
                weapons: [
                    { name: '5-inch/38 DP (Single)', damage: 40, range: 15, accuracy: 0.75, type: 'HE' }
                ],
                secondaryWeapons: [
                    { name: '21-inch Torpedo (Quintuple)', damage: 200, range: 8, accuracy: 0.60, type: 'torpedo' }
                ],
                aaWeapons: [
                    { caliber: '127mm', mount: 'single', count: 5 },
                    { caliber: '40mm', mount: 'twin', count: 5 },
                    { caliber: '20mm', mount: 'single', count: 7 }
                ]
            },
            'cruiser': {
                shipClass: 'Brooklyn Class Light Cruiser',
                customName: 'QRF Cruiser',
                hp: 200,
                armor: 50,
                speed: 32,
                displacement: 9700,
                weapons: [
                    { name: '6-inch/47 Mark 16 (Triple)', damage: 60, range: 20, accuracy: 0.80, type: 'HE' }
                ],
                secondaryWeapons: [
                    { name: '5-inch/25 (Single)', damage: 35, range: 12, accuracy: 0.75, type: 'HE' }
                ],
                aaWeapons: [
                    { caliber: '127mm', mount: 'single', count: 8 },
                    { caliber: '28mm', mount: 'quad', count: 8 }
                ]
            }
        };

        const qrfConfig = qrfConfigs[reinforcementType];
        if (!qrfConfig) {
            console.error(`Unknown QRF type: ${reinforcementType}`);
            return null;
        }

        // Create QRF unit with player ownership
        const qrf = {
            ...qrfConfig,
            id: playerId, // Use player ID
            position: null,
            alive: true,
            actionPoints: 3,
            canMove: true,
            canAttack: true,
            faction: 'player',
            isQRF: true,
            statusEffects: {},
            displayName: `QRF ${reinforcementType}`,
            username: `QRF-${playerId.slice(-4)}`
        };

        // Find spawn position on player side
        const position = GameUtils.getSpawnLocation(game, 'player_side');
        if (!position) {
            console.error(`Could not find QRF spawn position for player ${playerId}`);
            return null;
        }

        qrf.position = position;

        // Add to game as player
        game.players.set(playerId, qrf);

        console.log(`🚁 QRF Deployed: ${qrf.customName} at ${position} for player ${playerId}`);
        return qrf;
    }

    getRandomSpawnPosition(game, side = 'enemy') {
        const locations = {
            'enemy': ['enemy_side', 'north', 'south'],
            'player': ['player_side'],
            'neutral': ['center', 'north', 'south'],
            'random': ['random']
        };

        const possibleLocations = locations[side] || locations['random'];
        const randomLocation = possibleLocations[Math.floor(Math.random() * possibleLocations.length)];

        return GameUtils.getSpawnLocation(game, randomLocation);
    }

    async spawnRandomEnemyWave(game, waveSize = 3, difficultyMultiplier = 1.0) {
        const shipTypes = ['destroyer', 'cruiser', 'battleship', 'carrier', 'submarine'];
        const spawnPromises = [];

        for (let i = 0; i < waveSize; i++) {
            const randomType = shipTypes[Math.floor(Math.random() * shipTypes.length)];

            // Apply difficulty multiplier to enemy stats
            const enemyPromise = this.spawnEnemy(game, randomType).then(enemy => {
                if (enemy && difficultyMultiplier !== 1.0) {
                    enemy.hp = Math.floor(enemy.hp * difficultyMultiplier);
                    enemy.maxHp = enemy.hp;

                    // Boost weapon damage for higher difficulty
                    if (enemy.weapons) {
                        enemy.weapons.forEach(weapon => {
                            weapon.damage = Math.floor(weapon.damage * difficultyMultiplier);
                        });
                    }
                }
                return enemy;
            });

            spawnPromises.push(enemyPromise);
        }

        const spawnedEnemies = await Promise.all(spawnPromises);
        const validEnemies = spawnedEnemies.filter(enemy => enemy !== null);

        console.log(`🌊 Spawned enemy wave: ${validEnemies.length} ships (difficulty: ${difficultyMultiplier}x)`);
        return validEnemies;
    }
}

module.exports = SpawnManager;