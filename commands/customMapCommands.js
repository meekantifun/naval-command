// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CUSTOM MAP COMMANDS                                  ║
// ║                    Slash commands for custom maps                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder, MessageFlags } = require('discord.js');

class CustomMapCommands {
    constructor(bot) {
        this.bot = bot;
    }

    getCommands() {
        return [
            // List available custom maps
            new SlashCommandBuilder()
                .setName('listmaps')
                .setDescription('List all available custom maps')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        ];
    }

    async handleCustomMapCommand(interaction) {
        const customMapSystem = this.bot.customMapSystem;

        if (!customMapSystem) {
            await interaction.reply({
                content: '❌ Custom map system is not initialized!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (interaction.commandName === 'listmaps' && !this.bot.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to use map management commands.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        switch (interaction.commandName) {
            case 'listmaps':
                await this.handleListMaps(interaction, customMapSystem);
                break;
        }
    }

    async handleCreateMap(interaction, customMapSystem) {
        await customMapSystem.startMapCreation(interaction);
    }

    async handleListMaps(interaction, customMapSystem) {
        const maps = customMapSystem.getAvailableMaps(interaction.guildId);

        if (maps.length === 0) {
            await interaction.reply({
                content: '📍 No custom maps available. Create one in the web panel!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🗺️ Available Custom Maps')
            .setColor('#4169E1')
            .setDescription(`Found ${maps.length} custom map(s):`);

        for (const map of maps.slice(0, 10)) { // Limit to first 10
            const creator = map.creator ? `by ${map.creator.username}` : 'Unknown creator';
            const created = map.created ? new Date(map.created).toLocaleDateString() : 'Unknown date';

            embed.addFields({
                name: `📍 ${map.name}`,
                value: `**ID:** \`${map.id}\`\n**Size:** ${map.size.width}x${map.size.height}\n**Creator:** ${creator}\n**Created:** ${created}\n**Description:** ${map.description || 'No description'}`,
                inline: false
            });
        }

        if (maps.length > 10) {
            embed.setFooter({ text: `Showing first 10 of ${maps.length} maps` });
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async handleUploadMap(interaction, customMapSystem) {
        const file = interaction.options.getAttachment('file');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || 'Uploaded custom map';

        // Validate file
        if (!file) {
            await interaction.reply({
                content: '❌ No file attached!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/json', 'text/plain'];
        if (!allowedTypes.includes(file.contentType) && !file.name.endsWith('.json')) {
            await interaction.reply({
                content: '❌ Invalid file type! Please upload PNG, JPG, or JSON files only.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            await interaction.reply({
                content: '❌ File too large! Maximum size is 10MB.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const response = await fetch(file.url);
            const buffer = await response.arrayBuffer();

            const mapId = `uploaded_${Date.now()}_${interaction.user.id}`;
            let mapData;

            if (file.contentType.startsWith('image/')) {
                // Process image file
                mapData = await this.processImageMap(buffer, mapId, name, description, interaction.user);
            } else {
                // Process JSON file
                const jsonData = JSON.parse(Buffer.from(buffer).toString());
                mapData = await this.processJsonMap(jsonData, mapId, name, description, interaction.user);
            }

            // Save the map
            const success = await customMapSystem.saveCustomMap(mapData);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Map Uploaded Successfully')
                    .setColor('#00FF00')
                    .setDescription(`Your custom map **${name}** has been uploaded and saved!`)
                    .addFields(
                        {
                            name: '📍 Map Details',
                            value: `**ID:** \`${mapId}\`\n**Size:** ${mapData.size.width}x${mapData.size.height}\n**Type:** ${file.contentType.startsWith('image/') ? 'Image' : 'JSON Data'}`,
                            inline: true
                        },
                        {
                            name: '🎮 Usage',
                            value: `Map ID: \`${mapId}\` — apply or preview it via the web panel`,
                            inline: true
                        }
                    );

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({
                    content: '❌ Failed to save the uploaded map. Please try again.'
                });
            }

        } catch (error) {
            console.error('Error processing uploaded map:', error);
            await interaction.editReply({
                content: '❌ Failed to process the uploaded file. Please check the file format and try again.'
            });
        }
    }

    async processImageMap(buffer, mapId, name, description, user) {
        const sharp = require('sharp');

        // Get image metadata
        const metadata = await sharp(buffer).metadata();
        const width = Math.min(Math.floor(metadata.width / 8), 200);
        const height = Math.min(Math.floor(metadata.height / 8), 200);

        // Save the uploaded image
        const fs = require('fs').promises;
        await fs.writeFile(`./maps/uploaded/${mapId}.png`, Buffer.from(buffer));

        return {
            id: mapId,
            name: name,
            description: description,
            creator: {
                id: user.id,
                username: user.username
            },
            created: new Date().toISOString(),
            size: { width, height },
            background: 'custom',
            terrain: new Map(),
            version: '1.0',
            uploadedImage: `${mapId}.png`
        };
    }

    async processJsonMap(jsonData, mapId, name, description, user) {
        // Validate JSON structure
        if (!jsonData.size || !jsonData.size.width || !jsonData.size.height) {
            throw new Error('Invalid JSON: missing size information');
        }

        const terrain = new Map();
        if (jsonData.terrain) {
            if (Array.isArray(jsonData.terrain)) {
                // Convert array format to Map
                for (const item of jsonData.terrain) {
                    if (item.coord && item.type) {
                        terrain.set(item.coord, { type: item.type, size: item.size || 'medium' });
                    }
                }
            } else if (typeof jsonData.terrain === 'object') {
                // Convert object format to Map
                for (const [coord, terrainData] of Object.entries(jsonData.terrain)) {
                    terrain.set(coord, terrainData);
                }
            }
        }

        return {
            id: mapId,
            name: name,
            description: description,
            creator: {
                id: user.id,
                username: user.username
            },
            created: new Date().toISOString(),
            size: {
                width: Math.min(jsonData.size.width, 200),
                height: Math.min(jsonData.size.height, 200)
            },
            background: jsonData.background || 'ocean',
            terrain: terrain,
            version: '1.0'
        };
    }
}

module.exports = CustomMapCommands;