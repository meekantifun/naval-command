// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              STATUS MANAGER                                   ║
// ║                         Bot Status Update System                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

class StatusManager {
    constructor(bot) {
        this.bot = bot;
        this.client = bot.client;
        this.statusMessageId = null;
        this.statusChannelId = process.env.STATUS_CHANNEL_ID || null;
        this.isOnline = false;
        this.lastUpdateTime = null;

        this.setupErrorHandlers();
    }

    setupErrorHandlers() {
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            this.sendCrashMessage(error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            this.sendCrashMessage(reason);
        });
    }

    async initialize() {
        if (!this.statusChannelId) {
            console.log('⚠️ STATUS_CHANNEL_ID not configured in .env - status updates disabled');
            return;
        }

        try {
            const channel = await this.client.channels.fetch(this.statusChannelId);
            if (!channel) {
                console.error('❌ Status channel not found');
                return;
            }

            await this.cleanupOldStatusMessages(channel);
            this.isOnline = true;
            await this.updateStatus();

            console.log('✅ Status Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Status Manager:', error);
        }
    }

    async cleanupOldStatusMessages(channel) {
        try {
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg =>
                msg.author.id === this.client.user.id &&
                msg.embeds.length > 0 &&
                msg.embeds[0].title?.includes('Naval Command Status')
            );

            for (const message of botMessages.values()) {
                try {
                    await message.delete();
                } catch (error) {
                    console.log('⚠️ Could not delete old status message:', error.message);
                }
            }
        } catch (error) {
            console.log('⚠️ Could not cleanup old messages:', error.message);
        }
    }

    async updateStatus() {
        if (!this.statusChannelId) return;

        try {
            const channel = await this.client.channels.fetch(this.statusChannelId);
            if (!channel) return;

            const embed = this.createStatusEmbed();

            if (this.statusMessageId) {
                try {
                    const existingMessage = await channel.messages.fetch(this.statusMessageId);
                    await existingMessage.edit({ embeds: [embed] });
                } catch (error) {
                    console.log('⚠️ Could not edit existing status message, creating new one');
                    this.statusMessageId = null;
                }
            }

            if (!this.statusMessageId) {
                const message = await channel.send({ embeds: [embed] });
                this.statusMessageId = message.id;
            }

            this.lastUpdateTime = new Date();
        } catch (error) {
            console.error('❌ Failed to update status:', error);
        }
    }

    createStatusEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('⚓ Naval Command Status')
            .setTimestamp()
            .setFooter({ text: 'Last updated' });

        if (this.isOnline) {
            const playerCount = this.getActivePlayerCount();
            const sortieCount = this.getActiveSortieCount();

            embed
                .setColor(0x00FF00)
                .setDescription('🟢 **ONLINE** - Bot is operational and monitoring fleet operations')
                .addFields([
                    {
                        name: '👥 Active Players',
                        value: `${playerCount} player${playerCount !== 1 ? 's' : ''} currently active`,
                        inline: true
                    },
                    {
                        name: '🚢 Active Sorties',
                        value: `${sortieCount} sortie${sortieCount !== 1 ? 's' : ''} in progress`,
                        inline: true
                    },
                    {
                        name: '⏱️ Uptime',
                        value: this.getUptimeString(),
                        inline: true
                    }
                ]);
        } else {
            embed
                .setColor(0xFF0000)
                .setDescription('🔴 **OFFLINE** - Bot is currently offline for maintenance or updates');
        }

        return embed;
    }

    getActivePlayerCount() {
        let totalPlayers = 0;
        for (const game of this.bot.games.values()) {
            totalPlayers += game.players.size;
        }
        return totalPlayers;
    }

    getActiveSortieCount() {
        return this.bot.games.size;
    }

    getUptimeString() {
        if (!this.client.readyAt) return 'Unknown';

        const uptime = Date.now() - this.client.readyAt.getTime();
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async sendCrashMessage(error) {
        if (!this.statusChannelId) return;

        try {
            const channel = await this.client.channels.fetch(this.statusChannelId);
            if (!channel) return;

            const crashEmbed = new EmbedBuilder()
                .setTitle('💥 Naval Command - Critical Error')
                .setColor(0xFF0000)
                .setDescription('🔴 **BOT CRASHED** - A critical error has occurred')
                .addFields([
                    {
                        name: '❌ Error Details',
                        value: `\`\`\`${error.message || error}\`\`\``,
                        inline: false
                    },
                    {
                        name: '🕐 Crash Time',
                        value: new Date().toLocaleString(),
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'System will attempt automatic restart' });

            await channel.send({ embeds: [crashEmbed] });
        } catch (sendError) {
            console.error('❌ Failed to send crash message:', sendError);
        }
    }

    async setOfflineStatus() {
        this.isOnline = false;
        await this.updateStatus();
    }

    async setOnlineStatus() {
        this.isOnline = true;
        await this.updateStatus();
    }

    startPeriodicUpdates() {
        setInterval(async () => {
            if (this.isOnline) {
                await this.updateStatus();
            }
        }, 60000); // Update every minute
    }

    async shutdown() {
        await this.setOfflineStatus();
        console.log('✅ Status Manager shutdown complete');
    }
}

module.exports = StatusManager;