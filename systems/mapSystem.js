// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               MAP SYSTEM                                     ║
// ║                    Map generation and display management                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const GameUtils = require('../utils/gameUtils');
const sharp = require('sharp');
const fs = require('fs');

class MapSystem {
    constructor(bot) {
        this.bot = bot;
    }

    async generateMapImage(game, gridWidth = 100, gridHeight = 100) {
        const cellSize = 10; // Back to original cell size
        const mapWidth = gridWidth * cellSize;
        const mapHeight = gridHeight * cellSize;

        // Create base ocean background - light blue like reference image
        let mapBuffer = await sharp({
            create: {
                width: mapWidth,
                height: mapHeight,
                channels: 3,
                background: { r: 200, g: 230, b: 250 } // Very light blue matching reference
            }
        }).png().toBuffer();

        // Generate clean map with only grid and coordinates
        const svg = this.generateCleanMapSVG(game, mapWidth, mapHeight, cellSize);

        try {
            const svgBuffer = Buffer.from(svg);
            mapBuffer = await sharp(mapBuffer)
                .composite([{ input: svgBuffer, top: 0, left: 0 }])
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Error compositing map SVG:', error);
        }

        return mapBuffer;
    }

    generateCleanMapSVG(game, width, height, cellSize) {
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

        // Add transparent background rectangle to ensure proper compositing
        svg += `<rect width="100%" height="100%" fill="none" fill-opacity="0"/>`;

        // Add grid lines only
        svg += this.generateGridSVG(width, height, cellSize);

        // Add coordinate labels only
        svg += this.generateCoordinatesSVG(width, height, cellSize);

        // Add terrain if it exists (both custom maps with game.map.terrain and procedural maps with game.map)
        if ((game.map && game.map.terrain && game.map.terrain.size > 0) ||
            (game.map && game.map.size > 0)) {
            svg += this.generateTerrainSVG(game, cellSize);
        }

        // Only add entities if they exist and have positions
        if ((game.players && game.players.size > 0) ||
            (game.enemies && game.enemies.size > 0) ||
            (game.aircraft && game.aircraft.size > 0)) {
            svg += this.generateEntitiesSVG(game, cellSize);
        }

        // Add terrain names (cities/towns) on top of everything
        svg += this.generateTerrainNamesSVG(game, cellSize);

        svg += '</svg>';
        return svg;
    }

    generateMapSVG(game, width, height, cellSize) {
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

        // Add grid
        svg += this.generateGridSVG(width, height, cellSize);

        // Add terrain features
        svg += this.generateTerrainSVG(game, cellSize);

        // Add entities
        svg += this.generateEntitiesSVG(game, cellSize);

        // Add terrain names (cities/towns) on top
        svg += this.generateTerrainNamesSVG(game, cellSize);

        // Add coordinate labels
        svg += this.generateCoordinatesSVG(width, height, cellSize);

        svg += '</svg>';
        return svg;
    }

    generateGridSVG(width, height, cellSize) {
        let svg = '';

        // Vertical lines - subtle white grid
        for (let x = 0; x <= width; x += cellSize) {
            svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ffffff" stroke-width="0.5" opacity="0.4"/>`;
        }

        // Horizontal lines - subtle white grid
        for (let y = 0; y <= height; y += cellSize) {
            svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#ffffff" stroke-width="0.5" opacity="0.4"/>`;
        }

        return svg;
    }

    generateTerrainSVG(game, cellSize) {
        let svg = '';

        // Support both procedurally generated maps (game.map) and custom maps (game.map.terrain)
        let terrainSource = null;

        if (game.map && game.map.terrain) {
            // Custom maps store terrain in game.map.terrain
            terrainSource = game.map.terrain;
        } else if (game.map) {
            // Procedurally generated maps store terrain directly in game.map
            terrainSource = game.map;
        }

        if (terrainSource) {
            for (const [coord, terrain] of terrainSource.entries()) {
                // Skip ocean cells - they're the default background
                if (terrain.type === 'ocean') continue;

                const pos = this.coordToPixel(coord, cellSize);
                const cellX = pos.x - cellSize/2;
                const cellY = pos.y - cellSize/2;

                // Fill entire grid cells exactly like the reference image
                switch (terrain.type) {
                    case 'mountain':
                        // Dark forest green (darkest part of islands)
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#1B4A2B" stroke="none"/>`;
                        break;
                    case 'forest':
                        // Medium forest green (main island areas)
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#2D5F3F" stroke="none"/>`;
                        break;
                    case 'grassland':
                        // Light green (coastal island areas)
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#4A7C59" stroke="none"/>`;
                        break;
                    case 'shallow':
                        // Light blue/teal shallow water exactly like reference
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#7BB3D9" stroke="none"/>`;
                        break;
                    // Legacy compatibility
                    case 'island_core':
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#1B4A2B" stroke="none"/>`;
                        break;
                    case 'island_outer':
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#4A7C59" stroke="none"/>`;
                        break;
                    case 'shallows':
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#7BB3D9" stroke="none"/>`;
                        break;
                    case 'island':
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#2D5F3F" stroke="none"/>`;
                        break;
                    case 'reef':
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#FF6347" stroke="none"/>`;
                        break;
                    case 'city':
                        // City: Island background + Multiple gray buildings
                        // First render island background
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#2D5F3F" stroke="none"/>`;
                        // Then render city buildings on top
                        const citySize = cellSize * 0.6;
                        svg += `<g>
                                <rect x="${pos.x - citySize/3}" y="${pos.y - citySize/2.5}" width="${citySize/4}" height="${citySize/2}" fill="#808080" stroke="#404040" stroke-width="0.5"/>
                                <rect x="${pos.x - citySize/12}" y="${pos.y - citySize/2}" width="${citySize/5}" height="${citySize/1.8}" fill="#606060" stroke="#303030" stroke-width="0.5"/>
                                <rect x="${pos.x + citySize/6}" y="${pos.y - citySize/3}" width="${citySize/6}" height="${citySize/2.5}" fill="#707070" stroke="#353535" stroke-width="0.5"/>
                                </g>`;
                        break;
                    case 'town':
                        // Town: Island background + Smaller brown houses with roofs
                        // First render island background
                        svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}"
                                fill="#2D5F3F" stroke="none"/>`;
                        // Then render town buildings on top
                        const townSize = cellSize * 0.5;
                        svg += `<g>
                                <rect x="${pos.x - townSize/4}" y="${pos.y - townSize/4}" width="${townSize/3}" height="${townSize/3}" fill="#8B4513" stroke="#654321" stroke-width="0.5"/>
                                <polygon points="${pos.x - townSize/4},${pos.y - townSize/4} ${pos.x},${pos.y - townSize/2} ${pos.x + townSize/12},${pos.y - townSize/4}" fill="#A0522D" stroke="#654321" stroke-width="0.5"/>
                                <rect x="${pos.x + townSize/8}" y="${pos.y - townSize/6}" width="${townSize/4}" height="${townSize/4}" fill="#8B4513" stroke="#654321" stroke-width="0.5"/>
                                <polygon points="${pos.x + townSize/8},${pos.y - townSize/6} ${pos.x + townSize/4},${pos.y - townSize/3} ${pos.x + townSize/2.5},${pos.y - townSize/6}" fill="#A0522D" stroke="#654321" stroke-width="0.5"/>
                                </g>`;
                        break;
                }
            }
        }

        return svg;
    }

    generateEntitiesSVG(game, cellSize) {
        let svg = '';

        // Only add players if they exist and have positions
        if (game.players && game.players.size > 0) {
            for (const player of game.players.values()) {
                if (player.position && player.alive) {
                    const pos = this.coordToPixel(player.position, cellSize);
                    const color = '#00FF00'; // Always green for alive players
                    const symbol = this.getShipSymbol(player.shipClass);
                    const direction = player.direction || 0; // Default to 0° (East) if no direction set

                    svg += this.generateShipIcon(pos.x, pos.y, cellSize, color, symbol, direction);
                }
            }
        }

        // Only add enemies if they exist and have positions
        if (game.enemies && game.enemies.size > 0) {
            for (const enemy of game.enemies.values()) {
                if (enemy.position && enemy.alive) {
                    const pos = this.coordToPixel(enemy.position, cellSize);
                    const color = '#FF0000'; // Always red for alive enemies
                    const symbol = this.getShipSymbol(enemy.shipClass);
                    const direction = enemy.direction || 0; // Default to 0° (East) if no direction set

                    svg += this.generateShipIcon(pos.x, pos.y, cellSize, color, symbol, direction);
                }
            }
        }

        // Only add aircraft if they exist and have positions
        if (game.aircraft && game.aircraft.size > 0) {
            for (const aircraft of game.aircraft.values()) {
                if (aircraft.position && aircraft.alive) {
                    const pos = this.coordToPixel(aircraft.position, cellSize);
                    const aircraftType = aircraft.type || 'fighter'; // Default to fighter if no type set
                    svg += this.generateAircraftIcon(pos.x, pos.y, cellSize, aircraftType);
                }
            }
        }

        return svg;
    }

    generateCoordinatesSVG(width, height, cellSize) {
        let svg = '';

        // Column labels (A, B, C, etc.) - more visible
        for (let x = 0; x < width / cellSize; x++) {
            const label = GameUtils.numberToColumn(x);
            svg += `<text x="${x * cellSize + cellSize/2}" y="15" text-anchor="middle" font-size="12" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">${label}</text>`;
        }

        // Row labels (1, 2, 3, etc.) - more visible
        for (let y = 1; y <= height / cellSize; y++) {
            svg += `<text x="8" y="${y * cellSize - cellSize/2 + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">${y}</text>`;
        }

        return svg;
    }

    generateTerrainNamesSVG(game, cellSize) {
        let svg = '';

        // Iterate through the map directly (for procedurally generated maps)
        if (game.map) {
            for (const [coord, cell] of game.map.entries()) {
                // Only render names for cities and towns that have names
                if ((cell.type === 'city' || cell.type === 'town') && cell.name) {
                    const pos = this.coordToPixel(coord, cellSize);
                    const fontSize = cell.type === 'city' ? cellSize / 2.5 : cellSize / 3;
                    const yOffset = cell.type === 'city' ? cellSize * 0.6 : cellSize * 0.5;

                    // Add text with background for better readability
                    svg += `<text x="${pos.x}" y="${pos.y + yOffset}"
                                 text-anchor="middle"
                                 font-size="${fontSize}"
                                 font-weight="bold"
                                 fill="#FFFFFF"
                                 stroke="#000000"
                                 stroke-width="${fontSize/12}"
                                 paint-order="stroke">${cell.name}</text>`;
                }
            }
        }

        return svg;
    }

    coordToPixel(coord, cellSize) {
        // Parse coordinate like "A1", "BB25", etc.
        const match = coord.match(/^([A-Z]+)(\d+)$/);
        if (!match) return { x: 0, y: 0 };

        const colStr = match[1];
        const row = parseInt(match[2]);

        // Convert column letters to number
        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
            col = col * 26 + (colStr.charCodeAt(i) - 64);
        }
        col--; // Convert to 0-based

        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize - cellSize / 2
        };
    }

    getShipSymbol(shipClass) {
        const symbols = {
            'destroyer': 'DD',
            'light_cruiser': 'CL',
            'cruiser': 'CA',
            'heavy_cruiser': 'CA',
            'battleship': 'BB',
            'carrier': 'CV',
            'aircraft_carrier': 'CV',
            'submarine': 'SS'
        };

        const classLower = shipClass.toLowerCase();
        for (const [key, symbol] of Object.entries(symbols)) {
            if (classLower.includes(key)) {
                return symbol;
            }
        }

        return 'UN'; // Unknown
    }

    generateShipIcon(x, y, cellSize, color, symbol, direction) {
        // Create a triangular ship icon that points in the direction of movement
        // The base triangle points East (0°), then we rotate it based on the ship's direction

        const size = cellSize * 0.4; // Make the ship icon slightly smaller than the cell

        // Define triangle points for a ship pointing East (right)
        // Point: tip of the triangle, Base: back of the ship
        const tipX = x + size;
        const tipY = y;
        const baseX = x - size;
        const baseY1 = y - size * 0.6;
        const baseY2 = y + size * 0.6;

        // Create SVG group with rotation around the center point
        let svg = `<g transform="rotate(${direction} ${x} ${y})">`;

        // Triangle ship hull
        svg += `<polygon points="${tipX},${tipY} ${baseX},${baseY1} ${baseX},${baseY2}" `;
        svg += `fill="${color}" stroke="#000000" stroke-width="1"/>`;

        // Ship symbol text (rotated with the ship)
        svg += `<text x="${x}" y="${y + 2}" text-anchor="middle" font-size="6" fill="#000000" `;
        svg += `font-weight="bold">${symbol}</text>`;

        svg += '</g>';

        return svg;
    }

    generateAircraftIcon(x, y, cellSize, aircraftType) {
        // Create a triangular aircraft icon with different orientations and labels based on type
        const size = cellSize * 0.3;
        let svg = '';
        let label = '';
        let points = '';

        switch (aircraftType) {
            case 'fighter':
                // Triangle pointing upward for fighters
                label = 'FF';
                points = `${x},${y - size} ${x - size * 0.5},${y + size * 0.5} ${x + size * 0.5},${y + size * 0.5}`;
                break;

            case 'dive_bomber':
                // Triangle pointing left for dive bombers
                label = 'DB';
                points = `${x - size},${y} ${x + size * 0.5},${y - size * 0.5} ${x + size * 0.5},${y + size * 0.5}`;
                break;

            case 'torpedo_bomber':
                // Triangle pointing downward for torpedo bombers
                label = 'TB';
                points = `${x},${y + size} ${x - size * 0.5},${y - size * 0.5} ${x + size * 0.5},${y - size * 0.5}`;
                break;

            default:
                // Default to fighter orientation
                label = 'FF';
                points = `${x},${y - size} ${x - size * 0.5},${y + size * 0.5} ${x + size * 0.5},${y + size * 0.5}`;
        }

        // Draw the triangle
        svg += `<polygon points="${points}" fill="#FFFF00" stroke="#000000" stroke-width="1"/>`;

        // Add label text above the triangle
        svg += `<text x="${x}" y="${y - size - 2}" text-anchor="middle" font-size="5" fill="#000000" `;
        svg += `font-weight="bold">${label}</text>`;

        return svg;
    }

    async updateGameDisplay(game, channel) {
        try {
            // Generate new map
            const mapBuffer = await this.generateMapImage(game);

            // Save temporary file
            const tempMapPath = `./maps/temp_map_${game.channelId}.png`;
            await fs.promises.writeFile(tempMapPath, mapBuffer);

            // Create status embed
            const embed = this.createStatusEmbed(game);

            // Send or update map message
            if (game.mapMessageId) {
                try {
                    const mapMessage = await channel.messages.fetch(game.mapMessageId);
                    await mapMessage.edit({
                        embeds: [embed],
                        files: [{
                            attachment: tempMapPath,
                            name: 'battlefield_map.png'
                        }]
                    });
                } catch (error) {
                    console.error('Could not update existing map message:', error);
                    // Create new message if update fails
                    const newMessage = await channel.send({
                        embeds: [embed],
                        files: [{
                            attachment: tempMapPath,
                            name: 'battlefield_map.png'
                        }]
                    });
                    game.mapMessageId = newMessage.id;
                }
            } else {
                const mapMessage = await channel.send({
                    embeds: [embed],
                    files: [{
                        attachment: tempMapPath,
                        name: 'battlefield_map.png'
                    }]
                });
                game.mapMessageId = mapMessage.id;

                // Pin the map message
                try {
                    await mapMessage.pin();
                } catch (error) {
                    console.error('Could not pin map message:', error);
                }
            }

            // Clean up temp file
            try {
                await fs.promises.unlink(tempMapPath);
            } catch (error) {
                console.error('Could not delete temp map file:', error);
            }

        } catch (error) {
            console.error('Error updating game display:', error);
            await channel.send('❌ Error updating map display.');
        }
    }

    createStatusEmbed(game) {
        const { EmbedBuilder } = require('discord.js');

        const embed = new EmbedBuilder()
            .setTitle('🗺️ **BATTLEFIELD MAP**')
            .setColor(0x1f8b4c);

        // Add game info
        let description = `**Turn:** ${game.turnNumber || 1}\n`;
        description += `**Phase:** ${game.phase || 'setup'}\n\n`;

        embed.setDescription(description);

        // Always show Player Ships section (empty until players join)
        if (game.players && game.players.size > 0) {
            const playersList = Array.from(game.players.values())
                .filter(p => p.alive)
                .sort((a, b) => (a.turnOrder || 999) - (b.turnOrder || 999))
                .map((p, index) => {
                    const turnNum = p.turnOrder || (index + 1);
                    const status = p.alive ? '🟢' : '💀';
                    const position = p.position ? ` (${p.position})` : '';
                    return `**Turn ${turnNum}:** ${status} ${p.username}${position}`;
                });

            embed.addFields({
                name: '🚢 **Player Ships**',
                value: playersList.join('\n'),
                inline: false
            });
        } else {
            embed.addFields({
                name: '🚢 **Player Ships**',
                value: '*No players*',
                inline: false
            });
        }

        // Always show AI Forces section (empty until AI spawned)
        if (game.enemies && game.enemies.size > 0) {
            const enemiesList = Array.from(game.enemies.values())
                .filter(e => e.alive)
                .sort((a, b) => (a.spawnOrder || 999) - (b.spawnOrder || 999))
                .map((e, index) => {
                    const turnNum = e.spawnOrder || (index + 1);
                    const status = e.alive ? '🔴' : '💀';
                    const position = e.position ? ` (${e.position})` : '';
                    return `**Turn ${turnNum}:** ${status} ${e.name || 'Enemy'}${position}`;
                });

            embed.addFields({
                name: '🤖 **AI Forces**',
                value: enemiesList.join('\n'),
                inline: false
            });
        } else {
            embed.addFields({
                name: '🤖 **AI Forces**',
                value: '*No enemies*',
                inline: false
            });
        }

        // Always show Objective section (empty until configured in /prepare)
        if (game.currentObjective) {
            const objectiveStatus = game.objectiveComplete ? '✅ Complete' : '🔄 In Progress';
            const objectiveDescription = game.currentObjective.description || 'No description available';

            embed.addFields({
                name: '🎯 **Objective**',
                value: `**${game.currentObjective.name}**\n${objectiveDescription}\n**Status:** ${objectiveStatus}`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🎯 **Objective**',
                value: '*No objective set*',
                inline: false
            });
        }

        // Always show legend (matching the image format)
        embed.addFields({
            name: '🗺️ **Legend**',
            value: '🟢 = Player Ships\n🔴 = Enemy Ships\n🟡 = Aircraft (▲ FF = Fighters, ◀ DB = Dive Bombers, ▼ TB = Torpedo Bombers)\n🏝️ = Islands (Green w/ Sandy Beaches)\n🪸 = Coral Reefs (Red/Orange)\n💧 = Shallow Waters (Light Blue w/ Ripples)',
            inline: false
        });

        embed.setTimestamp();
        embed.setImage('attachment://battlefield_map.png');

        return embed;
    }

    async cleanupGameMessages(game, channel) {
        try {
            // Unpin and delete map message
            if (game.mapMessageId) {
                try {
                    const mapMessage = await channel.messages.fetch(game.mapMessageId);
                    await mapMessage.unpin();
                    await mapMessage.delete();
                } catch (error) {
                    console.error('Could not clean up map message:', error);
                }
            }

            // Clean up any other game-related messages
            if (game.lastStatusMessageId) {
                try {
                    const statusMessage = await channel.messages.fetch(game.lastStatusMessageId);
                    await statusMessage.delete();
                } catch (error) {
                    console.error('Could not clean up status message:', error);
                }
            }

        } catch (error) {
            console.error('Error cleaning up game messages:', error);
        }
    }
}

module.exports = MapSystem;