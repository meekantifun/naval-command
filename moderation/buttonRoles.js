// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BUTTON ROLES                                    ║
// ║                    Toggle roles with button interactions                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs').promises;

class ButtonRoles {
    constructor(bot) {
        this.bot = bot;
        this.buttonRoleData = new Map(); // channelId -> embedData
        this.dataFile = './data/buttonRoles.json';
        this.loadButtonRoleData();
    }

    async loadButtonRoleData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.buttonRoleData = new Map(Object.entries(parsed));
            console.log(`✅ Loaded ${this.buttonRoleData.size} button role configurations`);
        } catch (error) {
            console.log('ℹ️ No existing button role data found, starting fresh');
            this.buttonRoleData = new Map();
        }
    }

    async saveButtonRoleData() {
        try {
            const dataObj = Object.fromEntries(this.buttonRoleData);
            await fs.writeFile(this.dataFile, JSON.stringify(dataObj, null, 2));
        } catch (error) {
            console.error('❌ Error saving button role data:', error);
        }
    }

    async createButtonRoleEmbed(interaction) {
        if (!interaction.member.permissions.has('MANAGE_ROLES')) {
            return interaction.reply({
                content: '❌ You need the "Manage Roles" permission to use this command!',
                flags: MessageFlags.Ephemeral
            });
        }

        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

        const modal = new ModalBuilder()
            .setCustomId(`button_role_setup_${interaction.user.id}`)
            .setTitle('🔘 Button Role Setup');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Select Your Roles')
            .setRequired(true)
            .setMaxLength(256);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Click the buttons below to toggle your roles')
            .setRequired(false)
            .setMaxLength(4000);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#5865F2')
            .setRequired(false)
            .setMaxLength(7);

        const rolesInput = new TextInputBuilder()
            .setCustomId('roles_config')
            .setLabel('Roles Configuration')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Format: RoleID:Emoji:Label\nExample: 123456789:🎮:Gamer\n987654321:🎵:Music Lover')
            .setRequired(true)
            .setMaxLength(2000);

        const thumbnailInput = new TextInputBuilder()
            .setCustomId('embed_thumbnail')
            .setLabel('Thumbnail URL (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false)
            .setMaxLength(200);

        const firstRow = new ActionRowBuilder().addComponents(titleInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(colorInput);
        const fourthRow = new ActionRowBuilder().addComponents(rolesInput);
        const fifthRow = new ActionRowBuilder().addComponents(thumbnailInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async handleButtonRoleSetup(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('embed_title');
            const description = interaction.fields.getTextInputValue('embed_description') || 'Click the buttons below to toggle your roles';
            const colorHex = interaction.fields.getTextInputValue('embed_color') || '#5865F2';
            const rolesConfig = interaction.fields.getTextInputValue('roles_config');
            const thumbnail = interaction.fields.getTextInputValue('embed_thumbnail') || null;

            // Parse color
            let color = 0x5865F2;
            if (colorHex && colorHex.startsWith('#')) {
                color = parseInt(colorHex.substring(1), 16);
            }

            // Parse roles configuration
            const roleConfigs = [];
            const lines = rolesConfig.split('\n').filter(line => line.trim());

            for (const line of lines) {
                const parts = line.split(':');
                if (parts.length >= 3) {
                    const roleId = parts[0].trim();
                    const emoji = parts[1].trim();
                    const label = parts.slice(2).join(':').trim();

                    // Validate role exists
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (!role) {
                        return interaction.reply({
                            content: `❌ Role with ID ${roleId} not found! Make sure the role ID is correct.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Check bot can assign this role
                    const botMember = interaction.guild.members.me;
                    if (role.position >= botMember.roles.highest.position) {
                        return interaction.reply({
                            content: `❌ I cannot assign the role "${role.name}" because it's higher than my highest role!`,
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    roleConfigs.push({ roleId, emoji, label, roleName: role.name });
                }
            }

            if (roleConfigs.length === 0) {
                return interaction.reply({
                    content: '❌ No valid roles configured! Please check your format:\n`RoleID:Emoji:Label`',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (roleConfigs.length > 25) {
                return interaction.reply({
                    content: '❌ Maximum 25 roles allowed per button role message!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            if (thumbnail) {
                embed.setThumbnail(thumbnail);
            }

            // Create buttons (max 5 per row, max 5 rows = 25 buttons total)
            const actionRows = [];
            for (let i = 0; i < roleConfigs.length; i += 5) {
                const row = new ActionRowBuilder();
                const rowRoles = roleConfigs.slice(i, i + 5);

                for (const roleConfig of rowRoles) {
                    const button = new ButtonBuilder()
                        .setCustomId(`button_role_${roleConfig.roleId}`)
                        .setLabel(roleConfig.label)
                        .setEmoji(roleConfig.emoji)
                        .setStyle(ButtonStyle.Secondary);

                    row.addComponents(button);
                }
                actionRows.push(row);
            }

            // Send the embed
            const message = await interaction.reply({
                embeds: [embed],
                components: actionRows,
                fetchReply: true
            });

            // Store configuration
            const configId = `${interaction.guildId}_${message.id}`;
            this.buttonRoleData.set(configId, {
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                messageId: message.id,
                title: title,
                description: description,
                color: color,
                thumbnail: thumbnail,
                roles: roleConfigs,
                createdBy: interaction.user.id,
                createdAt: Date.now()
            });

            await this.saveButtonRoleData();

            await interaction.followUp({
                content: `✅ Button role embed created successfully!\n📊 **Configured Roles:** ${roleConfigs.length}\n🔘 **Buttons:** ${roleConfigs.map(r => `${r.emoji} ${r.label}`).join(', ')}`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error handling button role setup:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up button roles. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleButtonRoleInteraction(interaction) {
        try {
            const roleId = interaction.customId.replace('button_role_', '');
            const configId = `${interaction.guildId}_${interaction.message.id}`;
            const config = this.buttonRoleData.get(configId);

            if (!config) {
                return interaction.reply({
                    content: '❌ Role configuration not found for this message!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const roleConfig = config.roles.find(r => r.roleId === roleId);
            if (!roleConfig) {
                return interaction.reply({
                    content: '❌ Role configuration not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                return interaction.reply({
                    content: '❌ Role no longer exists!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const member = interaction.member;
            const hasRole = member.roles.cache.has(roleId);

            try {
                if (hasRole) {
                    await member.roles.remove(role);
                    await interaction.reply({
                        content: `✅ Removed role **${role.name}** ${roleConfig.emoji}`,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await member.roles.add(role);
                    await interaction.reply({
                        content: `✅ Added role **${role.name}** ${roleConfig.emoji}`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Log the role change
                console.log(`🔘 ${interaction.user.tag} ${hasRole ? 'removed' : 'added'} role ${role.name} in ${interaction.guild.name}`);

            } catch (error) {
                console.error('Error managing role:', error);
                await interaction.reply({
                    content: '❌ I don\'t have permission to assign this role or the role is higher than mine!',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling button role interaction:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your role request.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async listButtonRoles(interaction) {
        const guildConfigs = Array.from(this.buttonRoleData.values())
            .filter(config => config.guildId === interaction.guildId);

        if (guildConfigs.length === 0) {
            return interaction.reply({
                content: '📝 No button role configurations found for this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔘 Button Role Configurations')
            .setColor(0x5865F2)
            .setTimestamp();

        let description = '';
        for (const config of guildConfigs) {
            const channel = interaction.guild.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : 'Unknown Channel';

            description += `**${config.title}**\n`;
            description += `📍 Channel: ${channelName}\n`;
            description += `🔘 Roles: ${config.roles.length}\n`;
            description += `🕐 Created: <t:${Math.floor(config.createdAt / 1000)}:R>\n\n`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async deleteButtonRole(interaction, messageId) {
        if (!interaction.member.permissions.has('MANAGE_ROLES')) {
            return interaction.reply({
                content: '❌ You need the "Manage Roles" permission to delete button role configurations!',
                flags: MessageFlags.Ephemeral
            });
        }

        const configId = `${interaction.guildId}_${messageId}`;
        const config = this.buttonRoleData.get(configId);

        if (!config) {
            return interaction.reply({
                content: '❌ Button role configuration not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Try to delete the message
        try {
            const channel = interaction.guild.channels.cache.get(config.channelId);
            if (channel) {
                const message = await channel.messages.fetch(messageId);
                if (message) {
                    await message.delete();
                }
            }
        } catch (error) {
            console.log('Could not delete button role message:', error.message);
        }

        // Remove from data
        this.buttonRoleData.delete(configId);
        await this.saveButtonRoleData();

        await interaction.reply({
            content: `✅ Button role configuration "${config.title}" has been deleted!`,
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = ButtonRoles;