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
            // Button Roles Commands
            new SlashCommandBuilder()
                .setName('buttonroles')
                .setDescription('Create a button role selection embed')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('listbuttonroles')
                .setDescription('List all button role configurations in this server')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('deletebuttonrole')
                .setDescription('Delete a button role configuration')
                .addStringOption(option =>
                    option.setName('messageid')
                        .setDescription('The message ID of the button role embed to delete')
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            // Dropdown Roles Commands
            new SlashCommandBuilder()
                .setName('dropdownroles')
                .setDescription('Create a dropdown role selection embed')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('listdropdownroles')
                .setDescription('List all dropdown role configurations in this server')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('deletedropdownrole')
                .setDescription('Delete a dropdown role configuration')
                .addStringOption(option =>
                    option.setName('messageid')
                        .setDescription('The message ID of the dropdown role embed to delete')
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false),

            // General Role Management
            new SlashCommandBuilder()
                .setName('roleinfo')
                .setDescription('Get information about a role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to get information about')
                        .setRequired(true))
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('rolecount')
                .setDescription('Show member count for roles')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Specific role to check (optional)')
                        .setRequired(false))
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
                case 'buttonroles':
                    await this.bot.moderationSystem.buttonRoles.createButtonRoleEmbed(interaction);
                    break;

                case 'listbuttonroles':
                    await this.bot.moderationSystem.buttonRoles.listButtonRoles(interaction);
                    break;

                case 'deletebuttonrole':
                    const buttonMessageId = interaction.options.getString('messageid');
                    await this.bot.moderationSystem.buttonRoles.deleteButtonRole(interaction, buttonMessageId);
                    break;

                case 'dropdownroles':
                    await this.bot.moderationSystem.dropdownRoles.createDropdownRoleEmbed(interaction);
                    break;

                case 'listdropdownroles':
                    await this.bot.moderationSystem.dropdownRoles.listDropdownRoles(interaction);
                    break;

                case 'deletedropdownrole':
                    const dropdownMessageId = interaction.options.getString('messageid');
                    await this.bot.moderationSystem.dropdownRoles.deleteDropdownRole(interaction, dropdownMessageId);
                    break;

                case 'roleinfo':
                    await this.handleRoleInfo(interaction);
                    break;

                case 'rolecount':
                    await this.handleRoleCount(interaction);
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