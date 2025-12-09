// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            MESSAGE LOGGER SYSTEM                             ║
// ║                    Logs message edits and deletions                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;

class MessageLogger {
    constructor(bot) {
        this.bot = bot;
        this.logChannelData = new Map();
        this.messageCache = new Map();

        this.initializeLogger();
    }

    async initializeLogger() {
        await this.loadLogChannelData();
        this.setupEventListeners();
    }

    async loadLogChannelData() {
        try {
            const data = await fs.readFile('./data/messageLogChannels.json', 'utf8');
            const parsed = JSON.parse(data);
            this.logChannelData = new Map(Object.entries(parsed));
            console.log('📋 Loaded message log channel configurations');
        } catch (error) {
            console.log('📋 No existing message log channel data found, starting fresh');
            this.logChannelData = new Map();
        }
    }

    async saveLogChannelData() {
        try {
            const dataObj = Object.fromEntries(this.logChannelData);
            await fs.writeFile('./data/messageLogChannels.json', JSON.stringify(dataObj, null, 2));
        } catch (error) {
            console.error('❌ Error saving message log channel data:', error);
        }
    }

    setupEventListeners() {
        // Cache messages for edit/delete logging
        this.bot.client.on('messageCreate', (message) => {
            if (!message.author.bot) {
                this.cacheMessage(message);
            }
        });

        // Handle message updates (edits)
        this.bot.client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (newMessage.author?.bot) return;
            await this.logMessageEdit(oldMessage, newMessage);
        });

        // Handle message deletions
        this.bot.client.on('messageDelete', async (message) => {
            if (message.author?.bot) return;
            await this.logMessageDelete(message);
        });

        // Handle bulk message deletions
        this.bot.client.on('messageDeleteBulk', async (messages) => {
            await this.logBulkMessageDelete(messages);
        });
    }

    cacheMessage(message) {
        // Cache message data for potential logging
        this.messageCache.set(message.id, {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                displayName: message.author.displayName,
                avatar: message.author.displayAvatarURL()
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name
            },
            guild: {
                id: message.guild?.id,
                name: message.guild?.name
            },
            createdAt: message.createdAt,
            attachments: message.attachments.map(att => ({
                name: att.name,
                url: att.url,
                size: att.size
            }))
        });

        // Limit cache size to prevent memory issues
        if (this.messageCache.size > 10000) {
            const firstKey = this.messageCache.keys().next().value;
            this.messageCache.delete(firstKey);
        }
    }

    async logMessageEdit(oldMessage, newMessage) {
        if (!newMessage.guild) return;

        const logChannelId = this.logChannelData.get(newMessage.guild.id);
        if (!logChannelId) return;

        const logChannel = newMessage.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        // Get cached message data or use partial data
        const cachedMessage = this.messageCache.get(newMessage.id);
        const oldContent = oldMessage.content || cachedMessage?.content || '*Content not cached*';

        // Skip if content is the same (embed updates, etc.)
        if (oldContent === newMessage.content) return;

        const embed = new EmbedBuilder()
            .setTitle('📝 Message Edited')
            .setColor('#FFA500')
            .setAuthor({
                name: `${newMessage.author.username} (${newMessage.author.id})`,
                iconURL: newMessage.author.displayAvatarURL()
            })
            .addFields(
                {
                    name: '📍 Channel',
                    value: `${newMessage.channel} (#${newMessage.channel.name})`,
                    inline: true
                },
                {
                    name: '🔗 Message Link',
                    value: `[Jump to Message](${newMessage.url})`,
                    inline: true
                },
                {
                    name: '⏰ Edited At',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: '📄 Before',
                    value: oldContent.length > 1024 ? oldContent.substring(0, 1021) + '...' : oldContent || '*No content*',
                    inline: false
                },
                {
                    name: '📝 After',
                    value: newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content || '*No content*',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${newMessage.id}` });

        try {
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Error sending message edit log:', error);
        }
    }

    async logMessageDelete(message) {
        if (!message.guild) return;

        const logChannelId = this.logChannelData.get(message.guild.id);
        if (!logChannelId) return;

        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        // Get cached message data or use partial data
        const cachedMessage = this.messageCache.get(message.id);
        const messageData = cachedMessage || {
            content: message.content || '*Content not available*',
            author: {
                id: message.author?.id || 'Unknown',
                username: message.author?.username || 'Unknown User',
                avatar: message.author?.displayAvatarURL() || null
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name
            },
            createdAt: message.createdAt,
            attachments: message.attachments?.map(att => ({
                name: att.name,
                url: att.url,
                size: att.size
            })) || []
        };

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Message Deleted')
            .setColor('#FF0000')
            .setAuthor({
                name: `${messageData.author.username} (${messageData.author.id})`,
                iconURL: messageData.author.avatar
            })
            .addFields(
                {
                    name: '📍 Channel',
                    value: `#${messageData.channel.name}`,
                    inline: true
                },
                {
                    name: '⏰ Deleted At',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: '📅 Originally Sent',
                    value: messageData.createdAt ? `<t:${Math.floor(messageData.createdAt.getTime() / 1000)}:F>` : 'Unknown',
                    inline: true
                },
                {
                    name: '📄 Content',
                    value: messageData.content.length > 1024 ? messageData.content.substring(0, 1021) + '...' : messageData.content || '*No content*',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${message.id}` });

        // Add attachment information if present
        if (messageData.attachments && messageData.attachments.length > 0) {
            const attachmentInfo = messageData.attachments.map(att =>
                `📎 ${att.name} (${(att.size / 1024).toFixed(1)} KB)`
            ).join('\n');

            embed.addFields({
                name: '📎 Attachments',
                value: attachmentInfo.length > 1024 ? attachmentInfo.substring(0, 1021) + '...' : attachmentInfo,
                inline: false
            });
        }

        try {
            await logChannel.send({ embeds: [embed] });
            // Remove from cache after logging
            this.messageCache.delete(message.id);
        } catch (error) {
            console.error('❌ Error sending message delete log:', error);
        }
    }

    async logBulkMessageDelete(messages) {
        if (messages.size === 0) return;

        const firstMessage = messages.first();
        if (!firstMessage.guild) return;

        const logChannelId = this.logChannelData.get(firstMessage.guild.id);
        if (!logChannelId) return;

        const logChannel = firstMessage.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Bulk Message Deletion')
            .setColor('#FF4500')
            .addFields(
                {
                    name: '📍 Channel',
                    value: `${firstMessage.channel} (#${firstMessage.channel.name})`,
                    inline: true
                },
                {
                    name: '📊 Messages Deleted',
                    value: `${messages.size}`,
                    inline: true
                },
                {
                    name: '⏰ Deleted At',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ text: `Bulk deletion in ${firstMessage.guild.name}` });

        try {
            await logChannel.send({ embeds: [embed] });

            // Remove deleted messages from cache
            messages.forEach(message => {
                this.messageCache.delete(message.id);
            });
        } catch (error) {
            console.error('❌ Error sending bulk delete log:', error);
        }
    }

    // Set the log channel for a guild
    async setLogChannel(guildId, channelId) {
        this.logChannelData.set(guildId, channelId);
        await this.saveLogChannelData();
    }

    // Remove log channel for a guild
    async removeLogChannel(guildId) {
        this.logChannelData.delete(guildId);
        await this.saveLogChannelData();
    }

    // Get log channel for a guild
    getLogChannel(guildId) {
        return this.logChannelData.get(guildId);
    }

    // Get all configured log channels
    getAllLogChannels() {
        return Array.from(this.logChannelData.entries()).map(([guildId, channelId]) => ({
            guildId,
            channelId
        }));
    }

    // Check if user has permission to manage message logging
    canManageLogging(member) {
        return member.permissions.has(PermissionFlagsBits.ManageGuild) ||
               member.permissions.has(PermissionFlagsBits.Administrator);
    }

    // Get statistics
    getStatistics() {
        return {
            configuredGuilds: this.logChannelData.size,
            cachedMessages: this.messageCache.size
        };
    }

    // Clear message cache (for memory management)
    clearMessageCache() {
        const cacheSize = this.messageCache.size;
        this.messageCache.clear();
        console.log(`🧹 Cleared ${cacheSize} messages from cache`);
        return cacheSize;
    }
}

module.exports = MessageLogger;