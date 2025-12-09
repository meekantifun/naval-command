// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         STAFF ROLE COMMANDS                                  ║
// ║                Configure per-server staff role                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

class StaffRoleCommands {
    constructor(bot) {
        this.bot = bot;
    }

    getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('staffrole')
                .setDescription('Configure the staff role for this server (Administrator only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set')
                        .setDescription('Set the staff role')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('The role to use for staff permissions')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove the staff role configuration'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('View current staff role configuration'))
        ];
    }

    async handleStaffRole(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set':
                await this.handleSetStaffRole(interaction);
                break;
            case 'remove':
                await this.handleRemoveStaffRole(interaction);
                break;
            case 'info':
                await this.handleStaffRoleInfo(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❌ Unknown subcommand.',
                    flags: 64 // Ephemeral
                });
        }
    }

    async handleSetStaffRole(interaction) {
        const role = interaction.options.getRole('role');
        const guildId = interaction.guildId;

        // Verify administrator permission
        if (!this.bot.staffRoleManager.canConfigureStaff(interaction.member)) {
            return interaction.reply({
                content: '❌ You need Administrator permissions to configure the staff role.',
                flags: 64 // Ephemeral
            });
        }

        // Verify the role exists
        if (!role) {
            return interaction.reply({
                content: '❌ Invalid role specified.',
                flags: 64
            });
        }

        // Don't allow @everyone
        if (role.id === interaction.guild.id) {
            return interaction.reply({
                content: '❌ Cannot use @everyone as the staff role.',
                flags: 64
            });
        }

        // Set the staff role
        this.bot.staffRoleManager.setStaffRoleId(guildId, role.id);

        const embed = new EmbedBuilder()
            .setTitle('✅ Staff Role Configured')
            .setColor(0x00FF00)
            .setDescription(`The staff role has been set to ${role}`)
            .addFields(
                { name: '📋 Role Name', value: role.name, inline: true },
                { name: '👥 Members', value: role.members.size.toString(), inline: true },
                { name: '🔑 Permissions', value: 'Members with this role can now use staff commands', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Configured by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });

        console.log(`✅ Staff role set for guild ${interaction.guild.name} (${guildId}): @${role.name} (${role.id})`);
    }

    async handleRemoveStaffRole(interaction) {
        const guildId = interaction.guildId;

        // Verify administrator permission
        if (!this.bot.staffRoleManager.canConfigureStaff(interaction.member)) {
            return interaction.reply({
                content: '❌ You need Administrator permissions to configure the staff role.',
                flags: 64
            });
        }

        // Check if there's a staff role configured
        const currentRoleId = this.bot.staffRoleManager.getStaffRoleId(guildId);

        if (!currentRoleId) {
            return interaction.reply({
                content: '⚠️ No staff role is currently configured for this server.',
                flags: 64
            });
        }

        // Remove the staff role
        this.bot.staffRoleManager.removeStaffRole(guildId);

        const embed = new EmbedBuilder()
            .setTitle('✅ Staff Role Removed')
            .setColor(0xFF9900)
            .setDescription('The staff role configuration has been removed.')
            .addFields({
                name: '🔄 Fallback Permissions',
                value: 'Staff commands will now require **Manage Messages** or **Administrator** permissions.'
            })
            .setTimestamp()
            .setFooter({ text: `Removed by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });

        console.log(`✅ Staff role removed for guild ${interaction.guild.name} (${guildId})`);
    }

    async handleStaffRoleInfo(interaction) {
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        const staffInfo = this.bot.staffRoleManager.getStaffInfo(guild);

        const embed = new EmbedBuilder()
            .setTitle('ℹ️ Staff Role Configuration')
            .setColor(staffInfo.configured ? (staffInfo.valid ? 0x5865F2 : 0xFF0000) : 0x99AAB5)
            .setTimestamp();

        if (!staffInfo.configured) {
            // No staff role configured
            embed.setDescription('No staff role is currently configured for this server.')
                .addFields(
                    {
                        name: '🔑 Current Permissions',
                        value: 'Staff commands require **Manage Messages** or **Administrator** permissions.'
                    },
                    {
                        name: '📝 How to Configure',
                        value: 'Use `/staffrole set @role` to configure a custom staff role.'
                    }
                );
        } else if (staffInfo.invalid) {
            // Staff role configured but role doesn't exist
            embed.setDescription('⚠️ The configured staff role was not found.')
                .addFields(
                    {
                        name: '❌ Issue',
                        value: `Role ID \`${staffInfo.roleId}\` does not exist. It may have been deleted.`
                    },
                    {
                        name: '🔧 Fix',
                        value: 'Use `/staffrole set @role` to set a new staff role, or `/staffrole remove` to clear the configuration.'
                    }
                );
        } else {
            // Valid staff role configured
            const role = staffInfo.role;
            const members = role.members.size;

            embed.setDescription(`Staff role: ${role}`)
                .addFields(
                    { name: '📋 Role Name', value: role.name, inline: true },
                    { name: '🆔 Role ID', value: role.id, inline: true },
                    { name: '👥 Members', value: members.toString(), inline: true },
                    {
                        name: '🔑 Access',
                        value: `Members with ${role} can use staff commands like:\n` +
                               '• `/register` - Register characters\n' +
                               '• `/newchar` - Create characters manually\n' +
                               '• `/prepare` - Start battles\n' +
                               '• `/spawn` - Spawn AI units\n' +
                               '• And other GM commands'
                    }
                );

            // List some members if not too many
            if (members > 0 && members <= 10) {
                const memberList = role.members
                    .map(m => `• ${m.user.tag}`)
                    .slice(0, 10)
                    .join('\n');

                embed.addFields({
                    name: '👤 Members with this role',
                    value: memberList
                });
            } else if (members > 10) {
                embed.addFields({
                    name: '👤 Members',
                    value: `${members} members have this role (too many to list)`
                });
            }
        }

        embed.addFields({
            name: '⚙️ Commands',
            value: '`/staffrole set @role` - Set staff role\n' +
                   '`/staffrole remove` - Remove staff role\n' +
                   '`/staffrole info` - View this info'
        });

        await interaction.reply({ embeds: [embed], flags: 64 });
    }
}

module.exports = StaffRoleCommands;
