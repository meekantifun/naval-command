// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             DROPDOWN ROLES                                   ║
// ║                    Single-select roles with dropdown menus                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;

class DropdownRoles {
    constructor(bot) {
        this.bot = bot;
        this.dropdownRoleData = new Map(); // channelId -> embedData
        this.dataFile = './data/dropdownRoles.json';
        this.loadDropdownRoleData();
    }

    async loadDropdownRoleData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.dropdownRoleData = new Map(Object.entries(parsed));
            console.log(`✅ Loaded ${this.dropdownRoleData.size} dropdown role configurations`);
        } catch (error) {
            console.log('ℹ️ No existing dropdown role data found, starting fresh');
            this.dropdownRoleData = new Map();
        }
    }

    async saveDropdownRoleData() {
        try {
            const dataObj = Object.fromEntries(this.dropdownRoleData);
            await fs.writeFile(this.dataFile, JSON.stringify(dataObj, null, 2));
        } catch (error) {
            console.error('❌ Error saving dropdown role data:', error);
        }
    }

    async createDropdownRoleEmbed(interaction) {
        if (!interaction.member.permissions.has('MANAGE_ROLES')) {
            return interaction.reply({
                content: '❌ You need the "Manage Roles" permission to use this command!',
                flags: MessageFlags.Ephemeral
            });
        }

        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

        const modal = new ModalBuilder()
            .setCustomId(`dropdown_role_setup_${interaction.user.id}`)
            .setTitle('📋 Dropdown Role Setup');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Choose Your Role')
            .setRequired(true)
            .setMaxLength(256);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Select one role from the dropdown menu below')
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
            .setPlaceholder('Format: RoleID:Emoji:Label:Description\\nExample: 123456789:🎮:Gamer:For gamers')
            .setRequired(true)
            .setMaxLength(3000);

        const placeholderInput = new TextInputBuilder()
            .setCustomId('dropdown_placeholder')
            .setLabel('Dropdown Placeholder Text')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Select a role...')
            .setRequired(false)
            .setMaxLength(150);

        const firstRow = new ActionRowBuilder().addComponents(titleInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(colorInput);
        const fourthRow = new ActionRowBuilder().addComponents(rolesInput);
        const fifthRow = new ActionRowBuilder().addComponents(placeholderInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async handleDropdownRoleSetup(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('embed_title');
            const description = interaction.fields.getTextInputValue('embed_description') || 'Select one role from the dropdown menu below';
            const colorHex = interaction.fields.getTextInputValue('embed_color') || '#5865F2';
            const rolesConfig = interaction.fields.getTextInputValue('roles_config');
            const placeholder = interaction.fields.getTextInputValue('dropdown_placeholder') || 'Select a role...';

            // Parse color
            let color = 0x5865F2;
            if (colorHex && colorHex.startsWith('#')) {
                color = parseInt(colorHex.substring(1), 16);
            }

            // Parse roles configuration
            const roleConfigs = [];
            const lines = rolesConfig.split('\\n').filter(line => line.trim());

            for (const line of lines) {
                const parts = line.split(':');
                if (parts.length >= 3) {
                    const roleId = parts[0].trim();
                    const emoji = parts[1].trim();
                    const label = parts[2].trim();
                    const roleDescription = parts.length > 3 ? parts.slice(3).join(':').trim() : '';

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

                    // Clean and validate the description
                    let cleanDescription = roleDescription.trim();
                    // Ensure description doesn't contain newlines or other control characters
                    cleanDescription = cleanDescription.replace(/[\r\n\t]/g, ' ').trim();

                    roleConfigs.push({
                        roleId,
                        emoji,
                        label,
                        description: cleanDescription,
                        roleName: role.name
                    });
                }
            }

            if (roleConfigs.length === 0) {
                return interaction.reply({
                    content: '❌ No valid roles configured! Please check your format:\\n`RoleID:Emoji:Label:Description`',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (roleConfigs.length > 25) {
                return interaction.reply({
                    content: '❌ Maximum 25 roles allowed per dropdown menu!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            // Add field showing available roles
            const rolesField = roleConfigs.map(r => `${r.emoji} **${r.roleName}** - ${r.description || r.label}`).join('\n');
            embed.addFields({
                name: '📋 Available Roles',
                value: rolesField,
                inline: false
            });

            // Create dropdown menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`dropdown_role_select_${Date.now()}`)
                .setPlaceholder(placeholder)
                .setMinValues(0)
                .setMaxValues(1);

            // Add "Remove Role" option
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Remove Role')
                    .setDescription('Remove your current role from this category')
                    .setValue('remove_role')
                    .setEmoji('❌')
            );

            // Add role options
            for (const roleConfig of roleConfigs) {
                // Ensure description is under 100 characters (Discord limit)
                let description = roleConfig.description || `Get the ${roleConfig.roleName} role`;
                if (description.length > 100) {
                    description = description.substring(0, 97) + '...';
                }

                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(roleConfig.label)
                    .setDescription(description)
                    .setValue(roleConfig.roleId)
                    .setEmoji(roleConfig.emoji);

                selectMenu.addOptions(option);
            }

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            // Send the embed
            const message = await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                fetchReply: true
            });

            // Store configuration
            const configId = `${interaction.guildId}_${message.id}`;
            this.dropdownRoleData.set(configId, {
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                messageId: message.id,
                title: title,
                description: description,
                color: color,
                placeholder: placeholder,
                roles: roleConfigs,
                createdBy: interaction.user.id,
                createdAt: Date.now(),
                selectMenuId: selectMenu.data.custom_id
            });

            await this.saveDropdownRoleData();

            await interaction.followUp({
                content: `✅ Dropdown role embed created successfully!\\n📊 **Configured Roles:** ${roleConfigs.length}\\n📋 **Options:** ${roleConfigs.map(r => `${r.emoji} ${r.label}`).join(', ')}`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error handling dropdown role setup:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up dropdown roles. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleDropdownRoleInteraction(interaction) {
        try {
            const selectedValue = interaction.values[0];
            const configId = `${interaction.guildId}_${interaction.message.id}`;
            const config = this.dropdownRoleData.get(configId);

            if (!config) {
                return interaction.reply({
                    content: '❌ Role configuration not found for this message!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const member = interaction.member;

            // Handle role removal
            if (selectedValue === 'remove_role') {
                const rolesToRemove = [];

                // Find all roles from this dropdown that the user has
                for (const roleConfig of config.roles) {
                    if (member.roles.cache.has(roleConfig.roleId)) {
                        rolesToRemove.push(roleConfig);
                    }
                }

                if (rolesToRemove.length === 0) {
                    return interaction.reply({
                        content: '❌ You don\'t have any roles from this category to remove!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                try {
                    // Remove all roles from this category
                    for (const roleConfig of rolesToRemove) {
                        const role = interaction.guild.roles.cache.get(roleConfig.roleId);
                        if (role) {
                            await member.roles.remove(role);
                        }
                    }

                    const removedRoles = rolesToRemove.map(r => `**${r.roleName}** ${r.emoji}`).join(', ');
                    await interaction.reply({
                        content: `✅ Removed roles: ${removedRoles}`,
                        flags: MessageFlags.Ephemeral
                    });

                    console.log(`📋 ${interaction.user.tag} removed dropdown roles: ${removedRoles} in ${interaction.guild.name}`);

                } catch (error) {
                    console.error('Error removing roles:', error);
                    await interaction.reply({
                        content: '❌ I don\'t have permission to remove some roles!',
                        flags: MessageFlags.Ephemeral
                    });
                }
                return;
            }

            // Handle role assignment
            const selectedRoleConfig = config.roles.find(r => r.roleId === selectedValue);
            if (!selectedRoleConfig) {
                return interaction.reply({
                    content: '❌ Selected role configuration not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const newRole = interaction.guild.roles.cache.get(selectedValue);
            if (!newRole) {
                return interaction.reply({
                    content: '❌ Selected role no longer exists!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                // Remove any existing roles from this dropdown category
                const rolesToRemove = [];
                for (const roleConfig of config.roles) {
                    if (roleConfig.roleId !== selectedValue && member.roles.cache.has(roleConfig.roleId)) {
                        rolesToRemove.push(interaction.guild.roles.cache.get(roleConfig.roleId));
                    }
                }

                // Remove old roles
                if (rolesToRemove.length > 0) {
                    await member.roles.remove(rolesToRemove);
                }

                // Add new role if not already has it
                if (!member.roles.cache.has(selectedValue)) {
                    await member.roles.add(newRole);

                    let message = `✅ Added role **${newRole.name}** ${selectedRoleConfig.emoji}`;
                    if (rolesToRemove.length > 0) {
                        const removedNames = rolesToRemove.map(r => r.name).join(', ');
                        message += `\\n🔄 Removed: **${removedNames}**`;
                    }

                    await interaction.reply({
                        content: message,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    // User already has this role
                    await interaction.reply({
                        content: `ℹ️ You already have the **${newRole.name}** role ${selectedRoleConfig.emoji}`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Log the role change
                console.log(`📋 ${interaction.user.tag} selected role ${newRole.name} in ${interaction.guild.name}`);

            } catch (error) {
                console.error('Error managing dropdown role:', error);
                await interaction.reply({
                    content: '❌ I don\'t have permission to assign this role or the role is higher than mine!',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling dropdown role interaction:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your role selection.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async listDropdownRoles(interaction) {
        const guildConfigs = Array.from(this.dropdownRoleData.values())
            .filter(config => config.guildId === interaction.guildId);

        if (guildConfigs.length === 0) {
            return interaction.reply({
                content: '📝 No dropdown role configurations found for this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Dropdown Role Configurations')
            .setColor(0x5865F2)
            .setTimestamp();

        let description = '';
        for (const config of guildConfigs) {
            const channel = interaction.guild.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : 'Unknown Channel';

            description += `**${config.title}**\\n`;
            description += `📍 Channel: ${channelName}\\n`;
            description += `📋 Roles: ${config.roles.length}\\n`;
            description += `🕐 Created: <t:${Math.floor(config.createdAt / 1000)}:R>\\n\\n`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async deleteDropdownRole(interaction, messageId) {
        if (!interaction.member.permissions.has('MANAGE_ROLES')) {
            return interaction.reply({
                content: '❌ You need the "Manage Roles" permission to delete dropdown role configurations!',
                flags: MessageFlags.Ephemeral
            });
        }

        const configId = `${interaction.guildId}_${messageId}`;
        const config = this.dropdownRoleData.get(configId);

        if (!config) {
            return interaction.reply({
                content: '❌ Dropdown role configuration not found!',
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
            console.log('Could not delete dropdown role message:', error.message);
        }

        // Remove from data
        this.dropdownRoleData.delete(configId);
        await this.saveDropdownRoleData();

        await interaction.reply({
            content: `✅ Dropdown role configuration "${config.title}" has been deleted!`,
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = DropdownRoles;