// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              ROLE COMMANDS                                   ║
// ║                     Slash commands for role management                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

class RoleCommands {
    constructor(bot) {
        this.bot = bot;
    }

    getCommands() {
        return [
            // Role Selector Commands
            new SlashCommandBuilder()
                .setName('roles')
                .setDescription('Create a role selection embed')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of role selector')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Button', value: 'button' },
                            { name: 'Dropdown', value: 'dropdown' }
                        ))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('listroles')
                .setDescription('List all role configurations in this server')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            // Custom Embed Commands
            new SlashCommandBuilder()
                .setName('embed')
                .setDescription('Create a custom embed in this channel')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('listembeds')
                .setDescription('List all custom embeds in this server')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .setDMPermission(false)
        ];
    }

    async handleRoleCommand(interaction) {
        const { commandName } = interaction;

        try {
            // Check staff permissions for embed commands
            if ((commandName === 'embed' || commandName === 'listembeds') && !this.bot.hasStaffPermission(interaction.member)) {
                return interaction.reply({
                    content: '❌ You need staff permissions to use embed commands.\n\n' +
                             'Contact an administrator to:\n' +
                             '• Give you the configured staff role, or\n' +
                             '• Give you Manage Messages permission',
                    flags: MessageFlags.Ephemeral
                });
            }

            switch (commandName) {
                case 'roles': {
                    const type = interaction.options.getString('type');
                    if (type === 'button') {
                        await this.bot.moderationSystem.buttonRoles.createButtonRoleEmbed(interaction);
                    } else {
                        await this.bot.moderationSystem.dropdownRoles.createDropdownRoleEmbed(interaction);
                    }
                    break;
                }

                case 'listroles':
                    await this.handleListRoles(interaction);
                    break;

                case 'embed':
                    await this.bot.moderationSystem.embedManager.createEmbedCommand(interaction);
                    break;

                case 'listembeds':
                    await this.bot.moderationSystem.embedManager.listEmbeds(interaction);
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Unknown role command!',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error(`Error handling role command ${commandName}:`, error);
            const reply = { content: 'An error occurred while processing the role command.', flags: MessageFlags.Ephemeral };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }

    async handleListRoles(interaction) {
        const { EmbedBuilder } = require('discord.js');

        const buttonConfigs = Array.from(this.bot.moderationSystem.buttonRoles.buttonRoleData.values())
            .filter(c => c.guildId === interaction.guildId);
        const dropdownConfigs = Array.from(this.bot.moderationSystem.dropdownRoles.dropdownRoleData.values())
            .filter(c => c.guildId === interaction.guildId);

        if (buttonConfigs.length === 0 && dropdownConfigs.length === 0) {
            return interaction.reply({
                content: '📝 No role configurations found for this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Role Configurations')
            .setColor(0x5865F2)
            .setTimestamp();

        let description = '';

        for (const config of buttonConfigs) {
            const channel = interaction.guild.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
            description += `**${config.title}** — 🔘 Button\n`;
            description += `📍 ${channelName} · ${config.roles.length} roles\n`;
            description += `🕐 <t:${Math.floor(config.createdAt / 1000)}:R>\n\n`;
        }

        for (const config of dropdownConfigs) {
            const channel = interaction.guild.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : 'Unknown Channel';
            description += `**${config.title}** — 📋 Dropdown\n`;
            description += `📍 ${channelName} · ${config.roles.length} roles\n`;
            description += `🕐 <t:${Math.floor(config.createdAt / 1000)}:R>\n\n`;
        }

        embed.setDescription(description.trim());
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async handleRoleInfo(interaction) {
        const role = interaction.options.getRole('role');
        const { EmbedBuilder } = require('discord.js');

        const embed = new EmbedBuilder()
            .setTitle(`📋 Role Information: ${role.name}`)
            .setColor(role.color || 0x5865F2)
            .setTimestamp();

        // Basic information
        embed.addFields(
            { name: '🆔 Role ID', value: role.id, inline: true },
            { name: '🎨 Color', value: role.hexColor || 'Default', inline: true },
            { name: '📍 Position', value: role.position.toString(), inline: true },
            { name: '👥 Members', value: role.members.size.toString(), inline: true },
            { name: '🔒 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: '📢 Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true }
        );

        // Permissions
        if (role.permissions.toArray().length > 0) {
            const permissions = role.permissions.toArray().slice(0, 10); // Limit to first 10
            const permissionList = permissions.join(', ');
            const morePerms = role.permissions.toArray().length > 10 ? `... and ${role.permissions.toArray().length - 10} more` : '';

            embed.addFields({
                name: '🔑 Key Permissions',
                value: permissionList + morePerms,
                inline: false
            });
        }

        // Creation date
        embed.addFields({
            name: '📅 Created',
            value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`,
            inline: false
        });

        // Show some members if any
        if (role.members.size > 0) {
            const memberList = role.members.first(5).map(member => member.displayName).join(', ');
            const moreMembers = role.members.size > 5 ? `... and ${role.members.size - 5} more` : '';

            embed.addFields({
                name: '👤 Some Members',
                value: memberList + moreMembers,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }

    async handleRoleCount(interaction) {
        const specificRole = interaction.options.getRole('role');
        const { EmbedBuilder } = require('discord.js');

        if (specificRole) {
            // Show info for specific role
            const embed = new EmbedBuilder()
                .setTitle(`👥 Member Count: ${specificRole.name}`)
                .setColor(specificRole.color || 0x5865F2)
                .setDescription(`**${specificRole.members.size}** members have this role`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            // Show top roles by member count
            const roles = interaction.guild.roles.cache
                .filter(role => !role.managed && role.id !== interaction.guild.id) // Exclude bot roles and @everyone
                .sort((a, b) => b.members.size - a.members.size)
                .first(15);

            const embed = new EmbedBuilder()
                .setTitle('👥 Role Member Counts')
                .setColor(0x5865F2)
                .setTimestamp();

            let description = '';
            roles.forEach((role, index) => {
                const memberCount = role.members.size;
                const emoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📋';
                description += `${emoji} **${role.name}**: ${memberCount} members\\n`;
            });

            embed.setDescription(description);
            embed.setFooter({ text: `Total roles: ${interaction.guild.roles.cache.size}` });

            await interaction.reply({ embeds: [embed] });
        }
    }
}

module.exports = RoleCommands;