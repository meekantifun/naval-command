// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            MODERATION SYSTEM                                 ║
// ║                     Main moderation management system                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ButtonRoles = require('./buttonRoles');
const DropdownRoles = require('./dropdownRoles');
const EmbedManager = require('./embedManager');
const MessageLogger = require('./messageLogger');
const RoleCommands = require('../commands/roleCommands');
const MessageLogCommands = require('../commands/messageLogCommands');
const fs = require('fs').promises;

class ModerationSystem {
    constructor(bot) {
        this.bot = bot;
        this.buttonRoles = new ButtonRoles(bot);
        this.dropdownRoles = new DropdownRoles(bot);
        this.embedManager = new EmbedManager(bot);
        this.messageLogger = new MessageLogger(bot);
        this.roleCommands = new RoleCommands(bot);
        this.messageLogCommands = new MessageLogCommands(bot);

        // Make message logger available on bot instance for easy access
        this.bot.messageLogger = this.messageLogger;

        this.initializeDataDirectory();
    }

    async initializeDataDirectory() {
        try {
            await fs.mkdir('./data', { recursive: true });
        } catch (error) {
            // Directory already exists, ignore
        }
    }

    getCommands() {
        return [
            ...this.roleCommands.getCommands(),
            ...this.messageLogCommands.getCommands()
        ];
    }

    async handleSlashCommand(interaction) {
        const roleCommandNames = [
            'buttonroles', 'listbuttonroles', 'deletebuttonrole',
            'dropdownroles', 'listdropdownroles', 'deletedropdownrole',
            'roleinfo', 'rolecount', 'embed', 'listembeds'
        ];

        const messageLogCommandNames = [
            'setmsglogchannel', 'removemsglogchannel', 'msglogchannelinfo',
            'msgloggerstats', 'clearmsgcache'
        ];

        if (roleCommandNames.includes(interaction.commandName)) {
            await this.roleCommands.handleRoleCommand(interaction);
        } else if (messageLogCommandNames.includes(interaction.commandName)) {
            await this.messageLogCommands.handleMessageLogCommand(interaction);
        }
    }

    async handleButtonInteraction(interaction) {
        // Handle button role interactions
        if (interaction.customId.startsWith('button_role_')) {
            await this.buttonRoles.handleButtonRoleInteraction(interaction);
            return true;
        }

        // Handle embed button interactions
        if (await this.embedManager.handleButtonInteraction(interaction)) {
            return true;
        }

        return false; // Not handled by moderation system
    }

    async handleSelectMenuInteraction(interaction) {
        // Handle dropdown role interactions
        if (interaction.customId.startsWith('dropdown_role_select_')) {
            await this.dropdownRoles.handleDropdownRoleInteraction(interaction);
            return true;
        }

        return false; // Not handled by moderation system
    }

    async handleModalSubmit(interaction) {
        // Handle button role setup modals
        if (interaction.customId.startsWith('button_role_setup_')) {
            await this.buttonRoles.handleButtonRoleSetup(interaction);
            return true;
        }

        // Handle dropdown role setup modals
        if (interaction.customId.startsWith('dropdown_role_setup_')) {
            await this.dropdownRoles.handleDropdownRoleSetup(interaction);
            return true;
        }

        // Handle embed modals
        if (await this.embedManager.handleModalSubmit(interaction)) {
            return true;
        }

        return false; // Not handled by moderation system
    }

    // Utility method to check if a user can manage roles
    canManageRoles(member) {
        return member.permissions.has('MANAGE_ROLES');
    }

    // Utility method to check if bot can assign a role
    canAssignRole(guild, role) {
        const botMember = guild.members.me;
        return role.position < botMember.roles.highest.position;
    }

    // Get all role configurations for a guild
    async getGuildRoleConfigurations(guildId) {
        const buttonConfigs = Array.from(this.buttonRoles.buttonRoleData.values())
            .filter(config => config.guildId === guildId);

        const dropdownConfigs = Array.from(this.dropdownRoles.dropdownRoleData.values())
            .filter(config => config.guildId === guildId);

        const embedConfigs = Array.from(this.embedManager.embedData.values())
            .filter(config => config.guildId === guildId);

        return {
            buttonRoles: buttonConfigs,
            dropdownRoles: dropdownConfigs,
            customEmbeds: embedConfigs,
            total: buttonConfigs.length + dropdownConfigs.length + embedConfigs.length
        };
    }

    // Clean up configurations for deleted messages
    async cleanupDeletedMessages(guild) {
        let cleaned = 0;

        // Clean up button role configs
        for (const [configId, config] of this.buttonRoles.buttonRoleData.entries()) {
            if (config.guildId !== guild.id) continue;

            try {
                const channel = guild.channels.cache.get(config.channelId);
                if (!channel) {
                    this.buttonRoles.buttonRoleData.delete(configId);
                    cleaned++;
                    continue;
                }

                await channel.messages.fetch(config.messageId);
            } catch (error) {
                // Message doesn't exist, remove config
                this.buttonRoles.buttonRoleData.delete(configId);
                cleaned++;
            }
        }

        // Clean up dropdown role configs
        for (const [configId, config] of this.dropdownRoles.dropdownRoleData.entries()) {
            if (config.guildId !== guild.id) continue;

            try {
                const channel = guild.channels.cache.get(config.channelId);
                if (!channel) {
                    this.dropdownRoles.dropdownRoleData.delete(configId);
                    cleaned++;
                    continue;
                }

                await channel.messages.fetch(config.messageId);
            } catch (error) {
                // Message doesn't exist, remove config
                this.dropdownRoles.dropdownRoleData.delete(configId);
                cleaned++;
            }
        }

        // Clean up embed configs
        cleaned += await this.embedManager.cleanupDeletedEmbeds(guild);

        if (cleaned > 0) {
            await this.buttonRoles.saveButtonRoleData();
            await this.dropdownRoles.saveDropdownRoleData();
            console.log(`🧹 Cleaned up ${cleaned} orphaned configurations in ${guild.name}`);
        }

        return cleaned;
    }

    // Get statistics for the moderation system
    getStatistics() {
        const messageLoggerStats = this.messageLogger.getStatistics();
        return {
            buttonRoleConfigs: this.buttonRoles.buttonRoleData.size,
            dropdownRoleConfigs: this.dropdownRoles.dropdownRoleData.size,
            customEmbeds: this.embedManager.embedData.size,
            messageLoggerGuilds: messageLoggerStats.configuredGuilds,
            cachedMessages: messageLoggerStats.cachedMessages,
            totalConfigurations: this.buttonRoles.buttonRoleData.size + this.dropdownRoles.dropdownRoleData.size + this.embedManager.embedData.size + messageLoggerStats.configuredGuilds
        };
    }

    // Emergency cleanup - remove all role configurations for a guild
    async emergencyCleanup(guildId) {
        let removed = 0;

        // Remove button role configs
        for (const [configId, config] of this.buttonRoles.buttonRoleData.entries()) {
            if (config.guildId === guildId) {
                this.buttonRoles.buttonRoleData.delete(configId);
                removed++;
            }
        }

        // Remove dropdown role configs
        for (const [configId, config] of this.dropdownRoles.dropdownRoleData.entries()) {
            if (config.guildId === guildId) {
                this.dropdownRoles.dropdownRoleData.delete(configId);
                removed++;
            }
        }

        // Remove embed configs
        for (const [messageId, config] of this.embedManager.embedData.entries()) {
            if (config.guildId === guildId) {
                this.embedManager.embedData.delete(messageId);
                removed++;
            }
        }

        // Remove message logger config
        if (this.messageLogger.getLogChannel(guildId)) {
            await this.messageLogger.removeLogChannel(guildId);
            removed++;
        }

        if (removed > 0) {
            await this.buttonRoles.saveButtonRoleData();
            await this.dropdownRoles.saveDropdownRoleData();
            await this.embedManager.saveEmbedData();
            console.log(`🚨 Emergency cleanup removed ${removed} configurations for guild ${guildId}`);
        }

        return removed;
    }
}

module.exports = ModerationSystem;