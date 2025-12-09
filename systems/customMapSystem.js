// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CUSTOM MAP SYSTEM                                  ║
// ║                   Custom map creation and file upload                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const GameUtils = require('../utils/gameUtils');
const NameGenerator = require('../utils/nameGenerator');

class CustomMapSystem {
    constructor(bot) {
        this.bot = bot;
        this.nameGenerator = new NameGenerator();
        this.mapTemplates = new Map();
        this.customMaps = new Map();
        this.mapSessions = new Map(); // Active map editing sessions

        this.initializeSystem();
    }

    async initializeSystem() {
        // Ensure maps directory exists
        try {
            await fs.mkdir('./maps', { recursive: true });
            await fs.mkdir('./maps/custom', { recursive: true });
            await fs.mkdir('./maps/uploaded', { recursive: true });
        } catch (error) {
            console.error('Error creating map directories:', error);
        }

        // Load existing custom maps
        await this.loadCustomMaps();

        // Initialize default map templates
        this.initializeMapTemplates();
    }

    initializeMapTemplates() {
        // Default map templates that GMs can use as starting points
        this.mapTemplates.set('ocean', {
            name: 'Open Ocean',
            description: 'Large open ocean battle',
            size: { width: 100, height: 100 },
            terrain: new Map(),
            background: 'ocean'
        });

        this.mapTemplates.set('archipelago', {
            name: 'Island Chain',
            description: 'Multiple islands and shallow waters',
            size: { width: 80, height: 80 },
            terrain: new Map([
                ['C15', { type: 'island', size: 'large' }],
                ['F8', { type: 'island', size: 'medium' }],
                ['M20', { type: 'island', size: 'small' }],
                ['H25', { type: 'reef' }],
                ['K12', { type: 'shallows' }]
            ]),
            background: 'ocean'
        });

        this.mapTemplates.set('coastal', {
            name: 'Coastal Waters',
            description: 'Near-shore battle with mainland',
            size: { width: 100, height: 60 },
            terrain: new Map([
                ['A1', { type: 'mainland', size: 'large' }],
                ['D5', { type: 'island', size: 'medium' }],
                ['G8', { type: 'shallows' }]
            ]),
            background: 'coastal'
        });

        this.mapTemplates.set('archipelago_complex', {
            name: 'Complex Archipelago',
            description: 'Multi-island chain with extensive shallow waters and mainland coast',
            size: { width: 80, height: 75 },
            terrain: new Map([
                // Upper Left Large Island
                ['D21', { type: 'island', size: 'large' }],
                ['C20', { type: 'shallows' }], ['D20', { type: 'shallows' }], ['E20', { type: 'shallows' }],
                ['B21', { type: 'shallows' }], ['C21', { type: 'shallows' }], ['E21', { type: 'shallows' }], ['F21', { type: 'shallows' }],
                ['B22', { type: 'shallows' }], ['C22', { type: 'island', size: 'medium' }], ['D22', { type: 'island', size: 'large' }], ['E22', { type: 'island', size: 'large' }], ['F22', { type: 'shallows' }],
                ['C23', { type: 'island', size: 'medium' }], ['D23', { type: 'island', size: 'large' }], ['E23', { type: 'island', size: 'large' }], ['F23', { type: 'shallows' }],
                ['C24', { type: 'shallows' }], ['D24', { type: 'shallows' }], ['E24', { type: 'shallows' }], ['F24', { type: 'shallows' }],

                // Upper Right Large Island
                ['L18', { type: 'island', size: 'large' }],
                ['K17', { type: 'shallows' }], ['L17', { type: 'shallows' }], ['M17', { type: 'shallows' }],
                ['J18', { type: 'shallows' }], ['K18', { type: 'island', size: 'medium' }], ['L18', { type: 'island', size: 'large' }], ['M18', { type: 'island', size: 'large' }], ['N18', { type: 'shallows' }],
                ['K19', { type: 'island', size: 'medium' }], ['L19', { type: 'island', size: 'large' }], ['M19', { type: 'island', size: 'large' }], ['N19', { type: 'shallows' }],
                ['K20', { type: 'shallows' }], ['L20', { type: 'shallows' }], ['M20', { type: 'shallows' }], ['N20', { type: 'shallows' }],

                // Right Medium Island
                ['Q34', { type: 'island', size: 'medium' }],
                ['P33', { type: 'shallows' }], ['Q33', { type: 'shallows' }], ['R33', { type: 'shallows' }],
                ['P34', { type: 'shallows' }], ['Q34', { type: 'island', size: 'medium' }], ['R34', { type: 'island', size: 'medium' }],
                ['P35', { type: 'shallows' }], ['Q35', { type: 'island', size: 'medium' }], ['R35', { type: 'shallows' }],
                ['Q36', { type: 'shallows' }],

                // Lower Left Medium Island
                ['F50', { type: 'island', size: 'medium' }],
                ['E49', { type: 'shallows' }], ['F49', { type: 'shallows' }], ['G49', { type: 'shallows' }],
                ['D50', { type: 'shallows' }], ['E50', { type: 'island', size: 'medium' }], ['F50', { type: 'island', size: 'medium' }], ['G50', { type: 'island', size: 'medium' }], ['H50', { type: 'shallows' }],
                ['E51', { type: 'island', size: 'medium' }], ['F51', { type: 'island', size: 'medium' }], ['G51', { type: 'shallows' }],
                ['F52', { type: 'shallows' }],

                // Lower Center Medium Island
                ['L61', { type: 'island', size: 'medium' }],
                ['K60', { type: 'shallows' }], ['L60', { type: 'shallows' }], ['M60', { type: 'shallows' }],
                ['J61', { type: 'shallows' }], ['K61', { type: 'island', size: 'medium' }], ['L61', { type: 'island', size: 'medium' }], ['M61', { type: 'island', size: 'medium' }], ['N61', { type: 'shallows' }],
                ['K62', { type: 'island', size: 'medium' }], ['L62', { type: 'island', size: 'medium' }], ['M62', { type: 'shallows' }],
                ['L63', { type: 'shallows' }],

                // Mainland Coast (Left side)
                ['A32', { type: 'mainland', size: 'large' }],
                ['A33', { type: 'mainland', size: 'large' }],
                ['A34', { type: 'mainland', size: 'large' }],
                ['A35', { type: 'mainland', size: 'large' }],
                ['A36', { type: 'mainland', size: 'large' }],
                ['A37', { type: 'mainland', size: 'large' }],
                ['A38', { type: 'mainland', size: 'large' }],
                ['A39', { type: 'mainland', size: 'large' }],
                ['A40', { type: 'mainland', size: 'large' }],

                // Scattered small reefs and shallows
                ['H15', { type: 'shallows' }],
                ['P25', { type: 'shallows' }],
                ['G42', { type: 'shallows' }],
                ['T45', { type: 'reef' }],
                ['N30', { type: 'reef' }],
                ['I55', { type: 'shallows' }],
                ['O48', { type: 'reef' }]
            ]),
            background: 'ocean'
        });
    }

    async loadCustomMaps() {
        try {
            const mapFiles = await fs.readdir('./maps/custom');
            for (const file of mapFiles) {
                if (file.endsWith('.json')) {
                    const mapData = JSON.parse(await fs.readFile(`./maps/custom/${file}`, 'utf8'));
                    this.customMaps.set(mapData.id, mapData);
                }
            }
            console.log(`📍 Loaded ${this.customMaps.size} custom maps`);
        } catch (error) {
            console.log('📍 No existing custom maps found, starting fresh');
        }
    }

    async saveCustomMap(mapData) {
        try {
            const filePath = `./maps/custom/${mapData.id}.json`;
            await fs.writeFile(filePath, JSON.stringify(mapData, null, 2));
            this.customMaps.set(mapData.id, mapData);
            return true;
        } catch (error) {
            console.error('Error saving custom map:', error);
            return false;
        }
    }

    // Start map creation interface
    async startMapCreation(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🗺️ Custom Map Creator')
            .setColor('#00BFFF')
            .setDescription('Choose how you want to create your custom map:')
            .addFields(
                {
                    name: '🖌️ Create New Map',
                    value: 'Build a map from scratch using Discord interface',
                    inline: true
                },
                {
                    name: '📋 Use Template',
                    value: 'Start with a pre-made template',
                    inline: true
                },
                {
                    name: '📎 Upload Map File',
                    value: 'Upload a custom map image or data file',
                    inline: true
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`map_create_new_${interaction.user.id}`)
                    .setLabel('Create New')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🖌️'),
                new ButtonBuilder()
                    .setCustomId(`map_template_${interaction.user.id}`)
                    .setLabel('Use Template')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`map_upload_${interaction.user.id}`)
                    .setLabel('Upload File')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📎')
            );

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }

    // Handle map creation buttons
    async handleMapCreationButton(interaction) {
        const parts = interaction.customId.split('_');
        const [action, type] = parts;
        const userId = parts[parts.length - 1];

        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: '❌ This is not your map creation session!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            switch (type) {
                case 'create':
                    await this.showNewMapModal(interaction);
                    break;
                case 'template':
                    await this.showTemplateSelection(interaction);
                    break;
                case 'upload':
                    await this.showUploadInstructions(interaction);
                    break;
                case 'add':
                    await this.handleTerrainAddition(interaction, parts[2]); // island, reef, shallow
                    break;
                case 'preview':
                    await this.handleMapPreview(interaction);
                    break;
                case 'save':
                    await this.handleMapSave(interaction);
                    break;
                case 'cancel':
                    await this.handleMapCancel(interaction);
                    break;
                case 'select':
                    await this.handleTemplateSelection(interaction, parts[2]); // template key
                    break;
                case 'upload':
                    await this.handleFileUpload(interaction, parts[2]);
                    break;
            }
        } catch (error) {
            console.error('Error handling map creation button:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async showNewMapModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(`map_new_modal_${interaction.user.id}`)
            .setTitle('Create New Map');

        const nameInput = new TextInputBuilder()
            .setCustomId('map_name')
            .setLabel('Map Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter map name (e.g., "Pacific Theater")')
            .setRequired(true)
            .setMaxLength(50);

        const descInput = new TextInputBuilder()
            .setCustomId('map_description')
            .setLabel('Map Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe the map and its features')
            .setRequired(false)
            .setMaxLength(500);

        const sizeInput = new TextInputBuilder()
            .setCustomId('map_size')
            .setLabel('Map Size (WIDTHxHEIGHT)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 100x100 or 80x60')
            .setRequired(true)
            .setMaxLength(10);

        const backgroundInput = new TextInputBuilder()
            .setCustomId('map_background')
            .setLabel('Background Type')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('ocean, coastal, or arctic')
            .setRequired(false)
            .setMaxLength(20);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(sizeInput),
            new ActionRowBuilder().addComponents(backgroundInput)
        );

        await interaction.showModal(modal);
    }

    async handleNewMapModal(interaction) {
        const name = interaction.fields.getTextInputValue('map_name');
        const description = interaction.fields.getTextInputValue('map_description') || 'Custom created map';
        const sizeStr = interaction.fields.getTextInputValue('map_size');
        const background = interaction.fields.getTextInputValue('map_background') || 'ocean';

        // Parse size
        const sizeMatch = sizeStr.match(/(\d+)x(\d+)/);
        if (!sizeMatch) {
            await interaction.reply({
                content: '❌ Invalid size format! Use WIDTHxHEIGHT (e.g., 100x100)',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const width = parseInt(sizeMatch[1]);
        const height = parseInt(sizeMatch[2]);

        if (width < 20 || height < 20 || width > 200 || height > 200) {
            await interaction.reply({
                content: '❌ Map size must be between 20x20 and 200x200!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Create new map
        const mapId = `custom_${Date.now()}_${interaction.user.id}`;
        const mapData = {
            id: mapId,
            name: name,
            description: description,
            creator: {
                id: interaction.user.id,
                username: interaction.user.username
            },
            created: new Date().toISOString(),
            size: { width, height },
            background: background,
            terrain: new Map(),
            version: '1.0'
        };

        // Start editing session
        this.mapSessions.set(interaction.user.id, {
            mapData: mapData,
            channelId: interaction.channelId,
            lastActivity: Date.now()
        });

        await this.showMapEditor(interaction, mapData);
    }

    async handleTerrainModal(interaction) {
        const parts = interaction.customId.split('_');
        const terrainType = parts[2];
        const userId = parts[3];

        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: '❌ This is not your map editing session!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const session = this.mapSessions.get(interaction.user.id);
        if (!session) {
            await interaction.reply({
                content: '❌ No active map editing session found!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const coordinates = interaction.fields.getTextInputValue('coordinates');
        const size = interaction.fields.getTextInputValue('size') || 'medium';

        // Parse coordinates
        const coordList = coordinates.split(',').map(coord => coord.trim().toUpperCase());
        let addedCount = 0;

        for (const coord of coordList) {
            // Validate coordinate format
            if (!/^[A-Z]+\d+$/.test(coord)) {
                continue; // Skip invalid coordinates
            }

            // Add terrain to map
            const terrainData = {
                type: terrainType,
                size: size.toLowerCase()
            };

            // Generate random name for cities and towns
            if (terrainType === 'city' || terrainType === 'town') {
                terrainData.name = this.nameGenerator.generateName(terrainType);
            }

            session.mapData.terrain.set(coord, terrainData);
            addedCount++;
        }

        session.lastActivity = Date.now();

        if (addedCount > 0) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Terrain Added')
                .setColor('#00FF00')
                .setDescription(`Added ${addedCount} ${terrainType}(s) to your map!`)
                .addFields({
                    name: '📍 Added Coordinates',
                    value: coordList.slice(0, addedCount).join(', '),
                    inline: false
                });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

            // Show updated editor
            setTimeout(async () => {
                try {
                    await this.showMapEditor({
                        ...interaction,
                        editReply: interaction.followUp.bind(interaction),
                        replied: true
                    }, session.mapData);
                } catch (error) {
                    console.error('Error updating map editor:', error);
                }
            }, 2000);
        } else {
            await interaction.reply({
                content: '❌ No valid coordinates found! Use format like: A1, B5, C10',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async showMapEditor(interaction, mapData) {
        const embed = new EmbedBuilder()
            .setTitle(`🗺️ Map Editor: ${mapData.name}`)
            .setColor('#4169E1')
            .setDescription(`**Size:** ${mapData.size.width}x${mapData.size.height}\n**Background:** ${mapData.background}\n\n**Terrain Features:** ${Array.isArray(mapData.terrain) ? mapData.terrain.length : mapData.terrain.size}`)
            .addFields(
                {
                    name: '🏝️ Available Features',
                    value: '• Islands (Large/Medium/Small)\n• Reefs\n• Shallow Waters\n• Mainland Coast',
                    inline: true
                },
                {
                    name: '📍 Commands',
                    value: '• Add terrain with coordinates\n• Preview the map\n• Save and finish',
                    inline: true
                }
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`map_add_island_${interaction.user.id}`)
                    .setLabel('Add Island')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏝️'),
                new ButtonBuilder()
                    .setCustomId(`map_add_reef_${interaction.user.id}`)
                    .setLabel('Add Reef')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🪨'),
                new ButtonBuilder()
                    .setCustomId(`map_add_shallow_${interaction.user.id}`)
                    .setLabel('Add Shallows')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💧'),
                new ButtonBuilder()
                    .setCustomId(`map_add_city_${interaction.user.id}`)
                    .setLabel('Add City')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏙️'),
                new ButtonBuilder()
                    .setCustomId(`map_add_town_${interaction.user.id}`)
                    .setLabel('Add Town')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏘️')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`map_preview_${interaction.user.id}`)
                    .setLabel('Preview Map')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👁️'),
                new ButtonBuilder()
                    .setCustomId(`map_save_${interaction.user.id}`)
                    .setLabel('Save Map')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💾'),
                new ButtonBuilder()
                    .setCustomId(`map_cancel_${interaction.user.id}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        const method = interaction.replied ? 'editReply' : 'reply';
        await interaction[method]({ embeds: [embed], components: [row1, row2], flags: MessageFlags.Ephemeral });
    }

    async showTemplateSelection(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📋 Map Templates')
            .setColor('#FFA500')
            .setDescription('Choose a template to start with:');

        const templates = Array.from(this.mapTemplates.values());
        for (const template of templates) {
            embed.addFields({
                name: template.name,
                value: `${template.description}\nSize: ${template.size.width}x${template.size.height}`,
                inline: true
            });
        }

        const row1 = new ActionRowBuilder();
        const row2 = new ActionRowBuilder();
        let buttonCount = 0;
        for (const [key, template] of this.mapTemplates) {
            const button = new ButtonBuilder()
                .setCustomId(`template_select_${key}_${interaction.user.id}`)
                .setLabel(template.name)
                .setStyle(ButtonStyle.Secondary);

            if (buttonCount < 3) {
                row1.addComponents(button);
            } else if (buttonCount < 5) {
                row2.addComponents(button);
            } else {
                break; // Discord limit
            }
            buttonCount++;
        }

        const components = [row1];
        if (row2.components.length > 0) {
            components.push(row2);
        }

        await interaction.update({ embeds: [embed], components });
    }

    async showUploadInstructions(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📎 Upload Custom Map')
            .setColor('#32CD32')
            .setDescription('Upload your custom map file using one of these methods:')
            .addFields(
                {
                    name: '🖼️ Image File',
                    value: 'Upload a PNG/JPG image that will be used as the map background.\nThe bot will automatically detect terrain features.',
                    inline: false
                },
                {
                    name: '📄 JSON Data File',
                    value: 'Upload a JSON file with map data structure.\nThis gives you full control over terrain placement.',
                    inline: false
                },
                {
                    name: '📝 Instructions',
                    value: '1. Click "Upload File" below\n2. Select your file\n3. Add a name and description\n4. The bot will process and save your map',
                    inline: false
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`map_upload_file_${interaction.user.id}`)
                    .setLabel('Upload File')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📎'),
                new ButtonBuilder()
                    .setCustomId(`map_upload_help_${interaction.user.id}`)
                    .setLabel('Format Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    // Generate preview of custom map using the same system as the main game
    async generateCustomMapPreview(mapData) {
        try {
            // Use the same sizing approach as the main game with better quality settings
            const cellSize = 20; // Same as game for full quality
            const gridWidth = mapData.size.width * cellSize;
            const gridHeight = mapData.size.height * cellSize;

            const leftMargin = 60; // Same as main game
            const topMargin = 60; // Same as main game
            const rightPanelWidth = 450; // Same as main game for all panels
            const bottomMargin = 50;

            const totalWidth = leftMargin + gridWidth + rightPanelWidth;
            const totalHeight = Math.max(topMargin + gridHeight + bottomMargin, 700); // Minimum height like main game

            // Create a temporary game-like object for rendering
            const gameProxy = this.createMapGameProxy(mapData);

            const svgContent = this.generateCustomMapFullSVG(gameProxy, mapData, cellSize, totalWidth, totalHeight);

            // Generate PNG with optimized settings targeting Discord's 25MB limit
            let finalImage;
            let fileSizeMB;

            // Try highest quality first
            const highQualityImage = await sharp(Buffer.from(svgContent))
                .png({
                    quality: 100,
                    compressionLevel: 0,
                    adaptiveFiltering: true,
                    palette: false,
                    effort: 10
                })
                .resize({
                    width: totalWidth * 2,  // 2x scaling for maximum quality
                    height: totalHeight * 2,
                    kernel: sharp.kernel.lanczos3,
                    withoutEnlargement: false
                })
                .png({
                    quality: 100,
                    compressionLevel: 0
                })
                .toBuffer();

            fileSizeMB = (highQualityImage.length / 1024 / 1024);
            console.log(`📊 Custom map preview size (2x): ${fileSizeMB.toFixed(2)}MB`);

            // If under 20MB, use highest quality
            if (fileSizeMB <= 20) {
                finalImage = highQualityImage;
            } else {
                // Try 1.8x scaling with high quality
                const mediumHighImage = await sharp(Buffer.from(svgContent))
                    .png({
                        quality: 100,
                        compressionLevel: 1,
                        adaptiveFiltering: true,
                        palette: false,
                        effort: 10
                    })
                    .resize({
                        width: Math.round(totalWidth * 1.8),
                        height: Math.round(totalHeight * 1.8),
                        kernel: sharp.kernel.lanczos3
                    })
                    .png({
                        quality: 98,
                        compressionLevel: 1
                    })
                    .toBuffer();

                fileSizeMB = (mediumHighImage.length / 1024 / 1024);
                console.log(`📊 Custom map preview size (1.8x): ${fileSizeMB.toFixed(2)}MB`);

                if (fileSizeMB <= 22) {
                    finalImage = mediumHighImage;
                } else {
                    // Final fallback: 1.5x scaling optimized
                    console.log('⚙️ Optimizing custom map preview for size...');
                    finalImage = await sharp(Buffer.from(svgContent))
                        .png({
                            quality: 95,
                            compressionLevel: 2,
                            adaptiveFiltering: true,
                            palette: false,
                            effort: 8
                        })
                        .resize({
                            width: Math.round(totalWidth * 1.5),
                            height: Math.round(totalHeight * 1.5),
                            kernel: sharp.kernel.lanczos3
                        })
                        .png({
                            quality: 95,
                            compressionLevel: 2
                        })
                        .toBuffer();

                    fileSizeMB = (finalImage.length / 1024 / 1024);
                    console.log(`📊 Custom map preview size (1.5x optimized): ${fileSizeMB.toFixed(2)}MB`);
                }
            }

            return finalImage;
        } catch (error) {
            console.error('Error generating custom map preview:', error);
            throw error;
        }
    }

    generateCustomMapSVG(mapData, width, height, cellSize) {
        // Use the enhanced full SVG method instead of the basic one
        const totalWidth = width + 100;
        const totalHeight = height + 100;

        // Create a simplified game proxy for the enhanced method
        const gameProxy = this.createGameProxy(mapData);

        return this.generateCustomMapFullSVG(gameProxy, mapData, cellSize, totalWidth, totalHeight);
    }

    generateGridSVG(width, height, cellSize) {
        // Enhanced ocean background
        let svg = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#deepWater)" stroke="#0f172a" stroke-width="2" filter="url(#depthShadow)"/>`;

        // Ocean wave patterns
        svg += `<g opacity="0.3">
                    <path d="M0,${height * 0.3} Q${width * 0.25},${height * 0.25} ${width * 0.5},${height * 0.3}"
                          stroke="#60a5fa" stroke-width="1" fill="none"/>
                    <path d="M0,${height * 0.7} Q${width * 0.75},${height * 0.65} ${width},${height * 0.7}"
                          stroke="#60a5fa" stroke-width="1" fill="none"/>
                </g>`;

        // Enhanced grid lines
        const opacity = cellSize < 10 ? '0.3' : '0.4';

        // Vertical lines
        for (let x = 0; x <= width; x += cellSize) {
            svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#FFFFFF" stroke-width="0.5" opacity="${opacity}"/>`;
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += cellSize) {
            svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#FFFFFF" stroke-width="0.5" opacity="${opacity}"/>`;
        }

        return svg;
    }

    generateTerrainSVG(terrain, pos, cellSize) {
        const size = terrain.size === 'large' ? cellSize : terrain.size === 'medium' ? cellSize * 0.75 : cellSize * 0.5;

        switch (terrain.type) {
            case 'island':
                let islandSvg = `<rect x="${pos.x - size/2}" y="${pos.y - size/2}" width="${size}" height="${size}"
                                fill="url(#islandTexture)" stroke="#654321" stroke-width="1"
                                class="smooth-shapes" filter="url(#depthShadow)"/>`;
                // Add palm trees for larger islands
                if (size > 15) {
                    islandSvg += `<circle cx="${pos.x - size/4}" cy="${pos.y - size/4}" r="2" fill="#228B22"/>
                                 <circle cx="${pos.x + size/4}" cy="${pos.y + size/4}" r="1.5" fill="#228B22"/>`;
                }
                return islandSvg;
            case 'reef':
                return `<rect x="${pos.x - size/2}" y="${pos.y - size/2}" width="${size}" height="${size}"
                        fill="url(#reefPattern)" stroke="#FF6347" stroke-width="1" class="smooth-shapes"/>`;
            case 'shallows':
            case 'shoal':
                return `<rect x="${pos.x - size/2}" y="${pos.y - size/2}" width="${size}" height="${size}"
                        fill="url(#shoalPattern)" stroke="#F0E68C" stroke-width="0.8" class="smooth-shapes"/>
                        <path d="M${pos.x - size/2},${pos.y} Q${pos.x},${pos.y - size/4} ${pos.x + size/2},${pos.y}"
                        stroke="#87CEEB" stroke-width="0.5" fill="none" opacity="0.6"/>`;
            case 'mainland':
                return `<rect x="${pos.x - size/2}" y="${pos.y - size/2}" width="${size}" height="${size}"
                        fill="url(#islandTexture)" stroke="#654321" stroke-width="1"
                        class="smooth-shapes" filter="url(#depthShadow)"/>`;
            case 'city':
                // City icon: Multiple buildings
                let citySvg = `<g>
                    <rect x="${pos.x - size/3}" y="${pos.y - size/2.5}" width="${size/4}" height="${size/2}" fill="#808080" stroke="#404040" stroke-width="0.5"/>
                    <rect x="${pos.x - size/12}" y="${pos.y - size/2}" width="${size/5}" height="${size/1.8}" fill="#606060" stroke="#303030" stroke-width="0.5"/>
                    <rect x="${pos.x + size/6}" y="${pos.y - size/3}" width="${size/6}" height="${size/2.5}" fill="#707070" stroke="#353535" stroke-width="0.5"/>
                </g>`;
                // Add name if it exists
                if (terrain.name) {
                    citySvg += `<text x="${pos.x}" y="${pos.y + size/1.5}" text-anchor="middle" font-size="${size/3}" fill="#FFFFFF" stroke="#000000" stroke-width="0.3">${terrain.name}</text>`;
                }
                return citySvg;
            case 'town':
                // Town icon: Smaller buildings/houses
                let townSvg = `<g>
                    <rect x="${pos.x - size/4}" y="${pos.y - size/4}" width="${size/3}" height="${size/3}" fill="#8B4513" stroke="#654321" stroke-width="0.5"/>
                    <polygon points="${pos.x - size/4},${pos.y - size/4} ${pos.x},${pos.y - size/2} ${pos.x + size/12},${pos.y - size/4}" fill="#A0522D" stroke="#654321" stroke-width="0.5"/>
                    <rect x="${pos.x + size/8}" y="${pos.y - size/6}" width="${size/4}" height="${size/4}" fill="#8B4513" stroke="#654321" stroke-width="0.5"/>
                    <polygon points="${pos.x + size/8},${pos.y - size/6} ${pos.x + size/4},${pos.y - size/3} ${pos.x + size/2.5},${pos.y - size/6}" fill="#A0522D" stroke="#654321" stroke-width="0.5"/>
                </g>`;
                // Add name if it exists
                if (terrain.name) {
                    townSvg += `<text x="${pos.x}" y="${pos.y + size/1.8}" text-anchor="middle" font-size="${size/3.5}" fill="#FFFFFF" stroke="#000000" stroke-width="0.3">${terrain.name}</text>`;
                }
                return townSvg;
            default:
                return '';
        }
    }

    generateCoordinatesSVG(width, height, cellSize) {
        let svg = '';
        const fontSize = Math.max(6, cellSize * 0.6);

        // Only show coordinates if grid is large enough
        if (cellSize >= 8) {
            // Column labels
            for (let x = 0; x < width / cellSize; x++) {
                const label = this.numberToColumn(x);
                svg += `<text x="${x * cellSize + cellSize/2}" y="${fontSize + 2}" text-anchor="middle" font-size="${fontSize}" fill="#FFFFFF">${label}</text>`;
            }

            // Row labels
            for (let y = 1; y <= height / cellSize; y++) {
                svg += `<text x="${fontSize/2}" y="${y * cellSize - cellSize/2 + fontSize/2}" text-anchor="middle" font-size="${fontSize}" fill="#FFFFFF">${y}</text>`;
            }
        }

        return svg;
    }

    coordToPixel(coord, cellSize) {
        const match = coord.match(/^([A-Z]+)(\d+)$/);
        if (!match) return { x: 0, y: 0 };

        const colStr = match[1];
        const row = parseInt(match[2]);

        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
            col = col * 26 + (colStr.charCodeAt(i) - 64);
        }
        col--;

        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize - cellSize / 2
        };
    }

    numberToColumn(num) {
        let result = '';
        while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26) - 1;
        }
        return result;
    }

    generateExtendedCoordinate(x, y) {
        let columnLabel = '';

        if (x < 26) {
            // A-Z (0-25)
            columnLabel = String.fromCharCode(65 + x);
        } else if (x < 702) {
            // AA-ZZ (26-701)
            const adjustedX = x - 26;
            const firstLetter = String.fromCharCode(65 + Math.floor(adjustedX / 26));
            const secondLetter = String.fromCharCode(65 + (adjustedX % 26));
            columnLabel = firstLetter + secondLetter;
        } else {
            // AAA-ZZZ (702+)
            const adjustedX = x - 702;
            const firstLetter = String.fromCharCode(65 + Math.floor(adjustedX / 676));
            const remainingX = adjustedX % 676;
            const secondLetter = String.fromCharCode(65 + Math.floor(remainingX / 26));
            const thirdLetter = String.fromCharCode(65 + (remainingX % 26));
            columnLabel = firstLetter + secondLetter + thirdLetter;
        }

        return columnLabel + y;
    }

    // Create a game-like proxy object for map rendering
    createMapGameProxy(mapData) {
        // Create a Map object with ocean cells and custom terrain
        const map = new Map();

        // Initialize with ocean cells
        for (let x = 0; x < mapData.size.width; x++) {
            for (let y = 1; y <= mapData.size.height; y++) {
                const coord = this.generateExtendedCoordinate(x, y);
                map.set(coord, { type: 'ocean', occupant: null });
            }
        }

        // Apply custom terrain
        for (const [coord, terrainData] of mapData.terrain) {
            if (map.has(coord)) {
                map.set(coord, {
                    type: terrainData.type,
                    size: terrainData.size,
                    name: terrainData.name, // Include name for cities/towns
                    occupant: null
                });
            }
        }

        // Return a proxy object that mimics the game object for map rendering
        return {
            map: map,
            customMapData: {
                customMap: true,
                mapData: mapData,
                size: mapData.size,
                background: mapData.background
            },
            getMapCell: function(coord) {
                const cell = this.map.get(coord);
                if (cell) {
                    return cell;
                }
                return { type: 'ocean', occupant: null };
            },
            // Empty collections for preview (no players/enemies/aircraft)
            players: new Map(),
            enemies: new Map(),
            aircraft: new Map(),
            turnNumber: 1,
            weather: 'clear',
            objective: null
        };
    }

    // Generate the full SVG using enhanced graphics and effects
    generateCustomMapFullSVG(gameProxy, mapData, cellSize, totalWidth, totalHeight) {
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">

        <!-- Enhanced rendering definitions -->
        <defs>
            <!-- Gradients for water depth -->
            <radialGradient id="deepWater" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
            </radialGradient>

            <linearGradient id="shallowWater" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#60a5fa;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#93c5fd;stop-opacity:1" />
            </linearGradient>

            <!-- Island textures -->
            <pattern id="islandTexture" patternUnits="userSpaceOnUse" width="20" height="20">
                <rect width="20" height="20" fill="#8B4513"/>
                <circle cx="5" cy="5" r="1" fill="#228B22"/>
                <circle cx="15" cy="8" r="1.5" fill="#228B22"/>
                <circle cx="8" cy="15" r="1" fill="#228B22"/>
                <circle cx="12" cy="12" r="0.8" fill="#228B22"/>
                <path d="M2,18 Q10,16 18,18" stroke="#CD853F" stroke-width="0.5" fill="none"/>
            </pattern>

            <!-- Shoal patterns -->
            <pattern id="shoalPattern" patternUnits="userSpaceOnUse" width="15" height="15">
                <rect width="15" height="15" fill="#87CEEB"/>
                <circle cx="3" cy="3" r="1" fill="#FFE4B5" opacity="0.8"/>
                <circle cx="8" cy="7" r="1.5" fill="#FFE4B5" opacity="0.6"/>
                <circle cx="12" cy="11" r="1" fill="#FFE4B5" opacity="0.7"/>
                <path d="M0,8 Q7,6 15,8" stroke="#F0E68C" stroke-width="0.3" fill="none" opacity="0.5"/>
            </pattern>

            <!-- Reef patterns -->
            <pattern id="reefPattern" patternUnits="userSpaceOnUse" width="12" height="12">
                <rect width="12" height="12" fill="#20B2AA"/>
                <path d="M2,2 L4,6 L2,10 L6,8 L10,10 L8,6 L10,2 L6,4 Z" fill="#FF7F50" opacity="0.8"/>
                <circle cx="3" cy="9" r="0.5" fill="#FF6347"/>
                <circle cx="9" cy="3" r="0.8" fill="#FF6347"/>
            </pattern>

            <!-- Ship silhouettes -->
            <g id="carrier">
                <rect x="-8" y="-3" width="16" height="6" fill="#2D4A22" stroke="#1a2f14" stroke-width="0.5"/>
                <rect x="-6" y="-2" width="2" height="4" fill="#4A4A4A"/>
                <rect x="0" y="-2" width="2" height="4" fill="#4A4A4A"/>
                <rect x="4" y="-2" width="2" height="4" fill="#4A4A4A"/>
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#1a2f14" stroke-width="1"/>
            </g>

            <g id="destroyer">
                <rect x="-6" y="-2" width="12" height="4" fill="#2D4A22" stroke="#1a2f14" stroke-width="0.5"/>
                <rect x="-3" y="-1.5" width="1.5" height="3" fill="#4A4A4A"/>
                <rect x="2" y="-1.5" width="1.5" height="3" fill="#4A4A4A"/>
                <circle cx="4" cy="0" r="1" fill="#FF6B6B"/>
            </g>

            <g id="submarine">
                <ellipse cx="0" cy="0" rx="6" ry="1.5" fill="#1e3a8a" stroke="#0f172a" stroke-width="0.5"/>
                <circle cx="2" cy="-2" r="0.5" fill="#4A4A4A"/>
                <line x1="-2" y1="0" x2="2" y2="0" stroke="#0f172a" stroke-width="0.3"/>
            </g>

            <!-- Aircraft icons -->
            <g id="fighter">
                <path d="M0,-3 L2,1 L0,3 L-2,1 Z" fill="#4A90E2"/>
                <line x1="0" y1="-2" x2="0" y2="2" stroke="#2D4A22" stroke-width="0.3"/>
            </g>

            <!-- Weather effects -->
            <pattern id="storm" patternUnits="userSpaceOnUse" width="30" height="30">
                <rect width="30" height="30" fill="none"/>
                <circle cx="8" cy="8" r="3" fill="#4A4A4A" opacity="0.6"/>
                <circle cx="15" cy="12" r="4" fill="#4A4A4A" opacity="0.5"/>
                <circle cx="22" cy="18" r="3" fill="#4A4A4A" opacity="0.7"/>
                <path d="M5,20 L7,25 M12,22 L14,27 M20,24 L22,29" stroke="#87CEEB" stroke-width="0.5" opacity="0.8"/>
            </pattern>

            <!-- Radar sweep animation -->
            <g id="radarSweep">
                <circle cx="0" cy="0" r="20" fill="none" stroke="#00FF00" stroke-width="1" opacity="0.3"/>
                <circle cx="0" cy="0" r="15" fill="none" stroke="#00FF00" stroke-width="0.5" opacity="0.2"/>
                <circle cx="0" cy="0" r="10" fill="none" stroke="#00FF00" stroke-width="0.5" opacity="0.2"/>
                <path d="M0,0 L20,0" stroke="#00FF00" stroke-width="2" opacity="0.8">
                    <animateTransform attributeName="transform" type="rotate" values="0;360" dur="4s" repeatCount="indefinite"/>
                </path>
            </g>

            <!-- Depth shadows -->
            <filter id="depthShadow">
                <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>

            <!-- Glow effects -->
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <style>
                .crisp-text {
                    text-rendering: optimizeLegibility;
                    shape-rendering: crispEdges;
                    font-family: "Arial", "Helvetica", sans-serif;
                }
                .smooth-shapes {
                    shape-rendering: geometricPrecision;
                }
            </style>
        </defs>

        <!-- Transparent background -->
        <rect width="${totalWidth}" height="${totalHeight}" fill="none"/>

        <!-- Enhanced ocean background with depth gradient -->
        <rect x="50" y="50" width="${mapData.size.width * cellSize}" height="${mapData.size.height * cellSize}"
              fill="url(#deepWater)" stroke="#0f172a" stroke-width="3" class="smooth-shapes" filter="url(#depthShadow)"/>

        <!-- Ocean wave patterns -->
        <g opacity="0.3">
            <path d="M50,${50 + mapData.size.height * cellSize * 0.3} Q${50 + mapData.size.width * cellSize * 0.25},${50 + mapData.size.height * cellSize * 0.25} ${50 + mapData.size.width * cellSize * 0.5},${50 + mapData.size.height * cellSize * 0.3}"
                  stroke="#60a5fa" stroke-width="1" fill="none"/>
            <path d="M50,${50 + mapData.size.height * cellSize * 0.7} Q${50 + mapData.size.width * cellSize * 0.75},${50 + mapData.size.height * cellSize * 0.65} ${50 + mapData.size.width * cellSize},${50 + mapData.size.height * cellSize * 0.7}"
                  stroke="#60a5fa" stroke-width="1" fill="none"/>
        </g>

        <!-- Current arrows -->
        <g opacity="0.4">
            <path d="M${50 + mapData.size.width * cellSize * 0.2},${50 + mapData.size.height * cellSize * 0.5} L${50 + mapData.size.width * cellSize * 0.3},${50 + mapData.size.height * cellSize * 0.45} L${50 + mapData.size.width * cellSize * 0.25},${50 + mapData.size.height * cellSize * 0.47} L${50 + mapData.size.width * cellSize * 0.3},${50 + mapData.size.height * cellSize * 0.5} L${50 + mapData.size.width * cellSize * 0.25},${50 + mapData.size.height * cellSize * 0.53} L${50 + mapData.size.width * cellSize * 0.3},${50 + mapData.size.height * cellSize * 0.55} Z"
                  fill="#93c5fd" stroke="#3b82f6" stroke-width="0.5"/>
        </g>

        <!-- Weather effects overlay -->
        <g opacity="0.3">
            <rect x="${50 + mapData.size.width * cellSize * 0.6}" y="${50 + mapData.size.height * cellSize * 0.1}"
                  width="${mapData.size.width * cellSize * 0.3}" height="${mapData.size.height * cellSize * 0.2}"
                  fill="url(#storm)"/>
        </g>

        <!-- Radar stations with sweep animation -->
        ${(() => {
            const terrainArray = Array.isArray(mapData.terrain) ? mapData.terrain : Array.from(mapData.terrain.values());
            return terrainArray.some(t => t.name && t.name.includes('Radar')) ?
                terrainArray.filter(t => t.name && t.name.includes('Radar')).map(station => {
                    const pos = this.coordToPixel(station.x + station.y + '', cellSize);
                    return `<g transform="translate(${50 + pos.x + cellSize/2}, ${50 + pos.y + cellSize/2})">
                               <use href="#radarSweep" transform="scale(0.5)"/>
                            </g>`;
                }).join('') : '';
        })()}

        <!-- Detailed Nautical Compass Rose -->
        <g transform="translate(110, 110)" opacity="0.28">
            <!-- Outer decorative ring with rays -->
            <g stroke="#2c3e50" stroke-width="0.8" fill="none">
                ${Array.from({length: 32}, (_, i) => {
                    const angle = i * 11.25;
                    const isCardinal = i % 8 === 0;
                    const isIntercardinal = i % 4 === 0 && !isCardinal;
                    const length = isCardinal ? 12 : isIntercardinal ? 8 : 5;
                    const weight = isCardinal ? 1.2 : isIntercardinal ? 1.0 : 0.6;
                    const x1 = Math.sin(angle * Math.PI / 180) * (45 - length);
                    const y1 = -Math.cos(angle * Math.PI / 180) * (45 - length);
                    const x2 = Math.sin(angle * Math.PI / 180) * 45;
                    const y2 = -Math.cos(angle * Math.PI / 180) * 45;
                    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${weight}"/>`;
                }).join('')}
            </g>

            <!-- Outer compass ring -->
            <circle cx="0" cy="0" r="45" fill="none" stroke="#34495e" stroke-width="2"/>
            <circle cx="0" cy="0" r="42" fill="none" stroke="#34495e" stroke-width="0.8"/>

            <!-- Main compass body -->
            <circle cx="0" cy="0" r="38" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1.5"/>

            <!-- Inner decorative rings -->
            <circle cx="0" cy="0" r="33" fill="none" stroke="#bdc3c7" stroke-width="0.8"/>
            <circle cx="0" cy="0" r="28" fill="none" stroke="#bdc3c7" stroke-width="0.6"/>

            <!-- Main cardinal points (North, South, East, West) -->
            <g fill="#2c3e50">
                <!-- North arrow (prominent) -->
                <path d="M0,-28 L6,-15 L3,-15 L3,-8 L-3,-8 L-3,-15 L-6,-15 Z" fill="#e74c3c"/>
                <path d="M0,-33 L4,-20 L0,-15 L-4,-20 Z" fill="#c0392b"/>

                <!-- South arrow -->
                <path d="M0,28 L6,15 L3,15 L3,8 L-3,8 L-3,15 L-6,15 Z"/>

                <!-- East arrow -->
                <path d="M28,0 L15,-6 L15,-3 L8,-3 L8,3 L15,3 L15,6 Z"/>

                <!-- West arrow -->
                <path d="M-28,0 L-15,6 L-15,3 L-8,3 L-8,-3 L-15,-3 L-15,-6 Z"/>
            </g>

            <!-- Intercardinal points (NE, SE, SW, NW) -->
            <g fill="#7f8c8d" stroke="#2c3e50" stroke-width="0.5">
                <!-- Northeast -->
                <path d="M19.8,-19.8 L14.1,-14.1 L16.3,-11.9 L11.9,-16.3 Z"/>
                <!-- Southeast -->
                <path d="M19.8,19.8 L14.1,14.1 L11.9,16.3 L16.3,11.9 Z"/>
                <!-- Southwest -->
                <path d="M-19.8,19.8 L-14.1,14.1 L-16.3,11.9 L-11.9,16.3 Z"/>
                <!-- Northwest -->
                <path d="M-19.8,-19.8 L-14.1,-14.1 L-11.9,-16.3 L-16.3,-11.9 Z"/>
            </g>

            <!-- Cardinal direction labels -->
            <g font-family="serif" font-weight="bold" text-anchor="middle" fill="#2c3e50">
                <text x="0" y="-50" font-size="11" fill="#e74c3c">N</text>
                <text x="50" y="4" font-size="9">E</text>
                <text x="0" y="59" font-size="9">S</text>
                <text x="-50" y="4" font-size="9">W</text>
            </g>

            <!-- Intercardinal direction labels -->
            <g font-family="serif" font-size="7" text-anchor="middle" fill="#7f8c8d">
                <text x="35" y="-30">NE</text>
                <text x="35" y="37">SE</text>
                <text x="-35" y="37">SW</text>
                <text x="-35" y="-30">NW</text>
            </g>

            <!-- Center ornament -->
            <circle cx="0" cy="0" r="8" fill="#34495e" stroke="#2c3e50" stroke-width="1"/>
            <circle cx="0" cy="0" r="5" fill="#ecf0f1" stroke="#34495e" stroke-width="0.8"/>
            <circle cx="0" cy="0" r="2" fill="#2c3e50"/>
        </g>

        <!-- Time of day indicator -->
        <g transform="translate(${50 + mapData.size.width * cellSize + 60}, 80)">
            <circle cx="0" cy="0" r="15" fill="#FFD700" stroke="#FFA500" stroke-width="1" opacity="0.8"/>
            <text x="0" y="25" text-anchor="middle" font-size="9" fill="#FFFFFF">1400 hrs</text>
        </g>`;

        // Draw enhanced grid with terrain features
        for (let x = 0; x < mapData.size.width; x++) {
            for (let y = 0; y < mapData.size.height; y++) {
                const coord = this.generateExtendedCoordinate(x, y + 1);

                try {
                    const cell = gameProxy.getMapCell(coord);
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);

                    // Enhanced terrain rendering with textures and effects
                    if (cell.type === 'island') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#islandTexture)" stroke="#654321" stroke-width="1"
                                class="smooth-shapes" filter="url(#depthShadow)"/>`;

                        // Add palm trees for larger islands
                        if (cellSize > 15) {
                            svg += `<circle cx="${pixelX + cellSize * 0.3}" cy="${pixelY + cellSize * 0.3}" r="2" fill="#228B22"/>
                                   <circle cx="${pixelX + cellSize * 0.7}" cy="${pixelY + cellSize * 0.6}" r="1.5" fill="#228B22"/>`;
                        }
                    } else if (cell.type === 'shoal') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#shoalPattern)" stroke="#F0E68C" stroke-width="0.8"
                                class="smooth-shapes"/>`;

                        // Add wave effects for shoals
                        svg += `<path d="M${pixelX},${pixelY + cellSize * 0.5} Q${pixelX + cellSize * 0.5},${pixelY + cellSize * 0.3} ${pixelX + cellSize},${pixelY + cellSize * 0.5}"
                               stroke="#87CEEB" stroke-width="0.5" fill="none" opacity="0.6"/>`;
                    } else if (cell.type === 'reef') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#reefPattern)" stroke="#FF6347" stroke-width="1"
                                class="smooth-shapes"/>`;
                    } else if (cell.type === 'city') {
                        // City: Island background + Multiple gray buildings
                        const centerX = pixelX + cellSize/2;
                        const centerY = pixelY + cellSize/2;
                        // First render island background
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#islandTexture)" stroke="#654321" stroke-width="1"
                                class="smooth-shapes" filter="url(#depthShadow)"/>`;
                        // Then render city buildings on top
                        const citySize = cellSize * 0.6;
                        svg += `<g>
                                <rect x="${centerX - citySize/3}" y="${centerY - citySize/2.5}" width="${citySize/4}" height="${citySize/2}" fill="#808080" stroke="#404040" stroke-width="0.5"/>
                                <rect x="${centerX - citySize/12}" y="${centerY - citySize/2}" width="${citySize/5}" height="${citySize/1.8}" fill="#606060" stroke="#303030" stroke-width="0.5"/>
                                <rect x="${centerX + citySize/6}" y="${centerY - citySize/3}" width="${citySize/6}" height="${citySize/2.5}" fill="#707070" stroke="#353535" stroke-width="0.5"/>
                                </g>`;
                        // Add name if exists
                        if (cell.name) {
                            svg += `<text x="${centerX}" y="${centerY + citySize}" text-anchor="middle" font-size="${cellSize/3}" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5" paint-order="stroke">${cell.name}</text>`;
                        }
                    } else if (cell.type === 'town') {
                        // Town: Island background + Smaller brown houses with roofs
                        const centerX = pixelX + cellSize/2;
                        const centerY = pixelY + cellSize/2;
                        // First render island background
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#islandTexture)" stroke="#654321" stroke-width="1"
                                class="smooth-shapes" filter="url(#depthShadow)"/>`;
                        // Then render town buildings on top
                        const townSize = cellSize * 0.5;
                        svg += `<g>
                                <rect x="${centerX - townSize/4}" y="${centerY - townSize/4}" width="${townSize/3}" height="${townSize/3}" fill="#8B4513" stroke="#654321" stroke-width="0.5"/>
                                <polygon points="${centerX - townSize/4},${centerY - townSize/4} ${centerX},${centerY - townSize/2} ${centerX + townSize/12},${centerY - townSize/4}" fill="#A0522D" stroke="#654321" stroke-width="0.5"/>
                                <rect x="${centerX + townSize/8}" y="${centerY - townSize/6}" width="${townSize/4}" height="${townSize/4}" fill="#8B4513" stroke="#654321" stroke-width="0.5"/>
                                <polygon points="${centerX + townSize/8},${centerY - townSize/6} ${centerX + townSize/4},${centerY - townSize/3} ${centerX + townSize/2.5},${centerY - townSize/6}" fill="#A0522D" stroke="#654321" stroke-width="0.5"/>
                                </g>`;
                        // Add name if exists
                        if (cell.name) {
                            svg += `<text x="${centerX}" y="${centerY + townSize * 0.9}" text-anchor="middle" font-size="${cellSize/3.5}" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5" paint-order="stroke">${cell.name}</text>`;
                        }
                    } else {
                        // Regular ocean with depth variations
                        const depthVariation = (x + y) % 3;
                        const oceanFill = depthVariation === 0 ? 'url(#deepWater)' :
                                         depthVariation === 1 ? 'url(#shallowWater)' : '#1e40af';
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="${oceanFill}" stroke="#1e3a8a" stroke-width="0.3"
                                class="smooth-shapes" opacity="0.9"/>`;
                    }
                } catch (error) {
                    console.error(`❌ Error processing cell at ${coord}:`, error);
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);
                    svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                            fill="url(#shallowWater)" stroke="#1e3a8a" stroke-width="0.3" class="smooth-shapes"/>`;
                }
            }
        }

        // Add coordinate labels using the same style as main game
        svg += this.addCustomMapCoordinateLabels(mapData, cellSize);

        // Position panels exactly like the main game
        const mapEndX = 50 + (mapData.size.width * cellSize);
        const panelStartX = mapEndX + 30;

        // Add player status panel (left side)
        svg += this.addCustomCompactStatusPanel(gameProxy, panelStartX, 60);

        // Add AI status panel (right side, next to player panel)
        const aiPanelX = panelStartX + 220;
        svg += this.addCustomAIStatusPanel(gameProxy, aiPanelX, 60);

        // Calculate map bottom position
        const mapBottom = 50 + (mapData.size.height * cellSize);

        // Calculate legend height and position like main game
        const legendHeight = 85;
        const legendY = mapBottom - legendHeight - 20;

        // Position objective panel above legend
        const objectivePanelHeight = 140;
        const objectivePanelY = legendY - objectivePanelHeight - 15;

        // Add Objective panel
        svg += this.addCustomObjectivePanel(gameProxy, mapData, panelStartX, objectivePanelY);

        // Add complete legend from main game
        svg += this.addCustomCompactMapLegend(panelStartX, legendY);

        svg += '</svg>';
        return svg;
    }

    // Use the same terrain colors as the main game
    getTerrainColor(cellType) {
        switch (cellType) {
            case 'ocean': return '#87CEEB';
            case 'island': return '#228B22';
            case 'reef': return '#90EE90';
            case 'spawn': return '#D2B48C';
            case 'shallows': return '#87CEEB';
            case 'mainland': return '#228B22';
            case 'destination_zone': return '#87CEEB';
            case 'resource_zone': return '#FFD700';
            case 'resource_radius': return '#FFFF99';
            case 'outpost': return '#8B4513';
            case 'salvage_radius': return '#E0FFFF';
            default: return '#87CEEB';
        }
    }

    // Add coordinate labels in the same style as the main game
    addCustomMapCoordinateLabels(mapData, cellSize) {
        let labels = '';

        // Military-style header
        labels += `<rect x="10" y="10" width="150" height="20" fill="#1e3a8a" stroke="#FFFFFF" stroke-width="1" opacity="0.9"/>`;
        labels += `<text x="85" y="24" text-anchor="middle" font-size="10" fill="#FFFFFF" font-weight="bold">NAVAL GRID REFERENCE</text>`;

        // Enhanced column labels with military styling
        for (let x = 0; x < mapData.size.width; x++) {
            const label = this.generateExtendedCoordinate(x, 1).slice(0, -1);
            const xPos = 50 + (x * cellSize) + cellSize/2;

            // Background box for labels
            labels += `<rect x="${xPos - 8}" y="35" width="16" height="16" fill="#1e3a8a" stroke="#FFFFFF" stroke-width="0.5" opacity="0.8"/>`;
            labels += `<text x="${xPos}" y="45" text-anchor="middle"
                       font-family="Arial Black, Arial, sans-serif" font-size="10" font-weight="bold"
                       fill="#FFFFFF" stroke="#000000" stroke-width="0.5"
                       class="crisp-text">${label}</text>`;
        }

        // Enhanced row labels with military styling
        for (let y = 0; y < mapData.size.height; y++) {
            const label = y + 1;
            const yPos = 50 + (y * cellSize) + cellSize/2;

            // Background box for labels
            labels += `<rect x="25" y="${yPos - 8}" width="16" height="16" fill="#1e3a8a" stroke="#FFFFFF" stroke-width="0.5" opacity="0.8"/>`;
            labels += `<text x="33" y="${yPos + 3}" text-anchor="middle"
                       font-family="Arial Black, Arial, sans-serif" font-size="10" font-weight="bold"
                       fill="#FFFFFF" stroke="#000000" stroke-width="0.5"
                       class="crisp-text">${label}</text>`;
        }

        // NATO tactical symbols for spawn areas
        if (mapData.spawnAreas) {
            // Friendly spawn markers (green rectangles)
            if (mapData.spawnAreas.friendly) {
                mapData.spawnAreas.friendly.forEach((spawn, index) => {
                    const pixelX = 50 + (spawn.x - 1) * cellSize;
                    const pixelY = 50 + (spawn.y - 1) * cellSize;
                    labels += `<g transform="translate(${pixelX + cellSize/2}, ${pixelY + cellSize/2})">
                                 <rect x="-8" y="-8" width="16" height="16" fill="#00FF00" stroke="#FFFFFF" stroke-width="2" opacity="0.8" filter="url(#glow)"/>
                                 <text x="0" y="4" text-anchor="middle" font-size="8" fill="#000000" font-weight="bold">F${index + 1}</text>
                               </g>`;
                });
            }

            // Enemy spawn markers (red diamonds)
            if (mapData.spawnAreas.enemy) {
                mapData.spawnAreas.enemy.forEach((spawn, index) => {
                    const pixelX = 50 + (spawn.x - 1) * cellSize;
                    const pixelY = 50 + (spawn.y - 1) * cellSize;
                    labels += `<g transform="translate(${pixelX + cellSize/2}, ${pixelY + cellSize/2})">
                                 <polygon points="0,-8 8,0 0,8 -8,0" fill="#FF0000" stroke="#FFFFFF" stroke-width="2" opacity="0.8" filter="url(#glow)"/>
                                 <text x="0" y="3" text-anchor="middle" font-size="7" fill="#FFFFFF" font-weight="bold">E${index + 1}</text>
                               </g>`;
                });
            }
        }

        // Add depth soundings (military-style depth markers)
        for (let x = 0; x < mapData.size.width; x += 5) {
            for (let y = 0; y < mapData.size.height; y += 5) {
                const pixelX = 50 + x * cellSize + cellSize/2;
                const pixelY = 50 + y * cellSize + cellSize/2;
                const depth = Math.floor(Math.random() * 50) + 10;
                labels += `<text x="${pixelX}" y="${pixelY}" text-anchor="middle" font-size="6" fill="#87CEEB" opacity="0.6">${depth}</text>`;
            }
        }

        return labels;
    }

    // Add Player Ships panel - exact copy from main game
    addCustomCompactStatusPanel(game, startX, startY) {
        let status = `<text x="${startX + 5}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5" filter="url(#glow)">⚓ Player Ships</text>`;

        // For custom map preview, show enhanced sample player entries with ship icons
        let currentY = startY + 35;

        // Sample player with carrier icon
        status += `<g transform="translate(${startX + 8}, ${currentY - 5})">
                      <use href="#carrier" transform="scale(0.6)" opacity="0.7"/>
                   </g>`;
        status += `<text x="${startX + 25}" y="${currentY}" font-family="Arial" font-size="10" fill="#4A90E2" stroke="#000000" stroke-width="0.3">USS Enterprise (CV)</text>`;
        currentY += 18;

        // Sample player with destroyer icon
        status += `<g transform="translate(${startX + 8}, ${currentY - 5})">
                      <use href="#destroyer" transform="scale(0.6)" opacity="0.7"/>
                   </g>`;
        status += `<text x="${startX + 25}" y="${currentY}" font-family="Arial" font-size="10" fill="#2D4A22" stroke="#000000" stroke-width="0.3">USS Destroyer (DD)</text>`;
        currentY += 18;

        // Sample submarine
        status += `<g transform="translate(${startX + 8}, ${currentY - 5})">
                      <use href="#submarine" transform="scale(0.6)" opacity="0.7"/>
                   </g>`;
        status += `<text x="${startX + 25}" y="${currentY}" font-family="Arial" font-size="10" fill="#1e3a8a" stroke="#000000" stroke-width="0.3">USS Nautilus (SSN)</text>`;
        currentY += 15;

        status += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="9" fill="#B9BBBE" stroke="#000000" stroke-width="0.3">(Preview - Live ships during battle)</text>`;

        return status;
    }

    // Add enhanced AI Forces panel with enemy ship previews
    addCustomAIStatusPanel(game, startX, startY) {
        let status = `<text x="${startX + 8}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FF6B6B" stroke="#000000" stroke-width="0.5" filter="url(#glow)">🎯 AI Forces</text>`;

        // For custom map preview, show sample AI entries with threat indicators
        let currentY = startY + 35;

        // Enemy carrier with threat level
        status += `<g transform="translate(${startX + 8}, ${currentY - 5})">
                      <use href="#carrier" transform="scale(0.6)" opacity="0.8" fill="#CC0000"/>
                   </g>`;
        status += `<text x="${startX + 25}" y="${currentY}" font-family="Arial" font-size="10" fill="#FF6B6B" stroke="#000000" stroke-width="0.3">Enemy Carrier [HIGH]</text>`;
        currentY += 18;

        // Enemy destroyer group
        status += `<g transform="translate(${startX + 8}, ${currentY - 5})">
                      <use href="#destroyer" transform="scale(0.6)" opacity="0.8" fill="#CC0000"/>
                   </g>`;
        status += `<text x="${startX + 25}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFA500" stroke="#000000" stroke-width="0.3">Destroyer Squadron [MED]</text>`;
        currentY += 18;

        // Enemy submarine
        status += `<g transform="translate(${startX + 8}, ${currentY - 5})">
                      <use href="#submarine" transform="scale(0.6)" opacity="0.8" fill="#CC0000"/>
                   </g>`;
        status += `<text x="${startX + 25}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFF00" stroke="#000000" stroke-width="0.3">Attack Sub [LOW]</text>`;
        currentY += 15;

        status += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="9" fill="#B9BBBE" stroke="#000000" stroke-width="0.3">(Preview - Live threats during battle)</text>`;

        return status;
    }

    // Add Objectives panel - exact copy from main game
    addCustomObjectivePanel(game, mapData, startX, startY) {
        let panel = `<text x="${startX + 5}" y="${startY + 15}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">Objective: Custom Map Preview</text>`;

        let currentY = startY + 35;

        panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">This is a preview of "${mapData.name}"</text>`;
        currentY += 20;
        panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#B9BBBE" stroke="#000000" stroke-width="0.5">Objectives will be set by the GM</text>`;
        currentY += 15;
        panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#B9BBBE" stroke="#000000" stroke-width="0.5">when the map is used in a game</text>`;

        return panel;
    }

    // Add complete legend - exact copy from main game
    addCustomCompactMapLegend(startX, startY) {
        let legend = `<rect x="${startX - 5}" y="${startY - 5}" width="400" height="95" fill="#0f172a" stroke="#FFFFFF" stroke-width="2" opacity="0.95" filter="url(#depthShadow)"/>`;
        legend += `<text x="${startX + 5}" y="${startY + 12}" font-size="14" font-weight="bold" fill="#FFFFFF" filter="url(#glow)">🗺️ TACTICAL LEGEND</text>`;

        const legendColumns = [
            // Column 1: Enhanced Terrain
            [
                { pattern: 'url(#deepWater)', text: 'Deep Ocean', icon: '🌊' },
                { pattern: 'url(#islandTexture)', text: 'Island/Land', icon: '🏝️' },
                { pattern: 'url(#shoalPattern)', text: 'Shoals', icon: '⚠️' },
                { pattern: 'url(#reefPattern)', text: 'Coral Reef', icon: '🪸' }
            ],
            // Column 2: NATO Ship Symbols
            [
                { shipType: 'carrier', text: 'Aircraft Carrier', icon: '⚓' },
                { shipType: 'destroyer', text: 'Destroyer', icon: '🚢' },
                { shipType: 'submarine', text: 'Submarine', icon: '🟢' },
                { color: '#FF0000', text: 'Enemy Forces', icon: '🎯' }
            ],
            // Column 3: Tactical Symbols
            [
                { color: '#00FF00', text: 'Friendly Spawn', icon: '✅' },
                { color: '#FF0000', text: 'Enemy Spawn', icon: '❌' },
                { color: '#FFD700', text: 'Objectives', icon: '🎯' },
                { color: '#87CEEB', text: 'Depth Markers', icon: '📏' }
            ]
        ];

        const columnWidth = 130;
        legendColumns.forEach((column, colIndex) => {
            const columnX = startX + 10 + (colIndex * columnWidth);

            column.forEach((item, itemIndex) => {
                const itemY = startY + 30 + (itemIndex * 16);

                if (item.pattern) {
                    legend += `<rect x="${columnX}" y="${itemY - 8}" width="12" height="12" fill="${item.pattern}" stroke="#FFFFFF" stroke-width="0.5"/>`;
                } else if (item.shipType) {
                    legend += `<g transform="translate(${columnX + 6}, ${itemY - 2})">
                                 <use href="#${item.shipType}" transform="scale(0.4)" opacity="0.8"/>
                               </g>`;
                } else if (item.color) {
                    legend += `<rect x="${columnX}" y="${itemY - 8}" width="12" height="12" fill="${item.color}" stroke="#FFFFFF" stroke-width="0.5"/>`;
                }

                legend += `<text x="${columnX + 18}" y="${itemY}" font-size="9" fill="#FFFFFF" stroke="#000000" stroke-width="0.3">${item.icon || ''} ${item.text}</text>`;
            });
        });

        return legend;
    }

    // Apply custom map to current game
    async applyCustomMap(game, mapData) {
        try {
            // Create a proper Map object like the regular map system
            const map = new Map();

            // Initialize the full map area with ocean cells
            for (let x = 0; x < mapData.size.width; x++) {
                for (let y = 1; y <= mapData.size.height; y++) {
                    const coord = this.generateExtendedCoordinate(x, y);
                    map.set(coord, { type: 'ocean', occupant: null });
                }
            }

            // Apply custom terrain from the map data
            for (const [coord, terrainData] of mapData.terrain) {
                if (map.has(coord)) {
                    map.set(coord, {
                        type: terrainData.type,
                        size: terrainData.size,
                        name: terrainData.name, // Include name for cities/towns
                        occupant: null
                    });
                }
            }

            // Replace the game map with the new custom map
            game.map = map;

            // Store custom map metadata for reference
            game.customMapData = {
                customMap: true,
                mapData: mapData,
                size: mapData.size,
                background: mapData.background
            };

            // Update the map system to use the custom map
            if (this.bot.mapSystem) {
                await this.bot.mapSystem.updateGameDisplay(game, game.channel);
            }

            return true;
        } catch (error) {
            console.error('Error applying custom map:', error);
            return false;
        }
    }

    // List available custom maps
    getAvailableMaps() {
        return Array.from(this.customMaps.values());
    }

    // Get map by ID
    getMapById(mapId) {
        return this.customMaps.get(mapId);
    }

    // Handle terrain addition
    async handleTerrainAddition(interaction, terrainType) {
        const session = this.mapSessions.get(interaction.user.id);
        if (!session) {
            await interaction.reply({
                content: '❌ No active map editing session found!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`terrain_add_${terrainType}_${interaction.user.id}`)
            .setTitle(`Add ${terrainType.charAt(0).toUpperCase() + terrainType.slice(1)}`);

        const coordInput = new TextInputBuilder()
            .setCustomId('coordinates')
            .setLabel('Coordinates (e.g., A1, B5, C10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter coordinates separated by commas')
            .setRequired(true);

        const sizeInput = new TextInputBuilder()
            .setCustomId('size')
            .setLabel('Size (small, medium, large)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('medium')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(coordInput),
            new ActionRowBuilder().addComponents(sizeInput)
        );

        await interaction.showModal(modal);
    }

    // Handle map preview
    async handleMapPreview(interaction) {
        const session = this.mapSessions.get(interaction.user.id);
        if (!session) {
            await interaction.reply({
                content: '❌ No active map editing session found!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const previewBuffer = await this.generateCustomMapPreview(session.mapData);
            const attachment = new AttachmentBuilder(previewBuffer, { name: 'map_preview.png' });

            const embed = new EmbedBuilder()
                .setTitle(`🗺️ Preview: ${session.mapData.name}`)
                .setColor('#4169E1')
                .setDescription(`**Size:** ${session.mapData.size.width}x${session.mapData.size.height}\n**Features:** ${Array.isArray(session.mapData.terrain) ? session.mapData.terrain.length : session.mapData.terrain.size}`)
                .setImage('attachment://map_preview.png');

            await interaction.editReply({ embeds: [embed], files: [attachment] });
            session.lastActivity = Date.now();

        } catch (error) {
            console.error('Error generating map preview:', error);
            await interaction.editReply({ content: '❌ Failed to generate map preview.' });
        }
    }

    // Handle map save
    async handleMapSave(interaction) {
        const session = this.mapSessions.get(interaction.user.id);
        if (!session) {
            await interaction.reply({
                content: '❌ No active map editing session found!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const success = await this.saveCustomMap(session.mapData);

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Map Saved Successfully')
                .setColor('#00FF00')
                .setDescription(`Your custom map **${session.mapData.name}** has been saved!`)
                .addFields({
                    name: '📍 Map Details',
                    value: `**ID:** \`${session.mapData.id}\`\n**Size:** ${session.mapData.size.width}x${session.mapData.size.height}\n**Features:** ${Array.isArray(session.mapData.terrain) ? session.mapData.terrain.length : session.mapData.terrain.size}`,
                    inline: false
                });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            this.mapSessions.delete(interaction.user.id);
        } else {
            await interaction.reply({
                content: '❌ Failed to save the map. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // Handle map cancel
    async handleMapCancel(interaction) {
        const session = this.mapSessions.get(interaction.user.id);
        if (session) {
            this.mapSessions.delete(interaction.user.id);
        }

        await interaction.reply({
            content: '❌ Map creation cancelled.',
            flags: MessageFlags.Ephemeral
        });
    }

    // Handle template selection
    async handleTemplateSelection(interaction, templateKey) {
        const template = this.mapTemplates.get(templateKey);
        if (!template) {
            await interaction.reply({
                content: '❌ Template not found!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const mapId = `template_${templateKey}_${Date.now()}_${interaction.user.id}`;
        const mapData = {
            id: mapId,
            name: `${template.name} (Custom)`,
            description: template.description,
            creator: {
                id: interaction.user.id,
                username: interaction.user.username
            },
            created: new Date().toISOString(),
            size: { ...template.size },
            background: template.background,
            terrain: new Map(template.terrain),
            version: '1.0'
        };

        this.mapSessions.set(interaction.user.id, {
            mapData: mapData,
            channelId: interaction.channelId,
            lastActivity: Date.now()
        });

        await this.showMapEditor(interaction, mapData);
    }

    // Clean up inactive sessions
    cleanupInactiveSessions() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes

        for (const [userId, session] of this.mapSessions) {
            if (now - session.lastActivity > maxAge) {
                this.mapSessions.delete(userId);
            }
        }
    }
}

module.exports = CustomMapSystem;