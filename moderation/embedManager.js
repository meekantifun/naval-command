// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             EMBED MANAGER                                    ║
// ║                   Custom embed creation and editing system                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const fs = require('fs').promises;

class EmbedManager {
    constructor(bot) {
        this.bot = bot;
        this.embedData = new Map(); // messageId -> embedConfig
        this.dataFile = './data/embeds.json';
        this.loadEmbedData();
    }

    async loadEmbedData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.embedData = new Map(Object.entries(parsed));
            console.log(`✅ Loaded ${this.embedData.size} custom embed configurations`);
        } catch (error) {
            console.log('ℹ️ No existing embed data found, starting fresh');
            this.embedData = new Map();
        }
    }

    async saveEmbedData() {
        try {
            const dataObj = Object.fromEntries(this.embedData);
            await fs.writeFile(this.dataFile, JSON.stringify(dataObj, null, 2));
        } catch (error) {
            console.error('❌ Error saving embed data:', error);
        }
    }

    async createEmbedCommand(interaction) {
        // Check if user has GM permissions (manage messages or administrator)
        if (!interaction.member.permissions.has('MANAGE_MESSAGES') && !interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: '❌ You need "Manage Messages" or "Administrator" permissions to create custom embeds!',
                flags: MessageFlags.Ephemeral
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`embed_create_${interaction.user.id}`)
            .setTitle('📝 Create Custom Embed');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter embed title...')
            .setRequired(false)
            .setMaxLength(256);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter embed description...')
            .setRequired(true)
            .setMaxLength(4000);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#5865F2')
            .setRequired(false)
            .setMaxLength(7);

        const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel('Image URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false)
            .setMaxLength(500);

        const thumbnailInput = new TextInputBuilder()
            .setCustomId('embed_thumbnail')
            .setLabel('Thumbnail URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/thumbnail.png')
            .setRequired(false)
            .setMaxLength(500);

        const firstRow = new ActionRowBuilder().addComponents(titleInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(colorInput);
        const fourthRow = new ActionRowBuilder().addComponents(imageInput);
        const fifthRow = new ActionRowBuilder().addComponents(thumbnailInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async handleEmbedCreation(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('embed_title') || null;
            const description = interaction.fields.getTextInputValue('embed_description');
            const colorHex = interaction.fields.getTextInputValue('embed_color') || '#5865F2';
            const imageUrl = interaction.fields.getTextInputValue('embed_image') || null;
            const thumbnailUrl = interaction.fields.getTextInputValue('embed_thumbnail') || null;

            // Parse color
            let color = 0x5865F2;
            if (colorHex && colorHex.startsWith('#')) {
                color = parseInt(colorHex.substring(1), 16);
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(color)
                .setTimestamp()
                .setFooter({ text: `Created by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            if (title) {
                embed.setTitle(title);
            }

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            if (thumbnailUrl) {
                embed.setThumbnail(thumbnailUrl);
            }

            // Create edit button
            const editButton = new ButtonBuilder()
                .setCustomId(`edit_embed_${Date.now()}`)
                .setLabel('Edit Embed')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️');

            const deleteButton = new ButtonBuilder()
                .setCustomId(`delete_embed_${Date.now()}`)
                .setLabel('Delete Embed')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️');

            const actionRow = new ActionRowBuilder().addComponents(editButton, deleteButton);

            // Send the embed
            const message = await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                fetchReply: true
            });

            // Store embed configuration
            const embedConfig = {
                messageId: message.id,
                channelId: interaction.channelId,
                guildId: interaction.guildId,
                title: title,
                description: description,
                color: color,
                imageUrl: imageUrl,
                thumbnailUrl: thumbnailUrl,
                createdBy: interaction.user.id,
                createdAt: Date.now(),
                editButtonId: editButton.data.custom_id,
                deleteButtonId: deleteButton.data.custom_id
            };

            this.embedData.set(message.id, embedConfig);
            await this.saveEmbedData();

            await interaction.followUp({
                content: '✅ Custom embed created successfully! Use the "Edit Embed" button to modify it anytime.',
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error creating embed:', error);
            await interaction.reply({
                content: '❌ An error occurred while creating the embed. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleEmbedEdit(interaction) {
        const messageId = interaction.message.id;
        const embedConfig = this.embedData.get(messageId);

        if (!embedConfig) {
            return interaction.reply({
                content: '❌ Embed configuration not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Check permissions - only creator or users with manage messages can edit
        if (embedConfig.createdBy !== interaction.user.id &&
            !interaction.member.permissions.has('MANAGE_MESSAGES') &&
            !interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: '❌ You can only edit embeds you created, or you need "Manage Messages" permissions!',
                flags: MessageFlags.Ephemeral
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`embed_edit_${messageId}`)
            .setTitle('✏️ Edit Custom Embed');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter embed title...')
            .setRequired(false)
            .setMaxLength(256)
            .setValue(embedConfig.title || '');

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter embed description...')
            .setRequired(true)
            .setMaxLength(4000)
            .setValue(embedConfig.description);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#5865F2')
            .setRequired(false)
            .setMaxLength(7)
            .setValue('#' + embedConfig.color.toString(16).padStart(6, '0'));

        const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel('Image URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false)
            .setMaxLength(500)
            .setValue(embedConfig.imageUrl || '');

        const thumbnailInput = new TextInputBuilder()
            .setCustomId('embed_thumbnail')
            .setLabel('Thumbnail URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/thumbnail.png')
            .setRequired(false)
            .setMaxLength(500)
            .setValue(embedConfig.thumbnailUrl || '');

        const firstRow = new ActionRowBuilder().addComponents(titleInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(colorInput);
        const fourthRow = new ActionRowBuilder().addComponents(imageInput);
        const fifthRow = new ActionRowBuilder().addComponents(thumbnailInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async handleEmbedUpdate(interaction) {
        try {
            const messageId = interaction.customId.replace('embed_edit_', '');
            const embedConfig = this.embedData.get(messageId);

            if (!embedConfig) {
                return interaction.reply({
                    content: '❌ Embed configuration not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const title = interaction.fields.getTextInputValue('embed_title') || null;
            const description = interaction.fields.getTextInputValue('embed_description');
            const colorHex = interaction.fields.getTextInputValue('embed_color') || '#5865F2';
            const imageUrl = interaction.fields.getTextInputValue('embed_image') || null;
            const thumbnailUrl = interaction.fields.getTextInputValue('embed_thumbnail') || null;

            // Parse color
            let color = 0x5865F2;
            if (colorHex && colorHex.startsWith('#')) {
                color = parseInt(colorHex.substring(1), 16);
            }

            // Create updated embed
            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(color)
                .setTimestamp()
                .setFooter({
                    text: `Created by ${interaction.guild.members.cache.get(embedConfig.createdBy)?.user.tag || 'Unknown'} • Last edited by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            if (title) {
                embed.setTitle(title);
            }

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            if (thumbnailUrl) {
                embed.setThumbnail(thumbnailUrl);
            }

            // Update the message
            await interaction.message.edit({
                embeds: [embed]
            });

            // Update stored configuration
            embedConfig.title = title;
            embedConfig.description = description;
            embedConfig.color = color;
            embedConfig.imageUrl = imageUrl;
            embedConfig.thumbnailUrl = thumbnailUrl;
            embedConfig.lastEditedBy = interaction.user.id;
            embedConfig.lastEditedAt = Date.now();

            this.embedData.set(messageId, embedConfig);
            await this.saveEmbedData();

            await interaction.reply({
                content: '✅ Embed updated successfully!',
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error updating embed:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the embed. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleEmbedDelete(interaction) {
        const messageId = interaction.message.id;
        const embedConfig = this.embedData.get(messageId);

        if (!embedConfig) {
            return interaction.reply({
                content: '❌ Embed configuration not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Check permissions - only creator or users with manage messages can delete
        if (embedConfig.createdBy !== interaction.user.id &&
            !interaction.member.permissions.has('MANAGE_MESSAGES') &&
            !interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: '❌ You can only delete embeds you created, or you need "Manage Messages" permissions!',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            // Delete the message
            await interaction.message.delete();

            // Remove from data
            this.embedData.delete(messageId);
            await this.saveEmbedData();

            console.log(`🗑️ ${interaction.user.tag} deleted custom embed in ${interaction.guild.name}`);

        } catch (error) {
            console.error('Error deleting embed:', error);
            await interaction.reply({
                content: '❌ An error occurred while deleting the embed.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async listEmbeds(interaction) {
        const guildEmbeds = Array.from(this.embedData.values())
            .filter(config => config.guildId === interaction.guildId);

        if (guildEmbeds.length === 0) {
            return interaction.reply({
                content: '📝 No custom embeds found for this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📝 Custom Embeds')
            .setColor(0x5865F2)
            .setTimestamp();

        let description = '';
        for (const config of guildEmbeds.slice(0, 10)) { // Limit to 10 for display
            const channel = interaction.guild.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
            const creator = interaction.guild.members.cache.get(config.createdBy);
            const creatorName = creator ? creator.user.tag : 'Unknown User';

            description += `**${config.title || 'Untitled Embed'}**\n`;
            description += `📍 Channel: ${channelName}\n`;
            description += `👤 Created by: ${creatorName}\n`;
            description += `🕐 Created: <t:${Math.floor(config.createdAt / 1000)}:R>\n\n`;
        }

        if (guildEmbeds.length > 10) {
            description += `*... and ${guildEmbeds.length - 10} more embeds*`;
        }

        embed.setDescription(description);
        embed.setFooter({ text: `Total: ${guildEmbeds.length} embeds` });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        if (interaction.customId.startsWith('edit_embed_')) {
            await this.handleEmbedEdit(interaction);
            return true;
        } else if (interaction.customId.startsWith('delete_embed_')) {
            await this.handleEmbedDelete(interaction);
            return true;
        }
        return false;
    }

    // Handle modal submissions
    async handleModalSubmit(interaction) {
        if (interaction.customId.startsWith('embed_create_')) {
            await this.handleEmbedCreation(interaction);
            return true;
        } else if (interaction.customId.startsWith('embed_edit_')) {
            await this.handleEmbedUpdate(interaction);
            return true;
        }
        return false;
    }

    // Cleanup embeds for deleted messages
    async cleanupDeletedEmbeds(guild) {
        let cleaned = 0;

        for (const [messageId, config] of this.embedData.entries()) {
            if (config.guildId !== guild.id) continue;

            try {
                const channel = guild.channels.cache.get(config.channelId);
                if (!channel) {
                    this.embedData.delete(messageId);
                    cleaned++;
                    continue;
                }

                await channel.messages.fetch(messageId);
            } catch (error) {
                // Message doesn't exist, remove config
                this.embedData.delete(messageId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            await this.saveEmbedData();
            console.log(`🧹 Cleaned up ${cleaned} orphaned embed configurations in ${guild.name}`);
        }

        return cleaned;
    }
}

module.exports = EmbedManager;