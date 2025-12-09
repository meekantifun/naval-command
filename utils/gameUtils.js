// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               GAME UTILITIES                                 ║
// ║                    Common utility functions for the game                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class GameUtils {
    static generateExtendedCoordinate(x, y) {
        let columnLabel = '';
        let tempX = x;

        if (tempX < 26) {
            // A-Z (0-25)
            columnLabel = String.fromCharCode(65 + tempX);
        } else if (tempX < 702) {
            // AA-ZZ (26-701)
            tempX -= 26;
            const firstLetter = String.fromCharCode(65 + Math.floor(tempX / 26));
            const secondLetter = String.fromCharCode(65 + (tempX % 26));
            columnLabel = firstLetter + secondLetter;
        } else {
            // AAA and beyond (702+)
            tempX -= 702;
            const firstLetter = String.fromCharCode(65 + Math.floor(tempX / 676));
            tempX = tempX % 676;
            const secondLetter = String.fromCharCode(65 + Math.floor(tempX / 26));
            const thirdLetter = String.fromCharCode(65 + (tempX % 26));
            columnLabel = firstLetter + secondLetter + thirdLetter;
        }

        return columnLabel + y;
    }

    static getShipClassAbbreviation(shipClass) {
        // Handle various ship class formats
        const lowerClass = shipClass.toLowerCase();

        if (lowerClass.includes('battleship') || lowerClass.includes('bb')) return 'BB';
        if (lowerClass.includes('aircraft carrier') || lowerClass.includes('carrier') || lowerClass.includes('cv')) return 'CV';
        if (lowerClass.includes('heavy cruiser') || lowerClass.includes('ca')) return 'CA';
        if (lowerClass.includes('light cruiser') || lowerClass.includes('cl')) return 'CL';
        if (lowerClass.includes('destroyer') || lowerClass.includes('dd')) return 'DD';
        if (lowerClass.includes('submarine') || lowerClass.includes('ss')) return 'SS';
        if (lowerClass.includes('auxiliary') || lowerClass.includes('ax')) return 'AX';

        // For AI custom names, try to extract from the name itself
        if (lowerClass.includes('destroyer') || lowerClass.includes('dd')) return 'DD';
        if (lowerClass.includes('cruiser')) {
            if (lowerClass.includes('heavy') || lowerClass.includes('ca')) return 'CA';
            if (lowerClass.includes('light') || lowerClass.includes('cl')) return 'CL';
            return 'CA'; // Default to heavy cruiser
        }

        return 'UN'; // Unknown
    }

    static getEntityAtPosition(game, coord) {
        // Check players first
        for (const player of game.players.values()) {
            if (player.position === coord && player.alive) {
                return { type: 'player', data: player };
            }
        }

        // Check destroyed players
        for (const player of game.players.values()) {
            if (player.position === coord && !player.alive) {
                return { type: 'destroyed_player', data: player };
            }
        }

        // Check enemies
        for (const enemy of game.enemies.values()) {
            if (enemy.position === coord && enemy.alive) {
                return { type: 'enemy', data: enemy };
            }
        }

        // Check destroyed enemies
        for (const enemy of game.enemies.values()) {
            if (enemy.position === coord && !enemy.alive) {
                return { type: 'destroyed_enemy', data: enemy };
            }
        }

        // Check aircraft
        for (const aircraft of game.aircraft?.values() || []) {
            if (aircraft.position === coord && aircraft.alive) {
                return { type: 'aircraft', data: aircraft };
            }
        }

        // Check mines
        for (const mine of game.mines || []) {
            if (mine.position === coord) {
                return { type: 'mine', data: mine };
            }
        }

        return null;
    }

    static shouldUpdateMapForStatusChange(oldStatus, newStatus) {
        const fireChanged = (oldStatus.onFire !== newStatus.onFire) ||
                           (oldStatus.fireTimer > 0) !== (newStatus.fireTimer > 0);
        const floodChanged = (oldStatus.flooding !== newStatus.flooding) ||
                            (oldStatus.floodTimer > 0) !== (newStatus.floodTimer > 0);

        return fireChanged || floodChanged;
    }

    static getSpawnLocation(game, location) {
        let attempts = 0;
        let spawnPosition = null;

        while (attempts < 50 && !spawnPosition) {
            let x, y;

            switch (location) {
                case 'enemy_side':
                    // Use dynamic opposite side based on player spawn
                    const coords = GameUtils.getCoordinatesForSide(game.oppositeSide || 'right');
                    x = coords.x;
                    y = coords.y;
                    break;
                case 'player_side':
                    // Use dynamic player spawn side
                    const playerCoords = GameUtils.getCoordinatesForSide(game.spawnSide || 'left');
                    x = playerCoords.x;
                    y = playerCoords.y;
                    break;
                case 'north':
                    x = Math.floor(Math.random() * 100);
                    y = Math.floor(Math.random() * 25) + 1; // Top quarter
                    break;
                case 'south':
                    x = Math.floor(Math.random() * 100);
                    y = Math.floor(Math.random() * 25) + 76; // Bottom quarter
                    break;
                case 'center':
                    x = 35 + Math.floor(Math.random() * 30); // Center area
                    y = 35 + Math.floor(Math.random() * 30);
                    break;
                case 'random':
                default:
                    x = Math.floor(Math.random() * 100);
                    y = Math.floor(Math.random() * 100) + 1;
                    break;
            }

            const testPosition = GameUtils.generateExtendedCoordinate(x, y);
            const cell = game.getMapCell(testPosition);

            // Check if position is valid (ocean or reef, not occupied)
            if (cell && (cell.type === 'ocean' || cell.type === 'reef') && !cell.occupant) {
                // Double-check no entity is already there
                let occupied = false;
                for (const player of game.players.values()) {
                    if (player.position === testPosition) {
                        occupied = true;
                        break;
                    }
                }
                for (const enemy of game.enemies.values()) {
                    if (enemy.position === testPosition) {
                        occupied = true;
                        break;
                    }
                }

                if (!occupied) {
                    spawnPosition = testPosition;
                }
            }

            attempts++;
        }

        return spawnPosition || game.getRandomAISpawnPosition(); // Fallback
    }

    static getCoordinatesForSide(side) {
        switch (side) {
            case 'left':
                return {
                    x: Math.floor(Math.random() * 15), // Left side (columns 0-14)
                    y: Math.floor(Math.random() * 75) + 1
                };
            case 'right':
                return {
                    x: 60 + Math.floor(Math.random() * 15), // Right side (columns 60-74)
                    y: Math.floor(Math.random() * 75) + 1
                };
            case 'top':
                return {
                    x: Math.floor(Math.random() * 75),
                    y: Math.floor(Math.random() * 15) + 1 // Top area (rows 1-15)
                };
            case 'bottom':
                return {
                    x: Math.floor(Math.random() * 75),
                    y: 60 + Math.floor(Math.random() * 15) // Bottom area (rows 60-74)
                };
            case 'center':
            case 'middle':
                return {
                    x: 25 + Math.floor(Math.random() * 25), // Middle area (columns 25-49)
                    y: 25 + Math.floor(Math.random() * 25) + 1 // Middle area (rows 26-50)
                };
            default:
                return {
                    x: Math.floor(Math.random() * 75),
                    y: Math.floor(Math.random() * 75) + 1
                };
        }
    }

    static getSpawnFacingDirection(spawnSide) {
        // Get random direction within ±20° of opposite side
        // Note: SVG rotation is CLOCKWISE (0° = East/Right, 90° = South/Down, 180° = West/Left, 270° = North/Up)
        let minAngle, maxAngle;

        switch (spawnSide) {
            case 'left':
                // Spawn on left (west side), face toward right (east): 0° ±20° (wrapping)
                minAngle = 340;
                maxAngle = 380; // 20° + 360°
                break;
            case 'right':
                // Spawn on right (east side), face toward left (west): 180° ±20°
                minAngle = 160;
                maxAngle = 200;
                break;
            case 'top':
                // Spawn on top (north side), face toward bottom (south): 90° ±20°
                minAngle = 70;
                maxAngle = 110;
                break;
            case 'bottom':
                // Spawn on bottom (south side), face toward top (north): 270° ±20°
                minAngle = 250;
                maxAngle = 290;
                break;
            default:
                // Default: face East ±20° (wrapping)
                minAngle = 340;
                maxAngle = 380;
        }

        // Generate random angle in the specified range
        let finalDirection;
        if (maxAngle > 360) {
            // Handle wrapping case (e.g., 340° to 380°)
            const range = maxAngle - minAngle;
            finalDirection = minAngle + (Math.random() * range);
            if (finalDirection >= 360) finalDirection -= 360;
        } else {
            // Normal case
            finalDirection = minAngle + (Math.random() * (maxAngle - minAngle));
        }

        return Math.floor(finalDirection);
    }

    static getLocationDisplayName(location) {
        const names = {
            'random': 'Random Location',
            'enemy_side': 'Enemy Side (Right)',
            'player_side': 'Player Side (Left)',
            'north': 'Northern Waters',
            'south': 'Southern Waters',
            'center': 'Central Area'
        };
        return names[location] || 'Unknown';
    }

    static getShipDisplayName(shipType) {
        const names = {
            'destroyer': '🚢 Destroyer',
            'light_cruiser': '🚢 Light Cruiser',
            'cruiser': '🚢 Heavy Cruiser',
            'battleship': '⚓ Battleship',
            'carrier': '✈️ Aircraft Carrier',
            'submarine': '🫧 Submarine',
            'random': '🎲 Random Ship',
            'boss': '👹 BOSS ENEMY'
        };
        return names[shipType] || 'Unknown Ship';
    }

    static numberToColumn(num) {
        let result = '';
        while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26) - 1;
        }
        return result;
    }

    static getAIDisplayName(ai) {
        const customName = ai.customName || ai.shipClass;

        // Check if the custom name already has a class abbreviation in brackets
        if (customName.match(/^\[[A-Z]{2,3}\]/)) {
            // Already has class abbreviation, use as-is
            return customName;
        } else {
            // Add class abbreviation
            const classAbbr = GameUtils.getShipClassAbbreviation(ai.shipClass);
            return `[${classAbbr}] ${customName}`;
        }
    }

    static getPlayerDisplayName(player) {
        const classAbbr = GameUtils.getShipClassAbbreviation(player.shipClass);
        const playerName = player.displayName || player.username || 'Unknown Player';

        // Remove any existing class tags from the name
        const cleanName = playerName.replace(/^\{[A-Z]+\}\s*/, '').replace(/^\[[A-Z]+\]\s*/, '');

        return `[${classAbbr}] ${cleanName}`;
    }

    static getEntityName(entity) {
        // Get name without class abbreviations - for use in messages
        // Works for both players and AI/enemies
        if (entity.displayName || entity.username) {
            // This is a player
            const name = entity.displayName || entity.username;
            // Remove any existing class tags from the name
            return name.replace(/^\{[A-Z]+\}\s*/, '').replace(/^\[[A-Z]+\]\s*/, '');
        } else {
            // This is AI/enemy - use customName or fallback to shipClass
            return entity.customName || entity.shipClass || 'Unknown';
        }
    }

    static findNearestPlayer(ai, game) {
        let nearest = null;
        let minDistance = Infinity;
        let targets = [];

        // First, collect all alive players with their distances
        for (const player of game.players.values()) {
            if (!player.alive) continue;
            const distance = game.calculateDistance(ai.position, player.position);
            targets.push({ player, distance });
        }

        if (targets.length === 0) return null;

        // Sort by distance
        targets.sort((a, b) => a.distance - b.distance);

        // Return the closest target
        return targets[0].player;
    }

    static findNearestPlayerAircraft(ai, game) {
        let nearest = null;
        let minDistance = Infinity;
        let targets = [];

        // Collect all alive player aircraft with their distances
        for (const aircraft of game.aircraft.values()) {
            if (!aircraft.alive) continue;

            // Check if this aircraft belongs to a player (has a carrierID that matches a player)
            const carrier = game.players.get(aircraft.carrierID);
            if (!carrier) continue; // Skip if not a player aircraft

            const distance = game.calculateDistance(ai.position, aircraft.position);
            targets.push({ aircraft, distance });
        }

        if (targets.length === 0) return null;

        // Sort by distance
        targets.sort((a, b) => a.distance - b.distance);

        // Return the closest player aircraft
        return targets[0].aircraft;
    }

    static calculateShipEvasion(speedKnots, tonnage) {
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

        return finalEvasion;
    }
}

module.exports = GameUtils;