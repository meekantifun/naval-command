// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MESSAGE LOG COMMANDS                                 ║
// ║                    Slash commands for message logging                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

class MessageLogCommands {
    constructor(bot) {
        this.bot = bot;
    }

    getCommands() {
        return [
            // Set message log channel
            new SlashCommandBuilder()
                .setName('setmsglogchannel')
                .setDescription('Set the channel for message edit/delete logging')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to send message logs to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

            // Remove message log channel
            new SlashCommandBuilder()
                .setName('removemsglogchannel')
                .setDescription('Remove message logging for this server')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

            // Show current log channel
            new SlashCommandBuilder()
                .setName('msglogchannelinfo')
                .setDescription('Show current message logging configuration')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

            // Message logger statistics
            new SlashCommandBuilder()
                .setName('msgloggerstats')
                .setDescription('Show message logger statistics')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

            // Clear message cache
            new SlashCommandBuilder()
                .setName('clearmsgcache')
                .setDescription('Clear the message cache (for memory management)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ];
    }

    async handleMessageLogCommand(interaction) {
        const messageLogger = this.bot.messageLogger;

        if (!messageLogger) {
            await interaction.reply({
                content: '❌ Message logger is not initialized!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        switch (interaction.commandName) {
            case 'setmsglogchannel':
                await this.handleSetLogChannel(interaction, messageLogger);
                break;
            case 'removemsglogchannel':
                await this.handleRemoveLogChannel(interaction, messageLogger);
                break;
            case 'msglogchannelinfo':
                await this.handleLogChannelInfo(interaction, messageLogger);
                break;
            case 'msgloggerstats':
                await this.handleLoggerStats(interaction, messageLogger);
                break;
            case 'clearmsgcache':
                await this.handleClearMessageCache(interaction, messageLogger);
                break;
        }
    }

    async handleSetLogChannel(interaction, messageLogger) {
        const channel = interaction.options.getChannel('channel');

        // Check if bot has permission to send messages in the channel
        const botMember = interaction.guild.members.me;
        const permissions = channel.permissionsFor(botMember);

        if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
            await interaction.reply({
                content: `❌ I don't have permission to send messages or embed links in ${channel}! Please ensure I have the following permissions:\n• Send Messages\n• Embed Links`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            await messageLogger.setLogChannel(interaction.guild.id, channel.id);

            const embed = new EmbedBuilder()
                .setTitle('✅ Message Log Channel Set')
                .setColor('#00FF00')
                .setDescription(`Message edits and deletions will now be logged to ${channel}`)
                .addFields(
                    {
                        name: '📋 What will be logged:',
                        value: '• Message edits (before and after)\n• Message deletions (content and author)\n• Bulk message deletions',
                        inline: false
                    },
                    {
                        name: '⚙️ Configuration:',
                        value: `**Channel:** ${channel}\n**Guild:** ${interaction.guild.name}`,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Set by ${interaction.user.username}` });

            await interaction.reply({ embeds: [embed] });

            // Send a test message to the log channel
            const testEmbed = new EmbedBuilder()
                .setTitle('📋 Message Logger Initialized')
                .setColor('#00BFFF')
                .setDescription('This channel has been set up for message logging.')
                .addFields({
                    name: '📝 Logged Events:',
                    value: '• Message edits\n• Message deletions\n• Bulk deletions',
                    inline: false
                })
                .setTimestamp()
                .setFooter({ text: `Configured by ${interaction.user.username}` });

            await channel.send({ embeds: [testEmbed] });

        } catch (error) {
            console.error('❌ Error setting log channel:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting the log channel. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleRemoveLogChannel(interaction, messageLogger) {
        const currentChannelId = messageLogger.getLogChannel(interaction.guild.id);

        if (!currentChannelId) {
            await interaction.reply({
                content: '❌ No message log channel is currently set for this server.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            await messageLogger.removeLogChannel(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message Logging Disabled')
                .setColor('#FF6B6B')
                .setDescription('Message logging has been disabled for this server.')
                .addFields({
                    name: '⚠️ Note:',
                    value: 'Message edits and deletions will no longer be logged. You can re-enable logging at any time using `/setlogchannel`.',
                    inline: false
                })
                .setTimestamp()
                .setFooter({ text: `Disabled by ${interaction.user.username}` });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error removing log channel:', error);
            await interaction.reply({
                content: '❌ An error occurred while removing the log channel. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleLogChannelInfo(interaction, messageLogger) {
        const channelId = messageLogger.getLogChannel(interaction.guild.id);

        if (!channelId) {
            await interaction.reply({
                content: '❌ No message log channel is currently set for this server.\n\nUse `/setlogchannel` to configure message logging.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        const stats = messageLogger.getStatistics();

        const embed = new EmbedBuilder()
            .setTitle('📋 Message Logger Configuration')
            .setColor('#4A90E2')
            .addFields(
                {
                    name: '📍 Log Channel',
                    value: channel ? `${channel} (#${channel.name})` : `❌ Channel not found (ID: ${channelId})`,
                    inline: false
                },
                {
                    name: '📊 Status',
                    value: channel ? '✅ Active and logging' : '❌ Channel missing',
                    inline: true
                },
                {
                    name: '💾 Cached Messages',
                    value: `${stats.cachedMessages.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🌐 Total Configured Guilds',
                    value: `${stats.configuredGuilds}`,
                    inline: true
                },
                {
                    name: '📝 Logged Events',
                    value: '• Message edits (before/after)\n• Message deletions\n• Bulk deletions',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: `Guild: ${interaction.guild.name}` });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async handleLoggerStats(interaction, messageLogger) {
        const stats = messageLogger.getStatistics();
        const allChannels = messageLogger.getAllLogChannels();

        const embed = new EmbedBuilder()
            .setTitle('📊 Message Logger Statistics')
            .setColor('#9B59B6')
            .addFields(
                {
                    name: '🌐 Configured Guilds',
                    value: `${stats.configuredGuilds}`,
                    inline: true
                },
                {
                    name: '💾 Cached Messages',
                    value: `${stats.cachedMessages.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '📊 Memory Usage',
                    value: `~${Math.round(stats.cachedMessages * 0.5)} KB`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Message Logger Statistics' });

        // Add list of configured guilds (if not too many)
        if (allChannels.length <= 10) {
            const guildsList = [];
            for (const { guildId, channelId } of allChannels) {
                const guild = this.bot.client.guilds.cache.get(guildId);
                const channel = guild?.channels.cache.get(channelId);
                guildsList.push(`**${guild?.name || 'Unknown'}**: ${channel ? `#${channel.name}` : 'Channel not found'}`);
            }

            if (guildsList.length > 0) {
                embed.addFields({
                    name: '🏰 Configured Guilds',
                    value: guildsList.join('\n'),
                    inline: false
                });
            }
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async handleClearMessageCache(interaction, messageLogger) {
        const clearedCount = messageLogger.clearMessageCache();

        const embed = new EmbedBuilder()
            .setTitle('🧹 Message Cache Cleared')
            .setColor('#E67E22')
            .setDescription(`Successfully cleared ${clearedCount.toLocaleString()} messages from cache.`)
            .addFields({
                name: '💡 Info',
                value: 'The message cache stores recent messages to enable better logging of edits and deletions. It will rebuild naturally as new messages are sent.',
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: `Cleared by ${interaction.user.username}` });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

module.exports = MessageLogCommands;