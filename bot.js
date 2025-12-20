// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           NAVAL COMMAND COMBAT BOT                           ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

require('dotenv').config();
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN not found in environment variables!');
    console.error('❌ Make sure you have a .env file with DISCORD_TOKEN=your_token');
    process.exit(1);
}

const {Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits,ModalBuilder,TextInputBuilder,TextInputStyle, MessageFlags, StringSelectMenuBuilder} = require('discord.js');
const sharp = require('sharp');
const fs = require('fs');
const MissionObjectives = require('./missions');
const PlayerCreationModule = require('./handlers/playerCreation');
const AIConfig = require('./systems/aiConfig');
const CarrierSystem = require('./systems/carrierSystem');
const { AIRCRAFT_MOVEMENT_RANGES } = require('./systems/carrierSystem');
const ShopSystem = require('./systems/shopSystem');
const LevelingSystem = require('./systems/levelingSystem');
const { AA_CALIBERS, AA_MOUNT_MULTIPLIERS, AI_CARRIER_AIRCRAFT } = require('./utils/gameConfig');
const GameUtils = require('./utils/gameUtils');
const BattleManager = require('./systems/battleManager');
const CombatSystem = require('./systems/combatSystem');
const MapSystem = require('./systems/mapSystem');
const SpawnManager = require('./systems/spawnManager');
const EventHandler = require('./handlers/eventHandler');
const ModerationSystem = require('./moderation/moderationSystem');
const CharacterManager = require('./systems/characterManager');
const CharacterCommands = require('./commands/characterCommands');
const StatusManager = require('./systems/statusManager');
const CustomMapSystem = require('./systems/customMapSystem');
const CustomMapCommands = require('./commands/customMapCommands');
const GoogleSheetsManager = require('./systems/googleSheetsManager');
const CharacterRegistration = require('./commands/characterRegistration');
const StaffRoleManager = require('./systems/staffRoleManager');
const StaffRoleCommands = require('./commands/staffRoleCommands');
const NameGenerator = require('./utils/nameGenerator');
const express = require('express');
const cors = require('cors');
const axios = require('axios');


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            NAVAL WARFARE CLASS                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class NavalWarfareBot {

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CONSTRUCTOR & CORE INITALIZATION                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    constructor() {
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
        });

        this.games = new Map();
        this.playerData = new Map();
        this.shopSystem = new ShopSystem(this);
        this.levelingSystem = new LevelingSystem(this);
        this.weatherEvents = new Map();
        this.formations = new Map();

        this.imageGenerationEnabled = false;
        this.aiConfig = new AIConfig();
        global.navalBot = this;
        this.missions = new MissionObjectives(this);
        this.objectiveTypes = this.missions.getAllObjectives();
        this.playerCreation = new PlayerCreationModule(this);
        this.carrierSystem = new CarrierSystem(this);

        // Initialize new modular systems
        this.battleManager = new BattleManager(this);
        this.combatSystem = new CombatSystem(this);
        this.mapSystem = new MapSystem(this);
        this.spawnManager = new SpawnManager(this);
        this.eventHandler = new EventHandler(this);
        this.moderationSystem = new ModerationSystem(this);

        // Initialize character management system
        this.characterManager = new CharacterManager(this);

        // Initialize name generator for random cities/towns
        this.nameGenerator = new NameGenerator();

        // Initialize Google Sheets integration
        this.sheetsManager = new GoogleSheetsManager(this);
        this.characterRegistration = new CharacterRegistration(this);

        // Initialize staff role management
        this.staffRoleManager = new StaffRoleManager(this);
        this.staffRoleCommands = new StaffRoleCommands(this);

        // Initialize custom map system
        this.customMapSystem = new CustomMapSystem(this);
        this.customMapCommands = new CustomMapCommands(this);

        // Console logging channel configuration
        this.loggingChannelId = null; // Will be set via command or config
        this.logBuffer = [];
        this.maxLogBufferSize = 15; // Send logs when buffer reaches this size
        this.logFlushInterval = null;

        // Setup console capture
        this.setupConsoleCapture();

        // Setup periodic log flushing (every 30 seconds)
        setInterval(() => {
            if (this.logBuffer.length > 0) {
                this.sendBufferedLogs();
            }
        }, 30000);
        this.characterCommands = new CharacterCommands(this);

        // Initialize status management system
        this.statusManager = new StatusManager(this);

        this.setupCommands();
        this.setupEventHandlers();
        this.eventHandler.setupEventListeners(); // Set up modular event handlers
        this.loadPlayerData();
        this.initializeWeatherEvents();
        this.initializeFormations();

        this.roleplayMode = true;
        this.roleplayTimeout = 300000; // 5 minutes
    }

    /**
     * Parse a time string like "5m", "2h", "30s" into milliseconds
     * @param {string} timeString - Time string (e.g., "5m", "2h", "30s")
     * @returns {number|null} - Milliseconds or null if invalid
     */
    parseTimeString(timeString) {
        if (!timeString) return null;

        const match = timeString.match(/^(\d+(?:\.\d+)?)\s*([hms])$/i);
        if (!match) return null;

        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case 'h':
                return value * 60 * 60 * 1000; // hours to ms
            case 'm':
                return value * 60 * 1000; // minutes to ms
            case 's':
                return value * 1000; // seconds to ms
            default:
                return null;
        }
    }

    /**
     * Format milliseconds into a human-readable string
     * @param {number} ms - Milliseconds
     * @returns {string} - Formatted string (e.g., "5 minutes", "2 hours")
     */
    formatTimeout(ms) {
        const seconds = ms / 1000;
        const minutes = seconds / 60;
        const hours = minutes / 60;

        if (hours >= 1) {
            return hours === 1 ? '1 hour' : `${hours} hours`;
        } else if (minutes >= 1) {
            return minutes === 1 ? '1 minute' : `${minutes} minutes`;
        } else {
            return seconds === 1 ? '1 second' : `${seconds} seconds`;
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CONSOLE LOGGING SYSTEM                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupConsoleCapture() {
        // Store original console methods
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug,
            trace: console.trace
        };

        // Override console methods to capture output
        console.log = (...args) => {
            this.originalConsole.log(...args);
            this.captureLog('LOG', args);
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            this.captureLog('ERROR', args);
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            this.captureLog('WARN', args);
        };

        console.info = (...args) => {
            this.originalConsole.info(...args);
            this.captureLog('INFO', args);
        };

        console.debug = (...args) => {
            this.originalConsole.debug(...args);
            this.captureLog('DEBUG', args);
        };

        console.trace = (...args) => {
            this.originalConsole.trace(...args);
            this.captureLog('TRACE', args);
        };

        // Setup process event logging
        this.setupProcessEventLogging();
    }

    captureLog(level, args) {
        if (!this.loggingChannelId) return;

        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => {
            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}\n${arg.stack}`;
            }
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        }).join(' ');

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };

        this.logBuffer.push(logEntry);

        // If buffer is full, send logs immediately
        if (this.logBuffer.length >= this.maxLogBufferSize) {
            this.sendBufferedLogs();
        }
    }

    async sendBufferedLogs() {
        if (!this.loggingChannelId || this.logBuffer.length === 0) return;

        try {
            const channel = await this.client.channels.fetch(this.loggingChannelId);
            if (!channel) return;

            // Format logs with emojis and better formatting
            const logText = this.logBuffer.map(log => {
                const emoji = this.getLogEmoji(log.level);
                const timestamp = new Date(log.timestamp).toLocaleTimeString();
                return `${emoji} [${timestamp}] ${log.level}: ${log.message}`;
            }).join('\n');

            // Split into chunks if too long (Discord 2000 char limit)
            const chunks = this.splitIntoChunks(logText, 1900); // Leave room for code block formatting

            for (const chunk of chunks) {
                await channel.send(`\`\`\`\n${chunk}\n\`\`\``);
            }

            // Clear buffer after sending
            this.logBuffer = [];
        } catch (error) {
            this.originalConsole.error('Failed to send logs to Discord:', error);
        }
    }

    splitIntoChunks(text, maxLength) {
        const chunks = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
            }
            currentChunk += (currentChunk ? '\n' : '') + line;
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    getLogEmoji(level) {
        const emojiMap = {
            'LOG': '📝',
            'INFO': 'ℹ️',
            'WARN': '⚠️',
            'WARNING': '⚠️',
            'ERROR': '❌',
            'DEBUG': '🐛',
            'TRACE': '🔍',
            'SYSTEM': '🤖',
            'CRITICAL': '🚨'
        };
        return emojiMap[level] || '📋';
    }

    setupProcessEventLogging() {
        // Log bot startup
        this.captureLog('SYSTEM', ['🚀 Naval Command Bot starting up...']);

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.originalConsole.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
            this.captureLog('CRITICAL', ['🚨 Unhandled Promise Rejection:', reason?.toString() || 'Unknown error']);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.originalConsole.error('Uncaught Exception:', error);
            this.captureLog('CRITICAL', ['💥 Uncaught Exception:', error.message, error.stack]);
        });

        // Handle warnings
        process.on('warning', (warning) => {
            this.originalConsole.warn('Process Warning:', warning);
            this.captureLog('WARNING', ['⚠️ Process Warning:', warning.name, warning.message]);
        });

        // Handle graceful shutdown signals
        const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
        shutdownSignals.forEach(signal => {
            process.on(signal, () => {
                this.captureLog('SYSTEM', [`🛑 Received ${signal} signal - Bot shutting down...`]);
                this.sendBufferedLogs().then(() => {
                    process.exit(0);
                });
            });
        });

        // Log when bot is fully ready
        process.nextTick(() => {
            this.captureLog('SYSTEM', ['✅ Console logging system initialized']);
        });
    }

    setLoggingChannel(channelId) {
        this.loggingChannelId = channelId;
        console.log(`✅ Logging channel set to: ${channelId}`);

        // Start periodic log flushing (every 30 seconds)
        if (this.logFlushInterval) {
            clearInterval(this.logFlushInterval);
        }

        this.logFlushInterval = setInterval(() => {
            if (this.logBuffer.length > 0) {
                this.sendBufferedLogs();
            }
        }, 30000); // 30 seconds

        // Send any existing logs immediately
        if (this.logBuffer.length > 0) {
            this.sendBufferedLogs();
        }
    }

    async setLoggingChannelCommand(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to set logging channel.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const channel = interaction.options.getChannel('channel');

            if (!channel.isTextBased()) {
                return await interaction.reply({
                    content: '❌ Please select a text channel for logging.',
                    flags: MessageFlags.Ephemeral
                });
            }

            this.setLoggingChannel(channel.id);

            await interaction.reply({
                content: `✅ Console logs will now be sent to ${channel}`,
                flags: MessageFlags.Ephemeral
            });

            // Send a test log to the channel
            console.log('🔧 Console logging has been enabled for this channel!');

        } catch (error) {
            console.error('Error setting logging channel:', error);
            await interaction.reply({
                content: '❌ Failed to set logging channel.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // Force resync user data to fix inconsistencies
    async forceResyncUser(guildId, userId) {
        if (this.characterManager) {
            return this.characterManager.forceSyncUserData(guildId, userId);
        }
        return false;
    }

    // Check if a member has staff permissions (uses staff role if configured)
    hasStaffPermission(member) {
        if (!this.staffRoleManager) {
            // Fallback if staff role manager not initialized
            return member.permissions.has('ManageMessages') || member.permissions.has('Administrator');
        }
        return this.staffRoleManager.hasStaffPermission(member);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SETUP & CONFIGURATION                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupCommands() {
        this.commands = [
            new SlashCommandBuilder().setName('prepare').setDescription('Initialize a new naval battle')
                .addIntegerOption(option => option.setName('max_players').setDescription('Maximum number of players (default: 5)').setMinValue(2).setMaxValue(10))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('join').setDescription('Join the current battle'),
            new SlashCommandBuilder().setName('start').setDescription('Start the battle').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('move').setDescription('Move your ship to a coordinate')
                .addStringOption(option => option.setName('coordinate').setDescription('Target coordinate (e.g., A1)').setRequired(true)),
            new SlashCommandBuilder().setName('moveair').setDescription('Move selected aircraft squadron')
                .addStringOption(option => option.setName('coordinate').setDescription('Target coordinate (e.g., B50)').setRequired(true)),
            new SlashCommandBuilder().setName('weather').setDescription('Set weather conditions')
                .addStringOption(option => option.setName('condition').setDescription('Weather condition').setRequired(true)
                    .addChoices({name: 'Clear', value: 'clear'}, {name: 'Rainy', value: 'rainy'}, {name: 'Foggy', value: 'foggy'},
                               {name: 'Thunderstorm', value: 'thunderstorm'}, {name: 'Hurricane', value: 'hurricane'}))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('spawn').setDescription('[GM] Spawn AI units during battle')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('end').setDescription('End the current battle').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('shop').setDescription('View the equipment shop'),
            new SlashCommandBuilder().setName('equip').setDescription('Equip purchased items')
                .addStringOption(option => option.setName('item').setDescription('Item to equip').setRequired(true)),
            new SlashCommandBuilder().setName('stats').setDescription('View your current stats'),
            new SlashCommandBuilder().setName('equipment').setDescription('View detailed equipment mastery')
                .addStringOption(option => option.setName('item').setDescription('Specific equipment to view (optional)')),
            new SlashCommandBuilder().setName('clearpins').setDescription('Clear all pinned messages in the channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('kill').setDescription('[DEBUG] Instantly kill any player or AI')
                .addStringOption(option => option.setName('target').setDescription('Target to kill').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('newchar').setDescription('Create new character entries for players').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('fire').setDescription('Set a target on fire')
                .addStringOption(option => option.setName('target').setDescription('Target to set on fire').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('flood').setDescription('Set a target to flood')
                .addStringOption(option => option.setName('target').setDescription('Target to flood').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('roleplay').setDescription('Toggle roleplay mode on/off')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable roleplay waiting')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('timeout')
                        .setDescription('Time to wait for roleplay (e.g., 5m, 2h, 30s). Default: 5m')
                        .setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('setlogchannel').setDescription('Set the channel for console logging')
                .addChannelOption(option => option.setName('channel').setDescription('Channel to send logs to').setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('purge').setDescription('Delete a specified number of messages from the channel')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of messages to delete (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

            // Add moderation commands
            ...this.moderationSystem.getCommands(),

            // Add character management commands
            ...this.characterCommands.getCommands(),

            // Add character registration commands (Google Sheets)
            ...this.characterRegistration.getCommands(),

            // Add staff role commands
            ...this.staffRoleCommands.getCommands(),

            // Add custom map commands
            ...this.customMapCommands.getCommands()
        ];

        // Log staff role commands for debugging
        const staffRoleCommands = this.staffRoleCommands.getCommands();
        console.log(`📋 Staff role commands: ${staffRoleCommands.length} command(s) - ${staffRoleCommands.map(c => c.name).join(', ')}`);

        try {
            require('sharp');
            this.imageGenerationEnabled = true;
        } catch (error) {
            console.log('❌ Sharp library not found. Install with: npm install sharp');
            this.imageGenerationEnabled = false;
        }
    }

    setupEventHandlers() {
        this.client.once('ready', async () => {
            console.log(`🤖 Logged in as ${this.client.user.tag}`);
            console.log(`🌐 Connected to ${this.client.guilds.cache.size} servers`);
            console.log(`👥 Serving ${this.client.users.cache.size} users`);

            await this.registerCommands();

            // Initialize Google Sheets integration
            await this.sheetsManager.initialize();

            // Initialize status manager
            await this.statusManager.initialize();
            this.statusManager.startPeriodicUpdates();

            console.log(`🎯 Naval Command Bot is fully operational!`);
        });

        // Log when bot joins/leaves guilds
        this.client.on('guildCreate', (guild) => {
            console.log(`➕ Joined new server: ${guild.name} (ID: ${guild.id}) - ${guild.memberCount} members`);
        });

        this.client.on('guildDelete', (guild) => {
            console.log(`➖ Left server: ${guild.name} (ID: ${guild.id})`);
        });

        // Log connection issues
        this.client.on('disconnect', () => {
            console.warn(`🔌 Bot disconnected from Discord`);
        });

        this.client.on('reconnecting', () => {
            console.log(`🔄 Bot reconnecting to Discord...`);
        });

        this.client.on('resume', () => {
            console.log(`🔁 Bot resumed connection to Discord`);
        });

        // Log rate limits
        this.client.rest.on('rateLimited', (rateLimitInfo) => {
            console.warn(`⏱️ Rate limited: ${rateLimitInfo.method} ${rateLimitInfo.url} - ${rateLimitInfo.timeout}ms`);
        });

        // Interaction handling is now done by the modular EventHandler system
        // this.client.on('interactionCreate', async (interaction) => {
        //     if (interaction.isChatInputCommand()) {
        //         await this.handleCommand(interaction);
        //     } else if (interaction.isButton()) {
        //         await this.handleButton(interaction);
        //     } else if (interaction.isStringSelectMenu()) {
        //         await this.handleStringSelectMenu(interaction);
        //     } else if (interaction.isModalSubmit()) {
        //         await this.handleModalSubmit(interaction);
        //     }
        // });
    }

    async registerCommands() {
        try {
            console.log(`📝 Registering ${this.commands.length} commands...`);

            // Log command names for debugging
            const commandNames = this.commands.map(cmd => cmd.name).join(', ');
            console.log(`📋 Commands: ${commandNames}`);

            await this.client.application.commands.set(this.commands);
            console.log('✅ Commands registered successfully');
        } catch (error) {
            console.error('❌ Error registering commands:', error);
            console.error('❌ Stack trace:', error.stack);
        }
    }

    loadPlayerData() {
        try {
            const fs = require('fs');
            const path = require('path');
            this.playerData = new Map();

            // Create servers directory if it doesn't exist
            if (!fs.existsSync('./servers')) {
                fs.mkdirSync('./servers', { recursive: true });
                console.log('📁 Created servers directory');
            }

            // Check for old monolithic playerData.json and migrate
            if (fs.existsSync('./playerData.json')) {
                console.log('📦 Found old playerData.json, migrating to per-server structure...');
                const oldData = JSON.parse(fs.readFileSync('./playerData.json', 'utf8'));

                // Check if it's the old single-level format or new guild-based format
                const isOldFormat = Object.keys(oldData).length > 0 &&
                    Object.values(oldData)[0]?.characters !== undefined;

                if (isOldFormat) {
                    // Old format - create a legacy server folder
                    console.log('⚠️ Old format detected. Creating legacy_data server folder...');
                    const legacyDir = path.join('./servers', 'legacy_data');
                    if (!fs.existsSync(legacyDir)) {
                        fs.mkdirSync(legacyDir, { recursive: true });
                    }
                    fs.writeFileSync(path.join(legacyDir, 'playerData.json'), JSON.stringify(oldData, null, 2));
                    console.log('✅ Migrated to servers/legacy_data/playerData.json');
                } else {
                    // New guild-based format - split into separate files
                    for (const [guildId, guildData] of Object.entries(oldData)) {
                        // Try to get guild name, fallback to ID
                        const guild = this.client.guilds.cache.get(guildId);
                        const guildFolderName = guild && guild.name
                            ? guild.name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
                            : guildId;

                        const guildDir = path.join('./servers', guildFolderName);
                        if (!fs.existsSync(guildDir)) {
                            fs.mkdirSync(guildDir, { recursive: true });
                        }

                        // Save guild ID reference
                        fs.writeFileSync(path.join(guildDir, 'guild_id.txt'), guildId);
                        fs.writeFileSync(path.join(guildDir, 'playerData.json'), JSON.stringify(guildData, null, 2));
                        console.log(`✅ Migrated guild ${guildId} to servers/${guildFolderName}/playerData.json`);
                    }
                }

                // Rename old file to backup
                fs.renameSync('./playerData.json', './playerData.json.backup');
                console.log('📦 Backed up old playerData.json');
            }

            // Load all guild data from servers directory
            if (fs.existsSync('./servers')) {
                const serverDirs = fs.readdirSync('./servers', { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                for (const folderName of serverDirs) {
                    const guildDir = path.join('./servers', folderName);
                    const dataFile = path.join(guildDir, 'playerData.json');
                    const guildIdFile = path.join(guildDir, 'guild_id.txt');

                    if (fs.existsSync(dataFile)) {
                        // Get the actual guild ID from guild_id.txt or use folder name as fallback
                        let guildId = folderName;
                        if (fs.existsSync(guildIdFile)) {
                            guildId = fs.readFileSync(guildIdFile, 'utf8').trim();
                        }

                        const guildData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                        const guildMap = new Map();

                        for (const [playerId, playerEntry] of Object.entries(guildData)) {
                            if (playerEntry.characters && typeof playerEntry.characters === 'object') {
                                const charactersMap = new Map();
                                for (const [charName, charData] of Object.entries(playerEntry.characters)) {
                                    if (charData.aircraft && typeof charData.aircraft === 'object') {
                                        const aircraftMap = new Map(Object.entries(charData.aircraft));
                                        charData.aircraft = aircraftMap;
                                    }
                                    charactersMap.set(charName, charData);
                                }

                                guildMap.set(playerId, {
                                    ...playerEntry,
                                    characters: charactersMap
                                });
                            } else {
                                guildMap.set(playerId, playerEntry);
                            }
                        }

                        this.playerData.set(guildId, guildMap);
                        console.log(`📂 Loaded data for guild ${guildId} from folder: ${folderName}`);
                    }
                }
            }

            console.log(`✅ Loaded player data for ${this.playerData.size} guild(s)`);
        } catch (error) {
            console.error('❌ Error loading player data:', error);
            this.playerData = new Map();
        }
    }

    savePlayerData() {
        try {
            const fs = require('fs');
            const path = require('path');

            // Ensure servers directory exists
            if (!fs.existsSync('./servers')) {
                fs.mkdirSync('./servers', { recursive: true });
            }

            // Save each guild to its own file
            for (const [guildId, guildMap] of this.playerData.entries()) {
                // Ensure guildMap is a Map
                if (!(guildMap instanceof Map)) {
                    console.warn(`⚠️ Guild ${guildId} data is not a Map, skipping save`);
                    continue;
                }

                const guildData = {};

                for (const [playerId, playerEntry] of guildMap.entries()) {
                    if (playerEntry.characters && playerEntry.characters instanceof Map) {
                        // Convert characters Map to object
                        const charactersObj = {};
                        for (const [charName, charData] of playerEntry.characters.entries()) {
                            // Deep copy character data and convert aircraft Map
                            const processedCharData = JSON.parse(JSON.stringify(charData, (key, value) => {
                                if (value instanceof Map) {
                                    return Object.fromEntries(value);
                                }
                                return value;
                            }));

                            charactersObj[charName] = processedCharData;
                        }

                        guildData[playerId] = {
                            characters: charactersObj,
                            activeCharacter: playerEntry.activeCharacter,
                            maxCharacters: playerEntry.maxCharacters
                        };

                    } else {
                        guildData[playerId] = playerEntry;
                    }
                }

                // Create guild directory using guild name
                const guildFolderName = this.getGuildFolderName(guildId);
                const guildDir = path.join('./servers', guildFolderName);
                if (!fs.existsSync(guildDir)) {
                    fs.mkdirSync(guildDir, { recursive: true });
                }

                // Save guild ID reference file
                const guildIdFile = path.join(guildDir, 'guild_id.txt');
                if (!fs.existsSync(guildIdFile)) {
                    fs.writeFileSync(guildIdFile, guildId);
                }

                // Write guild data to its own file
                const guildFile = path.join(guildDir, 'playerData.json');
                fs.writeFileSync(guildFile, JSON.stringify(guildData, null, 2));
            }

        } catch (error) {
            console.error('❌ Error saving player data:', error);
            console.error('❌ Error details:', error.stack);
        }
    }

    // Get sanitized guild name for folder
    getGuildFolderName(guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (guild && guild.name) {
            // Sanitize guild name for filesystem
            return guild.name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
        }
        return guildId; // Fallback to guild ID if name not available
    }

    // Helper methods for guild-scoped player data
    getGuildPlayerData(guildId, userId) {
        if (!this.playerData.has(guildId)) {
            this.playerData.set(guildId, new Map());
        }
        const guildMap = this.playerData.get(guildId);
        // Ensure it's a Map
        if (!(guildMap instanceof Map)) {
            console.warn(`⚠️ Guild ${guildId} data was not a Map, reinitializing`);
            this.playerData.set(guildId, new Map());
            return undefined;
        }
        return guildMap.get(userId);
    }

    setGuildPlayerData(guildId, userId, data) {
        if (!this.playerData.has(guildId)) {
            this.playerData.set(guildId, new Map());
        }
        let guildMap = this.playerData.get(guildId);
        // Ensure it's a Map
        if (!(guildMap instanceof Map)) {
            console.warn(`⚠️ Guild ${guildId} data was not a Map, reinitializing`);
            guildMap = new Map();
            this.playerData.set(guildId, guildMap);
        }
        guildMap.set(userId, data);
    }

    hasGuildPlayerData(guildId, userId) {
        if (!this.playerData.has(guildId)) {
            return false;
        }
        const guildMap = this.playerData.get(guildId);
        // Ensure it's a Map
        if (!(guildMap instanceof Map)) {
            console.warn(`⚠️ Guild ${guildId} data was not a Map, reinitializing`);
            this.playerData.set(guildId, new Map());
            return false;
        }
        return guildMap.has(userId);
    }

    deleteGuildPlayerData(guildId, userId) {
        if (!this.playerData.has(guildId)) {
            return false;
        }
        const guildMap = this.playerData.get(guildId);
        // Ensure it's a Map
        if (!(guildMap instanceof Map)) {
            console.warn(`⚠️ Guild ${guildId} data was not a Map, reinitializing`);
            this.playerData.set(guildId, new Map());
            return false;
        }
        return guildMap.delete(userId);
    }

    initializeWeatherEvents() {
        this.weatherEvents.set('sudden_storm', {
            name: 'Sudden Storm',
            description: 'Reduces visibility and accuracy',
            duration: 3,
            effects: { accuracy: -20, evasion: +10 },
            chance: 0.05,
            weatherChange: 'thunderstorm'
        });

        this.weatherEvents.set('fog_bank', {
            name: 'Dense Fog Bank',
            description: 'Severely reduces visibility and range',
            duration: 4,
            effects: { accuracy: -30, range: -2 },
            chance: 0.03,
            weatherChange: 'foggy'
        });

        this.weatherEvents.set('tropical_storm', {
            name: 'Tropical Storm',
            description: 'Heavy rains and high winds affect all operations',
            duration: 5,
            effects: { accuracy: -15, aircraft: -50 },
            chance: 0.01,
            weatherChange: 'hurricane'
        });

        this.weatherEvents.set('weather_clearing', {
            name: 'Weather Clearing',
            description: 'Skies clear and visibility improves',
            duration: 2,
            effects: { accuracy: +10, range: +1 },
            chance: 0.04,
            weatherChange: 'clear'
        });
    }

    initializeFormations() {
       this.formations.set('line_ahead', {
           name: 'Line Ahead', description: 'Ships form a line for maximum firepower',
           bonuses: { accuracy: +10, range: +5 }, penalties: { evasion: -15 }, maxShips: 6, spacing: 2
       });
    }

    initializeObjectives() {
       this.objectiveTypes.set('destroy_all', {
           name: 'Destroy All Enemies', description: 'Eliminate all hostile forces',
           setup: (game) => {}, check: (game) => Array.from(game.enemies.values()).filter(e => e.alive).length === 0,
           reward: { xp: 200, currency: 500 }
       });
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     EVENT HANDLERS & INTERACTION MANAGEMENT                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async handleCommand(interaction) {
        const { commandName } = interaction;
        
        switch (commandName) {
            case 'prepare': await this.prepareGame(interaction); break;
            case 'join': await this.joinGame(interaction); break;
            case 'start': await this.startBattle(interaction); break;
            case 'move': 
                const coordinate = interaction.options.getString('coordinate');
                await this.executeSlashMove(interaction, coordinate);
                break;
            case 'moveair': await this.moveAircraft(interaction); break;
            case 'weather': await this.setWeather(interaction); break;
            case 'spawn': await this.spawnAI(interaction); break;
            case 'end': await this.endGame(interaction); break;
            case 'shop': await this.showShop(interaction); break;
            case 'equip': await this.equipItem(interaction); break;
            case 'stats': await this.showPlayerStats(interaction); break;
            case 'clearpins': await this.clearPins(interaction); break;
            case 'kill': await this.killTarget(interaction); break;
            case 'newchar': await this.createPlayers(interaction); break;
            case 'fire': await this.setFire(interaction); break;
            case 'flood': await this.setFlood(interaction); break;
            case 'equipment': await this.showEquipmentStats(interaction); break;
            case 'roleplay':
                await this.setRoleplayMode(interaction);
                break;
        }
    }

    async handleButton(interaction) {
        try {

            // Check if interaction is still valid early
            if (!interaction.isRepliable()) {
                return;
            }

            if (!interaction.isButton()) {
                return;
            }

            if (interaction.customId.includes('_disabled')) {
                try {
                    return interaction.reply({
                        content: '❌ This button has been disabled because the turn has ended.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    return;
                }
            }

            if (interaction.customId.includes('continue_stats_')) {
                return await this.playerCreation.handleContinueStats(interaction);
            }

            if (interaction.customId.includes('edit_stats_')) {
                return await this.playerCreation.handleEditStats(interaction);
            }

            if (interaction.customId.includes('edit_player_info_')) {
                return await this.playerCreation.handleEditBasicInfo(interaction);
            }

            if (interaction.customId.includes('continue_weapons_')) {
                return await this.playerCreation.handleContinueWeapons(interaction);
            }

            if (interaction.customId.startsWith('continue_weapons_')) {
                return await this.playerCreation.handleContinueWeaponsButton(interaction);
            }

            if (interaction.customId.startsWith('finish_weapons_')) {
                return await this.playerCreation.handleFinishWeaponsButton(interaction);
            }

            if (interaction.customId.startsWith('gm_spawn_')) {
                return await this.handleGMSpawn(interaction);
            }

            // Handle get map button with improved error handling
            if (interaction.customId.startsWith('get_map_')) {
                const game = this.games.get(interaction.channelId);
                if (!game) {
                    try {
                        return interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                return await this.handleGetMapButton(interaction, game);
            }

            if (interaction.customId.includes('batch_spawn_loc_')) {
                const game = this.games.get(interaction.channelId);
                if (!game) {
                    try {
                        return interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                const parts = interaction.customId.split('_');
                const location = parts[3]; // batch_spawn_loc_random_userId -> parts[3] = 'random'
                const userId = parts[parts.length - 1];
                
                if (userId !== interaction.user.id) {
                    try {
                        return interaction.reply({ content: '❌ This is not your spawn selection!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                if (game.gmId !== interaction.user.id) {
                    try {
                        return interaction.reply({ content: '❌ Only the GM can spawn AI!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                return await this.executeBatchSpawn(interaction, game, location);
            }

            if (interaction.customId.includes('batch_spawn_back_')) {
                const userId = interaction.customId.split('_')[3];
                if (userId !== interaction.user.id) {
                    try {
                        return interaction.reply({ content: '❌ This is not your spawn menu!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                return await this.showBatchSpawnModal(interaction);
            }
            
            if (interaction.customId.includes('continue_aircraft_')) {
                return await this.playerCreation.handleContinueAircraft(interaction);
            }
            
            if (interaction.customId.includes('skip_aircraft_')) {
                return await this.playerCreation.handleSkipAircraft(interaction);
            }
            
            if (interaction.customId.includes('overwrite_confirm_') || interaction.customId.includes('overwrite_abort_')) {
                return await this.playerCreation.handleOverwriteConfirmation(interaction);
            }

            if (interaction.customId.startsWith('configure_short_aa_') || 
                interaction.customId.startsWith('configure_medium_aa_') || 
                interaction.customId.startsWith('configure_long_aa_') ||
                interaction.customId.startsWith('skip_all_aa_') ||
                interaction.customId.startsWith('finish_aa_config_')) {
                return await this.playerCreation.handleAAConfigButtons(interaction);
            }

            if (interaction.customId.includes('confirm_aa_') || interaction.customId.includes('back_aa_')) {
                return await this.playerCreation.handleAAConfirmation(interaction);
            }

            if (interaction.customId.startsWith('continue_aa_setup_')) {
                return await this.playerCreation.handleContinueAASetup(interaction);
            }

            if (interaction.customId.startsWith('skip_aa_setup_')) {
                return await this.playerCreation.handleSkipAASetup(interaction);
            }

            // AA Range Configuration - New range-specific buttons
            if (interaction.customId.startsWith('configure_short_aa_')) {
                return await this.playerCreation.handleAAConfigButtons(interaction);
            }

            if (interaction.customId.startsWith('configure_medium_aa_')) {
                return await this.playerCreation.handleAAConfigButtons(interaction);
            }

            if (interaction.customId.startsWith('configure_long_aa_')) {
                return await this.playerCreation.handleAAConfigButtons(interaction);
            }

            if (interaction.customId.startsWith('skip_all_aa_')) {
                return await this.playerCreation.handleAAConfigButtons(interaction);
            }

            if (interaction.customId.startsWith('finish_aa_config_')) {
                return await this.playerCreation.handleAAConfigButtons(interaction);
            }

            // AA Navigation
            if (interaction.customId.startsWith('back_to_aa_menu_')) {
                return await this.playerCreation.handleBackToAAMenu(interaction);
            }

            // Keep your existing AA confirmation handlers
            if (interaction.customId.includes('confirm_aa_') || interaction.customId.includes('back_aa_')) {
                return await this.playerCreation.handleAAConfirmation(interaction);
            }

            // Update your finish_aa_ handler to work with both old and new systems
            if (interaction.customId.includes('finish_aa_') || interaction.customId.includes('confirm_all_aa_')) {
                let userId;
                
                if (interaction.customId.includes('confirm_all_aa_')) {
                    userId = interaction.customId.split('_')[3];
                } else if (interaction.customId.includes('finish_aa_config_')) {
                    userId = interaction.customId.split('_')[3];
                } else if (interaction.customId.includes('finish_aa_')) {
                    userId = interaction.customId.split('_')[2];
                }
                
                if (userId !== interaction.user.id) {
                    try {
                        return interaction.reply({ content: '❌ This is not your AA setup!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                return await this.playerCreation.finalizeCharacterWithAA(interaction);
            } 

            if (interaction.customId.includes('reset_aa_')) {
                const userId = interaction.customId.split('_')[2];
                if (userId !== interaction.user.id) {
                    try {
                        return interaction.reply({ content: '❌ This is not your AA setup!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                // Reset AA systems and start over
                const tempData = this.playerCreation.bot.tempPlayerData.get(userId);
                if (tempData) {
                    tempData.aaSystems = [];
                }
                
                await interaction.update({
                    content: '🔄 **AA Setup Reset** - Starting over with Short Range AA...',
                    components: [],
                    embeds: []
                });
                
                // Show first AA creation modal again
                await this.playerCreation.showAACreationModal(interaction);
                return;
            }

            if (interaction.customId.startsWith('shop_')) {
                return await this.shopSystem.handleShopInteraction(interaction);
            }

            // MOVE CHARACTER SELECTION BEFORE GAME CHECK
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_character_')) {
                await this.handleCharacterSelection(interaction);
                return;
            }

            // HANDLE GAME SETUP BUTTONS FIRST (both old and new patterns)
            if (interaction.customId.includes('enemy_config_') ||
                interaction.customId.includes('map_config_') ||
                interaction.customId.includes('objective_config_') ||
                interaction.customId.includes('custom_enemy_') ||
                interaction.customId.includes('select_boss_') ||
                interaction.customId.includes('setup_')) {

                const setupGame = this.games.get(interaction.channelId);
                if (!setupGame) {
                    try {
                        return interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }

                // Route to appropriate handler based on button pattern
                if (interaction.customId.includes('setup_')) {
                    return await this.handleNewSetupFlow(interaction, setupGame);
                } else {
                    return await this.handleGameSetup(interaction, setupGame);
                }
            }

            // NOW get the game for all other buttons
            const game = this.games.get(interaction.channelId);
            if (!game) {
                // Only return error for non-spawn buttons
                if (!interaction.customId.includes('spawn_select_') && 
                    !interaction.customId.includes('opfor_spawn_select_')) {
                    try {
                        return interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
            }
            
            // Get player for buttons that need it
            const player = game?.players.get(interaction.user.id);
            
            // **NEW: Enhanced turn validation for player action buttons**
            // Skip validation for spawn, movement, and shooting sequence buttons
            const skipValidation = !player ||
                interaction.customId.includes('spawn_select_') ||
                interaction.customId.includes('opfor_spawn_select_') ||
                interaction.customId.startsWith('moveto:') ||
                interaction.customId.startsWith('movestay:') ||
                interaction.customId.includes('weapon_') ||
                interaction.customId.includes('shell_') ||
                interaction.customId.includes('target_') ||
                interaction.customId.includes('equip_') ||
                interaction.customId.includes('cap_assign_');

            if (!skipValidation) {

                // Check if it's actually their turn and the message ID matches
                if (player.activeTurnMessageId &&
                    interaction.message.id !== player.activeTurnMessageId) {
                    try {
                        return interaction.reply({
                            content: '❌ These buttons are from a previous turn! Only use buttons from your current active turn.',
                            flags: MessageFlags.Ephemeral
                        });
                    } catch (error) {
                        return;
                    }
                }
            }

            // Handle spawn selections (now that game is declared)
            if (interaction.customId.includes('opfor_spawn_select_')) {
                return await this.handleOPFORSpawnSelection(interaction, game);
            }

            if (interaction.customId.includes('spawn_select_')) {
                return await this.handleSpawnSelection(interaction, game);
            }

            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_squadron_type_')) {
                await this.playerCreation.handleSquadronTypeSelection(interaction);
                return;
            }

            if (interaction.customId.includes('confirm_squadrons_') || interaction.customId.includes('reset_squadrons_')) {
                await this.playerCreation.handleSquadronConfirmation(interaction);
                return;
            }

            if (interaction.customId.includes('spawn_next_') || interaction.customId.includes('spawn_prev_')) {
                return await this.handleSpawnNavigation(interaction, game);
            }

            // Handle weapon selection buttons (for shooting)
            if (interaction.customId.includes('weapon_')) {
                return await this.handleWeaponSelection(interaction, game);
            }

            // Handle shell selection buttons (for shooting)
            if (interaction.customId.includes('shell_')) {
                return await this.handleShellSelection(interaction, game);
            }

            // Handle target selection buttons (for shooting)
            if (interaction.customId.includes('target_')) {
                return await this.handleTargetSelection(interaction, game);
            }

            if (interaction.customId.includes('equip_')) {
                return await this.handleEquipmentSelection(interaction, game);
            }

            if (interaction.customId.includes('cap_assign_')) {
                return await this.handleCAPAssignment(interaction, game);
            }

            // Handle movement selection buttons
            if (interaction.customId.includes(':') && 
                (interaction.customId.startsWith('moveto:') || interaction.customId.startsWith('movestay:'))) {
                
                const parts = interaction.customId.split(':');
                const playerId = parts[parts.length - 1];
                
                if (playerId !== interaction.user.id) {
                    try {
                        return interaction.reply({ content: '❌ This is not your movement selection!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                const player = game.players.get(interaction.user.id);
                if (!player) {
                    try {
                        return interaction.reply({ content: '❌ You are not in this game!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                if (!player.alive) {
                    try {
                        return interaction.reply({ content: '❌ Your ship has been destroyed!', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        return;
                    }
                }
                
                await this.handleMovementSelection(interaction, player, game);
                return;
            }
            
            // Handle regular action buttons
            if (!player) {
                try {
                    return interaction.reply({ content: '❌ You are not in this game!', flags: MessageFlags.Ephemeral });
                } catch (error) {
                    return;
                }
            }
            
            if (!player.alive) {
                try {
                    return interaction.reply({ content: '❌ Your ship has been destroyed!', flags: MessageFlags.Ephemeral });
                } catch (error) {
                    return;
                }
            }

            if (interaction.customId.startsWith('launch_aircraft_')) {
                return await this.handleLaunchAircraft(interaction, player, game);
            }

            if (interaction.customId.match(/^launch_(fighters|dive_bombers|torpedo_bombers|cancel)_/)) {
                return await this.handleAircraftLaunchSelection(interaction, game);
            }

            if (interaction.customId.includes('select_squadron_move_')) {
                return await this.handleSquadronMoveSelection(interaction, game);
            }

            if (interaction.customId.includes('land_aircraft_')) {
                return await this.handleAircraftLanding(interaction, game);
            }

            if (interaction.customId.includes('cancel_aircraft_move_')) {
                return interaction.update({
                    content: '❌ Aircraft movement cancelled.',
                    components: [],
                    embeds: []
                });
            }
            
            if (!player.activeTurnMessageId) {
                try {
                    return interaction.reply({ content: '❌ It\'s not your turn!', flags: MessageFlags.Ephemeral });
                } catch (error) {
                    return;
                }
            }

            if (interaction.customId.startsWith('aircraft_bomb_')) {
                // Extract aircraft ID and user ID more carefully
                const prefix = 'aircraft_bomb_';
                const remaining = interaction.customId.substring(prefix.length);
                
                // Find the last underscore (before the user ID)
                const lastUnderscore = remaining.lastIndexOf('_');
                const aircraftId = remaining.substring(0, lastUnderscore);
                const userId = remaining.substring(lastUnderscore + 1);
                
                
                return await this.carrierSystem.handleAircraftBomb(interaction, game, aircraftId);
            }

            if (interaction.customId.startsWith('aircraft_torpedo_')) {
                const prefix = 'aircraft_torpedo_';
                const remaining = interaction.customId.substring(prefix.length);
                const lastUnderscore = remaining.lastIndexOf('_');
                const aircraftId = remaining.substring(0, lastUnderscore);
                const userId = remaining.substring(lastUnderscore + 1);
                
                
                return await this.carrierSystem.handleAircraftTorpedo(interaction, game, aircraftId);
            }

            if (interaction.customId.startsWith('aircraft_dogfight_')) {
                const prefix = 'aircraft_dogfight_';
                const remaining = interaction.customId.substring(prefix.length);
                const lastUnderscore = remaining.lastIndexOf('_');
                const aircraftId = remaining.substring(0, lastUnderscore);
                const userId = remaining.substring(lastUnderscore + 1);
                
                
                return await this.carrierSystem.handleAircraftDogfight(interaction, game, aircraftId);
            }

            if (interaction.customId.startsWith('bomb_target_') || 
                interaction.customId.startsWith('torpedo_target_') || 
                interaction.customId.startsWith('dogfight_target_')) {
                return await this.handleAircraftAttack(interaction, game);
            }
            
            await this.handlePlayerAction(interaction, player, game);
            
            if (player.actionPoints <= 0) {
                this.endPlayerTurn(player);
            }
            
        } catch (error) {
            console.error('Error in handleButton:', error);
            
            // Improved error handling - only respond if we can
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                try {
                    await interaction.reply({ content: '❌ An error occurred!', flags: MessageFlags.Ephemeral });
                } catch (replyError) {
                }
            }
        }
    }

    async handleStringSelectMenu(interaction) {
        try {
            
            // Handle squadron selection for aircraft carriers
            if (interaction.customId.startsWith('select_battle_squadron_')) {
                await this.handleSquadronSelection(interaction);
                return;
            }
            
            // Handle character selection (if you have this)
            if (interaction.customId.startsWith('select_character_')) {
                await this.handleCharacterSelection(interaction);
                return;
            }
            
            // Add other string select menu handlers here as needed
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Unknown selection type. This might be from an outdated session.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
        } catch (error) {
            console.error('❌ Error in handleStringSelectMenu:', error);
            console.error('❌ Error stack:', error.stack);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred processing your selection! Please try again.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (replyError) {
                    console.error('❌ Could not send error reply:', replyError);
                }
            }
        }
    }

    async handleModalSubmit(interaction) {
        try {
            
            // Handle batch spawn modal
            if (interaction.customId.startsWith('batch_spawn_')) {
                await this.handleBatchSpawnSubmit(interaction);
            }
            // Handle player creation modals (delegated to module)
            else if (interaction.customId.startsWith('create_player_')) {
                await this.playerCreation.handlePlayerCreationSubmit(interaction);
            } else if (interaction.customId.startsWith('create_stats_')) {
                await this.playerCreation.handleStatsCreationSubmit(interaction);
            } else if (interaction.customId.startsWith('edit_stats_')) {
                await this.playerCreation.handleEditStatsSubmit(interaction);
            } else if (interaction.customId.startsWith('edit_player_info_')) {
                await this.playerCreation.handleEditBasicInfoSubmit(interaction);
            } else if (interaction.customId.startsWith('create_weapons_')) {
                await this.playerCreation.handleWeaponsCreationSubmit(interaction);
            } else if (interaction.customId.startsWith('create_aircraft_')) {
                await this.playerCreation.handleAircraftCreationSubmit(interaction);
            } else if (interaction.customId.startsWith('assign_aircraft_')) {
                await this.playerCreation.handleAircraftAssignmentSubmit(interaction);
            } else if (interaction.customId.startsWith('assign_simple_aircraft_')) {
                await this.playerCreation.handleAircraftAssignmentSubmit(interaction);
            } else if (interaction.customId.startsWith('create_aa_')) {
                await this.playerCreation.handleAACreationSubmit(interaction);
            } else {
                // Handle any other modals you might have in the future
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Unknown modal type. This might be from an outdated session.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error in handleModalSubmit:', error);
            console.error('❌ Error stack:', error.stack);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred processing the form! Please try again.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (replyError) {
                    console.error('❌ Could not send error reply:', replyError);
                }
            }
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             GAME SETUP & MANAGEMENT                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async prepareGame(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to prepare games.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const channelId = interaction.channelId;
        const maxPlayers = interaction.options.getInteger('max_players') || 8;

        if (this.games.has(channelId)) {
            return interaction.reply({ content: 'A game is already active in this channel!', flags: MessageFlags.Ephemeral });
        }

        const game = new NavalBattle(channelId, maxPlayers, interaction.user.id, this);
        this.games.set(channelId, game);

        // Update status when new sortie starts
        await this.statusManager.updateStatus();

        // Initialize setup state with current step tracking
        game.setupState = {
            currentStep: 'enemies',
            enemyConfig: null,
            mapConfig: null,
            objectiveConfig: null,
            setupComplete: false,
            maxPlayers: maxPlayers
        };

        // Start with enemy configuration step
        await this.showEnemyConfigurationStep(interaction, game);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           STEP-BY-STEP SETUP METHODS                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async showEnemyConfigurationStep(interaction, game) {
        const enemyConfigButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_enemy_0_${interaction.user.id}`)
                .setLabel('No AI Enemies')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`setup_enemy_3_${interaction.user.id}`)
                .setLabel('3 Random Enemies')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`setup_enemy_5_${interaction.user.id}`)
                .setLabel('5 Random Enemies')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`setup_enemy_custom_${interaction.user.id}`)
                .setLabel('Custom Setup')
                .setStyle(ButtonStyle.Success)
        ];

        const enemyRow = new ActionRowBuilder().addComponents(enemyConfigButtons);

        const setupEmbed = new EmbedBuilder()
            .setTitle('⚓ Naval Battle Setup - Step 1 of 3')
            .setDescription(`**Game Master:** <@${interaction.user.id}>\n**Max Players:** ${game.setupState.maxPlayers}\n\n` +
                           `🤖 **Choose Enemy Configuration**\n\n` +
                           `Select how many AI enemies you want in this battle:`)
            .addFields([
                {
                    name: '🤖 Enemy Options',
                    value: '• **No AI Enemies** - Player vs Player only\n' +
                           '• **3 Random Enemies** - Mixed enemy types (Balanced)\n' +
                           '• **5 Random Enemies** - More challenging battle\n' +
                           '• **Custom Setup** - Choose specific enemy types and counts',
                    inline: false
                }
            ])
            .setColor(0xFF6B35)
            .setFooter({ text: 'Step 1/3: Enemy Configuration' });

        await interaction.reply({
            embeds: [setupEmbed],
            components: [enemyRow],
            flags: MessageFlags.Ephemeral
        });
    }

    async showMapConfigurationStep(interaction, game) {
        const mapConfigButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_map_random_${interaction.user.id}`)
                .setLabel('Random Generated Map')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`setup_map_custom_${interaction.user.id}`)
                .setLabel('Select Custom Map')
                .setStyle(ButtonStyle.Success)
        ];

        // Add navigation buttons
        const navButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_back_enemies_${interaction.user.id}`)
                .setLabel('← Back to Enemies')
                .setStyle(ButtonStyle.Secondary)
        ];

        const mapRow = new ActionRowBuilder().addComponents(mapConfigButtons);
        const navRow = new ActionRowBuilder().addComponents(navButtons);

        const setupEmbed = new EmbedBuilder()
            .setTitle('⚓ Naval Battle Setup - Step 2 of 3')
            .setDescription(`**Game Master:** <@${interaction.user.id}>\n**Max Players:** ${game.setupState.maxPlayers}\n\n` +
                           `✅ **Enemies:** ${this.getEnemyConfigSummary(game.setupState.enemyConfig)}\n\n` +
                           `🗺️ **Choose Map Configuration**\n\n` +
                           `Select the type of battlefield for this naval engagement:`)
            .addFields([
                {
                    name: '🗺️ Map Options',
                    value: '• **Random Generated** - Procedural islands, reefs, and strategic terrain\n' +
                           '• **Custom Map** - Design your own battlefield (Coming Soon!)',
                    inline: false
                }
            ])
            .setColor(0x4ECDC4)
            .setFooter({ text: 'Step 2/3: Map Configuration' });

        await interaction.update({
            embeds: [setupEmbed],
            components: [mapRow, navRow]
        });
    }

    async showMissionObjectivesStep(interaction, game) {
        // DYNAMIC OBJECTIVE CONFIGURATION BUTTONS - Reading from missions.js
        const objectiveConfigButtons = [];
        const objectiveConfigButtons2 = [];
        const allObjectives = this.missions.getAllObjectives();

        let buttonCount = 0;
        let objectiveDescriptions = [];

        for (const [objectiveId, objective] of allObjectives) {
            const buttonStyle = objectiveId === 'destroy_all' ? ButtonStyle.Secondary :
                               objectiveId === 'defeat_boss' ? ButtonStyle.Danger : ButtonStyle.Primary;

            const buttonId = `setup_objective_${objectiveId}_${interaction.user.id}`;

            const button = new ButtonBuilder()
                .setCustomId(buttonId)
                .setLabel(objective.name)
                .setStyle(buttonStyle);

            // Distribute buttons across two rows (max 5 per row)
            if (buttonCount < 5) {
                objectiveConfigButtons.push(button);
            } else {
                objectiveConfigButtons2.push(button);
            }

            buttonCount++;

            // Collect descriptions for the embed
            const reward = objective.reward ? `(${objective.reward.xp} XP, ${objective.reward.currency} credits)` : '';
            objectiveDescriptions.push(`• **${objective.name}** - ${objective.description} ${reward}`);
        }

        // Add navigation buttons
        const navButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_back_map_${interaction.user.id}`)
                .setLabel('← Back to Map')
                .setStyle(ButtonStyle.Secondary)
        ];

        const objectiveRow1 = new ActionRowBuilder().addComponents(objectiveConfigButtons);
        const navRow = new ActionRowBuilder().addComponents(navButtons);

        const componentRows = [objectiveRow1, navRow];
        if (objectiveConfigButtons2.length > 0) {
            const objectiveRow2 = new ActionRowBuilder().addComponents(objectiveConfigButtons2);
            componentRows.splice(-1, 0, objectiveRow2); // Insert before nav row
        }

        const setupEmbed = new EmbedBuilder()
            .setTitle('⚓ Naval Battle Setup - Step 3 of 3')
            .setDescription(`**Game Master:** <@${interaction.user.id}>\n**Max Players:** ${game.setupState.maxPlayers}\n\n` +
                           `✅ **Enemies:** ${this.getEnemyConfigSummary(game.setupState.enemyConfig)}\n` +
                           `✅ **Map:** ${this.getMapConfigSummary(game.setupState.mapConfig)}\n\n` +
                           `🎯 **Choose Mission Objective**\n\n` +
                           `Select the primary goal for this naval engagement:`)
            .addFields([
                {
                    name: '🎯 Available Mission Objectives',
                    value: objectiveDescriptions.join('\n'),
                    inline: false
                }
            ])
            .setColor(0x9B59B6)
            .setFooter({ text: 'Step 3/3: Mission Objective' });

        await interaction.update({
            embeds: [setupEmbed],
            components: componentRows
        });
    }

    async showMissionObjectivesStepEditReply(interaction, game) {
        // Same logic as showMissionObjectivesStep but using editReply
        const objectiveConfigButtons = [];
        const objectiveConfigButtons2 = [];
        const allObjectives = this.missions.getAllObjectives();
        let buttonCount = 0;
        let objectiveDescriptions = [];
        for (const [objectiveId, objective] of allObjectives) {
            const buttonStyle = objectiveId === 'destroy_all' ? ButtonStyle.Secondary :
                               objectiveId === 'defeat_boss' ? ButtonStyle.Danger : ButtonStyle.Primary;
            const buttonId = `setup_objective_${objectiveId}_${interaction.user.id}`;
            const button = new ButtonBuilder()
                .setCustomId(buttonId)
                .setLabel(objective.name)
                .setStyle(buttonStyle);

            if (buttonCount < 5) {
                objectiveConfigButtons.push(button);
            } else {
                objectiveConfigButtons2.push(button);
            }
            buttonCount++;

            const reward = objective.reward ? `(${objective.reward.xp} XP, ${objective.reward.currency} credits)` : '';
            objectiveDescriptions.push(`• **${objective.name}** - ${objective.description} ${reward}`);
        }

        const navButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_back_map_${interaction.user.id}`)
                .setLabel('← Back to Map')
                .setStyle(ButtonStyle.Secondary)
        ];

        const objectiveRow1 = new ActionRowBuilder().addComponents(objectiveConfigButtons);
        const navRow = new ActionRowBuilder().addComponents(navButtons);

        const componentRows = [objectiveRow1, navRow];
        if (objectiveConfigButtons2.length > 0) {
            const objectiveRow2 = new ActionRowBuilder().addComponents(objectiveConfigButtons2);
            componentRows.splice(-1, 0, objectiveRow2);
        }

        const setupEmbed = new EmbedBuilder()
            .setTitle('⚓ Naval Battle Setup - Step 3 of 3')
            .setDescription(`**Game Master:** <@${interaction.user.id}>\n**Max Players:** ${game.setupState.maxPlayers}\n\n` +
                           `✅ **Enemies:** ${this.getEnemyConfigSummary(game.setupState.enemyConfig)}\n` +
                           `✅ **Map:** ${this.getMapConfigSummary(game.setupState.mapConfig)}\n\n` +
                           `🎯 **Choose Mission Objective**\n\n` +
                           `Select the primary goal for this naval engagement:`)
            .addFields([
                {
                    name: '🎯 Available Mission Objectives',
                    value: objectiveDescriptions.join('\n'),
                    inline: false
                }
            ])
            .setColor(0x9B59B6)
            .setFooter({ text: 'Step 3/3: Mission Objective' });

        await interaction.editReply({
            embeds: [setupEmbed],
            components: componentRows
        });
    }

    async showSetupSummaryStep(interaction, game) {
        const objective = this.missions.getObjective(game.setupState.objectiveConfig.type);
        const rewardText = objective?.reward ?
            `\n**Rewards:** ${objective.reward.xp} XP, ${objective.reward.currency} credits` : '';

        // Create setup complete buttons
        const actionButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_complete_${interaction.user.id}`)
                .setLabel('✅ Start Setup Complete!')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`setup_edit_enemies_${interaction.user.id}`)
                .setLabel('🤖 Edit Enemies')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`setup_edit_map_${interaction.user.id}`)
                .setLabel('🗺️ Edit Map')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`setup_edit_objectives_${interaction.user.id}`)
                .setLabel('🎯 Edit Objective')
                .setStyle(ButtonStyle.Secondary)
        ];

        const actionRow1 = new ActionRowBuilder().addComponents([actionButtons[0]]);
        const actionRow2 = new ActionRowBuilder().addComponents(actionButtons.slice(1));

        const setupEmbed = new EmbedBuilder()
            .setTitle('⚓ Naval Battle Setup Complete!')
            .setDescription(`**Game Master:** <@${interaction.user.id}>\n**Max Players:** ${game.setupState.maxPlayers}\n\n` +
                           `**Setup Configuration:**\n` +
                           `🤖 **Enemies:** ${this.getEnemyConfigSummary(game.setupState.enemyConfig)}\n` +
                           `🗺️ **Map:** ${this.getMapConfigSummary(game.setupState.mapConfig)}\n` +
                           `🎯 **Objective:** ${game.setupState.objectiveConfig.name}${rewardText}\n\n` +
                           `✅ **Ready to begin!** Players can now use \`/join\` to enter the battle.\n` +
                           `Use \`/start\` when all players have joined to begin the engagement.\n\n` +
                           `You can edit any setting using the buttons below.`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Setup Complete - Ready for Battle!' });

        // Mark setup as complete
        game.setupState.setupComplete = true;

        await interaction.update({
            embeds: [setupEmbed],
            components: [actionRow1, actionRow2]
        });
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          NEW SETUP FLOW HANDLER                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async handleNewSetupFlow(interaction, game) {
        const parts = interaction.customId.split('_');
        const userId = parts[parts.length - 1];

        // Verify it's the GM
        if (userId !== interaction.user.id || game.gmId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Only the GM can configure the game!', flags: MessageFlags.Ephemeral });
        }

        // Defer the interaction for setup_complete as it might take time
        if (interaction.customId.includes('setup_complete_')) {
            await interaction.deferUpdate();
        }

        try {
            if (interaction.customId.includes('setup_enemy_')) {
                await this.handleNewEnemyConfig(interaction, game, parts);
            } else if (interaction.customId.includes('setup_map_')) {
                await this.handleNewMapConfig(interaction, game, parts);
            } else if (interaction.customId.includes('setup_objective_')) {
                await this.handleNewObjectiveConfig(interaction, game, parts);
            } else if (interaction.customId.includes('setup_back_')) {
                await this.handleSetupNavigation(interaction, game, parts);
            } else if (interaction.customId.includes('setup_complete_')) {
                await this.handleSetupComplete(interaction, game);
            } else if (interaction.customId.includes('setup_edit_')) {
                await this.handleSetupEdit(interaction, game, parts);
            }
        } catch (error) {
            console.error('❌ Error in handleNewSetupFlow:', error);
            try {
                if (interaction.deferred) {
                    await interaction.editReply({ content: '❌ An error occurred during setup!' });
                } else if (!interaction.replied) {
                    await interaction.reply({ content: '❌ An error occurred during setup!', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.followUp({ content: '❌ An error occurred during setup!', flags: MessageFlags.Ephemeral });
                }
            } catch (responseError) {
                console.error('❌ Failed to send error response:', responseError);
            }
        }
    }

    async handleNewEnemyConfig(interaction, game, parts) {
        const configType = parts[2]; // setup_enemy_{TYPE}_{userId}

        if (configType === 'custom') {
            game.setupState.enemyConfig = { type: 'custom', customEnemies: { destroyers: 0, cruisers: 0, battleships: 0, carriers: 0, submarines: 0 }, totalCount: 0 };
            await this.showCustomEnemyConfig(interaction, game);
        } else {
            const enemyCount = parseInt(configType);
            game.setupState.enemyConfig = { type: 'preset', count: enemyCount };
            game.setupState.currentStep = 'map';
            await this.showMapConfigurationStep(interaction, game);
        }
    }

    async handleNewMapConfig(interaction, game, parts) {
        const mapType = parts[2]; // setup_map_{TYPE}_{userId}

        if (mapType === 'custom') {
            // Show custom map selection
            await this.showCustomMapSelection(interaction, game);
        } else {
            game.setupState.mapConfig = { type: mapType };
            game.setupState.currentStep = 'objectives';
            await this.showMissionObjectivesStep(interaction, game);
        }
    }

    async showCustomMapSelection(interaction, game) {
        // Get custom maps as an array from the Map object
        const customMapsArray = Array.from(this.customMapSystem.customMaps.values());

        if (customMapsArray.length === 0) {
            await interaction.reply({
                content: '❌ No custom maps available! Use `/createmap` to create custom maps first.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🗺️ Select Custom Map')
            .setDescription('Choose a custom map for your mission:')
            .setColor(0x00FF00)
            .setFooter({ text: 'Step 2/3: Map Configuration' });

        // Create select menu with custom maps
        const mapOptions = customMapsArray.slice(0, 25).map(map => ({
            label: map.name,
            description: `${map.size.width}x${map.size.height} • ${map.terrain.length} terrain features`,
            value: `custom_map_${map.id}`,
            emoji: '🗺️'
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`setup_select_custom_map_${interaction.user.id}`)
            .setPlaceholder('Choose a custom map...')
            .addOptions(mapOptions);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Add navigation buttons
        const navButtons = [
            new ButtonBuilder()
                .setCustomId(`setup_back_map_${interaction.user.id}`)
                .setLabel('← Back to Map Options')
                .setStyle(ButtonStyle.Secondary)
        ];

        const navRow = new ActionRowBuilder().addComponents(navButtons);

        await interaction.update({
            embeds: [embed],
            components: [selectRow, navRow]
        });
    }

    async handleCustomMapSelection(interaction, game) {
        const selectedMapId = interaction.values[0].replace('custom_map_', '');
        const selectedMap = this.customMapSystem.customMaps.get(selectedMapId);

        if (!selectedMap) {
            await interaction.reply({
                content: '❌ Selected map not found!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Store the custom map configuration
        game.setupState.mapConfig = {
            type: 'custom',
            customMap: selectedMap
        };

        // Show confirmation and move to objectives
        const embed = new EmbedBuilder()
            .setTitle('✅ Custom Map Selected')
            .setDescription(`**${selectedMap.name}** has been selected for your mission!`)
            .addFields([
                { name: 'Map Size', value: `${selectedMap.size.width}x${selectedMap.size.height}`, inline: true },
                { name: 'Terrain Features', value: selectedMap.terrain.length.toString(), inline: true },
                { name: 'Description', value: selectedMap.description || 'Custom battlefield', inline: true }
            ])
            .setColor(0x00FF00)
            .setFooter({ text: 'Moving to mission objectives...' });

        await interaction.update({
            embeds: [embed],
            components: []
        });

        // Automatically proceed to objectives after a brief moment
        setTimeout(async () => {
            game.setupState.currentStep = 'objectives';
            // Since the interaction is already replied to, we need to handle this differently
            // Let's create the objectives step content and edit the reply directly
            await this.showMissionObjectivesStepEditReply(interaction, game);
        }, 1500);
    }

    async handleNewObjectiveConfig(interaction, game, parts) {
        // Extract objective type from setup_objective_{OBJECTIVE_TYPE}_{userId}
        const objectiveParts = parts.slice(2, -1); // Remove 'setup', 'objective', and userId
        const objectiveType = objectiveParts.join('_');

        const objective = this.missions.getObjective(objectiveType);
        if (objective) {
            game.setupState.objectiveConfig = { type: objectiveType, name: objective.name };
            await this.showSetupSummaryStep(interaction, game);
        } else {
            await interaction.reply({ content: '❌ Invalid objective selected!', flags: MessageFlags.Ephemeral });
        }
    }

    async handleSetupNavigation(interaction, game, parts) {
        const targetStep = parts[2]; // setup_back_{STEP}_{userId}

        game.setupState.currentStep = targetStep;

        if (targetStep === 'enemies') {
            await this.showEnemyConfigurationStep(interaction, game);
        } else if (targetStep === 'map') {
            await this.showMapConfigurationStep(interaction, game);
        } else if (targetStep === 'objectives') {
            await this.showMissionObjectivesStep(interaction, game);
        }
    }

    async handleSetupComplete(interaction, game) {
        // Generate the map now that setup is complete
        console.log('🗺️ Generating map after setup completion...');
        game.map = game.generateMap(game);
        console.log(`✅ Map generated with ${game.map?.size || 0} cells`);

        // Show success message in channel
        const objective = this.missions.getObjective(game.setupState.objectiveConfig.type);
        const rewardText = objective?.reward ?
            `\n**Rewards:** ${objective.reward.xp} XP, ${objective.reward.currency} credits` : '';

        const completionEmbed = new EmbedBuilder()
            .setTitle('✅ Naval Battle Setup Complete!')
            .setDescription(`**Game Master:** <@${interaction.user.id}>\n**Max Players:** ${game.setupState.maxPlayers}\n\n` +
                           `**Configuration:**\n` +
                           `🤖 **Enemies:** ${this.getEnemyConfigSummary(game.setupState.enemyConfig)}\n` +
                           `🗺️ **Map:** ${this.getMapConfigSummary(game.setupState.mapConfig)}\n` +
                           `🎯 **Objective:** ${game.setupState.objectiveConfig.name}${rewardText}\n\n` +
                           `🎮 **Ready to Start!**\n` +
                           `Players can now use \`/join\` to enter the battle!\n` +
                           `Use \`/start\` when ready to begin the engagement.`)
            .setColor(0x2ECC71);

        // Send to channel (not ephemeral)
        await interaction.editReply({ content: '✅ Setup complete!', embeds: [], components: [] });
        await interaction.followUp({ embeds: [completionEmbed] });
    }

    async handleSetupEdit(interaction, game, parts) {
        const editTarget = parts[2]; // setup_edit_{TARGET}_{userId}

        if (editTarget === 'enemies') {
            game.setupState.currentStep = 'enemies';
            await this.showEnemyConfigurationStep(interaction, game);
        } else if (editTarget === 'map') {
            game.setupState.currentStep = 'map';
            await this.showMapConfigurationStep(interaction, game);
        } else if (editTarget === 'objectives') {
            game.setupState.currentStep = 'objectives';
            await this.showMissionObjectivesStep(interaction, game);
        }
    }

    async showCustomEnemyConfig(interaction, game) {
        // This would be expanded to show custom enemy selection UI
        // For now, just proceed to map step with default custom config
        game.setupState.currentStep = 'map';
        await this.showMapConfigurationStep(interaction, game);
    }

    async handleGameSetup(interaction, game) {
        const parts = interaction.customId.split('_');
        const userId = parts[parts.length - 1];
        
        // Verify it's the GM
        if (userId !== interaction.user.id || game.gmId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Only the GM can configure the game!', flags: MessageFlags.Ephemeral });
        }

        if (interaction.customId.includes('select_boss_')) {
            return await this.handleBossSelection(interaction, game);
        } else if (interaction.customId.includes('enemy_config_')) {
            return await this.handleEnemyConfig(interaction, game);
        } else if (interaction.customId.includes('map_config_')) {
            return await this.handleMapConfig(interaction, game);
        } else if (interaction.customId.includes('objective_config_')) {
            return await this.handleObjectiveConfig(interaction, game);  // This line is causing the error
        } else if (interaction.customId.includes('custom_enemy_')) {
            return await this.handleCustomEnemyConfig(interaction, game);
        }
    }

    async handleEnemyConfig(interaction, game) {
        const configType = interaction.customId.split('_')[2];
        
        if (configType === 'custom') {
            return await this.showCustomEnemySetup(interaction, game);
        }
        
        // Handle preset enemy counts
        const enemyCount = parseInt(configType);
        game.setupState.enemyConfig = {
            type: 'preset',
            count: enemyCount,
            enemies: enemyCount > 0 ? 'random' : 'none'
        };
        
        const message = enemyCount === 0 ? 
            'No AI enemies will spawn' : 
            `${enemyCount} random AI enemies will spawn`;
        
        await interaction.reply({
            content: `✅ **Enemy configuration set:** ${message}`,
            flags: MessageFlags.Ephemeral
        });
        
        await this.checkSetupComplete(game, interaction.channel);
    }

    async handleMapConfig(interaction, game) {
        const configType = interaction.customId.split('_')[2];
        
        game.setupState.mapConfig = {
            type: configType === 'random' ? 'generated' : 'custom'
        };
        
        const message = configType === 'random' ? 
            'Random generated map with procedural islands' : 
            'Custom map (feature coming soon)';
        
        await interaction.reply({
            content: `✅ **Map configuration set:** ${message}`,
            flags: MessageFlags.Ephemeral
        });
        
        await this.checkSetupComplete(game, interaction.channel);
    }

    async handleObjectiveConfig(interaction, game) {
        
        // Parse the objective type more carefully
        const parts = interaction.customId.split('_');
        
        // The pattern should be: objective_config_{OBJECTIVE_TYPE}_{USER_ID}
        const configIndex = parts.indexOf('config');
        if (configIndex === -1 || configIndex >= parts.length - 2) {
            console.error(`❌ Invalid objective button format: ${interaction.customId}`);
            return interaction.reply({
                content: `❌ Invalid objective button format. Please try again.`,
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Extract objective type (may contain underscores)
        const userIdIndex = parts.length - 1;
        const objectiveTypeParts = parts.slice(configIndex + 1, userIdIndex);
        const objectiveType = objectiveTypeParts.join('_');
        
        
        // Special case for defeat_boss
        if (objectiveType === 'defeat_boss') {
            await this.showBossSelection(interaction, game);
            return;
        }
        
        // Regular objective handling
        game.setupState.objectiveConfig = {
            type: objectiveType
        };
        
        const objective = this.missions.getObjective(objectiveType);
        
        if (objective) {
            const rewardText = objective.reward ? 
                ` (Rewards: ${objective.reward.xp} XP, ${objective.reward.currency} credits)` : '';
            
            await interaction.reply({
                content: `✅ **Mission objective set:** ${objective.name}\n` +
                        `📋 **Description:** ${objective.description}${rewardText}`,
                flags: MessageFlags.Ephemeral
            });
        } else {
            const allObjectives = this.missions.getAllObjectives();
            const availableTypes = Array.from(allObjectives.keys()).join(', ');
            
            console.error(`❌ Objective "${objectiveType}" not found. Available: ${availableTypes}`);
            
            await interaction.reply({
                content: `❌ Unknown objective: "${objectiveType}"\n` +
                        `Available objectives: ${availableTypes}\n` +
                        `Please report this issue to the developers.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        await this.checkSetupComplete(game, interaction.channel);
    }

    async showBossSelection(interaction, game) {
        // Get available bosses from the missions module
        const bossObjective = this.missions.getObjective('defeat_boss');
        if (!bossObjective || !bossObjective.availableBosses) {
            // Fallback if no boss list available
            game.setupState.objectiveConfig = { type: 'defeat_boss' };
            await interaction.reply({
                content: '✅ **Mission objective set:** Defeat Boss\n📋 **Description:** Random boss will be selected',
                flags: MessageFlags.Ephemeral
            });
            await this.checkSetupComplete(game, interaction.channel);
            return;
        }

        const bossButtons = [];
        const bosses = bossObjective.availableBosses;

        // Create buttons for each boss type
        for (let i = 0; i < bosses.length; i++) {
            const boss = bosses[i];
            bossButtons.push(
                new ButtonBuilder()
                    .setCustomId(`select_boss_${boss.type}_${interaction.user.id}`)
                    .setLabel(boss.name)
                    .setStyle(boss.type === 'harbor_princess' ? ButtonStyle.Danger : 
                             boss.type.includes('princess') ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
        }

        // Add random boss option
        bossButtons.push(
            new ButtonBuilder()
                .setCustomId(`select_boss_random_${interaction.user.id}`)
                .setLabel('Random Boss')
                .setStyle(ButtonStyle.Success)
        );

        // Organize buttons into rows (max 5 per row)
        const actionRows = [];
        for (let i = 0; i < bossButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(bossButtons.slice(i, i + 5)));
        }

        // Create boss description text
        const bossDescriptions = bosses.map(boss => 
            `**${boss.name}** (${boss.health} HP)\n${boss.description}`,
        ).join('\n\n');

        const bossSelectionEmbed = new EmbedBuilder()
            .setTitle('👹 Select Boss Enemy')
            .setDescription(`Choose which boss will be the primary target:\n\n${bossDescriptions}\n\n` +
                           `**Random Boss:** Let the system choose randomly`)
            .setColor(0x8B0000);

        await interaction.reply({
            embeds: [bossSelectionEmbed],
            components: actionRows,
            flags: MessageFlags.Ephemeral
        });
    }

    async handleBossSelection(interaction, game) {
        const parts = interaction.customId.split('_');
        
        // The user ID is always the last part
        const userId = parts[parts.length - 1];
        
        // The boss type is everything between 'boss' and the user ID
        const bossStartIndex = parts.indexOf('boss') + 1;
        const bossEndIndex = parts.length - 1;
        const bossType = parts.slice(bossStartIndex, bossEndIndex).join('_');
        
        
        // Verify it's the GM
        if (game.gmId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Only the GM can select the boss!', flags: MessageFlags.Ephemeral });
        }

        // Set the objective configuration with the selected boss
        game.setupState.objectiveConfig = {
            type: 'defeat_boss',
            selectedBoss: bossType === 'random' ? null : bossType
        };

        let bossName = 'Random Boss';
        let bossDescription = 'A random boss will be selected when the battle starts';

        if (bossType !== 'random') {
            // Get boss details from missions module
            const bossObjective = this.missions.getObjective('defeat_boss');
            const selectedBoss = bossObjective.availableBosses?.find(boss => boss.type === bossType);
            
            if (selectedBoss) {
                bossName = selectedBoss.name;
                bossDescription = selectedBoss.description;
            }
        }

        await interaction.reply({
            content: `✅ **Mission objective set:** Defeat Boss\n` +
                    `👹 **Selected Boss:** ${bossName}\n` +
                    `📋 **Description:** ${bossDescription}`,
            flags: MessageFlags.Ephemeral
        });
        
        await this.checkSetupComplete(game, interaction.channel);
    }

    async handleCustomEnemyConfig(interaction, game) {
        const parts = interaction.customId.split('_');
        const enemyType = parts[2]; // submarines, destroyers, cruisers, battleships, carriers, or done
        const userId = parts[parts.length - 1];
        
        // Verify it's the GM
        if (userId !== interaction.user.id || game.gmId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Only the GM can configure enemies!', flags: MessageFlags.Ephemeral });
        }

        // Initialize custom enemy config if not exists - SAME INITIALIZATION
        if (!game.setupState.customEnemies) {
            game.setupState.customEnemies = {
                destroyers: 0,
                cruisers: 0,
                battleships: 0,
                carriers: 0,
                submarines: 0
            };
        }

        if (enemyType === 'done') {
            // Finish custom enemy setup
            const totalEnemies = game.setupState.customEnemies.destroyers + 
                               game.setupState.customEnemies.cruisers + 
                               game.setupState.customEnemies.battleships +
                               game.setupState.customEnemies.carriers +
                               game.setupState.customEnemies.submarines;
            
            game.setupState.enemyConfig = {
                type: 'custom',
                customEnemies: game.setupState.customEnemies,
                totalCount: totalEnemies
            };
            
            await interaction.reply({
                content: `✅ **Custom enemy setup complete!**\n` +
                        `• Submarines: ${game.setupState.customEnemies.submarines}\n` +
                        `• Destroyers: ${game.setupState.customEnemies.destroyers}\n` +
                        `• Cruisers: ${game.setupState.customEnemies.cruisers}\n` +
                        `• Battleships: ${game.setupState.customEnemies.battleships}\n` +
                        `• Aircraft Carriers: ${game.setupState.customEnemies.carriers}\n` +
                        `**Total:** ${totalEnemies} enemies`,
                flags: MessageFlags.Ephemeral
            });
            
            await this.checkSetupComplete(game, interaction.channel);
            return;
        }

        // Add one enemy of the selected type
        if (enemyType in game.setupState.customEnemies) {
            game.setupState.customEnemies[enemyType]++;
            
            // Update the embed to show new counts
            const customEmbed = new EmbedBuilder()
                .setTitle('🤖 Custom Enemy Setup')
                .setDescription(`Choose which types of enemies to add to the battle.\n` +
                               `You can add multiple types and quantities.\n\n` +
                               `**Current Selection:**\n` +
                               `• Submarines: ${game.setupState.customEnemies.submarines}\n` +
                               `• Destroyers: ${game.setupState.customEnemies.destroyers}\n` +
                               `• Cruisers: ${game.setupState.customEnemies.cruisers}\n` +
                               `• Battleships: ${game.setupState.customEnemies.battleships}\n` +
                               `• Aircraft Carriers: ${game.setupState.customEnemies.carriers}`)
                .setColor(0xFF6600);

            // Keep the same buttons (in new order)
            const enemyTypeButtons = [
                new ButtonBuilder()
                    .setCustomId(`custom_enemy_submarines_${interaction.user.id}`)
                    .setLabel('Add Submarines')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`custom_enemy_destroyers_${interaction.user.id}`)
                    .setLabel('Add Destroyers')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`custom_enemy_cruisers_${interaction.user.id}`)
                    .setLabel('Add Cruisers')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`custom_enemy_battleships_${interaction.user.id}`)
                    .setLabel('Add Battleships')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`custom_enemy_carriers_${interaction.user.id}`)
                    .setLabel('Add Carriers')
                    .setStyle(ButtonStyle.Success)
            ];

            const enemyTypeButtons2 = [
                new ButtonBuilder()
                    .setCustomId(`custom_enemy_done_${interaction.user.id}`)
                    .setLabel('Finish Enemy Setup')
                    .setStyle(ButtonStyle.Success)
            ];

            const customRow1 = new ActionRowBuilder().addComponents(enemyTypeButtons);
            const customRow2 = new ActionRowBuilder().addComponents(enemyTypeButtons2);

            await interaction.update({ embeds: [customEmbed], components: [customRow1, customRow2] });
        }
    }

    async showCustomEnemySetup(interaction, game) {
        const enemyTypeButtons = [
            new ButtonBuilder()
                .setCustomId(`custom_enemy_submarines_${interaction.user.id}`)
                .setLabel('Add Submarines')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`custom_enemy_destroyers_${interaction.user.id}`)
                .setLabel('Add Destroyers')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`custom_enemy_cruisers_${interaction.user.id}`)
                .setLabel('Add Cruisers')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`custom_enemy_battleships_${interaction.user.id}`)
                .setLabel('Add Battleships')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`custom_enemy_carriers_${interaction.user.id}`)
                .setLabel('Add Carriers')
                .setStyle(ButtonStyle.Success)
        ];

        const enemyTypeButtons2 = [
            new ButtonBuilder()
                .setCustomId(`custom_enemy_done_${interaction.user.id}`)
                .setLabel('Finish Enemy Setup')
                .setStyle(ButtonStyle.Success)
        ];

        const customRow1 = new ActionRowBuilder().addComponents(enemyTypeButtons);
        const customRow2 = new ActionRowBuilder().addComponents(enemyTypeButtons2);

        // Initialize custom enemy config if not exists - ADD ALL TYPES
        if (!game.setupState.customEnemies) {
            game.setupState.customEnemies = {
                destroyers: 0,
                cruisers: 0,
                battleships: 0,
                carriers: 0,
                submarines: 0
            };
        }

        const customEmbed = new EmbedBuilder()
            .setTitle('🤖 Custom Enemy Setup')
            .setDescription(`Choose which types of enemies to add to the battle.\n` +
                           `You can add multiple types and quantities.\n\n` +
                           `**Current Selection:**\n` +
                           `• Submarines: ${game.setupState.customEnemies.submarines}\n` +
                           `• Destroyers: ${game.setupState.customEnemies.destroyers}\n` +
                           `• Cruisers: ${game.setupState.customEnemies.cruisers}\n` +
                           `• Battleships: ${game.setupState.customEnemies.battleships}\n` +
                           `• Aircraft Carriers: ${game.setupState.customEnemies.carriers}`)
            .setColor(0xFF6600);

        await interaction.reply({ embeds: [customEmbed], components: [customRow1, customRow2], flags: MessageFlags.Ephemeral });
    }

    async checkSetupComplete(game, channel) {
        if (game.setupState.enemyConfig && game.setupState.mapConfig && game.setupState.objectiveConfig && !game.setupState.setupComplete) {
            game.setupState.setupComplete = true;
            
            const objective = this.missions.getObjective(game.setupState.objectiveConfig.type);
            const rewardText = objective?.reward ? 
                `\n**Rewards:** ${objective.reward.xp} XP, ${objective.reward.currency} credits` : '';
            
            const setupSummary = new EmbedBuilder()
                .setTitle('✅ Game Setup Complete!')
                .setDescription(`**Enemy Configuration:** ${this.getEnemyConfigSummary(game.setupState.enemyConfig)}\n` +
                               `**Map Type:** ${game.setupState.mapConfig.type === 'generated' ? 'Random Generated' : 'Custom'}\n` +
                               `**Mission Objective:** ${objective?.name || 'Unknown'}\n\n` +
                               `📋 **Mission Details:**\n${objective?.description || 'No description available'}${rewardText}\n\n` +
                               `🎮 **Ready to Start!**\n` +
                               `Players can now use \`/join\` to enter the battle!\n` +
                               `Use \`/start\` when ready to start the mission.`)
                .setColor(0x00FF00);

            await channel.send({ embeds: [setupSummary] });
        }
    }

    getEnemyConfigSummary(enemyConfig) {
        if (!enemyConfig) {
            return 'No enemy configuration';
        }
        
        if (enemyConfig.type === 'preset') {
            return enemyConfig.count === 0 ? 'No AI enemies' : `${enemyConfig.count} random enemies`;
        } else if (enemyConfig.type === 'custom') {
            const custom = enemyConfig.customEnemies;
            const parts = [];
            if (custom.destroyers > 0) parts.push(`${custom.destroyers} Destroyers`);
            if (custom.cruisers > 0) parts.push(`${custom.cruisers} Cruisers`);
            if (custom.battleships > 0) parts.push(`${custom.battleships} Battleships`);
            if (custom.carriers > 0) parts.push(`${custom.carriers} Carriers`);
            if (custom.submarines > 0) parts.push(`${custom.submarines} Submarines`);
            
            if (parts.length === 0) {
                return 'No custom enemies selected';
            }
            
            return `Custom: ${parts.join(', ')} (Total: ${enemyConfig.totalCount || 0})`;
        }
        
        return 'Unknown enemy configuration';
    }

    getMapConfigSummary(mapConfig) {
        if (!mapConfig) {
            return 'No map configuration';
        }

        if (mapConfig.type === 'generated' || mapConfig.type === 'random') {
            return 'Random Generated Map';
        } else if (mapConfig.type === 'custom') {
            if (mapConfig.customMap) {
                return `Custom Map: ${mapConfig.customMap.name} (${mapConfig.customMap.size.width}x${mapConfig.customMap.size.height})`;
            }
            return 'Custom Map';
        }

        return 'Unknown map configuration';
    }

    getMissionSummary(objectiveType) {
        const objective = this.missions.getObjective(objectiveType);
        if (!objective) return 'Unknown Mission';
        
        return `${objective.name} - ${objective.description}`;
    }

    async spawnConfiguredEnemies(game) {
        const config = game.setupState.enemyConfig;
        
        if (!config) {
            return;
        }
        
        if (config.type === 'preset' && config.count > 0) {
            // Spawn random enemies
            for (let i = 0; i < config.count; i++) {
                const ai = game.spawnRandomAI();
                
                // FIXED: Use isAICarrierType instead of isAICarrier
                if (ai && this.isAICarrierType(ai)) {
                    this.setupAICarrierAircraft(ai, game);
                }
            }
            
        } else if (config.type === 'custom' && config.customEnemies) {
            // Spawn custom enemy types
            const custom = config.customEnemies;
            let totalSpawned = 0;
            
            // Spawn each type (existing code...)
            for (let i = 0; i < custom.destroyers; i++) {
                const destroyer = this.spawnSpecificAI(game, 'destroyer');
                if (destroyer) totalSpawned++;
            }
            
            for (let i = 0; i < custom.cruisers; i++) {
                const cruiser = this.spawnSpecificAI(game, 'cruiser');
                if (cruiser) totalSpawned++;
            }
            
            for (let i = 0; i < custom.battleships; i++) {
                const battleship = this.spawnSpecificAI(game, 'battleship');
                if (battleship) totalSpawned++;
            }

            for (let i = 0; i < custom.carriers; i++) {
                const carrier = this.spawnSpecificAI(game, 'carrier');
                // FIXED: Use isAICarrierType instead of isAICarrier
                if (carrier && this.isAICarrierType(carrier)) {
                    this.setupAICarrierAircraft(carrier, game);
                }
                if (carrier) totalSpawned++;
            }

            for (let i = 0; i < custom.submarines; i++) {
                const submarine = this.spawnSpecificAI(game, 'submarine');
                if (submarine) totalSpawned++;
            }
        }
        
        console.log(`⚔️ Battle initialized with ${game.players.size} players and ${game.enemies.size} AI enemies`);
    }

    spawnSpecificAI(game, shipType) {
        let attempts = 0;
        let ai = null;
        
        while (attempts < 20) {
            const aiTemplate = game.getRandomCustomAI();
            
            if (this.isAIOfType(aiTemplate, shipType)) {
                const aiPosition = game.getRandomAISpawnPosition();
                
                ai = {
                    id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: aiTemplate.type,
                    shipClass: aiTemplate.shipClass,
                    customName: aiTemplate.name,
                    position: aiPosition,
                    alive: true,
                    currentHealth: aiTemplate.stats.health,
                    maxHealth: aiTemplate.stats.health,
                    stats: aiTemplate.stats,
                    weapons: aiTemplate.weapons,
                    onFire: false,
                    flooding: false,
                    fireTimer: 0,
                    floodTimer: 0,
                    damageControlCooldown: 0,
                    tonnage: aiTemplate.tonnage,
                    speedKnots: aiTemplate.speedKnots,
                    armorThickness: aiTemplate.armorThickness,
                    baseAccuracy: aiTemplate.baseAccuracy
                };

                if (this.isAICarrierType(ai)) {
                    this.setupAICarrierAircraft(ai, game);
                }

                // Generate AA system for AI
                const aaSystem = this.generateAAForAI(ai);
                if (aaSystem) {
                    ai.aaSystem = aaSystem;
                }

                // Set facing direction based on spawn side (face toward player side +-90°)
                if (ai.direction === undefined) {
                    ai.direction = GameUtils.getSpawnFacingDirection(game.oppositeSide || 'right');
                }

                game.enemies.set(ai.id, ai);
                break;
            }
            attempts++;
        }
        
        if (!ai) {
            console.log(`⚠️ Could not find AI of type: ${shipType} after ${attempts} attempts`);
        }
        
        return ai;
    }

    isAICarrierType(ai) {
        if (!ai) return false;
        
        const aiType = (ai.type || '').toLowerCase();
        const shipClass = (ai.shipClass || '').toLowerCase();
        const name = (ai.customName || '').toLowerCase();
        
        return aiType === 'carrier' || 
               aiType === 'aircraft_carrier' ||
               aiType === 'aircraftcarrier' ||
               shipClass.includes('carrier') || 
               shipClass.includes('aircraft carrier') ||
               name.includes('[cv]') ||
               name.includes('[cvl]') ||
               name.includes('princess'); // Harbor Princess
    }

    isAIOfType(aiTemplate, requestedType) {
        const aiType = aiTemplate.type.toLowerCase();
        const shipClass = aiTemplate.shipClass.toLowerCase();
        const name = aiTemplate.name.toLowerCase();
        
        switch (requestedType.toLowerCase()) {
            case 'destroyer':
                return aiType === 'destroyer' || 
                       shipClass.includes('destroyer') || 
                       name.includes('[dd]');
                       
            case 'cruiser':
                return aiType === 'cruiser' || 
                       aiType === 'lightcruiser' ||
                       aiType === 'light_cruiser' ||
                       aiType === 'heavy_cruiser' ||
                       shipClass.includes('cruiser') || 
                       name.includes('[cl]') || 
                       name.includes('[ca]');
                               
            case 'battleship':
                return aiType === 'battleship' || 
                       shipClass.includes('battleship') || 
                       name.includes('[bb]');
                       
            case 'carrier':
            case 'aircraft_carrier':
                return aiType === 'carrier' || 
                       aiType === 'aircraft_carrier' ||
                       aiType === 'aircraftcarrier' ||
                       shipClass.includes('carrier') || 
                       shipClass.includes('aircraft carrier') ||
                       name.includes('[cv]') ||
                       name.includes('[cvl]');
                       
            case 'submarine':
                return aiType === 'submarine' || 
                       shipClass.includes('submarine') || 
                       name.includes('[ss]');
                       
            default:
                return false;
        }
    }

    setupAICarrierAircraft(ai, game) {
        console.log(`✈️ Setting up aircraft for AI carrier: ${ai.customName}`);
        
        // Determine carrier type - check for Harbor Princess
        let carrierType = 'carrier';
        if (ai.customName.toLowerCase().includes('princess')) {
            carrierType = 'harbor_princess';
        }
        
        const aircraftConfig = AI_CARRIER_AIRCRAFT[carrierType];
        if (!aircraftConfig) {
            console.log(`⚠️ No aircraft config found for carrier type: ${carrierType}`);
            return;
        }
        
        ai.hangar = aircraftConfig.hangar;
        ai.availableSquadrons = new Map();
        
        aircraftConfig.squadrons.forEach((squadron, index) => {
            const squadronId = `ai_squadron_${index + 1}`;
            ai.availableSquadrons.set(squadronId, {
                type: squadron.type,
                count: squadron.count,
                name: squadron.name,
                ready: true,
                launched: false
            });
        });
        
    }

    async processAICarrierOperations(ai, game, channel) {
        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
        if (alivePlayers.length === 0) return;
        
        // AI can launch aircraft from anywhere on the map if they have hangar space
        if (ai.hangar >= 12) {
            const squadronToLaunch = this.selectAISquadronToLaunch(ai, game, null); // No range check
            
            if (squadronToLaunch) {
                await this.launchAISquadron(ai, squadronToLaunch, game, channel);
                return; // Skip other actions this turn
            }
        }
        
        // If no aircraft to launch, move closer to players or attack if in range
        const nearestPlayer = GameUtils.findNearestPlayer(ai, game);
        if (nearestPlayer) {
            const distance = game.calculateDistance(ai.position, nearestPlayer.position);
            
            if (distance <= ai.stats.range) {
                // Attack with ship weapons
                const result = this.executeAttack(ai, nearestPlayer, 'main', 'ap', game);
                const aiName = GameUtils.getAIDisplayName(ai);
                const targetName = GameUtils.getPlayerDisplayName(nearestPlayer);
                const enhancedMessage = `🔥 ${aiName} attacks ${targetName}! ${result.message.split('!')[1] || result.message}`;
                await channel.send(enhancedMessage);
            } else {
                // Move closer
                const oldPosition = ai.position;
                const newPosition = game.moveTowards(ai.position, nearestPlayer.position, ai.stats.speed);

                // Calculate and store direction based on movement
                if (oldPosition && newPosition && oldPosition !== newPosition) {
                    const oldCoords = this.coordToNumbers(oldPosition);
                    const newCoords = this.coordToNumbers(newPosition);

                    if (oldCoords && newCoords) {
                        const deltaX = newCoords.x - oldCoords.x;
                        const deltaY = newCoords.y - oldCoords.y;

                        // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
                        let angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
                        if (angle < 0) angle += 360;

                        ai.direction = angle;
                    }
                }

                const oldCell = game.getMapCell(oldPosition);
                if (oldCell) oldCell.occupant = null;

                ai.position = newPosition;
                
                const newCell = game.getMapCell(newPosition);
                if (newCell) newCell.occupant = 'ai';
                
                const aiName = GameUtils.getAIDisplayName(ai);
                const moveDistance = game.calculateDistance(oldPosition, newPosition);
                
                // Add movement action to batch instead of sending immediately
                game.addAIAction({
                    type: 'movement',
                    message: `${aiName} moved to **${newPosition}** (${moveDistance.toFixed(1)} cells), positioning for aircraft operations`
                });
            }
        }
    }

    // Select which squadron the AI should launch
    selectAISquadronToLaunch(ai, game, targetPlayer) {
        const availableSquadrons = Array.from(ai.availableSquadrons.entries()).filter(([id, squadron]) => 
            squadron.ready && !squadron.launched && ai.hangar >= squadron.count
        );
        
        if (availableSquadrons.length === 0) return null;
        
        // AI strategy: Launch fighters first if enemy aircraft present, otherwise dive bombers, then torpedoes
        const enemyAircraft = Array.from(game.aircraft?.values() || []).filter(a => 
            a.alive && a.owner === 'player'
        );
        
        // Prioritize fighters if enemy aircraft are present
        if (enemyAircraft.length > 0) {
            const fighterSquadron = availableSquadrons.find(([id, squadron]) => squadron.type === 'fighter');
            if (fighterSquadron) return fighterSquadron;
        }
        
        // Otherwise prefer dive bombers (versatile)
        const diveBomberSquadron = availableSquadrons.find(([id, squadron]) => squadron.type === 'dive_bomber');
        if (diveBomberSquadron) return diveBomberSquadron;
        
        // Then torpedo bombers
        const torpedoSquadron = availableSquadrons.find(([id, squadron]) => squadron.type === 'torpedo_bomber');
        if (torpedoSquadron) return torpedoSquadron;
        
        // Fallback to any available squadron
        return availableSquadrons[0];
    }

    // Launch an AI squadron
    async launchAISquadron(ai, squadronEntry, game, channel) {
        const [squadronId, squadron] = squadronEntry;
        
        // Create aircraft using existing carrier system
        const aircraft = this.carrierSystem.createAircraftSquadron(
            squadron.type,
            squadron.count,
            ai.position,
            'enemy',
            ai.id,
            {} // No special equipment for AI
        );
        
        if (!aircraft) {
            console.error(`❌ Failed to create AI aircraft squadron: ${squadron.name}`);
            return;
        }
        
        // Initialize aircraft map if needed
        if (!game.aircraft) {
            game.aircraft = new Map();
        }
        
        // Customize for AI
        aircraft.name = squadron.name;
        aircraft.mission = 'patrol'; // AI aircraft start on patrol
        aircraft.isAI = true;
        
        game.aircraft.set(aircraft.id, aircraft);
        
        // Reduce AI hangar space
        ai.hangar -= squadron.count;
        
        // Mark squadron as launched
        squadron.launched = true;
        squadron.ready = false;
        
        const aiName = GameUtils.getAIDisplayName(ai);
        // Add launch action to batch instead of sending immediately
        game.addAIAction({
            type: 'launch',
            message: `**${aiName}** launched **${squadron.name}** (${squadron.count} aircraft) at **${aircraft.position}**`
        });
        
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PLAYER & CHARACTER MANAGEMENT                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async joinGame(interaction) {
        
        const game = this.games.get(interaction.channelId);
        if (!game) return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });
        
        // *** PREVENT DUPLICATE JOINS BUT ALLOW SPAWN CHANGES ***
        if (game.players.has(interaction.user.id)) {
            // Player is already in game - just show spawn selection instead of joining again
            return interaction.reply({
                content: '✅ You are already in this game! Click a spawn button below to change your spawn position.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Allow joining during battle if all players are dead (QRF scenario)
        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
        const isQRFScenario = game.phase === 'battle' && alivePlayers.length === 0;
        
        if (game.phase !== 'joining' && !isQRFScenario) {
            return interaction.reply({ content: 'Cannot join - battle has already started!', flags: MessageFlags.Ephemeral });
        }
        
        // Check maximum players
        if (game.players.size >= game.maxPlayers) {
            return interaction.reply({ 
                content: '❌ Game is full! Maximum players reached.',
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // Rest of your existing join logic...
        const playerEntry = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
        if (!playerEntry || !playerEntry.characters || playerEntry.characters.size === 0) {
            return interaction.reply({
                content: '❌ You have no characters! Ask a GM to create one using `/newchar`.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Continue with character selection...
        if (playerEntry.characters.size === 1) {
            const characterName = Array.from(playerEntry.characters.keys())[0];
            let character = playerEntry.characters.get(characterName);
            character = this.fixCharacterDataStructure(character);
            
            if (this.needsSquadronSelection(character)) {
                await this.showSquadronSelectionForBattle(interaction, interaction.user.id, interaction.channelId, character, characterName, isQRFScenario);
            } else {
                await this.joinWithCharacter(interaction, game, character, characterName, isQRFScenario);
            }
        } else {
            await this.showCharacterSelection(interaction, playerEntry, game, isQRFScenario);
        }
    }

    async showCharacterSelection(interaction, playerEntry, game, isQRFScenario) {
        const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_character_${interaction.user.id}_${interaction.channelId}`)
            .setPlaceholder('Choose your character for this sortie');
        
        for (const [characterName, character] of playerEntry.characters) {
            const shipClass = character.shipClass || 'Unknown';
            const health = character.stats?.health || character.calculatedHP || 100;
            const level = character.level || 1;
            
            selectMenu.addOptions({
                label: characterName,
                description: `${shipClass} - HP: ${health}, Level: ${level}`,
                value: characterName
            });
        }
        
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setTitle('🚢 Select Your Character')
            .setDescription(`Choose which character you want to use for this ${isQRFScenario ? 'QRF deployment' : 'sortie'}:`)
            .setColor(0x0099FF);
        
        await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
    }

    async handleCharacterSelection(interaction) {
        
        try {
            // IMMEDIATELY respond to prevent timeout
            await interaction.deferUpdate();
            
            const [, , userId, channelId] = interaction.customId.split('_');
            
            if (userId !== interaction.user.id) {
                return interaction.editReply({ 
                    content: '❌ This is not your character selection!',
                    components: [],
                    embeds: [] 
                });
            }
            
            const game = this.games.get(channelId);
            if (!game) {
                return interaction.editReply({ 
                    content: '❌ Game no longer exists!',
                    components: [],
                    embeds: [] 
                });
            }
            
            
            const playerEntry = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
            if (!playerEntry) {
                return interaction.editReply({
                    content: '❌ Player data not found!',
                    components: [],
                    embeds: []
                });
            }
            
            
            const characterName = interaction.values[0];
            
            let character;
            if (playerEntry.characters instanceof Map) {
                character = playerEntry.characters.get(characterName);
            } else if (typeof playerEntry.characters === 'object') {
                character = playerEntry.characters[characterName];
            } else {
                return interaction.editReply({ 
                    content: '❌ Invalid character data structure!',
                    components: [],
                    embeds: [] 
                });
            }
            
            if (!character) {
                
                // FIXED: Rewritten the problematic line
                const availableCharacters = playerEntry.characters instanceof Map 
                    ? Array.from(playerEntry.characters.keys()) 
                    : Object.keys(playerEntry.characters || {});
                
                return interaction.editReply({ 
                    content: '❌ Character not found!',
                    components: [],
                    embeds: [] 
                });
            }
            
            
            // Set as active character
            playerEntry.activeCharacter = characterName;
            this.savePlayerData();
            
            // Update the selection message
            await interaction.editReply({
                content: `✅ Selected **${characterName}** for the sortie!`,
                components: [],
                embeds: []
            });
            
            // Determine if QRF scenario
            const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
            const isQRFScenario = game.phase === 'battle' && alivePlayers.length === 0;
            
            // Get ship class from character data
            const shipClass = character.shipClass || 'Unknown';
            
            // Check OPFOR role
            const isOPFOR = this.hasOPFORRole(interaction.member);
            
            // Add player to game
            let joinSuccess = false;
            if (isOPFOR) {
                joinSuccess = game.addOPFORPlayer(interaction.user.id, character, shipClass, interaction.member);
            } else {
                joinSuccess = game.addPlayer(interaction.user.id, character, shipClass, interaction.member);
            }
            
            if (!joinSuccess) {
                return interaction.followUp({ 
                    content: '❌ Failed to join the game!',
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Show spawn selection
            if (isOPFOR) {
                await this.showOPFORSpawnSelection(interaction, game);
            } else {
                await this.showSpawnSelection(interaction, game);
                if (isQRFScenario) {
                    game.turnOrder.push(interaction.user.id);
                }
            }
            
            // Send join announcement
            const joinMessage = isOPFOR 
                ? `🔴 **OPFOR DEPLOYED!** <@${interaction.user.id}> joined as enemy ${shipClass} **${characterName}**!`
                : isQRFScenario 
                    ? `🚁 **QRF REINFORCEMENT!** <@${interaction.user.id}> arrived as ${shipClass} **${characterName}**!`
                    : `🚢 <@${interaction.user.id}> joined as ${shipClass} **${characterName}**!`;
            
            await interaction.followUp({ content: joinMessage });
            
        } catch (error) {
            console.error('❌ Error in handleCharacterSelection:', error);
            console.error('❌ Error stack:', error.stack);
            
            try {
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({ 
                        content: '❌ An error occurred during character selection!',
                        components: [],
                        embeds: [] 
                    });
                } else if (!interaction.replied) {
                    await interaction.reply({ 
                        content: '❌ An error occurred during character selection!',
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (replyError) {
                console.error('❌ Could not send error reply:', replyError);
            }
        }
    }

    async joinWithCharacter(interaction, game, character, characterName, isQRFScenario) {
        
        try {
            // Get ship class from character data or member roles
            const shipClass = character.shipClass || this.getPlayerShipClass(interaction.member);
            
            // CHECK FOR OPFOR ROLE
            const isOPFOR = this.hasOPFORRole(interaction.member);
            
            if (isOPFOR) {
                // Join as enemy player
                if (game.addOPFORPlayer(interaction.user.id, character, shipClass, interaction.member)) {
                    
                    // Update character selection
                    if (interaction.isStringSelectMenu()) {
                        await interaction.update({
                            content: `✅ Selected **${characterName}** for OPFOR deployment!`,
                            components: [],
                            embeds: []
                        });
                    }
                    
                    // Show spawn selection (this will use followUp internally)
                    await this.showOPFORSpawnSelection(interaction, game);
                    
                    // Send announcement message
                    const followUpMessage = `🔴 **OPFOR DEPLOYED!**\n<@${interaction.user.id}> joined as enemy ${shipClass} with **${characterName}**!`;
                    await interaction.followUp({ content: followUpMessage });
                    
                } else {
                    if (interaction.isStringSelectMenu()) {
                        await interaction.update({ content: 'Failed to join as OPFOR!', components: [], embeds: [] });
                    } else {
                        await interaction.reply({ content: 'Failed to join as OPFOR!', flags: MessageFlags.Ephemeral });
                    }
                }
            } else {
                // Normal player join
                if (game.addPlayer(interaction.user.id, character, shipClass, interaction.member)) {
                    
                    // Update character selection FIRST
                    if (interaction.isStringSelectMenu()) {
                        await interaction.update({
                            content: `✅ Selected **${characterName}** for the sortie!`,
                            components: [],
                            embeds: []
                        });
                    }
                    
                    if (isQRFScenario) {
                        const timeWaiting = game.qrfWaitingStartTime ? Math.floor((Date.now() - game.qrfWaitingStartTime) / 1000) : 0;
                        
                        // Show spawn selection (this should use followUp since we already updated)
                        await this.showSpawnSelection(interaction, game);
                        
                        // Send QRF announcement
                        const followUpMessage = `🚁 **QRF REINFORCEMENT DEPLOYED!**\n<@${interaction.user.id}> has arrived as ${shipClass} **${characterName}** backup!\n⏰ Arrived after ${timeWaiting} seconds of waiting.`;
                        await interaction.followUp({ content: followUpMessage });
                        
                        game.turnOrder.push(interaction.user.id);
                    } else {
                        // Normal join - show spawn selection
                        await this.showSpawnSelection(interaction, game);
                        
                        // Send join announcement
                        const followUpMessage = `🚢 <@${interaction.user.id}> joined as ${shipClass} **${characterName}**!`;
                        await interaction.followUp({ content: followUpMessage });
                    }
                } else {
                    if (interaction.isStringSelectMenu()) {
                        await interaction.update({ content: 'Failed to join - game might be full!', components: [], embeds: [] });
                    } else {
                        await interaction.reply({ content: 'Failed to join - game might be full!', flags: MessageFlags.Ephemeral });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in joinWithCharacter:', error);
            console.error('❌ Error stack:', error.stack);
            
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ content: '❌ Error joining with character!', flags: MessageFlags.Ephemeral });
                } catch (replyError) {
                    console.error('❌ Could not send error reply:', replyError);
                }
            }
        }
    }

    async joinWithSelectedCharacter(interaction, characterName, game, isQRFScenario) {
        const playerEntry = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
        const character = playerEntry.characters.get(characterName);
        
        // Check if aircraft carrier needs squadron selection
        if (this.needsSquadronSelection(character)) {
            await this.showSquadronSelectionForBattle(interaction, interaction.user.id, interaction.channelId, character, characterName, isQRFScenario);
        } else {
            await this.joinWithCharacter(interaction, game, character, characterName, isQRFScenario);
        }
    }

    getOrCreatePlayer(guildId, user) {
        const playerId = user.id;
        if (!this.hasGuildPlayerData(guildId, playerId)) {
            const defaultStats = {
                id: playerId,
                username: user.username,
                level: 1,
                experience: 0,
                currency: 1000,
                stats: { health: 100, armor: 50, speed: 3, range: 5, accuracy: 70, evasion: 20 },
                equipment: new Map(),
                skills: [],
                battles: 0,
                victories: 0,
                // ADD THESE DEFAULT VALUES:
                tonnage: 2500, // Default destroyer tonnage
                speedKnots: 35, // Default destroyer speed
                shipClass: 'Destroyer',
                armorThickness: {
                    belt: 25,
                    deck: 15,
                    turret: 10
                }
            };
            this.setGuildPlayerData(guildId, playerId, defaultStats);
            this.savePlayerData();
        }
        return this.getGuildPlayerData(guildId, playerId);
    }

    getPlayerShipClass(member) {
       const roles = member.roles.cache;
       if (roles.some(role => role.name.toLowerCase().includes('battleship'))) return 'Battleship';
       if (roles.some(role => role.name.toLowerCase().includes('carrier'))) return 'Aircraft Carrier';
       if (roles.some(role => role.name.toLowerCase().includes('cruiser'))) return 'Heavy Cruiser';
       if (roles.some(role => role.name.toLowerCase().includes('destroyer'))) return 'Destroyer';
       if (roles.some(role => role.name.toLowerCase().includes('submarine'))) return 'Submarine';
       if (roles.some(role => role.name.toLowerCase().includes('auxiliary'))) return 'Auxiliary';
       return 'Destroyer';
    }

    hasOPFORRole(member) {
        return member.roles.cache.some(role => {
            const roleName = role.name.toLowerCase();
            return roleName.includes('opfor') || 
                   roleName.includes('enemy') ||
                   roleName.includes('hostile') ||
                   roleName.includes('red team') ||
                   roleName.includes('opposition');
        });
    }

    getPlayerCharacter(guildId, playerId) {
        const playerEntry = this.getGuildPlayerData(guildId, playerId);
        if (!playerEntry || !playerEntry.activeCharacter || !playerEntry.characters) {
            return null;
        }
        return playerEntry.characters.get(playerEntry.activeCharacter);
    }

    async showEquipmentStats(interaction) {
        const itemName = interaction.options.getString('item');
        const playerData = this.getGuildPlayerData(interaction.guildId, interaction.user.id);

        if (!playerData) {
            return interaction.reply({
                content: '❌ No player data found!',
                flags: MessageFlags.Ephemeral
            });
        }
        
        let equipmentEmbed;
        
        if (itemName) {
            // Try to find equipment by partial name match
            const equipmentEntries = Array.from(playerData.equipmentLevels?.entries() || []);
            const foundEntry = equipmentEntries.find(([id, equipment]) => 
                equipment.name.toLowerCase().includes(itemName.toLowerCase()) ||
                id.toLowerCase().includes(itemName.toLowerCase())
            );
            
            if (foundEntry) {
                equipmentEmbed = this.levelingSystem.createEquipmentStatsEmbed(interaction.user.id, foundEntry[0]);
            } else {
                return interaction.reply({ 
                    content: `❌ Equipment "${itemName}" not found in your mastery data!`,
                    flags: MessageFlags.Ephemeral 
                });
            }
        } else {
            equipmentEmbed = this.levelingSystem.createEquipmentStatsEmbed(interaction.user.id);
        }
        
        if (!equipmentEmbed) {
            return interaction.reply({ 
                content: '❌ No equipment mastery data found!',
                flags: MessageFlags.Ephemeral 
            });
        }
        
        await interaction.reply({ embeds: [equipmentEmbed], flags: MessageFlags.Ephemeral });
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        SQUADRON & AIRCRAFT MANAGEMENT                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    needsSquadronSelection(character) {
        
        const isCarrier = character.shipClass === 'Aircraft Carrier' || character.shipClass === 'Light Aircraft Carrier';
        const hasAircraft = character.availableAircraft && character.availableAircraft.size > 0;
        
        
        return isCarrier && hasAircraft;
    }

    async showSquadronSelectionForBattle(interaction, playerId, channelId, character, characterName, isQRFScenario) {
        const squadronSize = this.playerCreation.getSquadronSize(character.shipClass);
        const maxSquadrons = this.playerCreation.calculateMaxSquadrons(character.tonnage, character.shipClass);

        // Initialize squadron selection tracking
        if (!this.tempSquadronSelection) {
            this.tempSquadronSelection = new Map();
        }

        this.tempSquadronSelection.set(playerId, {
            selections: [],
            currentSlot: 1,
            maxSlots: maxSquadrons,
            channelId: channelId,
            characterName: characterName,
            isQRFScenario: isQRFScenario
        });

        await this.showSquadronSelectionMenu(interaction, character, playerId, 1, maxSquadrons, squadronSize);
    }

    async showSquadronSelectionMenu(interaction, playerCharacter, playerId, currentSlot, maxSlots, squadronSize) {
        const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
        
        
        // Fix availableAircraft structure if needed
        if (playerCharacter.availableAircraft && !(playerCharacter.availableAircraft instanceof Map)) {
            const aircraftData = playerCharacter.availableAircraft;
            playerCharacter.availableAircraft = new Map();
            
            if (typeof aircraftData === 'object') {
                for (const [key, value] of Object.entries(aircraftData)) {
                    playerCharacter.availableAircraft.set(key, value);
                }
            }
        }
        
        // Build options from available aircraft
        const options = [];
        
        if (playerCharacter.availableAircraft && playerCharacter.availableAircraft.size > 0) {
            for (const [type, aircraft] of playerCharacter.availableAircraft.entries()) {
                
                // IMPROVED TYPE NAME MAPPING - handles both old and new formats
                const typeNames = {
                    // Standard formats (what the system expects)
                    'fighters': { name: 'Fighter Squadron', emoji: '✈️', description: 'Air superiority and escort' },
                    'dive_bombers': { name: 'Dive Bomber Squadron', emoji: '💣', description: 'Precision strikes on ships' },
                    'torpedo_bombers': { name: 'Torpedo Bomber Squadron', emoji: '🚀', description: 'Heavy ship attacks' },
                    'scout_planes': { name: 'Scout Squadron', emoji: '🔍', description: 'Reconnaissance and spotting' },

                    // Legacy formats (old system)
                    'fighter': { name: 'Fighter Squadron', emoji: '✈️', description: 'Air superiority and escort' },
                    'dive_bomber': { name: 'Dive Bomber Squadron', emoji: '💣', description: 'Precision strikes on ships' },
                    'torpedo_bomber': { name: 'Torpedo Bomber Squadron', emoji: '🚀', description: 'Heavy ship attacks' },
                    'scout': { name: 'Scout Squadron', emoji: '🔍', description: 'Reconnaissance and spotting' },

                    // NEW: Handle the types from your character data
                    'bomber': { name: 'Dive Bomber Squadron', emoji: '💣', description: 'Precision strikes on ships' },
                    'torpedo': { name: 'Torpedo Bomber Squadron', emoji: '🚀', description: 'Heavy ship attacks' },
                    
                    // Additional possible variations
                    'dive': { name: 'Dive Bomber Squadron', emoji: '💣', description: 'Precision strikes on ships' },
                    'torp': { name: 'Torpedo Bomber Squadron', emoji: '🚀', description: 'Heavy ship attacks' }
                };
                
                const typeInfo = typeNames[type] || {
                    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Squadron`,
                    emoji: '❓',
                    description: 'Unknown aircraft type'
                };
                
                // Create description with aircraft details
                let description = typeInfo.description;
                if (aircraft && typeof aircraft === 'object') {
                    if (aircraft.name) {
                        description = `${aircraft.name} - ${description}`;
                    }
                    if (aircraft.range && aircraft.damage) {
                        description += ` | Range: ${aircraft.range}, Damage: ${aircraft.damage}`;
                    }
                } else if (typeof aircraft === 'string') {
                    description = `${aircraft} - ${description}`;
                }

                options.push({
                    label: typeInfo.name,
                    description: description,
                    value: type,
                    emoji: typeInfo.emoji
                });
            }
        }
        
        // Fallback options if no aircraft data found
        if (options.length === 0) {
            
            const defaultOptions = [
                {
                    label: 'Fighter Squadron',
                    description: 'Air superiority fighters - Range: 10, Anti-aircraft specialist',
                    value: 'fighters',
                    emoji: '✈️'
                },
                {
                    label: 'Dive Bomber Squadron',
                    description: 'Dive bombers - Range: 8, Precision strikes on ships',
                    value: 'dive_bombers',
                    emoji: '💣'
                },
                {
                    label: 'Torpedo Bomber Squadron',
                    description: 'Torpedo bombers - Range: 6, Heavy damage vs ships',
                    value: 'torpedo_bombers',
                    emoji: '🚀'
                }
            ];
            
            options.push(...defaultOptions);
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_battle_squadron_${playerId}_${currentSlot}`)
            .setPlaceholder(`Choose squadron type for Slot ${currentSlot}`)
            .addOptions(options);
        
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        
        // Show current selections if any
        const selectionData = this.tempSquadronSelection.get(playerId);
        let currentSelections = '';
        if (selectionData && selectionData.selections.length > 0) {
            // UPDATED: Use the same type names mapping for display
            const typeNames = {
                'fighters': '✈️ Fighter Squadron',
                'dive_bombers': '💣 Dive Bomber Squadron',
                'torpedo_bombers': '🚀 Torpedo Bomber Squadron',
                'fighter': '✈️ Fighter Squadron',
                'dive_bomber': '💣 Dive Bomber Squadron',
                'torpedo_bomber': '🚀 Torpedo Bomber Squadron',
                // NEW: Add mappings for your character data types
                'bomber': '💣 Dive Bomber Squadron',
                'torpedo': '🚀 Torpedo Bomber Squadron'
            };
            
            currentSelections = selectionData.selections.map((type, index) => {
                const displayName = typeNames[type] || `${type} Squadron`;
                let aircraftInfo = '';
                
                // Try to get aircraft info
                if (playerCharacter.availableAircraft && playerCharacter.availableAircraft.has(type)) {
                    const aircraft = playerCharacter.availableAircraft.get(type);
                    if (aircraft && aircraft.name) {
                        aircraftInfo = ` (${aircraft.name})`;
                    }
                }
                
                return `**Slot ${index + 1}:** ${displayName}${aircraftInfo} - ${squadronSize} aircraft`;
            }).join('\n');
            currentSelections = `**Current Selections:**\n${currentSelections}\n\n`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🛩️ Squadron Selection - Slot ${currentSlot}/${maxSlots}`)
            .setDescription(`**Carrier:** ${playerCharacter.username} (${playerCharacter.shipClass})\n` +
                           `**Squadron Size:** ${squadronSize} aircraft each\n` +
                           `**Total Capacity:** ${maxSlots} squadrons (${maxSlots * squadronSize} aircraft)\n\n` +
                           currentSelections +
                           `**Select squadron type for Slot ${currentSlot}:**`)
            .setColor(0x0099FF)
            .setFooter({ text: 'Choose wisely - squadron selection affects your tactical options!' });
        
        if (interaction.replied) {
            await interaction.followUp({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
        }
    }

    async handleSquadronSelection(interaction) {
        const parts = interaction.customId.split('_');
        const playerId = parts[3];
        const currentSlot = parseInt(parts[4]);
        
        if (playerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your squadron selection!', flags: MessageFlags.Ephemeral });
        }
        
        const selectedType = interaction.values[0];
        const selectionData = this.tempSquadronSelection.get(playerId);
        
        if (!selectionData) {
            return interaction.reply({ content: '❌ Selection session expired. Please try joining the game again.', flags: MessageFlags.Ephemeral });
        }
        
        // Add selection
        selectionData.selections.push(selectedType);
        selectionData.currentSlot++;
        
        this.tempSquadronSelection.set(playerId, selectionData);

        const playerEntry = this.getGuildPlayerData(interaction.guildId, playerId);
        const activeCharacter = playerEntry.characters.get(selectionData.characterName);
        const squadronSize = this.playerCreation.getSquadronSize(activeCharacter.shipClass);
        
        if (selectionData.currentSlot <= selectionData.maxSlots) {
            // Continue to next slot
            await this.showSquadronSelectionMenu(
                interaction,
                activeCharacter,
                playerId,
                selectionData.currentSlot,
                selectionData.maxSlots,
                squadronSize,
            );
        } else {
            // All slots filled, finalize and join game
            await this.finalizeSquadronSelection(interaction, playerId, selectionData);
        }
    }

    async finalizeSquadronSelection(interaction, playerId, selectionData) {

        const playerEntry = this.getGuildPlayerData(interaction.guildId, playerId);
        const activeCharacter = playerEntry.characters.get(selectionData.characterName);
        const squadronSize = this.playerCreation.getSquadronSize(activeCharacter.shipClass);
        
        // Create active squadrons based on selections
        activeCharacter.activeSquadrons = new Map();
        
        selectionData.selections.forEach((selectedType, index) => {
            // HANDLE TYPE MAPPING when looking up aircraft data
            let aircraftDataKey = selectedType;
            
            // Map the selected type to the actual data key if needed
            const typeMappings = {
                'fighters': 'fighter',
                'dive_bombers': 'bomber',  // Map dive_bombers to bomber
                'torpedo_bombers': 'torpedo',  // Map torpedo_bombers to torpedo
                'fighter': 'fighter',  // Direct mapping
                'bomber': 'bomber',    // Direct mapping
                'torpedo': 'torpedo'   // Direct mapping
            };
            
            // Use mapping if it exists, otherwise use the original type
            if (typeMappings[selectedType]) {
                aircraftDataKey = typeMappings[selectedType];
            }
            
            
            const availableAircraft = activeCharacter.availableAircraft.get(aircraftDataKey);
            
            if (availableAircraft) {
                const squadron = {
                    name: `${availableAircraft.name} Squadron ${index + 1}`,
                    count: squadronSize,
                    maxCount: squadronSize,
                    range: availableAircraft.range,
                    damage: availableAircraft.damage,
                    quality: availableAircraft.quality,
                    specialAbility: availableAircraft.specialAbility,
                    fuel: 100,
                    readiness: 100,
                    aircraftType: selectedType  // Keep the selected type for consistency
                };

                activeCharacter.activeSquadrons.set(`squadron_${index + 1}`, squadron);
            } else {
                console.error(`❌ Aircraft type ${selectedType} (mapped to ${aircraftDataKey}) not found in availableAircraft`);
                console.error(`❌ Available aircraft keys:`, Array.from(activeCharacter.availableAircraft.keys()));
                
                // Fallback: create a basic squadron with default stats
                const fallbackSquadron = {
                    name: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Squadron ${index + 1}`,
                    count: squadronSize,
                    maxCount: squadronSize,
                    range: selectedType.includes('fighter') ? 10 : selectedType.includes('torpedo') ? 7 : 8,
                    damage: selectedType.includes('torpedo') ? 120 : selectedType.includes('bomber') ? 80 : 45,
                    quality: 'Standard',
                    specialAbility: selectedType.includes('fighter') ? 'fighter' : selectedType.includes('torpedo') ? 'torpedo' : 'bomb',
                    fuel: 100,
                    readiness: 100,
                    aircraftType: selectedType
                };
                
                activeCharacter.activeSquadrons.set(`squadron_${index + 1}`, fallbackSquadron);
            }
        });
                    
        // Save the updated data
        this.savePlayerData();
        
        // Show confirmation
        const totalAircraft = selectionData.selections.length * squadronSize;
        const squadronList = selectionData.selections.map((type, index) => {
            // Use the same mapping for display
            const displayMappings = {
                'fighters': '✈️ Fighter',
                'dive_bombers': '💣 Dive Bomber',
                'torpedo_bombers': '🚀 Torpedo Bomber',
                'fighter': '✈️ Fighter',
                'bomber': '💣 Dive Bomber',
                'torpedo': '🚀 Torpedo Bomber'
            };
            
            const displayName = displayMappings[type] || `${type} Squadron`;
            
            // Try to get aircraft name for display
            let aircraftName = '';
            const mappedKey = {
                'fighters': 'fighter',
                'dive_bombers': 'bomber',
                'torpedo_bombers': 'torpedo',
                'fighter': 'fighter',
                'bomber': 'bomber',
                'torpedo': 'torpedo'
            }[type] || type;
            
            const aircraftData = activeCharacter.availableAircraft.get(mappedKey);
            if (aircraftData && aircraftData.name) {
                aircraftName = ` (${aircraftData.name})`;
            }
            
            return `**Squadron ${index + 1}:** ${displayName}${aircraftName}`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Squadron Selection Complete!')
            .setDescription(`**Carrier:** ${activeCharacter.username}\n` +
                           `**Total Aircraft:** ${totalAircraft}\n\n` +
                           `**Selected Squadrons:**\n${squadronList}\n\n` +
                           `🎯 **Joining battle...**`)
            .setColor(0x00FF00);
        
        await interaction.update({ embeds: [embed], components: [] });
        
        // Rest of the method remains the same...
        const game = this.games.get(selectionData.channelId);
        
        try {
            // Get ship class and check OPFOR
            const shipClass = activeCharacter.shipClass || this.getPlayerShipClass(interaction.member);
            const isOPFOR = this.hasOPFORRole(interaction.member);

            if (isOPFOR) {
                // Join as OPFOR
                if (game.addOPFORPlayer(playerId, activeCharacter, shipClass, interaction.member)) {
                    await interaction.followUp({
                        content: `🔴 **OPFOR DEPLOYED!**\n<@${playerId}> joined as enemy ${shipClass} with **${selectionData.characterName}**!`
                    });
                    
                    await this.showOPFORSpawnSelection(interaction, game);
                } else {
                    await interaction.followUp({ content: '❌ Failed to join as OPFOR!', flags: MessageFlags.Ephemeral });
                }
            } else {
                
                // Join as normal player
                if (game.addPlayer(playerId, activeCharacter, shipClass, interaction.member)) {
                    if (selectionData.isQRFScenario) {
                        const timeWaiting = game.qrfWaitingStartTime ? Math.floor((Date.now() - game.qrfWaitingStartTime) / 1000) : 0;
                        
                        await interaction.followUp({
                            content: `🚁 **QRF REINFORCEMENT DEPLOYED!**\n<@${playerId}> has arrived as ${shipClass} **${selectionData.characterName}** backup!\n⏰ Arrived after ${timeWaiting} seconds of waiting.`
                        });
                        
                        await this.showSpawnSelection(interaction, game);
                        game.turnOrder.push(playerId);
                    } else {
                        
                        await interaction.followUp({ 
                            content: `🚢 <@${playerId}> joined as ${shipClass} **${selectionData.characterName}**!`
                            
                        });
                        
                        await this.showSpawnSelection(interaction, game);
                    }
                } else {
                    await interaction.followUp({ content: '❌ Failed to join - game might be full!', flags: MessageFlags.Ephemeral });
                }
            }
                            
            // Clean up temp data after successful join
            this.tempSquadronSelection.delete(playerId);
            
        } catch (error) {
            console.error('❌ Error joining game after squadron selection:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);

            await interaction.followUp({ 
                content: `❌ Error joining game: ${error.message}`,
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    fixCharacterDataStructure(character) {
        
        // Fix availableAircraft if it exists but isn't a Map
        if (character.availableAircraft && !(character.availableAircraft instanceof Map)) {
            const aircraftData = character.availableAircraft;
            character.availableAircraft = new Map();
            
            // Convert object back to Map
            if (typeof aircraftData === 'object') {
                for (const [key, value] of Object.entries(aircraftData)) {
                    // Ensure aircraft data has proper structure
                    let aircraftInfo = value;
                    if (typeof value === 'string') {
                        // If it's just a string, create a proper aircraft object
                        aircraftInfo = {
                            name: value,
                            range: 10, // Default range
                            damage: 50, // Default damage
                            quality: 'Standard',
                            specialAbility: 'None'
                        };
                    } else if (!value || typeof value !== 'object') {
                        // If invalid data, create default
                        aircraftInfo = {
                            name: `${key.charAt(0).toUpperCase() + key.slice(1)} Aircraft`,
                            range: 10,
                            damage: 50,
                            quality: 'Standard',
                            specialAbility: 'None'
                        };
                    }
                    
                    character.availableAircraft.set(key, aircraftInfo);
                }
            }
        }
        
        // Fix activeSquadrons if it exists but isn't a Map
        if (character.activeSquadrons && !(character.activeSquadrons instanceof Map)) {
            const squadronData = character.activeSquadrons;
            character.activeSquadrons = new Map();
            
            if (typeof squadronData === 'object') {
                for (const [key, value] of Object.entries(squadronData)) {
                    character.activeSquadrons.set(key, value);
                }
            }
        }
        
        // Debug output after fixing
        this.debugCharacterAircraftData(character);
        
        return character;
    }

    async createAircraftSquadron(player, aircraftType, aircraftData, character) {
        try {
            const squadronSize = this.carrierSystem.getSquadronSize(character.shipClass);
            
            // Check hangar space
            if (player.hangar < squadronSize) {
                return {
                    success: false,
                    error: `Not enough hangar space! Need ${squadronSize}, have ${player.hangar}`
                };
            }
            
            // Create squadron based on available aircraft data
            const squadron = {
                id: `${aircraftType}_${Date.now()}`, // Unique ID
                name: aircraftData.name,
                type: aircraftType,
                count: squadronSize,
                maxCount: squadronSize,
                range: aircraftData.range,
                damage: aircraftData.damage,
                specialAbility: aircraftData.specialAbility,
                quality: aircraftData.quality || 'Standard',
                fuel: 100,
                readiness: 100,
                actionPoints: 2, // Default action points
                ammunition: this.getAmmunitionCount(aircraftType),
                position: null, // Will be set when deployed
                ownerId: player.id
            };
            
            // Reduce hangar space
            player.hangar -= squadronSize;
            
            // Add to active squadrons
            if (!character.activeSquadrons) {
                character.activeSquadrons = new Map();
            }
            
            // Find next available squadron slot
            let squadronSlot = 1;
            while (character.activeSquadrons.has(`squadron_${squadronSlot}`)) {
                squadronSlot++;
            }
            
            character.activeSquadrons.set(`squadron_${squadronSlot}`, squadron);
            
            // Save data
            this.savePlayerData();
            
            
            return { 
                success: true,
                squadron: squadron,
                slotId: `squadron_${squadronSlot}`
            };
            
        } catch (error) {
            console.error('❌ Error in createAircraftSquadron:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    debugCharacterAircraftData(character) {
        if (character.availableAircraft) {
        }

        if (character.activeSquadrons) {
        }
    }

    getAmmunitionCount(aircraftType) {
        switch (aircraftType) {
            case 'fighters':
                return 3;
            case 'dive_bombers':
                return 2;
            case 'torpedo_bombers':
                return 1;
            default:
                return 2;
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 SPAWN SYSTEM                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async showSpawnSelection(interaction, game, page = 0) {
        // Defer the reply immediately since map generation takes time
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        // Get ALL spawn positions, not just available ones
        const allSpawns = this.getAllSpawnPositions(game);

        if (allSpawns.length === 0) {
            let content = '❌ No spawn positions found!';

            // Check if the map exists - if not, provide helpful guidance
            if (!game.map || game.map.size === 0) {
                content = '❌ Map not yet generated! Please wait for the Game Master to complete setup first, or contact them if this persists.';
            }

            if (interaction.deferred) {
                return interaction.editReply({ content });
            } else {
                return interaction.followUp({ content, flags: MessageFlags.Ephemeral });
            }
        }

        // Generate map with spawn zones highlighted
        const filepath = await this.createMapImage(game, allSpawns);
        if (!filepath) {
            return interaction.editReply({
                content: '❌ Failed to generate spawn selection map.'
            });
        }

        // Pagination settings
        const buttonsPerPage = 20;
        const totalPages = Math.ceil(allSpawns.length / buttonsPerPage);
        const startIndex = page * buttonsPerPage;
        const endIndex = Math.min(startIndex + buttonsPerPage, allSpawns.length);
        const spawnsForPage = allSpawns.slice(startIndex, endIndex);

        // Create spawn buttons - show ALL spawns but gray out taken ones
        const spawnButtons = spawnsForPage.map(spawn => {
            const occupiedBy = this.getPlayerAtPosition(game, spawn);

            if (occupiedBy) {
                const shipClass = GameUtils.getShipClassAbbreviation(occupiedBy.shipClass);
                return new ButtonBuilder()
                    .setCustomId(`spawn_select_${spawn}`)
                    .setLabel(`${spawn} (${shipClass})`)
                    .setStyle(ButtonStyle.Secondary) // Gray for taken
                    .setDisabled(true) // Disable taken spawns
            } else {
                return new ButtonBuilder()
                    .setCustomId(`spawn_select_${spawn}`)
                    .setLabel(spawn)
                    .setStyle(ButtonStyle.Primary) // Blue for available
            }
        });

        // Create navigation buttons (keep your existing nav logic)
        const navButtons = [];
        
        if (page > 0) {
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId(`spawn_prev_${page - 1}_${interaction.user.id}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        if (page < totalPages - 1) {
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId(`spawn_next_${page + 1}_${interaction.user.id}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        // Organize buttons into rows
        const actionRows = [];
        for (let i = 0; i < spawnButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(spawnButtons.slice(i, i + 5)));
        }
        
        if (navButtons.length > 0) {
            actionRows.push(new ActionRowBuilder().addComponents(navButtons));
        }

        // Update the embed description
        const availableCount = allSpawns.filter(spawn => !this.getPlayerAtPosition(game, spawn)).length;
        const takenCount = allSpawns.length - availableCount;

        const path = require('path');
        const filename = path.basename(filepath);

        const spawnEmbed = new EmbedBuilder()
            .setTitle('🏁 Choose Your Spawn Position - Visual Map')
            .setDescription(`**${interaction.user.username}** joined as **${this.getPlayerShipClass(interaction.member)}**!\n\n` +
                           `**Spawn positions:** ${availableCount} available, ${takenCount} taken\n` +
                           `📍 **White coordinates** on the map show available spawn positions\n` +
                           `Select where you want to deploy your ship using the buttons below.\n\n` +
                           `🟦 = Available spawn position\n` +
                           `🟥 = Taken by another player\n\n` +
                           `**Page ${page + 1} of ${totalPages}** (Showing ${startIndex + 1}-${endIndex} of ${allSpawns.length} positions)`)
            .addFields([
                {
                    name: 'Map Overview',
                    value: 'The attached map shows the battlefield layout and your spawn zone with white coordinate labels.',
                    inline: false
                }
            ])
            .setColor(0x00FF00);

        const messageOptions = {
            embeds: [spawnEmbed],
            components: actionRows,
            files: [{ attachment: filepath, name: filename }],
            flags: MessageFlags.Ephemeral
        };

        // Always use editReply since we defer at the start
        const replyMessage = await interaction.editReply(messageOptions);

        // Track this spawn selection message for future updates
        if (!game.spawnMessages) {
            game.spawnMessages = new Map();
        }
        game.spawnMessages.set(interaction.user.id, replyMessage.id);

        // Clean up file after a delay
        setTimeout(() => {
            const fs = require('fs');
            try {
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (error) {
                // Ignore cleanup errors
            }
        }, 30000);
    }

    // ADD this new method to get ALL spawns instead of just available ones:
    getAllSpawnPositions(game) {
        const spawns = [];

        // Ensure game map exists - but DON'T regenerate it during Get Map operations
        if (!game.map || game.map.size === 0) {
            console.log('Warning: game.map is undefined or empty, returning empty spawn list');
            return spawns; // Return empty array if no map exists
        }

        for (const [coord, cell] of game.map.entries()) {
            if (cell.type === 'spawn') {
                spawns.push(coord);
            }
        }
        return spawns.sort(); // Sort alphabetically
    }    
    async handleSpawnNavigation(interaction, game) {
        const parts = interaction.customId.split('_');
        const direction = parts[1]; // 'next' or 'prev'
        const newPage = parseInt(parts[2]);
        const userId = parts[3];

        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your spawn navigation!', flags: MessageFlags.Ephemeral });
        }

        // Update only the buttons without regenerating the map
        await this.updateSpawnSelectionButtons(interaction, game, newPage);
    }

    async updateSpawnSelectionButtons(interaction, game, page = 0) {
        // Get ALL spawn positions, not just available ones
        const allSpawns = this.getAllSpawnPositions(game);

        if (allSpawns.length === 0) {
            return interaction.update({
                content: '❌ No spawn positions found!',
                components: []
            });
        }

        // Pagination settings
        const buttonsPerPage = 20;
        const totalPages = Math.ceil(allSpawns.length / buttonsPerPage);
        const startIndex = page * buttonsPerPage;
        const endIndex = Math.min(startIndex + buttonsPerPage, allSpawns.length);
        const spawnsForPage = allSpawns.slice(startIndex, endIndex);

        // Create spawn buttons - show ALL spawns but gray out taken ones
        const spawnButtons = spawnsForPage.map(spawn => {
            const occupiedBy = this.getPlayerAtPosition(game, spawn);

            if (occupiedBy) {
                const shipClass = GameUtils.getShipClassAbbreviation(occupiedBy.shipClass);
                return new ButtonBuilder()
                    .setCustomId(`spawn_select_${spawn}`)
                    .setLabel(`${spawn} (${shipClass})`)
                    .setStyle(ButtonStyle.Secondary) // Gray for taken
                    .setDisabled(true) // Disable taken spawns
            } else {
                return new ButtonBuilder()
                    .setCustomId(`spawn_select_${spawn}`)
                    .setLabel(spawn)
                    .setStyle(ButtonStyle.Primary) // Blue for available
            }
        });

        // Create navigation buttons
        const navButtons = [];

        if (page > 0) {
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId(`spawn_prev_${page - 1}_${interaction.user.id}`)
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (page < totalPages - 1) {
            navButtons.push(
                new ButtonBuilder()
                    .setCustomId(`spawn_next_${page + 1}_${interaction.user.id}`)
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        // Organize buttons into rows
        const actionRows = [];
        for (let i = 0; i < spawnButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(spawnButtons.slice(i, i + 5)));
        }

        if (navButtons.length > 0) {
            actionRows.push(new ActionRowBuilder().addComponents(navButtons));
        }

        // Update the embed description with new page info
        const availableCount = allSpawns.filter(spawn => !this.getPlayerAtPosition(game, spawn)).length;
        const takenCount = allSpawns.length - availableCount;

        const updatedEmbed = new EmbedBuilder()
            .setTitle('🏁 Choose Your Spawn Position - Visual Map')
            .setDescription(`**${interaction.user.username}** joined as **${this.getPlayerShipClass(interaction.member)}**!\n\n` +
                           `**Spawn positions:** ${availableCount} available, ${takenCount} taken\n` +
                           `📍 **White coordinates** on the map show available spawn positions\n` +
                           `Select where you want to deploy your ship using the buttons below.\n\n` +
                           `🟦 = Available spawn position\n` +
                           `🟥 = Taken by another player\n\n` +
                           `**Page ${page + 1} of ${totalPages}** (Showing ${startIndex + 1}-${endIndex} of ${allSpawns.length} positions)`)
            .addFields([
                {
                    name: 'Map Overview',
                    value: 'The attached map shows the battlefield layout and your spawn zone with white coordinate labels.',
                    inline: false
                }
            ])
            .setColor(0x00FF00);

        // Update only the embed and components, keep the existing files
        await interaction.update({
            embeds: [updatedEmbed],
            components: actionRows
        });
    }

    getAvailableSpawnPositions(game) {
        const availableSpawns = [];
        
        // Find the actual spawn zone by checking the map
        for (let x = 0; x < 100; x++) {
            for (let y = 1; y <= 100; y++) {
                const coord = game.generateExtendedCoordinate(x, y);
                const cell = game.getMapCell(coord);
                
                // Only check cells that are actually marked as spawn type
                if (cell && cell.type === 'spawn' && !cell.occupant) {
                    // Double check no player is already there
                    let occupied = false;
                    for (const player of game.players.values()) {
                        if (player.position === coord) {
                            occupied = true;
                            break;
                        }
                    }
                    
                    if (!occupied) {
                        availableSpawns.push(coord);
                    }
                }
            }
        }
        
        // If no spawn cells found, fall back to ocean cells in the left area (updated size)
        if (availableSpawns.length === 0) {
            for (let x = 0; x < 3; x++) { // Changed from 8 to 3
                for (let y = 35; y <= 45; y++) { // Changed from 35-65 to 35-45 (10 cells)
                    const coord = game.generateExtendedCoordinate(x, y);
                    const cell = game.getMapCell(coord);
                    
                    if (cell && cell.type === 'ocean' && !cell.occupant) {
                        let occupied = false;
                        for (const player of game.players.values()) {
                            if (player.position === coord) {
                                occupied = true;
                                break;
                            }
                        }
                        
                        if (!occupied) {
                            availableSpawns.push(coord);
                        }
                    }
                }
            }
        }
        
        return availableSpawns.sort(); // Sort alphabetically
    }

    async handleSpawnSelection(interaction, game) {
        const selectedSpawn = interaction.customId.replace('spawn_select_', '');
        const playerId = interaction.user.id;
        
        const player = game.players.get(playerId);
        if (!player) {
            return interaction.reply({ 
                content: '❌ You are not in this game! Use `/join` first.',
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // Check if spawn is taken by someone else
        const currentOccupant = this.getPlayerAtPosition(game, selectedSpawn);
        if (currentOccupant && currentOccupant.id !== playerId) {
            return interaction.reply({ 
                content: `❌ Spawn **${selectedSpawn}** is taken by **${currentOccupant.username}**!`,
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // If player is selecting the same spawn they already have
        if (player.position === selectedSpawn) {
            return interaction.reply({ 
                content: `✅ You already have spawn **${selectedSpawn}** selected!`,
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // Clear player's old spawn
        if (player.position && player.position !== 'pending') {
            const oldCell = game.getMapCell(player.position);
            if (oldCell) {
                oldCell.occupant = null;
            }
        }
        
        // Set new spawn
        player.position = selectedSpawn;
        // Set default direction based on spawn side (face toward opposite side +-90°)
        if (player.direction === undefined) {
            player.direction = GameUtils.getSpawnFacingDirection(game.spawnSide || 'left');
        }
        const newCell = game.getMapCell(selectedSpawn);
        if (newCell) {
            newCell.occupant = 'player';
        }
        
        await interaction.reply({ 
            content: `✅ Spawn position set to **${selectedSpawn}**!`,
            flags: MessageFlags.Ephemeral 
        });
        
        // Update ALL existing spawn selection messages for all players
        console.log(`🔄 Player ${player.username} selected spawn ${selectedSpawn}, refreshing all spawn messages...`);
        await this.refreshAllSpawnMessages(game, interaction.channel);
    }

    getPlayerAtPosition(game, position) {
        return Array.from(game.players.values()).find(p => p.position === position);
    }

    async refreshAllSpawnMessages(game, channel) {
        // We need to track spawn selection messages in the game object
        if (!game.spawnMessages) {
            game.spawnMessages = new Map(); // userId -> messageId
        }

        console.log(`🔄 Refreshing ${game.spawnMessages.size} spawn messages...`);

        // Update all tracked spawn messages
        for (const [userId, messageId] of game.spawnMessages.entries()) {
            try {
                // Try to fetch the message
                let message;
                try {
                    message = await channel.messages.fetch(messageId);
                } catch (fetchError) {
                    // Message doesn't exist (deleted, too old, etc.)
                    console.log(`Spawn message ${messageId} for user ${userId} no longer exists, removing from tracking`);
                    game.spawnMessages.delete(userId);
                    continue;
                }

                if (message && message.interaction && message.interaction.user.id === userId) {
                    // Get the player data from the game
                    const player = game.players.get(userId);
                    if (!player) {
                        console.warn(`Player ${userId} not found in game, skipping spawn message update`);
                        game.spawnMessages.delete(userId);
                        continue;
                    }

                    // Generate updated map with current spawn states
                    const allSpawns = this.getAllSpawnPositions(game);
                    if (allSpawns.length > 0) {
                        const filepath = await this.createMapImage(game, allSpawns);
                        if (filepath) {
                            const path = require('path');
                            const filename = path.basename(filepath);

                            // Determine which page this user was on (default to 0)
                            const buttonsPerPage = 20;
                            const page = 0; // Start with first page
                            const totalPages = Math.ceil(allSpawns.length / buttonsPerPage);
                            const startIndex = page * buttonsPerPage;
                            const endIndex = Math.min(startIndex + buttonsPerPage, allSpawns.length);
                            const spawnsForPage = allSpawns.slice(startIndex, endIndex);

                            // Create updated spawn buttons
                            const spawnButtons = spawnsForPage.map(spawn => {
                                const occupiedBy = this.getPlayerAtPosition(game, spawn);
                                console.log(`🔘 Spawn ${spawn}: occupied by ${occupiedBy ? occupiedBy.username : 'none'}`);

                                if (occupiedBy) {
                                    const shipClass = GameUtils.getShipClassAbbreviation(occupiedBy.shipClass);
                                    console.log(`🔘 Making ${spawn} button grey with class ${shipClass}`);
                                    return new ButtonBuilder()
                                        .setCustomId(`spawn_select_${spawn}`)
                                        .setLabel(`${spawn} (${shipClass})`)
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                } else {
                                    return new ButtonBuilder()
                                        .setCustomId(`spawn_select_${spawn}`)
                                        .setLabel(spawn)
                                        .setStyle(ButtonStyle.Primary)
                                }
                            });

                            // Create navigation buttons
                            const navButtons = [];
                            if (page > 0) {
                                navButtons.push(
                                    new ButtonBuilder()
                                        .setCustomId(`spawn_prev_${page - 1}_${userId}`)
                                        .setLabel('◀ Previous')
                                        .setStyle(ButtonStyle.Secondary)
                                );
                            }
                            if (page < totalPages - 1) {
                                navButtons.push(
                                    new ButtonBuilder()
                                        .setCustomId(`spawn_next_${page + 1}_${userId}`)
                                        .setLabel('Next ▶')
                                        .setStyle(ButtonStyle.Secondary)
                                );
                            }

                            // Organize buttons into rows
                            const actionRows = [];
                            for (let i = 0; i < spawnButtons.length; i += 5) {
                                actionRows.push(new ActionRowBuilder().addComponents(spawnButtons.slice(i, i + 5)));
                            }
                            if (navButtons.length > 0) {
                                actionRows.push(new ActionRowBuilder().addComponents(navButtons));
                            }

                            // Create updated embed
                            const availableCount = allSpawns.filter(spawn => !this.getPlayerAtPosition(game, spawn)).length;
                            const takenCount = allSpawns.length - availableCount;

                            const updatedEmbed = new EmbedBuilder()
                                .setTitle('🏁 Choose Your Spawn Position - Visual Map')
                                .setDescription(`**${player.username || player.displayName}** joined as **${player.shipClass}**!\n\n` +
                                               `**Spawn positions:** ${availableCount} available, ${takenCount} taken\n` +
                                               `📍 **White coordinates** on the map show available spawn positions\n` +
                                               `Select where you want to deploy your ship using the buttons below.\n\n` +
                                               `🟦 = Available spawn position\n` +
                                               `🟥 = Taken by another player\n\n` +
                                               `**Page ${page + 1} of ${totalPages}** (Showing ${startIndex + 1}-${endIndex} of ${allSpawns.length} positions)`)
                                .addFields([
                                    {
                                        name: 'Map Overview',
                                        value: 'The attached map shows the battlefield layout and your spawn zone with white coordinate labels.',
                                        inline: false
                                    }
                                ])
                                .setColor(0x00FF00);

                            // Update the message
                            try {
                                await message.edit({
                                    embeds: [updatedEmbed],
                                    components: actionRows,
                                    files: [{ attachment: filepath, name: filename }]
                                });
                            } catch (editError) {
                                // Handle message edit errors (message deleted, no permissions, etc.)
                                if (editError.code === 10008) {
                                    console.log(`Spawn message ${messageId} for user ${userId} was deleted, removing from tracking`);
                                    game.spawnMessages.delete(userId);
                                } else {
                                    console.error(`Failed to edit spawn message for user ${userId}:`, editError);
                                }
                                continue;
                            }

                            // Clean up new file
                            setTimeout(() => {
                                const fs = require('fs');
                                try {
                                    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
                                } catch (error) {
                                    // Ignore cleanup errors
                                }
                            }, 30000);
                        }
                    }
                } else {
                    // Message exists but doesn't match expected format
                    console.log(`Spawn message ${messageId} for user ${userId} is invalid format, removing from tracking`);
                    game.spawnMessages.delete(userId);
                }
            } catch (error) {
                // Catch any other unexpected errors
                console.error(`Unexpected error updating spawn message for user ${userId}:`, error);
                game.spawnMessages.delete(userId);
            }
        }
    }

    async showOPFORSpawnSelection(interaction, game) {
        const availableSpawns = this.getAvailableOPFORSpawnPositions(game);
        
        if (availableSpawns.length === 0) {
            return interaction.reply({ content: '❌ No OPFOR spawn positions available!', flags: MessageFlags.Ephemeral });
        }

        const spawnButtons = [];
        const maxButtons = Math.min(availableSpawns.length, 25);
        
        for (let i = 0; i < maxButtons; i++) {
            const spawn = availableSpawns[i];
            spawnButtons.push(
                new ButtonBuilder()
                    .setCustomId(`opfor_spawn_select_${spawn}_${interaction.user.id}`)
                    .setLabel(spawn)
                    .setStyle(ButtonStyle.Danger) // Red buttons for OPFOR
            );
        }

        const actionRows = [];
        for (let i = 0; i < spawnButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(spawnButtons.slice(i, i + 5)));
        }

        const spawnEmbed = new EmbedBuilder()
            .setTitle('🔴 Choose OPFOR Spawn Position')
            .setDescription(`**${interaction.user.username}** joined as **OPFOR ${this.getPlayerShipClass(interaction.member)}**!\n\n` +
                           `**Available enemy spawn positions:**\n` +
                           `Select where you want to deploy your ship.\n\n` +
                           `🟥 = Available OPFOR spawn\n` +
                           `⬛ = Occupied position`)
            .addFields([
                {
                    name: 'OPFOR Spawn Zone Info',
                    value: 'OPFOR spawn zone is located on the right side of the map (columns 70-99)',
                    inline: false
                }
            ])
            .setColor(0xFF0000);

        await interaction.reply({ 
            embeds: [spawnEmbed],
            components: actionRows,
            flags: MessageFlags.Ephemeral 
        });
    }

    getAvailableOPFORSpawnPositions(game) {
        const availableSpawns = [];
        
        // OPFOR spawns on right side of map (columns 70-99)
        for (let x = 70; x < 100; x++) {
            for (let y = 1; y <= 100; y++) {
                const coord = game.generateExtendedCoordinate(x, y);
                const cell = game.getMapCell(coord);
                
                if (cell && (cell.type === 'ocean' || cell.type === 'reef') && !cell.occupant) {
                    let occupied = false;
                    // Check both players and enemies
                    for (const player of game.players.values()) {
                        if (player.position === coord) {
                            occupied = true;
                            break;
                        }
                    }
                    for (const enemy of game.enemies.values()) {
                        if (enemy.position === coord) {
                            occupied = true;
                            break;
                        }
                    }
                    
                    if (!occupied) {
                        availableSpawns.push(coord);
                    }
                }
            }
        }
        
        return availableSpawns.sort();
    }

    async handleOPFORSpawnSelection(interaction, game) {
        const parts = interaction.customId.split('_');
        const selectedSpawn = parts[3]; // opfor_spawn_select_CV50_userId
        const userId = parts[4];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your spawn selection!', flags: MessageFlags.Ephemeral });
        }
        
        const opforPlayer = game.enemies.get(interaction.user.id);
        if (!opforPlayer || !opforPlayer.isOPFOR) {
            return interaction.reply({ content: '❌ You are not an OPFOR player!', flags: MessageFlags.Ephemeral });
        }
        
        // Check if spawn position is still available
        const cell = game.getMapCell(selectedSpawn);
        if (!cell || cell.occupant) {
            return interaction.reply({ content: '❌ That spawn position is no longer available!', flags: MessageFlags.Ephemeral });
        }
        
        // Set OPFOR player position
        opforPlayer.position = selectedSpawn;
        // Set default direction based on spawn side (face toward opposite side +-90°)
        if (opforPlayer.direction === undefined) {
            opforPlayer.direction = GameUtils.getSpawnFacingDirection(game.oppositeSide || 'right');
        }
        cell.occupant = 'opfor';
        
        const embed = new EmbedBuilder()
            .setTitle('✅ OPFOR Deployment Successful!')
            .setDescription(`**OPFOR ${opforPlayer.shipClass}** deployed at **${selectedSpawn}**!\n\n` +
                           `Ready for hostile operations!`)
            .setColor(0xFF0000);
        
        // Reply with the embed first
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        
        // Then send follow-up public message
        await interaction.followUp({ 
            content: `🔴 <@${interaction.user.id}> deployed OPFOR ${opforPlayer.shipClass} at **${selectedSpawn}**!`
            
        });
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 SPAWN COMMAND                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    // Replace your existing spawnAI method
    async spawnAI(interaction) {
        const game = this.games.get(interaction.channelId);
        
        // Verify GM permissions
        if (!game || game.gmId !== interaction.user.id) {
            return interaction.reply({ 
                content: '❌ Only the GM can spawn AI units!',
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // Check if battle is active
        if (game.phase !== 'battle') {
            return interaction.reply({ 
                content: '❌ Can only spawn AI during an active battle!',
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // Prevent too many AI spawns
        if (game.enemies.size >= 20) {
            return interaction.reply({ 
                content: `❌ Cannot spawn more AI - maximum of 20 total AI units reached!`,
                flags: MessageFlags.Ephemeral 
            });
        }
        
        await this.showEnhancedSpawnTypeSelection(interaction, game);
    }

    // New enhanced spawn type selection
    async showEnhancedSpawnTypeSelection(interaction, game) {
        const shipTypeButtons = [
            new ButtonBuilder()
                .setCustomId(`gm_spawn_single_${interaction.user.id}`)
                .setLabel('🚢 Single Ship Spawn')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`gm_spawn_batch_${interaction.user.id}`)
                .setLabel('⚓ Batch Spawn (Custom Amounts)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`gm_spawn_boss_${interaction.user.id}`)
                .setLabel('👹 BOSS ENEMY')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`gm_spawn_cancel_${interaction.user.id}`)
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        ];
        
        const actionRow = new ActionRowBuilder().addComponents(shipTypeButtons);
        
        const embed = new EmbedBuilder()
            .setTitle('🤖 GM Spawn Menu')
            .setDescription(`**Select spawn type:**\n\n` +
                           `**Current AI Forces:** ${game.enemies.size}/20\n` +
                           `**Active Players:** ${Array.from(game.players.values()).filter(p => p.alive).length}\n\n` +
                           `Choose how you want to spawn AI units:`)
            .addFields([
                {
                    name: '🚢 Single Ship Spawn',
                    value: '• Spawn one ship at a time\n• Choose type, quantity, and location\n• Same as current system',
                    inline: true
                },
                {
                    name: '⚓ Batch Spawn',
                    value: '• Spawn multiple ship types at once\n• Specify exact quantities per type\n• Example: 2 destroyers, 3 cruisers, 1 battleship',
                    inline: true
                },
                {
                    name: '👹 Boss Enemy',
                    value: '• Spawn a single powerful boss\n• High health and enhanced abilities\n• Major threat to players',
                    inline: false
                }
            ])
            .setColor(0xFF6600)
            .setFooter({ text: 'GM Spawn System - Enhanced with batch spawning' });
        
        await interaction.reply({ 
            embeds: [embed],
            components: [actionRow],
            flags: MessageFlags.Ephemeral 
        });
    }

    // Enhanced spawn modal for batch spawning
    async showBatchSpawnModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(`batch_spawn_${interaction.user.id}`)
            .setTitle('Batch Spawn - Custom Quantities');

        // Destroyers input
        const destroyersInput = new TextInputBuilder()
            .setCustomId('destroyers')
            .setLabel('Destroyers (0-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('2')
            .setRequired(false)
            .setMaxLength(2);

        // Cruisers input
        const cruisersInput = new TextInputBuilder()
            .setCustomId('cruisers')
            .setLabel('Cruisers (Light + Heavy) (0-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('3')
            .setRequired(false)
            .setMaxLength(2);

        // Battleships input
        const battleshipsInput = new TextInputBuilder()
            .setCustomId('battleships')
            .setLabel('Battleships (0-5)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setRequired(false)
            .setMaxLength(2);

        // Carriers input
        const carriersInput = new TextInputBuilder()
            .setCustomId('carriers')
            .setLabel('Aircraft Carriers (0-5)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setRequired(false)
            .setMaxLength(2);

        // Submarines input
        const submarinesInput = new TextInputBuilder()
            .setCustomId('submarines')
            .setLabel('Submarines (0-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setRequired(false)
            .setMaxLength(2);

        const firstRow = new ActionRowBuilder().addComponents(destroyersInput);
        const secondRow = new ActionRowBuilder().addComponents(cruisersInput);
        const thirdRow = new ActionRowBuilder().addComponents(battleshipsInput);
        const fourthRow = new ActionRowBuilder().addComponents(carriersInput);
        const fifthRow = new ActionRowBuilder().addComponents(submarinesInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    // Handle batch spawn modal submission
    async handleBatchSpawnSubmit(interaction) {
        try {
            const userId = interaction.customId.split('_')[2];
            
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your spawn form!', flags: MessageFlags.Ephemeral });
            }

            const game = this.games.get(interaction.channelId);
            if (!game || game.gmId !== interaction.user.id) {
                return interaction.reply({ content: '❌ Only the GM can spawn AI!', flags: MessageFlags.Ephemeral });
            }

            // Parse quantities from modal inputs
            const destroyers = parseInt(interaction.fields.getTextInputValue('destroyers') || '0');
            const cruisers = parseInt(interaction.fields.getTextInputValue('cruisers') || '0');
            const battleships = parseInt(interaction.fields.getTextInputValue('battleships') || '0');
            const carriers = parseInt(interaction.fields.getTextInputValue('carriers') || '0');
            const submarines = parseInt(interaction.fields.getTextInputValue('submarines') || '0');

            // Validate inputs
            const maxPerType = { destroyers: 10, cruisers: 10, battleships: 5, carriers: 5, submarines: 10 };
            const quantities = { destroyers, cruisers, battleships, carriers, submarines };
            
            for (const [type, quantity] of Object.entries(quantities)) {
                if (isNaN(quantity) || quantity < 0 || quantity > maxPerType[type]) {
                    return interaction.reply({ 
                        content: `❌ Invalid quantity for ${type}: ${quantity}. Must be 0-${maxPerType[type]}!`,
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            const totalToSpawn = destroyers + cruisers + battleships + carriers + submarines;
            
            if (totalToSpawn === 0) {
                return interaction.reply({ 
                    content: '❌ No ships specified! Enter quantities for at least one ship type.',
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (game.enemies.size + totalToSpawn > 20) {
                return interaction.reply({ 
                    content: `❌ Cannot spawn ${totalToSpawn} ships! Would exceed maximum of 20 AI units (currently: ${game.enemies.size}).`,
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Store batch spawn data and show location selection
            if (!game.tempSpawnData) game.tempSpawnData = new Map();
            game.tempSpawnData.set(userId, { 
                type: 'batch',
                quantities: quantities,
                totalCount: totalToSpawn
            });

            await this.showBatchSpawnLocationSelection(interaction, game, quantities, totalToSpawn);

        } catch (error) {
            console.error('❌ Error in handleBatchSpawnSubmit:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing batch spawn!',
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    // Show location selection for batch spawn
    async showBatchSpawnLocationSelection(interaction, game, quantities, totalCount) {
        const locationButtons = [
            new ButtonBuilder()
                .setCustomId(`batch_spawn_loc_enemy_side_${interaction.user.id}`)
                .setLabel('🔴 Enemy Side (Right)')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`batch_spawn_loc_player_side_${interaction.user.id}`)
                .setLabel('🔵 Player Side (Left)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`batch_spawn_loc_north_${interaction.user.id}`)
                .setLabel('⬆️ Northern Waters')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`batch_spawn_loc_south_${interaction.user.id}`)
                .setLabel('⬇️ Southern Waters')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`batch_spawn_loc_center_${interaction.user.id}`)
                .setLabel('🎯 Central Area')
                .setStyle(ButtonStyle.Secondary)
        ];
        
        const locationButtons2 = [
            new ButtonBuilder()
                .setCustomId(`batch_spawn_loc_random_${interaction.user.id}`)
                .setLabel('🎲 Random Locations')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`batch_spawn_back_${interaction.user.id}`)
                .setLabel('🔙 Back to Quantities')
                .setStyle(ButtonStyle.Secondary)
        ];
        
        const actionRow1 = new ActionRowBuilder().addComponents(locationButtons);
        const actionRow2 = new ActionRowBuilder().addComponents(locationButtons2);
        
        // Create summary of what will be spawned
        const spawnSummary = [];
        if (quantities.destroyers > 0) spawnSummary.push(`${quantities.destroyers}x Destroyers`);
        if (quantities.cruisers > 0) spawnSummary.push(`${quantities.cruisers}x Cruisers`);
        if (quantities.battleships > 0) spawnSummary.push(`${quantities.battleships}x Battleships`);
        if (quantities.carriers > 0) spawnSummary.push(`${quantities.carriers}x Aircraft Carriers`);
        if (quantities.submarines > 0) spawnSummary.push(`${quantities.submarines}x Submarines`);
        
        const embed = new EmbedBuilder()
            .setTitle(`📍 Batch Spawn - Select Location`)
            .setDescription(`**Spawning ${totalCount} AI units:**\n` +
                           `${spawnSummary.join(', ')}\n\n` +
                           `**Choose deployment location:**\n\n` +
                           `🔴 **Enemy Side** - Traditional AI spawn area (right side)\n` +
                           `🔵 **Player Side** - Behind player lines (ambush scenario!)\n` +
                           `⬆️ **North** - Top of the battlefield\n` +
                           `⬇️ **South** - Bottom of the battlefield\n` +
                           `🎯 **Center** - Middle of the action\n` +
                           `🎲 **Random** - Spread ships across multiple areas\n\n` +
                           `⚠️ **All ${totalCount} units** will be deployed in the selected area`)
            .setColor(0xFF9900)
            .setFooter({ text: 'GM Spawn System - Batch deployment location selection' });
        
        await interaction.update({ 
            embeds: [embed],
            components: [actionRow1, actionRow2] 
        });
    }

    // Execute batch spawn
    async executeBatchSpawn(interaction, game, location) {
        const userId = interaction.user.id;
        const spawnData = game.tempSpawnData?.get(userId);
        
        if (!spawnData || spawnData.type !== 'batch') {
            return interaction.update({ 
                content: '❌ Batch spawn data expired. Please try again.',
                embeds: [],
                components: [] 
            });
        }
        
        const quantities = spawnData.quantities;
        const totalCount = spawnData.totalCount;
        
        await interaction.update({
            content: `🔄 **Batch spawning ${totalCount} AI units...**\n` +
                    `📊 **Breakdown:** ${quantities.destroyers}DD, ${quantities.cruisers}CA/CL, ${quantities.battleships}BB, ${quantities.carriers}CV, ${quantities.submarines}SS`,
            embeds: [],
            components: []
        });
        
        const spawnedUnits = [];
        let totalSpawned = 0;
        
        // Spawn ships by type
        const spawnTypes = [
            { type: 'destroyer', count: quantities.destroyers },
            { type: 'cruiser', count: quantities.cruisers },
            { type: 'battleship', count: quantities.battleships },
            { type: 'carrier', count: quantities.carriers },
            { type: 'submarine', count: quantities.submarines }
        ];
        
        for (const { type, count } of spawnTypes) {
            for (let i = 0; i < count; i++) {
                let newAI;
                
                if (type === 'cruiser') {
                    // Randomly choose between light and heavy cruiser
                    const cruiserType = Math.random() < 0.5 ? 'light_cruiser' : 'cruiser';
                    newAI = this.spawnSpecificAI(game, cruiserType);
                } else {
                    newAI = this.spawnSpecificAI(game, type);
                }
                
                if (newAI) {
                    // Set spawn location
                    const spawnPosition = GameUtils.getSpawnLocation(game, location);
                    if (spawnPosition) {
                        // Clear old position
                        const oldCell = game.getMapCell(newAI.position);
                        if (oldCell) oldCell.occupant = null;
                        
                        // Set new position
                        newAI.position = spawnPosition;
                        // Set default direction based on AI spawn side (face toward player side +-90°)
                        if (newAI.direction === undefined) {
                            newAI.direction = GameUtils.getSpawnFacingDirection(game.oppositeSide || 'right');
                        }
                        const newCell = game.getMapCell(spawnPosition);
                        if (newCell) newCell.occupant = 'ai';
                    }
                    
                    // Set up carrier aircraft if needed
                    if (this.isAICarrierType(newAI)) {
                        this.setupAICarrierAircraft(newAI, game);
                    }
                    
                    spawnedUnits.push({
                        name: GameUtils.getAIDisplayName(newAI),
                        type: type,
                        position: newAI.position
                    });
                    totalSpawned++;
                }
                
                // Small delay between spawns to prevent position conflicts
                if (i < count - 1 || spawnTypes.indexOf({ type, count }) < spawnTypes.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        }
        
        if (totalSpawned > 0) {
            const locationName = GameUtils.getLocationDisplayName(location);
            
            // Update GM with summary
            await interaction.editReply({ 
                content: `✅ **Batch spawn complete!** ${totalSpawned}/${totalCount} units deployed in ${locationName}` 
            });
            
            // Create detailed spawn report
            const spawnReport = spawnedUnits.reduce((acc, unit) => {
                if (!acc[unit.type]) acc[unit.type] = [];
                acc[unit.type].push(`${unit.name} at ${unit.position}`);
                return acc;
            }, {});
            
            let reportText = '';
            for (const [type, units] of Object.entries(spawnReport)) {
                const typeDisplayName = GameUtils.getShipDisplayName(type);
                reportText += `**${typeDisplayName}s (${units.length}):**\n${units.map(u => `• ${u}`).join('\n')}\n\n`;
            }
            
            // Alert all players with categorized list
            const alertEmbed = new EmbedBuilder()
                .setTitle(`🚨 MASSIVE FLEET DEPLOYMENT! (${totalSpawned} units)`)
                .setDescription(`**FLEET ALERT**: Large enemy force detected!\n\n${reportText}` +
                               `**Location:** ${locationName}\n` +
                               `**Total New Threats:** ${totalSpawned} ships\n` +
                               `**Threat Assessment:** EXTREME`)
                .setColor(0xFF0000)
                .setTimestamp();
            
            await interaction.followUp({ 
                content: `📡 **FLEET COMMAND - MASSIVE CONTACT DETECTED!**`,
                embeds: [alertEmbed]
                
            });
            
            // Update the map display
            await this.updateGameDisplay(game, interaction.channel);
            
            // Clean up temp data
            game.tempSpawnData.delete(userId);
            
        } else {
            await interaction.editReply({ 
                content: `❌ Batch spawn failed! Could not deploy any of the ${totalCount} requested units.` 
            });
        }
    }

    async handleGMSpawn(interaction) {
        const parts = interaction.customId.split('_');
        const action = parts[2]; // spawn type, qty, loc, etc.
        const userId = parts[parts.length - 1];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your spawn menu!', flags: MessageFlags.Ephemeral });
        }
        
        const game = this.games.get(interaction.channelId);
        if (!game || game.gmId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Only the GM can spawn AI!', flags: MessageFlags.Ephemeral });
        }
        
        if (action === 'cancel') {
            return interaction.update({ 
                content: '❌ Spawn cancelled.',
                embeds: [],
                components: [] 
            });
        }
        
        // Handle new batch spawn option
        if (action === 'batch') {
            return await this.showBatchSpawnModal(interaction);
        }
        
        // Handle single ship spawn (redirect to original system)
        if (action === 'single') {
            return await this.showSpawnTypeSelection(interaction, game);
        }
        
        // Handle batch spawn location selection
        if (interaction.customId.includes('batch_spawn_loc_')) {
            const location = parts[3]; // enemy_side, player_side, etc.
            return await this.executeBatchSpawn(interaction, game, location);
        }
        
        // Handle back to batch spawn modal
        if (interaction.customId.includes('batch_spawn_back_')) {
            return await this.showBatchSpawnModal(interaction);
        }
        
        // ===== EXISTING SINGLE SPAWN LOGIC =====
        // Handle back to type selection
        if (interaction.customId.includes('gm_spawn_back_type_')) {
            return await this.showSpawnTypeSelection(interaction, game);
        }
        
        // Handle back to quantity selection
        if (interaction.customId.includes('gm_spawn_back_qty_')) {
            const shipType = parts[4]; // gm_spawn_back_qty_shipType_userId
            return await this.showSpawnQuantitySelection(interaction, game, shipType);
        }
        
        // Handle quantity selection
        if (action === 'qty') {
            const quantity = parseInt(parts[3]);
            const shipType = parts[4];
            
            // Store spawn data and show location selection
            if (!game.tempSpawnData) game.tempSpawnData = new Map();
            game.tempSpawnData.set(userId, { shipType: shipType, quantity: quantity });
            
            return await this.showSpawnLocationSelection(interaction, game, shipType, quantity);
        }
        
        // Handle location selection (spawn_loc_)
        if (interaction.customId.includes('gm_spawn_loc_')) {
            return await this.executeGMSpawn(interaction, game);
        }
        
        // Initial ship type selection - go to quantity selection
        if (!game.tempSpawnData) game.tempSpawnData = new Map();
        
        await this.showSpawnQuantitySelection(interaction, game, action);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                BATTLE SYSTEM                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async startBattle(interaction) {
        const channelId = interaction.channelId;
        const game = this.games.get(channelId);

        if (!game || game.gmId !== interaction.user.id) {
            return interaction.reply({ content: 'Only the GM can start the battle!', flags: MessageFlags.Ephemeral });
        }

        const totalPlayers = game.players.size;
        const totalOPFOR = Array.from(game.enemies.values()).filter(e => e.isOPFOR).length;
        
        if (totalPlayers + totalOPFOR < 1) {
            return interaction.reply({ content: 'Need at least 1 player or OPFOR to start!', flags: MessageFlags.Ephemeral });
        }

        if (!game.setupState?.setupComplete) {
            return interaction.reply({ content: 'Game setup is not complete! Use `/prepare` to configure the game first.', flags: MessageFlags.Ephemeral });
        }

        // Check spawn positions...
        const playersWithoutPositions = [];
        for (const [playerId, player] of game.players.entries()) {
            if (!player.position) {
                playersWithoutPositions.push(`<@${playerId}>`);
            }
        }
        for (const [opforId, opforPlayer] of game.enemies.entries()) {
            if (opforPlayer.isOPFOR && !opforPlayer.position) {
                playersWithoutPositions.push(`<@${opforId}> (OPFOR)`);
            }
        }

        if (playersWithoutPositions.length > 0) {
            return interaction.reply({ 
                content: `❌ Cannot start battle! The following players need to select their spawn positions:\n${playersWithoutPositions.join(', ')}\n\nUse \`/join\` to select your spawn position.`,
                flags: MessageFlags.Ephemeral 
            });
        }

        // *** SEND INITIAL REPLY FIRST ***
        await interaction.reply({ 
            content: '🚢 **Battle is starting!** Generating map and setting up mission...'
            
        });

        try {
            await game.initializeBattle();
            
            // *** SPAWN ENEMIES FIRST (from GM configuration) ***
            await this.spawnConfiguredEnemies(game);
            
            // *** THEN SET UP OBJECTIVES (which may use existing enemies) ***
            const objectiveType = game.setupState.objectiveConfig.type;
            const objective = this.missions.getObjective(objectiveType);
            
            let objectiveSetupMessage = null;
            
            if (objective) {
                game.currentObjective = objective;
                if (objective.setup) {
                    // Pass the game so objective can use existing enemies
                    const setupResult = objective.setup(game);
                    
                    // Store the message for later display
                    if (setupResult && setupResult.message) {
                        objectiveSetupMessage = setupResult.message;
                    }
                }
            }
            
            // Send objective setup message if there is one
            if (objectiveSetupMessage) {
                await interaction.followUp({
                    content: objectiveSetupMessage
                    
                });
            }
            
            // Send mission briefing
            if (game.currentObjective) {
                const rewardText = game.currentObjective.reward ? 
                    `\n💰 **Mission Rewards:** ${game.currentObjective.reward.xp} XP, ${game.currentObjective.reward.currency} credits` : '';
                
                await interaction.followUp({
                    content: `🎯 **MISSION BRIEFING**\n` +
                            `**Objective:** ${game.currentObjective.name}\n` +
                            `**Description:** ${game.currentObjective.description}${rewardText}\n\n` +
                            `Good luck, commanders! 🫡`
                    
                });
            }
            
            // Update the initial reply to show completion
            await interaction.editReply({
                content: '✅ **Battle has begun!** Check the pinned map above and mission briefing below.'
            });
            
        } catch (error) {
            console.error('Error setting up battle:', error);
            await interaction.editReply({
                content: '❌ Error setting up battle. Check console for details.'
            });
            return; // Exit early on setup error
        }

        try {
            await this.updateGameDisplay(game, interaction.channel);
            
            // Start player monitoring BEFORE starting turn system
            this.startPlayerMonitoring(game, interaction.channel);
            
            this.startTurnSystem(game, interaction.channel);
            
        } catch (error) {
            console.error('Error starting battle systems:', error);
            await interaction.followUp({
                content: '❌ Error starting battle systems. Check console for details.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async startTurnSystem(game, channel) {
        game.phase = 'battle';
        game.randomizeTurnOrder();
        
        while (game.phase === 'battle') {
            const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
            
            // If no players alive, pause everything and wait for QRF
            if (alivePlayers.length === 0) {
                if (!game.qrfWaitingStartTime) {
                    game.qrfWaitingStartTime = Date.now();
                    await channel.send('⏸️ **GAME PAUSED - WAITING FOR QRF REINFORCEMENTS**\n' +
                                     '🕐 **10 minutes until automatic mission failure**\n' +
                                     '🚁 Use `/join` to deploy as QRF backup!');
                }
                
                // Check if 10 minutes have passed (600,000 milliseconds)
                const waitTime = Date.now() - game.qrfWaitingStartTime;
                const timeRemaining = 600000 - waitTime; // 10 minutes in ms
                
                if (waitTime >= 600000) {
                    // 10 minutes have passed, end the mission
                    await channel.send('💀 **MISSION FAILED - QRF TIMEOUT**\n' +
                                     '⏰ No reinforcements arrived within 10 minutes.\n' +
                                     '🏁 Sortie automatically ended.');
                    await this.endBattleInternal(game, channel);
                    return;
                }
                
                // Send periodic updates about time remaining
                const minutesRemaining = Math.ceil(timeRemaining / 60000);
                if (game.turnNumber % 30 === 0) { // Every 30 "turns" (but we're not actually processing turns)
                    await channel.send(`⏰ **${minutesRemaining} minutes remaining** until mission failure. QRF reinforcements needed!`);
                }
                
                // Wait 10 seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 10000));
                game.turnNumber++; // Increment for timing purposes only
                continue; // Skip all normal turn processing
            } else {
                // Players are alive, reset QRF waiting time and resume normal operations
                if (game.qrfWaitingStartTime) {
                    game.qrfWaitingStartTime = null;
                    await channel.send('▶️ **GAME RESUMED - QRF REINFORCEMENTS DEPLOYED**\n' +
                                     '⚔️ Battle continues with backup forces!');
                }
            }
            
            // Normal game processing only happens when players are alive
            
            // Process weather events
            const weatherMessages = this.processWeatherEvents(game);
            for (const message of weatherMessages) await channel.send(message);
            
            // Process formation integrity
            const formationMessages = this.checkFormationIntegrity(game);
            for (const message of formationMessages) await channel.send(message);
            
            // Player turns - FIXED: Process each player turn completely before moving to next
            for (let i = 0; i < game.turnOrder.length; i++) {
                const playerId = game.turnOrder[i];
                if (game.phase !== 'battle') break;

                const currentPlayer = game.players.get(playerId);
                if (!currentPlayer || !currentPlayer.alive) continue;

                console.log(`🔄 Turn ${game.turnNumber} - Starting turn for player ${i + 1}/${game.turnOrder.length}: ${currentPlayer.username || currentPlayer.id}`);

                // WAIT for this player's turn to COMPLETELY finish (including roleplay)
                await this.playerTurn(currentPlayer, game, channel, game.lastInteraction);

                console.log(`✅ Turn ${game.turnNumber} - Completed turn for: ${currentPlayer.username || currentPlayer.id}`);

                // Clear interaction after first use to prevent stale interactions
                if (game.lastInteraction) {
                    game.lastInteraction = null;
                }
                
                // Check objective completion after each player
                if (game.currentObjective && game.currentObjective.check && game.currentObjective.check(game)) {
                    game.objectiveComplete = true;
                    await channel.send(`🎯 Objective "${game.currentObjective.name}" completed!`);
                }
                
                if (this.checkWinConditions(game)) {
                    await this.endBattleInternal(game, channel);
                    return;
                }
            }
            
            // Only proceed to AI turn AFTER all player turns (including roleplay) are complete
            
            // AI Turn
            await this.aiTurn(game, channel);
            
            // Process aircraft recovery
            const recoveryMessages = this.processAircraftRecovery(game);
            for (const message of recoveryMessages) await channel.send(message);
            
            game.turnNumber++;
            
            // Update display every few turns
            if (game.turnNumber % 3 === 0) {
                await this.updateGameDisplay(game, channel);
            }
            
            // Check win conditions
            if (this.checkWinConditions(game)) {
                await this.endBattle(game, channel);
                return;
            }
        }
    }

    async endBattleInternal(game, channel) {

        // Stop player monitoring
        this.stopPlayerMonitoring(game);
        
        // Clean up QRF waiting state
        game.qrfWaitingStartTime = null;
        game.qrfRequestSent = false;
        
        // Clean up messages and pins
        await this.cleanupGameMessages(game, channel);

        if (game.aircraft && game.aircraft.size > 0) {
            await this.recoverAircraft(game, channel);
        }

        // Determine MVP before awarding rewards
        let mvpCandidate = null;
        if (typeof game.getMVPCandidate === 'function') {
            mvpCandidate = game.getMVPCandidate();
        } else {
            // Fallback: call the method from NavalBattle prototype
            console.warn('⚠️ getMVPCandidate not found on game object, using prototype fallback');
            mvpCandidate = NavalBattle.prototype.getMVPCandidate.call(game);
        }

        // Award XP and currency to players
        const guildId = channel.guild.id;
        for (const player of game.players.values()) {
            const playerData = this.getGuildPlayerData(guildId, player.id);
            if (playerData) {
                let baseExp = 100;
                let baseCurrency = 200;

                if (game.objectiveComplete) {
                    baseExp += 200;
                    baseCurrency += 500;
                    playerData.victories++;
                }

                // MVP gets 2x rewards
                if (mvpCandidate && player.id === mvpCandidate.playerId) {
                    baseExp *= 2;
                    baseCurrency *= 2;
                }

                playerData.experience += baseExp;
                playerData.currency += baseCurrency;
                playerData.battles++;
            }
        }

        // Announce MVP if one was selected
        if (mvpCandidate && game.players.size > 1) {
            await game.announceMVP(mvpCandidate, channel);
        }

        this.savePlayerData();
        this.games.delete(game.channelId);

        // Update status when sortie ends
        await this.statusManager.updateStatus();

        await channel.send('🏁 Battle ended! Players have been awarded XP and currency.');
    }

    async recoverAircraft(game, channel) {
        const survivingAircraft = Array.from(game.aircraft.values()).filter(a => a.alive);
        
        for (const aircraft of survivingAircraft) {
            const carrier = game.players.get(aircraft.carrierID) || game.enemies.get(aircraft.carrierID);
            
            if (carrier && carrier.alive) {
                // Aircraft returns to carrier
                const cost = this.carrierSystem.aircraftTypes[aircraft.type]?.cost || 1;
                if (carrier.hangar + cost <= 36) {
                    carrier.hangar += cost;
                    await channel.send(`🛬 ${aircraft.name} returned to ${carrier.customName || carrier.shipClass}`);
                } else {
                    await channel.send(`💥 ${aircraft.name} lost - carrier hangar full`);
                }
            } else {
                await channel.send(`💥 ${aircraft.name} lost - carrier destroyed`);
            }
        }
        
        // Clear aircraft map
        game.aircraft.clear();
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              TURN MANAGEMENT                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    playerTurn(player, game, channel, interaction = null) {
        console.log(`⏳ Creating turn promise for: ${player.username || player.id}`);

        // SAFEGUARD: If player already has an active turn, something is wrong
        if (player.activeTurnMessageId || player.turnResolve) {
            console.error(`❌ ERROR: Player ${player.username || player.id} already has an active turn! Skipping duplicate turn.`);
            return Promise.resolve(); // Return resolved promise to skip this turn
        }

        // Create the promise that will control the turn flow
        return new Promise(async (resolve) => {
            player.turnResolve = resolve;
            player.waitingForRoleplay = false;

            // Process turn effects first
            const turnMessages = this.processTurnEffects(player, game);
            for (const message of turnMessages) await channel.send(message);

            if (!player.alive) {
                resolve(); // Immediately resolve if player is dead
                return;
            }

            // Reset action points
            player.actionPoints = player.shipClass.includes('Carrier') ? 3 : 2;

            // Initialize timer reset tracking
            player.timerResets = 0;
            player.maxTimerResets = 3;

            // Create turn embed
            const turnEmbed = new EmbedBuilder()
                .setTitle(`⚡ ${player.shipClass} Turn`)
                .setDescription(`<@${player.id}>, it's your turn! You have ${player.actionPoints} AP remaining.\n\n` +
                               `**Available Actions:**\n` +
                               `🚢 Use buttons below for actions\n` +
                               `🗺️ Use \`/move <coordinate>\` to move\n` +
                               `⚡ Each action costs 1 AP\n\n` +
                               `${game.roleplayMode ? '🎭 **After your actions, send a message describing what you did for roleplay!**' : ''}`)
                .setColor(0xFFFF00);

            const actionRows = this.createActionButtons(player);

            // Send turn message and get the message object
            const turnMessage = await channel.send({
                content: `<@${player.id}>`,
                embeds: [turnEmbed],
                components: actionRows
            });

            // Store the turn message ID for this player
            player.activeTurnMessageId = turnMessage.id;

            // Send ephemeral map to the player (PASS THE INTERACTION!)
            await this.sendEphemeralMapToPlayer(player, game, channel, interaction);

            // Start the turn timer
            this.startTurnTimer(player, channel);

            // Promise will be resolved by finalizePlayerTurn() when turn ends
        });
    }

    async handleTurnCommand(interaction) {
        const game = this.games.get(interaction.channelId);
        
        // Store the interaction for ephemeral use
        game.lastInteraction = interaction;
        
        // Continue with your turn logic...
        await this.startGameLoop(game, interaction.channel);
    }

    async sendEphemeralMapToPlayer(player, game, channel, interaction = null) {
        // Don't send anything automatically - wait for button click
    }

    async handleGetMapButton(interaction, game) {
        try {
            // Check if interaction is still valid (not expired)
            if (!interaction.isRepliable()) {
                return;
            }

            // Debug: Check game.map state
            console.log(`🔍 DEBUG: game.map exists: ${!!game.map}, size: ${game.map?.size || 0}`);
            if (game.spawnSide) {
                console.log(`🔍 DEBUG: spawnSide: ${game.spawnSide}, oppositeSide: ${game.oppositeSide}`);
            }

            // If game.map doesn't exist but we have spawn data, regenerate the map
            if (!game.map && game.spawnSide) {
                console.log('🔧 Regenerating map from stored spawn data...');
                game.map = game.generateMap(game);
                console.log(`✅ Map regenerated with size: ${game.map?.size || 0}`);
            }

            // Final check - if still no map, return error
            if (!game.map || game.map.size === 0) {
                console.log('❌ No map available for Get Map operation');
                return interaction.reply({
                    content: '❌ Map not available! The game may need to be restarted.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const playerId = interaction.customId.split('_')[2];
            const player = game.players.get(playerId);
            
            // Security check - only the player can get their own map
            if (!player || interaction.user.id !== playerId) {
                // Use a safer response method
                try {
                    await interaction.reply({ 
                        content: '❌ This map button is not for you!',
                        flags: MessageFlags.Ephemeral 
                    });
                } catch (error) {
                }
                return;
            }
            
            // Check if it's actually their turn
            if (!player.activeTurnMessageId || interaction.message.id !== player.activeTurnMessageId) {
                try {
                    await interaction.reply({ 
                        content: '❌ You can only get a map during your active turn!',
                        flags: MessageFlags.Ephemeral 
                    });
                } catch (error) {
                }
                return;
            }
            
            
            // Defer the reply immediately to prevent timeout
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const filepath = await this.createMapImage(game);
            if (!filepath) {
                await interaction.editReply({
                    content: '❌ Failed to generate map image.'
                });
                return;
            }
            
            const path = require('path');
            const filename = path.basename(filepath);
            
            const playerMapEmbed = new EmbedBuilder()
                .setTitle(`🗺️ Your Turn - Battlefield Overview`)
                .setDescription(`**Turn ${game.turnNumber}** | **Weather:** ${game.weather.toUpperCase()}\n` +
                               `**Your Position:** ${player.position}\n` +
                               `**Action Points:** ${player.actionPoints}\n` +
                               `**Health:** ${player.currentHealth}/${player.maxHealth}\n\n` +
                               `This is your private battlefield overview!`)
                .setColor(0x00FF00)
                .setFooter({ text: `${player.shipClass} • Turn ${game.turnNumber}` })
                .setTimestamp();
            
            this.addPlayerStatusToEmbed(playerMapEmbed, player, game);
            
            // Use editReply since we deferred
            await interaction.editReply({
                embeds: [playerMapEmbed],
                files: [{ attachment: filepath, name: filename }]
            });
            
            
            // Clean up file after a delay
            setTimeout(() => {
                const fs = require('fs');
                try {
                    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
                } catch (error) {
                }
            }, 30000);
            
        } catch (error) {
            console.error('❌ Error sending ephemeral map:', error);
            
            // Only try to respond if we haven't already replied/deferred
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                try {
                    await interaction.reply({ 
                        content: '❌ Failed to generate your map. Check the pinned map for battlefield overview.',
                        flags: MessageFlags.Ephemeral 
                    });
                } catch (fallbackError) {
                }
            }
        }
    }

    addPlayerStatusToEmbed(embed, player, game) {
        // Add status information if player has special conditions
        let statusInfo = '';
        if (player.onFire) statusInfo += '🔥 On Fire! ';
        if (player.flooding) statusInfo += '🌊 Flooding! ';
        if (player.damageControlCooldown > 0) statusInfo += `🔧 Damage Control: ${player.damageControlCooldown} turns `;
        
        if (statusInfo) {
            embed.addFields([{
                name: '⚠️ Status Effects',
                value: statusInfo.trim(),
                inline: false
            }]);
        }
        
        // Add carrier-specific information
        if (player.shipClass.includes('Carrier')) {
            const playerAircraft = Array.from(game.aircraft?.values() || []).filter(a => 
                a.alive && a.carrierID === player.id
            );
            
            let carrierInfo = `**Hangar:** ${player.hangar} aircraft available\n`;
            carrierInfo += `**Deployed:** ${playerAircraft.length} squadrons airborne\n`;
            
            if (playerAircraft.length > 0) {
                const missionCounts = {
                    patrol: playerAircraft.filter(a => a.mission === 'patrol').length,
                    cap: playerAircraft.filter(a => a.mission === 'cap').length,
                    attack: playerAircraft.filter(a => a.mission === 'attack').length,
                    returning: playerAircraft.filter(a => a.mission === 'returning').length
                };
                
                carrierInfo += `**Missions:** Patrol:${missionCounts.patrol} CAP:${missionCounts.cap} Attack:${missionCounts.attack} Return:${missionCounts.returning}`;
            }
            
            embed.addFields([{
                name: '✈️ Aircraft Operations',
                value: carrierInfo,
                inline: false
            }]);
        }
        
        // Add ammunition status
        let ammoInfo = '';
        if (player.ammo.get('main') !== undefined) ammoInfo += `Main: ${player.ammo.get('main')} `;
        if (player.ammo.get('secondary') !== undefined) ammoInfo += `Secondary: ${player.ammo.get('secondary')} `;
        if (player.ammo.get('torpedoes') !== undefined && player.hasTorpedoes) ammoInfo += `Torpedoes: ${player.ammo.get('torpedoes')} `;
        
        if (ammoInfo) {
            embed.addFields([{
                name: '🔫 Ammunition',
                value: ammoInfo.trim(),
                inline: false
            }]);
        }
    }

    startTurnTimer(player, channel) {
        // Clear any existing timeout
        if (player.turnTimeout) {
            clearTimeout(player.turnTimeout);
        }
        
        // Set new timeout
        player.turnTimeout = setTimeout(() => {
            if (player.turnResolve) {
                channel.send(`<@${player.id}> took too long! Turn skipped.`);
                
                // Store the resolve function BEFORE cleanup
                const resolveFunction = player.turnResolve;
                player.turnResolve = null;
                
                // Clean up AFTER storing the function
                this.cleanupPlayerTurn(player);
                
                // Now call the stored function
                resolveFunction();
            }
        }, 300000); // 5 minutes
    }

    resetTurnTimer(player, channel) {
        // Check if we can still reset the timer
        if (player.timerResets < player.maxTimerResets) {
            player.timerResets++;
            
            // Restart the timer silently
            this.startTurnTimer(player, channel);
            return true;
        } else {
            // No more resets allowed - timer continues running without reset
            return false;
        }
    }

    createActionButtons(player) {
        const buttons = [
            new ButtonBuilder().setCustomId(`get_map_${player.id}`).setLabel('🗺️ Get Map').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('move').setLabel('Move').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('shoot').setLabel('Shoot').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('skills').setLabel('Skills').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dmg_control').setLabel('Dmg Cntrl').setStyle(ButtonStyle.Secondary).setDisabled(player.damageControlCooldown > 0),
            new ButtonBuilder().setCustomId('end_turn').setLabel('End Turn').setStyle(ButtonStyle.Success)
        ];

        if (player.shipClass.includes('Carrier')) {
            if (player.hangar > 0) {
                buttons.splice(2, 0, new ButtonBuilder().setCustomId(`launch_aircraft_${player.id}`).setLabel('Launch Aircraft').setStyle(ButtonStyle.Primary));
            }
            
            // Always show Move Aircraft button for carriers (will check for aircraft inside the handler)
            buttons.splice(-2, 0, new ButtonBuilder().setCustomId('move_aircraft').setLabel('Move Aircraft').setStyle(ButtonStyle.Success));
            
            // Check for fighters available for CAP
            const game = this.games.get(player.channelId);
            if (game && game.aircraft) {
                const availableFighters = Array.from(game.aircraft.values()).filter(a => 
                    a.alive && a.type === 'fighter' && a.carrierID === player.id && 
                    (a.mission === 'patrol' || a.mission === 'cap')
                );
                
                if (availableFighters.length > 0) {
                    buttons.splice(3, 0, new ButtonBuilder().setCustomId('assign_cap').setLabel('Assign CAP').setStyle(ButtonStyle.Success));
                }
            }
        }

        const actionRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        return actionRows;
    }

    async handlePlayerAction(interaction, player, game) {
        const action = interaction.customId;

        // Debug logging for end_turn button
        if (action === 'end_turn') {
            console.log('🔧 Processing end_turn action for player:', player.username || player.id);
        }
        
        // Handle spawn selections BEFORE checking for active turn
        if (action.includes('spawn_select_') || action.includes('opfor_spawn_select_')) {
            if (action.includes('opfor_spawn_select_')) {
                return await this.handleOPFORSpawnSelection(interaction, game);
            } else {
                return await this.handleSpawnSelection(interaction, game);
            }
        }

        if (action.startsWith('get_map_')) {
            return await this.handleGetMapButton(interaction, game);
        }
        
        if (!player.activeTurnMessageId && action !== 'end_turn') {
            return interaction.reply({
                content: '❌ It\'s not your turn! Wait for your turn to take actions.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        if (interaction.message && interaction.message.id !== player.activeTurnMessageId) {
            const shootingSequenceActions = [
                'weapon_', 'shell_', 'target_', 'torpedo_target_', 'bomb_target_', 'dogfight_target_',
                'equip_', 'aircraft_', 'land_aircraft_', 'launch_', 'cap_assign_'
            ];

            const isShootingSequence = shootingSequenceActions.some(prefix =>
                action.startsWith(prefix) || action.includes(prefix)
            );

            // Allow end_turn from any message since players should always be able to end their turn
            const isEndTurn = action === 'end_turn';
            
            if (!isShootingSequence && !isEndTurn) {
                return interaction.reply({
                    content: '❌ These buttons are from a previous turn! Use only the buttons from your current active turn.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
        
        // **NEW: Check for disabled button attempts**
        if (action.includes('_disabled')) {
            return interaction.reply({ 
                content: '❌ This button has been disabled because your turn has ended.',
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // Reset the turn timer (if resets are available)
        const channel = interaction.channel;
        this.resetTurnTimer(player, channel);
        
        try {
            switch (action) {
                case 'move':
                    await this.showMoveOptions(interaction, player, game);
                    break;
                case 'move_aircraft':
                    await this.showAircraftMoveSelection(interaction, player, game);
                    break;
                case 'shoot':
                    await this.showWeaponSelection(interaction, player, game);
                    break;
                case 'assign_cap':
                    await this.handleAssignCAP(interaction, player, game);
                    break;
                case 'skills':
                    await this.handleSkills(interaction, player, game);
                    break;
                case 'dmg_control':
                    await this.handleDamageControl(interaction, player, game);
                    break;
                case 'end_turn':
                    console.log('🔧 Executing end_turn case for player:', player.username || player.id);
                    player.actionPoints = 0;
                    await interaction.reply({ content: '✅ Turn ended!', flags: MessageFlags.Ephemeral });
                    this.endPlayerTurn(player);
                    break;
                default:
                    // Only show "Unknown action" for actual combat actions, not spawn selections
                    if (!action.includes('spawn')) {
                        await interaction.reply({ content: '❌ Unknown action!', flags: MessageFlags.Ephemeral });
                    }
                    break;
            }
            
            // Check if AP is 0 after ANY action
            if (player.actionPoints <= 0 && action !== 'end_turn') {
                this.endPlayerTurn(player);
            }
            
        } catch (error) {
            console.error('Error in handlePlayerAction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred!', flags: MessageFlags.Ephemeral });
            }
        }
    }

    endPlayerTurn(player) {
        console.log(`🛑 endPlayerTurn called for: ${player.username || player.id}`);

        // Find the game this player belongs to
        const game = Array.from(this.games.values()).find(g => g.players.has(player.id));

        if (game && game.roleplayMode && !player.waitingForRoleplay && player.alive) {
            // Start waiting for roleplay message
            player.waitingForRoleplay = true;

            // Clear action timeout
            if (player.turnTimeout) {
                clearTimeout(player.turnTimeout);
            }

            // Send roleplay prompt
            const channel = this.client.channels.cache.get(game.channelId);
            if (channel) {
                console.log(`🎭 Roleplay timeout for game: ${game.roleplayTimeout}ms`);
                const timeoutFormatted = this.formatTimeout(game.roleplayTimeout);
                console.log(`🎭 Formatted timeout: ${timeoutFormatted}`);
                channel.send(`🎭 <@${player.id}>, describe your actions for roleplay! (You have ${timeoutFormatted}, or type "skip" to continue immediately)`);

                // Set roleplay timeout
                player.roleplayTimeout = setTimeout(() => {
                    if (player.waitingForRoleplay) {
                        channel.send(`⏰ Roleplay time expired for <@${player.id}>. Moving to next player.`);
                        this.finalizePlayerTurn(player);
                    }
                }, game.roleplayTimeout);

                // Set up message listener
                this.waitForRoleplayMessage(player, channel);
            }
        } else {
            // No roleplay mode or already did roleplay, end turn immediately
            this.finalizePlayerTurn(player);
        }
    }

    waitForRoleplayMessage(player, channel) {
        const messageListener = (message) => {
            // Check if it's the right player and they're waiting for roleplay
            if (message.author.id === player.id && player.waitingForRoleplay && !message.author.bot) {
                // Player sent a roleplay message
                player.waitingForRoleplay = false;
                
                // Clear roleplay timeout
                if (player.roleplayTimeout) {
                    clearTimeout(player.roleplayTimeout);
                    player.roleplayTimeout = null;
                }
                
                // Remove the message listener
                this.client.off('messageCreate', messageListener);
                
                // Check for skip command
                if (message.content.toLowerCase().trim() === 'skip') {
                    channel.send(`⏭️ <@${player.id}> skipped roleplay. Moving to next player.`);
                    this.finalizePlayerTurn(player);
                } else {
                    // Optional: Add a small delay to let people read the roleplay
                    setTimeout(() => {
                        channel.send(`✅ <@${player.id}> completed their turn.`);
                        this.finalizePlayerTurn(player);
                    }, 2000); // 2 second delay
                }
            }
        };
        
        // Add the message listener
        this.client.on('messageCreate', messageListener);
    }

    cleanupPlayerTurn(player) {
        
        if (player.turnTimeout) {
            clearTimeout(player.turnTimeout);
            player.turnTimeout = null;
        }
        
        if (player.roleplayTimeout) {
            clearTimeout(player.roleplayTimeout);
            player.roleplayTimeout = null;
        }
        
        // **NEW: Disable buttons during cleanup too**
        this.disablePlayerTurnButtons(player);
        
        player.activeTurnMessageId = null;
        player.waitingForRoleplay = false;
        player.timerResets = 0;
        
        // IMPORTANT: Also resolve the turn promise to prevent hanging
        if (player.turnResolve) {
            const resolveFunction = player.turnResolve;
            player.turnResolve = null;
            resolveFunction();
        }
    }

    async cleanupOldTurnMessages(game, channel) {
        
        for (const player of game.players.values()) {
            if (player.activeTurnMessageId) {
                try {
                    const oldMessage = await channel.messages.fetch(player.activeTurnMessageId);
                    if (oldMessage) {
                        // Delete old turn messages to reduce clutter (optional)
                        // await oldMessage.delete();
                        
                        // Or just disable them
                        await this.disablePlayerTurnButtons(player);
                    }
                } catch (error) {
                }
            }
        }
    }

    finalizePlayerTurn(player) {
        console.log(`🏁 Finalizing turn for: ${player.username || player.id}, has turnResolve: ${!!player.turnResolve}`);

        if (player.turnTimeout) {
            clearTimeout(player.turnTimeout);
            player.turnTimeout = null;
        }

        if (player.roleplayTimeout) {
            clearTimeout(player.roleplayTimeout);
            player.roleplayTimeout = null;
        }

        // **NEW: Disable the turn buttons when turn ends**
        this.disablePlayerTurnButtons(player);

        // IMPORTANT: This resolves the Promise that playerTurn() is waiting on
        if (player.turnResolve) {
            const resolveFunction = player.turnResolve;
            player.turnResolve = null;
            player.activeTurnMessageId = null;
            player.waitingForRoleplay = false;
            player.timerResets = 0;

            console.log(`✅ Resolving turn promise for: ${player.username || player.id}`);
            resolveFunction(); // This allows the turn system to continue
        } else {
            console.warn(`⚠️ No turnResolve found for: ${player.username || player.id} - turn may have already ended`);
            // Clean up anyway
            player.activeTurnMessageId = null;
            player.waitingForRoleplay = false;
            player.timerResets = 0;
        }
    }

    async disablePlayerTurnButtons(player) {
        if (!player.activeTurnMessageId) {
            return;
        }
        
        try {
            // Find the game this player is in
            const game = Array.from(this.games.values()).find(g => g.players.has(player.id));
            if (!game) {
                return;
            }
            
            // Get the channel
            const channel = this.client.channels.cache.get(game.channelId);
            if (!channel) {
                return;
            }
            
            // Fetch the turn message
            const turnMessage = await channel.messages.fetch(player.activeTurnMessageId);
            if (!turnMessage) {
                return;
            }
            
            // Create disabled versions of all the action buttons
            const disabledActionRows = this.createDisabledActionButtons(player);
            
            // Update the turn message with disabled buttons and a clear indication
            const turnEndEmbed = new EmbedBuilder()
                .setTitle(`⏰ ${player.shipClass} Turn Ended`)
                .setDescription(`<@${player.id}>'s turn has ended.\n\n` +
                               `✅ Turn completed\n` +
                               `🚫 Buttons have been disabled\n` +
                               `⏳ Waiting for other players...`)
                .setColor(0x808080); // Gray color to indicate disabled
            
            await turnMessage.edit({ 
                content: `~~<@${player.id}>~~`, // Strikethrough to show turn is over
                embeds: [turnEndEmbed],
                components: disabledActionRows 
            });
            
            
        } catch (error) {
            console.error(`❌ Error disabling turn buttons for ${player.username || player.id}:`, error);
            // Don't let button disabling errors stop the game flow
        }
    }

    createDisabledActionButtons(player) {
        const buttons = [
            new ButtonBuilder().setCustomId('move_disabled').setLabel('Move').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('shoot_disabled').setLabel('Shoot').setStyle(ButtonStyle.Danger).setDisabled(true),
            new ButtonBuilder().setCustomId('skills_disabled').setLabel('Skills').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('dmg_control_disabled').setLabel('Dmg Cntrl').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('end_turn_disabled').setLabel('Turn Ended').setStyle(ButtonStyle.Success).setDisabled(true)
        ];

        if (player.shipClass && player.shipClass.includes('Carrier')) {
            buttons.splice(2, 0,
                new ButtonBuilder().setCustomId('launch_aircraft_disabled').setLabel('Launch Aircraft').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('move_aircraft_disabled').setLabel('Move Aircraft').setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId('assign_cap_disabled').setLabel('Assign CAP').setStyle(ButtonStyle.Success).setDisabled(true)
            );
        }

        const actionRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        return actionRows;
    }

    async opforPlayerTurn(opforPlayer, game, channel) {
        // Reset action points
        opforPlayer.actionPoints = opforPlayer.shipClass.includes('Carrier') ? 3 : 2;
        
        const turnEmbed = new EmbedBuilder()
            .setTitle(`🔴 OPFOR ${opforPlayer.shipClass} Turn`)
            .setDescription(`<@${opforPlayer.id}>, it's your OPFOR turn! You have ${opforPlayer.actionPoints} AP remaining.\n\n` +
                           `**Available Actions:**\n` +
                           `🚢 Use buttons below for actions\n` +
                           `🗺️ Use \`/move <coordinate>\` to move\n` +
                           `⚡ Each action costs 1 AP`)
            .setColor(0xFF0000);

        const actionRows = this.createActionButtons(opforPlayer);
        
        const turnMessage = await channel.send({ 
            content: `<@${opforPlayer.id}>`,
            embeds: [turnEmbed],
            components: actionRows 
        });

        opforPlayer.activeTurnMessageId = turnMessage.id;
        
        // Send ephemeral map to OPFOR player too
        await this.sendEphemeralMapToPlayer(opforPlayer, game, channel);
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                channel.send(`<@${opforPlayer.id}> (OPFOR) took too long! Turn skipped.`);
                this.cleanupPlayerTurn(opforPlayer);
                resolve();
            }, 120000); // 2 minutes

            opforPlayer.turnTimeout = timeout;
            opforPlayer.turnResolve = resolve;
        });
    }

    async aiTurn(game, channel) {
        // Ensure map exists before AI tries to move
        if (!game.map) {
            console.warn('⚠️ AI turn called but game map is null - generating map...');
            game.map = game.generateMap(game);
            console.log('🗺️ Map generated for AI turn');
        }

        this.moveConvoyShips(game, channel);

        const aiEntities = Array.from(game.enemies.values()).filter(ai => ai.alive && !ai.isOPFOR);
        const opforPlayers = Array.from(game.enemies.values()).filter(ai => ai.alive && ai.isOPFOR);
        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);

        const weatherMessages = this.processWeatherEvents(game);
        for (const message of weatherMessages) await channel.send(message);
        
        // Update map immediately if weather changed
        if (game.weatherChangedThisTurn) {
            try {
                await this.updateGameDisplay(game, channel);
                game.weatherChangedThisTurn = false; // Reset flag
            } catch (error) {
                console.error('❌ Error updating map after weather change:', error);
            }
        }
        
        // Process regular AI
        for (const ai of aiEntities) {
            const statusDamage = this.processTurnEffects(ai, game);
            for (const message of statusDamage) await channel.send(message);
            
            if (!ai.alive) continue;

            // FIXED: Use isAICarrierType for already-created AI objects
            if (this.isAICarrierType(ai) && ai.availableSquadrons) {
                await this.processAICarrierOperations(ai, game, channel);
                continue;
            }
            // FALLBACK: Old carrier behavior
            else if (ai.shipClass.includes('Carrier') && ai.hangar > 2) {
                const nearestPlayer = GameUtils.findNearestPlayer(ai, game);
                if (nearestPlayer && Math.random() < 0.4) {
                    const distance = game.calculateDistance(ai.position, nearestPlayer.position);
                    
                    if (distance <= 20) {
                        await this.launchAIAircraft(ai, game, channel);
                        continue;
                    }
                }
            }
            
            // Regular AI behavior for non-carriers
            const nearestPlayer = GameUtils.findNearestPlayer(ai, game);
            if (nearestPlayer) {
                const distance = game.calculateDistance(ai.position, nearestPlayer.position);
                
                if (distance <= ai.stats.range) {
                    // **NEW: Smart ammunition selection based on target**
                    const optimalAmmo = this.getOptimalAmmoType(ai, nearestPlayer, 'main');
                    
                    // **NEW: Use optimal ammo instead of hardcoded 'ap'**
                    const result = this.executeAttack(ai, nearestPlayer, 'main', optimalAmmo, game);
                    
                    const aiName = GameUtils.getAIDisplayName(ai);
                    const targetName = GameUtils.getPlayerDisplayName(nearestPlayer);
                    
                    // **NEW: Enhanced message with ammunition type**
                    const ammoTypeText = optimalAmmo === 'he' ? ' with HE shells' : ' with AP shells';
                    let enhancedMessage = `🔥 ${aiName} attacks ${targetName}${ammoTypeText}!`;
                    
                    // Extract the damage/result part from the original message
                    const messageParts = result.message.split('!');
                    if (messageParts.length > 1) {
                        enhancedMessage += ` ${messageParts[1]}`;
                        // Add any additional parts (like overpenetration messages)
                        for (let i = 2; i < messageParts.length; i++) {
                            enhancedMessage += `!${messageParts[i]}`;
                        }
                    } else {
                        // Fallback if message format is different
                        enhancedMessage = result.message.replace(
                            `${ai.shipClass} hit ${nearestPlayer.shipClass}`,
                            `${aiName} hit ${targetName}${ammoTypeText}`,
                        );
                    }
                    
                    // **NEW: Log overpenetration events for debugging**
                    if (result.overpenetration) {
                        this.logOverpenetrationEvent(ai, nearestPlayer, 'main', optimalAmmo,
                            this.calculateOverpenetrationModifier(ai, nearestPlayer, 'main', optimalAmmo));
                    }
                    
                    await channel.send(enhancedMessage);
                } else {
                    const oldPosition = ai.position;
                    const newPosition = game.moveTowards(ai.position, nearestPlayer.position, ai.stats.speed);

                    // Calculate and store direction based on movement
                    if (oldPosition && newPosition && oldPosition !== newPosition) {
                        const oldCoords = this.coordToNumbers(oldPosition);
                        const newCoords = this.coordToNumbers(newPosition);

                        if (oldCoords && newCoords) {
                            const deltaX = newCoords.x - oldCoords.x;
                            const deltaY = newCoords.y - oldCoords.y;

                            // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
                            let angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
                            if (angle < 0) angle += 360;

                            ai.direction = angle;
                        }
                    }

                    const oldCell = game.getMapCell(oldPosition);
                    if (oldCell) oldCell.occupant = null;

                    ai.position = newPosition;

                    const newCell = game.getMapCell(newPosition);
                    if (newCell) newCell.occupant = 'ai';

                    const aiName = GameUtils.getAIDisplayName(ai);
                    const targetName = GameUtils.getPlayerDisplayName(nearestPlayer);
                    const moveDistance = game.calculateDistance(oldPosition, newPosition);

                    let moveMessage = `🚢 ${aiName} moved to **${newPosition}** (${moveDistance.toFixed(1)} cells), closer to ${targetName}`;

                    // Check for mines
                    if (newCell && newCell.type === 'mine') {
                        const damage = 30 + Math.floor(Math.random() * 21); // 30-50 damage
                        ai.currentHealth = Math.max(0, (ai.currentHealth || ai.hp) - damage);
                        if (ai.currentHealth > 0 && ai.hp) {
                            ai.hp = ai.currentHealth; // Update hp field as well
                        }

                        // Remove mine after it's triggered
                        newCell.type = 'ocean';

                        moveMessage += `\n💥 **MINE HIT!** ${aiName} took ${damage} damage!`;

                        if (ai.currentHealth <= 0 || ai.hp <= 0) {
                            ai.alive = false;
                            moveMessage += `\n💀 **${aiName} destroyed by mine!**`;
                        }
                    }

                    await channel.send(moveMessage);
                }
            }
            
            if (alivePlayers.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // OPFOR turns (existing code...)
        for (const opforPlayer of opforPlayers) {
            if (game.phase !== 'battle') break;
            
            const turnMessages = this.processTurnEffects(opforPlayer, game);
            for (const message of turnMessages) await channel.send(message);
            
            if (!opforPlayer.alive) continue;
            
            await this.opforPlayerTurn(opforPlayer, game, channel);
            
            if (this.checkWinConditions(game)) {
                return;
            }
        }
        
        // ADD THIS SECTION HERE - Process AI aircraft
        const aiAircraft = Array.from(game.aircraft?.values() || []).filter(a =>
            a.alive && (a.owner === 'enemy' || a.isAI)
        );

        for (const aircraft of aiAircraft) {
            await this.processAIAircraftTurn(aircraft, game, channel);
        }

        // Send all batched AI actions in one message
        await game.sendBatchedAIActions(channel);

        // Process civilian entities
        await this.processCivilianEntities(game, channel);

        // Spawn new AI occasionally - only check every 10 turns
        if (game.turnNumber % 10 === 0 && game.enemies.size < 15) {
            // Track initial enemy count if not set
            if (!game.initialEnemyCount) {
                game.initialEnemyCount = game.setupState?.enemyCount || 3;
            }

            // Calculate current alive enemy count (excluding OPFOR players)
            const aliveEnemies = Array.from(game.enemies.values()).filter(e => e.alive && !e.isOPFOR).length;

            // Base spawn chance: 15%
            let spawnChance = 0.15;

            // Double the chance if enemies are at half strength or below
            const halfStrength = Math.ceil(game.initialEnemyCount / 2);
            if (aliveEnemies <= halfStrength) {
                spawnChance *= 2; // 30%
            }

            // Double again if only 1 enemy left
            if (aliveEnemies <= 1) {
                spawnChance *= 2; // 60%
            }

            // Reduce chance if no players alive (avoid overwhelming QRF)
            if (alivePlayers.length === 0) {
                spawnChance = 0.05;
            }

            if (Math.random() < spawnChance) {
                const newAI = game.spawnRandomAI();
                if (newAI) {
                    // FIXED: Use isAICarrierType for already-created AI objects
                    if (this.isAICarrierType(newAI)) {
                        this.setupAICarrierAircraft(newAI, game);
                    }

                    const aiName = GameUtils.getAIDisplayName(newAI);
                    // Add spawn action to batch instead of sending immediately
                    game.addAIAction({
                        type: 'other',
                        message: `${aiName} has appeared at **${newAI.position}**`
                    });
                }
            }
        }

        const aaMessages = await this.processAADefense(game, channel);
        for (const message of aaMessages) {
            await channel.send(message);
        }
    }

    logOverpenetrationEvent(attacker, target, weapon, ammoType, modifier) {
        if (modifier < 1.0) {
            const damageReduction = Math.round((1 - modifier) * 100);
        }
    }

    // Add method to display overpenetration statistics
    getOverpenetrationStats() {
        return {
            'Battleship vs Destroyer': '65% damage reduction',
            'Battleship vs Submarine': '65% damage reduction',
            'Battleship vs Light Cruiser': '30% damage reduction',
            'Heavy Cruiser vs Destroyer': 'No overpenetration',
            'Heavy Cruiser vs Submarine': 'No overpenetration'
        };
    }

    async launchAIAircraft(carrier, game, channel) {
        if (carrier.hangar < 2) return;
        
        // AI prefers dive bombers and fighters
        const aircraftTypes = ['fighter', 'dive_bomber'];
        const launchType = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
        
        // Create AI aircraft
        const aircraft = this.carrierSystem.createAircraftSquadron(launchType, carrier.position, 'enemy', carrier.id);
        if (!aircraft) return;
        
        // Initialize aircraft map if needed
        if (!game.aircraft) {
            game.aircraft = new Map();
        }
        
        game.aircraft.set(aircraft.id, aircraft);
        
        // Reduce AI hangar capacity
        const cost = launchType === 'fighter' ? 2 : 3;
        carrier.hangar = Math.max(0, carrier.hangar - cost);
        
        const aiName = GameUtils.getAIDisplayName(carrier);
        // Add launch action to batch instead of sending immediately
        game.addAIAction({
            type: 'launch',
            message: `${aiName} launched ${aircraft.name} at **${aircraft.position}**`
        });
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 MOVEMENT SYSTEM                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async showMoveOptions(interaction, player, game) {
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }

        const validMoves = this.getValidMovementPositions(player, game);

        if (validMoves.length === 0) {
            return interaction.reply({
                content: '❌ No valid movement positions available!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Defer the reply immediately since map generation takes time
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Generate map with movement highlighting
        const movementCoords = validMoves.map(move => move.coordinate);
        const filepath = await this.createMapImage(game, movementCoords);

        if (!filepath) {
            return interaction.editReply({
                content: '❌ Failed to generate movement map.'
            });
        }

        const path = require('path');
        const filename = path.basename(filepath);

        // Split moves into chunks of 30 per field for text display
        const movesPerField = 30;
        const moveFields = [];

        for (let i = 0; i < Math.min(validMoves.length, 60); i += movesPerField) {
            const chunk = validMoves.slice(i, i + movesPerField);
            const moveList = chunk.map(move => `**${move.coordinate}** (${move.distance.toFixed(1)})`).join(', ');

            moveFields.push({
                name: i === 0 ? `Valid destinations (${validMoves.length} total):` : `Continued:`,
                value: moveList,
                inline: false
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🚢 Movement Options - Visual Map')
            .setDescription(`**${player.shipClass}** at **${player.position}**\n` +
                           `Range: **${player.stats.speed}** cells (circular)\n\n` +
                           `📍 **White coordinates** on the map show where you can move\n` +
                           `💡 Use \`/move <coordinate>\` to move to any highlighted position`)
            .addFields(moveFields.slice(0, 2)) // Show first 2 fields only
            .addFields([
                {
                    name: 'Movement Restrictions',
                    value: '🏝️ Cannot move through islands • 🚢 Cannot move through other ships' +
                           (this.hasReefRestrictions(player) ? ' • 🪨 Cannot move through reefs' : ''),
                    inline: false
                }
            ])
            .setColor(0x0099FF)
            .setFooter({ text: `Movement range: ${player.stats.speed} cells • ${validMoves.length} valid positions` });

        await interaction.editReply({
            embeds: [embed],
            files: [{ attachment: filepath, name: filename }]
        });

        // Clean up file after a delay
        setTimeout(() => {
            const fs = require('fs');
            try {
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (error) {
            }
        }, 30000);
    }

    async executeSlashMove(interaction, coordinate) {
        const game = this.games.get(interaction.channelId);
        if (!game) {
            return interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
        }

        const player = game.players.get(interaction.user.id);
        if (!player) {
            return interaction.reply({ content: '❌ You are not in this game!', flags: MessageFlags.Ephemeral });
        }

        if (!player.alive) {
            return interaction.reply({ content: '❌ Your ship has been destroyed!', flags: MessageFlags.Ephemeral });
        }

        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }

        // Check if it's actually this player's turn
        if (!player.activeTurnMessageId) {
            return interaction.reply({ content: '❌ It\'s not your turn!', flags: MessageFlags.Ephemeral });
        }

        // Reset the turn timer (if resets are available)
        this.resetTurnTimer(player, interaction.channel);

        // Handle "stay" command
        if (coordinate.toLowerCase() === 'stay') {
            player.actionPoints--;

            const playerName = GameUtils.getEntityName(player);
            const message = `🛑 **${playerName}** holds position at **${player.position}**!\n` +
                           `Action Points remaining: **${player.actionPoints}**`;

            await interaction.reply({ content: message });
            
            // End turn if no AP left
            if (player.actionPoints <= 0) {
                this.endPlayerTurn(player);
            }
            return;
        }

        // Validate coordinate format
        if (!/^[A-Z]{1,3}\d{1,3}$/i.test(coordinate)) {
            return interaction.reply({ 
                content: '❌ Invalid format! Use: A1, B5, AA10, etc.',
                flags: MessageFlags.Ephemeral 
            });
        }

        const destination = coordinate.toUpperCase();
        
        // Validate movement
        if (!this.isValidMovementDestination(player, game, destination)) {
            return interaction.reply({ 
                content: '❌ Cannot move there! Position blocked or invalid.',
                flags: MessageFlags.Ephemeral 
            });
        }

        // Check range using Chebyshev distance (diagonal = 1)
        const currentPos = this.coordToNumbers(player.position);
        const destPos = this.coordToNumbers(destination);
        const deltaX = Math.abs(destPos.x - currentPos.x);
        const deltaY = Math.abs(destPos.y - currentPos.y);
        const distance = Math.max(deltaX, deltaY); // Chebyshev distance
        
        if (distance > (player.stats.speed || 3)) {
            return interaction.reply({ 
                content: `❌ Too far! Max: ${player.stats.speed || 3}, Distance: ${distance}`,
                flags: MessageFlags.Ephemeral 
            });
        }

        // Execute movement
        await this.executeMovement(player, game, destination, interaction);
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    getValidMovementPositions(player, game) {
        const validMoves = [];
        const currentPos = this.coordToNumbers(player.position);
        const range = player.stats.speed || 3;

        // Use circular movement - check all positions within range radius
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;

                // Use Euclidean distance for circular movement
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > range) continue;

                const newX = currentPos.x + dx;
                const newY = currentPos.y + dy;

                if (newX < 0 || newX >= 75 || newY < 1 || newY > 75) continue;

                const coordinate = game.generateExtendedCoordinate(newX, newY);

                if (this.isValidMovementDestination(player, game, coordinate)) {
                    validMoves.push({
                        coordinate: coordinate,
                        distance: distance
                    });
                }
            }
        }
        
        validMoves.sort((a, b) => a.distance - b.distance);
        return validMoves;
    }

    isValidMovementDestination(player, game, destination) {
        const cell = game.getMapCell(destination);
        
        if (cell.type === 'island') return false;
        if (cell.type === 'reef' && this.hasReefRestrictions(player)) return false;
        
        const occupant = GameUtils.getEntityAtPosition(game, destination);
        if (occupant && occupant.type !== 'mine') return false;
        
        return true;
    }

    hasReefRestrictions(player) {
        const restrictedTypes = ['Battleship', 'Aircraft Carrier'];
        if (restrictedTypes.some(type => player.shipClass.includes(type))) return true;
        if (player.shipClass.includes('Submarine') && player.depth !== 'surface') return true;
        return false;
    }

    async handleMovementSelection(interaction, player, game) {
        // Parse button: moveto:coordinate:userId or movestay:userId
        const parts = interaction.customId.split(':');

        if (parts[0] === 'movestay') {
            // Player chose to stay in place
            return interaction.update({
                content: '✅ Staying in current position.',
                embeds: [],
                components: []
            });
        }

        // moveto:coordinate:userId
        const destination = parts[1];

        if (!destination) {
            return interaction.update({
                content: '❌ Invalid movement selection!',
                embeds: [],
                components: []
            });
        }

        // Check if destination is valid
        if (!this.isValidMove(player, game, destination)) {
            return interaction.update({
                content: '❌ Invalid movement destination!',
                embeds: [],
                components: []
            });
        }

        // Update the interaction first to acknowledge the button click
        await interaction.update({
            content: '🚢 Executing movement...',
            embeds: [],
            components: []
        });

        // Execute the movement
        await this.executeMovement(player, game, destination, interaction);

        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    async executeMovement(player, game, destination, interaction) {
        const oldPosition = player.position;

        // Calculate and store direction based on movement
        if (oldPosition && destination) {
            const oldCoords = this.coordToNumbers(oldPosition);
            const newCoords = this.coordToNumbers(destination);

            if (oldCoords && newCoords) {
                const deltaX = newCoords.x - oldCoords.x;
                const deltaY = newCoords.y - oldCoords.y;

                // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
                let angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
                if (angle < 0) angle += 360;

                player.direction = angle;
            }
        }

        // Clear old position
        const oldCell = game.getMapCell(oldPosition);
        if (oldCell) oldCell.occupant = null;

        // Set new position
        player.position = destination;
        player.actionPoints--;
        
        // Mark new position
        const newCell = game.getMapCell(destination);
        if (newCell) newCell.occupant = 'player';

        // Check for mines
        let mineMessage = '';
        if (newCell && newCell.type === 'mine') {
            const damage = 30 + Math.floor(Math.random() * 21); // 30-50 damage
            player.currentHealth = Math.max(0, player.currentHealth - damage);

            // Remove mine after it's triggered
            newCell.type = 'ocean';

            mineMessage = `\n💥 **MINE HIT!** Took ${damage} damage!`;

            if (player.currentHealth <= 0) {
                player.alive = false;
                mineMessage += '\n💀 **Ship destroyed by mine!**';
            }
        }
        
        // Calculate distance using Chebyshev distance (diagonal = 1)
        const oldPos = this.coordToNumbers(oldPosition);
        const newPos = this.coordToNumbers(destination);
        const distance = Math.max(Math.abs(oldPos.x - newPos.x), Math.abs(oldPos.y - newPos.y));
        
        const playerName = GameUtils.getEntityName(player);
        const message = `🚢 **${playerName}** moved ${oldPosition} → **${destination}** (${distance})\n` +
                       `AP remaining: **${player.actionPoints}**${mineMessage}`;

        // Send the movement result
        // Check if interaction was already replied to or deferred
        if (interaction.replied || interaction.deferred) {
            // Interaction was already handled (e.g., by handleMovementSelection's update())
            // Use followUp to send a new message to the channel
            await interaction.followUp({ content: message });
        } else {
            // Interaction hasn't been handled yet (e.g., from /move command)
            await interaction.reply({ content: message });
        }
        
        // THEN handle convoy movement if applicable
        if (game.objective && 
            game.objective.type === 'convoy_escort' && 
            game.objective.followTarget === player.id) {
            
            // Mark all alive convoys as able to move
            for (const convoy of game.objective.convoyShips) {
                if (convoy.alive && !convoy.hasReachedDestination) {
                    convoy.canMove = true;
                }
            }
            
            // NOW use followUp since we've already replied
            await interaction.followUp({
                content: `🚢 Convoy ships are following ${player.displayName || player.username}'s movement!`
                
            });
        }
        
        // Always update the map display after movement
        try {
            await this.updateGameDisplay(game, interaction.channel);
        } catch (error) {
            console.error('❌ Map update error:', error);
            // Send a fallback message if map update fails
            await interaction.followUp({ 
                content: '⚠️ Map update failed, but movement was successful.',
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    moveConvoyShips(game, channel) {
        if (!game.objective || game.objective.type !== 'convoy_escort') return;
        
        const followTarget = game.players.get(game.objective.followTarget);
        if (!followTarget || !followTarget.alive) {
            // If original target is dead, select a new one
            const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
            if (alivePlayers.length > 0) {
                const newTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                game.objective.followTarget = newTarget.id;
                game.objective.followTargetName = newTarget.displayName || newTarget.username;
                channel.send(`📢 Convoy ships now following ${game.objective.followTargetName}`);
            }
        }
        
        // Move each convoy ship
        for (const convoy of game.objective.convoyShips) {
            if (!convoy.alive || convoy.hasReachedDestination) continue;
            
            // Check if convoy reached destination zone
            const convoyCoords = this.coordToNumbers(convoy.position);
            const destCoords = this.coordToNumbers(game.objective.destinationZone);
            const distToDest = Math.sqrt(
                Math.pow(convoyCoords.x - destCoords.x, 2) + 
                Math.pow(convoyCoords.y - destCoords.y, 2)
            );

            if (distToDest <= game.objective.destinationRadius) {
                convoy.hasReachedDestination = true;
                game.objective.shipsDelivered++;
                channel.send(`✅ ${convoy.name} reached the destination! (${game.objective.shipsDelivered}/${game.objective.requiredDeliveries})`);
                
                // Remove convoy from map
                const cell = game.map.get(convoy.position);
                if (cell && cell.occupant === 'convoy') {
                    cell.occupant = null;
                }
                continue;
            }
            
            // Follow the target player
            if (convoy.canMove && followTarget) {
                const oldPos = convoy.position;
                const oldCell = game.getMapCell(oldPos);
                
                // Move towards follow target, but also consider destination
                const targetPos = followTarget.position;
                const moveTowards = this.calculateConvoyMove(convoy.position, targetPos, game.objective.destinationZone, game);
                
                if (moveTowards && moveTowards !== convoy.position) {
                    // Clear old position
                    if (oldCell && oldCell.occupant === 'convoy') {
                        oldCell.occupant = null;
                    }
                    
                    // Set new position
                    convoy.position = moveTowards;
                    const newCell = game.getMapCell(moveTowards);
                    if (newCell) {
                        newCell.occupant = 'convoy';
                    }
                }
                
                // Reset movement flag
                convoy.canMove = false;
            }
        }
    }

    // Helper method to calculate convoy movement
    calculateConvoyMove(convoyPos, playerPos, destPos, game) {
        const convoyCoords = this.coordToNumbers(convoyPos);
        const playerCoords = this.coordToNumbers(playerPos);
        const destCoords = this.coordToNumbers(destPos);
        
        // Calculate distances
        const distToPlayer = Math.abs(convoyCoords.x - playerCoords.x) + Math.abs(convoyCoords.y - playerCoords.y);
        
        // If too far from player (>10 cells), move towards player
        if (distToPlayer > 10) {
            return game.moveTowards(convoyPos, playerPos, 3); // Convoy speed of 3
        }
        
        // Otherwise, move towards destination
        return game.moveTowards(convoyPos, destPos, 3);
    }

    coordToNumbers(coord) {
        // Add null check
        if (!coord) {
            return { x: 0, y: 0 };
        }
        
        const match = coord.match(/^([A-Z]+)(\d+)$/);
        if (!match) return { x: 0, y: 0 };
        
        const letters = match[1];
        const numbers = parseInt(match[2]);
        let x = 0;
        
        if (letters.length === 1) {
            x = letters.charCodeAt(0) - 65;
        } else if (letters.length === 2) {
            const first = letters.charCodeAt(0) - 65;
            const second = letters.charCodeAt(1) - 65;
            x = 26 + (first * 26) + second;
        } else if (letters.length === 3) {
            const first = letters.charCodeAt(0) - 65;
            const second = letters.charCodeAt(1) - 65;
            const third = letters.charCodeAt(2) - 65;
            x = 702 + (first * 676) + (second * 26) + third;
        }
        
        return { x, y: numbers };
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 COMBAT SYSTEM                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async handleShoot(interaction, player, game) {
       if (player.actionPoints < 1) return interaction.reply({ content: 'Not enough Action Points!', flags: MessageFlags.Ephemeral });
       
       const targets = this.getTargetsInRange(player, game, player.stats.range);
       if (targets.length === 0) return interaction.reply({ content: 'No targets in range!', flags: MessageFlags.Ephemeral });

       const target = targets[0];
       const result = this.executeAttack(player, target, 'main', 'ap', game);
       
       player.actionPoints--;
       player.ammo.set('main', Math.max(0, player.ammo.get('main') - 1));
       
       await interaction.reply({ content: result.message });
    }

    async showWeaponSelection(interaction, player, game) {
        const weaponButtons = [];
        
        // Primary guns (all ships have these)
        if (player.ammo.get('main') > 0) {
            weaponButtons.push(
                new ButtonBuilder()
                    .setCustomId(`weapon_main_${interaction.user.id}`)
                    .setLabel(`Primary Guns (${player.ammo.get('main')} rounds)`)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        // Secondary guns (most ships have these)
        if (player.ammo.get('secondary') > 0) {
            weaponButtons.push(
                new ButtonBuilder()
                    .setCustomId(`weapon_secondary_${interaction.user.id}`)
                    .setLabel(`Secondary Guns (${player.ammo.get('secondary')} rounds)`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        // Torpedoes (only certain ship classes)
        if (player.hasTorpedoes && player.ammo.get('torpedoes') > 0) {
            weaponButtons.push(
                new ButtonBuilder()
                    .setCustomId(`weapon_torpedoes_${interaction.user.id}`)
                    .setLabel(`Torpedoes (${player.ammo.get('torpedoes')} rounds)`)
                    .setStyle(ButtonStyle.Danger)
            );
        }
        
        if (weaponButtons.length === 0) {
            return interaction.reply({ content: '❌ No weapons available! Out of ammunition.', flags: MessageFlags.Ephemeral });
        }
        
        // Add cancel button
        weaponButtons.push(
            new ButtonBuilder()
                .setCustomId(`weapon_cancel_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const weaponRows = [];
        for (let i = 0; i < weaponButtons.length; i += 5) {
            weaponRows.push(new ActionRowBuilder().addComponents(weaponButtons.slice(i, i + 5)));
        }

        const weaponEmbed = new EmbedBuilder()
            .setTitle('🔫 Select Weapon')
            .setDescription(`**${player.shipClass}** - Choose your weapon:\n\n` +
                           `**Primary Guns:** High damage, long range\n` +
                           `**Secondary Guns:** Faster firing, shorter range\n` +
                           `**Torpedoes:** Very high damage, flooding chance`)
            .setColor(0xFF6600);

        await interaction.reply({ embeds: [weaponEmbed], components: weaponRows, flags: MessageFlags.Ephemeral });
    }

    async handleWeaponSelection(interaction, game) {
        const parts = interaction.customId.split('_');
        const weaponType = parts[1]; // main, secondary, torpedoes, cancel
        const userId = parts[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your weapon selection!', flags: MessageFlags.Ephemeral });
        }
        
        if (weaponType === 'cancel') {
            return interaction.update({ content: '❌ Shooting cancelled.', embeds: [], components: [] });
        }
        
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) {
            return interaction.update({ content: '❌ You are not in this game or your ship is destroyed!', embeds: [], components: [] });
        }
        
        await this.showShellSelection(interaction, player, game, weaponType);
    }

    async showShellSelection(interaction, player, game, weaponType) {
        const shellButtons = [];
        
        if (weaponType === 'torpedoes') {
            // Torpedoes don't have shell types, go straight to target selection
            return await this.showTargetSelection(interaction, player, game, weaponType, 'torpedo');
        }
        
        // AP (Armor Piercing) shells
        shellButtons.push(
            new ButtonBuilder()
                .setCustomId(`shell_ap_${weaponType}_${interaction.user.id}`)
                .setLabel('AP (Armor Piercing)')
                .setStyle(ButtonStyle.Primary)
        );
        
        // HE (High Explosive) shells
        shellButtons.push(
            new ButtonBuilder()
                .setCustomId(`shell_he_${weaponType}_${interaction.user.id}`)
                .setLabel('HE (High Explosive)')
                .setStyle(ButtonStyle.Danger)
        );
        
        // Cancel button
        shellButtons.push(
            new ButtonBuilder()
                .setCustomId(`shell_cancel_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const shellRow = new ActionRowBuilder().addComponents(shellButtons);

        const weaponDisplayName = weaponType === 'main' ? 'PRIMARY' : 'SECONDARY';

        const shellEmbed = new EmbedBuilder()
            .setTitle('💥 Select Shell Type')
            .setDescription(`**${weaponDisplayName} GUNS** - Choose ammunition:\n\n` +
                           `**AP (Armor Piercing):**\n` +
                           `• High penetration against armor\n` +
                           `• Best against heavily armored targets\n` +
                           `• Lower fire chance\n\n` +
                           `**HE (High Explosive):**\n` +
                           `• High damage and fire chance\n` +
                           `• Effective against lightly armored targets\n` +
                           `• Lower penetration`)
            .setColor(0xFF6600);

        await interaction.update({ embeds: [shellEmbed], components: [shellRow] });
    }

    async handleShellSelection(interaction, game) {
        const parts = interaction.customId.split('_');
        const shellType = parts[1]; // ap, he, cancel
        const weaponType = parts[2]; // main, secondary (for cancel, this will be userId)
        const userId = parts.length > 3 ? parts[3] : parts[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your shell selection!', flags: MessageFlags.Ephemeral });
        }
        
        if (shellType === 'cancel') {
            return interaction.update({ content: '❌ Shooting cancelled.', embeds: [], components: [] });
        }
        
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) {
            return interaction.update({ content: '❌ You are not in this game or your ship is destroyed!', embeds: [], components: [] });
        }
        
        await this.showTargetSelection(interaction, player, game, weaponType, shellType);
    }

    async showTargetSelection(interaction, player, game, weaponType, shellType) {
        const weaponRange = this.getWeaponRange(player, weaponType);
        const targets = this.getTargetsInRange(player, game, weaponRange);
        
        if (targets.length === 0) {
            const weaponDisplayName = weaponType === 'main' ? 'Primary Guns' : 
                                      weaponType === 'secondary' ? 'Secondary Guns' : 'Torpedoes';
            return interaction.update({ 
                content: `❌ No targets in range for ${weaponDisplayName}! (Range: ${weaponRange} cells)`,
                embeds: [],
                components: [] 
            });
        }

        const targetButtons = [];
        
        for (let i = 0; i < Math.min(targets.length, 20); i++) { // Limit to 20 targets
            const target = targets[i];
            const distance = game.calculateDistance(player.position, target.position);
            const targetName = target.customName || target.shipClass || 'Unknown';
            const healthInfo = `${target.currentHealth}/${target.maxHealth}HP`;
            
            targetButtons.push(
                new ButtonBuilder()
                    .setCustomId(`target_${target.id}_${weaponType}_${shellType}_${interaction.user.id}`)
                    .setLabel(`${targetName} (${distance.toFixed(1)}⚡ ${healthInfo})`)
                    .setStyle(ButtonStyle.Danger)
            );
        }
        
        // Cancel button
        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`target_cancel_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const targetRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            targetRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }

        const weaponDisplayName = weaponType === 'main' ? 'PRIMARY GUNS' : 
                                  weaponType === 'secondary' ? 'SECONDARY GUNS' : 'TORPEDOES';
        const shellDisplayName = shellType === 'torpedo' ? '' : ` with **${shellType.toUpperCase()}** shells`;

        const targetEmbed = new EmbedBuilder()
            .setTitle('🎯 Select Target')
            .setDescription(`**${weaponDisplayName}**${shellDisplayName}\n` +
                           `Range: **${weaponRange}** cells\n` +
                           `Targets in range: **${targets.length}**\n\n` +
                           `Choose your target:`)
            .setColor(0xFF0000);

        await interaction.update({ embeds: [targetEmbed], components: targetRows });
    }

    async handleTargetSelection(interaction, game) {
        const parts = interaction.customId.split('_');

        // Check for cancel button first (format: target_cancel_{userId})
        if (parts[1] === 'cancel') {
            const userId = parts[2];
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your target selection!', flags: MessageFlags.Ephemeral });
            }
            return interaction.update({ content: '❌ Shooting cancelled.', embeds: [], components: [] });
        }

        // Button format: target_{targetId}_{weaponType}_{shellType}_{userId}
        // Since targetId can contain underscores, parse from the end
        const userId = parts[parts.length - 1];
        const shellType = parts[parts.length - 2];
        const weaponType = parts[parts.length - 3];
        const targetId = parts.slice(1, parts.length - 3).join('_');

        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your target selection!', flags: MessageFlags.Ephemeral });
        }
        
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive || player.actionPoints < 1) {
            return interaction.update({ content: '❌ Cannot shoot - not in game, dead, or no action points!', embeds: [], components: [] });
        }
        
        // Find the target (check enemies, players, and aircraft)
        let target = game.enemies.get(targetId) || 
                    Array.from(game.players.values()).find(p => p.id === targetId) ||
                    game.aircraft?.get(targetId);
                    
        if (!target || !target.alive) {
            return interaction.update({ content: '❌ Target not found or already destroyed!', embeds: [], components: [] });
        }
        
        // Execute the attack
        const result = this.executeAttack(player, target, weaponType, shellType, game);
        
        // Consume ammunition and action point
        player.actionPoints--;
        const ammoType = weaponType === 'torpedoes' ? 'torpedoes' : weaponType;
        player.ammo.set(ammoType, Math.max(0, player.ammo.get(ammoType) - 1));
        
        // Special effects
        let specialEffects = '';
        if (weaponType === 'torpedoes' && result.hit && Math.random() < 0.4) {
            target.flooding = true;
            target.floodTimer = 10;
            specialEffects += ' 🌊 Target is flooding!';
        }
        
        if (shellType === 'he' && result.hit && Math.random() < 0.3) {
            target.onFire = true;
            target.fireTimer = 10;
            specialEffects += ' 🔥 Target is on fire!';
        }
        
        // Remove destroyed aircraft from the map
        if (!target.alive && target.type && game.aircraft?.has(targetId)) {
            game.aircraft.delete(targetId);
        }

        // Send public message to channel
        const channel = interaction.channel;
        if (channel) {
            await channel.send(`${result.message}${specialEffects}`);
        }

        // Update interaction with private confirmation
        await interaction.update({
            content: `✅ Attack executed!\n\nAction Points remaining: **${player.actionPoints}**`,
            embeds: [],
            components: []
        });

        // Always update map after attack to show health changes
        try {
            await this.updateGameDisplay(game, channel);
        } catch (error) {
            console.error('❌ Error updating map after attack:', error);
        }

        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    executeAttack(attacker, target, weapon, ammoType, game) {
        const distance = game.calculateDistance(attacker.position, target.position);
        const accuracy = this.calculateAccuracy(attacker, target, distance, weapon, game.weather);

        // Get display names for attacker and target
        const attackerName = attacker.id && !attacker.type
            ? GameUtils.getPlayerDisplayName(attacker)
            : GameUtils.getAIDisplayName(attacker);
        const targetName = target.id && !target.type
            ? GameUtils.getPlayerDisplayName(target)
            : GameUtils.getAIDisplayName(target);

        if (Math.random() > accuracy) {
            // Track miss for MVP stats
            if (attacker.id) {
                game.updateMVPStats(attacker.id, 'miss');
            }
            return { message: `💨 ${attackerName} missed ${targetName} at ${target.position}!`, hit: false, damage: 0 };
        }

        // Get weapon damage from the weapon object (now auto-calculated)
        const weaponData = attacker.weapons[weapon];
        let baseDamage = weaponData ? weaponData.damage : this.getWeaponDamage(weapon, ammoType);
        
        // Apply equipment level bonus for players
        const channel = game.channelId ? this.client.channels.cache.get(game.channelId) : null;
        const guildId = channel?.guild?.id;
        if (attacker.id && guildId && this.hasGuildPlayerData(guildId, attacker.id)) {
            // Initialize equipment if it doesn't exist
            const equipmentId = `${weapon}_${ammoType}`;
            const equipmentName = `${weapon.charAt(0).toUpperCase() + weapon.slice(1)} ${ammoType.toUpperCase()}`;
            this.levelingSystem.initializeEquipment(attacker.id, equipmentId, equipmentName);

            // Get equipment data and apply level bonus
            const equipmentData = this.levelingSystem.getEquipmentData(attacker.id, equipmentId);
            if (equipmentData) {
                const effectiveness = this.levelingSystem.calculateEquipmentEffectiveness(baseDamage, equipmentData.level);
                baseDamage = effectiveness.finalValue;
            }
        }
        
        // Apply range modifier
        const maxRange = weaponData ? weaponData.range : attacker.stats.range;
        const rangeModifier = this.getRangeModifier(distance, maxRange);
        baseDamage = Math.round(baseDamage * rangeModifier);
        
        // Apply ammo type modifier
        const ammoModifier = this.getAmmoTypeModifier(ammoType);
        baseDamage = Math.round(baseDamage * ammoModifier);

        // **NEW: Apply overpenetration modifier**
        const overpenetrationModifier = this.calculateOverpenetrationModifier(attacker, target, weapon, ammoType);
        baseDamage = Math.round(baseDamage * overpenetrationModifier);

        const penetration = weaponData ? weaponData.penetration : this.getWeaponPenetration(weapon, ammoType);
        const armor = target.stats.armor || 50;
        
        const penetrationRatio = penetration / armor;
        const penetrationChance = 1 / (1 + Math.exp(-5 * (penetrationRatio - 1)));
        
        let finalDamage = 0;
        let penetrated = false;
        let isCritical = false;
        
        // Check for critical hit (5% base chance)
        if (Math.random() < 0.05) {
            isCritical = true;
            baseDamage = Math.round(baseDamage * 1.5); // 50% damage bonus for critical
        }
        
        if (Math.random() < penetrationChance) {
            finalDamage = baseDamage;
            penetrated = true;
            
            if (ammoType === 'he' && Math.random() < 0.3) {
                target.onFire = true;
                target.fireTimer = 10;
            }
        } else {
            finalDamage = Math.random() < 0.7 ? 0 : Math.floor(baseDamage * 0.1);
        }

        target.currentHealth = Math.max(0, target.currentHealth - finalDamage);

        // Award equipment XP to attacking player
        if (attacker.id && guildId && this.hasGuildPlayerData(guildId, attacker.id)) {
            const equipmentId = `${weapon}_${ammoType}`;

            // Award XP based on action type
            if (isCritical) {
                this.levelingSystem.awardCombatXP(attacker.id, equipmentId, 'critical', channel);
            } else {
                this.levelingSystem.awardCombatXP(attacker.id, equipmentId, 'hit', channel);
            }

            // Award kill XP if target was destroyed
            if (target.currentHealth <= 0) {
                this.levelingSystem.awardCombatXP(attacker.id, equipmentId, 'kill', channel);
            }
        }

        // MVP Tracking
        if (attacker.id) {
            // Track damage dealt
            game.updateMVPStats(attacker.id, 'damageDealt', finalDamage);

            // Track hits/misses and critical hits
            if (isCritical) {
                game.updateMVPStats(attacker.id, 'criticalHit');
            } else {
                game.updateMVPStats(attacker.id, 'hit');
            }

            // Track kills
            if (target.currentHealth <= 0) {
                game.updateMVPStats(attacker.id, 'kill');
            }
        }

        // Track damage received for target (if it's a player)
        if (target.id && finalDamage > 0) {
            game.updateMVPStats(target.id, 'damageReceived', finalDamage);
        }
        
        // Build message with overpenetration info
        let message = `💥 ${attackerName} hit ${targetName} at ${target.position} for ${finalDamage} damage!`;
        if (isCritical) message += ' 🎯 CRITICAL HIT!';
        if (penetrated) message += ' (Penetration!)';
        else if (finalDamage === 0) message += ' (Ricochet!)';
        else message += ' (Spall damage)';

        // **NEW: Add overpenetration message**
        const overpenetrationMessage = this.getOverpenetrationMessage(overpenetrationModifier);
        message += overpenetrationMessage;

        if (target.onFire && target.fireTimer > 0) message += ' 🔥 Target is on fire!';
        if (target.currentHealth <= 0) {
            message += ` 💀 ${targetName} has been destroyed!`;
            target.alive = false;
        }

        return {
            message,
            hit: true,
            damage: finalDamage,
            penetrated,
            critical: isCritical,
            overpenetration: overpenetrationModifier < 1.0
        };
    }

    getCombatAnalysis(attacker, target, weapon, ammoType) {
        const attackerClass = attacker.shipClass?.toLowerCase() || attacker.type?.toLowerCase() || '';
        const targetClass = target.shipClass?.toLowerCase() || target.type?.toLowerCase() || '';
        
        const overpenetrationModifier = this.calculateOverpenetrationModifier(attacker, target, weapon, ammoType);
        
        return {
            attackerClass,
            targetClass,
            weapon,
            ammoType,
            overpenetrationModifier,
            willOverpenetrate: overpenetrationModifier < 1.0,
            damageReduction: Math.round((1 - overpenetrationModifier) * 100)
        };
    }

    // Add method for AI to make smarter ammunition choices
    getOptimalAmmoType(attacker, target, weapon) {
        if (weapon === 'torpedoes') return 'torpedo';
        if (weapon === 'secondary') return 'he'; // Secondary guns typically use HE
        
        // For main guns, choose based on target
        const analysis = this.getCombatAnalysis(attacker, target, weapon, 'ap');
        
        if (analysis.willOverpenetrate) {
            // If AP will overpenetrate, suggest HE instead
            return 'he';
        }
        
        // Use AP for heavily armored targets
        return 'ap';
    }

    calculateOverpenetrationModifier(attacker, target, weapon, ammoType) {
        // Only apply overpenetration to large caliber guns with AP shells
        if (weapon !== 'main' || ammoType !== 'ap') {
            return 1.0; // No overpenetration for secondary guns, HE, or torpedoes
        }
        
        // Get attacker ship class
        const attackerClass = attacker.shipClass?.toLowerCase() || attacker.type?.toLowerCase() || '';
        const targetClass = target.shipClass?.toLowerCase() || target.type?.toLowerCase() || '';
        
        // Define ship armor categories
        const heavyArmoredShips = ['battleship', 'heavy cruiser', 'aircraft carrier'];
        const mediumArmoredShips = ['light cruiser', 'cruiser'];
        const lightArmoredShips = ['destroyer', 'submarine', 'auxiliary'];
        
        // Determine attacker gun size category
        let attackerGunSize = 'medium';
        if (heavyArmoredShips.some(type => attackerClass.includes(type))) {
            attackerGunSize = 'heavy'; // Battleships, Heavy Cruisers have large guns
        } else if (lightArmoredShips.some(type => attackerClass.includes(type))) {
            attackerGunSize = 'light'; // Destroyers, Subs have small guns
        }
        
        // Determine target armor category
        let targetArmor = 'medium';
        if (heavyArmoredShips.some(type => targetClass.includes(type))) {
            targetArmor = 'heavy';
        } else if (lightArmoredShips.some(type => targetClass.includes(type))) {
            targetArmor = 'light';
        }
        
        // Calculate overpenetration modifier
        if (attackerGunSize === 'heavy') {
            switch (targetArmor) {
                case 'light':
                    return 0.35; // 65% damage reduction for BB guns vs DD/SS
                case 'medium':
                    return 0.70; // 30% damage reduction for BB guns vs CL
                case 'heavy':
                    return 1.0; // No overpenetration vs heavy targets
            }
        }
        
        // Medium and light guns don't overpenetrate
        return 1.0;
    }

    // Add this method to provide overpenetration feedback messages
    getOverpenetrationMessage(modifier) {
        if (modifier <= 0.4) {
            return ' (Complete overpenetration!)';
        } else if (modifier <= 0.7) {
            return ' (Overpenetration)';
        }
        return '';
    }

    calculateAccuracy(attacker, target, distance, weapon, weather) {
        let baseAccuracy = attacker.stats.accuracy / 100;
        const maxRange = attacker.stats.range;
        const distancePenalty = Math.min(distance / maxRange, 1) * 0.3;
        baseAccuracy -= distancePenalty;
        
        // USE THE NEW EVASION CALCULATION:
        let targetEvasion;
        if (target.tonnage && target.speedKnots) {
            // Use realistic evasion calculation for players with ship data
            targetEvasion = GameUtils.calculateShipEvasion(target.speedKnots, target.tonnage);
        } else {
            // Fallback to old system for AI or legacy players
            targetEvasion = target.stats.evasion || 20;
        }
        
        const evasionBonus = (targetEvasion / 100) * 0.2;
        baseAccuracy -= evasionBonus;
        
        const weatherModifier = this.getWeatherAccuracyModifier(weather);
        baseAccuracy *= weatherModifier;
        
        return Math.max(0.05, Math.min(0.95, baseAccuracy));
    }

    getWeaponRange(player, weaponType) {
        // Get weapon data from player's weapons
        const weaponData = player.weapons[weaponType];
        
        if (weaponData && weaponData.range) {
            return weaponData.range; // Use the auto-calculated range
        }
        
        // Fallback to old system if no weapon data
        switch (weaponType) {
            case 'main':
                return player.stats.range || 8;
            case 'secondary':
                return Math.floor((player.stats.range || 8) * 0.7);
            case 'torpedoes':
                return Math.floor((player.stats.range || 8) * 0.8);
            default:
                return player.stats.range || 8;
        }
    }

    getWeaponDamage(weapon, ammoType) {
       const damage = { main: { ap: 80, he: 65 }, secondary: { ap: 35, he: 30 }, torpedoes: { ap: 120, he: 120 } };
       return damage[weapon]?.[ammoType] || 50;
    }

    getWeaponPenetration(weapon, ammoType) {
       const pen = { main: { ap: 200, he: 80 }, secondary: { ap: 120, he: 60 }, torpedoes: { ap: 300, he: 300 } };
       return pen[weapon]?.[ammoType] || 100;
    }

    getTargetsInRange(attacker, game, range) {
        const targets = [];
        
        if (attacker.id.startsWith('ai_')) {
            // AI targets players
            for (const player of game.players.values()) {
                if (player.alive && game.calculateDistance(attacker.position, player.position) <= range) {
                    targets.push(player);
                }
            }
            // AI also targets player aircraft
            for (const aircraft of game.aircraft?.values() || []) {
                if (aircraft.owner === 'player' && aircraft.alive && 
                    game.calculateDistance(attacker.position, aircraft.position) <= range) {
                    targets.push(aircraft);
                }
            }
        } else {
            // Players target enemies
            for (const enemy of game.enemies.values()) {
                if (enemy.alive && game.calculateDistance(attacker.position, enemy.position) <= range) {
                    targets.push(enemy);
                }
            }
            // Players also target enemy aircraft
            for (const aircraft of game.aircraft?.values() || []) {
                if (aircraft.owner === 'enemy' && aircraft.alive && 
                    game.calculateDistance(attacker.position, aircraft.position) <= range) {
                    targets.push(aircraft);
                }
            }
        }
        
        return targets;
    }

    async handleSkills(interaction, player, game) {
       await interaction.reply({ content: 'Skills system not implemented yet!', flags: MessageFlags.Ephemeral });
    }

    async handleDamageControl(interaction, player, game) {
        if (player.actionPoints < 1) return interaction.reply({ content: 'Not enough Action Points!', flags: MessageFlags.Ephemeral });
        if (player.damageControlCooldown > 0) return interaction.reply({ content: `Damage Control on cooldown for ${player.damageControlCooldown} more turns!`, flags: MessageFlags.Ephemeral });

        const hadStatusEffects = player.onFire || player.flooding || player.bleeding;

        player.onFire = false;
        player.flooding = false;
        player.bleeding = false;
        player.fireTimer = 0;
        player.floodTimer = 0;
        player.damageControlCooldown = 8;
        player.actionPoints--;

        await interaction.reply({ content: '🔧 Damage control successful! All status effects removed.', flags: MessageFlags.Ephemeral });
        
        // Update map immediately if status effects were cleared
        if (hadStatusEffects) {
            try {
                await this.updateGameDisplay(game, interaction.channel);
            } catch (error) {
                console.error('❌ Error updating map after damage control:', error);
                // Continue silently - damage control still worked
            }
        }
    }

    getRangeModifier(distance, maxRange) {
        const rangeRatio = distance / maxRange;
        if (rangeRatio <= 0.4) return 1.2; // Point blank
        if (rangeRatio <= 0.6) return 1.0; // Close range
        if (rangeRatio <= 0.8) return 0.9; // Medium range
        if (rangeRatio <= 1.0) return 0.8; // Long range
        return 0.7; // Extreme range
    }

    getAmmoTypeModifier(ammoType) {
        const modifiers = {
            'ap': 1.0,
            'he': 0.85,
            'sap': 0.95,
            'incendiary': 0.7,
            'torpedo': 1.0
        };
        return modifiers[ammoType] || 1.0;
    }

    getWeatherAccuracyModifier(weather) {
       const modifiers = { clear: 1.0, rainy: 0.95, foggy: 0.85, thunderstorm: 0.8, hurricane: 0.6 };
       return modifiers[weather] || 1.0;
   }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           ANTI-AIRCRAFT SYSTEM ADDITIONS                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async showAACreationForm(interaction, playerData) {
        const modal = new ModalBuilder()
            .setCustomId(`create_aa_${interaction.user.id}`)
            .setTitle(`AA Guns for ${playerData.username}`);

        // AA Caliber input
        const caliberInput = new TextInputBuilder()
            .setCustomId('aa_caliber')
            .setLabel('AA Gun Caliber (20mm, 25mm, 37mm, 40mm, 76mm, 127mm)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('40mm')
            .setRequired(true)
            .setMaxLength(6);

        // Number of barrels input
        const barrelsInput = new TextInputBuilder()
            .setCustomId('aa_barrels')
            .setLabel('Number of AA Gun Barrels (1-8)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4')
            .setRequired(true)
            .setMaxLength(2);

        // AA Gun Name input
        const nameInput = new TextInputBuilder()
            .setCustomId('aa_name')
            .setLabel('AA Gun System Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bofors 40mm Quad Mount')
            .setRequired(true)
            .setMaxLength(50);

        // Mount type input
        const mountInput = new TextInputBuilder()
            .setCustomId('aa_mount')
            .setLabel('Mount Type (1/single, 2/twin, 4/quad, 8/octuple)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4 or quad')
            .setRequired(true)
            .setMaxLength(10);

        // AA Experience level input
        const experienceInput = new TextInputBuilder()
            .setCustomId('aa_experience')
            .setLabel('Initial AA Crew Experience Level (1-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setRequired(true)
            .setMaxLength(2);

        const firstRow = new ActionRowBuilder().addComponents(caliberInput);
        const secondRow = new ActionRowBuilder().addComponents(barrelsInput);
        const thirdRow = new ActionRowBuilder().addComponents(nameInput);
        const fourthRow = new ActionRowBuilder().addComponents(mountInput);
        const fifthRow = new ActionRowBuilder().addComponents(experienceInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async handleAACreationSubmit(interaction) {
        try {
            const customIdParts = interaction.customId.split('_');
            let aaType, userId;
            
            // Handle different customId formats
            if (customIdParts.length === 3) {
                // Format: create_aa_userId (legacy)
                aaType = 'general';
                userId = customIdParts[2];
            } else if (customIdParts.length === 4) {
                // Format: create_aa_aaType_userId (new range-specific)
                aaType = customIdParts[2];
                userId = customIdParts[3];
            } else {
                return interaction.reply({ content: '❌ Invalid AA creation form format!', flags: MessageFlags.Ephemeral });
            }
            
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your AA creation form!', flags: MessageFlags.Ephemeral });
            }

            const tempData = this.bot.tempPlayerData.get(userId);
            if (!tempData) {
                return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
            }

            const caliberInput = interaction.fields.getTextInputValue('aa_caliber').toLowerCase();
            const barrels = parseInt(interaction.fields.getTextInputValue('aa_barrels'));
            const aaName = interaction.fields.getTextInputValue('aa_name');
            const mountTypeRaw = interaction.fields.getTextInputValue('aa_mount').toLowerCase().trim();
            const experienceLevel = parseInt(interaction.fields.getTextInputValue('aa_experience'));

            // Normalize AA mount configuration - accept both numbers and words
            const aaMountMapping = {
                '1': 'single',
                'single': 'single',
                '2': 'twin',
                'twin': 'twin',
                'dual': 'twin',
                '4': 'quad',
                'quad': 'quad',
                'quadruple': 'quad',
                '6': 'sextuple',
                'sextuple': 'sextuple',
                '8': 'octuple',
                'octuple': 'octuple'
            };

            const mountType = aaMountMapping[mountTypeRaw];

            // Validate caliber exists
            if (!AA_CALIBERS[caliberInput]) {
                if (aaType === 'general') {
                    const validCalibers = Object.keys(AA_CALIBERS).join(', ');
                    return interaction.reply({ 
                        content: `❌ Invalid AA caliber! Valid options: ${validCalibers}`,
                        flags: MessageFlags.Ephemeral 
                    });
                } else {
                    const validCalibers = getCalibersByCategory(aaType);
                    return interaction.reply({ 
                        content: `❌ Invalid ${aaType} range caliber! Valid options:\n**${aaType.toUpperCase()} RANGE:** ${validCalibers.join(', ')}`,
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }

            // Validate caliber matches expected range category (for range-specific)
            if (aaType !== 'general' && AA_CALIBERS[caliberInput].category !== aaType) {
                const validCalibers = getCalibersByCategory(aaType);
                return interaction.reply({ 
                    content: `❌ ${caliberInput} is not a ${aaType} range caliber!\n**${aaType.toUpperCase()} RANGE:** ${validCalibers.join(', ')}`,
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Validate barrels (increased limit from your existing 1-8 to 1-200)
            if (isNaN(barrels) || barrels < 1 || barrels > 200) {
                return interaction.reply({ 
                    content: '❌ Number of barrels must be between 1 and 200!',
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Validate experience level
            if (isNaN(experienceLevel) || experienceLevel < 1 || experienceLevel > 10) {
                return interaction.reply({ content: '❌ AA crew experience level must be between 1 and 10!', flags: MessageFlags.Ephemeral });
            }

            // Validate mount type (updated from your original list)
            const validMounts = ['single', 'twin', 'quad', 'sextuple', 'octuple'];
            if (!mountType || !validMounts.includes(mountType)) {
                return interaction.reply({ content: `❌ Invalid mount type! Use: 1/single, 2/twin, 4/quad, 6/sextuple, 8/octuple`, flags: MessageFlags.Ephemeral });
            }

            // Calculate effectiveness (using your existing calculation)
            const effectiveness = calculateAAEffectiveness(caliberInput, mountType, barrels, experienceLevel);
            if (!effectiveness) {
                return interaction.reply({ content: '❌ Error calculating AA effectiveness!', flags: MessageFlags.Ephemeral });
            }

            // Create AA system (compatible with your existing structure)
            const caliberData = AA_CALIBERS[caliberInput];
            const finalAAType = aaType === 'general' ? caliberData.category : aaType;
            
            const aaSystem = {
                name: aaName,
                type: finalAAType,
                caliber: caliberInput,
                fullName: caliberData.name,
                barrels: barrels,
                mountType: mountType,
                experienceLevel: experienceLevel,
                experience: 0,
                efficiency: Math.round((0.6 + (experienceLevel - 1) * 0.035) * 100 * 10) / 10,
                range: effectiveness.range,
                damage: effectiveness.damage,
                accuracy: Math.round(effectiveness.accuracy * 1000) / 10,
                rateOfFire: effectiveness.rateOfFire,
                ammo: 500,
                maxAmmo: 500,
                description: caliberData.description
            };

            // Initialize aaSystems array if it doesn't exist
            if (!tempData.aaSystems) {
                tempData.aaSystems = [];
            }

            // Add the new AA system
            tempData.aaSystems.push(aaSystem);

            // For legacy compatibility, if this is the first AA system, also set it as the single aaSystem
            if (tempData.aaSystems.length === 1) {
                tempData.aaSystem = aaSystem;
            }

            // Show confirmation
            await this.showAAConfirmation(interaction, tempData, aaSystem);

        } catch (error) {
            console.error('❌ Error in handleAACreationSubmit:', error);
            await interaction.reply({ content: '❌ An error occurred while creating AA system!', flags: MessageFlags.Ephemeral });
        }
    }

    async handleBackToAAMenu(interaction) {
        const userId = interaction.customId.split('_')[4];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA menu!', flags: MessageFlags.Ephemeral });
        }

        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Show the AA range selection menu again
        await interaction.update({ components: [], embeds: [] });
        await this.showAARangeSelection(interaction, tempData);
    }

    async showAAConfirmation(interaction, tempData, newAASystem) {
        const existingCount = tempData.aaSystems.length;
        
        // Build description of all AA systems
        let aaDescription = tempData.aaSystems.map((aa, index) => {
            return `**${aa.type.toUpperCase()} RANGE** - ${aa.name}\n` +
                   `• ${aa.barrels}x ${aa.caliber} ${aa.mountType} mount\n` +
                   `• Range: ${aa.range} cells, Damage: ${aa.damage}, ROF: ${aa.rateOfFire}\n`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🎯 AA System Added! (${existingCount} configured)`)
            .setDescription(`**Character:** ${tempData.username}\n\n` +
                           `**AA Systems Configured:**\n${aaDescription}\n` +
                           `**Options:** Add more AA systems or finish configuration.`)
            .setColor(0x00FF00);

        const backButton = new ButtonBuilder()
            .setCustomId(`back_to_aa_menu_${interaction.user.id}`)
            .setLabel('⬅️ Back to AA Menu')
            .setStyle(ButtonStyle.Secondary);

        const finishButton = new ButtonBuilder()
            .setCustomId(`finish_aa_config_${interaction.user.id}`)
            .setLabel('✅ Finish AA Setup')
            .setStyle(ButtonStyle.Success);

        const actionRow = new ActionRowBuilder().addComponents(backButton, finishButton);

        await interaction.reply({ 
            embeds: [embed],
            components: [actionRow],
            flags: MessageFlags.Ephemeral 
        });
    }

    calculateAAEfficiency(experienceLevel) {
        // Level 1 = 60% efficiency, Level 10 = 95% efficiency
        // Each level adds 3.5% efficiency (60 + (level-1) * 3.5)
        const efficiency = 60 + ((experienceLevel - 1) * 3.5);
        return Math.round(efficiency * 10) / 10; // Round to 1 decimal place
    }

    updateAAEfficiency(aaSystem) {
        const newEfficiency = this.calculateAAEfficiency(aaSystem.experienceLevel);
        const caliberData = AA_CALIBERS[aaSystem.caliber];
        const mountMultiplier = { single: 1, twin: 1.8, quad: 3.2, octuple: 5.5 }[aaSystem.mountType];
        
        // Update all efficiency-dependent stats
        aaSystem.efficiency = newEfficiency;
        aaSystem.range = Math.round(caliberData.range * (newEfficiency / 100));
        aaSystem.damage = Math.round(caliberData.damage * mountMultiplier * (newEfficiency / 100));
        aaSystem.accuracy = caliberData.accuracy * (newEfficiency / 100);
        
        return aaSystem;
    }

    async handleAAConfirmation(interaction) {
        const action = interaction.customId.includes('confirm_aa_') ? 'confirm' : 'back';
        const userId = interaction.customId.split('_')[2];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA confirmation!', flags: MessageFlags.Ephemeral });
        }

        if (action === 'back') {
            // Go back to AA creation form
            const tempData = global.navalBot.tempPlayerData.get(userId);
            if (tempData) {
                await this.showAACreationForm(interaction, tempData);
            }
            return;
        }

        // Confirm and finalize character creation
        const tempData = global.navalBot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ 
                content: '❌ Character creation session expired!',
                flags: MessageFlags.Ephemeral 
            });
        }

        // Save the complete character with AA system
        await this.finalizeCharacterCreation(interaction, tempData);
    }

    async processAADefense(game, channel) {
        const aaMessages = [];
        const aaEntities = [];
        
        // Add players with AA systems
        for (const player of game.players.values()) {
            if (player.alive && player.aaSystems && player.aaSystems.length > 0) {
                // Filter out AA systems with no ammo
                const activeAASystems = player.aaSystems.filter(aa => aa.ammo > 0);
                
                if (activeAASystems.length > 0) {
                    aaEntities.push({
                        entity: player,
                        type: 'player',
                        aaSystems: activeAASystems
                    });
                }
            }
        }
        
        // Add AI with AA (single system)
        for (const enemy of game.enemies.values()) {
            if (enemy.alive && enemy.aaSystem && enemy.aaSystem.ammo > 0) {
                aaEntities.push({
                    entity: enemy,
                    type: 'enemy',
                    aaSystems: [enemy.aaSystem]
                });
            }
        }
        
        // Process AA for each entity
        for (const aaEntity of aaEntities) {
            // FIXED: Pass the full aaEntity object, not just aaEntity.entity
            const targets = this.getAircraftInAARange(aaEntity, game);
            
            if (targets.length > 0) {
                
                // Process each AA system separately
                for (const aaSystem of aaEntity.aaSystems) {
                    if (aaSystem.ammo > 0) {
                        // Filter targets within this AA system's range
                        const targetsInRange = targets.filter(t => t.distance <= aaSystem.range);
                        
                        if (targetsInRange.length > 0) {
                            const aaResult = await this.executeAAAttack(aaEntity, targetsInRange, game, aaSystem);
                            if (aaResult.message) {
                                aaMessages.push(aaResult.message);
                            }
                        }
                    }
                }
            }
        }
        
        return aaMessages;
    }

    // In NavalWarfareBot class, in the ANTI-AIRCRAFT SYSTEM ADDITIONS section
    generateAAForAI(aiData) {
        // Don't give AA to all AI - make it based on ship type and random chance
        const shipType = aiData.shipClass.toLowerCase();
        
        let aaChance = 0;
        let caliberOptions = [];
        
        if (shipType.includes('destroyer')) {
            aaChance = 0.7;
            caliberOptions = ['20mm', '25mm', '40mm'];
        } else if (shipType.includes('cruiser')) {
            aaChance = 0.8;
            caliberOptions = ['25mm', '40mm', '76mm'];
        } else if (shipType.includes('battleship')) {
            aaChance = 0.9;
            caliberOptions = ['40mm', '76mm', '127mm'];
        } else if (shipType.includes('carrier')) {
            aaChance = 0.95;
            caliberOptions = ['20mm', '25mm', '40mm'];
        } else {
            aaChance = 0.3;
            caliberOptions = ['20mm', '25mm'];
        }
        
        if (Math.random() < aaChance) {
            const caliber = caliberOptions[Math.floor(Math.random() * caliberOptions.length)];
            const caliberData = AA_CALIBERS[caliber];
            const barrels = Math.ceil(Math.random() * 6);
            const efficiency = 60 + Math.random() * 25; // 60-85% efficiency for AI
            
            const mountTypes = ['single', 'twin', 'quad'];
            const mountType = mountTypes[Math.floor(Math.random() * mountTypes.length)];
            const mountMultiplier = { single: 1, twin: 1.8, quad: 3.2 }[mountType];
            
            return {
                name: `AI ${caliber} AA System`,
                caliber: caliber,
                barrels: barrels,
                mountType: mountType,
                experienceLevel: Math.ceil(efficiency / 10),
                experience: 0,
                efficiency: Math.round(efficiency),
                range: Math.round(caliberData.range * (efficiency / 100)),
                damage: Math.round(caliberData.damage * mountMultiplier * (efficiency / 100)),
                accuracy: caliberData.accuracy * (efficiency / 100),
                rateOfFire: Math.round(caliberData.rateOfFire * mountMultiplier),
                ammo: 300 + Math.floor(Math.random() * 200),
                maxAmmo: 500
            };
        }
        
        return null;
    }

    getAircraftInAARange(aaEntity, game) {
        const targets = [];
        
        // Get maximum AA range from all systems
        let maxAARange = 0;
        if (aaEntity.aaSystems && aaEntity.aaSystems.length > 0) {
            maxAARange = Math.max(...aaEntity.aaSystems.map(aa => aa.range));
        } else if (aaEntity.entity && aaEntity.entity.aaSystem) {
            maxAARange = aaEntity.entity.aaSystem.range;
        }
        
        if (maxAARange === 0) return targets;
        
        // Determine which aircraft to target
        const entity = aaEntity.entity;
        if (!entity || !entity.position) return targets;
        
        const targetOwner = (entity.id && entity.id.startsWith('ai_')) ? 'player' : 'enemy';
        
        for (const aircraft of game.aircraft?.values() || []) {
            if (aircraft.alive && aircraft.owner === targetOwner) {
                const distance = game.calculateDistance(entity.position, aircraft.position);
                if (distance <= maxAARange) {
                    targets.push({
                        aircraft: aircraft,
                        distance: distance
                    });
                }
            }
        }
        
        targets.sort((a, b) => a.distance - b.distance);
        return targets;
    }

    async executeAAAttack(aaEntity, targets, game, aaSystem = null) {
        // Use provided AA system or fall back to single system
        const aa = aaSystem || aaEntity.aa || aaEntity.aaSystems?.[0];
        if (!aa) return { message: null, hits: 0, destroyed: 0 };
        
        const shooter = aaEntity.entity;
        const entityName = shooter.customName || shooter.displayName || shooter.shipClass;
        
        let totalHits = 0;
        let totalShots = 0;
        let destroyedAircraft = [];
        
        // AA can engage multiple targets per turn based on rate of fire
        const maxEngagements = Math.min(aa.rateOfFire, targets.length);
        
        for (let i = 0; i < maxEngagements && aa.ammo > 0; i++) {
            const target = targets[i];
            const aircraft = target.aircraft;
            
            // Calculate AA accuracy based on distance
            const distanceModifier = Math.max(0.3, 1 - (target.distance / aa.range) * 0.4);
            const finalAccuracy = aa.accuracy * distanceModifier;
            
            // AA fires multiple rounds per burst
            const roundsPerBurst = Math.min(3, aa.ammo);
            aa.ammo -= roundsPerBurst;
            totalShots += roundsPerBurst;
            
            let hits = 0;
            for (let round = 0; round < roundsPerBurst; round++) {
                if (Math.random() < finalAccuracy) {
                    hits++;
                    totalHits++;
                }
            }
            
            if (hits > 0) {
                const damage = hits * aa.damage;
                const oldHealth = aircraft.health;
                aircraft.health = Math.max(0, aircraft.health - damage);
                
                            
                // Award AA XP and check for level up
                if (aaEntity.type === 'player' && global.navalBot.levelingSystem) {
                    const xpGained = await global.navalBot.levelingSystem.awardCombatXP(
                        shooter.id,
                        `aa_${aa.caliber}`,
                        hits >= 2 ? 'critical' : 'hit',
                        null,
                    );
                    
                    // Add XP to AA system
                    aa.experience += xpGained || 0;
                    
                    // Check for AA level up
                    await this.checkAALevelUp(shooter, aa);
                }
                
                if (aircraft.health <= 0) {
                    aircraft.alive = false;
                    destroyedAircraft.push(aircraft.name);

                    // Find the carrier and reduce hangar capacity
                    const carrier = game.players.get(aircraft.carrierID) || game.enemies.get(aircraft.carrierID);
                    if (carrier) {
                        // Reduce hangar space (aircraft are lost, not recovered)
                        const aircraftLoss = this.getAircraftHangarCost(aircraft.type);
                        // Don't add back to hangar - they're destroyed!
                        console.log(`💥 ${aircraft.name} destroyed - ${aircraftLoss} aircraft lost from ${carrier.customName || carrier.shipClass}`);
                    }

                    // Award kill XP
                    if (aaEntity.type === 'player' && global.navalBot.levelingSystem) {
                        const killXP = await global.navalBot.levelingSystem.awardCombatXP(
                            shooter.id,
                            `aa_${aa.caliber}`,
                            'kill',
                            null,
                        );

                        aa.experience += killXP || 0;
                        await this.checkAALevelUp(shooter, aa);

                        // Track MVP stat for aircraft kill
                        game.trackMVPAction(shooter.id, 'aircraftKill');
                    }

                    // Remove from active aircraft
                    game.aircraft.delete(aircraft.id);
                }
            }
        }
        
        // Generate message if there was activity
        if (totalShots > 0) {
            let message = `🎯 ${entityName} fires ${aa.name}! `;
            message += `${totalShots} rounds fired, ${totalHits} hits`;
            
            if (destroyedAircraft.length > 0) {
                message += `\n💥 Shot down: ${destroyedAircraft.join(', ')}`;
            }
            
            if (aa.ammo <= 0) {
                message += `\n🔴 ${entityName} ${aa.name} ammunition exhausted!`;
            }
            
            return { message, hits: totalHits, destroyed: destroyedAircraft.length };
        }
        
        return { message: null, hits: 0, destroyed: 0 };
    }

    getAircraftHangarCost(aircraftType) {
        const costs = {
            'fighter': 1,
            'dive_bomber': 1,
            'torpedo_bomber': 1
        };
        return costs[aircraftType] || 1;
    }

    // Add AA level up checking method
    async checkAALevelUp(player, aaSystem) {
        // Experience required for each level (exponential growth)
        const expRequired = [
            0,     // Level 1
            100,   // Level 2
            250,   // Level 3
            450,   // Level 4
            700,   // Level 5
            1000,  // Level 6
            1350,  // Level 7
            1750,  // Level 8
            2200,  // Level 9
            2700   // Level 10 (max)
        ];
        
        const currentLevel = aaSystem.experienceLevel;
        
        // Check if eligible for level up
        if (currentLevel < 10 && aaSystem.experience >= expRequired[currentLevel]) {
            const oldEfficiency = aaSystem.efficiency;
            
            // Level up!
            aaSystem.experienceLevel++;
            
            // Update efficiency and stats
            if (global.navalBot.playerCreation) {
                global.navalBot.playerCreation.updateAAEfficiency(aaSystem);
            }
            
            const newEfficiency = aaSystem.efficiency;
            
            // Save player data
            if (global.navalBot.savePlayerData) {
                global.navalBot.savePlayerData();
            }
            
            // Notify player of level up (if in game)
            const game = Array.from(global.navalBot.games.values()).find(g => g.players.has(player.id));
            if (game) {
                const channel = global.navalBot.client.channels.cache.get(game.channelId);
                if (channel) {
                    const levelUpMessage = `🎯 **AA CREW LEVEL UP!**\n` +
                        `<@${player.id}>'s ${aaSystem.name} crew reached **Level ${aaSystem.experienceLevel}**!\n` +
                        `**Efficiency:** ${oldEfficiency.toFixed(1)}% → ${newEfficiency.toFixed(1)}%\n` +
                        `**Range:** ${aaSystem.range} cells | **Damage:** ${aaSystem.damage} | **Accuracy:** ${(aaSystem.accuracy * 100).toFixed(1)}%`;
                    
                    await channel.send(levelUpMessage);
                }
            }
            
            return true; // Level up occurred
        }
        
        return false; // No level up
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                AIRCRAFT COMBAT                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async handleLaunchAircraft(interaction, player, game) {

        // Also get the player directly from the game
        const directPlayer = game.players.get(interaction.user.id);
        
        // Compare the two

        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }
        
        if (player.hangar <= 0) {
            return interaction.reply({ content: '❌ No aircraft available in hangar!', flags: MessageFlags.Ephemeral });
        }


        // Get ship class from character data if not available in player object
        let shipClass = player.shipClass;
        if (!shipClass) {
            const playerEntry = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
            const activeCharacter = playerEntry?.characters?.get(playerEntry?.activeCharacter);
            shipClass = activeCharacter?.shipClass;

            if (!shipClass) {
                console.error('❌ Player shipClass is undefined:', player);
                return interaction.reply({ content: '❌ Ship class not found!', flags: MessageFlags.Ephemeral });
            }
        }

        // Get player's available aircraft types from character data
        const playerEntry = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
        const activeCharacter = playerEntry?.characters?.get(playerEntry?.activeCharacter);
        
        if (!activeCharacter?.availableAircraft || activeCharacter.availableAircraft.size === 0) {
            return interaction.reply({ content: '❌ No aircraft types available! Contact GM to assign aircraft.', flags: MessageFlags.Ephemeral });
        }


        const squadronSize = this.carrierSystem.getSquadronSize(shipClass);
        const isLightCarrier = squadronSize === 6;

        // Build aircraft buttons based on AVAILABLE aircraft types only
        const aircraftButtons = [];

        // Check each active squadron (selected during join) and create buttons
        if (!activeCharacter.activeSquadrons || activeCharacter.activeSquadrons.size === 0) {
            return interaction.reply({ 
                content: '❌ No squadrons selected! You need to join the battle first to select your squadrons.',
                flags: MessageFlags.Ephemeral 
            });
        }

        for (const [squadronId, squadron] of activeCharacter.activeSquadrons.entries()) {
            const aircraftType = squadron.aircraftType;
            
            // Check if this specific squadron is already deployed
            const isDeployed = Array.from(game.aircraft?.values() || []).some(aircraft =>
                aircraft.carrierID === interaction.user.id &&
                aircraft.squadronId === squadronId &&
                aircraft.alive
            );
            
            
            // Extract just the number from squadronId (remove "squadron_" prefix)
            const squadronNumber = squadronId.replace('squadron_', '');
            
            let buttonLabel, buttonStyle, buttonEmoji, customId;

            switch (aircraftType) {
                case 'fighters':
                    customId = `launch_fighters_${squadronNumber}_${interaction.user.id}`;
                    buttonLabel = isDeployed ? `${squadron.name} (DEPLOYED)` : `${squadron.name} (${squadronSize} aircraft)`;
                    buttonStyle = ButtonStyle.Primary;
                    buttonEmoji = '✈️';
                    break;
                case 'dive_bombers':
                    customId = `launch_dive_bombers_${squadronNumber}_${interaction.user.id}`;
                    buttonLabel = isDeployed ? `${squadron.name} (DEPLOYED)` : `${squadron.name} (${squadronSize} aircraft)`;
                    buttonStyle = ButtonStyle.Danger;
                    buttonEmoji = '💣';
                    break;
                case 'torpedo_bombers':
                    customId = `launch_torpedo_bombers_${squadronNumber}_${interaction.user.id}`;
                    buttonLabel = isDeployed ? `${squadron.name} (DEPLOYED)` : `${squadron.name} (${squadronSize} aircraft)`;
                    buttonStyle = ButtonStyle.Danger;
                    buttonEmoji = '🚀';
                    break;
            }

            aircraftButtons.push(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(buttonLabel)
                    .setStyle(buttonStyle)
                    .setEmoji(buttonEmoji)
                    .setDisabled(player.hangar < squadronSize || isDeployed)
            );
        }  // ← ADD THIS CLOSING BRACE for the for loop

        // Add cancel button
        aircraftButtons.push(
            new ButtonBuilder()
                .setCustomId(`launch_cancel_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        if (aircraftButtons.length === 1) { // Only cancel button
            return interaction.reply({ 
                content: '❌ No aircraft squadrons available to launch!',
                flags: MessageFlags.Ephemeral 
            });
        }

        const actionRows = [];
        for (let i = 0; i < aircraftButtons.length; i += 4) {
            actionRows.push(new ActionRowBuilder().addComponents(aircraftButtons.slice(i, i + 4)));
        }

        const carrierType = isLightCarrier ? 'Light Carrier (CVL)' : 'Fleet Carrier (CV)';

        // Build description showing only available aircraft types
        let aircraftTypesDescription = '**Available Aircraft Types:**\n';
        for (const [aircraftType, aircraftData] of activeCharacter.availableAircraft.entries()) {
            switch (aircraftType) {
                case 'fighters':
                    aircraftTypesDescription += `✈️ **Fighter:** ${aircraftData.name} - Anti-aircraft specialist\n`;
                    aircraftTypesDescription += `   • Range: ${aircraftData.range}, Damage: ${aircraftData.damage}, Special: ${aircraftData.specialAbility}\n`;
                    break;
                case 'dive_bombers':
                    aircraftTypesDescription += `💣 **Dive Bomber:** ${aircraftData.name} - Ships & aircraft\n`;
                    aircraftTypesDescription += `   • Range: ${aircraftData.range}, Damage: ${aircraftData.damage}, Special: ${aircraftData.specialAbility}\n`;
                    break;
                case 'torpedo_bombers':
                    aircraftTypesDescription += `🚀 **Torpedo Bomber:** ${aircraftData.name} - Ships only\n`;
                    aircraftTypesDescription += `   • Range: ${aircraftData.range}, Damage: ${aircraftData.damage}, Special: ${aircraftData.specialAbility}\n`;
                    break;
            }
        }

        aircraftTypesDescription += `\n**Special Features:**\n`;
        aircraftTypesDescription += `• Fighters auto-engage aircraft within range\n`;
        aircraftTypesDescription += `• Dive bombers can dogfight (manual DOGFIGHT button)\n`;
        aircraftTypesDescription += `• Torpedo bombers focus on ship attacks\n`;
        aircraftTypesDescription += `• Each squadron contains ${squadronSize} aircraft`;

        const launchEmbed = new EmbedBuilder()
            .setTitle('✈️ Launch Aircraft Squadron')
            .setDescription(`**${shipClass}** (${carrierType}) at **${player.position}**\n` +
                           `**Hangar Space:** ${player.hangar} aircraft remaining\n` +
                           `**Squadron Size:** ${squadronSize} aircraft per squadron\n\n` +
                           aircraftTypesDescription)
            .setColor(0x0099FF)
            .setFooter({ text: 'You can only launch aircraft types assigned by the GM' });

        await interaction.reply({ embeds: [launchEmbed], components: actionRows, flags: MessageFlags.Ephemeral });
    }

    async handleContinueAASetup(interaction) {
        const userId = interaction.customId.split('_')[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA setup!', flags: MessageFlags.Ephemeral });
        }
        
        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Initialize AA systems array
        if (!tempData.aaSystems) {
            tempData.aaSystems = [];
        }

        // Show AA range selection menu
        await this.showAARangeSelection(interaction, tempData);
    }

    async handleSkipAASetup(interaction) {
        const userId = interaction.customId.split('_')[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA setup!', flags: MessageFlags.Ephemeral });
        }
        
        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        // Set empty AA systems and finalize
        tempData.aaSystems = [];
        tempData.aaSystem = null;
        await this.finalizeCharacterWithoutAA(interaction);
    }

    async showAARangeSelection(interaction, tempData) {
        const embed = new EmbedBuilder()
            .setTitle('🎯 AA Gun Configuration')
            .setDescription(`**Character:** ${tempData.username}\n\n` +
                           `**Configure Anti-Aircraft guns by range:**\n` +
                           `• **Short Range (≤25mm):** Close-in defense, high rate of fire\n` +
                           `  - Calibers: 12.7mm, 20mm, 25mm\n` +
                           `• **Medium Range (28mm-57mm):** Main AA defense zone, balanced\n` +
                           `  - Calibers: 28mm, 37mm, 40mm, 57mm\n` +
                           `• **Long Range (76mm+):** Heavy guns, long range engagement\n` +
                           `  - Calibers: 76mm, 100mm, 102mm, 105mm, 113mm, 120mm, 127mm, 133mm\n\n` +
                           `**Note:** You can skip ranges your ship doesn't have and only configure what's appropriate.`)
            .setColor(0xFF6600);

        const shortRangeButton = new ButtonBuilder()
            .setCustomId(`configure_short_aa_${interaction.user.id}`)
            .setLabel('📍 Configure Short Range AA')
            .setStyle(ButtonStyle.Primary);

        const mediumRangeButton = new ButtonBuilder()
            .setCustomId(`configure_medium_aa_${interaction.user.id}`)
            .setLabel('🎯 Configure Medium Range AA')
            .setStyle(ButtonStyle.Primary);

        const longRangeButton = new ButtonBuilder()
            .setCustomId(`configure_long_aa_${interaction.user.id}`)
            .setLabel('🚀 Configure Long Range AA')
            .setStyle(ButtonStyle.Primary);

        const skipAllButton = new ButtonBuilder()
            .setCustomId(`skip_all_aa_${interaction.user.id}`)
            .setLabel('⏭️ Skip All AA (No AA Guns)')
            .setStyle(ButtonStyle.Secondary);

        const finishButton = new ButtonBuilder()
            .setCustomId(`finish_aa_config_${interaction.user.id}`)
            .setLabel('✅ Finish AA Configuration')
            .setStyle(ButtonStyle.Success);

        const firstRow = new ActionRowBuilder().addComponents(shortRangeButton, mediumRangeButton, longRangeButton);
        const secondRow = new ActionRowBuilder().addComponents(skipAllButton, finishButton);

        await interaction.reply({ 
            embeds: [embed],
            components: [firstRow, secondRow],
            flags: MessageFlags.Ephemeral 
        });
    }

    async handleAAConfigButtons(interaction) {
        const [action, range, , userId] = interaction.customId.split('_');
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your AA configuration!', flags: MessageFlags.Ephemeral });
        }

        const tempData = this.bot.tempPlayerData.get(userId);
        if (!tempData) {
            return interaction.reply({ content: '❌ Character creation session expired!', flags: MessageFlags.Ephemeral });
        }

        if (action === 'configure') {
            // Show AA creation form for specific range
            await this.showSpecificAACreationForm(interaction, tempData, range);
        } else if (action === 'skip') {
            if (range === 'all') {
                // Skip all AA
                tempData.aaSystems = [];
                tempData.aaSystem = null;
                await this.finalizeCharacterWithoutAA(interaction);
            }
        } else if (action === 'finish') {
            // Finish AA configuration
            await this.finalizeCharacterWithAA(interaction);
        }
    }

    async showSpecificAACreationForm(interaction, tempData, aaRange) {
        const rangeInfo = {
            'short': {
                title: 'Short Range AA (≤25mm)',
                calibers: '12.7mm, 20mm, 25mm',
                description: 'High rate of fire, close-in defense'
            },
            'medium': {
                title: 'Medium Range AA (28mm-57mm)',
                calibers: '28mm, 37mm, 40mm, 57mm',
                description: 'Balanced performance, main defense'
            },
            'long': {
                title: 'Long Range AA (76mm+)',
                calibers: '76mm, 100mm, 102mm, 105mm, 113mm, 120mm, 127mm, 133mm',
                description: 'High damage, long range engagement'
            }
        };

        const info = rangeInfo[aaRange];
        
        const modal = new ModalBuilder()
            .setCustomId(`create_aa_${aaRange}_${interaction.user.id}`)
            .setTitle(info.title);

        const caliberInput = new TextInputBuilder()
            .setCustomId('aa_caliber')
            .setLabel(`${aaRange.charAt(0).toUpperCase() + aaRange.slice(1)} Range Caliber`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Options: ${info.calibers}`)
            .setRequired(true)
            .setMaxLength(8);

        const barrelsInput = new TextInputBuilder()
            .setCustomId('aa_barrels')
            .setLabel('Number of Barrels')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4 (1-200 barrels)')
            .setRequired(true)
            .setMaxLength(3);

        const nameInput = new TextInputBuilder()
            .setCustomId('aa_name')
            .setLabel('AA System Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`${info.title} Battery`)
            .setRequired(true)
            .setMaxLength(50);

        const mountInput = new TextInputBuilder()
            .setCustomId('aa_mount')
            .setLabel('Mount Type')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('4 or quad (1/single, 2/twin, 4/quad, 6/sextuple, 8/octuple)')
            .setRequired(true)
            .setMaxLength(10);

        const experienceInput = new TextInputBuilder()
            .setCustomId('aa_experience')
            .setLabel('Crew Experience Level')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1 (1-10)')
            .setRequired(true)
            .setMaxLength(2);

        modal.addComponents(
            new ActionRowBuilder().addComponents(caliberInput),
            new ActionRowBuilder().addComponents(barrelsInput),
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(mountInput),
            new ActionRowBuilder().addComponents(experienceInput)
        );

        await interaction.showModal(modal);
    }

    async handleAircraftLaunchSelection(interaction, game) {
        const idParts = interaction.customId.split('_');
        let userId, aircraftType, squadronId;


        // Handle cancel button separately (format: launch_cancel_userId)
        if (interaction.customId.includes('launch_cancel_')) {
            const userId = idParts[idParts.length - 1];
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your aircraft launch!', flags: MessageFlags.Ephemeral });
            }
            
            return interaction.update({ 
                content: '✅ Aircraft launch cancelled.',
                components: [],
                embeds: [] 
            });
        }

        // Handle regular aircraft launch buttons
        if (idParts.length >= 4) {
            // Format: launch_torpedo_bombers_1_userId
            userId = idParts[idParts.length - 1];
            squadronId = idParts[idParts.length - 2];
            
            const startIndex = 1; // After "launch"
            const endIndex = idParts.length - 2; // Before squadron ID and user ID
            aircraftType = idParts.slice(startIndex, endIndex).join('_');
        }


        // Validate user ID for aircraft buttons
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your aircraft launch!', flags: MessageFlags.Ephemeral });
        }
        
        // Handle cancel
        if (aircraftType === 'cancel') {
            return interaction.update({ 
                content: '✅ Aircraft launch cancelled.',
                components: [],
                embeds: [] 
            });
        }
        
        // Continue with aircraft launch logic...
        const gamePlayer = game.players.get(interaction.user.id);
        if (!gamePlayer) {
            return interaction.reply({ content: '❌ You are not in this game!', flags: MessageFlags.Ephemeral });
        }
        
        
        // Validate player state
        if (!gamePlayer.alive || gamePlayer.actionPoints < 1) {
            return interaction.update({ content: '❌ Cannot launch aircraft!', embeds: [], components: [] });
        }

        // Get character data and validate available aircraft
        const playerEntry = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
        const activeCharacter = playerEntry?.characters?.get(playerEntry?.activeCharacter);
        
        
        if (!activeCharacter?.availableAircraft) {
            return interaction.update({ 
                content: '❌ No available aircraft data found!',
                embeds: [],
                components: [] 
            });
        }
        
        // Check if the player has this aircraft type available
        const aircraftTypeKey = aircraftType.replace(/_/g, '_'); // dive_bombers, torpedo_bombers, fighters
        const availableAircraftData = activeCharacter.availableAircraft.get(aircraftTypeKey);
        
        if (!availableAircraftData) {
            return interaction.update({ 
                content: `❌ Aircraft type "${aircraftType}" not available! You can only launch: ${Array.from(activeCharacter.availableAircraft.keys()).join(', ')}`,
                embeds: [],
                components: [] 
            });
        }
        
        // Get ship class from character data if not available in player object
        let shipClass = gamePlayer.shipClass || activeCharacter?.shipClass;
        
        if (!shipClass) {
            return interaction.update({ 
                content: '❌ Ship class not found!',
                embeds: [],
                components: [] 
            });
        }
        
        const squadronSize = this.carrierSystem.getSquadronSize(shipClass);
        
        // Use squadron size as hangar cost (simpler than complex calculation)
        const hangarCost = squadronSize;
        
        if (gamePlayer.hangar < hangarCost) {
            return interaction.update({ 
                content: `❌ Not enough hangar space! Need ${hangarCost}, have ${gamePlayer.hangar}`,
                embeds: [],
                components: [] 
            });
        }
        
        
        try {
            // Check if this aircraft type needs equipment selection
            const options = this.carrierSystem.getLaunchOptions ? this.carrierSystem.getLaunchOptions(shipClass, aircraftType) : {};
            
            if (Object.keys(options).length > 0) {
                await this.showEquipmentSelection(interaction, gamePlayer, game, aircraftType, squadronSize, hangarCost, availableAircraftData);
            } else {

                // Reconstruct the full squadron ID
                const fullSquadronId = `squadron_${squadronId}`;

                // Launch immediately with available aircraft data
                await this.launchAircraftSquadron(
                    interaction,
                    gamePlayer,
                    game,
                    aircraftType,
                    squadronSize,
                    hangarCost,
                    {},
                    availableAircraftData,  // ← Fixed variable name
                    fullSquadronId  // ← Now using full squadron ID
                );
            }
        } catch (error) {
            console.error('❌ Error during aircraft launch:', error);
            await interaction.update({ 
                content: `❌ Failed to launch aircraft: ${error.message}`,
                embeds: [],
                components: [] 
            });
        }
    }

    async showEquipmentSelection(interaction, player, game, aircraftType, squadronSize, hangarCost) {
        const equipmentButtons = [];
        
        if (aircraftType === 'fighter') {
            equipmentButtons.push(
                new ButtonBuilder()
                    .setCustomId(`equip_fighter_normal_${interaction.user.id}`)
                    .setLabel('Standard Fighter')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`equip_fighter_depth_${interaction.user.id}`)
                    .setLabel('Depth Charge Fighter')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else if (aircraftType === 'dive_bomber') {
            equipmentButtons.push(
                new ButtonBuilder()
                    .setCustomId(`equip_divebomb_ap_${interaction.user.id}`)
                    .setLabel('AP Bombs')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`equip_divebomb_he_${interaction.user.id}`)
                    .setLabel('HE Bombs')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        equipmentButtons.push(
            new ButtonBuilder()
                .setCustomId(`equip_cancel_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const equipRow = new ActionRowBuilder().addComponents(equipmentButtons);

        const equipEmbed = new EmbedBuilder()
            .setTitle(`🛠️ Configure ${aircraftType === 'fighter' ? 'Fighter' : 'Dive Bomber'} Squadron`)
            .setDescription(aircraftType === 'fighter' ? 
                `**Fighter Options:**\n` +
                `🔺 **Standard:** Anti-aircraft only, full effectiveness\n` +
                `💣 **Depth Charges:** Can attack submarines, -15% accuracy vs aircraft\n\n` +
                `**Auto-Engagement:** Fighters will automatically chase enemy aircraft within 10 squares` :
                
                `**Dive Bomber Loadout:**\n` +
                `💥 **AP Bombs:** +30% vs heavy ships, -60% vs light ships, no fire\n` +
                `🔥 **HE Bombs:** 35% fire chance, +20% vs Harbor Princess\n\n` +
                `**Squadron Size:** ${squadronSize} aircraft\n` +
                `**Hangar Cost:** ${hangarCost} aircraft`)
            .setColor(0xFF6600);

        // Store launch data for equipment callback
        if (!game.tempLaunchData) game.tempLaunchData = new Map();
        game.tempLaunchData.set(interaction.user.id, {
            aircraftType,
            squadronSize,
            hangarCost,
            player
        });

        await interaction.update({ embeds: [equipEmbed], components: [equipRow] });
    }

    async handleEquipmentSelection(interaction, game) {
        const parts = interaction.customId.split('_');
        const equipType = parts[1]; // fighter, divebomb
        const equipOption = parts[2]; // normal, depth, ap, he
        const userId = parts[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your equipment selection!', flags: MessageFlags.Ephemeral });
        }
        
        if (equipOption === 'cancel') {
            game.tempLaunchData?.delete(interaction.user.id);
            return interaction.update({ content: '❌ Aircraft launch cancelled.', embeds: [], components: [] });
        }
        
        const launchData = game.tempLaunchData?.get(interaction.user.id);
        if (!launchData) {
            return interaction.update({ content: '❌ Launch data expired. Please try again.', embeds: [], components: [] });
        }
        
        // Determine equipment options
        const equipment = {};
        if (equipType === 'fighter') {
            equipment.depthCharges = (equipOption === 'depth');
        } else if (equipType === 'divebomb') {
            equipment.bombType = equipOption; // 'ap' or 'he'
        }
        
        // Get the aircraft data from character
        const aircraftData = activeCharacter.availableAircraft.get(aircraftType);

        // Launch immediately with available aircraft data
        await this.launchAircraftSquadron(
            interaction,
            gamePlayer,
            game,
            aircraftType,
            squadronSize,
            hangarCost,
            {},
            aircraftData,
            squadronId  // ← Add this parameter
        );
                
        // Cleanup
        game.tempLaunchData.delete(interaction.user.id);
    }

    async launchAircraftSquadron(interaction, player, game, aircraftType, squadronSize, hangarCost, equipment, availableAircraftData, squadronId) {

        const aircraftTypeMapping = {
            'fighters': 'fighter',
            'dive_bombers': 'dive_bomber',
            'torpedo_bombers': 'torpedo_bomber'
        };

        const mappedType = aircraftTypeMapping[aircraftType] || aircraftType;

        const aircraft = this.carrierSystem.createAircraftSquadron(
            mappedType,
            squadronSize,
            player.position,
            'player',
            player.id,
            equipment,
        );


        if (!aircraft) {
            console.error('❌ createAircraftSquadron returned null/undefined');
            return interaction.update({ content: '❌ Failed to create aircraft squadron!', embeds: [], components: [] });
        }

        // Add squadron tracking to the aircraft
        aircraft.squadronId = squadronId; // squadronId should already be "squadron_2"

        // Initialize aircraft map if needed
        if (!game.aircraft) {
            game.aircraft = new Map();
        }

        game.aircraft.set(aircraft.id, aircraft);
        player.hangar -= hangarCost;
        player.actionPoints--;
        
        // Build launch message
        let equipmentText = '';
        if (equipment.depthCharges) {
            equipmentText = ' with depth charges';
        } else if (equipment.bombType) {
            equipmentText = ` with ${equipment.bombType.toUpperCase()} bombs`;
        }
        
        const playerName = GameUtils.getEntityName(player);
        const message = `✈️ **${aircraft.name}** launched${equipmentText} from **${playerName}**!\n` +
                       `🎯 Mission: Patrol at **${aircraft.position}**\n` +
                       `⛽ Fuel: ${aircraft.fuel}/${aircraft.maxFuel} turns\n` +
                       `🔫 Ammo: ${aircraft.ammo}/${aircraft.maxAmmo} attacks\n` +
                       `✈️ Hangar: ${player.hangar} aircraft remaining\n` +
                       `⚡ Action Points: **${player.actionPoints}**`;
        
        await interaction.update({ content: message, embeds: [], components: [] });
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    async processAircraftTurn(game, channel) {
        // First, check auto-engagements and CAP
        const autoMessages = this.carrierSystem.checkAutoEngagement(game);
        for (const message of autoMessages) {
            await channel.send(message);
        }
        
        const capMessages = this.carrierSystem.checkCAPEngagement(game);
        for (const message of capMessages) {
            await channel.send(message);
        }
        
        // Process each aircraft
        const aircraftToProcess = Array.from(game.aircraft.values()).filter(a => a.alive);
        
        for (const aircraft of aircraftToProcess) {
            // Process fuel and ammo consumption
            const resourceMessages = this.carrierSystem.processResources(aircraft, game);
            for (const message of resourceMessages) {
                await channel.send(message);
            }
            
            if (!aircraft.alive) {
                game.aircraft.delete(aircraft.id);
                continue;
            }
            
            // ENHANCED: Different processing for AI vs Player aircraft
            if (aircraft.owner === 'enemy' || aircraft.isAI) {
                await this.processAIAircraftTurn(aircraft, game, channel);
            } else {
                // Player aircraft - existing logic
                switch (aircraft.mission) {
                    case 'patrol':
                        await this.processPatrolMission(aircraft, game, channel);
                        break;
                    case 'cap':
                        await this.processCapMission(aircraft, game, channel);
                        break;
                    case 'attack':
                        await this.processAircraftAttackMission(aircraft, game, channel);
                        break;
                    case 'returning':
                        await this.processReturnMission(aircraft, game, channel);
                        break;
                }
            }
        }
    }

    async processAIAircraftTurn(aircraft, game, channel) {
        // Get movement range for this aircraft type
        const moveRange = aircraft.stats?.range || 8;
        let target = null;
        
        
        if (aircraft.type === 'fighter') {
            // Fighters prioritize enemy aircraft first, then ships
            target = GameUtils.findNearestPlayerAircraft(aircraft, game);
            if (!target) {
                target = GameUtils.findNearestPlayer(aircraft, game);
            }
        } else if (aircraft.type === 'dive_bomber' || aircraft.type === 'torpedo_bomber') {
            // Bombers prioritize ships
            target = GameUtils.findNearestPlayer(aircraft, game);
        }
        
        if (!target) {
            await this.processAIPatrolMission(aircraft, game);
            return;
        }
        
        const distance = game.calculateDistance(aircraft.position, target.position);
        const combatRange = aircraft.stats?.combatRange || 1;
        
        
        // If within attack range, attack
        if (distance <= combatRange && aircraft.ammo > 0) {
            const result = await this.executeAIAircraftAttack(aircraft, target, game);
            if (result.message) {
                // Add attack action to batch instead of sending immediately
                game.addAIAction({
                    type: 'attack',
                    message: result.message
                });
            }
            
            aircraft.ammo--;
            
            // Check if target was destroyed
            if (!target.alive && target.type && game.aircraft?.has(target.id)) {
                game.aircraft.delete(target.id);
            }
            
            // Return to carrier if out of ammo
            if (aircraft.ammo <= 0) {
                aircraft.mission = 'returning';
                // Add status action to batch instead of sending immediately
                game.addAIAction({
                    type: 'other',
                    message: `${aircraft.name} out of ammunition, returning to carrier`
                });
            }
            
        } else {
            // Move toward target using specific movement range
            this.moveAIAircraftToward(aircraft, target.position, game, moveRange);
            
            const newDistance = game.calculateDistance(aircraft.position, target.position);
        }
    }

    findNearestPlayerAircraft(aiAircraft, game) {
        const playerAircraft = Array.from(game.aircraft?.values() || []).filter(a => 
            a.alive && a.owner === 'player' && a.id !== aiAircraft.id
        );
        
        if (playerAircraft.length === 0) return null;
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const aircraft of playerAircraft) {
            const distance = game.calculateDistance(aiAircraft.position, aircraft.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = aircraft;
            }
        }
        
        return nearest;
    }

    async processPatrolMission(aircraft, game, channel) {
        // Only dive bombers and torpedo bombers actively seek targets during patrol
        // Fighters rely on auto-engagement
        
        if (aircraft.type === 'dive_bomber' || aircraft.type === 'torpedo_bomber') {
            const target = this.findSuitableTarget(aircraft, game);
            
            if (target && aircraft.ammo > 0) {
                const distance = game.calculateDistance(aircraft.position, target.position);
                
                if (distance <= aircraft.stats.combatRange) {
                    // Switch to attack mission
                    aircraft.mission = 'attack';
                    aircraft.target = target.id;
                    await this.processAircraftAttackMission(aircraft, game, channel);
                    return;
                } else if (distance <= aircraft.stats.range) {
                    // Move toward target
                    this.moveAircraftToward(aircraft, target.position, game);
                    return;
                }
            }
        }
        
        // Random patrol movement
        const currentPos = game.coordToNumbers(aircraft.position);
        const randomAngle = Math.random() * 2 * Math.PI;
        const moveDistance = aircraft.stats.range;
        
        const newX = Math.max(0, Math.min(99,
            currentPos.x + Math.round(Math.cos(randomAngle) * moveDistance)
        ));
        const newY = Math.max(1, Math.min(100,
            currentPos.y + Math.round(Math.sin(randomAngle) * moveDistance)
        ));

        // Calculate and store direction based on movement
        const dx = newX - currentPos.x;
        const dy = newY - currentPos.y;
        if (dx !== 0 || dy !== 0) {
            // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
            let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            aircraft.direction = angle;
        }

        aircraft.position = game.generateExtendedCoordinate(newX, newY);
    }

    async processAIPatrolMission(aircraft, game) {
        // Move toward general area where players are
        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
        
        if (alivePlayers.length > 0) {
            // Find center of player positions
            let avgX = 0, avgY = 0;
            alivePlayers.forEach(player => {
                const pos = game.coordToNumbers(player.position);
                avgX += pos.x;
                avgY += pos.y;
            });
            avgX = Math.floor(avgX / alivePlayers.length);
            avgY = Math.floor(avgY / alivePlayers.length);
            
            const targetPosition = game.generateExtendedCoordinate(avgX, avgY);
            this.moveAIAircraftToward(aircraft, targetPosition, game);
        } else {
            // Random patrol movement
            const currentPos = game.coordToNumbers(aircraft.position);
            const randomAngle = Math.random() * 2 * Math.PI;
            const moveDistance = aircraft.stats?.range || 10;
            
            const newX = Math.max(0, Math.min(99,
                currentPos.x + Math.round(Math.cos(randomAngle) * moveDistance)
            ));
            const newY = Math.max(1, Math.min(100,
                currentPos.y + Math.round(Math.sin(randomAngle) * moveDistance)
            ));

            // Calculate and store direction based on movement
            const dx = newX - currentPos.x;
            const dy = newY - currentPos.y;
            if (dx !== 0 || dy !== 0) {
                // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
                let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
                if (angle < 0) angle += 360;
                aircraft.direction = angle;
            }

            aircraft.position = game.generateExtendedCoordinate(newX, newY);
        }
    }

    findBestAITarget(aircraft, players, game) {
        let bestTarget = null;
        let bestScore = -1;
        
        for (const player of players) {
            const distance = game.calculateDistance(aircraft.position, player.position);
            let score = 0;
            
            // Scoring based on aircraft type preferences
            if (aircraft.type === 'fighter') {
                // Fighters prefer to attack aircraft first, then ships
                const playerAircraft = Array.from(game.aircraft?.values() || []).filter(a => 
                    a.alive && a.carrierID === player.id
                );
                
                if (playerAircraft.length > 0) {
                    score = 100 - distance; // High priority for aircraft
                } else {
                    score = 30 - distance; // Lower priority for ships
                }
                
            } else if (aircraft.type === 'dive_bomber') {
                // Dive bombers prefer all targets but favor closer ones
                score = 70 - distance;
                
                // Bonus for aircraft carriers
                if (player.shipClass.includes('Carrier')) {
                    score += 20;
                }
                
            } else if (aircraft.type === 'torpedo_bomber') {
                // Torpedo bombers prefer large ships
                score = 60 - distance;
                
                // Bonus for large ships
                if (player.shipClass.includes('Battleship')) {
                    score += 30;
                } else if (player.shipClass.includes('Carrier')) {
                    score += 25;
                } else if (player.shipClass.includes('Cruiser')) {
                    score += 15;
                }
            }
            
            // Penalize heavily damaged targets (finish off wounded enemies)
            const healthPercent = player.currentHealth / player.maxHealth;
            if (healthPercent < 0.3) {
                score += 25; // Bonus for finishing off damaged ships
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestTarget = player;
            }
        }
        
        return bestTarget;
    }

    moveAIAircraftToward(aircraft, targetPosition, game, moveRange = null) {
        const currentPos = this.coordToNumbers(aircraft.position);
        const targetPos = this.coordToNumbers(targetPosition);
        
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 1) return; // Already close enough
        
        // Use provided moveRange or fall back to aircraft stats
        const maxMove = moveRange || aircraft.stats?.range || 8;
        const moveDistance = Math.min(maxMove, distance);
        const moveRatio = moveDistance / distance;
        
        const newX = Math.max(0, Math.min(99,
            Math.round(currentPos.x + (dx * moveRatio))
        ));
        const newY = Math.max(1, Math.min(100,
            Math.round(currentPos.y + (dy * moveRatio))
        ));

        // Calculate and store direction based on movement
        if (dx !== 0 || dy !== 0) {
            // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
            let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            aircraft.direction = angle;
        }

        const oldPosition = aircraft.position;
        aircraft.position = game.generateExtendedCoordinate(newX, newY);
        
    }

    async processCapMission(aircraft, game, channel) {
        // Find the player being protected
        const protectedPlayer = game.players.get(aircraft.capTarget) || game.enemies.get(aircraft.capTarget);
        
        if (!protectedPlayer || !protectedPlayer.alive) {
            aircraft.mission = 'patrol';
            aircraft.capTarget = null;
            // Add status action to batch instead of sending immediately
            game.addAIAction({
                type: 'other',
                message: `${aircraft.name} CAP mission ended - protected unit lost`
            });
            return;
        }
        
        // Circle around protected player at optimal distance (5 squares)
        const targetDistance = 5;
        const currentDistance = game.calculateDistance(aircraft.position, protectedPlayer.position);
        
        if (Math.abs(currentDistance - targetDistance) > 2) {
            // Move to optimal CAP distance
            this.moveAircraftToward(aircraft, protectedPlayer.position, game, targetDistance);
        } else {
            // Orbit around protected player
            const angle = (game.turnNumber * 45) % 360; // Rotate 45 degrees per turn
            const radians = (angle * Math.PI) / 180;
            
            const protectedPos = game.coordToNumbers(protectedPlayer.position);
            const newX = Math.max(0, Math.min(99,
                protectedPos.x + Math.round(Math.cos(radians) * targetDistance)
            ));
            const newY = Math.max(1, Math.min(100,
                protectedPos.y + Math.round(Math.sin(radians) * targetDistance)
            ));

            // Calculate and store direction based on orbit movement
            const currentPos = game.coordToNumbers(aircraft.position);
            const dx = newX - currentPos.x;
            const dy = newY - currentPos.y;
            if (dx !== 0 || dy !== 0) {
                // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
                let directionAngle = Math.atan2(-dy, dx) * (180 / Math.PI);
                if (directionAngle < 0) directionAngle += 360;
                aircraft.direction = directionAngle;
            }

            aircraft.position = game.generateExtendedCoordinate(newX, newY);
        }
    }

    async processAircraftAttackMission(aircraft, game, channel) {
        // Find target
        let target = this.findTargetById(aircraft.target, game);
        
        if (!target || !target.alive) {
            // Target lost, return to appropriate mission
            aircraft.mission = aircraft.capTarget ? 'cap' : 'patrol';
            aircraft.target = null;
            return;
        }
        
        const distance = game.calculateDistance(aircraft.position, target.position);
        
        if (distance <= aircraft.stats.combatRange && aircraft.ammo > 0) {
            // Execute attack!
            const result = await this.executeAircraftAttack(aircraft, target, game);
            // Add attack action to batch instead of sending immediately
            game.addAIAction({
                type: 'attack',
                message: result.message
            });
            
            // Consume ammo
            aircraft.ammo--;
            
            // Check if target was destroyed
            if (!target.alive && target.type && game.aircraft?.has(target.id)) {
                game.aircraft.delete(target.id);
            }
            
            // Return to mission after attack
            if (aircraft.ammo <= 0) {
                aircraft.mission = 'returning';
                // Add status action to batch instead of sending immediately
                game.addAIAction({
                    type: 'other',
                    message: `${aircraft.name} out of ammo, returning to carrier`
                });
            } else {
                aircraft.mission = aircraft.capTarget ? 'cap' : 'patrol';
            }
            aircraft.target = null;
            
        } else if (distance <= aircraft.stats.range) {
            // Move closer to target
            this.moveAircraftToward(aircraft, target.position, game);
        } else {
            // Target out of range, abandon attack
            aircraft.mission = aircraft.capTarget ? 'cap' : 'patrol';
            aircraft.target = null;
        }
    }

    async processReturnMission(aircraft, game, channel) {
        // Find carrier
        const carrier = game.players.get(aircraft.carrierID) || game.enemies.get(aircraft.carrierID);
        
        if (!carrier || !carrier.alive) {
            // Carrier destroyed
            aircraft.alive = false;
            aircraft.mission = 'crashed';
            // Add status action to batch instead of sending immediately
            game.addAIAction({
                type: 'other',
                message: `${aircraft.name} lost - carrier destroyed`
            });
            game.aircraft.delete(aircraft.id);
            return;
        }
        
        const distance = game.calculateDistance(aircraft.position, carrier.position);
        
        if (distance <= 2) {
            // Attempt landing
            const landingResult = this.carrierSystem.attemptLanding(aircraft, carrier, game);
            if (landingResult) {
                await channel.send(landingResult);
                if (aircraft.mission === 'landed') {
                    game.aircraft.delete(aircraft.id); // Remove from active aircraft
                }
            }
        } else {
            // Move toward carrier
            this.moveAircraftToward(aircraft, carrier.position, game);
        }
    }

    async executeAircraftAttack(aircraft, target, game) {
        // Calculate accuracy with new mechanics
        let accuracy = aircraft.stats.accuracy / 100;
        
        // Distance penalty (closer = more accurate)
        const distance = game.calculateDistance(aircraft.position, target.position);
        const distancePenalty = (distance / aircraft.stats.combatRange) * 0.1;
        accuracy -= distancePenalty;
        
        // Evasion of target
        let targetEvasion = 0;
        if (target.stats?.evasion) {
            targetEvasion = target.stats.evasion / 100 * 0.3; // Aircraft are harder to hit
        } else if (target.speedKnots && target.tonnage) {
            targetEvasion = GameUtils.calculateShipEvasion(target.speedKnots, target.tonnage) / 100 * 0.2;
        }
        
        accuracy -= targetEvasion;
        accuracy = Math.max(0.1, Math.min(0.95, accuracy));
        
        // Check if attack hits
        if (Math.random() > accuracy) {
            return { 
                message: `💨 ${aircraft.name} missed ${target.customName || target.shipClass || target.name}!`,
                hit: false,
                damage: 0 
            };
        }
        
        // Calculate damage with new system
        const damage = this.carrierSystem.calculateAircraftDamage(aircraft, target);
        
        if (damage <= 0) {
            return { 
                message: `❌ ${aircraft.name} cannot attack ${target.customName || target.shipClass || target.name}!`,
                hit: false,
                damage: 0 
            };
        }
        
        // Apply damage
        target.currentHealth = Math.max(0, target.currentHealth - damage);
        
        let message = `✈️ ${aircraft.name} attacks ${target.customName || target.shipClass || target.name} for ${damage} damage!`;
        
        // Special effects
        if (aircraft.type === 'torpedo_bomber' && aircraft.floodingChance && Math.random() < aircraft.floodingChance) {
            target.flooding = true;
            target.floodTimer = 15;
            message += ' 🌊 Target is flooding!';
        }
        
        if (aircraft.type === 'dive_bomber' && aircraft.bombType === 'he' && Math.random() < 0.35) {
            target.onFire = true;
            target.fireTimer = 12;
            message += ' 🔥 Target is on fire!';
        }
        
        if (target.currentHealth <= 0) {
            target.alive = false;
            message += ` 💀 ${target.customName || target.shipClass || target.name} destroyed!`;

            // Track MVP stats if a player's aircraft shot down an enemy aircraft
            if (target.type && aircraft.carrierID) {
                // Check if the attacking aircraft belongs to a player
                const attackerCarrier = game.players.get(aircraft.carrierID);
                if (attackerCarrier) {
                    // Check if target is an aircraft (has a type like 'fighter', 'dive_bomber', etc.)
                    if (target.name && target.type && (target.type === 'fighter' || target.type === 'dive_bomber' || target.type === 'torpedo_bomber')) {
                        game.trackMVPAction(aircraft.carrierID, 'aircraftKill');
                    }
                }
            }
        }

        return { message, hit: true, damage };
    }

    async executeAIAircraftAttack(aircraft, target, game) {
        // Use existing aircraft attack system but with AI modifications
        const result = await this.executeAircraftAttack(aircraft, target, game);
        
        // Modify message to indicate AI aircraft
        if (result.message) {
            const aiCarrier = game.enemies.get(aircraft.carrierID);
            const carrierName = aiCarrier ? GameUtils.getAIDisplayName(aiCarrier) : 'AI Carrier';
            
            result.message = `${carrierName}'s ${aircraft.name} ${result.message.substring(result.message.indexOf('attacks'))}`;
        }
        
        return result;
    }

    async handleCAPAssignment(interaction, game) {
        const parts = interaction.customId.split('_');
        const targetPlayerId = parts[2];
        const userId = parts[3];
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your CAP assignment!', flags: MessageFlags.Ephemeral });
        }
        
        if (targetPlayerId === 'cancel') {
            return interaction.update({ content: '❌ CAP assignment cancelled.', embeds: [], components: [] });
        }
        
        const player = game.players.get(interaction.user.id);
        const targetPlayer = game.players.get(targetPlayerId);
        
        if (!player || !targetPlayer || !targetPlayer.alive || player.actionPoints < 1) {
            return interaction.update({ content: '❌ Cannot assign CAP!', embeds: [], components: [] });
        }
        
        // Find available fighters
        const availableFighters = Array.from(game.aircraft.values()).filter(a => 
            a.alive && a.type === 'fighter' && a.carrierID === player.id && 
            (a.mission === 'patrol' || a.mission === 'cap')
        );
        
        if (availableFighters.length === 0) {
            return interaction.update({ content: '❌ No available fighters for CAP!', embeds: [], components: [] });
        }
        
        // Assign all available fighters to CAP
        let assignedCount = 0;
        for (const fighter of availableFighters) {
            fighter.mission = 'cap';
            fighter.capTarget = targetPlayerId;
            assignedCount++;
        }
        
        player.actionPoints--;
        
        const message = `🛡️ **${assignedCount} Fighter Squadron(s)** assigned to protect **${targetPlayer.displayName || targetPlayer.shipClass}**!\n` +
                       `Fighters will intercept enemy aircraft within 10 squares of the protected unit.\n` +
                       `Action Points remaining: **${player.actionPoints}**`;
        
        await interaction.update({ content: message, embeds: [], components: [] });
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    async handleAircraftBomb(interaction, game, aircraftId) {
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || aircraft.carrierID !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found or not yours!', flags: MessageFlags.Ephemeral });
        }
        
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }
        
        if (aircraft.ammo <= 0) {
            return interaction.reply({ content: '❌ Aircraft is out of ammunition!', flags: MessageFlags.Ephemeral });
        }
        
        // Get valid bomb targets
        const targets = this.getEnemyShipsInRange(aircraft, game);
        
        if (targets.length === 0) {
            return interaction.reply({ content: '❌ No valid targets in range!', flags: MessageFlags.Ephemeral });
        }
        
        // Create target selection buttons
        const targetButtons = [];
        for (let i = 0; i < Math.min(targets.length, 20); i++) {
            const target = targets[i];
            const distance = game.calculateDistance(aircraft.position, target.position);
            const targetName = target.customName || target.shipClass || 'Unknown';
            const healthInfo = `${target.currentHealth}/${target.maxHealth}HP`;
            
            targetButtons.push(
                new ButtonBuilder()
                    .setCustomId(`bomb_target_${target.id}_${aircraftId}_${interaction.user.id}`)
                    .setLabel(`${targetName} (${distance.toFixed(1)}⚡ ${healthInfo})`)
                    .setStyle(ButtonStyle.Danger)
            );
        }
                
        // Add cancel button
        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`bomb_target_cancel_${aircraftId}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }
        
        const embed = new EmbedBuilder()
            .setTitle('💣 Select Bombing Target')
            .setDescription(`**${aircraft.name}** - Choose target for dive bombing:\n` +
                           `**Ammo:** ${aircraft.ammo}/${aircraft.maxAmmo}\n` +
                           `**Bomb Type:** ${aircraft.bombType || 'HE'}\n\n` +
                           `Select a target to attack:`)
            .setColor(0xFF0000);
        
        await interaction.update({ embeds: [embed], components: actionRows });
    }

    async handleAircraftTorpedo(interaction, game, aircraftId) {
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || aircraft.carrierID !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found or not yours!', flags: MessageFlags.Ephemeral });
        }
        
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }
        
        if (aircraft.ammo <= 0) {
            return interaction.reply({ content: '❌ Aircraft is out of torpedoes!', flags: MessageFlags.Ephemeral });
        }
        
        // Get valid torpedo targets (ships only)
        const targets = this.getEnemyShipsInRange(aircraft, game);
        
        if (targets.length === 0) {
            return interaction.reply({ content: '❌ No valid ship targets in range!', flags: MessageFlags.Ephemeral });
        }
        
        // Create target selection buttons
        const targetButtons = [];
        for (let i = 0; i < Math.min(targets.length, 20); i++) {
            const target = targets[i];
            const distance = game.calculateDistance(aircraft.position, target.position);
            const targetName = target.customName || target.shipClass || 'Unknown';
            const healthInfo = `${target.currentHealth}/${target.maxHealth}HP`;
            
            targetButtons.push(
                new ButtonBuilder()
                    .setCustomId(`torpedo_target_${target.id}_${aircraftId}_${interaction.user.id}`)
                    .setLabel(`${targetName} (${distance.toFixed(1)}⚡ ${healthInfo})`)
                    .setStyle(ButtonStyle.Danger)
            );
        }
        
        // Add cancel button
        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`torpedo_target_cancel_${aircraftId}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🚀 Select Torpedo Target')
            .setDescription(`**${aircraft.name}** - Choose target for torpedo attack:\n` +
                           `**Torpedoes:** ${aircraft.ammo}/${aircraft.maxAmmo}\n` +
                           `**Flooding Chance:** ${(aircraft.floodingChance || 0.4) * 100}%\n\n` +
                           `Select a ship to attack:`)
            .setColor(0xFF0000);
        
        await interaction.update({ embeds: [embed], components: actionRows });
    }

    async handleAircraftDogfight(interaction, game, aircraftId) {
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || aircraft.carrierID !== interaction.user.id) {
            return interaction.reply({ content: '❌ Aircraft not found or not yours!', flags: MessageFlags.Ephemeral });
        }
        
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }
        
        if (aircraft.ammo <= 0) {
            return interaction.reply({ content: '❌ Aircraft is out of ammunition!', flags: MessageFlags.Ephemeral });
        }
        
        // Get valid aircraft targets
        const targets = this.getEnemyAircraftInRange(aircraft, game);
        
        if (targets.length === 0) {
            return interaction.reply({ content: '❌ No enemy aircraft in range!', flags: MessageFlags.Ephemeral });
        }
        
        // Create target selection buttons
        const targetButtons = [];
        for (let i = 0; i < Math.min(targets.length, 20); i++) {
            const target = targets[i];
            const distance = game.calculateDistance(aircraft.position, target.position);
            const targetName = target.name || 'Unknown Aircraft';
            
            targetButtons.push(
                new ButtonBuilder()
                    .setCustomId(`dogfight_target_${target.id}_${aircraftId}_${interaction.user.id}`)
                    .setLabel(`${targetName} (${distance.toFixed(1)}⚡)`)
                    .setStyle(ButtonStyle.Danger)
            );
        }
        
        // Add cancel button
        targetButtons.push(
            new ButtonBuilder()
                .setCustomId(`dogfight_target_cancel_${aircraftId}_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRows = [];
        for (let i = 0; i < targetButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(targetButtons.slice(i, i + 5)));
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎯 Select Dogfight Target')
            .setDescription(`**${aircraft.name}** - Choose enemy aircraft to engage:\n` +
                           `**Ammo:** ${aircraft.ammo}/${aircraft.maxAmmo}\n` +
                           `**Guns:** 20mm cannon\n\n` +
                           `Select an aircraft to attack:`)
            .setColor(0xFF0000);
        
        await interaction.update({ embeds: [embed], components: actionRows });
    }

    async handleAircraftAttack(interaction, game) {
        const parts = interaction.customId.split('_');
        const attackType = parts[0]; // bomb, torpedo, or dogfight
        
        // For format: bomb_target_{targetId}_{aircraftId}_{userId}
        // We need to handle target IDs that might contain underscores
        
        // Get the last part (userId)
        const userId = parts[parts.length - 1];
        
        // Find where aircraftId starts (it begins with "aircraft_")
        let aircraftIdIndex = -1;
        for (let i = 2; i < parts.length - 1; i++) {
            if (parts[i] === 'aircraft') {
                aircraftIdIndex = i;
                break;
            }
        }
        
        if (aircraftIdIndex === -1) {
            console.error('Could not find aircraft ID in button:', interaction.customId);
            return interaction.reply({ content: '❌ Invalid button format!', flags: MessageFlags.Ephemeral });
        }
        
        // Reconstruct the IDs
        const targetId = parts.slice(2, aircraftIdIndex).join('_');
        const aircraftId = parts.slice(aircraftIdIndex, parts.length - 1).join('_');
        
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your target selection!', flags: MessageFlags.Ephemeral });
        }
        
        // Handle cancel
        if (targetId === 'cancel') {
            return interaction.update({ 
                content: '❌ Attack cancelled.',
                components: [],
                embeds: [] 
            });
        }
            
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || !player || player.actionPoints < 1) {
            return interaction.update({ 
                content: '❌ Cannot execute attack!',
                components: [],
                embeds: [] 
            });
        }
        
        // Find target
        let target;
        if (attackType === 'dogfight') {
            target = game.aircraft?.get(targetId);
        } else {
            target = game.enemies.get(targetId) || game.players.get(targetId);
        }
        
        if (!target || !target.alive) {
            return interaction.update({ 
                content: '❌ Target not found or destroyed!',
                components: [],
                embeds: [] 
            });
        }
        
        // Execute the attack
        const result = await global.navalBot.executeAircraftAttack(aircraft, target, game);

        // Track MVP stats for aircraft kills in dogfights
        if (attackType === 'dogfight' && result.hit && !target.alive) {
            game.trackMVPAction(interaction.user.id, 'aircraftKill');
        }

        // Consume resources
        aircraft.ammo--;
        player.actionPoints--;

        // Clear aircraft selection after attack
        if (game.selectedAircraft) {
            game.selectedAircraft.delete(interaction.user.id);
        }

        await interaction.update({
            content: `${result.message}\n\n**Action Points Remaining:** ${player.actionPoints}`,
            components: [],
            embeds: []
        });
        
        // Update map display
        await global.navalBot.updateGameDisplay(game, interaction.channel);
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            global.navalBot.endPlayerTurn(player);
        }
    }

    findSuitableTarget(aircraft, game) {
        const potentialTargets = [];
        
        // Determine valid targets based on aircraft type
        if (aircraft.type === 'fighter') {
            // Fighters: Aircraft only (unless depth charges for subs)
            for (const otherAircraft of game.aircraft.values()) {
                if (otherAircraft.owner !== aircraft.owner && otherAircraft.alive) {
                    potentialTargets.push(otherAircraft);
                }
            }
            
            if (aircraft.depthCharges) {
                // Can also target submarines
                const submarines = aircraft.owner === 'player' ? 
                    Array.from(game.enemies.values()).filter(e => e.alive && e.shipClass.includes('Submarine')) :
                    Array.from(game.players.values()).filter(p => p.alive && p.shipClass.includes('Submarine'));
                potentialTargets.push(...submarines);
            }
            
        } else if (aircraft.type === 'dive_bomber') {
            // Dive bombers: Ships and aircraft
            if (aircraft.owner === 'player') {
                potentialTargets.push(...Array.from(game.enemies.values()).filter(e => e.alive));
            } else {
                potentialTargets.push(...Array.from(game.players.values()).filter(p => p.alive));
            }
            
            // Add aircraft targets
            for (const otherAircraft of game.aircraft.values()) {
                if (otherAircraft.owner !== aircraft.owner && otherAircraft.alive) {
                    potentialTargets.push(otherAircraft);
                }
            }
            
        } else if (aircraft.type === 'torpedo_bomber') {
            // Torpedo bombers: Ships at sea only (no installations)
            if (aircraft.owner === 'player') {
                potentialTargets.push(...Array.from(game.enemies.values()).filter(e => 
                    e.alive && e.shipClass && !this.carrierSystem.isInstallation(e)
                ));
            } else {
                potentialTargets.push(...Array.from(game.players.values()).filter(p => 
                    p.alive && p.shipClass && !this.carrierSystem.isInstallation(p)
                ));
            }
        }
        
        // Find closest target
        let nearestTarget = null;
        let minDistance = Infinity;
        
        for (const target of potentialTargets) {
            const distance = game.calculateDistance(aircraft.position, target.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = target;
            }
        }
        
        return nearestTarget;
    }

    moveAircraftToward(aircraft, targetPosition, game, stopDistance = 0) {
        const currentPos = game.coordToNumbers(aircraft.position);
        const targetPos = game.coordToNumbers(targetPosition);
        
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If close enough to stop distance, don't move closer
        if (distance <= stopDistance) {
            return;
        }
        
        // Calculate movement within range limit
        const moveDistance = Math.min(aircraft.stats.range, distance - stopDistance);
        
        if (moveDistance <= 0) {
            return;
        }
        
        // Calculate new position
        const moveRatio = moveDistance / distance;
        const newX = Math.max(0, Math.min(99,
            Math.round(currentPos.x + (dx * moveRatio))
        ));
        const newY = Math.max(1, Math.min(100,
            Math.round(currentPos.y + (dy * moveRatio))
        ));

        // Calculate and store direction based on movement
        if (dx !== 0 || dy !== 0) {
            // Calculate angle in degrees (0° = East, 90° = North, 180° = West, 270° = South)
            let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            aircraft.direction = angle;
        }

        aircraft.position = game.generateExtendedCoordinate(newX, newY);
    }

    findTargetById(targetId, game) {
        return game.players.get(targetId) || 
               game.enemies.get(targetId) || 
               game.aircraft?.get(targetId) ||
               null;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              AIRCRAFT MOVEMENT                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async moveAircraft(interaction) {
        try {
            const game = this.games.get(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
            }

            const player = game.players.get(interaction.user.id);
            if (!player || !player.alive || player.actionPoints < 1) {
                return interaction.reply({ content: '❌ Cannot move aircraft - not in game, dead, or no action points!', flags: MessageFlags.Ephemeral });
            }

            // ADD DEBUGGING
            if (game.selectedAircraft) {
            }

            // Check if player has selected an aircraft
            const selectedAircraftId = game.selectedAircraft?.get(interaction.user.id);
            if (!selectedAircraftId) {
                return interaction.reply({ 
                    content: '❌ No aircraft selected! Use the **Move Aircraft** button first to select which squadron to move.',
                    flags: MessageFlags.Ephemeral 
                });
            }

            const targetPosition = interaction.options.getString('coordinate').toUpperCase();

            // Find the selected aircraft
            const aircraft = game.aircraft?.get(selectedAircraftId);
            if (!aircraft || !aircraft.alive || aircraft.carrierID !== interaction.user.id) {
                // Clear invalid selection
                game.selectedAircraft?.delete(interaction.user.id);
                return interaction.reply({ 
                    content: '❌ Selected aircraft not found or destroyed! Please select an aircraft again using the **Move Aircraft** button.',
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Validate position format
            if (!this.isValidPosition(targetPosition)) {
                return interaction.reply({ 
                    content: '❌ Invalid position format! Use format like A5, B10, etc.',
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Calculate distance
            const distance = game.calculateDistance(aircraft.position, targetPosition);
            const maxRange = aircraft.stats?.range || 10;
            
            if (distance > maxRange) {
                return interaction.reply({ 
                    content: `❌ Target position too far! **${aircraft.name}** range: ${maxRange}, distance: ${distance.toFixed(1)} cells`,
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Check if position is valid on the map
            if (!this.isPositionOnMap(targetPosition, game)) {
                return interaction.reply({ 
                    content: '❌ Position is outside the map boundaries!',
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Move the aircraft
            const oldPosition = aircraft.position;
            aircraft.position = targetPosition;
            player.actionPoints--;

            // Clear the selection after successful move
            game.selectedAircraft?.delete(interaction.user.id);

            // Award equipment XP for aircraft movement
            if (this.levelingSystem) {
                await this.levelingSystem.awardCombatXP(
                    player.id,
                    `aircraft_${aircraft.type}`,
                    'use',
                    interaction.channel,
                );
            }

            await interaction.reply({ 
                content: `✈️ **${aircraft.name}** moved from ${oldPosition} to ${targetPosition}\n` +
                        `**Distance:** ${distance.toFixed(1)} cells\n` +
                        `**Action Points Remaining:** ${player.actionPoints}`
                
            });

            // Update map display
            await this.updateGameDisplay(game, interaction.channel);

            // End turn if no AP left
            if (player.actionPoints <= 0) {
                this.endPlayerTurn(player);
            }

        } catch (error) {
            console.error('❌ Error in moveAircraft:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ An error occurred while moving aircraft!', flags: MessageFlags.Ephemeral });
            }
        }
    }

    async showAircraftMoveSelection(interaction, player, game) {
        if (player.actionPoints < 1) {
            return interaction.reply({ content: '❌ Not enough Action Points!', flags: MessageFlags.Ephemeral });
        }

        // Get player's active aircraft from the game's aircraft map
        const playerAircraft = Array.from(game.aircraft?.values() || []).filter(a => 
            a.alive && a.carrierID === player.id
        );

        if (playerAircraft.length === 0) {
            return interaction.reply({ 
                content: '❌ No active aircraft to move! Launch aircraft first using the Launch Aircraft button.',
                flags: MessageFlags.Ephemeral 
            });
        }

        // If only one squadron, STILL NEED TO STORE THE SELECTION
        if (playerAircraft.length === 1) {
            // Initialize selectedAircraft map if needed
            if (!game.selectedAircraft) {
                game.selectedAircraft = new Map();
            }
            
            // Store the selection
            game.selectedAircraft.set(interaction.user.id, playerAircraft[0].id);
            
            // Now show movement options
            await this.showSingleAircraftMovement(interaction, playerAircraft[0], player, game);
            return;
        }

        // Multiple squadrons - show selection (existing code)
        const squadronButtons = playerAircraft.map(aircraft => {
            const distanceToCarrier = game.calculateDistance(aircraft.position, player.position);
            const canLand = distanceToCarrier <= 2;
            
            return new ButtonBuilder()
                .setCustomId(`select_squadron_move_${aircraft.id}_${interaction.user.id}`)
                .setLabel(`${aircraft.name} at ${aircraft.position}${canLand ? ' (Can Land)' : ''}`)
                .setStyle(canLand ? ButtonStyle.Success : ButtonStyle.Primary)
        });

        squadronButtons.push(
            new ButtonBuilder()
                .setCustomId(`cancel_aircraft_move_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const actionRows = [];
        for (let i = 0; i < squadronButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(squadronButtons.slice(i, i + 5)));
        }

        const aircraftList = playerAircraft.map(aircraft => {
            const distanceToCarrier = game.calculateDistance(aircraft.position, player.position);
            const canLand = distanceToCarrier <= 2;
            return `**${aircraft.name}:**\n` +
                   `• Position: ${aircraft.position}\n` +
                   `• Range: ${aircraft.stats?.range || 10} cells\n` +
                   `• Distance to carrier: ${distanceToCarrier.toFixed(1)} cells\n` +
                   `• ${canLand ? '✅ Can land' : '❌ Too far to land'}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('✈️ Select Aircraft Squadron to Move')
            .setDescription(`Choose which aircraft squadron to move:\n\n${aircraftList}`)
            .setColor(0x0099FF)
            .setFooter({ text: 'Select a squadron to see movement options' });

        await interaction.reply({
            embeds: [embed],
            components: actionRows,
            flags: MessageFlags.Ephemeral
        });
    }

    async handleSquadronMoveSelection(interaction, game) {
        const parts = interaction.customId.split('_');
        const userId = parts[parts.length - 1];
        const aircraftId = interaction.customId.replace('select_squadron_move_', '').replace(`_${userId}`, '');
        
        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your squadron selection!', flags: MessageFlags.Ephemeral });
        }

        const aircraft = game.aircraft?.get(aircraftId);
        if (!aircraft || !aircraft.alive) {
            return interaction.update({
                content: '❌ Aircraft not found or destroyed!',
                components: [],
                embeds: []
            });
        }

        const player = game.players.get(interaction.user.id);
        if (!player || player.actionPoints < 1) {
            return interaction.update({
                content: '❌ Not enough Action Points!',
                components: [],
                embeds: []
            });
        }

        // Store selected aircraft in a temporary map for the moveair command
        if (!game.selectedAircraft) {
            game.selectedAircraft = new Map();
        }
        game.selectedAircraft.set(interaction.user.id, aircraftId);
        
        // ADD THIS: Log to confirm selection is stored

        await this.showSingleAircraftMovement(interaction, aircraft, player, game);
    }

    async showSingleAircraftMovement(interaction, aircraft, player, game) {
        
        const validMoves = this.getValidAircraftMoves(aircraft, game);
        const distanceToCarrier = game.calculateDistance(aircraft.position, player.position);
        const canLand = distanceToCarrier <= 2;
        
        // Create action rows array
        const actionRows = [];
        
        // Check for valid targets based on aircraft type
        const attackButtons = [];
        
        if (aircraft.type === 'dive_bomber') {
            // Check for enemy ships in range
            const enemyShipsInRange = this.getEnemyShipsInRange(aircraft, game);
            
            if (enemyShipsInRange.length > 0) {
                attackButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_bomb_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`💣 BOMB (${enemyShipsInRange.length} targets)`)
                        .setStyle(ButtonStyle.Danger)
                );
            }
            
            // Check for enemy aircraft in range
            const enemyAircraftInRange = this.getEnemyAircraftInRange(aircraft, game);
            
            if (enemyAircraftInRange.length > 0) {
                attackButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_dogfight_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`🎯 DOGFIGHT (${enemyAircraftInRange.length} targets)`)
                        .setStyle(ButtonStyle.Danger)
                );
            }
        } else if (aircraft.type === 'torpedo_bomber') {
            // Check for enemy ships in range
            const enemyShipsInRange = this.getEnemyShipsInRange(aircraft, game);
            
            if (enemyShipsInRange.length > 0) {
                attackButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`aircraft_torpedo_${aircraft.id}_${interaction.user.id}`)
                        .setLabel(`🚀 TORPEDO (${enemyShipsInRange.length} targets)`)
                        .setStyle(ButtonStyle.Danger)
                );
            }
        }
        
        // Add attack buttons if any
        if (attackButtons.length > 0) {
            actionRows.push(new ActionRowBuilder().addComponents(attackButtons));
        }
        
        // Add landing button if aircraft can land
        if (canLand) {
            const landButton = new ButtonBuilder()
                .setCustomId(`land_aircraft_${aircraft.id}_${interaction.user.id}`)
                .setLabel(`🛬 Land ${aircraft.name}`)
                .setStyle(ButtonStyle.Success);
            
            actionRows.push(new ActionRowBuilder().addComponents([landButton]));
        }
        
        // Split moves into multiple fields
        const movesPerField = 25;
        const maxFields = 25;
        const moveFields = [];
        
        for (let i = 0; i < validMoves.length && moveFields.length < maxFields; i += movesPerField) {
            const chunk = validMoves.slice(i, i + movesPerField);
            const moveList = chunk.map(move => `${move.coordinate} (${move.distance.toFixed(1)})`).join(', ');
            
            moveFields.push({
                name: i === 0 ? `Movement Options (${validMoves.length} total):` : `Continued (${i + 1}-${Math.min(i + movesPerField, validMoves.length)}):`,
                value: moveList,
                inline: false
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`✈️ Move ${aircraft.name}`)
            .setDescription(`**Current Position:** ${aircraft.position}\n` +
                           `**Movement Range:** ${aircraft.stats?.range || 10} cells\n` +
                           `**Distance to Carrier:** ${distanceToCarrier.toFixed(1)} cells\n` +
                           `**Can Land:** ${canLand ? '✅ Yes (use button below)' : '❌ No (too far)'}\n` +
                           `**Ammo:** ${aircraft.ammo}/${aircraft.maxAmmo}\n\n` +
                           `**🚁 To Move:** Use \`/moveair <coordinate>\` (e.g., \`/moveair B50\`)\n` +
                           `**Selected Squadron:** This squadron is now selected for movement.\n\n` +
                           `**Available Destinations:**`)
            .addFields(moveFields)
            .setColor(canLand ? 0x00FF00 : 0x0099FF);
        
        if (validMoves.length > movesPerField * maxFields) {
            embed.setFooter({ text: `Showing ${movesPerField * maxFields} of ${validMoves.length} possible destinations` });
        }
        
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed], components: actionRows });
        } else {
            await interaction.reply({ embeds: [embed], components: actionRows, flags: MessageFlags.Ephemeral });
        }
    }

    getEnemyShipsInRange(aircraft, game) {
        const targets = [];
        // Use the aircraft's range for combat range
        const attackRange = aircraft.stats?.range || aircraft.range || 10;
        
        
        // Check all enemies
        for (const enemy of game.enemies.values()) {
            
            // Check if this is actually a ship (not an aircraft)
            if (enemy.alive && enemy.shipClass && !enemy.owner) {
                const distance = game.calculateDistance(aircraft.position, enemy.position);
                
                if (distance <= attackRange) {
                    targets.push(enemy);
                } else {
                }
            }
        }
        
        return targets;
    }

    getEnemyAircraftInRange(aircraft, game) {
        const targets = [];
        // Use the aircraft's range for combat range
        const attackRange = aircraft.stats?.range || aircraft.range || 10;
        
        
        // Check all enemy aircraft
        for (const enemyAircraft of game.aircraft?.values() || []) {
            if (enemyAircraft.alive && enemyAircraft.owner === 'enemy' && enemyAircraft.id !== aircraft.id) {
                const distance = game.calculateDistance(aircraft.position, enemyAircraft.position);
                
                if (distance <= attackRange) {
                    targets.push(enemyAircraft);
                }
            }
        }
        
        return targets;
    }

    async handleAircraftMoveSelection(interaction, game) {
        const customId = interaction.customId;
        
        if (customId.includes('cancel_aircraft_move_')) {
            return interaction.update({
                content: '❌ Aircraft movement cancelled.',
                components: [],
                embeds: []
            });
        }
        
        // Parse: select_aircraft_move_aircraftId_userId
        // The userId is always the last part after the last underscore
        const parts = customId.split('_');
        const userId = parts[parts.length - 1];
        
        // Everything between "select_aircraft_move_" and the final userId is the aircraftId
        const aircraftId = customId.replace('select_aircraft_move_', '').replace(`_${userId}`, '');
        

        if (userId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your aircraft selection!', flags: MessageFlags.Ephemeral });
        }

        const aircraft = game.aircraft?.get(aircraftId);
        if (!aircraft || !aircraft.alive) {
            return interaction.update({
                content: '❌ Aircraft not found or destroyed!',
                components: [],
                embeds: []
            });
        }

        const player = game.players.get(interaction.user.id);
        if (!player || player.actionPoints < 1) {
            return interaction.update({
                content: '❌ Not enough Action Points!',
                components: [],
                embeds: []
            });
        }

        await this.showAircraftMovementOptions(interaction, aircraft, player, game);
    }

    async showAircraftMovementOptions(interaction, aircraft, player, game) {
        const validMoves = this.getValidAircraftMoves(aircraft, game);
        const distanceToCarrier = game.calculateDistance(aircraft.position, player.position);
        const canLand = distanceToCarrier <= 2;

        // Create movement buttons - limit to first 20 positions to avoid button limit
        const moveButtons = validMoves.slice(0, 20).map(move => 
            new ButtonBuilder()
                .setCustomId(`move_aircraft_to_${move.coordinate}_${aircraft.id}_${interaction.user.id}`)
                .setLabel(`${move.coordinate} (${move.distance.toFixed(1)})`)
                .setStyle(ButtonStyle.Primary)
        );

        // Add land button if in range
        if (canLand) {
            moveButtons.push(
                new ButtonBuilder()
                    .setCustomId(`land_aircraft_${aircraft.id}_${interaction.user.id}`)
                    .setLabel('🛬 Land on Carrier')
                    .setStyle(ButtonStyle.Success)
            );
        }

        // Add cancel button
        moveButtons.push(
            new ButtonBuilder()
                .setCustomId(`cancel_aircraft_move_${interaction.user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const actionRows = [];
        for (let i = 0; i < moveButtons.length; i += 5) {
            actionRows.push(new ActionRowBuilder().addComponents(moveButtons.slice(i, i + 5)));
        }

        // Split moves into chunks for display
        const movesPerField = 15;
        const moveFields = [];
        
        for (let i = 0; i < Math.min(validMoves.length, 45); i += movesPerField) {
            const chunk = validMoves.slice(i, i + movesPerField);
            const moveList = chunk.map(move => `${move.coordinate} (${move.distance.toFixed(1)})`).join(', ');
            
            moveFields.push({
                name: i === 0 ? `Movement Options (${validMoves.length} total):` : `Continued:`,
                value: moveList,
                inline: false
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`✈️ Move ${aircraft.name}`)
            .setDescription(`**Current Position:** ${aircraft.position}\n` +
                           `**Movement Range:** ${aircraft.stats?.range || 10} cells\n` +
                           `**Distance to Carrier:** ${distanceToCarrier.toFixed(1)} cells\n` +
                           `${canLand ? '✅ **Can land on carrier**' : '❌ **Too far from carrier to land**'}\n\n` +
                           `Click a coordinate to move there:`)
            .addFields(moveFields)
            .setColor(0x0099FF)
            .setFooter({ text: 'Showing first 20 movement options as buttons' });

        await interaction.update({ embeds: [embed], components: actionRows });
    }

    async handleAircraftMovementExecution(interaction, game) {
        const customId = interaction.customId;
        const parts = customId.split('_');
        
        if (customId.includes('move_aircraft_to_')) {
            // Format: move_aircraft_to_B50_aircraftId_userId
            const coordinate = parts[3];
            const aircraftId = parts[4];
            const userId = parts[5];
            
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your aircraft movement!', flags: MessageFlags.Ephemeral });
            }
            
            await this.executeAircraftMovement(interaction, game, aircraftId, coordinate);
            
        } else if (customId.includes('land_aircraft_')) {
            // Format: land_aircraft_aircraftId_userId
            const aircraftId = parts[2];
            const userId = parts[3];
            
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This is not your aircraft landing!', flags: MessageFlags.Ephemeral });
            }
            
            await this.executeAircraftLanding(interaction, game, aircraftId);
        }
    }

    async executeAircraftMovement(interaction, game, aircraftId, targetPosition) {
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || !player || player.actionPoints < 1) {
            return interaction.update({
                content: '❌ Cannot move aircraft!',
                components: [],
                embeds: []
            });
        }
        
        const oldPosition = aircraft.position;
        const distance = game.calculateDistance(oldPosition, targetPosition);
        
        // Move aircraft
        aircraft.position = targetPosition;
        player.actionPoints--;
        
        // Award equipment XP
        if (this.levelingSystem) {
            await this.levelingSystem.awardCombatXP(
                player.id,
                `aircraft_${aircraft.type}`,
                'use',
                interaction.channel,
            );
        }
        
        await interaction.update({
            content: `✅ **${aircraft.name}** moved from ${oldPosition} to ${targetPosition}\n` +
                    `**Distance:** ${distance.toFixed(1)} cells\n` +
                    `**Action Points Remaining:** ${player.actionPoints}`,
            components: [],
            embeds: []
        });
        
        // Update map display
        await this.updateGameDisplay(game, interaction.channel);
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    async executeAircraftLanding(interaction, game, aircraftId) {
        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive || !player || player.actionPoints < 1) {
            return interaction.update({
                content: '❌ Cannot land aircraft!',
                components: [],
                embeds: []
            });
        }
        
        const distance = game.calculateDistance(aircraft.position, player.position);
        if (distance > 2) {
            return interaction.update({
                content: '❌ Aircraft too far from carrier to land!',
                components: [],
                embeds: []
            });
        }
        
        // Land the aircraft
        const landingSuccessful = true; // You might want to add landing failure chances
    
        if (landingSuccessful) {
            const aircraftCost = this.getAircraftHangarCost(aircraft.type);
            player.hangar += aircraftCost; // Recovered successfully
            game.aircraft.delete(aircraft.id);
            
            player.actionPoints--;
            
            await interaction.update({
                content: `🛬 **${aircraft.name}** successfully landed on carrier!\n` +
                        `**Hangar Space:** ${player.hangar} aircraft\n` +
                        `**Action Points Remaining:** ${player.actionPoints}`,
                components: [],
                embeds: []
            });
        } else {
            // Landing failed - aircraft crashed
            game.aircraft.delete(aircraft.id);
            await interaction.update({
                content: `💥 **${aircraft.name}** crashed during landing!`,
                components: [],
                embeds: []
            });
        }
        
        // Remove from active aircraft
        game.aircraft.delete(aircraftId);
        
        await interaction.update({
            content: `🛬 **${aircraft.name}** successfully landed on carrier!\n` +
                    `**Hangar Space:** ${player.hangar} aircraft\n` +
                    `**Action Points Remaining:** ${player.actionPoints}`,
            components: [],
            embeds: []
        });
        
        // Update map display
        await this.updateGameDisplay(game, interaction.channel);
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    async handleAircraftLanding(interaction, game) {
        const customId = interaction.customId;
        
        // The customId format is: land_aircraft_aircraftId_userId
        const lastUnderscoreIndex = customId.lastIndexOf('_');
        
        const userId = customId.substring(lastUnderscoreIndex + 1);
        
        const prefix = 'land_aircraft_';
        const aircraftId = customId.substring(prefix.length, lastUnderscoreIndex);
        
        
        
        // Try trimming whitespace
        const trimmedUserId = userId.trim();
        
        if (trimmedUserId !== interaction.user.id) {
            return interaction.reply({ content: '❌ This is not your aircraft landing!', flags: MessageFlags.Ephemeral });
        }


        const aircraft = game.aircraft?.get(aircraftId);
        const player = game.players.get(interaction.user.id);
        
        if (!aircraft || !aircraft.alive) {
            return interaction.update({
                content: '❌ Aircraft not found or destroyed!',
                components: [],
                embeds: []
            });
        }
        
        if (!player || player.actionPoints < 1) {
            return interaction.update({
                content: '❌ Cannot land aircraft - no action points!',
                components: [],
                embeds: []
            });
        }
        
        const distanceToCarrier = game.calculateDistance(aircraft.position, player.position);
        
        if (distanceToCarrier > 2) {
            return interaction.update({
                content: '❌ Aircraft too far from carrier to land!',
                components: [],
                embeds: []
            });
        }
        
        // Land the aircraft
        const squadronSize = aircraft.squadronSize || 12;
        player.hangar += squadronSize;
        player.actionPoints--;
        
        // Remove from active aircraft
        game.aircraft.delete(aircraftId);
        
        // Clear the selection ONLY AFTER successful landing
        if (game.selectedAircraft?.get(interaction.user.id) === aircraftId) {
            game.selectedAircraft.delete(interaction.user.id);
        }
        
        
        // Award equipment XP for aircraft operations
        if (this.levelingSystem) {
            await this.levelingSystem.awardCombatXP(
                player.id,
                `aircraft_${aircraft.type}`,
                'use',
                interaction.channel,
            );
        }
        
        await interaction.update({
            content: `🛬 **${aircraft.name}** successfully landed on carrier!\n` +
                    `**Hangar Space:** ${player.hangar} aircraft\n` +
                    `**Action Points Remaining:** ${player.actionPoints}`,
            components: [],
            embeds: []
        });
        
        // Update map display
        await this.updateGameDisplay(game, interaction.channel);
        
        // End turn if no AP left
        if (player.actionPoints <= 0) {
            this.endPlayerTurn(player);
        }
    }

    getValidAircraftMoves(aircraft, game) {
        const validMoves = [];
        const currentPos = this.coordToNumbers(aircraft.position);
        const range = aircraft.stats?.range || 10;
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                
                // Use Chebyshev distance for aircraft too (diagonal = 1)
                const distance = Math.max(Math.abs(dx), Math.abs(dy));
                if (distance > range) continue;
                
                const newX = currentPos.x + dx;
                const newY = currentPos.y + dy;
                
                if (newX < 0 || newX >= 75 || newY < 1 || newY > 75) continue;
                
                const coordinate = game.generateExtendedCoordinate(newX, newY);
                
                // Aircraft can move to any position (they fly over terrain)
                validMoves.push({
                    coordinate: coordinate,
                    distance: distance
                });
            }
        }
        
        validMoves.sort((a, b) => a.distance - b.distance);
        return validMoves;
    }

    isValidPosition(position) {
        if (!position) return false;
        
        const coords = this.coordToNumbers(position);
        // If coordToNumbers returns {x: 0, y: 0} for invalid input, check if it was actually valid
        const match = position.match(/^([A-Z]+)(\d+)$/);
        return match !== null && coords.y > 0; // Valid if it matches pattern and has a row number
    }

    isPositionOnMap(position, game) {
        const coords = this.coordToNumbers(position);
        
        // Adjust these bounds based on your actual map size
        const maxCol = 526; // Adjust based on your max column (AA = 26, AAA = 702, etc.)
        const maxRow = 75; // Adjust based on your max row
        
        return coords.x >= 0 && coords.x <= maxCol && coords.y >= 1 && coords.y <= maxRow;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              CIVILIAN ENTITIES SYSTEM                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async processCivilianEntities(game, channel) {
        // Process civilian boats
        await this.processCivilianBoats(game, channel);

        // Process civilian aircraft
        await this.processCivilianAircraft(game, channel);

        // Spawn new civilians occasionally
        await this.spawnCivilianEntities(game, channel);
    }

    async processCivilianBoats(game, channel) {
        const boatsToRemove = [];

        for (const [id, boat] of game.civilianBoats) {
            // Handle docked boats
            if (boat.status === 'docked') {
                boat.dockingTurns--;
                if (boat.dockingTurns <= 0) {
                    boat.status = 'traveling';
                    boat.destination = boat.originalDestination || boat.destination;
                    await channel.send(`⛵ **${boat.name}** has departed the harbor and is continuing its journey`);
                }
            } else {
                // Move the boat
                this.moveCivilianBoat(boat, game, channel);
            }

            // Check if boat should be removed (reached destination or destroyed)
            if (this.shouldRemoveCivilianBoat(boat, game)) {
                boatsToRemove.push(id);
            }

            // Check if enemies attack this boat
            await this.checkEnemyAttacksOnCivilian(boat, game, channel, 'boat');
        }

        // Remove boats that have left the map or been destroyed
        for (const id of boatsToRemove) {
            game.civilianBoats.delete(id);
        }
    }

    async processCivilianAircraft(game, channel) {
        const aircraftToRemove = [];

        for (const [id, aircraft] of game.civilianAircraft) {
            // Handle landed aircraft
            if (aircraft.status === 'landed') {
                aircraft.landingTurns--;
                if (aircraft.landingTurns <= 0) {
                    aircraft.status = 'flying';
                    aircraft.destination = aircraft.originalDestination || aircraft.destination;
                    await channel.send(`🛫 **${aircraft.name}** has taken off and is continuing its flight`);
                }
            } else {
                // Move the aircraft
                this.moveCivilianAircraft(aircraft, game, channel);
            }

            // Check if aircraft should be removed
            if (this.shouldRemoveCivilianAircraft(aircraft, game)) {
                aircraftToRemove.push(id);
            }

            // Check if enemies attack this aircraft
            await this.checkEnemyAttacksOnCivilian(aircraft, game, channel, 'aircraft');
        }

        // Remove aircraft that have left the map or been destroyed
        for (const id of aircraftToRemove) {
            game.civilianAircraft.delete(id);
        }
    }

    async spawnCivilianEntities(game, channel) {
        const mapSize = 75;

        // Spawn civilian boats (3% chance per turn)
        if (Math.random() < 0.03 && game.civilianBoats.size < 5) {
            this.spawnCivilianBoat(game, mapSize);
        }

        // Spawn civilian aircraft (2% chance per turn)
        if (Math.random() < 0.02 && game.civilianAircraft.size < 3) {
            this.spawnCivilianAircraft(game, mapSize);
        }
    }

    spawnCivilianBoat(game, mapSize) {
        const boatTypes = [
            { name: 'Fishing Vessel', speed: 2, health: 5, icon: '🎣' },
            { name: 'Cargo Ship', speed: 1, health: 8, icon: '🚢' },
            { name: 'Passenger Ferry', speed: 3, health: 6, icon: '⛴️' },
            { name: 'Research Vessel', speed: 2, health: 4, icon: '🔬' },
            { name: 'Supply Ship', speed: 2, health: 7, icon: '📦' }
        ];

        const type = boatTypes[Math.floor(Math.random() * boatTypes.length)];
        const id = `civilian_boat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Spawn at random edge of map
        const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let startPos, destination;

        switch (edge) {
            case 0: // Top edge
                startPos = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}1`;
                destination = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}${mapSize}`;
                break;
            case 1: // Right edge
                startPos = `${String.fromCharCode(65 + mapSize - 1)}${Math.floor(Math.random() * mapSize) + 1}`;
                destination = `A${Math.floor(Math.random() * mapSize) + 1}`;
                break;
            case 2: // Bottom edge
                startPos = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}${mapSize}`;
                destination = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}1`;
                break;
            case 3: // Left edge
                startPos = `A${Math.floor(Math.random() * mapSize) + 1}`;
                destination = `${String.fromCharCode(65 + mapSize - 1)}${Math.floor(Math.random() * mapSize) + 1}`;
                break;
        }

        const boat = {
            id: id,
            name: type.name,
            type: 'civilian_boat',
            position: startPos,
            destination: destination,
            speed: type.speed,
            health: type.health,
            maxHealth: type.health,
            icon: type.icon,
            alive: true,
            moveCounter: 0,
            status: 'traveling',
            hasInteractedWithHarbor: false
        };

        game.civilianBoats.set(id, boat);
    }

    spawnCivilianAircraft(game, mapSize) {
        const aircraftTypes = [
            { name: 'Passenger Airliner', speed: 4, health: 3, icon: '✈️' },
            { name: 'Cargo Plane', speed: 3, health: 4, icon: '🛩️' },
            { name: 'Private Jet', speed: 5, health: 2, icon: '🛸' },
            { name: 'Mail Plane', speed: 4, health: 3, icon: '📬' }
        ];

        const type = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
        const id = `civilian_aircraft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Aircraft spawn and fly across the map
        const direction = Math.floor(Math.random() * 4);
        let startPos, destination;

        switch (direction) {
            case 0: // North to South
                startPos = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}1`;
                destination = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}${mapSize}`;
                break;
            case 1: // East to West
                startPos = `${String.fromCharCode(65 + mapSize - 1)}${Math.floor(Math.random() * mapSize) + 1}`;
                destination = `A${Math.floor(Math.random() * mapSize) + 1}`;
                break;
            case 2: // South to North
                startPos = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}${mapSize}`;
                destination = `${String.fromCharCode(65 + Math.floor(Math.random() * mapSize))}1`;
                break;
            case 3: // West to East
                startPos = `A${Math.floor(Math.random() * mapSize) + 1}`;
                destination = `${String.fromCharCode(65 + mapSize - 1)}${Math.floor(Math.random() * mapSize) + 1}`;
                break;
        }

        const aircraft = {
            id: id,
            name: type.name,
            type: 'civilian_aircraft',
            position: startPos,
            destination: destination,
            speed: type.speed,
            health: type.health,
            maxHealth: type.health,
            icon: type.icon,
            alive: true,
            moveCounter: 0,
            status: 'flying',
            hasInteractedWithAirport: false
        };

        game.civilianAircraft.set(id, aircraft);
    }

    async moveCivilianBoat(boat, game, channel) {
        boat.moveCounter++;

        // Move every X turns based on speed
        if (boat.moveCounter >= (6 - boat.speed)) {
            boat.moveCounter = 0;

            // Check for nearby harbors before moving
            const nearbyHarbors = this.findNearbyInfrastructure(game, boat.position, 'harbor');
            const harborToInteract = this.shouldInteractWithInfrastructure(boat, nearbyHarbors, 'boat');

            if (harborToInteract && !boat.hasInteractedWithHarbor) {
                boat.hasInteractedWithHarbor = true;
                await this.handleBoatHarborInteraction(boat, harborToInteract, game, channel);
                return; // Don't move this turn if interacting
            }

            // Calculate direction toward destination
            const currentCoords = game.coordToNumbers(boat.position);
            const destCoords = game.coordToNumbers(boat.destination);

            if (currentCoords && destCoords) {
                const dx = destCoords.x - currentCoords.x;
                const dy = destCoords.y - currentCoords.y;

                let newX = currentCoords.x;
                let newY = currentCoords.y;

                // Move toward destination
                if (Math.abs(dx) > Math.abs(dy)) {
                    newX += dx > 0 ? 1 : -1;
                } else if (dy !== 0) {
                    newY += dy > 0 ? 1 : -1;
                }

                // Ensure we stay in bounds
                if (newX >= 0 && newX < 75 && newY >= 1 && newY <= 75) {
                    boat.position = game.coordinateToString(newX, newY);
                }
            }
        }
    }

    async moveCivilianAircraft(aircraft, game, channel) {
        aircraft.moveCounter++;

        // Aircraft move faster than boats
        if (aircraft.moveCounter >= (6 - aircraft.speed)) {
            aircraft.moveCounter = 0;

            // Check for nearby airports before moving
            const nearbyAirports = this.findNearbyInfrastructure(game, aircraft.position, 'airport');
            const airportToInteract = this.shouldInteractWithInfrastructure(aircraft, nearbyAirports, 'aircraft');

            if (airportToInteract && !aircraft.hasInteractedWithAirport) {
                aircraft.hasInteractedWithAirport = true;
                await this.handleAircraftAirportInteraction(aircraft, airportToInteract, game, channel);
                return; // Don't move this turn if interacting
            }

            const currentCoords = game.coordToNumbers(aircraft.position);
            const destCoords = game.coordToNumbers(aircraft.destination);

            if (currentCoords && destCoords) {
                const dx = destCoords.x - currentCoords.x;
                const dy = destCoords.y - currentCoords.y;

                let newX = currentCoords.x;
                let newY = currentCoords.y;

                // Move toward destination
                if (Math.abs(dx) > Math.abs(dy)) {
                    newX += dx > 0 ? 1 : -1;
                } else if (dy !== 0) {
                    newY += dy > 0 ? 1 : -1;
                }

                // Ensure we stay in bounds
                if (newX >= 0 && newX < 75 && newY >= 1 && newY <= 75) {
                    aircraft.position = game.coordinateToString(newX, newY);
                }
            }
        }
    }

    shouldRemoveCivilianBoat(boat, game) {
        if (!boat.alive) return true;

        // Remove if reached destination
        const currentCoords = game.coordToNumbers(boat.position);
        const destCoords = game.coordToNumbers(boat.destination);

        if (currentCoords && destCoords) {
            const distance = Math.abs(currentCoords.x - destCoords.x) + Math.abs(currentCoords.y - destCoords.y);
            return distance <= 1;
        }

        return false;
    }

    shouldRemoveCivilianAircraft(aircraft, game) {
        if (!aircraft.alive) return true;

        // Remove if reached destination
        const currentCoords = game.coordToNumbers(aircraft.position);
        const destCoords = game.coordToNumbers(aircraft.destination);

        if (currentCoords && destCoords) {
            const distance = Math.abs(currentCoords.x - destCoords.x) + Math.abs(currentCoords.y - destCoords.y);
            return distance <= 1;
        }

        return false;
    }

    async checkEnemyAttacksOnCivilian(civilian, game, channel, type) {
        if (!civilian.alive) return;

        // Find nearby enemies
        const enemies = Array.from(game.enemies.values()).filter(enemy => enemy.alive);

        for (const enemy of enemies) {
            const distance = game.calculateDistance(enemy.position, civilian.position);

            // Enemies attack civilians if they get within 3 cells and have a 30% chance
            if (distance <= 3 && Math.random() < 0.3) {
                // Attack the civilian
                const damage = Math.floor(Math.random() * 3) + 1;
                civilian.health -= damage;

                if (civilian.health <= 0) {
                    civilian.alive = false;
                    await channel.send(`💥 **${civilian.name}** was destroyed by ${enemy.customName || enemy.shipClass}!`);
                } else {
                    await channel.send(`⚠️ **${civilian.name}** took ${damage} damage from ${enemy.customName || enemy.shipClass}! (${civilian.health}/${civilian.maxHealth} HP)`);
                }

                break; // Only one attack per turn
            }
        }
    }

    // Find nearby airports or harbors
    findNearbyInfrastructure(game, position, type) {
        const infrastructure = [];
        const currentCoords = game.coordToNumbers(position);
        if (!currentCoords) return infrastructure;

        // Search in a 10-cell radius for infrastructure
        for (let x = currentCoords.x - 10; x <= currentCoords.x + 10; x++) {
            for (let y = currentCoords.y - 10; y <= currentCoords.y + 10; y++) {
                if (x >= 0 && x < 75 && y >= 1 && y <= 75) {
                    const coord = game.coordinateToString(x, y);
                    const cell = game.getMapCell(coord);

                    if (cell && this.isInfrastructureType(cell.type, type)) {
                        const distance = Math.abs(currentCoords.x - x) + Math.abs(currentCoords.y - y);
                        infrastructure.push({
                            position: coord,
                            type: cell.type,
                            distance: distance,
                            coords: { x, y }
                        });
                    }
                }
            }
        }

        return infrastructure.sort((a, b) => a.distance - b.distance);
    }

    isInfrastructureType(cellType, searchType) {
        if (searchType === 'airport') {
            return ['airfield', 'small_airfield', 'airfield_base'].includes(cellType);
        } else if (searchType === 'harbor') {
            return ['port_facility', 'port_city'].includes(cellType);
        }
        return false;
    }

    // Check if civilian should interact with nearby infrastructure
    shouldInteractWithInfrastructure(civilian, infrastructure, type) {
        if (infrastructure.length === 0) return null;

        const nearest = infrastructure[0];

        // Aircraft land at airports if within 2 cells (40% chance)
        if (type === 'aircraft' && nearest.distance <= 2 && Math.random() < 0.4) {
            return nearest;
        }

        // Boats dock at harbors if within 1 cell (60% chance)
        if (type === 'boat' && nearest.distance <= 1 && Math.random() < 0.6) {
            return nearest;
        }

        return null;
    }

    async handleAircraftAirportInteraction(aircraft, airport, game, channel) {
        const interaction = Math.random() < 0.7 ? 'land' : 'flyby';

        if (interaction === 'land') {
            // Aircraft lands at airport
            aircraft.status = 'landed';
            aircraft.landingTurns = Math.floor(Math.random() * 3) + 2; // Stay 2-4 turns
            aircraft.destination = airport.position; // Change destination to airport
            aircraft.originalDestination = aircraft.originalDestination || aircraft.destination;

            await channel.send(`✈️ **${aircraft.name}** has landed at ${airport.type} at ${airport.position}`);
        } else {
            // Aircraft flies by the airport
            await channel.send(`✈️ **${aircraft.name}** flies past ${airport.type} at ${airport.position}`);
        }
    }

    async handleBoatHarborInteraction(boat, harbor, game, channel) {
        const interaction = Math.random() < 0.8 ? 'dock' : 'pass';

        if (interaction === 'dock') {
            // Boat docks at harbor
            boat.status = 'docked';
            boat.dockingTurns = Math.floor(Math.random() * 4) + 2; // Stay 2-5 turns
            boat.destination = harbor.position; // Change destination to harbor
            boat.originalDestination = boat.originalDestination || boat.destination;

            await channel.send(`⚓ **${boat.name}** has docked at ${harbor.type} at ${harbor.position}`);
        } else {
            // Boat sails past the harbor
            await channel.send(`🚢 **${boat.name}** sails past ${harbor.type} at ${harbor.position}`);
        }
    }



// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               MAP & DISPLAY SYSTEM                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async createMapImage(game, movementCoords = null) {
        console.log('🗺️ createMapImage function called');
        try {
            const fs = require('fs');
            const path = require('path');
            const puppeteer = require('puppeteer');

            const mapSize = 75;
            const cellSize = 20;
            const gridWidth = mapSize * cellSize;
            const gridHeight = mapSize * cellSize;

            const leftMargin = 60;
            const topMargin = 60;
            const rightPanelWidth = 450;
            const bottomMargin = 50;

            const totalWidth = leftMargin + gridWidth + rightPanelWidth;
            const totalHeight = Math.max(topMargin + gridHeight + bottomMargin, 700);

            console.log('🗺️ Generating clean SVG content...');
            const svgContent = this.generateCleanMapSVG(game, mapSize, cellSize, totalWidth, totalHeight, movementCoords);
            console.log(`📏 SVG content length: ${svgContent.length} characters`);

            console.log('🚀 Launching Puppeteer for high-quality rendering...');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Set viewport to exact SVG dimensions for pixel-perfect rendering
            await page.setViewport({
                width: totalWidth,
                height: totalHeight,
                deviceScaleFactor: 2 // 2x for high DPI
            });

            // Create HTML with embedded SVG
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; }
                    svg { display: block; }
                </style>
            </head>
            <body>
                ${svgContent}
            </body>
            </html>`;

            console.log('🖼️ Rendering SVG with Puppeteer...');
            await page.setContent(html, { waitUntil: 'networkidle0' });

            // Take screenshot with transparent background
            const image = await page.screenshot({
                type: 'png',
                fullPage: true,
                omitBackground: true // Transparent background
            });

            await browser.close();
            console.log('✅ Puppeteer rendering completed');

            // Check file size (Discord limit is 25MB = 26,214,400 bytes)
            const fileSizeKB = image.length / 1024;
            const fileSizeMB = fileSizeKB / 1024;

            console.log(`📊 Image size: ${fileSizeMB.toFixed(2)}MB (${fileSizeKB.toFixed(0)}KB)`);

            // Create maps folder if it doesn't exist
            const mapsDir = path.join(__dirname, 'maps');

            if (!fs.existsSync(mapsDir)) {
                fs.mkdirSync(mapsDir, { recursive: true });
                console.log('📁 Created maps directory');
            }

            // Save with timestamp for uniqueness
            const filename = `battle_map_${game.channelId}_turn_${game.turnNumber}_${Date.now()}.png`;
            const filepath = path.join(mapsDir, filename);

            fs.writeFileSync(filepath, image);

            // Store the filepath in the game object for later deletion
            if (!game.mapFiles) {
                game.mapFiles = [];
            }
            game.mapFiles.push(filepath);

            return filepath;

        } catch (error) {
            console.error('❌ Error creating map image with Puppeteer:', error);

            // Fallback to Sharp if Puppeteer fails
            console.log('⚠️ Puppeteer failed, falling back to Sharp with minimal SVG...');
            try {
                const sharp = require('sharp');
                const fs = require('fs');
                const path = require('path');

                const mapSize = 75;
                const cellSize = 20;
                const totalWidth = 60 + (mapSize * cellSize) + 450;
                const totalHeight = Math.max(60 + (mapSize * cellSize) + 50, 700);

                const minimalSvg = this.generateUltraMinimalMapSVG(game, mapSize, cellSize, totalWidth, totalHeight);
                console.log(`📏 Fallback minimal SVG length: ${minimalSvg.length} characters`);

                const image = await sharp(Buffer.from(minimalSvg))
                    .png({ quality: 90, compressionLevel: 6 })
                    .toBuffer();

                const mapsDir = path.join(__dirname, 'maps');
                if (!fs.existsSync(mapsDir)) {
                    fs.mkdirSync(mapsDir, { recursive: true });
                }

                const filename = `battle_map_${game.channelId}_turn_${game.turnNumber}_${Date.now()}.png`;
                const filepath = path.join(mapsDir, filename);

                fs.writeFileSync(filepath, image);

                if (!game.mapFiles) game.mapFiles = [];
                game.mapFiles.push(filepath);

                console.log('✅ Sharp fallback completed');
                return filepath;

            } catch (fallbackError) {
                console.error('❌ Sharp fallback also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }

    loadIconAsBase64(iconPath) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const fullPath = path.join(__dirname, iconPath);
            
            if (!fs.existsSync(fullPath)) {
                console.log(`⚠️ Icon not found: ${fullPath}`);
                return null;
            }
            
            const iconBuffer = fs.readFileSync(fullPath);
            const base64Icon = iconBuffer.toString('base64');
            return `data:image/png;base64,${base64Icon}`;
            
        } catch (error) {
            console.log(`❌ Error loading icon ${iconPath}:`, error.message);
            return null;
        }
    }

    loadStatusIconAsBase64(iconPath) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const fullPath = path.join(__dirname, iconPath);
            
            if (!fs.existsSync(fullPath)) {
                console.log(`⚠️ Status icon not found: ${fullPath}`);
                return null;
            }
            
            const iconBuffer = fs.readFileSync(fullPath);
            const base64Icon = iconBuffer.toString('base64');
            return `data:image/png;base64,${base64Icon}`;
            
        } catch (error) {
            console.log(`❌ Error loading status icon ${iconPath}:`, error.message);
            return null;
        }
    }

    getShipClassIcon(shipClass, isAlive = true) {
        // Choose folder based on player status
        const iconFolder = isAlive ? './icons/class' : './icons/sunk_player';

        const iconMap = {
            'Battleship': `${iconFolder}/battleship.png`,
            'Aircraft Carrier': `${iconFolder}/carrier.png`,
            'Heavy Cruiser': `${iconFolder}/cruiser.png`,
            'Light Cruiser': `${iconFolder}/cruiser.png`, // Light cruisers also use cruiser icon
            'Destroyer': `${iconFolder}/destroyer.png`,
            'Submarine': `${iconFolder}/submarine.png`,
            'Auxiliary': `${iconFolder}/auxiliary.png`
        };

        const imagePath = iconMap[shipClass] || `${iconFolder}/destroyer.png`; // default to destroyer

        try {
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = 'image/png';
                return `data:${mimeType};base64,${base64Image}`;
            }
        } catch (error) {
            console.log(`Error loading ship class icon ${imagePath}:`, error);
        }

        return null; // Return null if image can't be loaded
    }

    generateFullMapSVG(game, mapSize, cellSize, totalWidth, totalHeight) {

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">

        <!-- Enhanced rendering definitions -->
        <defs>
            <!-- Gradients for water depth -->
            <radialGradient id="deepWater" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
            </radialGradient>

            <linearGradient id="shallowWater" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#60a5fa;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#93c5fd;stop-opacity:1" />
            </linearGradient>

            <!-- Island textures -->
            <pattern id="islandTexture" patternUnits="userSpaceOnUse" width="20" height="20">
                <rect width="20" height="20" fill="#8B4513"/>
                <circle cx="5" cy="5" r="1" fill="#228B22"/>
                <circle cx="15" cy="8" r="1.5" fill="#228B22"/>
                <circle cx="8" cy="15" r="1" fill="#228B22"/>
                <circle cx="12" cy="12" r="0.8" fill="#228B22"/>
                <path d="M2,18 Q10,16 18,18" stroke="#CD853F" stroke-width="0.5" fill="none"/>
            </pattern>

            <!-- Shoal patterns -->
            <pattern id="shoalPattern" patternUnits="userSpaceOnUse" width="15" height="15">
                <rect width="15" height="15" fill="#87CEEB"/>
                <circle cx="3" cy="3" r="1" fill="#FFE4B5" opacity="0.8"/>
                <circle cx="8" cy="7" r="1.5" fill="#FFE4B5" opacity="0.6"/>
                <circle cx="12" cy="11" r="1" fill="#FFE4B5" opacity="0.7"/>
                <path d="M0,8 Q7,6 15,8" stroke="#F0E68C" stroke-width="0.3" fill="none" opacity="0.5"/>
            </pattern>

            <!-- Reef patterns -->
            <pattern id="reefPattern" patternUnits="userSpaceOnUse" width="12" height="12">
                <rect width="12" height="12" fill="#20B2AA"/>
                <path d="M2,2 L4,6 L2,10 L6,8 L10,10 L8,6 L10,2 L6,4 Z" fill="#FF7F50" opacity="0.8"/>
                <circle cx="3" cy="9" r="0.5" fill="#FF6347"/>
                <circle cx="9" cy="3" r="0.8" fill="#FF6347"/>
            </pattern>

            <!-- Ship silhouettes -->
            <g id="carrier">
                <rect x="-8" y="-3" width="16" height="6" fill="#2D4A22" stroke="#1a2f14" stroke-width="0.5"/>
                <rect x="-6" y="-2" width="2" height="4" fill="#4A4A4A"/>
                <rect x="0" y="-2" width="2" height="4" fill="#4A4A4A"/>
                <rect x="4" y="-2" width="2" height="4" fill="#4A4A4A"/>
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#1a2f14" stroke-width="1"/>
            </g>

            <g id="destroyer">
                <rect x="-6" y="-2" width="12" height="4" fill="#2D4A22" stroke="#1a2f14" stroke-width="0.5"/>
                <rect x="-3" y="-1.5" width="1.5" height="3" fill="#4A4A4A"/>
                <rect x="2" y="-1.5" width="1.5" height="3" fill="#4A4A4A"/>
                <circle cx="4" cy="0" r="1" fill="#FF6B6B"/>
            </g>

            <g id="submarine">
                <ellipse cx="0" cy="0" rx="6" ry="1.5" fill="#1e3a8a" stroke="#0f172a" stroke-width="0.5"/>
                <circle cx="2" cy="-2" r="0.5" fill="#4A4A4A"/>
                <line x1="-2" y1="0" x2="2" y2="0" stroke="#0f172a" stroke-width="0.3"/>
            </g>

            <!-- Weather effects -->
            <pattern id="storm" patternUnits="userSpaceOnUse" width="30" height="30">
                <rect width="30" height="30" fill="none"/>
                <circle cx="8" cy="8" r="3" fill="#4A4A4A" opacity="0.6"/>
                <circle cx="15" cy="12" r="4" fill="#4A4A4A" opacity="0.5"/>
                <circle cx="22" cy="18" r="3" fill="#4A4A4A" opacity="0.7"/>
                <path d="M5,20 L7,25 M12,22 L14,27 M20,24 L22,29" stroke="#87CEEB" stroke-width="0.5" opacity="0.8"/>
            </pattern>

            <!-- Depth shadows -->
            <filter id="depthShadow">
                <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>

            <!-- Glow effects -->
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <style>
                .crisp-text {
                    text-rendering: optimizeLegibility;
                    shape-rendering: crispEdges;
                    font-family: "Arial", "Helvetica", sans-serif;
                }
                .smooth-shapes {
                    shape-rendering: geometricPrecision;
                }
            </style>
        </defs>

        <!-- Transparent background -->
        <rect width="${totalWidth}" height="${totalHeight}" fill="none"/>

        <!-- Enhanced ocean background with depth gradient -->
        <rect x="50" y="50" width="${mapSize * cellSize}" height="${mapSize * cellSize}"
              fill="url(#deepWater)" stroke="#0f172a" stroke-width="3" class="smooth-shapes" filter="url(#depthShadow)"/>

        <!-- Ocean wave patterns -->
        <g opacity="0.3">
            <path d="M50,${50 + mapSize * cellSize * 0.3} Q${50 + mapSize * cellSize * 0.25},${50 + mapSize * cellSize * 0.25} ${50 + mapSize * cellSize * 0.5},${50 + mapSize * cellSize * 0.3}"
                  stroke="#60a5fa" stroke-width="1" fill="none"/>
            <path d="M50,${50 + mapSize * cellSize * 0.7} Q${50 + mapSize * cellSize * 0.75},${50 + mapSize * cellSize * 0.65} ${50 + mapSize * cellSize},${50 + mapSize * cellSize * 0.7}"
                  stroke="#60a5fa" stroke-width="1" fill="none"/>
        </g>

        <!-- Current arrows -->
        <g opacity="0.4">
            <path d="M${50 + mapSize * cellSize * 0.2},${50 + mapSize * cellSize * 0.5} L${50 + mapSize * cellSize * 0.3},${50 + mapSize * cellSize * 0.45} L${50 + mapSize * cellSize * 0.25},${50 + mapSize * cellSize * 0.47} L${50 + mapSize * cellSize * 0.3},${50 + mapSize * cellSize * 0.5} L${50 + mapSize * cellSize * 0.25},${50 + mapSize * cellSize * 0.53} L${50 + mapSize * cellSize * 0.3},${50 + mapSize * cellSize * 0.55} Z"
                  fill="#93c5fd" stroke="#3b82f6" stroke-width="0.5"/>
        </g>

        <!-- Weather effects overlay -->
        ${game.weather === 'storm' ? `<g opacity="0.4">
            <rect x="${50 + mapSize * cellSize * 0.1}" y="${50 + mapSize * cellSize * 0.1}"
                  width="${mapSize * cellSize * 0.8}" height="${mapSize * cellSize * 0.3}"
                  fill="url(#storm)"/>
        </g>` : ''}

        <!-- Time of day indicator -->
        <g transform="translate(${50 + mapSize * cellSize + 60}, 80)">
            <circle cx="0" cy="0" r="15" fill="#FFD700" stroke="#FFA500" stroke-width="1" opacity="0.8"/>
            <text x="0" y="25" text-anchor="middle" font-size="9" fill="#FFFFFF">Turn ${game.turnNumber}</text>
        </g>`;
            
        // Check if game has the required methods
        if (typeof game.getMapCell !== 'function') {
            console.error('❌ game.getMapCell is not a function');
            throw new Error('game.getMapCell is not a function');
        }
        
        // Draw the FULL grid with better quality
        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                
                try {
                    const cell = game.getMapCell(coord);
                    
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);
                    
                    // Enhanced terrain rendering with textures and effects
                    if (cell.type === 'island') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#islandTexture)" stroke="#654321" stroke-width="1"
                                class="smooth-shapes" filter="url(#depthShadow)"/>`;

                        // Add palm trees for larger islands
                        if (cellSize > 15) {
                            svg += `<circle cx="${pixelX + cellSize * 0.3}" cy="${pixelY + cellSize * 0.3}" r="2" fill="#228B22"/>
                                   <circle cx="${pixelX + cellSize * 0.7}" cy="${pixelY + cellSize * 0.6}" r="1.5" fill="#228B22"/>`;
                        }
                    } else if (cell.type === 'reef') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#reefPattern)" stroke="#FF6347" stroke-width="1"
                                class="smooth-shapes"/>`;
                    } else if (cell.type === 'spawn') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="url(#shoalPattern)" stroke="#F0E68C" stroke-width="0.8"
                                class="smooth-shapes"/>`;

                        // Add wave effects for spawn areas
                        svg += `<path d="M${pixelX},${pixelY + cellSize * 0.5} Q${pixelX + cellSize * 0.5},${pixelY + cellSize * 0.3} ${pixelX + cellSize},${pixelY + cellSize * 0.5}"
                               stroke="#87CEEB" stroke-width="0.5" fill="none" opacity="0.6"/>`;
                    } else {
                        // Regular ocean with depth variations
                        const depthVariation = (x + y) % 3;
                        const oceanFill = depthVariation === 0 ? 'url(#deepWater)' :
                                         depthVariation === 1 ? 'url(#shallowWater)' : '#1e40af';
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="${oceanFill}" stroke="#1e3a8a" stroke-width="0.3"
                                class="smooth-shapes" opacity="0.9"/>`;
                    }
                } catch (error) {
                    console.error(`❌ Error processing cell at ${coord}:`, error);
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);
                    svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                            fill="url(#shallowWater)" stroke="#1e3a8a" stroke-width="0.3" class="smooth-shapes"/>`;
                }
            }
        }
        
        // Draw entities AFTER terrain
        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                const pixelX = 50 + (x * cellSize);
                const pixelY = 50 + (y * cellSize);
                
                try {
                    svg += this.drawEntityOnMap(game, coord, pixelX, pixelY, cellSize);
                } catch (error) {
                    console.error(`❌ Error drawing entity at ${coord}:`, error);
                }
            }
        }
        
        // Add coordinate labels with better styling
        svg += this.addExtendedCoordinateLabels(mapSize, cellSize);
        
        // Position panels properly within canvas
        const mapEndX = 50 + (mapSize * cellSize);
        const panelStartX = mapEndX + 30;

        // Add player status panel (left side)
        svg += this.addCompactStatusPanel(game, panelStartX, 60);

        // Add AI status panel (right side, next to player panel)
        const aiPanelX = panelStartX + 220;
        svg += this.addAIStatusPanel(game, aiPanelX, 60);

        // Calculate map bottom position
        const mapBottom = 50 + (mapSize * cellSize);

        // Calculate legend height (approximately 120 pixels)
        const legendHeight = 85;

        // Position legend slightly above map bottom (add 20px gap)
        const legendY = mapBottom - legendHeight - 20;

        // Position objective panel above legend, horizontally aligned with player panel
        const objectivePanelHeight = 140;
        const objectivePanelX = panelStartX; // Align horizontally with player panel
        const objectivePanelY = legendY - objectivePanelHeight - 15;

        // Position legend horizontally aligned with player panel
        const legendX = panelStartX; // Align horizontally with player panel

        // Add Objective panel
        svg += this.addObjectivePanel(game, objectivePanelX, objectivePanelY);

        // Add legend
        console.log('🎨 Adding compact map legend...');
        const legendSVG = this.addCompactMapLegend(legendX, legendY);
        console.log(`📋 Legend SVG length: ${legendSVG.length} characters`);
        svg += legendSVG;
        
        svg += '</svg>';
        console.log('✅ SVG generation completed');
        return svg;
    }

    generateSimplifiedMapSVG(game, mapSize, cellSize, totalWidth, totalHeight) {
        console.log('🎨 Generating simplified SVG without complex patterns...');

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">

        <defs>
            <style>
                .crisp-text {
                    text-rendering: optimizeLegibility;
                    shape-rendering: crispEdges;
                    font-family: "Arial", "Helvetica", sans-serif;
                }
                .smooth-shapes {
                    shape-rendering: geometricPrecision;
                }
            </style>
        </defs>

        <!-- Transparent background -->
        <rect width="${totalWidth}" height="${totalHeight}" fill="none"/>

        <!-- Enhanced ocean background -->
        <rect x="50" y="50" width="${mapSize * cellSize}" height="${mapSize * cellSize}"
              fill="#1e40af" stroke="#0f172a" stroke-width="2" class="smooth-shapes"/>`;

        // Check if game has the required methods
        if (typeof game.getMapCell !== 'function') {
            console.error('❌ game.getMapCell is not a function');
            throw new Error('game.getMapCell is not a function');
        }

        // Draw the grid with enhanced but simplified terrain
        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);

                try {
                    const cell = game.getMapCell(coord);
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);

                    // Simplified terrain rendering
                    if (cell.type === 'island') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="#8B4513" stroke="#654321" stroke-width="1" class="smooth-shapes"/>`;
                        // Add simple vegetation
                        if (cellSize > 15) {
                            svg += `<circle cx="${pixelX + cellSize * 0.3}" cy="${pixelY + cellSize * 0.3}" r="1.5" fill="#228B22"/>
                                   <circle cx="${pixelX + cellSize * 0.7}" cy="${pixelY + cellSize * 0.6}" r="1" fill="#228B22"/>`;
                        }
                    } else if (cell.type === 'reef') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="#20B2AA" stroke="#FF6347" stroke-width="1" class="smooth-shapes"/>`;
                    } else if (cell.type === 'spawn') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="#87CEEB" stroke="#F0E68C" stroke-width="0.8" class="smooth-shapes"/>`;
                    } else {
                        // Regular ocean with depth variations
                        const depthVariation = (x + y) % 3;
                        const oceanFill = depthVariation === 0 ? '#1e3a8a' :
                                         depthVariation === 1 ? '#3b82f6' : '#1e40af';
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                                fill="${oceanFill}" stroke="#1e3a8a" stroke-width="0.3" class="smooth-shapes" opacity="0.9"/>`;
                    }
                } catch (error) {
                    console.error(`❌ Error processing cell at ${coord}:`, error);
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);
                    svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                            fill="#3b82f6" stroke="#1e3a8a" stroke-width="0.3" class="smooth-shapes"/>`;
                }
            }
        }

        // Draw entities AFTER terrain
        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                const pixelX = 50 + (x * cellSize);
                const pixelY = 50 + (y * cellSize);

                try {
                    svg += this.drawEntityOnMap(game, coord, pixelX, pixelY, cellSize);
                } catch (error) {
                    console.error(`❌ Error drawing entity at ${coord}:`, error);
                }
            }
        }

        // Add simplified coordinate labels
        svg += this.addSimplifiedCoordinateLabels(mapSize, cellSize);

        // Position panels properly within canvas
        const mapEndX = 50 + (mapSize * cellSize);
        const panelStartX = mapEndX + 30;

        // Add simplified panels with dynamic sizing
        // Calculate dynamic heights for panels
        const playerCount = game.players.size;
        const minPlayerHeight = 35; // Initial height for title and spacing
        const playerEntryHeight = 15; // Height per player entry
        const playerPanelHeight = minPlayerHeight + (playerCount * playerEntryHeight);

        // Add player panel
        svg += this.addSimplifiedStatusPanel(game, panelStartX, 60, playerPanelHeight);

        // Position enemy panel below player panel with spacing
        const enemyPanelY = 60 + playerPanelHeight + 20;
        const enemyCount = game.enemies.size;
        const minEnemyHeight = 35; // Initial height for title and spacing
        const enemyEntryHeight = 15; // Height per enemy entry
        const enemyPanelHeight = minEnemyHeight + (enemyCount * enemyEntryHeight);

        svg += this.addSimplifiedAIPanel(game, panelStartX + 220, enemyPanelY, enemyPanelHeight);
        svg += this.addSimplifiedLegend(panelStartX, 500); // Align with player status panel

        svg += '</svg>';
        console.log('✅ Simplified SVG generation completed');
        return svg;
    }

    generateUltraMinimalMapSVG(game, mapSize, cellSize, totalWidth, totalHeight) {
        console.log('🎨 Generating ultra minimal SVG for Sharp compatibility...');

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">

        <!-- Ocean background -->
        <rect x="50" y="50" width="${mapSize * cellSize}" height="${mapSize * cellSize}" fill="#1e40af" stroke="#0f172a" stroke-width="1"/>`;

        // Check if game has the required methods
        if (typeof game.getMapCell !== 'function') {
            console.error('❌ game.getMapCell is not a function');
            throw new Error('game.getMapCell is not a function');
        }

        // Create terrain groups to reduce SVG complexity
        const islandCells = [];
        const reefCells = [];
        const spawnCells = [];

        // Collect all cells by type first
        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                try {
                    const cell = game.getMapCell(coord);
                    const pixelX = 50 + (x * cellSize);
                    const pixelY = 50 + (y * cellSize);

                    if (cell.type === 'island') {
                        islandCells.push({x: pixelX, y: pixelY});
                    } else if (cell.type === 'reef') {
                        reefCells.push({x: pixelX, y: pixelY});
                    } else if (cell.type === 'spawn') {
                        spawnCells.push({x: pixelX, y: pixelY});
                    }
                } catch (error) {
                    // Skip problematic cells
                }
            }
        }

        // Draw terrain in groups (much more efficient)
        if (islandCells.length > 0) {
            svg += `<g fill="#8B4513" stroke="#654321" stroke-width="0.5">`;
            for (const cell of islandCells) {
                svg += `<rect x="${cell.x}" y="${cell.y}" width="${cellSize}" height="${cellSize}"/>`;
            }
            svg += `</g>`;
        }

        if (reefCells.length > 0) {
            svg += `<g fill="#20B2AA" stroke="#FF6347" stroke-width="0.5">`;
            for (const cell of reefCells) {
                svg += `<rect x="${cell.x}" y="${cell.y}" width="${cellSize}" height="${cellSize}"/>`;
            }
            svg += `</g>`;
        }

        if (spawnCells.length > 0) {
            svg += `<g fill="#87CEEB" stroke="#F0E68C" stroke-width="0.5">`;
            for (const cell of spawnCells) {
                svg += `<rect x="${cell.x}" y="${cell.y}" width="${cellSize}" height="${cellSize}"/>`;
            }
            svg += `</g>`;
        }

        // Draw players with icons
        for (const player of game.players.values()) {
            if (player.position) {
                try {
                    const coords = this.coordToNumbers(player.position);
                    if (coords) {
                        const pixelX = 50 + (coords.x * cellSize) + cellSize/2;
                        const pixelY = 50 + ((coords.y - 1) * cellSize) + cellSize/2;
                        const color = player.alive ? "#10b981" : "#ef4444";

                        // Get player's turn position (1-based)
                        const turnPosition = game.turnOrder ? game.turnOrder.indexOf(player.userId) + 1 : 0;

                        // Load player icon (alive or sunk)
                        const iconBase64 = this.getShipClassIcon(player.shipClass, player.alive);

                        if (iconBase64) {
                            // Apply rotation based on direction (if available), flip 180°
                            const rotation = player.direction !== undefined ? (player.direction + 180) % 360 : 180;

                            // Just the icon with rotation
                            svg += `<image x="${pixelX - 6}" y="${pixelY - 6}" width="12" height="12" xlink:href="${iconBase64}" transform="rotate(${rotation} ${pixelX} ${pixelY})"/>`;

                            // Turn position number over the icon (only show if player is in turn order)
                            if (turnPosition > 0) {
                                // Highly transparent badge positioned over icon
                                const badgeColor = player.alive ? "#3b82f6" : "#6b7280";
                                svg += `
                                    <defs>
                                        <radialGradient id="badge-gradient-${player.id}" cx="50%" cy="30%">
                                            <stop offset="0%" style="stop-color:${badgeColor};stop-opacity:0.35" />
                                            <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:0.25" />
                                        </radialGradient>
                                        <filter id="badge-glow-${player.id}">
                                            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <circle cx="${pixelX}" cy="${pixelY}" r="6" fill="url(#badge-gradient-${player.id})" stroke="#ffffff" stroke-width="0.8" opacity="0.55" filter="url(#badge-glow-${player.id})"/>
                                    <text x="${pixelX}" y="${pixelY + 3}" font-size="8" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 3px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8);">${turnPosition}</text>
                                `;
                            }
                        } else {
                            // Fallback to simple circle
                            svg += `<circle cx="${pixelX}" cy="${pixelY}" r="3" fill="${color}" stroke="#000" stroke-width="1"/>`;

                            // Turn position number over the fallback circle (only show if player is in turn order)
                            if (turnPosition > 0) {
                                // Semi-transparent badge positioned over icon
                                svg += `
                                    <circle cx="${pixelX}" cy="${pixelY}" r="6" fill="url(#badge-gradient-${player.id})" stroke="#ffffff" stroke-width="1" opacity="0.85" filter="url(#badge-glow-${player.id})"/>
                                    <text x="${pixelX}" y="${pixelY + 3}" font-size="8" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 2px rgba(0,0,0,0.9);">${turnPosition}</text>
                                `;
                            }
                        }
                    }
                } catch (error) {
                    // Skip if coordinate parsing fails
                }
            }
        }

        // Draw enemies with icons and AI numbering
        // Enemies sorted by insertion order (lowest number to highest)
        const sortedEnemies = Array.from(game.enemies.values());

        sortedEnemies.forEach((enemy, index) => {
            if (enemy.position) {
                try {
                    const coords = this.coordToNumbers(enemy.position);
                    if (coords) {
                        const pixelX = 50 + (coords.x * cellSize) + cellSize/2;
                        const pixelY = 50 + ((coords.y - 1) * cellSize) + cellSize/2;
                        const color = enemy.alive ? "#ef4444" : "#991b1b";
                        const aiNumber = index + 1; // AI numbering starts from 1

                        // Load enemy icon (alive or sunk)
                        const enemyIconBase64 = this.getEnemyClassIcon(enemy.shipClass, enemy.alive);

                        if (enemyIconBase64) {
                            // Apply rotation based on direction (if available), flip 180°
                            const rotation = enemy.direction !== undefined ? (enemy.direction + 180) % 360 : 180;

                            // Just the icon with rotation
                            svg += `<image x="${pixelX - 6}" y="${pixelY - 6}" width="12" height="12" xlink:href="${enemyIconBase64}" transform="rotate(${rotation} ${pixelX} ${pixelY})"/>`;

                            // AI position number badge over the icon (only for alive enemies)
                            if (enemy.alive) {
                                const badgeColor = "#ef4444";
                                svg += `
                                    <defs>
                                        <radialGradient id="enemy-badge-gradient-${enemy.id}" cx="50%" cy="30%">
                                            <stop offset="0%" style="stop-color:${badgeColor};stop-opacity:1" />
                                            <stop offset="100%" style="stop-color:#7f1d1d;stop-opacity:1" />
                                        </radialGradient>
                                        <filter id="enemy-badge-glow-${enemy.id}">
                                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <circle cx="${pixelX}" cy="${pixelY - 15}" r="7" fill="url(#enemy-badge-gradient-${enemy.id})" stroke="#ffffff" stroke-width="1.5" filter="url(#enemy-badge-glow-${enemy.id})"/>
                                    <text x="${pixelX}" y="${pixelY - 11}" font-size="9" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${aiNumber}</text>
                                `;
                            }
                        } else {
                            // Fallback to simple rectangle
                            svg += `<rect x="${pixelX-2}" y="${pixelY-2}" width="4" height="4" fill="${color}" stroke="#000" stroke-width="1"/>`;

                            // AI position number badge over the fallback rectangle (only for alive enemies)
                            if (enemy.alive) {
                                svg += `
                                    <circle cx="${pixelX}" cy="${pixelY - 10}" r="6" fill="url(#enemy-badge-gradient-${enemy.id})" stroke="#ffffff" stroke-width="1.5" filter="url(#enemy-badge-glow-${enemy.id})"/>
                                    <text x="${pixelX}" y="${pixelY - 7}" font-size="8" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${aiNumber}</text>
                                `;
                            }
                        }
                    }
                } catch (error) {
                    // Skip if coordinate parsing fails
                }
            }
        });

        // Minimal coordinate labels (every 5th)
        svg += `<g font-family="Arial" font-size="8" fill="#FFFFFF" text-anchor="middle">`;
        for (let x = 0; x < mapSize; x += 5) {
            const label = GameUtils.generateExtendedCoordinate(x, 1).slice(0, -1);
            const xPos = 50 + (x * cellSize) + cellSize/2;
            svg += `<text x="${xPos}" y="40">${label}</text>`;
        }
        for (let y = 1; y <= mapSize; y += 5) {
            const yPos = 50 + ((y - 1) * cellSize) + cellSize/2;
            svg += `<text x="40" y="${yPos}">${y}</text>`;
        }
        svg += `</g>`;

        // Minimal status panel
        const panelX = 50 + (mapSize * cellSize) + 20;
        svg += `<text x="${panelX}" y="80" font-family="Arial" font-size="12" font-weight="bold" fill="#FFFFFF">Turn ${game.turnNumber || 1}</text>`;

        let playersAlive = 0;
        let enemiesAlive = 0;
        for (const player of game.players.values()) {
            if (player.alive) playersAlive++;
        }
        for (const enemy of game.enemies.values()) {
            if (enemy.alive) enemiesAlive++;
        }

        svg += `<text x="${panelX}" y="100" font-family="Arial" font-size="10" fill="#00FF00">Players: ${playersAlive}</text>`;
        svg += `<text x="${panelX}" y="115" font-family="Arial" font-size="10" fill="#FF0000">Enemies: ${enemiesAlive}</text>`;

        svg += '</svg>';
        console.log('✅ Ultra minimal SVG generation completed');
        return svg;
    }

    generateCleanMapSVG(game, mapSize, cellSize, totalWidth, totalHeight, movementCoords = null) {
        console.log('🎨 Generating clean, professional SVG...');

        // Load compass icon
        let compassBase64 = '';
        try {
            const fs = require('fs');
            const path = require('path');
            const compassPath = path.resolve('./icons/compass.png');
            console.log('🧭 Loading compass from:', compassPath);
            if (fs.existsSync(compassPath)) {
                const compassBuffer = fs.readFileSync(compassPath);
                compassBase64 = `data:image/png;base64,${compassBuffer.toString('base64')}`;
                console.log('✅ Compass loaded successfully');
            } else {
                console.warn('⚠️ Compass file not found at:', compassPath);
            }
        } catch (error) {
            console.error('❌ Failed to load compass icon:', error);
        }

        // Load mine icon
        let mineBase64 = '';
        try {
            const fs = require('fs');
            const path = require('path');
            const minePath = path.resolve('./icons/mine.png');
            console.log('💣 Loading mine icon from:', minePath);
            if (fs.existsSync(minePath)) {
                const mineBuffer = fs.readFileSync(minePath);
                mineBase64 = `data:image/png;base64,${mineBuffer.toString('base64')}`;
                console.log('✅ Mine icon loaded successfully');
            } else {
                console.warn('⚠️ Mine icon file not found at:', minePath);
            }
        } catch (error) {
            console.error('❌ Failed to load mine icon:', error);
        }

        // Load auxiliary ship icons
        let auxiliaryBase64 = '';
        let auxiliarySunkBase64 = '';
        try {
            const fs = require('fs');
            const path = require('path');
            const auxiliaryPath = path.resolve('./icons/missions/auxiliary.png');
            const auxiliarySunkPath = path.resolve('./icons/sunk_player/auxiliary.png');

            console.log('🚢 Loading auxiliary ship icons...');
            if (fs.existsSync(auxiliaryPath)) {
                const auxiliaryBuffer = fs.readFileSync(auxiliaryPath);
                auxiliaryBase64 = `data:image/png;base64,${auxiliaryBuffer.toString('base64')}`;
                console.log('✅ Auxiliary ship icon loaded successfully');
            } else {
                console.warn('⚠️ Auxiliary ship icon not found at:', auxiliaryPath);
            }

            if (fs.existsSync(auxiliarySunkPath)) {
                const auxiliarySunkBuffer = fs.readFileSync(auxiliarySunkPath);
                auxiliarySunkBase64 = `data:image/png;base64,${auxiliarySunkBuffer.toString('base64')}`;
                console.log('✅ Sunk auxiliary ship icon loaded successfully');
            } else {
                console.warn('⚠️ Sunk auxiliary ship icon not found at:', auxiliarySunkPath);
            }
        } catch (error) {
            console.error('❌ Failed to load auxiliary ship icons:', error);
        }

        // Load mission objective icons
        let resourcesBase64 = '';
        try {
            const fs = require('fs');
            const path = require('path');
            const resourcesPath = path.resolve('./icons/missions/resources.png');

            console.log('📦 Loading mission objective icons...');
            if (fs.existsSync(resourcesPath)) {
                const resourcesBuffer = fs.readFileSync(resourcesPath);
                resourcesBase64 = `data:image/png;base64,${resourcesBuffer.toString('base64')}`;
                console.log('✅ Resources icon loaded successfully');
            } else {
                console.warn('⚠️ Resources icon not found at:', resourcesPath);
            }
        } catch (error) {
            console.error('❌ Failed to load mission objective icons:', error);
        }

        let svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">

        <defs>
            <style>
                .map-text {
                    font-family: 'Segoe UI', 'Arial', sans-serif;
                    text-rendering: optimizeLegibility;
                    -webkit-font-smoothing: antialiased;
                }
                .grid-line {
                    stroke: #e2e8f0;
                    stroke-width: 0.5;
                    fill: none;
                }
                .ocean-cell {
                    fill: #3b82f6;,
                    stroke: #1e40af;
                    stroke-width: 0.5;
                }
                .island-cell {
                    fill: #166534;,
                    stroke: #14532d;
                    stroke-width: 1;
                }
                .reef-cell {
                    fill: #0891b2;,
                    stroke: #0e7490;
                    stroke-width: 1;
                }
                .spawn-cell {
                    fill: #10b981;,
                    stroke: #059669;
                    stroke-width: 1;
                }
                .movement-text {
                    font-family: 'Segoe UI', 'Arial', sans-serif;
                    font-size: 8px;
                    font-weight: bold;
                    fill: white;
                    text-anchor: middle;
                    dominant-baseline: central;
                }
            </style>
        </defs>`;

        const gridStartX = 60;
        const gridStartY = 60;

        // Check if game has the required methods
        if (typeof game.getMapCell !== 'function') {
            console.error('❌ game.getMapCell is not a function');
            throw new Error('game.getMapCell is not a function');
        }

        // Draw clean ocean background
        svg += `<rect x="${gridStartX}" y="${gridStartY}" width="${mapSize * cellSize}" height="${mapSize * cellSize}"
                fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>`;

        // Calculate fog of war visibility BEFORE drawing anything
        let visibleCells = new Set();
        let hiddenEnemies = new Set();
        if (game.weather === 'fog' || game.weather === 'thunderstorm' || game.weather === 'hurricane') {
            // Determine visibility range based on weather
            let visibilityRange;
            switch (game.weather) {
                case 'hurricane':
                    visibilityRange = 5;
                    break;
                case 'thunderstorm':
                    visibilityRange = 10;
                    break;
                case 'fog':
                    visibilityRange = 15;
                    break;
                default:
                    visibilityRange = 10;
            }

            // Calculate visible cells around player positions
            for (const player of game.players.values()) {
                if (player.position && player.alive) {
                    const playerCoords = this.coordToNumbers(player.position);
                    if (playerCoords) {
                        // Mark cells in radius around player as visible
                        for (let dx = -visibilityRange; dx <= visibilityRange; dx++) {
                            for (let dy = -visibilityRange; dy <= visibilityRange; dy++) {
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance <= visibilityRange) {
                                    const fogX = playerCoords.x + dx;
                                    const fogY = (playerCoords.y - 1) + dy;
                                    if (fogX >= 0 && fogX < mapSize && fogY >= 0 && fogY < mapSize) {
                                        visibleCells.add(`${fogX},${fogY}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Mark enemies outside visibility as hidden
            for (const enemy of game.enemies.values()) {
                if (enemy.position && enemy.alive) {
                    const enemyCoords = this.coordToNumbers(enemy.position);
                    if (enemyCoords) {
                        const enemyCellKey = `${enemyCoords.x},${enemyCoords.y - 1}`;
                        if (!visibleCells.has(enemyCellKey)) {
                            hiddenEnemies.add(enemy.id);
                        }
                    }
                }
            }
        } else {
            // No fog - everything is visible
            for (let x = 0; x < mapSize; x++) {
                for (let y = 0; y < mapSize; y++) {
                    visibleCells.add(`${x},${y}`);
                }
            }
        }

        // Draw terrain cells and collect island groups
        const infrastructureElements = [];
        const islandGroups = this.identifyIslandGroups(game, mapSize);

        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                const pixelX = gridStartX + (x * cellSize);
                const pixelY = gridStartY + (y * cellSize);

                try {
                    const cell = game.getMapCell(coord);

                    if (cell.type === 'island') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}" class="island-cell"/>`;
                    } else if (cell.type === 'reef') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}" class="reef-cell"/>`;
                    } else if (cell.type === 'spawn') {
                        svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}" class="spawn-cell"/>`;

                        // Spawn zones are for players only - no infrastructure
                    } else if (cell.type === 'mine') {
                        // Only draw mine if visible
                        const mineCellKey = `${x},${y}`;
                        if (visibleCells.has(mineCellKey)) {
                            // Draw mine icon
                            if (mineBase64) {
                                const iconSize = cellSize * 0.6; // Mine icon fills 60% of cell
                                const iconX = pixelX + (cellSize - iconSize) / 2;
                                const iconY = pixelY + (cellSize - iconSize) / 2;
                                svg += `<image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" xlink:href="${mineBase64}"/>`;
                            } else {
                                // Fallback: draw a red circle with X
                                const centerX = pixelX + cellSize/2;
                                const centerY = pixelY + cellSize/2;
                                const radius = cellSize * 0.3;
                                svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#8B0000" stroke="#000" stroke-width="1"/>`;
                                svg += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="#FFFFFF">M</text>`;
                            }
                        }
                    }
                } catch (error) {
                    // Skip problematic cells
                }
            }
        }

        // Add movement coordinate labels if movement coordinates are provided
        if (movementCoords && movementCoords.length > 0) {
            for (const coord of movementCoords) {
                const coordNumbers = this.coordToNumbers(coord);
                const pixelX = gridStartX + ((coordNumbers.x) * cellSize);
                const pixelY = gridStartY + ((coordNumbers.y - 1) * cellSize);

                // Add coordinate label in the center of the cell
                const centerX = pixelX + (cellSize / 2);
                const centerY = pixelY + (cellSize / 2);
                svg += `<text x="${centerX}" y="${centerY}" class="movement-text" transform="rotate(45 ${centerX} ${centerY})">${coord}</text>`;
            }
        }

        // Generate clustered infrastructure for each island group
        for (const islandGroup of islandGroups) {
            const groupInfrastructure = this.generateClusteredInfrastructure(islandGroup, gridStartX, gridStartY, cellSize, game);
            infrastructureElements.push(...groupInfrastructure);
        }

        // Add all infrastructure elements (SVG icons and names)
        for (const element of infrastructureElements) {
            svg += element.svg;
            // Add name if present
            if (element.name) {
                const centerX = element.x + cellSize / 2;
                const yOffset = element.y + cellSize * 1.1; // Position name below icon
                const fontSize = cellSize / 3;
                svg += `<text x="${centerX}" y="${yOffset}"
                             text-anchor="middle"
                             font-size="${fontSize}"
                             font-weight="bold"
                             fill="#FFFFFF"
                             stroke="#000000"
                             stroke-width="${fontSize/10}"
                             paint-order="stroke"
                             class="map-text">${element.name}</text>`;
            }
        }

        // Draw clean grid lines
        svg += `<g class="grid-line">`;
        for (let x = 0; x <= mapSize; x++) {
            const lineX = gridStartX + (x * cellSize);
            svg += `<line x1="${lineX}" y1="${gridStartY}" x2="${lineX}" y2="${gridStartY + mapSize * cellSize}"/>`;
        }
        for (let y = 0; y <= mapSize; y++) {
            const lineY = gridStartY + (y * cellSize);
            svg += `<line x1="${gridStartX}" y1="${lineY}" x2="${gridStartX + mapSize * cellSize}" y2="${lineY}"/>`;
        }
        svg += `</g>`;

        // Add complete coordinate labels
        svg += `<g class="map-text" fill="#ffffff" font-size="10" text-anchor="middle">`;

        // Column labels (letters) - All columns across the top
        for (let x = 0; x < mapSize; x++) {
            const label = GameUtils.generateExtendedCoordinate(x, 1).slice(0, -1); // Remove the number part
            const xPos = gridStartX + (x * cellSize) + cellSize/2;
            svg += `<text x="${xPos}" y="${gridStartY - 5}">${label}</text>`;
        }

        // Row labels (numbers) - All rows down the left side
        for (let y = 1; y <= mapSize; y++) {
            const yPos = gridStartY + ((y - 1) * cellSize) + cellSize/2;
            svg += `<text x="${gridStartX - 8}" y="${yPos + 3}" text-anchor="end">${y}</text>`;
        }
        svg += `</g>`;

        // Draw player ships with icons
        console.log(`🎨 Drawing players on map: ${game.players.size} total players`);
        for (const player of game.players.values()) {
            console.log(`🎨 Player ${player.username || player.id}: position=${player.position}, alive=${player.alive}`);
            if (player.position) {
                try {
                    const coords = this.coordToNumbers(player.position);
                    if (coords) {
                        const pixelX = gridStartX + (coords.x * cellSize) + cellSize/2;
                        const pixelY = gridStartY + ((coords.y - 1) * cellSize) + cellSize/2;
                        const color = player.alive ? "#10b981" : "#ef4444";

                        // Get player's turn position (1-based)
                        const turnPosition = game.turnOrder ? game.turnOrder.indexOf(player.userId) + 1 : 0;

                        // Load ship icon (alive or sunk)
                        const iconBase64 = this.getShipClassIcon(player.shipClass, player.alive);

                        if (iconBase64) {
                            // Apply rotation based on direction (if available), flip 180°
                            const rotation = player.direction !== undefined ? (player.direction + 180) % 360 : 180;

                            // Larger icon with rotation (18x18 to fill more of the cell)
                            svg += `<image x="${pixelX - 9}" y="${pixelY - 9}" width="18" height="18" xlink:href="${iconBase64}" transform="rotate(${rotation} ${pixelX} ${pixelY})"/>`;

                            // Turn position number over the icon (only show if player is in turn order)
                            if (turnPosition > 0) {
                                // Smaller, highly transparent badge positioned over icon
                                const badgeColor = player.alive ? "#3b82f6" : "#6b7280";
                                svg += `
                                    <circle cx="${pixelX}" cy="${pixelY}" r="5" fill="url(#badge-gradient-${player.id})" stroke="#ffffff" stroke-width="0.6" opacity="0.55" filter="url(#badge-glow-${player.id})"/>
                                    <text x="${pixelX}" y="${pixelY + 3}" font-size="7" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 3px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8);" class="map-text">${turnPosition}</text>
                                `;
                            }
                        } else {
                            // Fallback to ship silhouette
                            const shipType = player.shipClass.toLowerCase().includes('carrier') ? 'carrier' :
                                           player.shipClass.toLowerCase().includes('battleship') ? 'battleship' :
                                           player.shipClass.toLowerCase().includes('cruiser') ? 'cruiser' :
                                           player.shipClass.toLowerCase().includes('destroyer') ? 'destroyer' :
                                           player.shipClass.toLowerCase().includes('submarine') ? 'submarine' : 'destroyer';

                            svg += this.drawShipSilhouette(pixelX, pixelY, shipType, color, cellSize);

                            // Turn position number over the silhouette (only show if player is in turn order)
                            if (turnPosition > 0) {
                                // Semi-transparent badge positioned over icon
                                svg += `
                                    <circle cx="${pixelX}" cy="${pixelY}" r="7" fill="url(#badge-gradient-${player.id})" stroke="#ffffff" stroke-width="1" opacity="0.85" filter="url(#badge-glow-${player.id})"/>
                                    <text x="${pixelX}" y="${pixelY + 4}" font-size="10" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 2px rgba(0,0,0,0.9);" class="map-text">${turnPosition}</text>
                                `;
                            }
                        }
                    }
                } catch (error) {
                    // Skip if coordinate parsing fails
                }
            }
        }

        // Draw enemy ships with enhanced styling and AI numbering
        // Enemies sorted by insertion order (lowest number to highest)
        const sortedEnemies = Array.from(game.enemies.values());

        sortedEnemies.forEach((enemy, index) => {
            if (enemy.position) {
                // Skip rendering if enemy is hidden in fog
                if (hiddenEnemies.has(enemy.id)) {
                    return;
                }

                try {
                    const coords = this.coordToNumbers(enemy.position);
                    if (coords) {
                        const pixelX = gridStartX + (coords.x * cellSize) + cellSize/2;
                        const pixelY = gridStartY + ((coords.y - 1) * cellSize) + cellSize/2;
                        const color = enemy.alive ? "#ef4444" : "#991b1b";
                        const aiNumber = index + 1; // AI numbering starts from 1

                        // Load enemy icon (alive or sunk)
                        const enemyIconBase64 = this.getEnemyClassIcon(enemy.shipClass, enemy.alive);

                        if (enemyIconBase64) {
                            // Apply rotation based on direction (if available), flip 180°
                            const rotation = enemy.direction !== undefined ? (enemy.direction + 180) % 360 : 180;

                            // Larger icon with rotation (18x18 to fill more of the cell)
                            svg += `<image x="${pixelX - 9}" y="${pixelY - 9}" width="18" height="18" xlink:href="${enemyIconBase64}" transform="rotate(${rotation} ${pixelX} ${pixelY})"/>`;

                            // AI position number badge over the icon (only for alive enemies)
                            if (enemy.alive) {
                                const badgeColor = "#ef4444";
                                svg += `
                                    <defs>
                                        <radialGradient id="enemy-badge-gradient-${enemy.id}" cx="50%" cy="30%">
                                            <stop offset="0%" style="stop-color:${badgeColor};stop-opacity:0.35" />
                                            <stop offset="100%" style="stop-color:#7f1d1d;stop-opacity:0.25" />
                                        </radialGradient>
                                        <filter id="enemy-badge-glow-${enemy.id}">
                                            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <circle cx="${pixelX}" cy="${pixelY}" r="5" fill="url(#enemy-badge-gradient-${enemy.id})" stroke="#ffffff" stroke-width="0.6" opacity="0.55" filter="url(#enemy-badge-glow-${enemy.id})"/>
                                    <text x="${pixelX}" y="${pixelY + 3}" font-size="7" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 3px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8);" class="map-text">${aiNumber}</text>
                                `;
                            }
                        } else {
                            // Fallback to enemy ship silhouette
                            const enemyShipType = enemy.shipClass ?
                                (enemy.shipClass.toLowerCase().includes('carrier') ? 'carrier' :
                                 enemy.shipClass.toLowerCase().includes('battleship') ? 'battleship' :
                                 enemy.shipClass.toLowerCase().includes('cruiser') ? 'cruiser' :
                                 enemy.shipClass.toLowerCase().includes('destroyer') ? 'destroyer' :
                                 enemy.shipClass.toLowerCase().includes('submarine') ? 'submarine' : 'destroyer') : 'destroyer';

                            svg += this.drawEnemyShipSilhouette(pixelX, pixelY, enemyShipType, color, cellSize);

                            // AI position number badge over the silhouette
                            svg += `
                                <circle cx="${pixelX}" cy="${pixelY}" r="7" fill="url(#enemy-badge-gradient-${enemy.id})" stroke="#ffffff" stroke-width="1" opacity="0.85" filter="url(#enemy-badge-glow-${enemy.id})"/>
                                <text x="${pixelX}" y="${pixelY + 4}" font-size="10" font-weight="bold" text-anchor="middle" fill="#ffffff" style="text-shadow: 0 1px 2px rgba(0,0,0,0.9);" class="map-text">${aiNumber}</text>
                            `;
                        }
                    }
                } catch (error) {
                    // Skip if coordinate parsing fails
                }
            }
        });

        // Draw mission objectives
        if (game.objective) {
            // Resource zone marker
            if (game.objective.type === 'resource_acquisition' && game.objective.resourceZone) {
                const coords = this.coordToNumbers(game.objective.resourceZone);
                if (coords) {
                    const pixelX = gridStartX + (coords.x * cellSize) + cellSize/2;
                    const pixelY = gridStartY + ((coords.y - 1) * cellSize) + cellSize/2;

                    // Draw circular outline around the zone (distinct magenta color)
                    const outlineRadius = cellSize * 2.5; // 2.5 cell radius for the zone
                    svg += `<circle cx="${pixelX}" cy="${pixelY}" r="${outlineRadius}" fill="none" stroke="#FF00FF" stroke-width="2.5" stroke-dasharray="5,3" opacity="0.8"/>`;
                    svg += `<circle cx="${pixelX}" cy="${pixelY}" r="${outlineRadius}" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="5,3" opacity="0.4"/>`;

                    // Use resources icon if available, otherwise fallback to gold circle
                    if (resourcesBase64) {
                        const iconSize = cellSize * 0.7;
                        const iconX = pixelX - iconSize/2;
                        const iconY = pixelY - iconSize/2;
                        svg += `<image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" xlink:href="${resourcesBase64}"/>`;
                    } else {
                        // Fallback: gold circle with text
                        svg += `<circle cx="${pixelX}" cy="${pixelY}" r="${cellSize * 0.4}" fill="#FFD700" stroke="#000" stroke-width="1.5"/>`;
                        svg += `<text x="${pixelX}" y="${pixelY + 3}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#000">RES</text>`;
                    }
                }
            }

            // Outpost marker
            if (game.objective.type === 'capture_outpost' && game.objective.outpostLocation) {
                const coords = this.coordToNumbers(game.objective.outpostLocation);
                if (coords) {
                    const pixelX = gridStartX + (coords.x * cellSize);
                    const pixelY = gridStartY + ((coords.y - 1) * cellSize);
                    const outpostColor = game.objective.outpostDestroyed ? '#8B0000' : '#8B4513';
                    svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}" fill="${outpostColor}" stroke="#000" stroke-width="1.5"/>`;
                    svg += `<text x="${pixelX + cellSize/2}" y="${pixelY + cellSize/2 + 2}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#FFFFFF">OUT</text>`;
                }
            }

            // Convoy escort ships
            if (game.objective.type === 'convoy_escort' && game.objective.convoyShips) {
                for (const convoy of game.objective.convoyShips) {
                    if (convoy.position) {
                        const coords = this.coordToNumbers(convoy.position);
                        if (coords) {
                            const pixelX = gridStartX + (coords.x * cellSize) + cellSize/2;
                            const pixelY = gridStartY + ((coords.y - 1) * cellSize) + cellSize/2;

                            // Use auxiliary icon if available, otherwise fallback to colored square
                            const iconToUse = convoy.alive ? auxiliaryBase64 : auxiliarySunkBase64;
                            if (iconToUse) {
                                const iconSize = cellSize * 0.7;
                                const iconX = pixelX - iconSize/2;
                                const iconY = pixelY - iconSize/2;
                                svg += `<image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" xlink:href="${iconToUse}"/>`;
                            } else {
                                // Fallback: colored square
                                const squareSize = cellSize * 0.8;
                                const squareX = pixelX - squareSize/2;
                                const squareY = pixelY - squareSize/2;
                                const convoyColor = convoy.alive ? '#9370DB' : '#4B0082';
                                svg += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="${convoyColor}" stroke="#000" stroke-width="1.5"/>`;
                                svg += `<text x="${pixelX}" y="${pixelY + 3}" text-anchor="middle" font-family="Arial" font-size="7" font-weight="bold" fill="#FFF">AX</text>`;
                            }
                        }
                    }
                }
            }

            // Convoy interception (enemy convoy ships)
            if (game.objective.type === 'convoy_interception' && game.objective.convoyShips) {
                for (const convoy of game.objective.convoyShips) {
                    if (convoy.position && !convoy.captured && !convoy.escaped) {
                        const coords = this.coordToNumbers(convoy.position);
                        if (coords) {
                            const pixelX = gridStartX + (coords.x * cellSize) + cellSize/2;
                            const pixelY = gridStartY + ((coords.y - 1) * cellSize) + cellSize/2;

                            // Use auxiliary icon if available, otherwise fallback to colored square
                            const iconToUse = convoy.alive ? auxiliaryBase64 : auxiliarySunkBase64;
                            if (iconToUse) {
                                const iconSize = cellSize * 0.7;
                                const iconX = pixelX - iconSize/2;
                                const iconY = pixelY - iconSize/2;
                                svg += `<image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" xlink:href="${iconToUse}"/>`;
                            } else {
                                // Fallback: colored square
                                const squareSize = cellSize * 0.8;
                                const squareX = pixelX - squareSize/2;
                                const squareY = pixelY - squareSize/2;
                                const convoyColor = convoy.alive ? '#9370DB' : '#4B0082';
                                svg += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="${convoyColor}" stroke="#000" stroke-width="1.5"/>`;
                                svg += `<text x="${pixelX}" y="${pixelY + 3}" text-anchor="middle" font-family="Arial" font-size="6" font-weight="bold" fill="#FFF">EAX</text>`;
                            }
                        }
                    }
                }
            }

            // Salvage zones
            if (game.objective.type === 'salvage_supplies' && game.objective.salvageZones) {
                for (const zone of game.objective.salvageZones) {
                    if (zone.location && zone.wreck) {
                        const coords = this.coordToNumbers(zone.location);
                        if (coords) {
                            const pixelX = gridStartX + (coords.x * cellSize) + cellSize/2;
                            const pixelY = gridStartY + ((coords.y - 1) * cellSize) + cellSize/2;

                            // Use sunk auxiliary icon (salvage zones are always wrecks)
                            if (auxiliarySunkBase64) {
                                const iconSize = cellSize * 0.7;
                                const iconX = pixelX - iconSize/2;
                                const iconY = pixelY - iconSize/2;
                                svg += `<image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" xlink:href="${auxiliarySunkBase64}"/>`;

                                // Add colored border to indicate salvage status
                                const borderSize = cellSize * 0.85;
                                const borderX = pixelX - borderSize/2;
                                const borderY = pixelY - borderSize/2;
                                const zoneColor = zone.captured ? '#00FF00' : zone.currentPlayer ? '#FFFF00' : '#20B2AA';
                                svg += `<rect x="${borderX}" y="${borderY}" width="${borderSize}" height="${borderSize}" fill="none" stroke="${zoneColor}" stroke-width="2"/>`;
                            } else {
                                // Fallback: colored square
                                const squareSize = cellSize * 0.8;
                                const squareX = pixelX - squareSize/2;
                                const squareY = pixelY - squareSize/2;
                                const zoneColor = zone.captured ? '#00FF00' : zone.currentPlayer ? '#FFFF00' : '#20B2AA';
                                svg += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="#4B0082" stroke="${zoneColor}" stroke-width="2"/>`;
                                svg += `<text x="${pixelX}" y="${pixelY + 3}" text-anchor="middle" font-family="Arial" font-size="7" font-weight="bold" fill="#FFFFFF">AX</text>`;
                            }
                        }
                    }
                }
            }

            // Destination zone markers
            for (let x = 0; x < mapSize; x++) {
                for (let y = 0; y < mapSize; y++) {
                    const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                    try {
                        const cell = game.getMapCell(coord);
                        if (cell && cell.type === 'destination_zone') {
                            const pixelX = gridStartX + (x * cellSize);
                            const pixelY = gridStartY + (y * cellSize);
                            svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}" fill="#FFFF00" fill-opacity="0.3" stroke="#FFD700" stroke-width="0.5"/>`;

                            if (cell.isDestinationCenter) {
                                const centerX = pixelX + cellSize/2;
                                const centerY = pixelY + cellSize/2;
                                svg += `<circle cx="${centerX}" cy="${centerY}" r="${cellSize/3}" fill="#FFD700" stroke="#FF8C00" stroke-width="2"/>`;
                                svg += `<text x="${centerX}" y="${centerY + 2}" text-anchor="middle" font-family="Arial" font-size="7" font-weight="bold" fill="#000">DEST</text>`;
                            }
                        }
                    } catch (error) {
                        // Skip problematic cells
                    }
                }
            }
        }

        // Add fog of war layer (using pre-calculated visible cells)
        if (game.weather === 'fog' || game.weather === 'thunderstorm' || game.weather === 'hurricane') {
            // Create fog layer - all cells start covered, remove visible ones
            const fogCells = new Set();
            for (let x = 0; x < mapSize; x++) {
                for (let y = 0; y < mapSize; y++) {
                    const cellKey = `${x},${y}`;
                    if (!visibleCells.has(cellKey)) {
                        fogCells.add(cellKey);
                    }
                }
            }

            console.log(`🌫️ Rendering fog for ${game.weather}: ${fogCells.size} cells covered, ${visibleCells.size} cells visible`);

            if (fogCells.size > 0) {
                // Draw fog layer with cloud pattern - render each fogged cell
                for (const fogCell of fogCells) {
                    const [x, y] = fogCell.split(',').map(Number);
                    const pixelX = gridStartX + (x * cellSize);
                    const pixelY = gridStartY + (y * cellSize);

                    // Different fog intensity based on weather
                    let fogOpacity = 0.65;
                    let cloudOpacity = 0.75;
                    if (game.weather === 'hurricane') {
                        fogOpacity = 0.85;
                        cloudOpacity = 0.9;
                    } else if (game.weather === 'thunderstorm') {
                        fogOpacity = 0.75;
                        cloudOpacity = 0.85;
                    }

                    // Base dark overlay
                    svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                            fill="#2c3e50" opacity="${fogOpacity}"/>`;

                    // Lighter cloud texture overlay
                    svg += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}"
                            fill="#7f8c8d" opacity="${cloudOpacity * 0.3}"/>`;
                }
            }

            // Store hidden enemies for later filtering
            game._hiddenEnemies = hiddenEnemies;
        } else {
            // Clear hidden enemies when weather is clear
            game._hiddenEnemies = new Set();
        }

        // Add clean status panels with dynamic sizing
        const panelX = gridStartX + (mapSize * cellSize) + 30;
        const playerCount = game.players.size;
        const minPlayerHeight = 60; // Base height for title and padding
        const playerEntryHeight = 26; // Height per player entry
        const playerPanelHeight = minPlayerHeight + (playerCount * playerEntryHeight);

        // Player status panel (dynamic height)
        svg += `<g class="map-text">`;
        svg += `<rect x="${panelX}" y="60" width="200" height="${playerPanelHeight}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4"/>`;
        svg += `<text x="${panelX + 10}" y="80" font-size="14" font-weight="bold" fill="#1f2937">Player Forces</text>`;

        let yPos = 100;
        let displayedPlayers = 0;

        // Convert players to array and sort by join order (Map insertion order is preserved)
        const orderedPlayers = Array.from(game.players.values());

        for (const player of orderedPlayers) {
            if (displayedPlayers >= 6) break; // Limit for clean display
            const shipName = (player.displayName || player.username || player.shipClass || 'Ship').substring(0, 15);
            const positionNumber = displayedPlayers + 1; // Position number (1-based)

            // Get ship class icon (alive or sunk)
            const iconPath = this.getShipClassIcon(player.shipClass, player.alive);

            // Calculate health percentage
            const currentHealth = player.currentHealth !== undefined ? player.currentHealth : (player.maxHealth || 100);
            const maxHealth = player.maxHealth || 100;
            const healthPercent = Math.max(0, (currentHealth / maxHealth) * 100);

            // Determine health bar color
            let healthColor = '#ef4444'; // Red for <25%
            if (healthPercent >= 50) {
                healthColor = '#10b981'; // Green for 50-100%
            } else if (healthPercent >= 25) {
                healthColor = '#f59e0b'; // Yellow for 25-49%
            }

            // Ship class icon (16x16) with white background for visibility
            if (iconPath) {
                // White background rectangle for icon visibility
                svg += `<rect x="${panelX + 4}" y="${yPos - 9}" width="18" height="18" fill="#ffffff" stroke="#ffffff" stroke-width="1" rx="2"/>`;
                svg += `<image x="${panelX + 5}" y="${yPos - 8}" width="16" height="16" href="${iconPath}"/>`;
            } else {
                // Fallback circle if icon not found
                const color = player.alive ? "#10b981" : "#ef4444";
                svg += `<circle cx="${panelX + 13}" cy="${yPos - 1}" r="4" fill="${color}"/>`;
            }

            // Ship name with position number
            svg += `<text x="${panelX + 25}" y="${yPos - 2}" font-size="10" fill="#374151">${positionNumber}. ${shipName}</text>`;

            // Health bar background
            const healthBarWidth = 120;
            const healthBarHeight = 8;
            svg += `<rect x="${panelX + 25}" y="${yPos + 2}" width="${healthBarWidth}" height="${healthBarHeight}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.5" rx="2"/>`;

            // Health bar fill
            const fillWidth = (healthPercent / 100) * healthBarWidth;
            svg += `<rect x="${panelX + 25}" y="${yPos + 2}" width="${fillWidth}" height="${healthBarHeight}" fill="${healthColor}" rx="2"/>`;

            // Health text (high contrast)
            const healthText = `${currentHealth}/${maxHealth}`;
            const textColor = healthPercent < 25 ? '#ffffff' : '#000000'; // White text on red, black on green/yellow
            svg += `<text x="${panelX + 25 + (healthBarWidth / 2)}" y="${yPos + 7}" font-size="8" font-weight="bold" fill="${textColor}" text-anchor="middle">${healthText}</text>`;

            yPos += 22; // Increased spacing for health bars
            displayedPlayers++;
        }

        // Enemy status panel (positioned below player panel with dynamic sizing)
        const enemyPanelY = 60 + playerPanelHeight + 20; // 20px gap between panels
        const enemyCount = game.enemies.size;
        const minEnemyHeight = 60; // Base height for title and padding
        const enemyEntryHeight = 26; // Height per enemy entry
        const enemyPanelHeight = minEnemyHeight + (enemyCount * enemyEntryHeight);

        svg += `<rect x="${panelX}" y="${enemyPanelY}" width="200" height="${enemyPanelHeight}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4"/>`;
        svg += `<text x="${panelX + 10}" y="${enemyPanelY + 20}" font-size="14" font-weight="bold" fill="#1f2937">Enemy Forces</text>`;

        yPos = enemyPanelY + 40;
        let enemyDisplayCount = 0;
        for (const enemy of game.enemies.values()) {
            const enemyName = (enemy.customName || enemy.shipClass || 'Enemy').substring(0, 20);

            // Get enemy class icon (alive or sunk)
            const iconPath = this.getEnemyClassIcon(enemy.shipClass, enemy.alive);

            // Enemy class icon (16x16) with white background for visibility
            if (iconPath) {
                // White background rectangle for icon visibility
                svg += `<rect x="${panelX + 4}" y="${yPos - 9}" width="18" height="18" fill="#ffffff" stroke="#ffffff" stroke-width="1" rx="2"/>`;
                svg += `<image x="${panelX + 5}" y="${yPos - 8}" width="16" height="16" href="${iconPath}"/>`;
            } else {
                // Fallback circle if icon not found
                const color = enemy.alive ? "#ef4444" : "#991b1b";
                svg += `<circle cx="${panelX + 13}" cy="${yPos - 1}" r="4" fill="${color}"/>`;
            }

            // Enemy name
            svg += `<text x="${panelX + 25}" y="${yPos - 2}" font-size="10" fill="#374151">${enemyName}</text>`;

            // Calculate health percentage
            const currentHealth = enemy.currentHealth !== undefined ? enemy.currentHealth : (enemy.maxHealth || 100);
            const maxHealth = enemy.maxHealth || 100;
            const healthPercent = Math.max(0, (currentHealth / maxHealth) * 100);

            // Determine health bar color (black for dead, red for alive)
            let healthColor = enemy.alive ? '#ec1c24' : '#000000';
            let bgColor = enemy.alive ? '#e5e7eb' : '#000000';
            let borderColor = enemy.alive ? '#d1d5db' : '#000000';

            // Health bar background
            const healthBarWidth = 120;
            const healthBarHeight = 8;
            svg += `<rect x="${panelX + 25}" y="${yPos + 2}" width="${healthBarWidth}" height="${healthBarHeight}" fill="${bgColor}" stroke="${borderColor}" stroke-width="0.5" rx="2"/>`;

            // Health bar fill
            const fillWidth = (healthPercent / 100) * healthBarWidth;
            svg += `<rect x="${panelX + 25}" y="${yPos + 2}" width="${fillWidth}" height="${healthBarHeight}" fill="${healthColor}" rx="2"/>`;

            // Health text (white for dead, conditional for alive)
            const healthText = `${currentHealth}/${maxHealth}`;
            const textColor = !enemy.alive ? '#ffffff' : (healthPercent < 25 ? '#ffffff' : '#000000');
            svg += `<text x="${panelX + 25 + (healthBarWidth / 2)}" y="${yPos + 7}" font-size="8" font-weight="bold" fill="${textColor}" text-anchor="middle">${healthText}</text>`;

            yPos += 26; // More spacing between AI entries
            enemyDisplayCount++;
        }

        svg += `</g>`;

        // Calculate map bottom position
        const mapBottom = gridStartY + (mapSize * cellSize);

        // Position panels horizontally aligned with force panels but at map bottom
        const mapEndX = gridStartX + (mapSize * cellSize);
        const panelStartX = mapEndX + 30; // Same X as force panels

        const legendHeight = 340;
        const legendY = mapBottom - legendHeight;

        // Position mission status horizontally aligned with player forces
        const missionStatusX = panelStartX;
        const missionStatusY = legendY - 100;

        // Position legend directly under mission status panel, aligned with it
        const legendX = missionStatusX; // Same X as mission status

        // Mission status panel (moved above legend)
        svg += `<g class="map-text">`;
        svg += `<rect x="${missionStatusX}" y="${missionStatusY}" width="200" height="80" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4"/>`;
        svg += `<text x="${missionStatusX + 10}" y="${missionStatusY + 20}" font-size="14" font-weight="bold" fill="#1f2937">Mission Status</text>`;
        svg += `<text x="${missionStatusX + 10}" y="${missionStatusY + 40}" font-size="11" fill="#374151">Turn: ${game.turnNumber || 1}</text>`;

        if (game.currentObjective) {
            const objName = game.currentObjective.name.substring(0, 20);
            svg += `<text x="${missionStatusX + 10}" y="${missionStatusY + 55}" font-size="11" fill="#374151">Objective: ${objName}</text>`;
        }

        svg += `</g>`;

        // Add expanded legend with infrastructure (aligned with map bottom)
        svg += `<g class="map-text">`;
        svg += `<rect x="${legendX}" y="${legendY}" width="370" height="${legendHeight}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4"/>`;
        svg += `<text x="${legendX + 10}" y="${legendY + 20}" font-size="14" font-weight="bold" fill="#1f2937">Legend</text>`;

        // Terrain legend (left column)
        svg += `<text x="${legendX + 10}" y="${legendY + 40}" font-size="12" font-weight="bold" fill="#374151">Terrain</text>`;
        const terrainItems = [
            { color: '#3b82f6', name: 'Ocean' },
            { color: '#166534', name: 'Island' },
            { color: '#0891b2', name: 'Reef' },
            { color: '#10b981', name: 'Spawn Area' },
            { color: '#8B0000', name: 'Minefield', isMine: true }
        ];

        yPos = legendY + 55;
        for (const item of terrainItems) {
            if (item.isMine && mineBase64) {
                // Show mine icon in legend
                svg += `<image x="${legendX + 15}" y="${yPos - 8}" width="10" height="10" xlink:href="${mineBase64}"/>`;
            } else {
                svg += `<rect x="${legendX + 15}" y="${yPos - 8}" width="10" height="10" fill="${item.color}" stroke="#ffffff" stroke-width="1"/>`;
            }
            svg += `<text x="${legendX + 30}" y="${yPos}" font-size="10" fill="#374151">${item.name}</text>`;
            yPos += 15;
        }

        // Current Weather section (right of Terrain)
        const weatherX = legendX + 150;
        let weatherY = legendY + 40;
        svg += `<text x="${weatherX}" y="${weatherY}" font-size="12" font-weight="bold" fill="#374151">Current Weather</text>`;
        weatherY += 25; // Increased spacing from title

        // Weather display with icon and name
        const weatherName = game.weather.charAt(0).toUpperCase() + game.weather.slice(1);
        let weatherIcon = '';
        let weatherColor = '#374151';

        switch (game.weather) {
            case 'clear':
                weatherIcon = '☀️';
                weatherColor = '#fbbf24'; // Yellow
                break;
            case 'rain':
                weatherIcon = '🌧️';
                weatherColor = '#60a5fa'; // Blue
                break;
            case 'fog':
                weatherIcon = '🌫️';
                weatherColor = '#9ca3af'; // Gray
                break;
            case 'thunderstorm':
                weatherIcon = '⛈️';
                weatherColor = '#6366f1'; // Indigo
                break;
            case 'hurricane':
                weatherIcon = '🌀';
                weatherColor = '#dc2626'; // Red
                break;
            default:
                weatherIcon = '🌤️';
                weatherColor = '#374151';
        }

        svg += `<text x="${weatherX + 5}" y="${weatherY}" font-size="24">${weatherIcon}</text>`;
        svg += `<text x="${weatherX + 40}" y="${weatherY - 3}" font-size="12" font-weight="bold" fill="${weatherColor}">${weatherName}</text>`;

        // Add visibility warning for reduced visibility weather
        let visibilityText = '';
        if (game.weather === 'hurricane') {
            visibilityText = '⚠️ Visibility: 5 cells';
        } else if (game.weather === 'thunderstorm') {
            visibilityText = '⚠️ Visibility: 10 cells';
        } else if (game.weather === 'fog') {
            visibilityText = '⚠️ Visibility: 15 cells';
        }

        if (visibilityText) {
            weatherY += 20; // Increased spacing for visibility warning
            svg += `<text x="${weatherX + 5}" y="${weatherY}" font-size="9" fill="#dc2626" font-style="italic">${visibilityText}</text>`;
        }

        // Infrastructure legend
        yPos += 15;
        svg += `<text x="${legendX + 10}" y="${yPos}" font-size="12" font-weight="bold" fill="#374151">Infrastructure</text>`;
        yPos += 20;

        const infrastructureItems = [
            { icon: this.drawMiniCity('major'), name: 'Major City' },
            { icon: this.drawMiniCity('town'), name: 'Town' },
            { icon: this.drawMiniAirfield(), name: 'Airfield' },
            { icon: this.drawMiniMilitary(), name: 'Military Base' },
            { icon: this.drawMiniPort(), name: 'Port Facility' },
            { icon: this.drawMiniIndustrial(), name: 'Industrial' },
            { icon: this.drawMiniHarbor(), name: 'Harbor' },
            { icon: this.drawMiniLighthouse(), name: 'Lighthouse' }
        ];

        // Split into two columns: 4 items in first column, 4 in second
        const firstColumn = infrastructureItems.slice(0, 4);
        const secondColumn = infrastructureItems.slice(4, 8);

        // First column
        let currentY = yPos;
        for (const item of firstColumn) {
            svg += `<g transform="translate(${legendX + 20}, ${currentY - 3})">${item.icon}</g>`;
            svg += `<text x="${legendX + 50}" y="${currentY}" font-size="10" fill="#374151">${item.name}</text>`;
            currentY += 30;
        }

        // Second column
        currentY = yPos;
        for (const item of secondColumn) {
            svg += `<g transform="translate(${legendX + 200}, ${currentY - 3})">${item.icon}</g>`;
            svg += `<text x="${legendX + 230}" y="${currentY}" font-size="10" fill="#374151">${item.name}</text>`;
            currentY += 30;
        }

        // Update yPos to account for the tallest column
        yPos = Math.max(yPos + (firstColumn.length * 25), yPos + (secondColumn.length * 25));

        svg += `</g>`;

        // Add compass icon
        console.log('🧭 Adding compass to SVG, compassBase64 exists:', !!compassBase64);
        if (compassBase64) {
            // Position adjusted: x=80 (moved left 20px from 100), y=70
            svg += `<image x="80" y="70" width="100" height="100" xlink:href="${compassBase64}" opacity="0.3"/>`;
            console.log('✅ Compass added to SVG');
        } else {
            console.warn('⚠️ Compass not added - compassBase64 is empty');
        }

        svg += '</svg>';
        console.log('✅ Clean SVG generation completed');
        return svg;
    }

    drawShipSilhouette(x, y, shipType, color, cellSize) {
        let silhouette = '';
        const scale = Math.min(cellSize / 20, 1); // Scale based on cell size

        switch (shipType) {
            case 'carrier':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-8" y="-3" width="16" height="6" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-6" y="-5" width="12" height="2" fill="${color}"/>
                    <rect x="-4" y="-7" width="8" height="2" fill="${color}"/>
                    <circle cx="0" cy="0" r="2" fill="#ffffff"/>
                </g>`;
                break;
            case 'battleship':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-7" y="-2" width="14" height="4" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-5" y="-4" width="10" height="2" fill="${color}"/>
                    <rect x="-3" y="-6" width="6" height="2" fill="${color}"/>
                    <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
                </g>`;
                break;
            case 'cruiser':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-6" y="-2" width="12" height="4" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-4" y="-4" width="8" height="2" fill="${color}"/>
                    <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
                </g>`;
                break;
            case 'destroyer':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-5" y="-1.5" width="10" height="3" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-3" y="-3" width="6" height="2" fill="${color}"/>
                    <circle cx="0" cy="0" r="1" fill="#ffffff"/>
                </g>`;
                break;
            case 'submarine':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <ellipse cx="0" cy="0" rx="6" ry="2" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-1" y="-4" width="2" height="3" fill="${color}"/>
                    <circle cx="0" cy="0" r="1" fill="#ffffff"/>
                </g>`;
                break;
            default:
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-4" y="-1.5" width="8" height="3" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <circle cx="0" cy="0" r="1" fill="#ffffff"/>
                </g>`;
        }

        return silhouette;
    }

    getShipClassIcon(shipClass, isAlive = true) {
        if (!shipClass) return null;

        const path = require('path');
        const lowerClass = shipClass.toLowerCase();
        let imagePath;

        // Choose folder based on player status
        const iconFolder = isAlive ? path.resolve('./icons/class') : path.resolve('./icons/sunk_player');

        // Map ship classes to icon files in the appropriate folder
        if (lowerClass.includes('battleship') || lowerClass.includes('bb')) {
            imagePath = path.join(iconFolder, 'battleship.png');
        } else if (lowerClass.includes('aircraft carrier') || lowerClass.includes('carrier') || lowerClass.includes('cv')) {
            imagePath = path.join(iconFolder, 'carrier.png');
        } else if (lowerClass.includes('heavy cruiser') || lowerClass.includes('light cruiser') || lowerClass.includes('cruiser') || lowerClass.includes('ca') || lowerClass.includes('cl')) {
            imagePath = path.join(iconFolder, 'cruiser.png'); // Both heavy and light cruisers use the same icon
        } else if (lowerClass.includes('destroyer') || lowerClass.includes('dd')) {
            imagePath = path.join(iconFolder, 'destroyer.png');
        } else if (lowerClass.includes('submarine') || lowerClass.includes('ss')) {
            imagePath = path.join(iconFolder, 'submarine.png');
        } else if (lowerClass.includes('auxiliary') || lowerClass.includes('ax')) {
            imagePath = path.join(iconFolder, 'auxiliary.png');
        } else {
            // Default fallback
            imagePath = path.join(iconFolder, 'destroyer.png');
        }

        try {
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = 'image/png';
                return `data:${mimeType};base64,${base64Image}`;
            }
        } catch (error) {
            console.log(`Error loading ship class icon ${imagePath}:`, error);
        }
        return null; // Return null if image can't be loaded
    }

    getEnemyClassIcon(shipClass, isAlive = true) {
        if (!shipClass) return null;

        const path = require('path');
        const lowerClass = shipClass.toLowerCase();
        let imagePath;

        // Choose folder based on enemy status
        const iconFolder = isAlive ? path.resolve('./icons/enemy') : path.resolve('./icons/sunk_enemy');

        // Map ship classes to icon files in the appropriate folder
        if (lowerClass.includes('battleship') || lowerClass.includes('bb')) {
            imagePath = path.join(iconFolder, 'battleship.png');
        } else if (lowerClass.includes('aircraft carrier') || lowerClass.includes('carrier') || lowerClass.includes('cv')) {
            imagePath = path.join(iconFolder, 'carrier.png');
        } else if (lowerClass.includes('heavy cruiser') || lowerClass.includes('light cruiser') || lowerClass.includes('cruiser') || lowerClass.includes('ca') || lowerClass.includes('cl')) {
            imagePath = path.join(iconFolder, 'cruiser.png'); // Both heavy and light cruisers use the same icon
        } else if (lowerClass.includes('destroyer') || lowerClass.includes('dd')) {
            imagePath = path.join(iconFolder, 'destroyer.png');
        } else if (lowerClass.includes('submarine') || lowerClass.includes('ss')) {
            imagePath = path.join(iconFolder, 'submarine.png');
        } else if (lowerClass.includes('auxiliary') || lowerClass.includes('ax')) {
            imagePath = path.join(iconFolder, 'auxiliary.png');
        } else {
            // Default fallback
            imagePath = path.join(iconFolder, 'destroyer.png');
        }

        try {
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = 'image/png';
                return `data:${mimeType};base64,${base64Image}`;
            }
        } catch (error) {
            console.log(`Error loading enemy class icon ${imagePath}:`, error);
        }

        return null; // Return null if image can't be loaded
    }

    drawEnemyShipSilhouette(x, y, shipType, color, cellSize) {
        let silhouette = '';
        const scale = Math.min(cellSize / 20, 1);

        switch (shipType) {
            case 'carrier':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-8" y="-3" width="16" height="6" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-6" y="-5" width="12" height="2" fill="${color}"/>
                    <rect x="-4" y="-7" width="8" height="2" fill="${color}"/>
                    <rect x="-2" y="-2" width="4" height="4" fill="#ffffff"/>
                </g>`;
                break;
            case 'battleship':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-7" y="-2" width="14" height="4" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-5" y="-4" width="10" height="2" fill="${color}"/>
                    <rect x="-3" y="-6" width="6" height="2" fill="${color}"/>
                    <rect x="-1.5" y="-1.5" width="3" height="3" fill="#ffffff"/>
                </g>`;
                break;
            case 'cruiser':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-6" y="-2" width="12" height="4" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-4" y="-4" width="8" height="2" fill="${color}"/>
                    <rect x="-1.5" y="-1.5" width="3" height="3" fill="#ffffff"/>
                </g>`;
                break;
            case 'destroyer':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-5" y="-1.5" width="10" height="3" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-3" y="-3" width="6" height="2" fill="${color}"/>
                    <rect x="-1" y="-1" width="2" height="2" fill="#ffffff"/>
                </g>`;
                break;
            case 'submarine':
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <ellipse cx="0" cy="0" rx="6" ry="2" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-1" y="-4" width="2" height="3" fill="${color}"/>
                    <rect x="-1" y="-1" width="2" height="2" fill="#ffffff"/>
                </g>`;
                break;
            default:
                silhouette = `
                <g transform="translate(${x}, ${y}) scale(${scale})">
                    <rect x="-4" y="-1.5" width="8" height="3" fill="${color}" stroke="#ffffff" stroke-width="1"/>
                    <rect x="-1" y="-1" width="2" height="2" fill="#ffffff"/>
                </g>`;
        }

        return silhouette;
    }

    generateIslandInfrastructure(x, y, cellSize, gridX, gridY) {
        // Probability-based infrastructure generation with much lower chance
        const rand = (gridX * 7 + gridY * 13) % 100; // Deterministic randomness based on position
        let infrastructure = '';

        if (cellSize < 12) return null; // Too small to show details

        // Much lower probability - most island cells should be empty land
        if (rand < 3) {
            // Major city (3% chance)
            infrastructure = this.drawCity(x, y, cellSize, 'major');
        } else if (rand < 8) {
            // Town (5% chance)
            infrastructure = this.drawCity(x, y, cellSize, 'town');
        } else if (rand < 11) {
            // Airfield (3% chance)
            infrastructure = this.drawAirfield(x, y, cellSize);
        } else if (rand < 16) {
            // Port facility (5% chance)
            infrastructure = this.drawPortFacility(x, y, cellSize);
        } else if (rand < 21) {
            // Military base (5% chance)
            infrastructure = this.drawMilitaryBase(x, y, cellSize);
        } else if (rand < 30) {
            // Industrial facility (6% chance)
            infrastructure = this.drawIndustrialFacility(x, y, cellSize);
        } else if (rand === 30) {
            // Port gun installation (1% chance - very rare defensive structure)
            infrastructure = this.drawPortGun(x, y, cellSize);
        }
        // 69% chance of no infrastructure (natural/rural land)

        return infrastructure;
    }

    generateHarborInfrastructure(x, y, cellSize, gridX, gridY) {
        // This method is no longer used - harbors removed from spawn zones
        return null;
    }

    generateSeaInfrastructure(x, y, cellSize, gridX, gridY) {
        const rand = (gridX * 11 + gridY * 17) % 100;

        if (cellSize < 12) return null;

        if (rand < 2) {
            // Oil rig (2% chance)
            return this.drawOilRig(x, y, cellSize);
        } else if (rand < 4) {
            // Lighthouse (2% chance)
            return this.drawLighthouse(x, y, cellSize);
        } else if (rand < 6) {
            // Buoy or sea marker (2% chance)
            return this.drawSeaMarker(x, y, cellSize);
        }

        return null;
    }

    identifyIslandGroups(game, mapSize) {
        const visited = new Set();
        const islandGroups = [];

        for (let x = 0; x < mapSize; x++) {
            for (let y = 0; y < mapSize; y++) {
                const key = `${x},${y}`;
                if (visited.has(key)) continue;

                try {
                    const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                    const cell = game.getMapCell(coord);

                    if (cell.type === 'island') {
                        // Found an unvisited island, start a new group
                        const group = this.floodFillIsland(game, mapSize, x, y, visited);
                        if (group.length > 0) {
                            islandGroups.push(group);
                        }
                    }
                } catch (error) {
                    // Skip problematic cells
                }
            }
        }

        return islandGroups;
    }

    floodFillIsland(game, mapSize, startX, startY, visited) {
        const group = [];
        const stack = [{x: startX, y: startY}];

        while (stack.length > 0) {
            const {x, y} = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key) || x < 0 || x >= mapSize || y < 0 || y >= mapSize) {
                continue;
            }

            try {
                const coord = GameUtils.generateExtendedCoordinate(x, y + 1);
                const cell = game.getMapCell(coord);

                if (cell.type === 'island') {
                    visited.add(key);
                    group.push({x, y});

                    // Add adjacent cells to stack
                    stack.push({x: x + 1, y});
                    stack.push({x: x - 1, y});
                    stack.push({x, y: y + 1});
                    stack.push({x, y: y - 1});
                }
            } catch (error) {
                // Skip problematic cells
            }
        }

        return group;
    }

    generateClusteredInfrastructure(islandGroup, gridStartX, gridStartY, cellSize, game) {
        const infrastructure = [];

        if (islandGroup.length < 3) {
            // Too small for infrastructure
            return infrastructure;
        }

        // Create a deterministic but pseudo-random seed based on island group
        const groupSeed = islandGroup.reduce((sum, cell) => sum + cell.x * 7 + cell.y * 13, 0);

        // Determine if this island gets infrastructure (30% chance)
        if (groupSeed % 100 > 30) {
            return infrastructure;
        }

        // Choose infrastructure type based on island size and seed
        const infrastructureType = this.chooseInfrastructureType(islandGroup.length, groupSeed);

        // Find the center of the island group
        const centerX = Math.round(islandGroup.reduce((sum, cell) => sum + cell.x, 0) / islandGroup.length);
        const centerY = Math.round(islandGroup.reduce((sum, cell) => sum + cell.y, 0) / islandGroup.length);

        // Generate clustered infrastructure around the center
        const cluster = this.generateInfrastructureCluster(infrastructureType, centerX, centerY, islandGroup, groupSeed);

        for (const item of cluster) {
            const pixelX = gridStartX + (item.x * cellSize);
            const pixelY = gridStartY + (item.y * cellSize);

            const infraSvg = this.drawInfrastructureByType(item.type, pixelX, pixelY, cellSize);
            if (infraSvg) {
                // Generate name for cities and towns
                let name = null;
                if (item.type === 'major_city' || item.type === 'port_facility') {
                    name = game.nameGenerator.generateCityName();
                } else if (item.type === 'town') {
                    name = game.nameGenerator.generateTownName();
                }

                infrastructure.push({
                    svg: infraSvg,
                    name: name,
                    x: pixelX,
                    y: pixelY
                });
            }
        }

        return infrastructure;
    }

    chooseInfrastructureType(islandSize, seed) {
        const typeRand = seed % 100;

        if (islandSize > 20) {
            // Large islands - can support major infrastructure
            if (typeRand < 20) return 'major_city';
            if (typeRand < 35) return 'military_base';
            if (typeRand < 50) return 'port_city';
            if (typeRand < 65) return 'industrial_complex';
            return 'airfield_base';
        } else if (islandSize > 8) {
            // Medium islands
            if (typeRand < 25) return 'town';
            if (typeRand < 45) return 'military_outpost';
            if (typeRand < 65) return 'port_facility';
            return 'small_airfield';
        } else {
            // Small islands
            if (typeRand < 40) return 'town';
            if (typeRand < 70) return 'outpost';
            return 'lighthouse';
        }
    }

    generateInfrastructureCluster(type, centerX, centerY, islandGroup, seed) {
        const cluster = [];
        const islandSet = new Set(islandGroup.map(cell => `${cell.x},${cell.y}`));

        switch (type) {
            case 'major_city':
                // Dense urban cluster
                cluster.push({x: centerX, y: centerY, type: 'major_city'});
                this.addNearbyInfrastructure(cluster, centerX, centerY, islandSet, ['town', 'industrial'], 3, seed);
                break;

            case 'military_base':
                // Military compound
                cluster.push({x: centerX, y: centerY, type: 'military_base'});
                this.addNearbyInfrastructure(cluster, centerX, centerY, islandSet, ['military_outpost', 'airfield'], 2, seed + 1);
                break;

            case 'port_city':
                // Port with supporting infrastructure
                cluster.push({x: centerX, y: centerY, type: 'port_facility'});
                this.addNearbyInfrastructure(cluster, centerX, centerY, islandSet, ['town', 'industrial'], 2, seed + 2);
                break;

            case 'industrial_complex':
                // Industrial area
                cluster.push({x: centerX, y: centerY, type: 'industrial'});
                this.addNearbyInfrastructure(cluster, centerX, centerY, islandSet, ['industrial', 'town'], 2, seed + 3);
                break;

            case 'airfield_base':
                // Airfield with support
                cluster.push({x: centerX, y: centerY, type: 'airfield'});
                this.addNearbyInfrastructure(cluster, centerX, centerY, islandSet, ['military_outpost', 'town'], 1, seed + 4);
                break;

            case 'town':
                cluster.push({x: centerX, y: centerY, type: 'town'});
                this.addNearbyInfrastructure(cluster, centerX, centerY, islandSet, ['industrial'], 1, seed + 5);
                break;

            default:
                // Single infrastructure
                cluster.push({x: centerX, y: centerY, type: type});
        }

        return cluster;
    }

    addNearbyInfrastructure(cluster, centerX, centerY, islandSet, types, maxCount, seed) {
        const directions = [
            {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1},
            {x: -1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1}, {x: 1, y: -1}
        ];

        let added = 0;
        let distance = 2; // Start at distance 2 instead of 1 for better spacing

        while (added < maxCount && distance <= 5) { // Increased max distance to 5
            for (const dir of directions) {
                if (added >= maxCount) break;

                const x = centerX + (dir.x * distance);
                const y = centerY + (dir.y * distance);
                const key = `${x},${y}`;

                // Check if this position is far enough from existing infrastructure
                const tooClose = cluster.some(item => {
                    const dx = Math.abs(item.x - x);
                    const dy = Math.abs(item.y - y);
                    return (dx < 2 && dy < 2); // Minimum 2-cell distance between infrastructure
                });

                if (islandSet.has(key) && !tooClose) {
                    const typeIndex = (seed + added + x + y) % types.length;
                    cluster.push({x, y, type: types[typeIndex]});
                    added++;
                }
            }
            distance++;
        }
    }

    drawInfrastructureByType(type, x, y, cellSize) {
        switch (type) {
            case 'major_city':
                return this.drawCity(x, y, cellSize, 'major');
            case 'town':
                return this.drawCity(x, y, cellSize, 'town');
            case 'military_base':
            case 'military_outpost':
                return this.drawMilitaryBase(x, y, cellSize);
            case 'port_facility':
                return this.drawPortFacility(x, y, cellSize);
            case 'industrial':
                return this.drawIndustrialFacility(x, y, cellSize);
            case 'airfield':
            case 'small_airfield':
                return this.drawAirfield(x, y, cellSize);
            case 'outpost':
                return this.drawMilitaryBase(x, y, cellSize);
            case 'lighthouse':
                return this.drawLighthouse(x, y, cellSize);
            case 'port_gun':
                return this.drawPortGun(x, y, cellSize);
            default:
                return null;
        }
    }

    drawCity(x, y, cellSize, type) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5); // Larger scale, minimum size

        if (type === 'major') {
            return `
            <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
                <!-- Major city with multiple buildings and depth -->
                <!-- Skyscraper 1 with shadow -->
                <rect x="-6" y="-4" width="3" height="5" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="-5.8" y="-3.8" width="2.6" height="4.6" fill="#4a5568" opacity="0.3"/>
                <!-- Skyscraper 2 (tallest) with shadow -->
                <rect x="-2" y="-6" width="4" height="7" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="-1.8" y="-5.8" width="3.6" height="6.6" fill="#4a5568" opacity="0.3"/>
                <!-- Skyscraper 3 with shadow -->
                <rect x="3" y="-3" width="3" height="4" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="3.2" y="-2.8" width="2.6" height="3.6" fill="#4a5568" opacity="0.3"/>
                <!-- Office building 1 with shadow -->
                <rect x="-1" y="2" width="2" height="3" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="-0.8" y="2.2" width="1.6" height="2.6" fill="#4a5568" opacity="0.3"/>
                <!-- Office building 2 with shadow -->
                <rect x="4" y="1" width="2" height="4" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="4.2" y="1.2" width="1.6" height="3.6" fill="#4a5568" opacity="0.3"/>

                <!-- Enhanced windows with patterns -->
                <!-- Skyscraper 1 windows -->
                <rect x="-5.5" y="-3.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="-5.1" y1="-3.5" x2="-5.1" y2="-2.7" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-4.5" y="-3.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="-4.1" y1="-3.5" x2="-4.1" y2="-2.7" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-5.5" y="-2" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-4.5" y="-2" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-5.5" y="-0.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-4.5" y="-0.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>

                <!-- Skyscraper 2 windows (main tower) -->
                <rect x="-1.5" y="-5.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-0.3" y="-5.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="0.9" y="-5.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-1.5" y="-4" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-0.3" y="-4" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="0.9" y="-4" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-1.5" y="-2.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-0.3" y="-2.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="0.9" y="-2.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-1.5" y="-1" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-0.3" y="-1" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="0.9" y="-1" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>

                <!-- Skyscraper 3 windows -->
                <rect x="3.5" y="-2.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="4.7" y="-2.5" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="3.5" y="-1" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="4.7" y="-1" width="0.8" height="0.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>

                <!-- Office building windows -->
                <rect x="-0.7" y="2.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="0.1" y="2.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-0.7" y="3.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="0.1" y="3.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="4.3" y="1.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="5.1" y="1.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="4.3" y="2.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="5.1" y="2.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>

                <!-- City infrastructure -->
                <!-- Antenna on tallest building -->
                <line x1="0" y1="-6" x2="0" y2="-7.5" stroke="#718096" stroke-width="0.3"/>
                <circle cx="0" cy="-7.8" r="0.3" fill="#F56565"/>

                <!-- Street lights -->
                <line x1="-7" y1="5" x2="-7" y2="3" stroke="#6B7280" stroke-width="0.3"/>
                <circle cx="-7" cy="3" r="0.3" fill="#FBBF24" opacity="0.8"/>
                <line x1="2" y1="5.5" x2="2" y2="3.5" stroke="#6B7280" stroke-width="0.3"/>
                <circle cx="2" cy="3.5" r="0.3" fill="#FBBF24" opacity="0.8"/>

                <!-- City traffic (cars) -->
                <rect x="-3.5" y="5.5" width="1" height="0.6" fill="#EF4444" stroke="#DC2626" stroke-width="0.2"/>
                <circle cx="-3.3" cy="6.1" r="0.15" fill="#374151"/>
                <circle cx="-2.7" cy="6.1" r="0.15" fill="#374151"/>
                <rect x="1.5" y="6" width="1" height="0.6" fill="#3B82F6" stroke="#1E40AF" stroke-width="0.2"/>
                <circle cx="1.7" cy="6.6" r="0.15" fill="#374151"/>
                <circle cx="2.3" cy="6.6" r="0.15" fill="#374151"/>

                <!-- City park -->
                <circle cx="6.5" cy="4" r="1" fill="#22C55E" opacity="0.6"/>
                <circle cx="6.2" cy="3.7" r="0.15" fill="#EF4444"/>
                <circle cx="6.8" cy="3.8" r="0.15" fill="#F97316"/>
                <circle cx="6.5" cy="4.3" r="0.15" fill="#EAB308"/>

                <!-- Main street -->
                <rect x="-8" y="5" width="16" height="1.5" fill="#6B7280" stroke="#4B5563" stroke-width="0.3" opacity="0.7"/>
                <rect x="-8" y="5.7" width="16" height="0.1" fill="#FFFFFF" opacity="0.8"/>
            </g>`;
        } else {
            return `
            <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
                <!-- Town with enhanced buildings and life -->
                <!-- Main building with shadow -->
                <rect x="-3" y="-2" width="2" height="3" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="-2.8" y="-1.8" width="1.6" height="2.6" fill="#4a5568" opacity="0.3"/>
                <!-- Commercial building with shadow -->
                <rect x="1" y="-3" width="3" height="4" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="1.2" y="-2.8" width="2.6" height="3.6" fill="#4a5568" opacity="0.3"/>
                <!-- Residential building with shadow -->
                <rect x="-1" y="2" width="2" height="2" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
                <rect x="-0.8" y="2.2" width="1.6" height="1.6" fill="#4a5568" opacity="0.3"/>

                <!-- Enhanced windows with detail -->
                <!-- Main building windows -->
                <rect x="-2.7" y="-1.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="-2.4" y1="-1.5" x2="-2.4" y2="-0.9" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-1.9" y="-1.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="-1.6" y1="-1.5" x2="-1.6" y2="-0.9" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-2.7" y="-0.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="-1.9" y="-0.5" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>

                <!-- Commercial building windows -->
                <rect x="1.3" y="-2.5" width="0.7" height="0.7" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="1.65" y1="-2.5" x2="1.65" y2="-1.8" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="2.3" y="-2.5" width="0.7" height="0.7" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="2.65" y1="-2.5" x2="2.65" y2="-1.8" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="3.3" y="-2.5" width="0.7" height="0.7" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="3.65" y1="-2.5" x2="3.65" y2="-1.8" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="1.3" y="-1.3" width="0.7" height="0.7" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="2.3" y="-1.3" width="0.7" height="0.7" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <rect x="3.3" y="-1.3" width="0.7" height="0.7" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>

                <!-- Residential building windows -->
                <rect x="-0.7" y="2.3" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="-0.4" y1="2.3" x2="-0.4" y2="2.9" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="0.1" y="2.3" width="0.6" height="0.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.1"/>
                <line x1="0.4" y1="2.3" x2="0.4" y2="2.9" stroke="#f59e0b" stroke-width="0.05"/>

                <!-- Town infrastructure -->
                <!-- Water tower -->
                <line x1="5" y1="-1" x2="5" y2="-3" stroke="#6B7280" stroke-width="0.4"/>
                <circle cx="5" cy="-3.5" r="0.8" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="0.3"/>
                <rect x="4.7" y="-4" width="0.6" height="0.5" fill="#6B7280"/>

                <!-- Church steeple -->
                <rect x="-5" y="-1" width="1.5" height="2.5" fill="#8B5CF6" stroke="#7C3AED" stroke-width="0.3"/>
                <polygon points="-5,-1 -4.25,-2.5 -3.5,-1" fill="#6D28D9"/>
                <line x1="-4.25" y1="-2.5" x2="-4.25" y2="-3.5" stroke="#6B7280" stroke-width="0.2"/>
                <circle cx="-4.25" cy="-3.8" r="0.2" fill="#FBBF24"/>

                <!-- Town square with fountain -->
                <circle cx="0" cy="4.5" r="1.2" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="0.3"/>
                <circle cx="0" cy="4.5" r="0.8" fill="#3B82F6" opacity="0.6"/>
                <circle cx="0" cy="4.5" r="0.4" fill="#60A5FA" opacity="0.8"/>

                <!-- Small park -->
                <circle cx="-4" cy="3" r="0.8" fill="#22C55E" opacity="0.6"/>
                <circle cx="-4.2" cy="2.8" r="0.1" fill="#EF4444"/>
                <circle cx="-3.8" cy="2.9" r="0.1" fill="#F97316"/>
                <circle cx="-4" cy="3.2" r="0.1" fill="#EAB308"/>

                <!-- Street lamps -->
                <line x1="-0.5" y1="1.5" x2="-0.5" y2="0.5" stroke="#6B7280" stroke-width="0.2"/>
                <circle cx="-0.5" cy="0.5" r="0.2" fill="#FBBF24" opacity="0.8"/>
                <line x1="4.5" y1="1.5" x2="4.5" y2="0.5" stroke="#6B7280" stroke-width="0.2"/>
                <circle cx="4.5" cy="0.5" r="0.2" fill="#FBBF24" opacity="0.8"/>

                <!-- Town vehicles -->
                <rect x="-1.5" y="5" width="0.8" height="0.5" fill="#059669" stroke="#047857" stroke-width="0.1"/>
                <circle cx="-1.3" cy="5.5" r="0.12" fill="#374151"/>
                <circle cx="-0.9" cy="5.5" r="0.12" fill="#374151"/>
                <rect x="2.5" y="5.2" width="0.8" height="0.5" fill="#DC2626" stroke="#B91C1C" stroke-width="0.1"/>
                <circle cx="2.7" cy="5.7" r="0.12" fill="#374151"/>
                <circle cx="3.1" cy="5.7" r="0.12" fill="#374151"/>

                <!-- Town road -->
                <rect x="-6" y="5" width="12" height="1" fill="#6B7280" stroke="#4B5563" stroke-width="0.2" opacity="0.7"/>
                <rect x="-6" y="5.4" width="12" height="0.1" fill="#FFFFFF" opacity="0.6"/>

                <!-- Shop signs -->
                <rect x="1.5" y="-3.5" width="1" height="0.3" fill="#DC2626"/>
                <rect x="2.5" y="-3.5" width="1" height="0.3" fill="#059669"/>
                <rect x="3.5" y="-3.5" width="1" height="0.3" fill="#2563EB"/>
            </g>`;
        }
    }

    drawAirfield(x, y, cellSize, name = 'Airfield') {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);
        const fontSize = cellSize / 3;
        const yOffset = cellSize * 0.75;

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Main runway with realistic markings -->
            <rect x="-8" y="-1.5" width="16" height="3" fill="#2D3748" stroke="#1A202C" stroke-width="0.3"/>
            <!-- Runway edge lights -->
            <circle cx="-7.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-5.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-3.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-1.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="1.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="3.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="5.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="7.5" cy="-1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-7.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-5.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-3.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="-1.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="1.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="3.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="5.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <circle cx="7.5" cy="1.5" r="0.15" fill="#FBBF24"/>
            <!-- Runway centerline -->
            <rect x="-8" y="-0.2" width="16" height="0.4" fill="#FFFFFF" opacity="0.8"/>
            <!-- Runway threshold markings -->
            <rect x="-7.5" y="-1.2" width="0.5" height="2.4" fill="#FFFFFF"/>
            <rect x="7" y="-1.2" width="0.5" height="2.4" fill="#FFFFFF"/>
            <!-- Distance markers -->
            <rect x="-4" y="-0.8" width="0.8" height="1.6" fill="#FFFFFF"/>
            <rect x="0" y="-0.8" width="0.8" height="1.6" fill="#FFFFFF"/>
            <rect x="4" y="-0.8" width="0.8" height="1.6" fill="#FFFFFF"/>

            <!-- Modern control tower with depth -->
            <rect x="-1.5" y="-6" width="3" height="5" fill="#4A5568" stroke="#2D3748" stroke-width="0.4"/>
            <!-- Tower shadow -->
            <rect x="-1.3" y="-5.8" width="2.6" height="4.6" fill="#374151" opacity="0.3"/>
            <!-- Tower windows with reflections -->
            <rect x="-1.2" y="-5.5" width="2.4" height="1.5" fill="#63B3ED" stroke="#3182CE" stroke-width="0.2"/>
            <rect x="-1.1" y="-5.4" width="1.1" height="0.7" fill="#BFDBFE" opacity="0.6"/>
            <rect x="0.1" y="-4.6" width="1.1" height="0.7" fill="#BFDBFE" opacity="0.6"/>
            <!-- Radar dome with detail -->
            <circle cx="0" cy="-7" r="1.2" fill="#E2E8F0" stroke="#CBD5E0" stroke-width="0.3"/>
            <circle cx="0" cy="-7" r="0.8" fill="#F7FAFC" opacity="0.7"/>
            <path d="M -0.8,-7 A 0.8,0.8 0 0,1 0.8,-7" stroke="#CBD5E0" stroke-width="0.2" fill="none"/>
            <!-- Navigation light with glow -->
            <circle cx="0" cy="-8.5" r="0.5" fill="#F56565" opacity="0.3"/>
            <circle cx="0" cy="-8.5" r="0.4" fill="#F56565"/>
            <circle cx="0" cy="-8.5" r="0.2" fill="#FEB2B2"/>

            <!-- Large hangar complex with detail -->
            <rect x="2" y="-5" width="6" height="4" fill="#718096" stroke="#4A5568" stroke-width="0.4"/>
            <!-- Hangar shadow -->
            <rect x="2.2" y="-4.8" width="5.6" height="3.6" fill="#4A5568" opacity="0.3"/>
            <!-- Hangar roof with perspective -->
            <polygon points="2,-5 8,-5 9,-4 1,-4" fill="#A0AEC0" stroke="#718096" stroke-width="0.3"/>
            <polygon points="2,-5 8,-5 8,-4.8 2,-4.8" fill="#CBD5E0" opacity="0.5"/>
            <!-- Hangar doors with detail -->
            <rect x="3" y="-2" width="4" height="0.5" fill="#2D3748"/>
            <rect x="3.2" y="-1.8" width="1.6" height="0.3" fill="#374151"/>
            <rect x="5.2" y="-1.8" width="1.6" height="0.3" fill="#374151"/>
            <!-- Hangar windows -->
            <rect x="2.5" y="-4" width="1" height="0.8" fill="#63B3ED" opacity="0.8"/>
            <rect x="4" y="-4" width="1" height="0.8" fill="#63B3ED" opacity="0.8"/>
            <rect x="5.5" y="-4" width="1" height="0.8" fill="#63B3ED" opacity="0.8"/>
            <rect x="7" y="-4" width="1" height="0.8" fill="#63B3ED" opacity="0.8"/>

            <!-- Aircraft on parking spots -->
            <circle cx="-5" cy="3" r="0.8" fill="none" stroke="#FFFFFF" stroke-width="0.3" stroke-dasharray="0.5,0.5"/>
            <!-- Small aircraft -->
            <ellipse cx="-5" cy="3" rx="0.6" ry="0.3" fill="#3B82F6" stroke="#1E40AF" stroke-width="0.2"/>
            <rect x="-5.3" y="2.9" width="0.6" height="0.2" fill="#1E40AF"/>
            <circle cx="-2" cy="3" r="0.8" fill="none" stroke="#FFFFFF" stroke-width="0.3" stroke-dasharray="0.5,0.5"/>
            <!-- Another aircraft -->
            <ellipse cx="-2" cy="3" rx="0.6" ry="0.3" fill="#EF4444" stroke="#DC2626" stroke-width="0.2"/>
            <rect x="-2.3" y="2.9" width="0.6" height="0.2" fill="#DC2626"/>
            <circle cx="1" cy="3" r="0.8" fill="none" stroke="#FFFFFF" stroke-width="0.3" stroke-dasharray="0.5,0.5"/>

            <!-- Taxiway with enhanced markings -->
            <rect x="-8" y="2" width="16" height="1" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <rect x="-8" y="2.4" width="16" height="0.2" fill="#FFFFFF" opacity="0.6"/>
            <!-- Taxiway lights with glow -->
            <circle cx="-6" cy="2.5" r="0.3" fill="#68D391" opacity="0.3"/>
            <circle cx="-6" cy="2.5" r="0.2" fill="#68D391"/>
            <circle cx="-3" cy="2.5" r="0.3" fill="#68D391" opacity="0.3"/>
            <circle cx="-3" cy="2.5" r="0.2" fill="#68D391"/>
            <circle cx="0" cy="2.5" r="0.3" fill="#68D391" opacity="0.3"/>
            <circle cx="0" cy="2.5" r="0.2" fill="#68D391"/>
            <circle cx="3" cy="2.5" r="0.3" fill="#68D391" opacity="0.3"/>
            <circle cx="3" cy="2.5" r="0.2" fill="#68D391"/>
            <circle cx="6" cy="2.5" r="0.3" fill="#68D391" opacity="0.3"/>
            <circle cx="6" cy="2.5" r="0.2" fill="#68D391"/>

            <!-- Wind sock -->
            <line x1="-3" y1="-3" x2="-3" y2="-6" stroke="#6B7280" stroke-width="0.3"/>
            <path d="M -3,-6 Q -1.5,-6.2 -0.5,-5.8" stroke="#FF6B6B" stroke-width="0.4" fill="none"/>

            <!-- Fuel truck -->
            <rect x="4.5" y="4" width="1.5" height="0.8" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <circle cx="4.8" cy="4.8" r="0.2" fill="#374151"/>
            <circle cx="5.7" cy="4.8" r="0.2" fill="#374151"/>
        </g>
        <!-- Airfield name label -->
        <text x="${centerX}" y="${y + yOffset}"
             text-anchor="middle"
             font-size="${fontSize}"
             font-weight="bold"
             fill="#FFFFFF"
             stroke="#000000"
             stroke-width="${fontSize/12}"
             paint-order="stroke"
             class="map-text">${name}</text>`;
    }

    drawPortFacility(x, y, cellSize, name = 'Port') {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);
        const fontSize = cellSize / 3;
        const yOffset = cellSize * 0.75;

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Harbor water -->
            <rect x="-8" y="3" width="16" height="4" fill="#2B6CB0" opacity="0.7"/>

            <!-- Main pier structure -->
            <rect x="-7" y="1" width="14" height="2" fill="#8B7355" stroke="#744C28" stroke-width="0.3"/>
            <!-- Pier supports -->
            <rect x="-6" y="1" width="0.4" height="6" fill="#5D4E37"/>
            <rect x="-2" y="1" width="0.4" height="6" fill="#5D4E37"/>
            <rect x="2" y="1" width="0.4" height="6" fill="#5D4E37"/>
            <rect x="6" y="1" width="0.4" height="6" fill="#5D4E37"/>

            <!-- Port administration building -->
            <rect x="-6" y="-4" width="5" height="4" fill="#4A5568" stroke="#2D3748" stroke-width="0.4"/>
            <!-- Building windows -->
            <rect x="-5.5" y="-3.5" width="1" height="1" fill="#63B3ED"/>
            <rect x="-4" y="-3.5" width="1" height="1" fill="#63B3ED"/>
            <rect x="-2.5" y="-3.5" width="1" height="1" fill="#63B3ED"/>

            <!-- Warehouse complex -->
            <rect x="1" y="-3" width="6" height="3" fill="#718096" stroke="#4A5568" stroke-width="0.4"/>
            <!-- Warehouse roof -->
            <polygon points="1,-3 7,-3 7.5,-2.5 0.5,-2.5" fill="#A0AEC0"/>

            <!-- Large container cranes -->
            <rect x="-3" y="-7" width="0.8" height="8" fill="#E53E3E" stroke="#C53030" stroke-width="0.3"/>
            <rect x="-3.4" y="-6.5" width="1.6" height="0.6" fill="#E53E3E"/>
            <line x1="-2.6" y1="-6.5" x2="4" y2="-3" stroke="#2D3748" stroke-width="0.4"/>
            <!-- Crane hook -->
            <circle cx="2" cy="-1" r="0.3" fill="#2D3748"/>

            <rect x="4" y="-7" width="0.8" height="8" fill="#E53E3E" stroke="#C53030" stroke-width="0.3"/>
            <rect x="3.6" y="-6.5" width="1.6" height="0.6" fill="#E53E3E"/>
            <line x1="4.4" y1="-6.5" x2="-1" y2="-3" stroke="#2D3748" stroke-width="0.4"/>

            <!-- Container stacks -->
            <rect x="-5" y="4" width="1.8" height="1.2" fill="#DC2626"/>
            <rect x="-5" y="2.8" width="1.8" height="1.2" fill="#2563EB"/>
            <rect x="-2.8" y="4" width="1.8" height="1.2" fill="#059669"/>
            <rect x="-2.8" y="2.8" width="1.8" height="1.2" fill="#D97706"/>
            <rect x="-0.6" y="4" width="1.8" height="1.2" fill="#7C3AED"/>
            <rect x="1.6" y="4" width="1.8" height="1.2" fill="#BE185D"/>

            <!-- Port lights -->
            <circle cx="-7" cy="-1" r="0.3" fill="#FBBF24"/>
            <circle cx="0" cy="-1" r="0.3" fill="#FBBF24"/>
            <circle cx="7" cy="-1" r="0.3" fill="#FBBF24"/>
        </g>
        <!-- Port name label -->
        <text x="${centerX}" y="${y + yOffset}"
             text-anchor="middle"
             font-size="${fontSize}"
             font-weight="bold"
             fill="#FFFFFF"
             stroke="#000000"
             stroke-width="${fontSize/12}"
             paint-order="stroke"
             class="map-text">${name}</text>`;
    }

    drawMilitaryBase(x, y, cellSize, name = 'Military Base') {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);
        const fontSize = cellSize / 3;
        const yOffset = cellSize * 0.75;

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Security perimeter fence with razor wire -->
            <rect x="-7" y="-5" width="14" height="10" fill="none" stroke="#8B7355" stroke-width="0.6"/>
            <!-- Razor wire on top -->
            <path d="M -7,-5 Q -6.5,-5.3 -6,-5 Q -5.5,-4.7 -5,-5 Q -4.5,-5.3 -4,-5 Q -3.5,-4.7 -3,-5 Q -2.5,-5.3 -2,-5 Q -1.5,-4.7 -1,-5 Q -0.5,-5.3 0,-5 Q 0.5,-4.7 1,-5 Q 1.5,-5.3 2,-5 Q 2.5,-4.7 3,-5 Q 3.5,-5.3 4,-5 Q 4.5,-4.7 5,-5 Q 5.5,-5.3 6,-5 Q 6.5,-4.7 7,-5" stroke="#A0ADB8" stroke-width="0.2" fill="none"/>
            <!-- Fence posts with detail -->
            <rect x="-7" y="-5" width="0.3" height="0.8" fill="#8B7355"/>
            <rect x="-7" y="-4.2" width="0.3" height="0.2" fill="#A0ADB8"/>
            <rect x="-3.5" y="-5" width="0.3" height="0.8" fill="#8B7355"/>
            <rect x="-3.5" y="-4.2" width="0.3" height="0.2" fill="#A0ADB8"/>
            <rect x="0" y="-5" width="0.3" height="0.8" fill="#8B7355"/>
            <rect x="0" y="-4.2" width="0.3" height="0.2" fill="#A0ADB8"/>
            <rect x="3.5" y="-5" width="0.3" height="0.8" fill="#8B7355"/>
            <rect x="3.5" y="-4.2" width="0.3" height="0.2" fill="#A0ADB8"/>
            <rect x="7" y="-5" width="0.3" height="0.8" fill="#8B7355"/>
            <rect x="7" y="-4.2" width="0.3" height="0.2" fill="#A0ADB8"/>

            <!-- Main command building with depth -->
            <rect x="-3" y="-3.5" width="6" height="3" fill="#4A5568" stroke="#2D3748" stroke-width="0.4"/>
            <!-- Building shadow -->
            <rect x="-2.8" y="-3.3" width="5.6" height="2.8" fill="#374151" opacity="0.3"/>
            <!-- Command building windows with frames -->
            <rect x="-2.5" y="-3" width="1" height="0.8" fill="#63B3ED" stroke="#3182CE" stroke-width="0.1"/>
            <rect x="-2.4" y="-2.9" width="0.4" height="0.3" fill="#BFDBFE" opacity="0.6"/>
            <rect x="-0.5" y="-3" width="1" height="0.8" fill="#63B3ED" stroke="#3182CE" stroke-width="0.1"/>
            <rect x="-0.4" y="-2.9" width="0.4" height="0.3" fill="#BFDBFE" opacity="0.6"/>
            <rect x="1.5" y="-3" width="1" height="0.8" fill="#63B3ED" stroke="#3182CE" stroke-width="0.1"/>
            <rect x="1.6" y="-2.9" width="0.4" height="0.3" fill="#BFDBFE" opacity="0.6"/>
            <!-- Roof antenna with guy wires -->
            <line x1="0" y1="-3.5" x2="0" y2="-4.5" stroke="#718096" stroke-width="0.3"/>
            <line x1="0" y1="-4.5" x2="-1" y2="-3.5" stroke="#A0ADB8" stroke-width="0.1"/>
            <line x1="0" y1="-4.5" x2="1" y2="-3.5" stroke="#A0ADB8" stroke-width="0.1"/>
            <!-- Command center door -->
            <rect x="-0.3" y="-0.5" width="0.6" height="1" fill="#2D3748" stroke="#1A202C" stroke-width="0.2"/>

            <!-- Barracks buildings with detail -->
            <rect x="-6" y="-1" width="2.5" height="2" fill="#68747A" stroke="#4A5568" stroke-width="0.3"/>
            <rect x="-5.8" y="-0.8" width="2.1" height="1.6" fill="#4A5568" opacity="0.3"/>
            <rect x="3.5" y="-1" width="2.5" height="2" fill="#68747A" stroke="#4A5568" stroke-width="0.3"/>
            <rect x="3.7" y="-0.8" width="2.1" height="1.6" fill="#4A5568" opacity="0.3"/>
            <!-- Barracks windows with detail -->
            <rect x="-5.5" y="-0.5" width="0.4" height="0.4" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-5.3" y1="-0.5" x2="-5.3" y2="-0.1" stroke="#F59E0B" stroke-width="0.05"/>
            <rect x="-4.5" y="-0.5" width="0.4" height="0.4" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-4.3" y1="-0.5" x2="-4.3" y2="-0.1" stroke="#F59E0B" stroke-width="0.05"/>
            <rect x="4" y="-0.5" width="0.4" height="0.4" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="4.2" y1="-0.5" x2="4.2" y2="-0.1" stroke="#F59E0B" stroke-width="0.05"/>
            <rect x="5" y="-0.5" width="0.4" height="0.4" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="5.2" y1="-0.5" x2="5.2" y2="-0.1" stroke="#F59E0B" stroke-width="0.05"/>
            <!-- Barracks doors -->
            <rect x="-4.8" y="0.5" width="0.6" height="0.5" fill="#2D3748"/>
            <rect x="4.7" y="0.5" width="0.6" height="0.5" fill="#2D3748"/>

            <!-- Communications tower complex with detail -->
            <rect x="-1" y="-8" width="2" height="4" fill="#718096" stroke="#4A5568" stroke-width="0.4"/>
            <rect x="-0.8" y="-7.8" width="1.6" height="3.6" fill="#4A5568" opacity="0.3"/>
            <line x1="0" y1="-8" x2="0" y2="-10" stroke="#718096" stroke-width="0.8"/>
            <!-- Tower crossbeams with bolts -->
            <line x1="-1.5" y1="-9" x2="1.5" y2="-9" stroke="#718096" stroke-width="0.4"/>
            <circle cx="-1.5" cy="-9" r="0.1" fill="#A0ADB8"/>
            <circle cx="1.5" cy="-9" r="0.1" fill="#A0ADB8"/>
            <line x1="-1.5" y1="-8" x2="1.5" y2="-8" stroke="#718096" stroke-width="0.4"/>
            <circle cx="-1.5" cy="-8" r="0.1" fill="#A0ADB8"/>
            <circle cx="1.5" cy="-8" r="0.1" fill="#A0ADB8"/>
            <!-- Satellite dish with detail -->
            <ellipse cx="0" cy="-10.5" rx="1.2" ry="0.8" fill="#E2E8F0" stroke="#CBD5E0" stroke-width="0.3"/>
            <ellipse cx="0" cy="-10.5" rx="0.8" ry="0.5" fill="#F7FAFC" opacity="0.7"/>
            <circle cx="0" cy="-10.5" r="0.2" fill="#374151"/>
            <!-- Tower warning light -->
            <circle cx="0" cy="-10.8" r="0.2" fill="#F56565"/>

            <!-- Vehicle depot with vehicles -->
            <rect x="1" y="2" width="5" height="2.5" fill="#718096" stroke="#4A5568" stroke-width="0.3"/>
            <rect x="1.2" y="2.2" width="4.6" height="2.1" fill="#4A5568" opacity="0.3"/>
            <!-- Depot doors with handles -->
            <rect x="2" y="2" width="1.5" height="2.5" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <circle cx="2.1" cy="3.2" r="0.1" fill="#A0ADB8"/>
            <rect x="4.5" y="2" width="1.5" height="2.5" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <circle cx="4.6" cy="3.2" r="0.1" fill="#A0ADB8"/>
            <!-- Military vehicles inside -->
            <rect x="2.2" y="3.5" width="1.1" height="0.7" fill="#68747A" stroke="#4A5568" stroke-width="0.1"/>
            <circle cx="2.4" cy="4.2" r="0.15" fill="#374151"/>
            <circle cx="3.1" cy="4.2" r="0.15" fill="#374151"/>
            <rect x="4.7" y="3.5" width="1.1" height="0.7" fill="#68747A" stroke="#4A5568" stroke-width="0.1"/>
            <circle cx="4.9" cy="4.2" r="0.15" fill="#374151"/>
            <circle cx="5.6" cy="4.2" r="0.15" fill="#374151"/>

            <!-- Guard towers with guards -->
            <rect x="-6.5" y="-4.5" width="1" height="2" fill="#68747A" stroke="#4A5568" stroke-width="0.3"/>
            <rect x="-6.8" y="-4.8" width="1.6" height="0.6" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <!-- Guard figure -->
            <circle cx="-6" cy="-4.6" r="0.15" fill="#F3E8DC"/>
            <rect x="-6.1" y="-4.4" width="0.2" height="0.4" fill="#68747A"/>
            <rect x="5.5" y="-4.5" width="1" height="2" fill="#68747A" stroke="#4A5568" stroke-width="0.3"/>
            <rect x="5.2" y="-4.8" width="1.6" height="0.6" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <!-- Guard figure -->
            <circle cx="6" cy="-4.6" r="0.15" fill="#F3E8DC"/>
            <rect x="5.9" y="-4.4" width="0.2" height="0.4" fill="#68747A"/>

            <!-- National flag with wind effect -->
            <line x1="4" y1="-7" x2="4" y2="-4" stroke="#8B7355" stroke-width="0.4"/>
            <path d="M 4.2,-6.8 Q 5.5,-6.9 6.2,-6.5 Q 5.8,-6.3 6.2,-6.1 Q 5.5,-5.9 4.2,-5.6" fill="#DC2626"/>
            <path d="M 4.2,-5.6 Q 5.5,-5.7 6.2,-5.3 Q 5.8,-5.1 6.2,-4.9 Q 5.5,-4.7 4.2,-5" fill="#FFFFFF"/>
            <path d="M 4.2,-5 Q 5.5,-5.1 6.2,-4.7 Q 5.8,-4.5 6.2,-4.3 Q 5.5,-4.1 4.2,-4.4" fill="#2563EB"/>

            <!-- Security lights with glow -->
            <circle cx="-5" cy="-2" r="0.4" fill="#FBBF24" opacity="0.3"/>
            <circle cx="-5" cy="-2" r="0.3" fill="#FBBF24"/>
            <circle cx="-5" cy="-2" r="0.15" fill="#FEF3C7"/>
            <circle cx="0" cy="-2" r="0.4" fill="#FBBF24" opacity="0.3"/>
            <circle cx="0" cy="-2" r="0.3" fill="#FBBF24"/>
            <circle cx="0" cy="-2" r="0.15" fill="#FEF3C7"/>
            <circle cx="5" cy="-2" r="0.4" fill="#FBBF24" opacity="0.3"/>
            <circle cx="5" cy="-2" r="0.3" fill="#FBBF24"/>
            <circle cx="5" cy="-2" r="0.15" fill="#FEF3C7"/>

            <!-- Security cameras -->
            <rect x="-6.2" y="-3.8" width="0.4" height="0.3" fill="#374151"/>
            <circle cx="-6" cy="-3.65" r="0.1" fill="#1A202C"/>
            <rect x="5.8" y="-3.8" width="0.4" height="0.3" fill="#374151"/>
            <circle cx="6" cy="-3.65" r="0.1" fill="#1A202C"/>

            <!-- Main gate -->
            <rect x="-0.8" y="5" width="1.6" height="0.5" fill="#374151" stroke="#2D3748" stroke-width="0.2"/>
            <rect x="-0.6" y="5.1" width="1.2" height="0.3" fill="#4A5568"/>
        </g>
        <!-- Military base name label -->
        <text x="${centerX}" y="${y + yOffset}"
             text-anchor="middle"
             font-size="${fontSize}"
             font-weight="bold"
             fill="#FFFFFF"
             stroke="#000000"
             stroke-width="${fontSize/12}"
             paint-order="stroke"
             class="map-text">${name}</text>`;
    }

    drawIndustrialFacility(x, y, cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Main factory building -->
            <rect x="-6" y="-3" width="5" height="5" fill="#68747A" stroke="#4A5568" stroke-width="0.4"/>
            <!-- Factory roof -->
            <polygon points="-6,-3 -1,-3 -0.5,-2.5 -6.5,-2.5" fill="#9CA3AF"/>
            <!-- Factory windows -->
            <rect x="-5.5" y="-2.5" width="1" height="1" fill="#FBBF24"/>
            <rect x="-4" y="-2.5" width="1" height="1" fill="#FBBF24"/>
            <rect x="-2.5" y="-2.5" width="1" height="1" fill="#FBBF24"/>

            <!-- Secondary processing building -->
            <rect x="0.5" y="-4" width="6" height="6" fill="#68747A" stroke="#4A5568" stroke-width="0.4"/>
            <!-- Building details -->
            <rect x="1" y="-3.5" width="1" height="1" fill="#FBBF24"/>
            <rect x="3" y="-3.5" width="1" height="1" fill="#FBBF24"/>
            <rect x="5" y="-3.5" width="1" height="1" fill="#FBBF24"/>

            <!-- Large smokestacks with realistic details -->
            <rect x="-4" y="-8" width="1.2" height="5" fill="#4A5568" stroke="#2D3748" stroke-width="0.3"/>
            <rect x="-4.1" y="-8.2" width="1.4" height="0.4" fill="#2D3748"/>
            <rect x="-4.1" y="-3.2" width="1.4" height="0.4" fill="#2D3748"/>

            <rect x="2" y="-9" width="1.2" height="5" fill="#4A5568" stroke="#2D3748" stroke-width="0.3"/>
            <rect x="1.9" y="-9.2" width="1.4" height="0.4" fill="#2D3748"/>
            <rect x="1.9" y="-4.2" width="1.4" height="0.4" fill="#2D3748"/>

            <rect x="5" y="-8.5" width="1.2" height="4.5" fill="#4A5568" stroke="#2D3748" stroke-width="0.3"/>
            <rect x="4.9" y="-8.7" width="1.4" height="0.4" fill="#2D3748"/>

            <!-- Realistic smoke emissions -->
            <circle cx="-3.4" cy="-8.5" r="0.6" fill="#6B7280" opacity="0.7"/>
            <circle cx="-3.2" cy="-9.2" r="0.8" fill="#6B7280" opacity="0.5"/>
            <circle cx="-3" cy="-10" r="1" fill="#6B7280" opacity="0.3"/>

            <circle cx="2.6" cy="-9.5" r="0.6" fill="#6B7280" opacity="0.7"/>
            <circle cx="2.8" cy="-10.2" r="0.8" fill="#6B7280" opacity="0.5"/>
            <circle cx="3" cy="-11" r="1" fill="#6B7280" opacity="0.3"/>

            <!-- Large storage tanks complex -->
            <circle cx="-2" cy="4" r="2" fill="#A0AEC0" stroke="#718096" stroke-width="0.4"/>
            <rect x="-2.2" y="2" width="0.4" height="4" fill="#4A5568"/>
            <circle cx="-2" cy="2" r="0.3" fill="#E53E3E"/>

            <circle cx="2" cy="5" r="1.8" fill="#A0AEC0" stroke="#718096" stroke-width="0.4"/>
            <rect x="1.8" y="3.2" width="0.4" height="3.6" fill="#4A5568"/>
            <circle cx="2" cy="3.2" r="0.3" fill="#E53E3E"/>

            <circle cx="5.5" cy="4.5" r="1.5" fill="#A0AEC0" stroke="#718096" stroke-width="0.4"/>
            <rect x="5.3" y="3" width="0.4" height="3" fill="#4A5568"/>

            <!-- Industrial piping -->
            <rect x="-1" y="0" width="2" height="0.4" fill="#718096"/>
            <rect x="3" y="0.5" width="2" height="0.4" fill="#718096"/>
            <circle cx="1" cy="0.2" r="0.3" fill="#4A5568"/>
            <circle cx="4" cy="0.7" r="0.3" fill="#4A5568"/>

            <!-- Loading dock -->
            <rect x="-8" y="1" width="3" height="1.5" fill="#8B7355" stroke="#744C28" stroke-width="0.3"/>
            <!-- Conveyor system -->
            <rect x="-7" y="0.8" width="1" height="0.4" fill="#4A5568"/>

            <!-- Industrial lighting -->
            <circle cx="-3" cy="-1" r="0.3" fill="#FBBF24"/>
            <circle cx="3" cy="-1" r="0.3" fill="#FBBF24"/>
            <circle cx="0" cy="3" r="0.3" fill="#FBBF24"/>
        </g>`;
    }

    drawPortGun(x, y, cellSize, name = 'Coastal Battery') {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);
        const fontSize = cellSize / 3;
        const yOffset = cellSize * 0.75;

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Main concrete fortification bunker -->
            <rect x="-5" y="-2" width="10" height="4" fill="#5A5A5A" stroke="#3A3A3A" stroke-width="0.5"/>
            <!-- Bunker shadow for depth -->
            <rect x="-4.8" y="-1.8" width="9.6" height="3.6" fill="#2D2D2D" opacity="0.3"/>
            <!-- Reinforced concrete texture -->
            <rect x="-5" y="-2" width="10" height="0.3" fill="#4A4A4A"/>
            <rect x="-5" y="1.7" width="10" height="0.3" fill="#6A6A6A"/>

            <!-- Main gun turret 1 (left) -->
            <ellipse cx="-2.5" cy="0" rx="2" ry="1.5" fill="#68747A" stroke="#3A4148" stroke-width="0.4"/>
            <!-- Gun barrel -->
            <rect x="-2.8" y="-0.4" width="5" height="0.8" fill="#4A5568" stroke="#2D3748" stroke-width="0.3"/>
            <rect x="2" y="-0.4" width="0.4" height="0.8" fill="#2D3748"/>
            <!-- Turret hatch -->
            <circle cx="-2.5" cy="0" r="0.8" fill="#3A4148" stroke="#2D3748" stroke-width="0.2"/>
            <circle cx="-2.5" cy="0" r="0.4" fill="#4A5568"/>

            <!-- Main gun turret 2 (right) -->
            <ellipse cx="2.5" cy="0" rx="2" ry="1.5" fill="#68747A" stroke="#3A4148" stroke-width="0.4"/>
            <!-- Gun barrel -->
            <rect x="2.3" y="-0.4" width="5" height="0.8" fill="#4A5568" stroke="#2D3748" stroke-width="0.3"/>
            <rect x="7.1" y="-0.4" width="0.4" height="0.8" fill="#2D3748"/>
            <!-- Turret hatch -->
            <circle cx="2.5" cy="0" r="0.8" fill="#3A4148" stroke="#2D3748" stroke-width="0.2"/>
            <circle cx="2.5" cy="0" r="0.4" fill="#4A5568"/>

            <!-- Observation/rangefinder tower -->
            <rect x="-1" y="-5" width="2" height="3" fill="#68747A" stroke="#4A5568" stroke-width="0.4"/>
            <rect x="-0.8" y="-4.8" width="1.6" height="2.6" fill="#3A4148" opacity="0.3"/>
            <!-- Observation windows -->
            <rect x="-0.7" y="-4.5" width="0.5" height="0.5" fill="#63B3ED" stroke="#3182CE" stroke-width="0.1"/>
            <rect x="0.2" y="-4.5" width="0.5" height="0.5" fill="#63B3ED" stroke="#3182CE" stroke-width="0.1"/>
            <!-- Rangefinder equipment -->
            <rect x="-1.2" y="-5.5" width="2.4" height="0.5" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <circle cx="-0.6" cy="-5.25" r="0.15" fill="#1A202C"/>
            <circle cx="0.6" cy="-5.25" r="0.15" fill="#1A202C"/>

            <!-- Ammunition storage bunker -->
            <rect x="-7" y="0.5" width="2" height="2.5" fill="#5A5A5A" stroke="#3A3A3A" stroke-width="0.3"/>
            <rect x="-6.8" y="0.7" width="1.6" height="2.1" fill="#2D2D2D" opacity="0.3"/>
            <!-- Reinforced door -->
            <rect x="-6.5" y="1.5" width="1" height="1.5" fill="#3A3A3A" stroke="#1A202C" stroke-width="0.2"/>
            <circle cx="-6.3" cy="2.2" r="0.1" fill="#A0ADB8"/>

            <!-- Sandbag fortifications -->
            <ellipse cx="-4" cy="2.5" rx="0.8" ry="0.4" fill="#8B7355" stroke="#6B5837" stroke-width="0.2"/>
            <ellipse cx="-3" cy="2.5" rx="0.8" ry="0.4" fill="#8B7355" stroke="#6B5837" stroke-width="0.2"/>
            <ellipse cx="3" cy="2.5" rx="0.8" ry="0.4" fill="#8B7355" stroke="#6B5837" stroke-width="0.2"/>
            <ellipse cx="4" cy="2.5" rx="0.8" ry="0.4" fill="#8B7355" stroke="#6B5837" stroke-width="0.2"/>

            <!-- Perimeter fence -->
            <rect x="-7.5" y="-3" width="15" height="0.2" fill="#8B7355"/>
            <rect x="-7.5" y="-2" width="0.2" height="5" fill="#8B7355"/>
            <rect x="7.3" y="-2" width="0.2" height="5" fill="#8B7355"/>

            <!-- Warning signs -->
            <rect x="-6" y="-2.5" width="0.8" height="0.8" fill="#DC2626" stroke="#991B1B" stroke-width="0.1"/>
            <text x="-5.6" y="-2" font-size="0.8" font-weight="bold" fill="#FFFFFF">!</text>
            <rect x="5.2" y="-2.5" width="0.8" height="0.8" fill="#DC2626" stroke="#991B1B" stroke-width="0.1"/>
            <text x="5.6" y="-2" font-size="0.8" font-weight="bold" fill="#FFFFFF">!</text>

            <!-- Searchlight -->
            <rect x="5.5" y="-1" width="0.4" height="1.5" fill="#6B7280" stroke-width="0.2"/>
            <circle cx="5.7" cy="-1.2" r="0.4" fill="#FBBF24" opacity="0.6"/>
            <circle cx="5.7" cy="-1.2" r="0.3" fill="#FEF3C7"/>

            <!-- Radar/communications antenna -->
            <line x1="0" y1="-5.5" x2="0" y2="-6.5" stroke="#718096" stroke-width="0.3"/>
            <rect x="-0.4" y="-7" width="0.8" height="0.5" fill="#4A5568" stroke="#2D3748" stroke-width="0.1"/>
            <line x1="-0.5" y1="-6.8" x2="0.5" y2="-6.8" stroke="#68D391" stroke-width="0.1"/>

            <!-- Warning light -->
            <circle cx="0" cy="-7.5" r="0.25" fill="#F56565"/>
            <circle cx="0" cy="-7.5" r="0.15" fill="#FEB2B2" opacity="0.8"/>
        </g>
        <!-- Port gun name label -->
        <text x="${centerX}" y="${y + yOffset}"
             text-anchor="middle"
             font-size="${fontSize}"
             font-weight="bold"
             fill="#FFFFFF"
             stroke="#000000"
             stroke-width="${fontSize/12}"
             paint-order="stroke"
             class="map-text">${name}</text>`;
    }

    drawSettlement(x, y, cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Main residential building -->
            <rect x="-4" y="-2" width="3.5" height="4" fill="#DC2626" stroke="#B91C1C" stroke-width="0.4"/>
            <!-- Building roof with shadow -->
            <polygon points="-4,-2 -2.25,-4 -0.5,-2" fill="#7F1D1D"/>
            <polygon points="-4,-2 -2.25,-4 -2.25,-3.8 -4,-1.8" fill="#991B1B" opacity="0.6"/>
            <!-- Chimney -->
            <rect x="-3.2" y="-4.5" width="0.6" height="1.5" fill="#6B5B73" stroke="#4C4563" stroke-width="0.2"/>
            <!-- Windows with frames and mullions -->
            <rect x="-3.7" y="-1.5" width="0.8" height="0.8" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="-3.3" y1="-1.5" x2="-3.3" y2="-0.7" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-3.7" y1="-1.1" x2="-2.9" y2="-1.1" stroke="#F59E0B" stroke-width="0.1"/>
            <rect x="-2.5" y="-1.5" width="0.8" height="0.8" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="-2.1" y1="-1.5" x2="-2.1" y2="-0.7" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-2.5" y1="-1.1" x2="-1.7" y2="-1.1" stroke="#F59E0B" stroke-width="0.1"/>
            <rect x="-3.7" y="0" width="0.8" height="0.8" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="-3.3" y1="0" x2="-3.3" y2="0.8" stroke="#F59E0B" stroke-width="0.1"/>
            <rect x="-2.5" y="0" width="0.8" height="0.8" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="-2.1" y1="0" x2="-2.1" y2="0.8" stroke="#F59E0B" stroke-width="0.1"/>
            <!-- Front door with detail -->
            <rect x="-1.2" y="1" width="0.7" height="1" fill="#8B5CF6" stroke="#7C3AED" stroke-width="0.2"/>
            <circle cx="-0.9" cy="1.5" r="0.1" fill="#FBBF24"/>
            <rect x="-1.15" y="1.1" width="0.6" height="0.3" fill="#A78BFA" opacity="0.6"/>

            <!-- Secondary house with improved design -->
            <rect x="0.5" y="-1" width="3" height="3.5" fill="#059669" stroke="#047857" stroke-width="0.4"/>
            <!-- Second house roof with shadow -->
            <polygon points="0.5,-1 2,-2.5 3.5,-1" fill="#064E3B"/>
            <polygon points="0.5,-1 2,-2.5 2,-2.3 0.5,-0.8" fill="#065F46" opacity="0.6"/>
            <!-- Chimney for second house -->
            <rect x="1.7" y="-2.8" width="0.5" height="1.3" fill="#6B5B73" stroke="#4C4563" stroke-width="0.2"/>
            <!-- Second house windows with mullions -->
            <rect x="0.8" y="-0.5" width="0.6" height="0.6" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="1.1" y1="-0.5" x2="1.1" y2="0.1" stroke="#F59E0B" stroke-width="0.1"/>
            <rect x="2.2" y="-0.5" width="0.6" height="0.6" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="2.5" y1="-0.5" x2="2.5" y2="0.1" stroke="#F59E0B" stroke-width="0.1"/>
            <rect x="1.5" y="0.5" width="0.6" height="0.6" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.2"/>
            <line x1="1.8" y1="0.5" x2="1.8" y2="1.1" stroke="#F59E0B" stroke-width="0.1"/>
            <!-- Second house door with detail -->
            <rect x="2.8" y="1.5" width="0.6" height="1" fill="#8B5CF6" stroke="#7C3AED" stroke-width="0.2"/>
            <rect x="2.85" y="1.6" width="0.5" height="0.3" fill="#A78BFA" opacity="0.6"/>

            <!-- Small cottage with improved design -->
            <rect x="-6" y="1" width="2.5" height="2.5" fill="#F59E0B" stroke="#D97706" stroke-width="0.3"/>
            <!-- Cottage roof with shadow -->
            <polygon points="-6,1 -4.75,0 -3.5,1" fill="#92400E"/>
            <polygon points="-6,1 -4.75,0 -4.75,0.2 -6,1.2" fill="#B45309" opacity="0.6"/>
            <!-- Cottage window with frame -->
            <rect x="-5.5" y="1.3" width="0.5" height="0.5" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-5.25" y1="1.3" x2="-5.25" y2="1.8" stroke="#F59E0B" stroke-width="0.05"/>
            <!-- Cottage door with detail -->
            <rect x="-4.7" y="2.3" width="0.4" height="1.2" fill="#8B5CF6" stroke="#7C3AED" stroke-width="0.2"/>
            <circle cx="-4.6" cy="2.9" r="0.05" fill="#FBBF24"/>

            <!-- Enhanced settlement amenities -->
            <!-- Water well with bucket -->
            <circle cx="-1" cy="3.5" r="0.8" fill="#6B7280" stroke="#4B5563" stroke-width="0.3"/>
            <circle cx="-1" cy="3.5" r="0.5" fill="#1E40AF" opacity="0.8"/>
            <circle cx="-1" cy="3.5" r="0.3" fill="#3B82F6" opacity="0.6"/>
            <!-- Well roof -->
            <polygon points="-1.5,3 -1,2.5 -0.5,3" fill="#7F1D1D"/>
            <!-- Bucket and rope -->
            <rect x="-0.3" y="3.2" width="0.3" height="0.4" fill="#8B5A2B" stroke="#92400E" stroke-width="0.1"/>
            <line x1="-0.15" y1="3.2" x2="-1" y2="2.5" stroke="#654321" stroke-width="0.1"/>

            <!-- Street lamp with base -->
            <rect x="3.8" y="2.5" width="0.4" height="0.3" fill="#6B7280" stroke="#4B5563" stroke-width="0.2"/>
            <line x1="4" y1="2.5" x2="4" y2="0" stroke="#6B7280" stroke-width="0.3"/>
            <circle cx="4" cy="0" r="0.4" fill="#FBBF24" opacity="0.9"/>
            <circle cx="4" cy="0" r="0.2" fill="#FEF3C7" opacity="0.8"/>

            <!-- Enhanced garden areas with flowers -->
            <circle cx="-2" cy="4" r="0.6" fill="#22C55E" opacity="0.8"/>
            <circle cx="-2.2" cy="3.7" r="0.1" fill="#EF4444"/>
            <circle cx="-1.8" cy="3.8" r="0.1" fill="#F97316"/>
            <circle cx="-2" cy="4.3" r="0.1" fill="#EAB308"/>
            <circle cx="1" cy="4" r="0.6" fill="#22C55E" opacity="0.8"/>
            <circle cx="0.8" cy="3.7" r="0.1" fill="#8B5CF6"/>
            <circle cx="1.2" cy="3.8" r="0.1" fill="#EC4899"/>
            <circle cx="1" cy="4.3" r="0.1" fill="#06B6D4"/>

            <!-- Chimney smoke with better animation -->
            <circle cx="-3" cy="-4.8" r="0.3" fill="#9CA3AF" opacity="0.7"/>
            <circle cx="-2.9" cy="-5.3" r="0.4" fill="#9CA3AF" opacity="0.5"/>
            <circle cx="-3.1" cy="-5.8" r="0.3" fill="#9CA3AF" opacity="0.3"/>
            <circle cx="1.7" cy="-3.1" r="0.25" fill="#9CA3AF" opacity="0.7"/>
            <circle cx="1.8" cy="-3.5" r="0.3" fill="#9CA3AF" opacity="0.5"/>
            <circle cx="1.6" cy="-3.9" r="0.25" fill="#9CA3AF" opacity="0.3"/>

            <!-- Small path/road -->
            <path d="M -1.5,2.5 Q 0,3 2,2.5 Q 3.5,2 4.5,2.5" stroke="#8B7355" stroke-width="0.4" fill="none" opacity="0.6"/>
        </g>`;
    }

    drawHarbor(x, y, cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Harbor water basin -->
            <ellipse cx="0" cy="3" rx="7" ry="3" fill="#1E40AF" opacity="0.6" stroke="#1E3A8A" stroke-width="0.3"/>

            <!-- Main pier structure -->
            <rect x="-7" y="0" width="10" height="2.5" fill="#6B7280" stroke="#4B5563" stroke-width="0.4"/>
            <!-- Pier decking pattern -->
            <line x1="-6" y1="0.5" x2="2" y2="0.5" stroke="#374151" stroke-width="0.2"/>
            <line x1="-6" y1="1.5" x2="2" y2="1.5" stroke="#374151" stroke-width="0.2"/>
            <line x1="-6" y1="2" x2="2" y2="2" stroke="#374151" stroke-width="0.2"/>

            <!-- Pier support pillars -->
            <circle cx="-5" cy="2.8" r="0.4" fill="#1F2937"/>
            <circle cx="-2" cy="2.8" r="0.4" fill="#1F2937"/>
            <circle cx="1" cy="2.8" r="0.4" fill="#1F2937"/>
            <!-- Underwater support beams -->
            <rect x="-5.2" y="2.5" width="0.4" height="2" fill="#374151" opacity="0.7"/>
            <rect x="-2.2" y="2.5" width="0.4" height="2" fill="#374151" opacity="0.7"/>
            <rect x="0.8" y="2.5" width="0.4" height="2" fill="#374151" opacity="0.7"/>

            <!-- Harbor master building -->
            <rect x="-4" y="-4.5" width="4" height="4" fill="#DC2626" stroke="#B91C1C" stroke-width="0.4"/>
            <!-- Building roof -->
            <polygon points="-4,-4.5 -2,-6 0,-4.5" fill="#7F1D1D"/>
            <!-- Building windows -->
            <rect x="-3.5" y="-4" width="0.7" height="0.7" fill="#FBBF24"/>
            <rect x="-2.3" y="-4" width="0.7" height="0.7" fill="#FBBF24"/>
            <rect x="-0.7" y="-4" width="0.7" height="0.7" fill="#FBBF24"/>
            <rect x="-3.5" y="-2.8" width="0.7" height="0.7" fill="#FBBF24"/>
            <rect x="-2.3" y="-2.8" width="0.7" height="0.7" fill="#FBBF24"/>
            <!-- Building door -->
            <rect x="-1.2" y="-1.5" width="0.8" height="1" fill="#8B5CF6"/>

            <!-- Large harbor crane -->
            <rect x="2" y="-6" width="1" height="7" fill="#DC2626" stroke="#B91C1C" stroke-width="0.3"/>
            <!-- Crane base -->
            <rect x="1.5" y="0.5" width="2" height="1" fill="#6B7280" stroke="#4B5563" stroke-width="0.3"/>
            <!-- Crane jib (horizontal arm) -->
            <rect x="2.5" y="-5.5" width="4" height="0.6" fill="#DC2626" stroke="#B91C1C" stroke-width="0.3"/>
            <!-- Crane hook -->
            <circle cx="6" cy="-5" r="0.3" fill="#FBBF24"/>
            <line x1="6" y1="-5" x2="6" y2="-3" stroke="#6B7280" stroke-width="0.3"/>
            <!-- Crane counterweight -->
            <rect x="0.5" y="-5.5" width="1.5" height="0.8" fill="#374151"/>

            <!-- Warehouse building -->
            <rect x="3.5" y="-3" width="3.5" height="3.5" fill="#6B7280" stroke="#4B5563" stroke-width="0.4"/>
            <!-- Warehouse doors -->
            <rect x="4" y="-0.5" width="1.2" height="1" fill="#374151"/>
            <rect x="5.8" y="-0.5" width="1.2" height="1" fill="#374151"/>
            <!-- Warehouse roof -->
            <polygon points="3.5,-3 5.25,-4 7,-3" fill="#4B5563"/>

            <!-- Mooring bollards -->
            <circle cx="-6" cy="0.5" r="0.3" fill="#1F2937"/>
            <circle cx="-3" cy="0.5" r="0.3" fill="#1F2937"/>
            <circle cx="0" cy="0.5" r="0.3" fill="#1F2937"/>

            <!-- Navigation lights -->
            <circle cx="-6.5" cy="-1" r="0.3" fill="#EF4444"/>
            <circle cx="2.5" cy="-1" r="0.3" fill="#10B981"/>

            <!-- Harbor entrance buoys -->
            <circle cx="-8" cy="4" r="0.4" fill="#F59E0B" opacity="0.8"/>
            <circle cx="8" cy="4" r="0.4" fill="#F59E0B" opacity="0.8"/>
        </g>`;
    }

    drawOilRig(x, y, cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Main platform deck -->
            <rect x="-6" y="-2" width="12" height="4" fill="#6B7280" stroke="#4B5563" stroke-width="0.4"/>
            <!-- Platform deck grating pattern -->
            <line x1="-5" y1="-1" x2="5" y2="-1" stroke="#374151" stroke-width="0.2"/>
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#374151" stroke-width="0.2"/>
            <line x1="-5" y1="1" x2="5" y2="1" stroke="#374151" stroke-width="0.2"/>

            <!-- Primary support legs -->
            <rect x="-5" y="2" width="1.5" height="6" fill="#374151" stroke="#1F2937" stroke-width="0.3"/>
            <rect x="-1" y="2" width="1.5" height="6" fill="#374151" stroke="#1F2937" stroke-width="0.3"/>
            <rect x="3" y="2" width="1.5" height="6" fill="#374151" stroke="#1F2937" stroke-width="0.3"/>
            <!-- Cross bracing -->
            <line x1="-4" y1="3" x2="-1" y2="5" stroke="#4B5563" stroke-width="0.3"/>
            <line x1="-1" y1="3" x2="3" y2="5" stroke="#4B5563" stroke-width="0.3"/>
            <line x1="4" y1="3" x2="1" y2="5" stroke="#4B5563" stroke-width="0.3"/>

            <!-- Drilling derrick -->
            <polygon points="0,-10 -1.5,-2 1.5,-2" fill="#DC2626" stroke="#B91C1C" stroke-width="0.4"/>
            <!-- Derrick cross members -->
            <line x1="-1" y1="-7" x2="1" y2="-7" stroke="#B91C1C" stroke-width="0.3"/>
            <line x1="-0.8" y1="-5" x2="0.8" y2="-5" stroke="#B91C1C" stroke-width="0.3"/>
            <line x1="-0.6" y1="-3" x2="0.6" y2="-3" stroke="#B91C1C" stroke-width="0.3"/>

            <!-- Drilling equipment house -->
            <rect x="-2.5" y="-2.5" width="5" height="2" fill="#4B5563" stroke="#374151" stroke-width="0.3"/>
            <!-- Equipment windows -->
            <rect x="-2" y="-2" width="0.6" height="0.6" fill="#FBBF24"/>
            <rect x="-0.8" y="-2" width="0.6" height="0.6" fill="#FBBF24"/>
            <rect x="0.4" y="-2" width="0.6" height="0.6" fill="#FBBF24"/>
            <rect x="1.6" y="-2" width="0.6" height="0.6" fill="#FBBF24"/>

            <!-- Helipad with realistic markings -->
            <circle cx="4.5" cy="-1" r="2.2" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.4"/>
            <!-- Helipad H marking -->
            <rect x="3.8" y="-1.5" width="0.4" height="3" fill="#1F2937"/>
            <rect x="4.3" y="-0.3" width="1" height="0.4" fill="#1F2937"/>
            <rect x="4.8" y="-1.5" width="0.4" height="3" fill="#1F2937"/>
            <!-- Helipad edge lights -->
            <circle cx="2.5" cy="-2" r="0.2" fill="#EF4444"/>
            <circle cx="2.5" cy="0" r="0.2" fill="#EF4444"/>
            <circle cx="6.5" cy="-2" r="0.2" fill="#EF4444"/>
            <circle cx="6.5" cy="0" r="0.2" fill="#EF4444"/>

            <!-- Living quarters -->
            <rect x="-5.5" y="-6" width="3" height="3.5" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="0.3"/>
            <!-- Quarters windows -->
            <rect x="-5" y="-5.5" width="0.5" height="0.5" fill="#FBBF24"/>
            <rect x="-4.2" y="-5.5" width="0.5" height="0.5" fill="#FBBF24"/>
            <rect x="-3.4" y="-5.5" width="0.5" height="0.5" fill="#FBBF24"/>
            <rect x="-5" y="-4.5" width="0.5" height="0.5" fill="#FBBF24"/>
            <rect x="-4.2" y="-4.5" width="0.5" height="0.5" fill="#FBBF24"/>
            <rect x="-3.4" y="-4.5" width="0.5" height="0.5" fill="#FBBF24"/>
            <!-- Quarters roof -->
            <polygon points="-5.5,-6 -4,-7 -2.5,-6" fill="#9CA3AF"/>

            <!-- Flare stack -->
            <rect x="6" y="-8" width="0.8" height="6" fill="#4B5563" stroke="#374151" stroke-width="0.3"/>
            <!-- Flare flame -->
            <ellipse cx="6.4" cy="-8.5" rx="0.6" ry="1" fill="#F59E0B" opacity="0.8"/>
            <ellipse cx="6.4" cy="-9" rx="0.4" ry="0.7" fill="#EF4444" opacity="0.6"/>

            <!-- Safety barriers -->
            <rect x="-6.2" y="-2.2" width="0.2" height="4.4" fill="#FBBF24"/>
            <rect x="6" y="-2.2" width="0.2" height="4.4" fill="#FBBF24"/>

            <!-- Navigation lights -->
            <circle cx="-6" cy="-3" r="0.3" fill="#EF4444"/>
            <circle cx="6" cy="-3" r="0.3" fill="#10B981"/>
            <circle cx="0" cy="-2.5" r="0.3" fill="#FBBF24"/>

            <!-- Oil storage tanks -->
            <circle cx="2" cy="3" r="1.5" fill="#6B7280" stroke="#4B5563" stroke-width="0.3"/>
            <circle cx="-3" cy="3" r="1.2" fill="#6B7280" stroke="#4B5563" stroke-width="0.3"/>
        </g>`;
    }

    drawLighthouse(x, y, cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Rocky foundation -->
            <ellipse cx="0" cy="3.5" rx="4" ry="1.5" fill="#6B7280" stroke="#4B5563" stroke-width="0.3"/>

            <!-- Keeper's house -->
            <rect x="-3.5" y="1" width="3" height="3" fill="#DC2626" stroke="#B91C1C" stroke-width="0.4"/>
            <!-- House roof -->
            <polygon points="-3.5,1 -2,0 -0.5,1" fill="#7F1D1D"/>
            <!-- House windows -->
            <rect x="-3" y="1.5" width="0.6" height="0.6" fill="#FBBF24"/>
            <rect x="-2" y="1.5" width="0.6" height="0.6" fill="#FBBF24"/>
            <!-- House door -->
            <rect x="-2.5" y="2.5" width="0.8" height="1.5" fill="#8B5CF6"/>

            <!-- Main lighthouse tower with realistic proportions -->
            <polygon points="-1.2,4 -1.8,-6 1.8,-6 1.2,4" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="0.4"/>

            <!-- Tower red stripe -->
            <rect x="-1.6" y="-2" width="3.2" height="1.5" fill="#DC2626"/>

            <!-- Lantern room with detailed structure -->
            <rect x="-2.2" y="-7.5" width="4.4" height="2" fill="#1F2937" stroke="#111827" stroke-width="0.3"/>
            <!-- Lantern room windows -->
            <rect x="-2" y="-7.2" width="0.8" height="1.4" fill="#FBBF24" opacity="0.8"/>
            <rect x="-0.8" y="-7.2" width="0.8" height="1.4" fill="#FBBF24" opacity="0.8"/>
            <rect x="0.4" y="-7.2" width="0.8" height="1.4" fill="#FBBF24" opacity="0.8"/>
            <rect x="1.6" y="-7.2" width="0.8" height="1.4" fill="#FBBF24" opacity="0.8"/>

            <!-- Lantern room dome -->
            <ellipse cx="0" cy="-7.5" rx="2.5" ry="0.8" fill="#374151" stroke="#1F2937" stroke-width="0.3"/>

            <!-- Weather vane -->
            <line x1="0" y1="-8.5" x2="0" y2="-9.5" stroke="#6B7280" stroke-width="0.3"/>
            <polygon points="0,-9.5 -0.8,-9.2 0,-8.8 0.8,-9.2" fill="#DC2626"/>

            <!-- Powerful light beam (wider and more realistic) -->
            <polygon points="0,-7 -6,-10 6,-10" fill="#FBBF24" opacity="0.4"/>
            <polygon points="0,-7 -4,-9.5 4,-9.5" fill="#FEF3C7" opacity="0.6"/>
            <polygon points="0,-7 -2,-9 2,-9" fill="#FFFBEB" opacity="0.8"/>

            <!-- Light rotation indicators -->
            <circle cx="-1.5" cy="-6.5" r="0.2" fill="#EF4444" opacity="0.8"/>
            <circle cx="1.5" cy="-6.5" r="0.2" fill="#EF4444" opacity="0.8"/>

            <!-- Walkway around lantern room -->
            <rect x="-2.5" y="-5.8" width="5" height="0.3" fill="#6B7280" stroke="#4B5563" stroke-width="0.2"/>
            <!-- Railing -->
            <line x1="-2.5" y1="-5.8" x2="-2.5" y2="-5.2" stroke="#4B5563" stroke-width="0.2"/>
            <line x1="2.5" y1="-5.8" x2="2.5" y2="-5.2" stroke="#4B5563" stroke-width="0.2"/>

            <!-- Navigation aids -->
            <circle cx="0" cy="2" r="0.3" fill="#10B981"/>
            <circle cx="-2" cy="0" r="0.3" fill="#EF4444"/>
            <circle cx="2" cy="0" r="0.3" fill="#EF4444"/>
        </g>`;
    }

    drawSeaMarker(x, y, cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        const scale = Math.max(cellSize / 8, 2.5);

        return `
        <g transform="translate(${centerX}, ${centerY}) scale(${scale})">
            <!-- Buoy -->
            <circle cx="0" cy="0" r="2" fill="#f97316" stroke="#ea580c" stroke-width="0.5"/>
            <rect x="-0.5" y="-1" width="1" height="2" fill="#ffffff"/>
            <!-- Light -->
            <circle cx="0" cy="-3" r="0.8" fill="#fbbf24"/>
            <!-- Chain line -->
            <line x1="0" y1="2" x2="0" y2="4" stroke="#6b7280" stroke-width="0.3" stroke-dasharray="0.5,0.5"/>
        </g>`;
    }

    // Mini icon methods for legend
    drawMiniCity(type) {
        if (type === 'major') {
            return `
            <g transform="scale(2.5)">
                <!-- Major city with skyscrapers -->
                <rect x="-4" y="-3" width="2" height="3" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
                <rect x="-3.8" y="-2.8" width="1.6" height="2.6" fill="#4a5568" opacity="0.3"/>
                <rect x="-1" y="-4" width="2" height="4" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
                <rect x="-0.8" y="-3.8" width="1.6" height="3.6" fill="#4a5568" opacity="0.3"/>
                <rect x="2" y="-2" width="2" height="2" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
                <rect x="2.2" y="-1.8" width="1.6" height="1.6" fill="#4a5568" opacity="0.3"/>
                <!-- Enhanced windows -->
                <rect x="-3.5" y="-2.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-2.8" y="-2.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-3.5" y="-1.8" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-2.8" y="-1.8" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-0.7" y="-3.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-0.1" y="-3.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="0.5" y="-3.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-0.7" y="-2.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-0.1" y="-2.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="0.5" y="-2.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="2.3" y="-1.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="3.1" y="-1.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <!-- Street and cars -->
                <rect x="-5" y="1" width="10" height="0.6" fill="#6B7280" opacity="0.7"/>
                <rect x="-2.5" y="1.2" width="0.6" height="0.3" fill="#EF4444"/>
                <rect x="1.5" y="1.2" width="0.6" height="0.3" fill="#3B82F6"/>
                <!-- Antenna -->
                <line x1="0" y1="-4" x2="0" y2="-4.8" stroke="#718096" stroke-width="0.2"/>
                <circle cx="0" cy="-5" r="0.15" fill="#F56565"/>
            </g>`;
        } else {
            return `
            <g transform="scale(2.5)">
                <!-- Town with enhanced buildings -->
                <rect x="-2" y="-1" width="1.5" height="2" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
                <rect x="-1.8" y="-0.8" width="1.1" height="1.6" fill="#4a5568" opacity="0.3"/>
                <rect x="0.5" y="-2" width="2" height="3" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
                <rect x="0.7" y="-1.8" width="1.6" height="2.6" fill="#4a5568" opacity="0.3"/>
                <!-- Enhanced windows -->
                <rect x="-1.7" y="-0.7" width="0.3" height="0.3" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-1.2" y="-0.7" width="0.3" height="0.3" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-1.7" y="-0.2" width="0.3" height="0.3" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="-1.2" y="-0.2" width="0.3" height="0.3" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="0.8" y="-1.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="1.4" y="-1.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="2" y="-1.5" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="0.8" y="-0.8" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="1.4" y="-0.8" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <rect x="2" y="-0.8" width="0.4" height="0.4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.05"/>
                <!-- Church steeple -->
                <rect x="-3.5" y="-0.5" width="0.8" height="1.5" fill="#8B5CF6" stroke="#7C3AED" stroke-width="0.2"/>
                <polygon points="-3.5,-0.5 -3.1,-1.3 -2.7,-0.5" fill="#6D28D9"/>
                <line x1="-3.1" y1="-1.3" x2="-3.1" y2="-1.8" stroke="#6B7280" stroke-width="0.1"/>
                <circle cx="-3.1" cy="-1.9" r="0.1" fill="#FBBF24"/>
                <!-- Town fountain -->
                <circle cx="0" cy="2" r="0.6" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="0.2"/>
                <circle cx="0" cy="2" r="0.3" fill="#3B82F6" opacity="0.6"/>
                <!-- Road -->
                <rect x="-4" y="2.5" width="8" height="0.5" fill="#6B7280" opacity="0.7"/>
                <rect x="-1" y="2.6" width="0.5" height="0.3" fill="#059669"/>
            </g>`;
        }
    }

    drawMiniSettlement() {
        return `
        <g transform="scale(2.5)">
            <!-- Main house -->
            <rect x="-2" y="-0.5" width="1.5" height="1.5" fill="#DC2626" stroke="#B91C1C" stroke-width="0.2"/>
            <polygon points="-2,-0.5 -1.25,-1.5 -0.5,-0.5" fill="#7F1D1D"/>
            <polygon points="-2,-0.5 -1.25,-1.5 -1.25,-1.3 -2,-0.3" fill="#991B1B" opacity="0.6"/>
            <!-- Chimney -->
            <rect x="-1.6" y="-1.8" width="0.3" height="0.8" fill="#6B5B73"/>
            <!-- Windows with mullions -->
            <rect x="-1.8" y="-0.2" width="0.4" height="0.4" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-1.6" y1="-0.2" x2="-1.6" y2="0.2" stroke="#F59E0B" stroke-width="0.05"/>
            <rect x="-1.2" y="-0.2" width="0.4" height="0.4" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <line x1="-1" y1="-0.2" x2="-1" y2="0.2" stroke="#F59E0B" stroke-width="0.05"/>
            <!-- Door -->
            <rect x="-0.8" y="0.5" width="0.3" height="0.5" fill="#8B5CF6"/>

            <!-- Second house -->
            <rect x="0.5" y="0" width="1.5" height="1.5" fill="#059669" stroke="#047857" stroke-width="0.2"/>
            <polygon points="0.5,0 1.25,-1 2,0" fill="#064E3B"/>
            <polygon points="0.5,0 1.25,-1 1.25,-0.8 0.5,0.2" fill="#065F46" opacity="0.6"/>
            <!-- Chimney -->
            <rect x="1.1" y="-1.3" width="0.3" height="0.8" fill="#6B5B73"/>
            <!-- Windows -->
            <rect x="0.7" y="0.3" width="0.3" height="0.3" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <rect x="1.2" y="0.3" width="0.3" height="0.3" fill="#FBBF24" stroke="#F59E0B" stroke-width="0.1"/>
            <!-- Door -->
            <rect x="1.6" y="1" width="0.3" height="0.5" fill="#8B5CF6"/>

            <!-- Well -->
            <circle cx="-0.5" cy="1.5" r="0.4" fill="#6B7280"/>
            <circle cx="-0.5" cy="1.5" r="0.25" fill="#1E40AF" opacity="0.8"/>

            <!-- Smoke -->
            <circle cx="-1.5" cy="-2" r="0.15" fill="#9CA3AF" opacity="0.6"/>
            <circle cx="1.2" cy="-1.5" r="0.12" fill="#9CA3AF" opacity="0.6"/>
        </g>`;
    }

    drawMiniAirfield() {
        return `
        <g transform="scale(2.5)">
            <!-- Main runway -->
            <rect x="-4" y="-0.5" width="8" height="1" fill="#2D3748" stroke="#1A202C" stroke-width="0.3"/>
            <!-- Runway edge lights -->
            <circle cx="-3.5" cy="-0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="-1.5" cy="-0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="0.5" cy="-0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="2.5" cy="-0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="-3.5" cy="0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="-1.5" cy="0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="0.5" cy="0.5" r="0.08" fill="#FBBF24"/>
            <circle cx="2.5" cy="0.5" r="0.08" fill="#FBBF24"/>
            <!-- Runway markings -->
            <rect x="-3" y="-0.2" width="0.5" height="0.4" fill="#ffffff"/>
            <rect x="-1" y="-0.2" width="0.5" height="0.4" fill="#ffffff"/>
            <rect x="1" y="-0.2" width="0.5" height="0.4" fill="#ffffff"/>
            <rect x="3" y="-0.2" width="0.5" height="0.4" fill="#ffffff"/>
            <!-- Control tower with detail -->
            <rect x="-0.5" y="-3" width="1" height="2" fill="#4A5568" stroke="#2D3748" stroke-width="0.3"/>
            <rect x="-0.4" y="-2.8" width="0.8" height="1.6" fill="#374151" opacity="0.3"/>
            <!-- Tower windows -->
            <rect x="-0.4" y="-2.5" width="0.8" height="0.6" fill="#63B3ED" stroke="#3182CE" stroke-width="0.1"/>
            <rect x="-0.3" y="-2.4" width="0.3" height="0.3" fill="#BFDBFE" opacity="0.6"/>
            <!-- Radar dome -->
            <circle cx="0" cy="-3.5" r="0.5" fill="#E2E8F0" stroke="#CBD5E0" stroke-width="0.2"/>
            <circle cx="0" cy="-3.5" r="0.3" fill="#F7FAFC" opacity="0.7"/>
            <!-- Navigation light -->
            <circle cx="0" cy="-4.2" r="0.2" fill="#F56565"/>
            <circle cx="0" cy="-4.2" r="0.1" fill="#FEB2B2"/>
            <!-- Small hangar -->
            <rect x="1.5" y="-2.2" width="2" height="1.5" fill="#718096" stroke="#4A5568" stroke-width="0.2"/>
            <polygon points="1.5,-2.2 3.5,-2.2 3.8,-1.7 1.2,-1.7" fill="#A0AEC0"/>
            <!-- Aircraft on ground -->
            <ellipse cx="-2.5" cy="1.2" rx="0.3" ry="0.15" fill="#3B82F6"/>
            <ellipse cx="2" cy="1.2" rx="0.3" ry="0.15" fill="#EF4444"/>
        </g>`;
    }

    drawMiniMilitary() {
        return `
        <g transform="scale(2.5)">
            <!-- Security perimeter fence -->
            <rect x="-3" y="-2" width="6" height="4" fill="none" stroke="#8B7355" stroke-width="0.3"/>
            <!-- Razor wire -->
            <path d="M -3,-2 Q -2.5,-2.2 -2,-2 Q -1.5,-1.8 -1,-2 Q -0.5,-2.2 0,-2 Q 0.5,-1.8 1,-2 Q 1.5,-2.2 2,-2 Q 2.5,-1.8 3,-2" stroke="#A0ADB8" stroke-width="0.1" fill="none"/>

            <!-- Command building -->
            <rect x="-1.5" y="-1.2" width="3" height="1.2" fill="#4A5568" stroke="#2D3748" stroke-width="0.2"/>
            <rect x="-1.3" y="-1" width="2.6" height="1" fill="#374151" opacity="0.3"/>
            <!-- Command windows -->
            <rect x="-1.2" y="-1" width="0.5" height="0.4" fill="#63B3ED" stroke="#3182CE" stroke-width="0.05"/>
            <rect x="-0.25" y="-1" width="0.5" height="0.4" fill="#63B3ED" stroke="#3182CE" stroke-width="0.05"/>
            <rect x="0.7" y="-1" width="0.5" height="0.4" fill="#63B3ED" stroke="#3182CE" stroke-width="0.05"/>

            <!-- Barracks -->
            <rect x="-2.5" y="0.2" width="1.2" height="0.8" fill="#68747A" stroke="#4A5568" stroke-width="0.2"/>
            <rect x="1.3" y="0.2" width="1.2" height="0.8" fill="#68747A" stroke="#4A5568" stroke-width="0.2"/>
            <!-- Barracks windows -->
            <rect x="-2.2" y="0.4" width="0.2" height="0.2" fill="#FBBF24"/>
            <rect x="-1.8" y="0.4" width="0.2" height="0.2" fill="#FBBF24"/>
            <rect x="1.6" y="0.4" width="0.2" height="0.2" fill="#FBBF24"/>
            <rect x="2" y="0.4" width="0.2" height="0.2" fill="#FBBF24"/>

            <!-- Communications tower -->
            <line x1="0" y1="-3.2" x2="0" y2="-0.5" stroke="#718096" stroke-width="0.4"/>
            <!-- Tower crossbeams -->
            <line x1="-0.8" y1="-2.8" x2="0.8" y2="-2.8" stroke="#718096" stroke-width="0.2"/>
            <line x1="-0.6" y1="-2.2" x2="0.6" y2="-2.2" stroke="#718096" stroke-width="0.2"/>
            <!-- Satellite dish -->
            <ellipse cx="0" cy="-3.8" rx="0.6" ry="0.4" fill="#E2E8F0" stroke="#CBD5E0" stroke-width="0.2"/>
            <circle cx="0" cy="-3.8" r="0.1" fill="#374151"/>

            <!-- Guard towers -->
            <rect x="-2.8" y="-1.8" width="0.4" height="0.8" fill="#68747A"/>
            <rect x="-2.9" y="-1.9" width="0.6" height="0.3" fill="#4A5568"/>
            <rect x="2.4" y="-1.8" width="0.4" height="0.8" fill="#68747A"/>
            <rect x="2.3" y="-1.9" width="0.6" height="0.3" fill="#4A5568"/>

            <!-- Flag with wind effect -->
            <line x1="1.8" y1="-2.5" x2="1.8" y2="-0.5" stroke="#8B7355" stroke-width="0.2"/>
            <path d="M 1.8,-2.5 Q 2.3,-2.6 2.6,-2.4 Q 2.4,-2.3 2.6,-2.1 Q 2.3,-2 1.8,-2.1" fill="#DC2626"/>
            <path d="M 1.8,-2.1 Q 2.3,-2.2 2.6,-2 Q 2.4,-1.9 2.6,-1.7 Q 2.3,-1.6 1.8,-1.7" fill="#FFFFFF"/>
            <path d="M 1.8,-1.7 Q 2.3,-1.8 2.6,-1.6 Q 2.4,-1.5 2.6,-1.3 Q 2.3,-1.2 1.8,-1.3" fill="#2563EB"/>

            <!-- Security lights -->
            <circle cx="-2" cy="-0.5" r="0.15" fill="#FBBF24" opacity="0.3"/>
            <circle cx="-2" cy="-0.5" r="0.1" fill="#FBBF24"/>
            <circle cx="0" cy="-0.5" r="0.15" fill="#FBBF24" opacity="0.3"/>
            <circle cx="0" cy="-0.5" r="0.1" fill="#FBBF24"/>
            <circle cx="2" cy="-0.5" r="0.15" fill="#FBBF24" opacity="0.3"/>
            <circle cx="2" cy="-0.5" r="0.1" fill="#FBBF24"/>
        </g>`;
    }

    drawMiniPort() {
        return `
        <g transform="scale(2.5)">
            <rect x="-3" y="-1.5" width="2.5" height="1.5" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
            <rect x="0.5" y="-1" width="2" height="1" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
            <line x1="-1" y1="-3" x2="-1" y2="0.5" stroke="#71717a" stroke-width="0.5"/>
            <line x1="-1" y1="-2.5" x2="1" y2="-1.5" stroke="#71717a" stroke-width="0.3"/>
            <line x1="2" y1="-2.5" x2="2" y2="0.5" stroke="#71717a" stroke-width="0.5"/>
            <line x1="2" y1="-2" x2="3.5" y2="-1" stroke="#71717a" stroke-width="0.3"/>
            <rect x="-2" y="1" width="0.8" height="0.5" fill="#dc2626"/>
            <rect x="-1" y="1" width="0.8" height="0.5" fill="#2563eb"/>
            <rect x="0.5" y="1" width="0.8" height="0.5" fill="#16a34a"/>
        </g>`;
    }

    drawMiniIndustrial() {
        return `
        <g transform="scale(2.5)">
            <rect x="-3" y="-1" width="2.5" height="2" fill="#71717a" stroke="#52525b" stroke-width="0.3"/>
            <rect x="0.5" y="-1.5" width="2.5" height="2.5" fill="#71717a" stroke="#52525b" stroke-width="0.3"/>
            <rect x="-2" y="-3" width="0.5" height="2" fill="#374151"/>
            <rect x="2" y="-3.5" width="0.5" height="2" fill="#374151"/>
            <circle cx="-1.8" cy="-3.5" r="0.3" fill="#9ca3af" opacity="0.6"/>
            <circle cx="2.2" cy="-4" r="0.3" fill="#9ca3af" opacity="0.6"/>
            <circle cx="-0.5" cy="1.5" r="0.8" fill="#6b7280" stroke="#374151" stroke-width="0.3"/>
            <circle cx="1.5" cy="2" r="0.5" fill="#6b7280" stroke="#374151" stroke-width="0.3"/>
        </g>`;
    }

    drawMiniHarbor() {
        return `
        <g transform="scale(2.5)">
            <rect x="-3" y="-0.5" width="4" height="1" fill="#8b5cf6" stroke="#7c3aed" stroke-width="0.3"/>
            <circle cx="-2" cy="0" r="0.3" fill="#374151"/>
            <circle cx="-0.5" cy="0" r="0.3" fill="#374151"/>
            <circle cx="1" cy="0" r="0.3" fill="#374151"/>
            <rect x="-1.5" y="-2" width="1.5" height="1.5" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
            <line x1="0.5" y1="-2.5" x2="0.5" y2="0.5" stroke="#71717a" stroke-width="0.4"/>
            <line x1="0.5" y1="-2" x2="2" y2="-1" stroke="#71717a" stroke-width="0.3"/>
        </g>`;
    }

    drawMiniLighthouse() {
        return `
        <g transform="scale(2.5)">
            <polygon points="-0.5,1 -0.8,-2 0.8,-2 0.5,1" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.3"/>
            <rect x="-1" y="-2.5" width="2" height="0.8" fill="#dc2626" stroke="#b91c1c" stroke-width="0.3"/>
            <polygon points="0,-2.5 -1.5,-3.5 1.5,-3.5" fill="#fbbf24" opacity="0.6"/>
            <rect x="-1" y="1" width="2" height="1" fill="#64748b" stroke="#475569" stroke-width="0.3"/>
        </g>`;
    }

    addSimplifiedCoordinateLabels(mapSize, cellSize) {
        let labels = '';

        // Simple column labels
        for (let x = 0; x < mapSize; x++) {
            const label = GameUtils.generateExtendedCoordinate(x, 1).slice(0, -1);
            const xPos = 50 + (x * cellSize) + cellSize/2;

            labels += `<text x="${xPos}" y="40" text-anchor="middle"
                       font-family="Arial" font-size="10" font-weight="bold"
                       fill="#FFFFFF" stroke="#000000" stroke-width="0.5">${label}</text>`;
        }

        // Simple row labels
        for (let y = 0; y < mapSize; y++) {
            const label = y + 1;
            const yPos = 50 + (y * cellSize) + cellSize/2;
            labels += `<text x="35" y="${yPos + 3}" text-anchor="middle"
                       font-family="Arial" font-size="10" font-weight="bold"
                       fill="#FFFFFF" stroke="#000000" stroke-width="0.5">${label}</text>`;
        }

        return labels;
    }

    addSimplifiedStatusPanel(game, startX, startY, panelHeight) {
        let status = `<text x="${startX + 5}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">Player Ships</text>`;

        let currentY = startY + 35;
        const orderedPlayers = game.turnOrder.map(playerId => game.players.get(playerId)).filter(player => player);

        // Display all players without arbitrary limit
        for (const player of orderedPlayers) {
            const healthPercent = (player.currentHealth / player.maxHealth) * 100;
            const shipName = (player.displayName || player.username || player.shipClass).replace(/^\{[A-Z]+\}\s*/, '');
            const turnPosition = game.turnOrder.indexOf(player.id) + 1;

            const playerColor = player.alive ? "#FFFFFF" : "#800080";
            status += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" font-weight="bold" fill="${playerColor}" stroke="#000000" stroke-width="0.5">${turnPosition}. ${shipName}</text>`;

            currentY += 15;
        }

        return status;
    }

    addSimplifiedAIPanel(game, startX, startY, panelHeight) {
        // Create sorted list of enemies (alive first, then dead) to match Enemy Forces panel order
        const aliveEnemies = Array.from(game.enemies.values()).filter(e => e.alive);
        const deadEnemies = Array.from(game.enemies.values()).filter(e => !e.alive);
        const sortedEnemies = [...aliveEnemies, ...deadEnemies];

        if (sortedEnemies.length === 0) {
            return `<text x="${startX + 8}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">AI Forces</text>
                    <text x="${startX + 8}" y="${startY + 35}" font-family="Arial" font-size="10" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">No enemies</text>`;
        }

        let status = `<text x="${startX + 8}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FF6B6B" stroke="#000000" stroke-width="0.5">AI Forces</text>`;

        let currentY = startY + 35;
        // Display all enemies without arbitrary limit
        for (const enemy of sortedEnemies) {
            const healthPercent = (enemy.currentHealth / enemy.maxHealth) * 100;
            const enemyColor = enemy.alive ? "#FFFFFF" : "#800080";
            status += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="${enemyColor}" stroke="#000000" stroke-width="0.5">${enemy.shipClass}</text>`;
            currentY += 15;
        }

        return status;
    }

    addSimplifiedLegend(startX, startY) {
        return `<text x="${startX + 5}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">Legend</text>
                <text x="${startX + 8}" y="${startY + 35}" font-family="Arial" font-size="10" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">🌊 Ocean  🏝️ Island  🪸 Reef  ⚠️ Spawn</text>
                <text x="${startX + 8}" y="${startY + 55}" font-family="Arial" font-size="10" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">🔵 Player  🔴 Enemy  🟢 Aircraft  ⚪ Civilian</text>`;
    }

    async updateGameDisplay(game, channel) {
        try {
            // Generate new map image
            const filepath = await this.createMapImage(game);
            
            if (!filepath) {
                throw new Error('Failed to generate map image');
            }
            
            // Extract filename for Discord
            const path = require('path');
            const filename = path.basename(filepath);
            
            const mapContent = `🗺️ **NAVAL BATTLEFIELD - TURN ${game.turnNumber}**\n🌤️ Weather: ${game.weather.toUpperCase()}`;
            
            // If we have an existing pinned map message, try to update it
            if (game.pinnedMapMessageId) {
                try {
                    const existingMessage = await channel.messages.fetch(game.pinnedMapMessageId);
                    
                    // Update the existing message with new map
                    await existingMessage.edit({
                        content: mapContent,
                        files: [{
                            attachment: filepath,
                            name: filename
                        }]
                    });
                                        
                    // Clean up old map file if it exists
                    this.cleanupOldMapFile(game, filepath);
                    return;
                    
                } catch (fetchError) {
                    console.log(`⚠️ Could not fetch/update existing pinned message (${game.pinnedMapMessageId}):`, fetchError.message);
                    
                    // Try to unpin the old message if it still exists
                    try {
                        const oldMessage = await channel.messages.fetch(game.pinnedMapMessageId);
                        if (oldMessage.pinned) {
                            await oldMessage.unpin();
                            console.log('📌 Unpinned old message');
                        }
                    } catch (unpinError) {
                        console.log('⚠️ Could not unpin old message - it may have been deleted');
                    }
                    
                    // Reset the pinned message ID since the old one is invalid
                    game.pinnedMapMessageId = null;
                }
            }
            
            // Create new pinned message if no existing one or update failed
            const mapMessage = await channel.send({
                content: mapContent,
                files: [{
                    attachment: filepath,
                    name: filename
                }]
            });
            
            // Pin the new message
            try {
                await mapMessage.pin();
                game.pinnedMapMessageId = mapMessage.id;
            } catch (pinError) {
                console.log('⚠️ Could not pin new message:', pinError.message);
                console.log('📌 Message sent but not pinned - continuing...');
                game.pinnedMapMessageId = mapMessage.id; // Store ID even if not pinned
            }
            
            // Store the filepath for cleanup
            if (!game.mapFiles) {
                game.mapFiles = [];
            }
            game.mapFiles.push(filepath);
            
        } catch (error) {
            console.error('❌ Error updating map display:', error);
            throw error;
        }
    }

    drawEntityOnMap(game, coord, pixelX, pixelY, cellSize) {
        let entitySVG = '';
        const centerX = pixelX + cellSize / 2;
        const centerY = pixelY + cellSize / 2;
        const squareSize = Math.max(8, cellSize * 0.8); // Increased from 0.75 to 0.8
        const squareX = centerX - squareSize/2;
        const squareY = centerY - squareSize/2;
        const cell = game.getMapCell(coord);
        
        // Check for objective-related entities first
        if (game.objective) {
            // Resource zone marker (gold center)
            if (game.objective.type === 'resource_acquisition' && coord === game.objective.resourceZone) {
                entitySVG += `<circle cx="${centerX}" cy="${centerY}" r="${squareSize/2}" 
                             fill="#FFD700" stroke="#000" stroke-width="1.5" class="smooth-shapes"/>`;
                entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                             font-family="Arial Black, Arial" font-size="8" font-weight="bold" 
                             fill="#000" class="crisp-text">RES</text>`;
                return entitySVG;
            }
                    
                // Outpost marker
                if (game.objective.type === 'capture_outpost' && coord === game.objective.outpostLocation) {
                    const outpostColor = game.objective.outpostDestroyed ? '#8B0000' : '#8B4513';
                    entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="${outpostColor}" stroke="#000" stroke-width="1"/>`;
                    entitySVG += `<text x="${centerX}" y="${centerY + 2}" text-anchor="middle" font-family="Arial" font-size="6" font-weight="bold" fill="#FFFFFF">OUT</text>`;
                    return entitySVG;
                }
                
                // Convoy ships (escort mission)
                if (cell && cell.type === 'destination_zone') {
                    // Draw yellow highlight for destination zone
                    entitySVG += `<rect x="${pixelX}" y="${pixelY}" width="${cellSize}" height="${cellSize}" 
                                 fill="#FFFF00" fill-opacity="0.3" stroke="#FFD700" stroke-width="0.5"/>`;
                    
                    // If this is the center point, add a special marker
                    if (cell.isDestinationCenter) {
                        // Draw a circle or star to mark the exact destination
                        entitySVG += `<circle cx="${centerX}" cy="${centerY}" r="${cellSize/3}" 
                                     fill="#FFD700" stroke="#FF8C00" stroke-width="2"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 2}" text-anchor="middle" 
                                     font-family="Arial" font-size="8" font-weight="bold" fill="#000">DEST</text>`;
                    }
                }
                
                // Enemy convoy ships (interception mission)
                if (game.objective.type === 'convoy_interception' && game.objective.convoyShips) {
                    for (const convoy of game.objective.convoyShips) {
                        if (convoy.position === coord && convoy.alive && !convoy.captured && !convoy.escaped) {
                            const convoyColor = '#FF8C00'; // Orange for enemy convoy
                            entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="${convoyColor}" stroke="#000" stroke-width="1"/>`;
                            entitySVG += `<text x="${centerX}" y="${centerY + 2}" text-anchor="middle" font-family="Arial" font-size="5" font-weight="bold" fill="#000">EAX</text>`;
                            return entitySVG;
                        }
                    }
                }
                
                // Salvage zone markers
                if (game.objective && game.objective.type === 'salvage_supplies' && game.objective.salvageZones) {
                    for (const zone of game.objective.salvageZones) {
                        if (coord === zone.location && zone.wreck) {
                            // Draw ONLY the destroyed auxiliary ship
                            entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" 
                                         fill="#2F4F4F" stroke="#000000" stroke-width="1.5" class="smooth-shapes"/>`;
                            
                            if (cellSize > 8) {
                                // Add zone status indicator as border color
                                const zoneColor = zone.captured ? '#00FF00' : zone.currentPlayer ? '#FFFF00' : '#20B2AA';
                                
                                // Colored border to show salvage status
                                entitySVG += `<rect x="${squareX-1}" y="${squareY-1}" width="${squareSize+2}" height="${squareSize+2}" 
                                             fill="none" stroke="${zoneColor}" stroke-width="2" class="smooth-shapes"/>`;
                                
                                // Just "AUX" text, no zone letters
                                entitySVG += `<rect x="${centerX - (cellSize * 0.45)}" y="${centerY - (cellSize * 0.35)}" 
                                             width="${cellSize * 0.9}" height="${cellSize * 0.7}" 
                                             fill="#000000" fill-opacity="0.8" rx="2" class="smooth-shapes"/>`;
                                entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                                             font-family="Arial Black, Arial" font-size="${Math.max(8, cellSize * 0.6)}" 
                                             font-weight="bold" fill="#FFFFFF" class="crisp-text">AX</text>`;
                            }
                            return entitySVG;
                        }
                    }
                }

                if (game.objective && game.objective.type === 'convoy_escort' && game.objective.convoyShips) {
                    for (const convoy of game.objective.convoyShips) {
                        if (convoy.position === coord && convoy.alive) {
                            const convoyColor = convoy.canMove ? '#00FF00' : '#808080'; // Green if can move, gray if waiting
                            entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="${convoyColor}" stroke="#000" stroke-width="1"/>`;
                            entitySVG += `<text x="${centerX}" y="${centerY + 2}" text-anchor="middle" font-family="Arial" font-size="5" font-weight="bold" fill="#000">AX</text>`;
                            return entitySVG;
                        }
                    }
                }
            }
            
            // Regular entity drawing (existing code)
            // Check for players (BLUE SQUARES with turn position, DARK PURPLE if dead)
            for (const player of game.players.values()) {
                if (player.position === coord) {
                    const turnPosition = game.turnOrder.indexOf(player.id) + 1;
                    const playerColor = player.alive ? '#0000FF' : '#800080';
                    
                    entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" 
                                 fill="${playerColor}" stroke="#000000" stroke-width="1"/>`;
                    if (cellSize > 6) {
                        // Add background circle for better readability
                        entitySVG += `<circle cx="${centerX}" cy="${centerY}" r="${Math.max(8, cellSize * 0.4)}" fill="#000000" fill-opacity="0.6"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" font-family="Arial Black" 
                                     font-size="${Math.max(8, cellSize * 0.7)}" font-weight="bold" fill="#FFFFFF">${turnPosition}</text>`;
                    }
                    return entitySVG;
                }
            }
                        
            for (const player of game.players.values()) {
                if (player.position === coord) {
                    const turnPosition = game.turnOrder.indexOf(player.id) + 1;
                    const playerColor = player.alive ? '#0000FF' : '#800080';
                    
                    entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" 
                                 fill="${playerColor}" stroke="#000000" stroke-width="1.5" class="smooth-shapes"/>`;
                    if (cellSize > 8) {
                        // Add background circle for better readability
                        entitySVG += `<circle cx="${centerX}" cy="${centerY}" r="${Math.max(10, cellSize * 0.45)}" 
                                     fill="#000000" fill-opacity="0.7" class="smooth-shapes"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 4}" text-anchor="middle" 
                                     font-family="Arial Black, Arial" font-size="${Math.max(10, cellSize * 0.8)}" 
                                     font-weight="bold" fill="#FFFFFF" class="crisp-text">${turnPosition}</text>`;
                    }
                    return entitySVG;
                }
            }
            
            // Enemy entities with improved text
            for (const enemy of game.enemies.values()) {
                if (enemy.position === coord) {
                    const classAbbr = GameUtils.getShipClassAbbreviation(enemy.shipClass);
                    let enemyColor = enemy.alive ? '#FF0000' : '#000000';
                    
                    // Special colors for boss enemies
                    if (enemy.type === 'boss' && enemy.alive) {
                        if (enemy.bossType === 'harbor_princess') {
                            enemyColor = '#4B0082'; // Indigo for Harbor Princess
                        } else {
                            enemyColor = '#8B0000'; // Dark red for other bosses
                        }
                    }
                    
                    entitySVG += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" 
                                 fill="${enemyColor}" stroke="#000000" stroke-width="1.5" class="smooth-shapes"/>`;
                    if (cellSize > 8) {
                        const textColor = '#FFFFFF';
                        let displayText = classAbbr;
                        
                        // Special display for bosses
                        if (enemy.type === 'boss') {
                            displayText = 'BOSS';
                        }
                        
                        // Add background for better readability
                        entitySVG += `<rect x="${centerX - (cellSize * 0.45)}" y="${centerY - (cellSize * 0.35)}" 
                                     width="${cellSize * 0.9}" height="${cellSize * 0.7}" 
                                     fill="#000000" fill-opacity="0.7" rx="2" class="smooth-shapes"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                                     font-family="Arial Black, Arial" font-size="${Math.max(8, cellSize * 0.6)}" 
                                     font-weight="bold" fill="${textColor}" class="crisp-text">${displayText}</text>`;
                    }
                    return entitySVG;
                }
            }

            // Aircraft with improved triangles and text
            for (const aircraft of game.aircraft?.values() || []) {
                if (aircraft.position === coord && aircraft.alive) {
                    const triangleSize = cellSize * 0.9; // Slightly larger
                    const aircraftColor = aircraft.owner === 'player' ? '#0066FF' : '#FF6600';
                    
                    // Different shapes for different aircraft types
                    if (aircraft.type === 'fighter') {
                        // Upward triangle for fighters
                        entitySVG += `<polygon points="${centerX},${centerY-triangleSize/2} ${centerX-triangleSize/2},${centerY+triangleSize/2} ${centerX+triangleSize/2},${centerY+triangleSize/2}" 
                                     fill="${aircraftColor}" stroke="#000" stroke-width="1.5" class="smooth-shapes"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                                     font-family="Arial Black, Arial" font-size="8" fill="#FFFFFF" 
                                     font-weight="bold" class="crisp-text">F</text>`;
                    } else if (aircraft.type === 'dive_bomber') {
                        // Right-pointing triangle for dive bombers
                        entitySVG += `<polygon points="${centerX+triangleSize/2},${centerY} ${centerX-triangleSize/2},${centerY-triangleSize/2} ${centerX-triangleSize/2},${centerY+triangleSize/2}" 
                                     fill="${aircraftColor}" stroke="#000" stroke-width="1.5" class="smooth-shapes"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                                     font-family="Arial Black, Arial" font-size="8" fill="#FFFFFF" 
                                     font-weight="bold" class="crisp-text">D</text>`;
                    } else if (aircraft.type === 'torpedo_bomber') {
                        // Downward triangle for torpedo bombers
                        entitySVG += `<polygon points="${centerX},${centerY+triangleSize/2} ${centerX-triangleSize/2},${centerY-triangleSize/2} ${centerX+triangleSize/2},${centerY-triangleSize/2}" 
                                     fill="${aircraftColor}" stroke="#000" stroke-width="1.5" class="smooth-shapes"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                                     font-family="Arial Black, Arial" font-size="8" fill="#FFFFFF" 
                                     font-weight="bold" class="crisp-text">T</text>`;
                    } else if (aircraft.type === 'scout') {
                        // Left-pointing triangle for scouts
                        entitySVG += `<polygon points="${centerX-triangleSize/2},${centerY} ${centerX+triangleSize/2},${centerY-triangleSize/2} ${centerX+triangleSize/2},${centerY+triangleSize/2}" 
                                     fill="${aircraftColor}" stroke="#000" stroke-width="1.5" class="smooth-shapes"/>`;
                        entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" 
                                     font-family="Arial Black, Arial" font-size="8" fill="#FFFFFF" 
                                     font-weight="bold" class="crisp-text">S</text>`;
                    }
                    
                    return entitySVG;
                }
            }

            // Civilian boats with distinct icons
            for (const [id, boat] of game.civilianBoats || new Map()) {
                if (boat.position === coord && boat.alive) {
                    const boatSize = cellSize * 0.8;
                    // Civilian boats are grey/blue colored
                    entitySVG += `<rect x="${centerX-boatSize/2}" y="${centerY-boatSize/3}" width="${boatSize}" height="${boatSize/1.5}"
                                 fill="#4A90E2" stroke="#2D5AA0" stroke-width="1.5" rx="3" class="smooth-shapes"/>`;
                    // Add civilian boat icon/text
                    entitySVG += `<text x="${centerX}" y="${centerY + 2}" text-anchor="middle"
                                 font-family="Arial Black, Arial" font-size="7" fill="#FFFFFF"
                                 font-weight="bold" class="crisp-text">C</text>`;
                }
            }

            // Civilian aircraft with distinct triangles
            for (const [id, aircraft] of game.civilianAircraft || new Map()) {
                if (aircraft.position === coord && aircraft.alive) {
                    const triangleSize = cellSize * 0.8;
                    // Civilian aircraft are white/light grey colored
                    entitySVG += `<polygon points="${centerX},${centerY-triangleSize/2} ${centerX-triangleSize/2},${centerY+triangleSize/2} ${centerX+triangleSize/2},${centerY+triangleSize/2}"
                                 fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1.5" class="smooth-shapes"/>`;
                    // Add civilian aircraft icon/text
                    entitySVG += `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle"
                                 font-family="Arial Black, Arial" font-size="7" fill="#333333"
                                 font-weight="bold" class="crisp-text">CIV</text>`;
                }
            }

            // Check for mines (orange diamonds) with better styling
            for (const mine of game.mines || []) {
                if (mine.position === coord) {
                    const diamondSize = cellSize * 0.7; // Slightly larger
                    entitySVG += `<polygon points="${centerX},${centerY-diamondSize} ${centerX+diamondSize},${centerY} ${centerX},${centerY+diamondSize} ${centerX-diamondSize},${centerY}" 
                                 fill="#FF4500" stroke="#000" stroke-width="1" class="smooth-shapes"/>`;
                    return entitySVG;
                }
            }
            
            return entitySVG;
        }

    addExtendedCoordinateLabels(mapSize, cellSize) {
        let labels = '';

        // Military-style header
        labels += `<rect x="10" y="10" width="150" height="20" fill="#1e3a8a" stroke="#FFFFFF" stroke-width="1" opacity="0.9"/>`;
        labels += `<text x="85" y="24" text-anchor="middle" font-size="10" fill="#FFFFFF" font-weight="bold">NAVAL GRID REFERENCE</text>`;

        // Enhanced column labels with military styling
        for (let x = 0; x < mapSize; x++) {
            const label = GameUtils.generateExtendedCoordinate(x, 1).slice(0, -1);
            const xPos = 50 + (x * cellSize) + cellSize/2;

            // Background box for labels
            labels += `<rect x="${xPos - 8}" y="35" width="16" height="16" fill="#1e3a8a" stroke="#FFFFFF" stroke-width="0.5" opacity="0.8"/>`;
            labels += `<text x="${xPos}" y="45" text-anchor="middle"
                       font-family="Arial Black, Arial, sans-serif" font-size="10" font-weight="bold"
                       fill="#FFFFFF" stroke="#000000" stroke-width="0.5"
                       class="crisp-text">${label}</text>`;
        }

        // Enhanced row labels with military styling
        for (let y = 0; y < mapSize; y++) {
            const label = y + 1;
            const yPos = 50 + (y * cellSize) + cellSize/2;

            // Background box for labels
            labels += `<rect x="25" y="${yPos - 8}" width="16" height="16" fill="#1e3a8a" stroke="#FFFFFF" stroke-width="0.5" opacity="0.8"/>`;
            labels += `<text x="33" y="${yPos + 3}" text-anchor="middle"
                       font-family="Arial Black, Arial, sans-serif" font-size="10" font-weight="bold"
                       fill="#FFFFFF" stroke="#000000" stroke-width="0.5" 
                       class="crisp-text">${label}</text>`;
        }

        // Add depth soundings (military-style depth markers)
        for (let x = 0; x < mapSize; x += 8) {
            for (let y = 0; y < mapSize; y += 8) {
                const pixelX = 50 + x * cellSize + cellSize/2;
                const pixelY = 50 + y * cellSize + cellSize/2;
                const depth = Math.floor(Math.random() * 50) + 10;
                labels += `<text x="${pixelX}" y="${pixelY}" text-anchor="middle" font-size="6" fill="#87CEEB" opacity="0.6">${depth}</text>`;
            }
        }

        return labels;
    }

    addCompactStatusPanel(game, startX, startY) {
        let status = `<text x="${startX + 5}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5" filter="url(#glow)">⚓ Player Ships</text>`;
        
        let currentY = startY + 35;
        const orderedPlayers = game.turnOrder.map(playerId => game.players.get(playerId)).filter(player => player);
        
        const maxHeight = startY + 400;
        const maxPlayers = 15;
        
        // Load status icons once
        const fireIcon = this.loadStatusIconAsBase64('icons/Fire.png');
        const floodIcon = this.loadStatusIconAsBase64('icons/Flood.png');
        
        
        let playerCount = 0;
        for (const player of orderedPlayers) {
            if (currentY > maxHeight || playerCount >= maxPlayers) break;
            playerCount++;
            
            const healthPercent = (player.currentHealth / player.maxHealth) * 100;
            const discordNickname = player.displayName || player.username || player.shipClass;
            const shipName = discordNickname.replace(/^\{[A-Z]+\}\s*/, '');
            const turnPosition = game.turnOrder.indexOf(player.id) + 1;

            // Load ship class icon
            const iconPath = this.getShipClassIcon(player.shipClass);
            const iconBase64 = this.loadIconAsBase64(iconPath);
            
            // Enhanced ship silhouette based on class
            const shipType = player.shipClass.toLowerCase().includes('cv') ? 'carrier' :
                           player.shipClass.toLowerCase().includes('dd') ? 'destroyer' :
                           player.shipClass.toLowerCase().includes('ss') ? 'submarine' : 'destroyer';

            status += `<g transform="translate(${startX + 16}, ${currentY - 4})">
                          <use href="#${shipType}" transform="scale(0.8)" opacity="0.9"/>
                       </g>`;
            
            // Player name (offset to make room for icon)
            const playerColor = player.alive ? "#FFFFFF" : "#800080";
            status += `<text x="${startX + 28}" y="${currentY}" font-family="Arial" font-size="10" font-weight="bold" fill="${playerColor}" stroke="#000000" stroke-width="0.5">${turnPosition}. ${shipName}</text>`;
            currentY += 8;

            // Health bar background
            status += `<rect x="${startX + 8}" y="${currentY}" width="140" height="8" fill="#CCCCCC"/>`;

            const healthColor = player.alive ? 
                (healthPercent > 75 ? '#00FF00' : healthPercent > 50 ? '#FFFF00' : healthPercent > 25 ? '#FF8000' : '#FF0000') : 
                '#800080';
            const healthWidth = player.alive ? Math.max(1, (140 * healthPercent / 100)) : 140;
            status += `<rect x="${startX + 8}" y="${currentY}" width="${healthWidth}" height="8" fill="${healthColor}"/>`;

            // HP text - positioned inside the health bar
            const hpText = player.alive ? `${player.currentHealth}/${player.maxHealth}` : 'SUNK';
            let textColor = '#FFFFFF';
            if (player.alive) {
                if (healthPercent > 75) {
                    textColor = '#000000';
                } else if (healthPercent > 25) {
                    textColor = '#000000';
                } else {
                    textColor = '#FFFFFF';
                }
            }
            status += `<text x="${startX + 78}" y="${currentY + 7}" text-anchor="middle" font-family="Arial" font-size="8" fill="${textColor}" font-weight="bold">${hpText}</text>`;
            
            // Store health bar position for status icon positioning
            const healthBarEndX = startX + 148; // Health bar ends at startX + 8 + 140
            const healthBarBottomY = currentY + 8; // Bottom of health bar
            
            currentY += 15;

            // Carrier info section (if applicable)
            if (player.shipClass.includes('Carrier')) {
                const playerAircraft = Array.from(game.aircraft?.values() || []).filter(a => a.carrierID === player.id && a.alive);
                
                // Count by mission type
                const patrol = playerAircraft.filter(a => a.mission === 'patrol').length;
                const cap = playerAircraft.filter(a => a.mission === 'cap').length;
                const attack = playerAircraft.filter(a => a.mission === 'attack').length;
                const returning = playerAircraft.filter(a => a.mission === 'returning').length;
                
                // Aircraft status line with health info
                const damagedAircraft = playerAircraft.filter(a => a.health < a.maxHealth).length;
                const aircraftText = `✈️ ${playerAircraft.length} airborne | 🏠 ${player.hangar} hangar`;
                const damageText = damagedAircraft > 0 ? ` | 🩹 ${damagedAircraft} damaged` : '';
                
                status += `<text x="${startX + 10}" y="${currentY}" font-family="Arial" font-size="7" fill="#CCCCCC">${aircraftText}${damageText}</text>`;
                currentY += 10;
                
                // Mission breakdown if aircraft are deployed
                if (playerAircraft.length > 0) {
                    const missionText = `Patrol:${patrol} CAP:${cap} ATK:${attack} RTN:${returning}`;
                    status += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="6" fill="#AAAAAA">${missionText}</text>`;
                    currentY += 10;
                }
            }

            // Track where AA systems end for status icon positioning
            let aaSystemsEndX = startX + 150; // Default position if no AA systems
            
            if (player.aaSystems && player.aaSystems.length > 0) {
                // Show summary of all AA systems
                const totalAmmo = player.aaSystems.reduce((sum, aa) => sum + aa.ammo, 0);
                const maxAmmo = player.aaSystems.reduce((sum, aa) => sum + aa.maxAmmo, 0);
                const ammoPercent = maxAmmo > 0 ? (totalAmmo / maxAmmo) * 100 : 0;
                
                status += `<text x="${startX + 10}" y="${currentY}" font-family="Arial" font-size="7" fill="#CCCCCC">🎯 AA Systems: ${player.aaSystems.length}</text>`;
                currentY += 8;
                
                // Show each AA system briefly and track the longest line
                let longestAALineLength = 0;
                for (let i = 0; i < Math.min(player.aaSystems.length, 3); i++) {
                    const aa = player.aaSystems[i];
                    const systemAmmoPercent = (aa.ammo / aa.maxAmmo) * 100;
                    const systemColor = systemAmmoPercent > 50 ? '#00FF00' : systemAmmoPercent > 25 ? '#FFFF00' : '#FF0000';
                    
                    const aaText = `${aa.caliber} (${aa.mountType}): ${aa.ammo}/${aa.maxAmmo}`;
                    status += `<text x="${startX + 10}" y="${currentY}" font-family="Arial" font-size="6" fill="${systemColor}">${aaText}</text>`;
                    
                    // Track longest AA line for icon positioning
                    longestAALineLength = Math.max(longestAALineLength, aaText.length * 4); // Approximate pixel width
                    currentY += 8;
                }
                
                // Update AA systems end position based on longest line
                aaSystemsEndX = startX + 10 + longestAALineLength + 10;
                currentY += 5;
            }

            // *** ADD STATUS ICONS - TO THE RIGHT OF AA SYSTEMS, BELOW BOTTOM RIGHT OF HEALTH BAR ***

            // Position icons to the right of AA systems display, just below the health bar
            let statusIconX = Math.max(healthBarEndX + 5, aaSystemsEndX + 5); // Start after health bar or AA systems, whichever is further right
            const statusIconY = healthBarBottomY + 2; // Just below the health bar

            // Fire icon (14x14 pixels for better visibility)
            if (player.onFire && player.fireTimer > 0 && fireIcon) {
                status += `<image x="${statusIconX}" y="${statusIconY}" width="14" height="14" href="${fireIcon}" title="On Fire (${player.fireTimer} turns)"/>`;
                statusIconX += 16; // Move next icon position (14 + 2 spacing)
            }
            
            // Flood icon (14x14 pixels for better visibility)
            if (player.flooding && player.floodTimer > 0 && floodIcon) {
                status += `<image x="${statusIconX}" y="${statusIconY}" width="14" height="14" href="${floodIcon}" title="Flooding (${player.floodTimer} turns)"/>`;
            }

            currentY += 12;
        }
        
        return status;
    }

    // REPLACE your existing addAIStatusPanel method with this complete version:
    addAIStatusPanel(game, startX, startY) {
        const aliveEnemies = Array.from(game.enemies.values()).filter(e => e.alive);
        const deadEnemies = Array.from(game.enemies.values()).filter(e => !e.alive);
        const totalEnemies = aliveEnemies.length + deadEnemies.length;
        
        if (totalEnemies === 0) {
            return `<text x="${startX + 8}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">AI Forces</text>
                    <text x="${startX + 8}" y="${startY + 35}" font-family="Arial" font-size="10" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">No enemies</text>`;
        }

        let status = `<text x="${startX + 8}" y="${startY + 12}" font-family="Arial" font-size="14" font-weight="bold" fill="#FF6B6B" stroke="#000000" stroke-width="0.5" filter="url(#glow)">🎯 AI Forces</text>`;
        
        let currentY = startY + 35;
        const maxHeight = startY + 400;
        const maxEnemies = 15;
        
        // Load status icons once
        const fireIcon = this.loadStatusIconAsBase64('icons/Fire.png');
        const floodIcon = this.loadStatusIconAsBase64('icons/Flood.png');
        
        // Show alive enemies first, then dead ones
        const allEnemies = [...aliveEnemies, ...deadEnemies.slice(0, Math.max(0, maxEnemies - aliveEnemies.length))];
        
        let enemyCount = 0;
        for (const enemy of allEnemies) {
            if (currentY > maxHeight || enemyCount >= maxEnemies) break;
            enemyCount++;
            
            const healthPercent = enemy.alive ? (enemy.currentHealth / enemy.maxHealth) * 100 : 0;
            const aiName = enemy.customName || GameUtils.getShipClassAbbreviation(enemy.shipClass);
            
            // AI name/class - red for alive, black for dead
            const aiColor = enemy.alive ? "#FF0000" : "#000000";
            status += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" font-weight="bold" fill="${aiColor}" stroke="#FFFFFF" stroke-width="0.3">${aiName}</text>`;
            currentY += 8;

            // Health bar background
            status += `<rect x="${startX + 8}" y="${currentY}" width="140" height="8" fill="#CCCCCC"/>`;

            // Health bar fill
            const healthColor = enemy.alive ? 
                (healthPercent > 75 ? '#00FF00' : healthPercent > 50 ? '#FFFF00' : healthPercent > 25 ? '#FF8000' : '#FF0000') : 
                '#000000';
            const healthWidth = enemy.alive ? Math.max(1, (140 * healthPercent / 100)) : 140;
            status += `<rect x="${startX + 8}" y="${currentY}" width="${healthWidth}" height="8" fill="${healthColor}"/>`;

            // HP text
            const hpText = enemy.alive ? `${enemy.currentHealth}/${enemy.maxHealth}` : 'SUNK';
            let textColor = '#FFFFFF';
            if (enemy.alive) {
                if (healthPercent > 75) {
                    textColor = '#000000';
                } else if (healthPercent > 25) {
                    textColor = '#000000';
                } else {
                    textColor = '#FFFFFF';
                }
            }

            status += `<text x="${startX + 78}" y="${currentY + 7}" text-anchor="middle" font-family="Arial" font-size="8" fill="${textColor}" font-weight="bold">${hpText}</text>`;

            // Store health bar position for status icon positioning
            const healthBarEndX = startX + 148; // Health bar ends at startX + 8 + 140
            const healthBarBottomY = currentY + 8; // Bottom of health bar
            
            // Track where AA system display ends
            let aaSystemEndX = healthBarEndX;
            
            if (enemy.aaSystem && enemy.alive) {
                const aaAmmoPercent = (enemy.aaSystem.ammo / enemy.aaSystem.maxAmmo) * 100;
                const aaColor = aaAmmoPercent > 50 ? '#00FF00' : aaAmmoPercent > 25 ? '#FFFF00' : '#FF0000';
                
                const aaText = `🎯 ${enemy.aaSystem.caliber} AA: ${enemy.aaSystem.ammo}/${enemy.aaSystem.maxAmmo}`;
                status += `<text x="${startX + 8}" y="${currentY + 15}" font-family="Arial" font-size="6" fill="${aaColor}">${aaText}</text>`;
                
                // Update AA system end position
                aaSystemEndX = startX + 8 + (aaText.length * 4) + 10; // Approximate text width + padding
                currentY += 8;
            }

            // *** ADD STATUS ICONS FOR AI - TO THE RIGHT OF AA SYSTEMS, BELOW BOTTOM RIGHT OF HEALTH BAR ***
            
            // Position icons to the right of AA systems display, just below the health bar
            let statusIconX = Math.max(healthBarEndX + 5, aaSystemEndX + 5); // Start after health bar or AA systems, whichever is further right
            const statusIconY = healthBarBottomY + 2; // Just below the health bar
            
            // Fire icon for AI (14x14 pixels for better visibility)
            if (enemy.onFire && enemy.fireTimer > 0 && fireIcon) {
                status += `<image x="${statusIconX}" y="${statusIconY}" width="14" height="14" href="${fireIcon}" title="On Fire (${enemy.fireTimer} turns)"/>`;
                statusIconX += 16; // Move next icon position (14 + 2 spacing)
            }
            
            // Flood icon for AI (14x14 pixels for better visibility)
            if (enemy.flooding && enemy.floodTimer > 0 && floodIcon) {
                status += `<image x="${statusIconX}" y="${statusIconY}" width="14" height="14" href="${floodIcon}" title="Flooding (${enemy.floodTimer} turns)"/>`;
            }

            currentY += 30;
        }
        
        return status;
    }

    addObjectivePanel(game, startX, startY) {
        if (!game.objective) return '';
        
        // Title always stays at original position
        let panel = `<text x="${startX + 5}" y="${startY + 15}" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF" stroke="#000000" stroke-width="0.5">Objective: ${game.currentObjective?.name || 'Unknown'}</text>`;
        
        let currentY = startY + 35;
        
        // Count health bars to determine if we need to shift health bars right
        let healthBarCount = 0;
        
        switch (game.objective.type) {
            case 'convoy_escort':
                healthBarCount = Math.min(game.objective.convoyShips.length, 5);
                break;
            case 'capture_outpost':
                healthBarCount = 1;
                break;
            case 'convoy_interception':
                healthBarCount = Math.min(game.objective.convoyShips.filter(c => !c.captured && !c.escaped).length, 5);
                break;
            case 'defeat_boss':
                healthBarCount = 1;
                break;
        }
        
        // SHIFT RIGHT IF 3+ HEALTH BARS TO AVOID LEGEND OVERLAP
        const healthBarShift = healthBarCount >= 3 ? 200 : 0; // <-- AMOUNT TO SHIFT HEALTH BARS RIGHT
        
        switch (game.objective.type) {
            case 'resource_acquisition':
                // No health bars, use normal positioning
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFFFF">Progress: ${game.objective.turnsProgress}/${game.objective.turnsRequired} turns</text>`;
                currentY += 15;
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFFFF">Ships in zone: ${game.objective.playersInZone}</text>`;
                break;
                
            case 'convoy_escort':
                if (game.objective.destinationZone) {
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFF00">Destination: ${game.objective.destinationZone}</text>`;
                    currentY += 15;
                }
                
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFFFF">Convoy Ships:</text>`;
                currentY += 15;
                
                // Arrange convoys in 3x2 grid (3 columns, 2 rows)
                const convoyStartY = currentY;
                const columnWidth = 130; // <-- WIDTH BETWEEN COLUMNS (reduced for 3 columns)
                const rowHeight = 35; // <-- HEIGHT BETWEEN ROWS
                
                for (let i = 0; i < Math.min(game.objective.convoyShips.length, 6); i++) {
                    const convoy = game.objective.convoyShips[i];
                    const healthPercent = convoy.alive ? (convoy.health / convoy.maxHealth * 100) : 0;
                    const moveStatus = convoy.canMove ? '✓' : '✗';
                    
                    // Calculate position in grid (0-2 for column, 0-1 for row)
                    const column = i % 3; // <-- CHANGED TO 3 COLUMNS
                    const row = Math.floor(i / 3); // <-- CHANGED TO DIVIDE BY 3
                    
                    // Calculate X and Y positions
                    const convoyX = startX + 12 + (column * columnWidth);
                    const convoyY = convoyStartY + (row * rowHeight);
                    
                    // Ship name
                    const statusColor = convoy.alive ? '#00FF00' : '#808080';
                    panel += `<text x="${convoyX}" y="${convoyY}" font-family="Arial" font-size="8" fill="${statusColor}">${convoy.name} ${moveStatus}</text>`;
                    
                    // HP bar background
                    const barY = convoyY + 10;
                    panel += `<rect x="${convoyX}" y="${barY}" width="120" height="8" fill="#CCCCCC"/>`;
                    
                    // HP bar fill
                    const healthColor = convoy.alive ? 
                        (healthPercent > 50 ? '#00FF00' : healthPercent > 25 ? '#FFFF00' : '#FF0000') : 
                        '#808080';
                    const healthWidth = convoy.alive ? Math.max(1, (120 * healthPercent / 100)) : 120;
                    panel += `<rect x="${convoyX}" y="${barY}" width="${healthWidth}" height="8" fill="${healthColor}"/>`;
                    
                    // HP text
                    const hpText = convoy.alive ? `${convoy.health}/${convoy.maxHealth}` : 'SUNK';
                    let textColor = '#FFFFFF';
                    if (convoy.alive) {
                        if (healthPercent > 50) {
                            textColor = '#000000';
                        } else if (healthPercent > 25) {
                            textColor = '#000000';
                        } else {
                            textColor = '#FFFFFF';
                        }
                    }
                    panel += `<text x="${convoyX + 60}" y="${barY + 7}" text-anchor="middle" font-family="Arial" font-size="8" fill="${textColor}" font-weight="bold">${hpText}</text>`;
                }
                
                // Update currentY to after the grid (2 rows max)
                currentY = convoyStartY + (Math.ceil(Math.min(game.objective.convoyShips.length, 6) / 3) * rowHeight); // <-- CHANGED TO DIVIDE BY 3
                break;
                
            case 'capture_outpost':
                // Header uses normal position
                const outpostHealthPercent = game.objective.outpostHealth / game.objective.outpostMaxHealth * 100;
                const outpostColor = game.objective.outpostDestroyed ? '#FF0000' : '#FFD700';
                
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="${outpostColor}">Outpost:</text>`;
                currentY += 12;
                
                // HP bar uses normal position (only 1 bar, no need to shift)
                panel += `<rect x="${startX + 8}" y="${currentY}" width="140" height="10" fill="#CCCCCC"/>`;
                
                const outpostHealthColor = game.objective.outpostDestroyed ? '#000000' :
                    (outpostHealthPercent > 50 ? '#00FF00' : outpostHealthPercent > 25 ? '#FFFF00' : '#FF0000');
                const outpostHealthWidth = Math.max(1, (140 * outpostHealthPercent / 100));
                panel += `<rect x="${startX + 8}" y="${currentY}" width="${outpostHealthWidth}" height="10" fill="${outpostHealthColor}"/>`;
                
                let textColor = '#FFFFFF';
                if (!game.objective.outpostDestroyed) {
                    if (outpostHealthPercent > 50) {
                        textColor = '#000000';
                    } else if (outpostHealthPercent > 25) {
                        textColor = '#000000';
                    } else {
                        textColor = '#FFFFFF';
                    }
                }
                panel += `<text x="${startX + 78}" y="${currentY + 7}" text-anchor="middle" font-family="Arial" font-size="9" fill="${textColor}" font-weight="bold">${game.objective.outpostHealth}/${game.objective.outpostMaxHealth}</text>`;
                
                currentY += 15;
                
                if (game.objective.outpostDestroyed) {
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#00FF00">Capture: ${game.objective.captureProgress}/${game.objective.captureRequired}</text>`;
                }
                break;
                
            case 'convoy_interception':
                if (game.objective.interceptionZone) {
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFF00">Intercept at: ${game.objective.interceptionZone}</text>`;
                    currentY += 15;
                }
                
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFFFF">Enemy Convoy:</text>`;
                currentY += 15;
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFF00">Captured: ${game.objective.shipsCaptured}/${game.objective.requiredCaptures}</text>`;
                currentY += 15;
                
                // Arrange enemy convoys in 3x2 grid
                const enemyConvoyStartY = currentY;
                const enemyColumnWidth = 130; // <-- REDUCED FOR 3 COLUMNS
                const enemyRowHeight = 35;
                
                let gridIndex = 0;
                for (let i = 0; i < Math.min(game.objective.convoyShips.length, 6); i++) {
                    const convoy = game.objective.convoyShips[i];
                    const healthPercent = convoy.health / convoy.maxHealth * 100;
                    
                    let statusColor = '#FF0000';
                    let statusText = '';
                    
                    if (convoy.captured) {
                        statusColor = '#00FF00';
                        statusText = 'CAPTURED';
                        
                        // Just show text for captured/escaped ships
                        const column = gridIndex % 3; // <-- CHANGED TO 3
                        const row = Math.floor(gridIndex / 3); // <-- CHANGED TO 3
                        const convoyX = startX + 12 + (column * enemyColumnWidth);
                        const convoyY = enemyConvoyStartY + (row * enemyRowHeight);
                        
                        panel += `<text x="${convoyX}" y="${convoyY}" font-family="Arial" font-size="8" fill="${statusColor}">${convoy.name}: ${statusText}</text>`;
                        gridIndex++;
                        
                    } else if (convoy.escaped) {
                        statusColor = '#808080';
                        statusText = 'ESCAPED';
                        
                        // Just show text for captured/escaped ships
                        const column = gridIndex % 3; // <-- CHANGED TO 3
                        const row = Math.floor(gridIndex / 3); // <-- CHANGED TO 3
                        const convoyX = startX + 12 + (column * enemyColumnWidth);
                        const convoyY = enemyConvoyStartY + (row * enemyRowHeight);
                        
                        panel += `<text x="${convoyX}" y="${convoyY}" font-family="Arial" font-size="8" fill="${statusColor}">${convoy.name}: ${statusText}</text>`;
                        gridIndex++;
                        
                    } else {
                        // Show HP bar for active enemy convoy ships
                        const column = gridIndex % 3; // <-- CHANGED TO 3
                        const row = Math.floor(gridIndex / 3); // <-- CHANGED TO 3
                        const convoyX = startX + 12 + (column * enemyColumnWidth);
                        const convoyY = enemyConvoyStartY + (row * enemyRowHeight);
                        
                        panel += `<text x="${convoyX}" y="${convoyY}" font-family="Arial" font-size="8" fill="${statusColor}">${convoy.name}</text>`;
                        
                        // HP bar background
                        const barY = convoyY + 10;
                        panel += `<rect x="${convoyX}" y="${barY}" width="120" height="8" fill="#CCCCCC"/>`;
                        
                        const healthColor = healthPercent > 50 ? '#00FF00' : healthPercent > 25 ? '#FFFF00' : '#FF0000';
                        const healthWidth = Math.max(1, (120 * healthPercent / 100));
                        panel += `<rect x="${convoyX}" y="${barY}" width="${healthWidth}" height="8" fill="${healthColor}"/>`;

                        let textColor = '#FFFFFF';
                        if (healthPercent > 50) {
                            textColor = '#000000';
                        } else if (healthPercent > 25) {
                            textColor = '#000000';
                        } else {
                            textColor = '#FFFFFF';
                        }
                        panel += `<text x="${convoyX + 60}" y="${barY + 6}" text-anchor="middle" font-family="Arial" font-size="8" fill="${textColor}" font-weight="bold">${convoy.health}/${convoy.maxHealth}</text>`;
                        gridIndex++;
                    }
                }
                
                // Update currentY to after the grid
                currentY = enemyConvoyStartY + (Math.ceil(gridIndex / 3) * enemyRowHeight); // <-- CHANGED TO 3
                break;

            case 'salvage_supplies':
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFFFF">Salvage Operations:</text>`;
                currentY += 15;
                panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#FFFF00">Completed: ${game.objective.zonesCompleted}/3 zones</text>`;
                currentY += 15;
                
                // Show each destroyed auxiliary ship status
                for (const zone of game.objective.salvageZones) {
                    const statusColor = zone.captured ? '#00FF00' : zone.currentPlayer ? '#FFFF00' : '#FFFFFF';
                    const statusText = zone.captured ? 'SALVAGED' : zone.currentPlayer ? `SALVAGING (${zone.progress}/5)` : 'AVAILABLE';
                    const zoneLetter = zone.name.slice(-1); // Get A, B, C
                    
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="9" fill="${statusColor}">Zone ${zoneLetter} (${zone.location}): ${statusText}</text>`;
                    currentY += 12;
                    
                    // Show which wreck this is
                    if (zone.wreck) {
                        panel += `<text x="${startX + 12}" y="${currentY}" font-family="Arial" font-size="8" fill="#CCCCCC">${zone.wreck.customName}</text>`;
                        currentY += 10;
                    }
                }
                break;
                
            case 'defeat_boss':
                const boss = game.enemies.get(game.objective.bossId);
                if (boss && boss.alive) {
                    const healthPercent = (boss.currentHealth / boss.maxHealth * 100);
                    const bossColor = healthPercent > 50 ? '#FF0000' : healthPercent > 25 ? '#FF8000' : '#8B0000';
                    
                    // Boss name uses normal position
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="${bossColor}">${game.objective.bossName}</text>`;
                    currentY += 12;
                    
                    // Boss HP bar uses normal position (only 1 bar)
                    panel += `<rect x="${startX + 8}" y="${currentY}" width="160" height="12" fill="#CCCCCC"/>`;
                    
                    const bossHealthColor = healthPercent > 50 ? '#00FF00' : healthPercent > 25 ? '#FFFF00' : '#FF0000';
                    const bossHealthWidth = Math.max(1, (160 * healthPercent / 100));
                    panel += `<rect x="${startX + 8}" y="${currentY}" width="${bossHealthWidth}" height="12" fill="${bossHealthColor}"/>`;
                    
                    let textColor = '#FFFFFF';
                    if (healthPercent > 50) {
                        textColor = '#000000';
                    } else if (healthPercent > 25) {
                        textColor = '#000000';
                    } else {
                        textColor = '#FFFFFF';
                    }
                    panel += `<text x="${startX + 88}" y="${currentY + 9}" text-anchor="middle" font-family="Arial" font-size="10" fill="${textColor}" font-weight="bold">${boss.currentHealth}/${boss.maxHealth}</text>`;
                    
                    currentY += 18;
                    
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="8" fill="#FFFFFF">${game.objective.bossDescription}</text>`;
                } else {
                    panel += `<text x="${startX + 8}" y="${currentY}" font-family="Arial" font-size="10" fill="#00FF00">Boss Defeated!</text>`;
                }
                break;
        }
        
        return panel;
    }

    addCompactMapLegend(startX, startY) {
        let legend = `<rect x="${startX - 5}" y="${startY - 5}" width="420" height="95" fill="#0f172a" stroke="#FFFFFF" stroke-width="2" opacity="0.95" filter="url(#depthShadow)"/>`;
        legend += `<text x="${startX + 5}" y="${startY + 12}" font-size="14" font-weight="bold" fill="#FFFFFF" filter="url(#glow)">🗺️ TACTICAL LEGEND</text>`;

        const legendColumns = [
            // Column 1: Enhanced Terrain
            [
                { pattern: 'url(#deepWater)', text: 'Deep Ocean', icon: '🌊' },
                { pattern: 'url(#islandTexture)', text: 'Island/Land', icon: '🏝️' },
                { pattern: 'url(#shoalPattern)', text: 'Shoals/Spawn', icon: '⚠️' },
                { pattern: 'url(#reefPattern)', text: 'Coral Reef', icon: '🪸' }
            ],
            // Column 2: Player Ship Classes
            [
                { shipType: 'carrier', imageFolder: 'legend', text: 'Aircraft Carrier', icon: '⚓' },
                { shipType: 'battleship', imageFolder: 'legend', text: 'Battleship', icon: '⚔️' },
                { shipType: 'cruiser', imageFolder: 'legend', text: 'Cruiser', icon: '🚢' },
                { shipType: 'destroyer', imageFolder: 'legend', text: 'Destroyer', icon: '🛡️' }
            ],
            // Column 3: Additional Units & Enemy
            [
                { shipType: 'submarine', imageFolder: 'legend', text: 'Submarine', icon: '🟢' },
                { shipType: 'auxiliary', imageFolder: 'legend', text: 'Auxiliary', icon: '📦' },
                { shipType: 'destroyer', imageFolder: 'enemy', text: 'Enemy Forces', icon: '🎯' },
                { color: '#0000FF', text: 'Player Ships', icon: '✅' }
            ],
            // Column 4: Status & Effects
            [
                { color: '#800080', text: 'Sunk Ships', icon: '💀' },
                { color: '#FFD700', text: 'Weather Effects', icon: '🌤️' },
                { color: '#87CEEB', text: 'Depth Markers', icon: '📏' },
                { color: '#FFFFFF', text: 'Infrastructure', icon: '🏗️' }
            ]
        ];

        const columnWidth = 100;
        legendColumns.forEach((column, colIndex) => {
            const columnX = startX + 10 + (colIndex * columnWidth);

            column.forEach((item, itemIndex) => {
                const itemY = startY + 30 + (itemIndex * 16);

                if (item.pattern) {
                    legend += `<rect x="${columnX}" y="${itemY - 8}" width="12" height="12" fill="${item.pattern}" stroke="#FFFFFF" stroke-width="0.5"/>`;
                } else if (item.shipType && item.imageFolder) {
                    // Use actual icon images
                    const fs = require('fs');
                    const path = require('path');
                    const imagePath = path.join(__dirname, 'icons', item.imageFolder, `${item.shipType}.png`);

                    if (fs.existsSync(imagePath)) {
                        try {
                            const imageBuffer = fs.readFileSync(imagePath);
                            const base64Image = imageBuffer.toString('base64');
                            const mimeType = 'image/png';

                            legend += `<image x="${columnX}" y="${itemY - 8}" width="12" height="12" href="data:${mimeType};base64,${base64Image}" stroke="#FFFFFF" stroke-width="1"/>`;
                        } catch (error) {
                            console.log(`Error loading image ${imagePath}:`, error);
                            // Fallback to colored rectangle
                            let color = item.imageFolder === 'enemy' ? '#FF0000' : '#0066FF';
                            legend += `<rect x="${columnX}" y="${itemY - 8}" width="12" height="12" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;
                        }
                    } else {
                        console.log(`Image not found: ${imagePath}`);
                        // Fallback to colored rectangle
                        let color = item.imageFolder === 'enemy' ? '#FF0000' : '#0066FF';
                        legend += `<rect x="${columnX}" y="${itemY - 8}" width="12" height="12" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;
                    }
                } else if (item.shipType) {
                    // Fallback to SVG shapes for items without imageFolder
                    const shipIcon = this.getShipTypeSVG(item.shipType, columnX, itemY - 8);
                    legend += shipIcon;
                } else if (item.color) {
                    legend += `<rect x="${columnX}" y="${itemY - 8}" width="12" height="12" fill="${item.color}" stroke="#FFFFFF" stroke-width="0.5"/>`;
                }

                legend += `<text x="${columnX + 18}" y="${itemY}" font-size="9" fill="#FFFFFF" stroke="#000000" stroke-width="0.3">${item.icon || ''} ${item.text}</text>`;
            });
        });

        return legend;
    }

    getCachedLegendImage(imageFolder, shipType) {
        const cacheKey = `${imageFolder}/${shipType}`;

        // Return cached image path if available
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }

        try {
            const path = require('path');
            const fs = require('fs');
            const imagePath = path.join(__dirname, 'icons', imageFolder, `${shipType}.png`);

            if (fs.existsSync(imagePath)) {
                // Use file:// URL for better compatibility with Puppeteer
                const fileUrl = `file:///${imagePath.replace(/\\/g, '/')}`;

                // Cache the file URL
                this.imageCache.set(cacheKey, fileUrl);
                console.log(`Loaded legend image: ${fileUrl}`);
                return fileUrl;
            } else {
                console.log(`Legend image not found: ${imagePath}`);
                // Cache null to avoid repeated file system checks
                this.imageCache.set(cacheKey, null);
                return null;
            }
        } catch (error) {
            console.error(`Error loading legend image ${cacheKey}:`, error);
            // Cache null on error
            this.imageCache.set(cacheKey, null);
            return null;
        }
    }

    // Map ship classes to their corresponding image files
    getShipImageName(shipClass) {
        const shipClassLower = shipClass.toLowerCase();

        // Handle special cases where multiple classes use the same image
        if (shipClassLower.includes('cruiser')) {
            return 'cruiser'; // Both Light and Heavy Cruiser use cruiser.png
        }
        if (shipClassLower.includes('carrier')) {
            return 'carrier'; // Both Light and Aircraft Carrier use carrier.png
        }

        // Direct mappings
        const mappings = {
            'battleship': 'battleship',
            'destroyer': 'destroyer',
            'submarine': 'submarine',
            'auxiliary': 'auxiliary'
        };

        return mappings[shipClassLower] || 'destroyer'; // Default to destroyer
    }

    getEnhancedShipTypeSVG(shipType, x, y, imageFolder) {
        const size = 12;

        // Different colors for player vs enemy forces
        const isEnemy = imageFolder === 'enemy';
        const primaryColor = isEnemy ? '#FF4444' : '#4A90E2';

        // Simple approach - just colored rectangles with different patterns
        switch (shipType) {
            case 'carrier':
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>
                        <rect x="${x + 2}" y="${y + 2}" width="${size - 4}" height="2" fill="#FFFFFF"/>
                        <rect x="${x + 2}" y="${y + 8}" width="${size - 4}" height="2" fill="#FFFFFF"/>`;

            case 'battleship':
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>
                        <circle cx="${x + 3}" cy="${y + 3}" r="1.5" fill="#FFFFFF"/>
                        <circle cx="${x + 9}" cy="${y + 3}" r="1.5" fill="#FFFFFF"/>
                        <circle cx="${x + 6}" cy="${y + 9}" r="1.5" fill="#FFFFFF"/>`;

            case 'cruiser':
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>
                        <circle cx="${x + 6}" cy="${y + 3}" r="2" fill="#FFFFFF"/>
                        <rect x="${x + 3}" y="${y + 8}" width="6" height="2" fill="#FFFFFF"/>`;

            case 'destroyer':
                return `<rect x="${x + 1}" y="${y}" width="${size - 2}" height="${size}" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>
                        <circle cx="${x + 6}" cy="${y + 3}" r="1" fill="#FFFFFF"/>
                        <rect x="${x + 4}" y="${y + 8}" width="4" height="2" fill="#FFFFFF"/>`;

            case 'submarine':
                return `<ellipse cx="${x + 6}" cy="${y + 6}" rx="5" ry="3" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>
                        <rect x="${x + 4}" y="${y + 2}" width="4" height="2" fill="#FFFFFF"/>`;

            case 'auxiliary':
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>
                        <rect x="${x + 2}" y="${y + 2}" width="2" height="6" fill="#FFFFFF"/>
                        <rect x="${x + 5}" y="${y + 2}" width="2" height="6" fill="#FFFFFF"/>
                        <rect x="${x + 8}" y="${y + 2}" width="2" height="6" fill="#FFFFFF"/>`;

            default:
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1"/>`;
        }
    }

    getShipTypeSVG(shipType, x, y) {
        const size = 12;
        const centerX = x + size/2;
        const centerY = y + size/2;

        switch (shipType) {
            case 'carrier':
                // Aircraft carrier - large rectangle with flight deck
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#4A5568" stroke="#FFFFFF" stroke-width="0.5"/>
                        <rect x="${x + 1}" y="${y + 2}" width="${size - 2}" height="2" fill="#718096"/>
                        <rect x="${x + 1}" y="${y + 8}" width="${size - 2}" height="2" fill="#718096"/>`;

            case 'battleship':
                // Battleship - thick rectangle with gun turrets
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#2D3748" stroke="#FFFFFF" stroke-width="0.5"/>
                        <circle cx="${x + 3}" cy="${y + 3}" r="1.5" fill="#4A5568"/>
                        <circle cx="${x + 9}" cy="${y + 3}" r="1.5" fill="#4A5568"/>
                        <circle cx="${x + 6}" cy="${y + 9}" r="1.5" fill="#4A5568"/>`;

            case 'cruiser':
                // Cruiser - medium rectangle with single turret
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#4A5568" stroke="#FFFFFF" stroke-width="0.5"/>
                        <circle cx="${centerX}" cy="${y + 3}" r="1.5" fill="#2D3748"/>
                        <rect x="${x + 2}" y="${y + 7}" width="${size - 4}" height="2" fill="#2D3748"/>`;

            case 'destroyer':
                // Destroyer - sleek narrow rectangle
                return `<rect x="${x + 1}" y="${y}" width="${size - 2}" height="${size}" fill="#4A5568" stroke="#FFFFFF" stroke-width="0.5"/>
                        <circle cx="${centerX}" cy="${y + 3}" r="1" fill="#2D3748"/>
                        <rect x="${x + 3}" y="${y + 7}" width="${size - 6}" height="2" fill="#2D3748"/>`;

            case 'submarine':
                // Submarine - oval/ellipse shape
                return `<ellipse cx="${centerX}" cy="${centerY}" rx="${size/2 - 1}" ry="${size/3}" fill="#1A365D" stroke="#FFFFFF" stroke-width="0.5"/>
                        <circle cx="${centerX}" cy="${centerY - 1}" r="1" fill="#2D3748"/>`;

            case 'auxiliary':
                // Auxiliary - simple square with cross
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#4A5568" stroke="#FFFFFF" stroke-width="0.5"/>
                        <line x1="${x + 2}" y1="${centerY}" x2="${x + size - 2}" y2="${centerY}" stroke="#FFFFFF" stroke-width="1"/>
                        <line x1="${centerX}" y1="${y + 2}" x2="${centerX}" y2="${y + size - 2}" stroke="#FFFFFF" stroke-width="1"/>`;

            default:
                // Default - simple rectangle
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#4A5568" stroke="#FFFFFF" stroke-width="0.5"/>`;
        }
    }

    getTerrainColor(cellType) {
        switch (cellType) {
            case 'ocean': return '#87CEEB';
            case 'island': return '#228B22';
            case 'reef': return '#90EE90';
            case 'spawn': return '#D2B48C';
            case 'destination_zone': return '#87CEEB';
            case 'resource_zone': return '#FFD700';
            case 'resource_radius': return '#FFFF99';
            case 'outpost': return '#8B4513';
            case 'salvage_radius': return '#E0FFFF'; // Light cyan radius - keep this
            // Remove any 'salvage_zone' case if it exists
            default: return '#87CEEB';
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              MAP & MESSAGE CLEANUP                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    cleanupOldMapFile(game, currentFilepath) {
        if (!game.mapFiles || game.mapFiles.length === 0) {
            // Initialize mapFiles array if it doesn't exist
            game.mapFiles = [currentFilepath];
            return;
        }
        
        const fs = require('fs');
        
        // Clean up old map files (keep only the most recent one)
        for (const oldFilepath of game.mapFiles) {
            if (oldFilepath !== currentFilepath) {
                try {
                    if (fs.existsSync(oldFilepath)) {
                        fs.unlinkSync(oldFilepath);
                    }
                } catch (error) {
                    console.log(`❌ Failed to delete old map ${oldFilepath}:`, error.message);
                }
            }
        }
        
        // Update the mapFiles array to only contain the current file
        game.mapFiles = [currentFilepath];
    }

    cleanupGameMaps(game) {
        if (!game.mapFiles) return;
        
        const fs = require('fs');
        
        // Stop monitoring if it exists
        this.stopPlayerMonitoring(game);
        
        for (const filepath of game.mapFiles) {
            try {
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                    console.log(`🗑️ Cleaned up map file: ${filepath}`);
                }
            } catch (error) {
                console.log(`❌ Failed to delete map file ${filepath}:`, error.message);
            }
        }
        
        game.mapFiles = [];
    }

    async cleanupGameMessages(game, channel) {

        // Unpin and optionally delete the map message
        if (game.pinnedMapMessageId) {
            try {
                const mapMessage = await channel.messages.fetch(game.pinnedMapMessageId);

                if (mapMessage.pinned) {
                    await mapMessage.unpin();
                    console.log('📌 Unpinned map message');

                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Optionally delete the message (uncomment if you want to remove it entirely)
                // await mapMessage.delete();
                // console.log('🗑️ Deleted final map message');

            } catch (error) {
                if (error.code === 50013) {
                    console.log('⚠️ Missing permissions to unpin message');
                } else if (error.httpStatus === 429) {
                    console.log('⚠️ Rate limited while unpinning - will retry after delay');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    try {
                        await mapMessage.unpin();
                        console.log('📌 Successfully unpinned after retry');
                    } catch (retryError) {
                        console.log('⚠️ Could not unpin message after retry:', retryError.message);
                    }
                } else {
                    console.log('⚠️ Could not cleanup map message:', error.message);
                }
            }
        }

        // Clean up map files
        this.cleanupGameMaps(game);

        game.pinnedMapMessageId = null;
    }

    async resetPinnedMessage(game, channel) {
        
        // Clear the stored message ID
        const oldMessageId = game.pinnedMapMessageId;
        game.pinnedMapMessageId = null;
        
        // Try to unpin the old message if we know its ID
        if (oldMessageId) {
            try {
                const oldMessage = await channel.messages.fetch(oldMessageId);
                if (oldMessage.pinned) {
                    await oldMessage.unpin();
                    console.log('📌 Successfully unpinned old message');
                }
            } catch (error) {
                console.log('⚠️ Could not unpin old message - it may have been deleted');
            }
        }
        
        // Update the game display to create a fresh pinned message
        await this.updateGameDisplay(game, channel);
    }

    async isMessageValid(channel, messageId) {
        if (!messageId) return false;
        
        try {
            const message = await channel.messages.fetch(messageId);
            return !!message; // Returns true if message exists
        } catch (error) {
            return false;
        }
    }

    async validatePinnedMessage(game, channel) {
        if (!game.pinnedMapMessageId) {
            return false; // No pinned message set
        }
        
        try {
            const message = await channel.messages.fetch(game.pinnedMapMessageId);
            
            // Check if message is still pinned
            if (!message.pinned) {
                console.log('⚠️ Stored pinned message is no longer pinned');
                // Try to pin it again
                try {
                    await message.pin();
                    console.log('📌 Re-pinned the map message');
                    return true;
                } catch (pinError) {
                    console.log('❌ Could not re-pin message');
                    game.pinnedMapMessageId = null;
                    return false;
                }
            }
            
            return true; // Message exists and is pinned
            
        } catch (error) {
            console.log('❌ Pinned message no longer exists');
            game.pinnedMapMessageId = null;
            return false;
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              GAME EFFECTS & STATUS                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    processWeatherEvents(game) {
        const messages = [];
        let weatherChanged = false;
        
        // Check for new weather events
        if (Math.random() < 0.15) {
            const availableEvents = Array.from(this.weatherEvents.values());
            if (availableEvents.length > 0) {
                const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
                
                const oldWeather = game.weather;
                
                game.activeWeatherEvent = {
                    ...event,
                    turnsRemaining: event.duration
                };
                
                // Update weather based on the event
                if (event.name === 'Sudden Storm') {
                    game.weather = 'thunderstorm';
                    weatherChanged = true;
                }
                // Add other weather events that change conditions here
                
                if (weatherChanged) {
                    messages.push(`🌩️ Weather Event: ${event.name} - ${event.description}`);
                    messages.push(`🌤️ Weather changed from ${oldWeather} to ${game.weather}!`);
                } else {
                    messages.push(`🌩️ Weather Event: ${event.name} - ${event.description}`);
                }
            }
        }
        
        // Process active weather event
        if (game.activeWeatherEvent) {
            game.activeWeatherEvent.turnsRemaining--;
            
            if (game.activeWeatherEvent.turnsRemaining <= 0) {
                const oldWeather = game.weather;
                
                // Restore weather to normal when event ends
                if (game.activeWeatherEvent.name === 'Sudden Storm') {
                    game.weather = 'clear';
                    weatherChanged = true;
                }
                
                if (weatherChanged) {
                    messages.push(`🌤️ Weather event "${game.activeWeatherEvent.name}" has ended.`);
                    messages.push(`🌤️ Weather cleared from ${oldWeather} to ${game.weather}!`);
                } else {
                    messages.push(`🌤️ Weather event "${game.activeWeatherEvent.name}" has ended.`);
                }
                
                game.activeWeatherEvent = null;
            }
        }
        
        // Store if weather changed for map update
        game.weatherChangedThisTurn = weatherChanged;
        
        return messages;
    }

    checkFormationIntegrity(game) {
        return [];
    }

    processTurnEffects(player, game) {
        const messages = [];
        let totalDamage = 0;
        
        // Process fire damage
        if (player.onFire && player.fireTimer > 0) {
            const fireDamage = Math.min(Math.ceil(player.maxHealth * 0.02), 10);
            player.currentHealth = Math.max(0, player.currentHealth - fireDamage);
            totalDamage += fireDamage;
            player.fireTimer--;
            
            if (player.fireTimer <= 0) {
                player.onFire = false;
            }
        }
        
        // Process flooding damage
        if (player.flooding && player.floodTimer > 0) {
            const floodDamage = Math.min(Math.ceil(player.maxHealth * 0.05), 30);
            player.currentHealth = Math.max(0, player.currentHealth - floodDamage);
            totalDamage += floodDamage;
            player.floodTimer--;
            
            if (player.floodTimer <= 0) {
                player.flooding = false;
            }
        }
        
        // Process cooldowns
        if (player.damageControlCooldown > 0) {
            player.damageControlCooldown--;
        }
        
        if (totalDamage > 0) {
            messages.push(`🩸 ${player.shipClass} takes ${totalDamage} status effect damage!`);
        }
        
        if (player.currentHealth <= 0 && player.alive) {
            player.alive = false;
            messages.push(`💀 ${player.shipClass} has been destroyed!`);
            
            // Check if all players are now sunk
            if (this.checkAllPlayersSunk(game)) {
                // All players are sunk, trigger QRF backup
                setTimeout(async () => {
                    const channel = this.client.channels.cache.get(game.channelId);
                    if (channel) {
                        await this.sendQRFBackup(channel, game);
                    }
                }, 1000); // Small delay to let the death message send first
            }
        }
        
        return messages;
    }

    processAircraftRecovery(game) {
        return [];
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            QRF & MONITORING SYSTEM                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    checkAllPlayersSunk(game) {
        const alivePlayers = Array.from(game.players.values()).filter(player => player.alive);
        return alivePlayers.length === 0;
    }

    startPlayerMonitoring(game, channel) {
        // Clear any existing monitor
        if (game.playerMonitorInterval) {
            clearInterval(game.playerMonitorInterval);
        }
        
        // Check every 5 seconds if all players are dead
        game.playerMonitorInterval = setInterval(async () => {
            if (game.phase === 'battle') {
                if (this.checkAllPlayersSunk(game)) {
                    if (!game.qrfRequestSent) {
                        await this.sendQRFBackup(channel, game);
                        game.qrfRequestSent = true;
                    }
                } else {
                    // Reset QRF flag if players are alive again (reinforcements arrived)
                    if (game.qrfRequestSent) {
                        game.qrfRequestSent = false;
                    }
                }
            }
        }, 5000); // Check every 5 seconds
        
        console.log(`👁️ Player monitoring started for game ${game.channelId}`);
    }

    stopPlayerMonitoring(game) {
        if (game.playerMonitorInterval) {
            clearInterval(game.playerMonitorInterval);
            game.playerMonitorInterval = null;
            console.log(`👁️ Player monitoring stopped for game ${game.channelId}`);
        }
    }

    async sendQRFBackup(channel, game) {
        try {
            // Find QRF role in the guild
            const qrfRole = channel.guild.roles.cache.find(role => {
                const roleName = role.name.toLowerCase();
                return roleName.includes('qrf') || 
                       roleName.includes('quick reaction force') ||
                       roleName.includes('backup') ||
                       roleName.includes('reinforcement') ||
                       roleName.includes('emergency');
            });
            
            const backupEmbed = new EmbedBuilder()
                .setTitle('🚨 EMERGENCY: ALL PLAYERS SUNK!')
                .setDescription(`**IMMEDIATE BACKUP REQUESTED**\n\n` +
                               `All player ships have been destroyed in the current naval battle!\n` +
                               `QRF forces are needed to reinforce the operation.\n\n` +
                               `**Mission Status:** CRITICAL\n` +
                               `**Players KIA:** ${game.players.size}\n` +
                               `**Enemy Forces:** ${Array.from(game.enemies.values()).filter(e => e.alive).length} still active\n` +
                               `**Turn:** ${game.turnNumber}\n\n` +
                               `Use \`/join\` to deploy reinforcements immediately!\n` +
                               `⚠️ Mission will fail if no backup arrives soon!`)
                .setColor(0xFF0000)
                .setTimestamp();
            
            let content = '🚨 **EMERGENCY BACKUP REQUIRED** 🚨';
            if (qrfRole) {
                content = `🚨 <@&${qrfRole.id}> **EMERGENCY BACKUP REQUIRED** 🚨`;
            } else {
                console.log('⚠️ QRF role not found, sending general backup request');
            }
            
            await channel.send({
                content: content,
                embeds: [backupEmbed]
            });
            
            console.log(`🚨 QRF backup request sent for game ${game.channelId}`);
            
        } catch (error) {
            console.error('❌ Error sending QRF backup request:', error);
            // Fallback message without role ping
            await channel.send('🚨 **EMERGENCY: ALL PLAYERS SUNK!** Backup forces needed immediately! Use `/join` to reinforce the mission.');
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           WIN CONDITIONS & OBJETIVES                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    checkWinConditions(game) {
        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
        const aliveEnemies = Array.from(game.enemies.values()).filter(e => e.alive);
        
        // Standard win conditions
        if (game.objectiveComplete) {
            return true;
        }
        
        // If no players alive for too long, consider it a loss (optional timeout)
        if (alivePlayers.length === 0 && game.turnNumber > 100) { // After 100 turns of no players
            game.missionFailed = true;
            return true;
        }
        
        return false;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          SLASH COMMAND IMPLEMENTATIONS                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    async moveShip(interaction) {
       const game = this.games.get(interaction.channelId);
       const coordinate = interaction.options.getString('coordinate');

       if (!game) return interaction.reply({ content: 'No active game!', flags: MessageFlags.Ephemeral });
       const player = game.players.get(interaction.user.id);
       if (!player) return interaction.reply({ content: 'You are not in this game!', flags: MessageFlags.Ephemeral });

       player.position = coordinate;
       await interaction.reply({ content: `🚢 Moved to ${coordinate}!`, flags: MessageFlags.Ephemeral });
       await this.updateGameDisplay(game, interaction.channel);
    }

    async showHelp(interaction) {
        const helpMessage = `
**⚓ Naval Command - Help Guide**

**Game Setup Commands:**
\`/prepare\` - Set up a new naval battle
\`/join\` - Join an active game
\`/start\` - Start the battle
\`/end\` - End the current game (GM only)

**Gameplay Commands:**
\`/move <coordinate>\` - Move your ship
\`/stats\` - View your combat statistics
\`/profile\` - View your player profile
\`/equipment\` - View equipment details
\`/shop\` - Access the equipment shop
\`/equip\` - Equip purchased items

**Map & Environment:**
\`/weather <condition>\` - Change weather conditions (Staff only)
\`/clearpins\` - Clear map pins

**Advanced:**
\`/spawn\` - Spawn AI enemies (GM only)
\`/kill\` - Remove a unit (Staff only)
\`/newchar\` - Create a new character

For more detailed help, visit the documentation or ask a staff member!
`;
        await interaction.reply({ content: helpMessage, flags: MessageFlags.Ephemeral });
    }

    async showPlayerStats(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        // Load player data from guild-specific file
        const userData = this.characterManager.getGuildPlayerData(guildId, userId);

        // Check if user has any characters
        if (!userData || !userData.characters || Object.keys(userData.characters).length === 0) {
            const noCharEmbed = new EmbedBuilder()
                .setTitle('❌ No Characters Found')
                .setDescription('You don\'t have any registered characters yet.')
                .setColor(0xFF0000)
                .addFields({
                    name: '📝 How to Create a Character',
                    value: 'Please contact a **Game Master (GM)** to create your character.\n\n' +
                           'GMs can use the `/newchar` command to help you create a character.'
                })
                .setFooter({ text: 'Naval Command Character System' })
                .setTimestamp();

            return await interaction.reply({ embeds: [noCharEmbed], flags: MessageFlags.Ephemeral });
        }

        // Build embed with all characters
        const embeds = [];

        // Add field for each character
        for (const [characterName, character] of Object.entries(userData.characters)) {
            const isActive = userData.activeCharacter === characterName;

            // === BASIC INFO ===
            const shipClass = character.shipClass || 'Unknown Class';
            const level = character.level || 1;
            const xp = character.experience || 0;
            const currency = character.currency || 0;
            const battles = character.battles || 0;
            const victories = character.victories || 0;
            const winRate = battles > 0 ? ((victories / battles) * 100).toFixed(1) : '0.0';

            // === COMBAT STATS ===
            const hp = character.stats?.health || character.calculatedHP || character.hp || 0;
            const maxHp = character.maxHp || hp;
            const armor = character.stats?.armor || character.calculatedArmor || 0;
            const speed = character.stats?.speed || character.calculatedSpeed || 0;
            const speedKnots = character.speedKnots || 0;
            const tonnage = character.tonnage || 0;
            const range = character.stats?.range || 0;
            const accuracy = character.stats?.accuracy || character.stats?.baseAccuracy || 85;
            const evasion = character.stats?.evasion || character.calculatedEvasion?.evasionPercentage || 0;

            // === ARMOR BREAKDOWN ===
            const armorBelt = character.armorThickness?.belt || 0;
            const armorDeck = character.armorThickness?.deck || 0;
            const armorTurret = character.armorThickness?.turret || 0;

            // === HANGAR (for carriers) ===
            const hangar = character.hangar || 0;

            // === BUILD COMPREHENSIVE EMBED ===
            const embed = new EmbedBuilder()
                .setTitle(`${isActive ? '⭐' : '🚢'} ${characterName} ${isActive ? '(Active Character)' : ''}`)
                .setDescription(`**${shipClass}** | Level ${level}`)
                .setColor(isActive ? 0xFFD700 : 0x5865F2)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            // === SHIP SPECIFICATIONS ===
            embed.addFields({
                name: '⚓ Ship Specifications',
                value: `**Displacement:** ${tonnage.toLocaleString()} tons\n` +
                       `**Max Speed:** ${speedKnots} knots (${speed} cells/turn)\n` +
                       `**Combat Range:** ${range} cells` +
                       (hangar > 0 ? `\n**Hangar Capacity:** ${hangar} aircraft` : ''),
                inline: false
            });

            // === CORE COMBAT STATS ===
            const hpBar = this.createProgressBar(hp, maxHp, 10);
            embed.addFields({
                name: '⚔️ Combat Statistics',
                value: `**Health:** ${hp}/${maxHp} ❤️\n${hpBar}\n` +
                       `**Armor:** ${armor} 🛡️\n` +
                       `**Evasion:** ${evasion}% 💨\n` +
                       `**Accuracy:** ${accuracy}% 🎯`,
                inline: true
            });

            // === PROGRESSION ===
            embed.addFields({
                name: '📊 Progression',
                value: `**Level:** ${level} ⭐\n` +
                       `**Experience:** ${xp} XP\n` +
                       `**Currency:** ${currency} 💰\n` +
                       `**Battles:** ${battles}\n` +
                       `**Victories:** ${victories}\n` +
                       `**Win Rate:** ${winRate}%`,
                inline: true
            });

            // === ARMOR BREAKDOWN ===
            embed.addFields({
                name: '🛡️ Armor Profile',
                value: `**Belt:** ${armorBelt}mm\n` +
                       `**Deck:** ${armorDeck}mm\n` +
                       `**Turret:** ${armorTurret}mm\n` +
                       `**Effective Armor:** ${armor}`,
                inline: true
            });

            // === WEAPONS ===
            let mainGuns = [];
            let secondaryGuns = [];
            let tertiaryGuns = [];
            let torpedoes = [];

            if (character.weapons && typeof character.weapons === 'object') {
                for (const [weaponId, weapon] of Object.entries(character.weapons)) {
                    const weaponDisplay = weapon.name || weapon.caliber || 'Unknown';
                    const weaponDetails = `  └ ${weapon.damage || 0} dmg | ${weapon.range || 0} range | ${weapon.accuracy || 0}% accuracy`;

                    if (weapon.type === 'main') {
                        mainGuns.push(`${weaponDisplay}\n${weaponDetails}`);
                    } else if (weapon.type === 'secondary') {
                        secondaryGuns.push(`${weaponDisplay}\n${weaponDetails}`);
                    } else if (weapon.type === 'tertiary') {
                        tertiaryGuns.push(`${weaponDisplay}\n${weaponDetails}`);
                    } else if (weapon.type === 'torpedo') {
                        const torpedoDisplay = weapon.name || weapon.caliber || 'Unknown Torpedo';
                        const torpedoDetails = `  └ ${weapon.damage || 0} dmg | ${weapon.range || 0} range | ${weapon.penetration || 0} penetration | ${weapon.ammo || 0} torpedoes`;
                        torpedoes.push(`${torpedoDisplay}\n${torpedoDetails}`);
                    }
                }
            }

            if (mainGuns.length > 0) {
                embed.addFields({
                    name: '🔫 Main Armament',
                    value: mainGuns.join('\n') || 'None',
                    inline: false
                });
            }

            if (secondaryGuns.length > 0) {
                embed.addFields({
                    name: '🔫 Secondary Armament',
                    value: secondaryGuns.join('\n'),
                    inline: false
                });
            }

            if (tertiaryGuns.length > 0) {
                embed.addFields({
                    name: '🔫 Tertiary Armament',
                    value: tertiaryGuns.join('\n'),
                    inline: false
                });
            }

            if (torpedoes.length > 0) {
                embed.addFields({
                    name: '🚀 Torpedo Armament',
                    value: torpedoes.join('\n'),
                    inline: false
                });
            }

            // === AA SYSTEMS ===
            if (character.aaSystems && Array.isArray(character.aaSystems) && character.aaSystems.length > 0) {
                let aaText = '';
                for (const aa of character.aaSystems) {
                    if (aa && aa.name) {
                        const barrels = aa.barrels || 1;
                        aaText += `**${barrels}x ${aa.name}**\n`;
                        aaText += `  └ ${aa.damage || 0} dmg | ${aa.range || 0} range | ${aa.accuracy || 0}% accuracy\n`;
                    }
                }
                if (aaText) {
                    embed.addFields({
                        name: '🎯 Anti-Aircraft Systems',
                        value: aaText,
                        inline: false
                    });
                }
            }

            // === AIRCRAFT ===
            let aircraftText = '';

            // Check availableAircraft (Map)
            if (character.availableAircraft && character.availableAircraft.size > 0) {
                for (const [type, aircraft] of character.availableAircraft) {
                    if (aircraft) {
                        aircraftText += `**${aircraft.name || type}** (${aircraft.count || 0} available)\n`;
                        aircraftText += `  └ ${aircraft.damage || 0} dmg | ${aircraft.range || 0} range | ${aircraft.accuracy || 0}% acc | ${aircraft.health || 0} HP | ${aircraft.speed || 0} spd\n`;
                    }
                }
            }
            // Fallback to aircraft object
            else if (character.aircraft && Object.keys(character.aircraft).length > 0) {
                for (const [type, count] of Object.entries(character.aircraft)) {
                    if (count > 0) {
                        aircraftText += `**${type}:** ${count}\n`;
                    }
                }
            }

            if (aircraftText) {
                embed.addFields({
                    name: '✈️ Aircraft Complement',
                    value: aircraftText,
                    inline: false
                });
            }

            // === EQUIPMENT ===
            if (character.equipment && character.equipment.length > 0) {
                const equipmentList = character.equipment.map(e => `• ${e.name || e}`).join('\n');
                embed.addFields({
                    name: '🔧 Equipment',
                    value: equipmentList,
                    inline: false
                });
            }

            // === FOOTER ===
            embed.setFooter({
                text: `Character ${Object.keys(userData.characters).indexOf(characterName) + 1}/${Object.keys(userData.characters).length} | Max Characters: ${userData.maxCharacters || 2}`
            });

            embeds.push(embed);
        }

        await interaction.reply({ embeds: embeds, flags: MessageFlags.Ephemeral });
    }

    // Helper function to create progress bars
    createProgressBar(current, max, length = 10) {
        const percentage = Math.min(Math.max(current / max, 0), 1);
        const filled = Math.round(percentage * length);
        const empty = length - filled;
        return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${((percentage * 100).toFixed(1))}%`;
    }

    async showPlayerProfile(interaction) {
        const userId = interaction.user.id;
        const playerData = this.playerData.get(userId) || {};

        const profileMessage = `
**👤 Player Profile for ${interaction.user.username}**

**Battle Statistics:**
🏆 Total Battles: ${playerData.battlesPlayed || 0}
✅ Victories: ${playerData.wins || 0}
❌ Defeats: ${playerData.losses || 0}
📊 Win Rate: ${playerData.battlesPlayed > 0 ? Math.round((playerData.wins / playerData.battlesPlayed) * 100) : 0}%

**Combat Performance:**
💀 Total Kills: ${playerData.totalKills || 0}
🎯 Total Damage Dealt: ${playerData.totalDamage || 0}
🛡️ Total Damage Taken: ${playerData.damageTaken || 0}
⚔️ K/D Ratio: ${playerData.totalKills && playerData.losses ? (playerData.totalKills / Math.max(playerData.losses, 1)).toFixed(2) : 'N/A'}

**Progression:**
🎖️ Level: ${playerData.level || 1}
⭐ XP: ${playerData.xp || 0}
💰 Currency: ${playerData.currency || 0}

Use \`/stats\` during a battle to view your current ship statistics!
`;

        await interaction.reply({ content: profileMessage, flags: MessageFlags.Ephemeral });
    }

    async setWeather(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to set weather.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const game = this.games.get(interaction.channelId);
        if (!game) {
            return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });
        }

        const condition = interaction.options.getString('condition');
        const oldWeather = game.weather;
        game.weather = condition;

        // Build weather change message
        let weatherMessage = `🌤️ Weather changed from ${oldWeather.charAt(0).toUpperCase() + oldWeather.slice(1)} to ${condition.charAt(0).toUpperCase() + condition.slice(1)}!`;

        // Add visibility warning for reduced visibility weather
        if (condition === 'hurricane') {
            weatherMessage += `\n⚠️ **Severe conditions reduce visibility to 5 cells!** Enemy forces outside this range are hidden.`;
        } else if (condition === 'thunderstorm') {
            weatherMessage += `\n⚠️ **Heavy clouds reduce visibility to 10 cells!** Enemy forces outside this range are hidden.`;
        } else if (condition === 'fog') {
            weatherMessage += `\n⚠️ **Fog reduces visibility to 15 cells!** Enemy forces outside this range are hidden.`;
        } else if (oldWeather === 'thunderstorm' || oldWeather === 'hurricane' || oldWeather === 'fog') {
            weatherMessage += `\n✨ **Visibility restored!** All enemy forces are now visible.`;
        }

        await interaction.reply({
            content: weatherMessage
        });
        
        // Update the map immediately to show new weather
        try {
            await this.updateGameDisplay(game, interaction.channel);
        } catch (error) {
            console.error('❌ Error updating map after weather change:', error);
            await interaction.followUp({ 
                content: '⚠️ Weather changed successfully, but map update failed. Map will update on next turn.',
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    async endGame(interaction) {
        const game = this.games.get(interaction.channelId);
        if (!game || game.gmId !== interaction.user.id) {
            return interaction.reply({ content: 'Only the GM can end the game!', flags: MessageFlags.Ephemeral });
        }


        try {
            // === 1. CLEAR ALL TIMERS FIRST ===
            console.log('🛑 Ending game - cleaning up all systems...');

            // Clear player turn timers
            if (game.players) {
                for (const player of game.players.values()) {
                    if (player.turnTimeout) {
                        clearTimeout(player.turnTimeout);
                        player.turnTimeout = null;
                        console.log(`  ⏰ Cleared turn timer for player ${player.id}`);
                    }
                    
                    // Clear turn promises to prevent hanging
                    if (player.turnResolve) {
                        try {
                            player.turnResolve(); // Resolve any hanging promises
                        } catch (error) {
                            console.log(`  ⚠️ Error resolving turn promise for ${player.id}`);
                        }
                        player.turnResolve = null;
                    }
                    
                    // Clear turn states
                    player.hasTurnEnded = false;
                    player.isTurnActive = false;
                    player.waitingForInput = false;
                }
            }
            
            // Clear game-wide timers
            if (game.turnTimer) {
                clearTimeout(game.turnTimer);
                game.turnTimer = null;
                console.log('  ⏰ Cleared main turn timer');
            }
            
            if (game.battleTimer) {
                clearTimeout(game.battleTimer);
                game.battleTimer = null;
                console.log('  ⏰ Cleared battle timer');
            }
            
            if (game.updateInterval) {
                clearInterval(game.updateInterval);
                game.updateInterval = null;
                console.log('  ⏰ Cleared update interval');
            }

            // === 2. CLEAR QRF SYSTEM ===
            
            // Clear QRF timers
            if (game.qrfTimer) {
                clearTimeout(game.qrfTimer);
                game.qrfTimer = null;
                console.log('  🚨 Cleared QRF timer');
            }
            
            if (game.qrfReminderTimer) {
                clearTimeout(game.qrfReminderTimer);
                game.qrfReminderTimer = null;
                console.log('  🚨 Cleared QRF reminder timer');
            }
            
            // Clear QRF state flags
            if (game.qrfActive) {
                game.qrfActive = false;
                console.log('  🚨 Disabled QRF active state');
            }
            
            if (game.qrfPending) {
                game.qrfPending = false;
                console.log('  🚨 Disabled QRF pending state');
            }
            
            // Clear QRF message
            if (game.qrfMessageId) {
                try {
                    const qrfMessage = await interaction.channel.messages.fetch(game.qrfMessageId);
                    if (qrfMessage) {
                        await qrfMessage.delete();
                        console.log('  🗑️ Deleted QRF message');
                    }
                } catch (error) {
                    console.log('  ⚠️ Could not delete QRF message (may already be deleted)');
                }
                game.qrfMessageId = null;
            }
            
            // Clear QRF participants
            if (game.qrfParticipants) {
                game.qrfParticipants.clear();
                console.log('  👥 Cleared QRF participants');
            }

            // === 3. CLEAR BATTLE ANNOUNCEMENTS ===
            
            // Clear battle state flags
            if (game.battleInProgress) {
                game.battleInProgress = false;
            }
            
            if (game.announcingBattle) {
                game.announcingBattle = false;
                console.log('  📢 Disabled battle announcing flag');
            }
            
            // Clear battle announcement timers
            if (game.battleAnnouncementTimer) {
                clearTimeout(game.battleAnnouncementTimer);
                game.battleAnnouncementTimer = null;
                console.log('  ⏰ Cleared battle announcement timer');
            }
            
            if (game.battleNotificationInterval) {
                clearInterval(game.battleNotificationInterval);
                game.battleNotificationInterval = null;
                console.log('  ⏰ Cleared battle notification interval');
            }

            // === 4. UNPIN MAP MESSAGE ===
            if (game.pinnedMapMessageId) {
                try {
                    const mapMessage = await interaction.channel.messages.fetch(game.pinnedMapMessageId);
                    if (mapMessage.pinned) {
                        await mapMessage.unpin();
                        console.log('  📌 Unpinned map message');
                    }
                } catch (error) {
                    console.log('  ⚠️ Could not unpin map message');
                }
                game.pinnedMapMessageId = null;
            }

            // === 5. CLEAR TURN STATES ===
            game.currentTurn = null;
            game.currentPlayer = null;
            game.turnInProgress = false;

            // === 6. END THE GAME LOOP ===
            // This is CRITICAL - stops the main game loop from continuing
            game.phase = 'ended';
            console.log('  🛑 Set game.phase to "ended" - game loop will stop');

            // === 7. CALL EXISTING END BATTLE ===
            await this.endBattleInternal(game, interaction.channel);

            // === 8. REMOVE FROM GAMES COLLECTION ===
            this.games.delete(interaction.channelId);
            console.log(`  🗂️ Removed game from games collection: ${interaction.channelId}`);

            // Update status when sortie ends
            await this.statusManager.updateStatus();

            // === 9. FINAL SUCCESS MESSAGE ===
            await interaction.reply({
                content: '🏁 **Game ended successfully!** All systems cleaned up - no more notifications will be sent.',
                flags: MessageFlags.Ephemeral
            });
            
            
        } catch (error) {
            console.error('❌ Error during game cleanup:', error);
            await interaction.reply({
                content: '⚠️ Game ended but some cleanup errors occurred. If you continue receiving notifications, please contact an admin.',
                flags: MessageFlags.Ephemeral
            });
        }
    }


    async showShop(interaction) {
        await this.shopSystem.showShop(interaction);
    }

    async equipItem(interaction) {
        const itemName = interaction.options.getString('item');
        await interaction.reply({ content: `Equipped ${itemName}!`, flags: MessageFlags.Ephemeral });
    }

    async showStats(interaction) {
        const playerData = this.getGuildPlayerData(interaction.guildId, interaction.user.id);
        if (!playerData) {
            return interaction.reply({
                content: '❌ No player data found! Ask a GM to create your character using `/newchar`.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Create main stats embed
        const statsEmbed = new EmbedBuilder()
            .setTitle(`📊 Player Statistics - ${interaction.user.username}`)
            .setColor(0x0099FF)
            .setTimestamp();

        // Character Information Section
        if (playerData.characters && playerData.characters.size > 0) {
            const activeCharacterName = playerData.activeCharacter;
            const activeCharacter = activeCharacterName ? playerData.characters.get(activeCharacterName) : null;
            
            let characterInfo = `**Total Characters:** ${playerData.characters.size}/${playerData.maxCharacters || 1}\n`;
            
            if (activeCharacter) {
                characterInfo += `**Active Character:** ${activeCharacterName}\n`;
                characterInfo += `**Ship Class:** ${activeCharacter.shipClass || 'Unknown'}\n`;
                characterInfo += `**Level:** ${activeCharacter.level || 1}\n`;
                
                // Basic Stats
                if (activeCharacter.stats) {
                    characterInfo += `\n**Combat Stats:**\n`;
                    characterInfo += `• Health: ${activeCharacter.stats.health || 'N/A'}\n`;
                    characterInfo += `• Armor: ${activeCharacter.stats.armor || 'N/A'}\n`;
                    characterInfo += `• Speed: ${activeCharacter.stats.speed || 'N/A'}\n`;
                    characterInfo += `• Range: ${activeCharacter.stats.range || 'N/A'}\n`;
                    characterInfo += `• Accuracy: ${activeCharacter.stats.accuracy || 'N/A'}%\n`;
                    characterInfo += `• Evasion: ${activeCharacter.stats.evasion || 'N/A'}%\n`;
                }
                
                // Ship Specifications
                if (activeCharacter.tonnage || activeCharacter.speedKnots) {
                    characterInfo += `\n**Ship Specifications:**\n`;
                    if (activeCharacter.tonnage) characterInfo += `• Displacement: ${activeCharacter.tonnage.toLocaleString()} tons\n`;
                    if (activeCharacter.speedKnots) characterInfo += `• Max Speed: ${activeCharacter.speedKnots} knots\n`;
                    
                    // Calculate realistic evasion if we have the data
                    if (activeCharacter.speedKnots && activeCharacter.tonnage) {
                        const calculatedEvasion = GameUtils.calculateShipEvasion(activeCharacter.speedKnots, activeCharacter.tonnage);
                        characterInfo += `• Calculated Evasion: ${calculatedEvasion}%\n`;
                    }
                }
                
                // Weapons Information
                if (activeCharacter.weapons && Object.keys(activeCharacter.weapons).length > 0) {
                    characterInfo += `\n**Weapons:**\n`;
                    for (const [weaponKey, weaponStats] of Object.entries(activeCharacter.weapons)) {
                        // Use the weapon's actual name
                        const displayName = weaponStats.name || this.cleanWeaponName(weaponKey);
                        
                        characterInfo += `• **${displayName}:** `;
                        characterInfo += `${weaponStats.damage || 'N/A'} dmg, ${weaponStats.range || 'N/A'} range`;
                        
                        // Optionally add caliber info
                        if (weaponStats.caliber) {
                            characterInfo += ` (${weaponStats.caliber})`;
                        }
                        
                        characterInfo += `\n`;
                    }
                }
                
                // Aircraft Information (for carriers)
                if (activeCharacter.shipClass && activeCharacter.shipClass.includes('Carrier')) {
                    characterInfo += `\n**Aircraft Operations:**\n`;
                    characterInfo += `• Hangar Capacity: ${activeCharacter.hangar || 'N/A'} aircraft\n`;
                    
                    if (activeCharacter.availableAircraft && activeCharacter.availableAircraft.size > 0) {
                        characterInfo += `• Available Aircraft Types: ${activeCharacter.availableAircraft.size}\n`;
                        for (const [type, aircraftData] of activeCharacter.availableAircraft.entries()) {
                            const typeName = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                            characterInfo += `  - ${typeName}: ${aircraftData.name}\n`;
                        }
                    }
                    
                    if (activeCharacter.activeSquadrons && activeCharacter.activeSquadrons.size > 0) {
                        characterInfo += `• Active Squadrons: ${activeCharacter.activeSquadrons.size}\n`;
                    }
                }
                
                // AA Systems
                if (activeCharacter.aaSystems && activeCharacter.aaSystems.length > 0) {
                    characterInfo += `\n**Anti-Aircraft Systems:**\n`;
                    for (const aa of activeCharacter.aaSystems) {
                        characterInfo += `• **${aa.name}:** `;
                        characterInfo += `${aa.damage || 'N/A'} dmg, ${aa.range || 'N/A'} range`;
                        
                        // Add caliber and mount type
                        if (aa.caliber && aa.mountType) {
                            characterInfo += ` (${aa.caliber} ${aa.mountType})`;
                        } else if (aa.caliber) {
                            characterInfo += ` (${aa.caliber})`;
                        }
                        
                        characterInfo += `\n`;
                    }
                }
            } else {
                characterInfo += `**No active character selected**\n`;
            }
            
            statsEmbed.addFields([{
                name: '👤 Character Information',
                value: characterInfo,
                inline: false
            }]);
            
            // Show other characters if any
            if (playerData.characters.size > 1) {
                let otherCharacters = '';
                for (const [charName, charData] of playerData.characters.entries()) {
                    if (charName !== activeCharacterName) {
                        otherCharacters += `• **${charName}** - ${charData.shipClass || 'Unknown'} (Level ${charData.level || 1})\n`;
                    }
                }
                
                if (otherCharacters) {
                    statsEmbed.addFields([{
                        name: '🚢 Other Characters',
                        value: otherCharacters,
                        inline: false
                    }]);
                }
            }
        } else {
            // Legacy single character system
            let legacyInfo = '';
            legacyInfo += `**Level:** ${playerData.level || 1}\n`;
            legacyInfo += `**Experience:** ${playerData.experience || 0}\n`;
            legacyInfo += `**Currency:** ${playerData.currency || 0}\n`;
            legacyInfo += `**Battles:** ${playerData.battles || 0}\n`;
            legacyInfo += `**Victories:** ${playerData.victories || 0}\n`;
            
            if (playerData.stats) {
                legacyInfo += `\n**Stats:**\n`;
                legacyInfo += `• Health: ${playerData.stats.health || 'N/A'}\n`;
                legacyInfo += `• Armor: ${playerData.stats.armor || 'N/A'}\n`;
                legacyInfo += `• Speed: ${playerData.stats.speed || 'N/A'}\n`;
                legacyInfo += `• Range: ${playerData.stats.range || 'N/A'}\n`;
                legacyInfo += `• Accuracy: ${playerData.stats.accuracy || 'N/A'}%\n`;
                legacyInfo += `• Evasion: ${playerData.stats.evasion || 'N/A'}%\n`;
            }
            
            statsEmbed.addFields([{
                name: '📊 Player Stats',
                value: legacyInfo,
                inline: false
            }]);
        }
        
        // Equipment Mastery Section
        if (playerData.equipmentLevels && Object.keys(playerData.equipmentLevels).length > 0) {
            let equipmentInfo = '';
            let equipmentCount = 0;
            
            for (const [equipmentId, equipment] of Object.entries(playerData.equipmentLevels)) {
                if (equipmentCount >= 10) { // Limit to prevent embed from being too long
                    equipmentInfo += `... and ${Object.keys(playerData.equipmentLevels).length - 10} more\n`;
                    break;
                }
                
                const effectiveness = this.levelingSystem ? 
                    this.levelingSystem.calculateEquipmentEffectiveness(equipment.baseValue || 0, equipment.level) : 
                    null;
                
                equipmentInfo += `• **${equipment.name}** - Level ${equipment.level}\n`;
                equipmentInfo += `  XP: ${equipment.experience}/${equipment.experienceToNext || 'Max'}\n`;
                
                if (effectiveness) {
                    equipmentInfo += `  Effectiveness: ${effectiveness.finalValue} (${effectiveness.bonusPercent}% bonus)\n`;
                }
                
                equipmentCount++;
            }
            
            if (equipmentInfo) {
                statsEmbed.addFields([{
                    name: '⚔️ Equipment Mastery',
                    value: equipmentInfo,
                    inline: false
                }]);
            }
        }
        
        // Battle Statistics
        let battleStats = '';
        const totalBattles = playerData.battles || 0;
        const victories = playerData.victories || 0;
        const winRate = totalBattles > 0 ? ((victories / totalBattles) * 100).toFixed(1) : '0.0';
        
        battleStats += `**Battles Fought:** ${totalBattles}\n`;
        battleStats += `**Victories:** ${victories}\n`;
        battleStats += `**Win Rate:** ${winRate}%\n`;
        battleStats += `**Currency:** ${playerData.currency || 0} credits\n`;
        
        if (playerData.experience !== undefined) {
            battleStats += `**Total Experience:** ${playerData.experience}\n`;
        }
        
        statsEmbed.addFields([{
            name: '🏆 Battle Record',
            value: battleStats,
            inline: false
        }]);
        
        // Additional Information
        let additionalInfo = '';
        if (playerData.skills && playerData.skills.length > 0) {
            additionalInfo += `**Skills:** ${playerData.skills.join(', ')}\n`;
        }
        
        if (playerData.shipClass) {
            additionalInfo += `**Ship Class:** ${playerData.shipClass}\n`;
        }
        
        if (playerData.id) {
            additionalInfo += `**Player ID:** ${playerData.id}\n`;
        }
        
        if (additionalInfo) {
            statsEmbed.addFields([{
                name: 'ℹ️ Additional Info',
                value: additionalInfo,
                inline: false
            }]);
        }
        
        // Footer with last updated info
        statsEmbed.setFooter({ 
            text: `Use /equipment for detailed equipment stats • Player since registration` 
        });
        
        await interaction.reply({ embeds: [statsEmbed], flags: MessageFlags.Ephemeral });
    }

    async clearPins(interaction) {
       try {
           // Defer reply immediately to avoid timeout
           await interaction.deferReply({ flags: MessageFlags.Ephemeral });

           const channel = interaction.channel;
           const pinnedMessages = await channel.messages.fetchPinned();
           const totalPins = pinnedMessages.size;

           if (totalPins === 0) {
               return await interaction.editReply({ content: '📌 No pinned messages to clear.' });
           }

           await interaction.editReply({ content: `🧹 Clearing ${totalPins} pinned messages... Please wait.` });

           let unpinned = 0;
           let failed = 0;

           for (const message of pinnedMessages.values()) {
               try {
                   await message.unpin();
                   unpinned++;
                   console.log(`📌 Unpinned message ${unpinned}/${totalPins}`);

                   // Update progress every 3 messages
                   if (unpinned % 3 === 0 || unpinned === totalPins) {
                       try {
                           await interaction.editReply({ content: `🧹 Clearing pins... ${unpinned}/${totalPins} completed` });
                       } catch (editError) {
                           // Ignore edit errors
                       }
                   }

                   // Add delay between unpins to avoid rate limiting (Discord allows ~5 unpins per 5 seconds)
                   if (unpinned < totalPins) {
                       await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay
                   }
               } catch (error) {
                   failed++;
                   if (error.httpStatus === 429) {
                       console.log(`⚠️ Rate limited at message ${unpinned + failed}/${totalPins} - waiting 3 seconds...`);
                       await new Promise(resolve => setTimeout(resolve, 3000));
                       // Retry once
                       try {
                           await message.unpin();
                           unpinned++;
                       } catch (retryError) {
                           console.log('⚠️ Failed to unpin after retry:', retryError.message);
                       }
                   } else {
                       console.log(`⚠️ Failed to unpin message:`, error.message);
                   }
               }
           }

           await interaction.editReply({ content: `✅ Cleared ${unpinned} pinned messages.${failed > 0 ? ` (${failed} failed)` : ''}` });
       } catch (error) {
           console.error('Error in clearPins:', error);
           try {
               await interaction.editReply({ content: 'Failed to clear pins.' });
           } catch {
               // If we can't edit, the interaction may have already expired
               console.log('⚠️ Could not send error message - interaction expired');
           }
       }
    }

    async killTarget(interaction) {
       // Check staff permissions
       if (!this.hasStaffPermission(interaction.member)) {
           return interaction.reply({
               content: '❌ You need staff permissions to use kill command.\n\n' +
                        'Contact an administrator to:\n' +
                        '• Give you the configured staff role, or\n' +
                        '• Give you Manage Messages permission',
               flags: MessageFlags.Ephemeral
           });
       }

       const game = this.games.get(interaction.channelId);
       if (!game) return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });

       const targetString = interaction.options.getString('target');
       const target = game.findTarget(targetString);
       if (!target) return interaction.reply({ content: 'Target not found!', flags: MessageFlags.Ephemeral });

       target.currentHealth = 0;
       target.alive = false;
       await interaction.reply({ content: `💀 ${target.shipClass} eliminated.` });
       await this.updateGameDisplay(game, interaction.channel);
    }

    async createPlayers(interaction) {
        await this.playerCreation.createPlayers(interaction);
    }

    async showStatsCreationForm(interaction, playerData) {
        const modal = new ModalBuilder()
            .setCustomId(`create_stats_${interaction.user.id}`)
            .setTitle(`Stats for ${playerData.username}`);

        // Health input
        const healthInput = new TextInputBuilder()
            .setCustomId('health')
            .setLabel('Health (50-200)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('100')
            .setRequired(true)
            .setMaxLength(3);

        // Armor input
        const armorInput = new TextInputBuilder()
            .setCustomId('armor')
            .setLabel('Armor (10-100)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('50')
            .setRequired(true)
            .setMaxLength(3);

        // Speed input
        const speedInput = new TextInputBuilder()
            .setCustomId('speed')
            .setLabel('Speed (1-10)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('3')
            .setRequired(true)
            .setMaxLength(2);

        // Range and Accuracy input (combined)
        const rangeAccuracyInput = new TextInputBuilder()
            .setCustomId('range_accuracy')
            .setLabel('Range,Accuracy (e.g., 5,70)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('5,70')
            .setRequired(true)
            .setMaxLength(10);

        // Evasion and Battles input (combined)
        const evasionBattlesInput = new TextInputBuilder()
            .setCustomId('evasion_battles')
            .setLabel('Evasion,Battles,Victories (e.g., 20,0,0)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('20,0,0')
            .setRequired(true)
            .setMaxLength(15);

        const firstActionRow = new ActionRowBuilder().addComponents(healthInput);
        const secondActionRow = new ActionRowBuilder().addComponents(armorInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(speedInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(rangeAccuracyInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(evasionBattlesInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

        // Store the basic player data temporarily
        if (!this.tempPlayerData) this.tempPlayerData = new Map();
        this.tempPlayerData.set(interaction.user.id, playerData);

        await interaction.showModal(modal);
    }

    async setFire(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to use fire command.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const game = this.games.get(interaction.channelId);
        if (!game) {
            return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });
        }

        const targetString = interaction.options.getString('target');
        const target = game.findTarget(targetString);
        if (!target) {
            return interaction.reply({ content: 'Target not found!', flags: MessageFlags.Ephemeral });
        }

        // Apply fire status
        target.onFire = true;
        target.fireTimer = 10;
        
        // Get target display name
        const targetName = target.customName || target.shipClass || target.displayName || target.username || 'Unknown';
        
        await interaction.reply({ content: `🔥 ${targetName} is on fire!` });
        
        // Update the map immediately to show the fire icon
        try {
            console.log('🔥 Updating map after setting fire status...');
            await this.updateGameDisplay(game, interaction.channel);
        } catch (error) {
            console.error('❌ Error updating map after fire status:', error);
            // Don't fail the command if map update fails
            await interaction.followUp({ 
                content: '⚠️ Fire applied successfully, but map update failed. Map will update on next turn.',
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    async setFlood(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to use flood command.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const game = this.games.get(interaction.channelId);
        if (!game) {
            return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });
        }

        const targetString = interaction.options.getString('target');
        const target = game.findTarget(targetString);
        if (!target) {
            return interaction.reply({ content: 'Target not found!', flags: MessageFlags.Ephemeral });
        }

        // Apply flood status
        target.flooding = true;
        target.floodTimer = 10;
        
        // Get target display name
        const targetName = target.customName || target.shipClass || target.displayName || target.username || 'Unknown';
        
        await interaction.reply({ content: `🌊 ${targetName} is flooding!` });
        
        // Update the map immediately to show the flood icon
        try {
            await this.updateGameDisplay(game, interaction.channel);
        } catch (error) {
            console.error('❌ Error updating map after flood status:', error);
            // Don't fail the command if map update fails
            await interaction.followUp({ 
                content: '⚠️ Flood applied successfully, but map update failed. Map will update on next turn.',
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    async spawnCommand(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to spawn AI units.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        // Call the existing spawnAI method
        await this.spawnAI(interaction);
    }

    async endBattle(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to end battles.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const game = this.games.get(interaction.channelId);
        if (!game) {
            return interaction.reply({
                content: 'No active game in this channel!',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({ content: '⚔️ Ending battle...', flags: MessageFlags.Ephemeral });

        // Call the existing endBattle method with game and channel
        await this.endBattleInternal(game, interaction.channel);
    }

    async setRoleplayMode(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to set roleplay mode.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const enabled = interaction.options.getBoolean('enabled');
        const timeoutString = interaction.options.getString('timeout');

        // Parse timeout if provided, otherwise use default (5 minutes)
        let timeoutMs = 300000; // Default: 5 minutes
        if (timeoutString) {
            const parsed = this.parseTimeString(timeoutString);
            if (parsed === null) {
                return interaction.reply({
                    content: '❌ Invalid timeout format! Use formats like: 5m, 2h, 30s\n\n' +
                             '**Examples:**\n' +
                             '• `5m` = 5 minutes\n' +
                             '• `2h` = 2 hours\n' +
                             '• `30s` = 30 seconds',
                    flags: MessageFlags.Ephemeral
                });
            }
            timeoutMs = parsed;
        }

        const game = this.games.get(interaction.channelId);

        if (game) {
            // Set for active game
            game.roleplayMode = enabled;
            game.roleplayTimeout = timeoutMs;
            console.log(`🎭 Set roleplay timeout for active game: ${timeoutMs}ms (${this.formatTimeout(timeoutMs)})`);

            const status = enabled ? 'enabled' : 'disabled';
            const timeoutDescription = enabled ? `\n⏱️ Timeout: ${this.formatTimeout(timeoutMs)}` : '';
            const description = enabled
                ? `Players will wait for roleplay/story beats during battle.${timeoutDescription}`
                : 'Battle will proceed at normal pace without roleplay pauses.';

            await interaction.reply({
                content: `🎭 Roleplay mode ${status} for this game!\n${description}`
                
            });
        } else {
            // Set global default for future games
            this.roleplayMode = enabled;
            this.roleplayTimeout = timeoutMs;
            console.log(`🎭 Set global default roleplay timeout: ${timeoutMs}ms (${this.formatTimeout(timeoutMs)})`);

            const status = enabled ? 'enabled' : 'disabled';
            const timeoutDescription = enabled ? `\n⏱️ Default timeout: ${this.formatTimeout(timeoutMs)}` : '';
            const description = enabled
                ? `New games will wait for roleplay/story beats during battle.${timeoutDescription}`
                : 'New games will proceed at normal pace without roleplay pauses.';

            await interaction.reply({
                content: `🎭 Default roleplay mode ${status}!\n${description}\n\n💡 *No active game in this channel. This setting will apply to new games.*`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async purgeMessages(interaction) {
        // Check staff permissions
        if (!this.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to purge messages.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const amount = interaction.options.getInteger('amount');

        // Defer the reply since bulk delete might take a moment
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Fetch messages (amount + 1 to account for the command message itself if needed)
            const messages = await interaction.channel.messages.fetch({ limit: amount });

            // Bulk delete messages
            // Note: Discord only allows bulk delete of messages younger than 14 days
            const deleted = await interaction.channel.bulkDelete(messages, true);

            await interaction.editReply({
                content: `🗑️ Successfully deleted ${deleted.size} message(s)!`
            });

            console.log(`✅ Purged ${deleted.size} messages in ${interaction.channel.name} by ${interaction.user.tag}`);

        } catch (error) {
            console.error('Error purging messages:', error);

            let errorMessage = '❌ Failed to purge messages.';

            if (error.code === 50013) {
                errorMessage = '❌ I don\'t have permission to delete messages in this channel!';
            } else if (error.message.includes('bulk delete')) {
                errorMessage = '❌ Cannot bulk delete messages older than 14 days. Try a smaller number of recent messages.';
            }

            await interaction.editReply({ content: errorMessage });
        }
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                UTILITY FUNCTIONS                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    generateExtendedCoordinate(x, y) {
        let columnLabel = '';
        let tempX = x;
        
        if (tempX < 26) {
            // A-Z (0-25)
            columnLabel = String.fromCharCode(65 + tempX);
        } else if (tempX < 702) {
            // AA-ZZ (26-701)
            tempX -= 26;
            const firstLetter = String.fromCharCode(65 + Math.floor(tempX / 26));
            const secondLetter = String.fromCharCode(65 + (tempX % 26));
            columnLabel = firstLetter + secondLetter;
        } else {
            // AAA and beyond (702+)
            tempX -= 702;
            const firstLetter = String.fromCharCode(65 + Math.floor(tempX / 676));
            tempX = tempX % 676;
            const secondLetter = String.fromCharCode(65 + Math.floor(tempX / 26));
            const thirdLetter = String.fromCharCode(65 + (tempX % 26));
            columnLabel = firstLetter + secondLetter + thirdLetter;
        }
        
        return columnLabel + y;
    }

    getShipClassAbbreviation(shipClass) {
        // Handle various ship class formats
        const lowerClass = shipClass.toLowerCase();
        
        if (lowerClass.includes('battleship') || lowerClass.includes('bb')) return 'BB';
        if (lowerClass.includes('aircraft carrier') || lowerClass.includes('carrier') || lowerClass.includes('cv')) return 'CV';
        if (lowerClass.includes('heavy cruiser') || lowerClass.includes('ca')) return 'CA';
        if (lowerClass.includes('light cruiser') || lowerClass.includes('cl')) return 'CL';
        if (lowerClass.includes('destroyer') || lowerClass.includes('dd')) return 'DD';
        if (lowerClass.includes('submarine') || lowerClass.includes('ss')) return 'SS';
        if (lowerClass.includes('auxiliary') || lowerClass.includes('ax')) return 'AX';
        
        // For AI custom names, try to extract from the name itself
        if (lowerClass.includes('destroyer') || lowerClass.includes('dd')) return 'DD';
        if (lowerClass.includes('cruiser')) {
            if (lowerClass.includes('heavy') || lowerClass.includes('ca')) return 'CA';
            if (lowerClass.includes('light') || lowerClass.includes('cl')) return 'CL';
            return 'CA'; // Default to heavy cruiser
        }
        
        return 'UN'; // Unknown
    }

    getEntityAtPosition(game, coord) {
        // Check players first
        for (const player of game.players.values()) {
            if (player.position === coord && player.alive) {
                return { type: 'player', data: player };
            }
        }
        
        // Check destroyed players
        for (const player of game.players.values()) {
            if (player.position === coord && !player.alive) {
                return { type: 'destroyed_player', data: player };
            }
        }
        
        // Check enemies
        for (const enemy of game.enemies.values()) {
            if (enemy.position === coord && enemy.alive) {
                return { type: 'enemy', data: enemy };
            }
        }
        
        // Check destroyed enemies
        for (const enemy of game.enemies.values()) {
            if (enemy.position === coord && !enemy.alive) {
                return { type: 'destroyed_enemy', data: enemy };
            }
        }
        
        // Check aircraft
        for (const aircraft of game.aircraft?.values() || []) {
            if (aircraft.position === coord && aircraft.alive) {
                return { type: 'aircraft', data: aircraft };
            }
        }

        // Check civilian boats
        for (const [id, boat] of game.civilianBoats || new Map()) {
            if (boat.position === coord && boat.alive) {
                return { type: 'civilian_boat', data: boat };
            }
        }

        // Check civilian aircraft
        for (const [id, aircraft] of game.civilianAircraft || new Map()) {
            if (aircraft.position === coord && aircraft.alive) {
                return { type: 'civilian_aircraft', data: aircraft };
            }
        }

        // Check mines
        for (const mine of game.mines || []) {
            if (mine.position === coord) {
                return { type: 'mine', data: mine };
            }
        }
        
        return null;
    }

    shouldUpdateMapForStatusChange(oldStatus, newStatus) {
        const fireChanged = (oldStatus.onFire !== newStatus.onFire) || 
                           (oldStatus.fireTimer > 0) !== (newStatus.fireTimer > 0);
        const floodChanged = (oldStatus.flooding !== newStatus.flooding) || 
                            (oldStatus.floodTimer > 0) !== (newStatus.floodTimer > 0);
        
        return fireChanged || floodChanged;
    }

    getSpawnLocation(game, location) {
        let attempts = 0;
        let spawnPosition = null;
        
        while (attempts < 50 && !spawnPosition) {
            let x, y;
            
            switch (location) {
                case 'enemy_side':
                    x = 70 + Math.floor(Math.random() * 30); // Right side
                    y = Math.floor(Math.random() * 100) + 1;
                    break;
                case 'player_side':
                    x = Math.floor(Math.random() * 20); // Left side
                    y = Math.floor(Math.random() * 100) + 1;
                    break;
                case 'north':
                    x = Math.floor(Math.random() * 100);
                    y = Math.floor(Math.random() * 25) + 1; // Top quarter
                    break;
                case 'south':
                    x = Math.floor(Math.random() * 100);
                    y = Math.floor(Math.random() * 25) + 76; // Bottom quarter
                    break;
                case 'center':
                    x = 35 + Math.floor(Math.random() * 30); // Center area
                    y = 35 + Math.floor(Math.random() * 30);
                    break;
                case 'random':
                default:
                    x = Math.floor(Math.random() * 100);
                    y = Math.floor(Math.random() * 100) + 1;
                    break;
            }
            
            const testPosition = game.generateExtendedCoordinate(x, y);
            const cell = game.getMapCell(testPosition);
            
            // Check if position is valid (ocean or reef, not occupied)
            if (cell && (cell.type === 'ocean' || cell.type === 'reef') && !cell.occupant) {
                // Double-check no entity is already there
                let occupied = false;
                for (const player of game.players.values()) {
                    if (player.position === testPosition) {
                        occupied = true;
                        break;
                    }
                }
                for (const enemy of game.enemies.values()) {
                    if (enemy.position === testPosition) {
                        occupied = true;
                        break;
                    }
                }
                
                if (!occupied) {
                    spawnPosition = testPosition;
                }
            }
            
            attempts++;
        }
        
        return spawnPosition || game.getRandomAISpawnPosition(); // Fallback
    }

    getLocationDisplayName(location) {
        const names = {
            'random': 'Random Location',
            'enemy_side': 'Enemy Side (Right)',
            'player_side': 'Player Side (Left)',
            'north': 'Northern Waters',
            'south': 'Southern Waters',
            'center': 'Central Area'
        };
        return names[location] || 'Unknown';
    }

    getShipDisplayName(shipType) {
        const names = {
            'destroyer': '🚢 Destroyer',
            'light_cruiser': '🚢 Light Cruiser',
            'cruiser': '🚢 Heavy Cruiser',
            'battleship': '⚓ Battleship',
            'carrier': '✈️ Aircraft Carrier',
            'submarine': '🫧 Submarine',
            'random': '🎲 Random Ship',
            'boss': '👹 BOSS ENEMY'
        };
        return names[shipType] || 'Unknown Ship';
    }

    numberToColumn(num) {
        let result = '';
        while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26) - 1;
        }
        return result;
    }

    getAIDisplayName(ai) {
        const customName = ai.customName || ai.shipClass;
        
        // Check if the custom name already has a class abbreviation in brackets
        if (customName.match(/^\[[A-Z]{2,3}\]/)) {
            // Already has class abbreviation, use as-is
            return customName;
        } else {
            // Add class abbreviation
            const classAbbr = GameUtils.getShipClassAbbreviation(ai.shipClass);
            return `[${classAbbr}] ${customName}`;
        }
    }

    getPlayerDisplayName(player) {
        const classAbbr = GameUtils.getShipClassAbbreviation(player.shipClass);
        const playerName = player.displayName || player.username || 'Unknown Player';
        
        // Remove any existing class tags from the name
        const cleanName = playerName.replace(/^\{[A-Z]+\}\s*/, '').replace(/^\[[A-Z]+\]\s*/, '');
        
        return `[${classAbbr}] ${cleanName}`;
    }

    findNearestPlayer(ai, game) {
        let nearest = null;
        let minDistance = Infinity;
        let targets = [];
        
        // First, collect all alive players with their distances
        for (const player of game.players.values()) {
            if (!player.alive) continue;
            const distance = game.calculateDistance(ai.position, player.position);
            targets.push({ player, distance });
        }
        
        if (targets.length === 0) return null;
        
        // Sort by distance
        targets.sort((a, b) => a.distance - b.distance);
        
        // Return the closest target
        return targets[0].player;
    }

    calculateShipEvasion(speedKnots, tonnage) {
        const baseEvasion = 0.1; // 10% baseline chance
        const referenceSpeed = 25; // knots (typical cruiser speed)
        const referenceSize = 8000; // tons (heavy cruiser)
        
        // Speed Factor: (Ship Speed / Reference Speed)²
        const speedFactor = Math.pow(speedKnots / referenceSpeed, 2);
        
        // Size Factor: √(Reference Size / Ship Displacement)
        const sizeFactor = Math.sqrt(referenceSize / tonnage);

        // Final evasion calculation
        const evasionChance = baseEvasion * speedFactor * sizeFactor;

        // Convert to percentage and round to 1 decimal place
        const evasionPercentage = Math.round(evasionChance * 1000) / 10;

        // Cap between 1% and 75% for game balance
        const finalEvasion = Math.max(1.0, Math.min(evasionPercentage, 75.0));

        return finalEvasion;
    }

    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║                          PORT GUN COMBAT SYSTEM                              ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝

    /**
     * Port gun configuration constants
     * Range: 8 cells (fair for a 75x75 grid - can protect local coastal areas)
     * Fire rate: 45 seconds (slow defensive artillery)
     * Damage: 15-30 (moderate damage to discourage camping near coastal batteries)
     */
    static PORT_GUN_RANGE = 8;
    static PORT_GUN_FIRE_RATE = 45000; // 45 seconds in milliseconds
    static PORT_GUN_MIN_DAMAGE = 15;
    static PORT_GUN_MAX_DAMAGE = 30;

    /**
     * Initialize port gun tracking for a game session
     * This should be called after map generation to identify port gun locations
     */
    initializePortGuns(game, infrastructureClusters) {
        if (!game.portGuns) {
            game.portGuns = [];
        }

        // Scan infrastructure clusters for port guns
        for (const cluster of infrastructureClusters) {
            for (const item of cluster) {
                if (item.type === 'port_gun') {
                    game.portGuns.push({
                        x: item.x,
                        y: item.y,
                        coord: game.coordinateToString(item.x, item.y),
                        lastFired: 0, // Timestamp of last shot
                        range: NavalWarfareBot.PORT_GUN_RANGE
                    });
                }
            }
        }

        console.log(`Initialized ${game.portGuns.length} port gun installations`);
        return game.portGuns.length;
    }

    /**
     * Check if a port gun can fire (not on cooldown)
     */
    canPortGunFire(portGun) {
        const now = Date.now();
        return (now - portGun.lastFired) >= NavalWarfareBot.PORT_GUN_FIRE_RATE;
    }

    /**
     * Find enemy ships within range of a port gun
     * For player turns, port guns target AI ships
     * For AI turns, port guns target player ships
     */
    findTargetsInRange(game, portGun, targetType = 'ai') {
        const targets = [];

        // Get all potential targets (players or AI)
        const potentialTargets = targetType === 'ai' ? game.aiPlayers : game.players.values();

        for (const target of potentialTargets) {
            if (!target || !target.position || target.hp <= 0) continue;

            const targetCoords = game.coordToNumbers(target.position);
            if (!targetCoords) continue;

            // Calculate Manhattan distance
            const distance = Math.abs(portGun.x - targetCoords.x) + Math.abs(portGun.y - targetCoords.y);

            if (distance <= portGun.range) {
                targets.push({
                    target: target,
                    distance: distance,
                    position: target.position
                });
            }
        }

        // Sort by distance (closest first)
        return targets.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Execute port gun attack
     * Fires at the closest enemy ship within range
     */
    async firePortGun(game, portGun, channel) {
        if (!this.canPortGunFire(portGun)) {
            return null; // Still on cooldown
        }

        // Find targets - port guns defend against both players and AI
        // Check for both player and AI targets, prioritize whichever is closer
        const aiTargets = this.findTargetsInRange(game, portGun, 'ai');
        const playerTargets = this.findTargetsInRange(game, portGun, 'player');

        let target = null;
        let targetType = null;

        // Choose closest target regardless of type
        if (aiTargets.length > 0 && playerTargets.length > 0) {
            target = aiTargets[0].distance <= playerTargets[0].distance ? aiTargets[0] : playerTargets[0];
            targetType = aiTargets[0].distance <= playerTargets[0].distance ? 'ai' : 'player';
        } else if (aiTargets.length > 0) {
            target = aiTargets[0];
            targetType = 'ai';
        } else if (playerTargets.length > 0) {
            target = playerTargets[0];
            targetType = 'player';
        }

        if (!target) {
            return null; // No targets in range
        }

        // Calculate damage
        const baseDamage = Math.floor(
            Math.random() * (NavalWarfareBot.PORT_GUN_MAX_DAMAGE - NavalWarfareBot.PORT_GUN_MIN_DAMAGE + 1)
        ) + NavalWarfareBot.PORT_GUN_MIN_DAMAGE;

        // Apply damage
        const actualDamage = Math.min(baseDamage, target.target.hp);
        target.target.hp -= actualDamage;

        // Update last fired time
        portGun.lastFired = Date.now();

        // Create combat message
        const targetName = targetType === 'ai'
            ? GameUtils.getAIDisplayName(target.target)
            : target.target.displayName || target.target.username;

        const message = `🔴 **COASTAL BATTERY FIRE** 🔴\n` +
            `Coastal Defense Battery at ${portGun.coord} engaged ${targetName} at ${target.position}!\n` +
            `💥 Heavy artillery rounds dealt **${actualDamage} damage**!\n` +
            `${targetName} HP: ${target.target.hp <= 0 ? '**DESTROYED**' : `${target.target.hp} HP remaining`}`;

        // Send message to channel
        if (channel) {
            await channel.send(message);
        }

        // Handle destruction
        if (target.target.hp <= 0) {
            if (targetType === 'player') {
                target.target.isDestroyed = true;
                await channel.send(`💀 ${targetName}'s ship has been sunk by coastal artillery! 💀`);
            } else {
                // Handle AI destruction
                await this.handleAIDefeat(target.target, game, channel);
            }
        }

        return {
            target: targetName,
            damage: actualDamage,
            destroyed: target.target.hp <= 0
        };
    }

    /**
     * Process all port guns for a game
     * Should be called periodically or after player/AI movements
     */
    async processPortGuns(game, channel) {
        if (!game.portGuns || game.portGuns.length === 0) {
            return;
        }

        const results = [];
        for (const portGun of game.portGuns) {
            const result = await this.firePortGun(game, portGun, channel);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           HTTP SERVER INTEGRATION                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    setupHTTPServer() {
        const app = express();
        const PORT = process.env.BOT_API_PORT || 3000;

        // Middleware
        app.use(cors());
        app.use(express.json());

        // API key authentication middleware
        const authenticateAPIKey = (req, res, next) => {
            const authHeader = req.headers.authorization;
            const expectedKey = process.env.BOT_API_KEY || 'default_api_key';

            if (authHeader === `Bearer ${expectedKey}`) {
                return next();
            }
            res.status(401).json({ error: 'Unauthorized' });
        };

        // Get all active games for a user or guild
        app.get('/api/games', authenticateAPIKey, (req, res) => {
            try {
                const userId = req.query.userId;
                const guildId = req.query.guildId;
                const userGames = [];

                for (const [channelId, game] of this.games.entries()) {
                    // If guildId is specified, return all games in that guild
                    if (guildId) {
                        if (game.guildId === guildId) {
                            const isPlayer = userId ? game.players.has(userId) : false;
                            userGames.push({
                                channelId,
                                guildId: game.guildId,
                                mapSize: game.mapSize,
                                currentTurn: game.turnNumber || game.currentTurn,
                                phase: game.phase,
                                playerCount: game.players.size,
                                enemyCount: game.enemies.size,
                                missionType: game.missionType || game.currentObjective?.type,
                                isPlayer: isPlayer
                            });
                        }
                    } else if (userId) {
                        // If only userId is specified, return games where user is a player
                        const playerInGame = game.players.has(userId);
                        if (playerInGame) {
                            userGames.push({
                                channelId,
                                guildId: game.guildId,
                                mapSize: game.mapSize,
                                currentTurn: game.turnNumber || game.currentTurn,
                                phase: game.phase,
                                playerCount: game.players.size,
                                enemyCount: game.enemies.size,
                                missionType: game.missionType || game.currentObjective?.type,
                                isPlayer: true
                            });
                        }
                    }
                }

                res.json({ games: userGames });
            } catch (error) {
                console.error('Error fetching games:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get complete game state
        app.get('/api/game/:channelId/state', authenticateAPIKey, (req, res) => {
            try {
                const { channelId } = req.params;
                const game = this.games.get(channelId);

                if (!game) {
                    return res.status(404).json({ error: 'Game not found' });
                }

                // Convert Maps to arrays
                const playersArray = Array.from(game.players.values()).map(p => ({
                    userId: p.userId,
                    username: p.username,
                    characterAlias: p.characterAlias,
                    shipClass: p.shipClass,
                    x: p.x,
                    y: p.y,
                    health: p.health,
                    maxHealth: p.maxHealth,
                    onFire: p.onFire,
                    flooding: p.flooding,
                    sunk: p.sunk,
                    weapons: p.weapons,
                    aircraftSquadrons: p.aircraftSquadrons,
                    actionsThisTurn: p.actionsThisTurn,
                    maxActions: p.maxActions
                }));

                const enemiesArray = Array.from(game.enemies.values()).map(e => ({
                    id: e.id,
                    name: e.name,
                    shipClass: e.shipClass,
                    x: e.x,
                    y: e.y,
                    health: e.health,
                    maxHealth: e.maxHealth,
                    onFire: e.onFire,
                    flooding: e.flooding,
                    sunk: e.sunk,
                    isBoss: e.isBoss
                }));

                // Return game state
                res.json({
                    channelId,
                    guildId: game.guildId,
                    mapSize: game.mapSize,
                    currentTurn: game.turnNumber || game.currentTurn,
                    phase: game.phase,
                    weather: game.weather,
                    missionType: game.missionType || game.currentObjective?.type,
                    missionObjective: game.missionObjective || game.currentObjective,
                    players: playersArray,
                    enemies: enemiesArray,
                    islands: game.islands,
                    turnOrder: game.turnOrder
                });
            } catch (error) {
                console.error('Error fetching game state:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Move player ship
        app.post('/api/game/:channelId/move', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId, x, y, characterAlias } = req.body;
                const game = this.games.get(channelId);

                if (!game) {
                    return res.status(404).json({ error: 'Game not found' });
                }

                // Find player (players is a Map with userId as key)
                let player = game.players.get(userId);

                if (!player) {
                    return res.status(404).json({ error: 'Player not found in game' });
                }

                if (player.sunk) {
                    return res.status(400).json({ error: 'Ship is sunk' });
                }

                if (player.actionsThisTurn >= player.maxActions) {
                    return res.status(400).json({ error: 'No actions remaining this turn' });
                }

                // Validate coordinates
                if (x < 0 || x >= game.mapSize || y < 0 || y >= game.mapSize) {
                    return res.status(400).json({ error: 'Invalid coordinates' });
                }

                // Check if position is on land
                const isLand = game.islands.some(island => {
                    return island.cells.some(cell => cell.x === x && cell.y === y);
                });

                if (isLand) {
                    return res.status(400).json({ error: 'Cannot move onto land' });
                }

                // Update player position
                player.x = x;
                player.y = y;
                player.actionsThisTurn++;

                // Broadcast update to web clients
                await this.broadcastGameUpdate(channelId);

                res.json({
                    success: true,
                    player: {
                        userId: player.userId,
                        characterAlias: player.characterAlias,
                        x: player.x,
                        y: player.y,
                        actionsThisTurn: player.actionsThisTurn
                    }
                });
            } catch (error) {
                console.error('Error moving player:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Attack target
        app.post('/api/game/:channelId/attack', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId, targetId, weaponType, characterAlias } = req.body;
                const game = this.games.get(channelId);

                if (!game) {
                    return res.status(404).json({ error: 'Game not found' });
                }

                // Find player (players is a Map with userId as key)
                let player = game.players.get(userId);

                if (!player) {
                    return res.status(404).json({ error: 'Player not found in game' });
                }

                if (player.sunk) {
                    return res.status(400).json({ error: 'Ship is sunk' });
                }

                if (player.actionsThisTurn >= player.maxActions) {
                    return res.status(400).json({ error: 'No actions remaining this turn' });
                }

                // Find target (check both enemies and players Maps)
                const target = game.enemies.get(targetId) || game.players.get(targetId);

                if (!target) {
                    return res.status(404).json({ error: 'Target not found' });
                }

                if (target.sunk) {
                    return res.status(400).json({ error: 'Target is already sunk' });
                }

                // Calculate distance
                const distance = Math.sqrt(
                    Math.pow(player.x - target.x, 2) +
                    Math.pow(player.y - target.y, 2)
                );

                // Get weapon
                const weapon = player.weapons.find(w => w.type === weaponType);
                if (!weapon) {
                    return res.status(400).json({ error: 'Weapon not found' });
                }

                if (distance > weapon.range) {
                    return res.status(400).json({ error: 'Target out of range' });
                }

                // Perform attack using existing combat system
                const attackResult = await this.performAttack(player, target, weapon, game);

                player.actionsThisTurn++;

                // Broadcast update to web clients
                await this.broadcastGameUpdate(channelId);

                res.json({
                    success: true,
                    result: attackResult
                });
            } catch (error) {
                console.error('Error attacking:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Move aircraft
        app.post('/api/game/:channelId/moveair', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId } = req.params;
                const { userId, x, y, squadronIndex, characterAlias } = req.body;
                const game = this.games.get(channelId);

                if (!game) {
                    return res.status(404).json({ error: 'Game not found' });
                }

                // Find player (players is a Map with userId as key)
                let player = game.players.get(userId);

                if (!player) {
                    return res.status(404).json({ error: 'Player not found in game' });
                }

                if (player.shipClass !== 'Carrier') {
                    return res.status(400).json({ error: 'Only carriers can launch aircraft' });
                }

                if (player.actionsThisTurn >= player.maxActions) {
                    return res.status(400).json({ error: 'No actions remaining this turn' });
                }

                const squadron = player.aircraftSquadrons[squadronIndex];
                if (!squadron) {
                    return res.status(404).json({ error: 'Squadron not found' });
                }

                // Validate coordinates
                if (x < 0 || x >= game.mapSize || y < 0 || y >= game.mapSize) {
                    return res.status(400).json({ error: 'Invalid coordinates' });
                }

                // Update squadron position
                squadron.x = x;
                squadron.y = y;
                squadron.deployed = true;
                player.actionsThisTurn++;

                // Broadcast update to web clients
                await this.broadcastGameUpdate(channelId);

                res.json({
                    success: true,
                    squadron: {
                        index: squadronIndex,
                        x: squadron.x,
                        y: squadron.y,
                        deployed: squadron.deployed
                    }
                });
            } catch (error) {
                console.error('Error moving aircraft:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // ==================== ADMIN PANEL ENDPOINTS ====================

        // Get bot's guilds (for filtering mutual servers)
        app.get('/api/admin/bot-guilds', authenticateAPIKey, async (req, res) => {
            try {
                const botGuilds = this.client.guilds.cache.map(guild => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL()
                }));
                res.json({ guilds: botGuilds });
            } catch (error) {
                console.error('Error fetching bot guilds:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Check if user has staff permissions in a guild
        app.get('/api/admin/check-permission', authenticateAPIKey, async (req, res) => {
            try {
                const { userId, guildId } = req.query;

                if (!userId || !guildId) {
                    return res.status(400).json({ error: 'userId and guildId are required' });
                }

                // Get guild
                const guild = await this.client.guilds.fetch(guildId).catch(() => null);
                if (!guild) {
                    return res.status(404).json({ error: 'Guild not found' });
                }

                // Get member
                const member = await guild.members.fetch(userId).catch(() => null);
                if (!member) {
                    return res.status(404).json({ error: 'Member not found in guild' });
                }

                // Check if user is Administrator OR has staff role
                const isAdmin = member.permissions.has('Administrator');
                const hasStaffRole = this.staffRoleManager.hasStaffPermission(member);
                const hasPermission = isAdmin || hasStaffRole;

                res.json({
                    hasPermission,
                    isAdmin,
                    hasStaffRole,
                    guildId,
                    userId
                });
            } catch (error) {
                console.error('Error checking admin permission:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get all characters for a user in a guild
        app.get('/api/admin/characters', authenticateAPIKey, async (req, res) => {
            try {
                const { guildId, userId } = req.query;

                if (!guildId) {
                    return res.status(400).json({ error: 'guildId is required' });
                }

                const playerData = this.characterManager.loadPlayerData(guildId);

                // If userId specified, return only that user's characters
                if (userId) {
                    const userData = playerData[userId];
                    if (!userData) {
                        return res.json({ characters: [] });
                    }

                    const characters = Object.entries(userData.characters || {}).map(([name, data]) => ({
                        name,
                        ...data,
                        userId,
                        isActive: userData.activeCharacter === name
                    }));

                    res.json({ characters });
                } else {
                    // Return all characters in the guild
                    const allCharacters = [];
                    for (const [uid, udata] of Object.entries(playerData)) {
                        if (udata.characters) {
                            for (const [name, data] of Object.entries(udata.characters)) {
                                allCharacters.push({
                                    name,
                                    ...data,
                                    userId: uid,
                                    isActive: udata.activeCharacter === name
                                });
                            }
                        }
                    }
                    res.json({ characters: allCharacters });
                }
            } catch (error) {
                console.error('Error fetching characters:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Create or update a character
        app.post('/api/admin/characters', authenticateAPIKey, async (req, res) => {
            try {
                const { guildId, userId, characterName, characterData } = req.body;

                if (!guildId || !userId || !characterName || !characterData) {
                    return res.status(400).json({ error: 'guildId, userId, characterName, and characterData are required' });
                }

                const playerData = this.characterManager.loadPlayerData(guildId);

                if (!playerData[userId]) {
                    playerData[userId] = {
                        characters: {},
                        activeCharacter: null,
                        maxCharacters: 2
                    };
                }

                if (!playerData[userId].characters) {
                    playerData[userId].characters = {};
                }

                // Add/update character
                playerData[userId].characters[characterName] = characterData;

                // Set as active if it's the first character
                if (!playerData[userId].activeCharacter) {
                    playerData[userId].activeCharacter = characterName;
                }

                // Save
                const saved = this.characterManager.savePlayerData(guildId, playerData);
                if (saved) {
                    // Sync in-memory data
                    this.characterManager.syncInMemoryData(guildId, userId, playerData[userId]);
                    res.json({ success: true, message: 'Character saved successfully' });
                } else {
                    res.status(500).json({ error: 'Failed to save character' });
                }
            } catch (error) {
                console.error('Error saving character:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Delete a character
        app.delete('/api/admin/characters', authenticateAPIKey, async (req, res) => {
            try {
                const { guildId, userId, characterName } = req.query;

                if (!guildId || !userId || !characterName) {
                    return res.status(400).json({ error: 'guildId, userId, and characterName are required' });
                }

                const playerData = this.characterManager.loadPlayerData(guildId);

                if (!playerData[userId] || !playerData[userId].characters || !playerData[userId].characters[characterName]) {
                    return res.status(404).json({ error: 'Character not found' });
                }

                // Delete character
                delete playerData[userId].characters[characterName];

                // Update active character if needed
                if (playerData[userId].activeCharacter === characterName) {
                    const remainingChars = Object.keys(playerData[userId].characters);
                    playerData[userId].activeCharacter = remainingChars.length > 0 ? remainingChars[0] : null;
                }

                // Save
                const saved = this.characterManager.savePlayerData(guildId, playerData);
                if (saved) {
                    this.characterManager.syncInMemoryData(guildId, userId, playerData[userId]);
                    res.json({ success: true, message: 'Character deleted successfully' });
                } else {
                    res.status(500).json({ error: 'Failed to delete character' });
                }
            } catch (error) {
                console.error('Error deleting character:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get all custom maps
        app.get('/api/admin/maps', authenticateAPIKey, async (req, res) => {
            try {
                const maps = Array.from(this.customMapSystem.customMaps.entries()).map(([id, mapData]) => ({
                    id,
                    ...mapData
                }));

                // Also include map templates
                const templates = Array.from(this.customMapSystem.mapTemplates.entries()).map(([id, template]) => ({
                    id,
                    ...template,
                    isTemplate: true
                }));

                res.json({ maps, templates });
            } catch (error) {
                console.error('Error fetching maps:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Setup a complete game with map generation (Admin Panel)
        app.post('/api/admin/start-game', authenticateAPIKey, async (req, res) => {
            try {
                const { channelId, guildId, maxPlayers, enemyCount, mapType, customMapId, missionType, userId } = req.body;

                if (!channelId || !guildId) {
                    return res.status(400).json({ error: 'channelId and guildId are required' });
                }

                // Get the channel
                const channel = await this.client.channels.fetch(channelId).catch(() => null);
                if (!channel) {
                    return res.status(404).json({ error: 'Channel not found' });
                }

                // Check if game already exists
                if (this.games.has(channelId)) {
                    return res.status(400).json({ error: 'A game is already active in this channel' });
                }

                const maxP = maxPlayers || 8;

                // Create proper NavalBattle instance
                const game = new NavalBattle(channelId, maxP, userId || 'web-admin', this);
                game.guildId = guildId;

                // Initialize setupState
                game.setupState = {
                    maxPlayers: maxP,
                    enemyConfig: {
                        count: parseInt(enemyCount || 3),
                        random: true
                    },
                    mapConfig: {
                        type: mapType || 'random',
                        customMapId: customMapId || null
                    },
                    objectiveConfig: {
                        type: missionType || 'destroy_all'
                    },
                    setupComplete: true
                };

                // If using custom map, load it
                if (mapType === 'custom' && customMapId) {
                    const customMap = this.customMaps.get(customMapId);
                    if (customMap) {
                        game.setupState.mapConfig.customMap = customMap;
                    }
                }

                // Generate the map immediately
                game.map = game.generateMap(game);

                // Set weather
                game.weather = game.randomizeWeather();

                // Store the game
                this.games.set(channelId, game);

                // Update bot status
                await this.statusManager.updateStatus();

                // Get mission name
                const missionNames = {
                    'destroy_all': 'Destroy All Enemies',
                    'resource_acquisition': 'Resource Acquisition',
                    'escort_convoy': 'Escort Convoy',
                    'capture_outpost': 'Capture Outpost',
                    'defeat_boss': 'Defeat Boss'
                };
                const missionName = missionNames[missionType || 'destroy_all'] || missionType;

                // Send setup notification
                const setupEmbed = new EmbedBuilder()
                    .setTitle('⚓ Naval Battle Setup Complete!')
                    .setDescription(`A new naval battle has been prepared via the Admin Panel.\n\n` +
                                  `**Max Players:** ${maxP}\n` +
                                  `**AI Enemies:** ${enemyCount || 3} random enemies\n` +
                                  `**Map Type:** ${mapType === 'custom' ? 'Custom Map' : 'Random Generated'}\n` +
                                  `**Mission:** ${missionName}\n` +
                                  `**Weather:** ${game.weather.toUpperCase()}\n\n` +
                                  `🗺️ **Map has been generated!** See below.\n\n` +
                                  `Players can now join using \`/join\` and select spawn positions.\n` +
                                  `Game master uses \`/start\` to begin the battle.`)
                    .setColor(0x5865F2)
                    .setTimestamp();

                await channel.send({ embeds: [setupEmbed] });

                // Generate and post the map image
                try {
                    const filepath = await this.createMapImage(game);

                    if (filepath) {
                        const path = require('path');
                        const filename = path.basename(filepath);

                        const mapMessage = await channel.send({
                            content: `🗺️ **NAVAL BATTLEFIELD - SETUP**\n🌤️ Weather: ${game.weather.toUpperCase()}`,
                            files: [{
                                attachment: filepath,
                                name: filename
                            }]
                        });

                        // Pin the map message
                        try {
                            await mapMessage.pin();
                            game.pinnedMapMessageId = mapMessage.id;
                        } catch (pinError) {
                            console.log('⚠️ Could not pin map message:', pinError.message);
                            game.pinnedMapMessageId = mapMessage.id;
                        }
                    }
                } catch (mapError) {
                    console.error('Error generating map image:', mapError);
                    await channel.send('⚠️ Map generated but image rendering failed. The game can still proceed.');
                }

                res.json({
                    success: true,
                    message: 'Battle setup complete with map generated!',
                    gameInfo: {
                        channelId,
                        maxPlayers: maxP,
                        enemyCount: enemyCount || 3,
                        mapType: mapType || 'random',
                        missionType: missionType || 'destroy_all',
                        phase: 'setup'
                    }
                });
            } catch (error) {
                console.error('Error setting up game:', error);
                res.status(500).json({ error: error.message || 'Internal server error' });
            }
        });

        // Start server
        app.listen(PORT, () => {
            console.log(`Bot HTTP API listening on port ${PORT}`);
        });

        this.httpServer = app;
    }

    async broadcastGameUpdate(channelId) {
        try {
            const WEB_SERVER_URL = process.env.WEB_SERVER_URL || 'http://localhost:3001';
            const BOT_API_KEY = process.env.BOT_API_KEY || 'default_api_key';

            const game = this.games.get(channelId);
            if (!game) return;

            await axios.post(
                `${WEB_SERVER_URL}/api/broadcast/${channelId}`,
                {
                    type: 'gameUpdate',
                    channelId,
                    timestamp: Date.now()
                },
                {
                    headers: {
                        'Authorization': `Bearer ${BOT_API_KEY}`
                    }
                }
            );
        } catch (error) {
            console.error('Error broadcasting to web server:', error.message);
        }
    }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              NAVAL BATTLE CLASS                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class NavalBattle {
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            CORE BATTLE MANAGEMENT                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
    constructor(channelId, maxPlayers, gmId, bot) {

        this.channelId = channelId;
        this.maxPlayers = maxPlayers;
        this.gmId = gmId;
        this.bot = bot;
        this.players = new Map();
        this.enemies = new Map();
        this.aircraft = new Map();
        this.selectedAircraft = new Map();
        this.phase = 'joining';
        this.turnNumber = 1;
        this.turnOrder = [];
        this.weather = 'clear';
        this.objectiveComplete = false;
        this.mines = new Set();
        this.aircraft = new Map();
        this.civilianBoats = new Map();
        this.civilianAircraft = new Map();
        this.activeWeatherEvent = null;
        this.currentObjective = null;
        this.pinnedMapMessageId = null;
        this.aiActions = []; // Track AI actions for batched messaging
        this.aiActionsBatchEnabled = true; // Flag to enable batched AI actions
        this.qrfRequestSent = false;
        this.playerMonitorInterval = null;
        this.qrfWaitingStartTime = null;
        this.tempPlayerData = new Map();

        // MVP Tracking System
        this.mvpStats = new Map(); // playerId -> stats object

        // Delay map generation until setup is complete
        this.map = null;

        // Cache for base64 encoded legend images
        this.imageCache = new Map();

        // Name generator for cities and towns
        this.nameGenerator = new NameGenerator();

        // Roleplay settings - inherit from bot's global settings
        this.roleplayMode = bot ? bot.roleplayMode : true;
        this.roleplayTimeout = bot ? bot.roleplayTimeout : 300000; // Default: 5 minutes
        console.log(`🎮 New game created with roleplay timeout: ${this.roleplayTimeout}ms (${this.roleplayTimeout / 60000} minutes)`);
    }

    // Add AI action to batch queue
    addAIAction(action) {
        if (this.aiActionsBatchEnabled) {
            this.aiActions.push(action);
        }
    }

    // Send all accumulated AI actions in one message
    async sendBatchedAIActions(channel) {
        if (!this.aiActionsBatchEnabled || this.aiActions.length === 0) return;

        try {
            // Group similar actions together
            const movements = this.aiActions.filter(action => action.type === 'movement');
            const attacks = this.aiActions.filter(action => action.type === 'attack');
            const launches = this.aiActions.filter(action => action.type === 'launch');
            const other = this.aiActions.filter(action => !['movement', 'attack', 'launch'].includes(action.type));

            let messageContent = '**🤖 AI Turn Summary:**\n';

            if (movements.length > 0) {
                messageContent += '\n🚢 **Movements:**\n';
                movements.forEach(action => {
                    messageContent += `• ${action.message}\n`;
                });
            }

            if (attacks.length > 0) {
                messageContent += '\n💥 **Combat Actions:**\n';
                attacks.forEach(action => {
                    messageContent += `• ${action.message}\n`;
                });
            }

            if (launches.length > 0) {
                messageContent += '\n✈️ **Aircraft Operations:**\n';
                launches.forEach(action => {
                    messageContent += `• ${action.message}\n`;
                });
            }

            if (other.length > 0) {
                messageContent += '\n📋 **Other Actions:**\n';
                other.forEach(action => {
                    messageContent += `• ${action.message}\n`;
                });
            }

            // Send the batched message
            await channel.send(messageContent);

            // Clear the actions array for next turn
            this.aiActions = [];
        } catch (error) {
            console.error('Error sending batched AI actions:', error);
            // Fallback: clear actions anyway to prevent accumulation
            this.aiActions = [];
        }
    }

    addPlayer(userId, playerData, shipClass, memberObject) {

        if (this.players.size >= this.maxPlayers) return false;
        
        const player = {
            ...playerData,
            id: userId,
            shipClass: shipClass,
            displayName: memberObject.displayName,
            username: memberObject.user.username,
            position: null,
            currentHealth: playerData.stats.health,
            maxHealth: playerData.stats.health,
            actionPoints: shipClass.includes('Carrier') ? 3 : 2,
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            fuel: 100,
            ammo: new Map([['main', 50], ['secondary', 100], ['torpedoes', 12]]),
            hasTorpedoes: ['Destroyer', 'Submarine', 'Light Cruiser'].includes(shipClass),
            aircraft: shipClass.includes('Carrier') ? new Map() : null,
            hangar: shipClass.includes('Carrier') ? (playerData.hangar || 36) : 0,
            depth: shipClass === 'Submarine' ? 'surface' : null,
            alive: true,
            tonnage: playerData.tonnage || this.getDefaultTonnage(shipClass),
            speedKnots: playerData.speedKnots || this.getDefaultSpeed(shipClass), // ← Make sure this line has a comma
            aaSystems: playerData.aaSystems ? [...playerData.aaSystems] : [], // ← Add this line
            aaSystem: null // ← Remove single system since we're using multiple
        };
        
        this.players.set(userId, player);

        const storedPlayer = this.players.get(userId);

        // Initialize MVP tracking for this player
        this.initializeMVPTracking(userId, player.username);

        // Update status when player joins
        if (global.navalBot && global.navalBot.statusManager) {
            global.navalBot.statusManager.updateStatus();
        }

        return true;
    }

    addOPFORPlayer(userId, playerData, shipClass, memberObject) {
        // Create OPFOR player similar to regular player but store as enemy
        const opforPlayer = {
            ...playerData,
            id: userId,
            shipClass: shipClass,
            displayName: memberObject.displayName,
            username: memberObject.user.username,
            position: null,
            currentHealth: playerData.stats.health,
            maxHealth: playerData.stats.health,
            actionPoints: shipClass.includes('Carrier') ? 3 : 2,
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            fuel: 100,
            ammo: new Map([['main', 50], ['secondary', 100], ['torpedoes', 12]]),
            hasTorpedoes: ['Destroyer', 'Submarine', 'Light Cruiser'].includes(shipClass),
            aircraft: shipClass.includes('Carrier') ? new Map() : null,
            hangar: shipClass.includes('Carrier') ? 36 : 0,
            depth: shipClass === 'Submarine' ? 'surface' : null,
            alive: true,
            tonnage: playerData.tonnage || this.getDefaultTonnage(shipClass),
            speedKnots: playerData.speedKnots || this.getDefaultSpeed(shipClass),
            // OPFOR-specific properties
            isOPFOR: true,
            isPlayer: true, // Still a human player, just on enemy side
            customName: `[OPFOR] ${memberObject.displayName || memberObject.user.username}`,
            activeTurnMessageId: null,
            turnTimeout: null,
            turnResolve: null
        };
        
        // Store as enemy but mark as player-controlled
        this.enemies.set(userId, opforPlayer);
        return true;
    }

    async initializeBattle() {
        this.phase = 'battle';
        this.randomizeTurnOrder();
    }

    randomizeTurnOrder() {
        // Get unique player IDs only (prevent duplicates)
        const playerIds = Array.from(new Set(this.players.keys()));
        this.turnOrder = playerIds;

        // Shuffle the turn order
        for (let i = this.turnOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.turnOrder[i], this.turnOrder[j]] = [this.turnOrder[j], this.turnOrder[i]];
        }

        console.log(`🎲 Turn order randomized: ${this.turnOrder.length} players`);
        this.turnOrder.forEach((id, index) => {
            const player = this.players.get(id);
            console.log(`  ${index + 1}. ${player?.username || player?.displayName || id}`);
        });
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            MAP GENERATION SYSTEM                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    generateMap(game = null) {
        // Check if we should use a custom map from setup
        if (this.setupState?.mapConfig?.type === 'custom' && this.setupState.mapConfig.customMap) {
            console.log(`🗺️ Applying custom map: ${this.setupState.mapConfig.customMap.name}`);
            return this.generateCustomMap(this.setupState.mapConfig.customMap);
        }

        // Default: Generate procedural map
        const map = new Map();

        // Initialize FULL 100x100 grid with ocean
        for (let x = 0; x < 75; x++) {
            for (let y = 1; y <= 75; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y);
                map.set(coord, { type: 'ocean', occupant: null });
            }
        }

        // 20% chance for no islands at all
        if (Math.random() < 0.2) {
        } else {
            // Generate organic islands
            this.generateOrganicIslands(map);

            // Fill surrounded areas
            this.fillSurroundedAreas(map);

            // Generate reefs around islands
            this.generateReefs(map);

            // Generate cities and towns on islands
            this.generateCitiesAndTowns(map);
        }

        // 15% chance to generate a minefield
        if (Math.random() < 0.15) {
            this.generateMinefield(map);
        }

        // Generate spawn zone only if it doesn't exist yet
        if (!game || !game.spawnSide) {
            this.generateSpawnZone(map, game);
        } else {
            // Recreate existing spawn zone in the same location
            this.regenerateExistingSpawnZone(map, game);
        }

        const islandCount = Array.from(map.values()).filter(cell => cell.type === 'island').length;
        const reefCount = Array.from(map.values()).filter(cell => cell.type === 'reef').length;
        const spawnCount = Array.from(map.values()).filter(cell => cell.type === 'spawn').length;
        const cityCount = Array.from(map.values()).filter(cell => cell.type === 'city').length;
        const townCount = Array.from(map.values()).filter(cell => cell.type === 'town').length;

        console.log(`🗺️ Generated map: ${islandCount} islands, ${reefCount} reefs, ${cityCount} cities, ${townCount} towns`);

        return map;
    }

    generateCustomMap(customMapData) {
        const map = new Map();

        // Initialize with ocean cells based on custom map size
        for (let x = 0; x < customMapData.size.width; x++) {
            for (let y = 1; y <= customMapData.size.height; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y);
                map.set(coord, { type: 'ocean', occupant: null });
            }
        }

        // Apply custom terrain from the map data
        for (const [coord, terrainData] of customMapData.terrain) {
            if (map.has(coord)) {
                map.set(coord, {
                    type: terrainData.type,
                    size: terrainData.size,
                    name: terrainData.name, // Include name for cities/towns
                    occupant: null
                });
            }
        }

        console.log(`✅ Custom map "${customMapData.name}" loaded with ${customMapData.terrain.size} terrain features`);
        return map;
    }

    generateCitiesAndTowns(map) {
        console.log(`🏙️ generateCitiesAndTowns() called`);

        // Get all island cells
        const islandCells = [];
        for (const [coord, cell] of map.entries()) {
            if (cell.type === 'island') {
                islandCells.push(coord);
            }
        }

        console.log(`🏝️ Found ${islandCells.length} island cells`);

        if (islandCells.length === 0) {
            console.log(`⚠️ No islands found, skipping city/town generation`);
            return;
        }

        // Generate a very small fixed number of cities and towns per map
        // 0-1 cities and 1-2 towns regardless of map size
        const numCities = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1 city, otherwise 0
        const numTowns = Math.floor(1 + Math.random() * 2); // 1-2 towns

        console.log(`📊 Planning to place ${numCities} cities and ${numTowns} towns`);

        // Shuffle island cells for random placement
        const shuffled = islandCells.sort(() => Math.random() - 0.5);

        // Place cities
        for (let i = 0; i < Math.min(numCities, shuffled.length); i++) {
            const coord = shuffled[i];
            const cityName = this.nameGenerator.generateCityName();
            map.set(coord, {
                type: 'city',
                name: cityName,
                size: 'medium',
                occupant: null
            });
            console.log(`🏙️ Placed city "${cityName}" at ${coord}`);
        }

        // Place towns (after cities so they don't overlap)
        for (let i = numCities; i < Math.min(numCities + numTowns, shuffled.length); i++) {
            const coord = shuffled[i];
            const townName = this.nameGenerator.generateTownName();
            map.set(coord, {
                type: 'town',
                name: townName,
                size: 'small',
                occupant: null
            });
            console.log(`🏘️ Placed town "${townName}" at ${coord}`);
        }

        console.log(`✅ City/town generation complete`);
    }

    generateOrganicIslands(map) {
        const numIslands = 6 + Math.floor(Math.random() * 5);

        const islandCenters = [];
        
        for (let i = 0; i < numIslands; i++) {
            let centerX, centerY;
            let attempts = 0;
            
            do {
                centerX = 10 + Math.floor(Math.random() * 55);
                centerY = 10 + Math.floor(Math.random() * 55);
                attempts++;
            } while (attempts < 50 && this.tooCloseToOtherIslands(centerX, centerY, islandCenters));
            
            islandCenters.push({ x: centerX, y: centerY });
            
            // Create blob-shaped islands instead of star shapes
            this.createBlobIsland(map, centerX, centerY, 3 + Math.random() * 4);
        }
    }

    createBlobIsland(map, centerX, centerY, baseRadius) {
        // Use multiple overlapping circles to create organic blob shapes
        const numBlobs = 3 + Math.floor(Math.random() * 3); // 3-5 overlapping circles
        
        for (let blob = 0; blob < numBlobs; blob++) {
            // Offset each blob slightly from center
            const offsetX = centerX + (Math.random() - 0.5) * baseRadius * 0.6;
            const offsetY = centerY + (Math.random() - 0.5) * baseRadius * 0.6;
            const blobRadius = baseRadius * (0.6 + Math.random() * 0.6); // Varying sizes
            
            // Fill circular area for this blob
            for (let x = Math.floor(offsetX - blobRadius); x <= Math.ceil(offsetX + blobRadius); x++) {
                for (let y = Math.floor(offsetY - blobRadius); y <= Math.ceil(offsetY + blobRadius); y++) {
                    const distance = Math.sqrt(Math.pow(x - offsetX, 2) + Math.pow(y - offsetY, 2));
                    
                    // Add some randomness to edges for organic feel
                    const edgeVariation = (Math.random() - 0.5) * 0.8;
                    const actualRadius = blobRadius + edgeVariation;
                    
                    if (distance <= actualRadius && x >= 0 && x < 75 && y >= 1 && y <= 75) {
                        const coord = GameUtils.generateExtendedCoordinate(x, y);
                        if (map.has(coord)) {
                            map.set(coord, { type: 'island', occupant: null });
                        }
                    }
                }
            }
        }
    }

    tooCloseToOtherIslands(x, y, existingCenters) {
        const minDistance = 20; // Minimum distance between island centers
        
        for (const center of existingCenters) {
            const distance = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
    }

    generateSpawnZone(map, game = null) {
        // Randomly choose spawn zone side (left, right, top, bottom)
        const sides = ['left', 'right', 'top', 'bottom'];
        const spawnSide = sides[Math.floor(Math.random() * sides.length)];

        // Store spawn side in game object for AI spawning logic
        if (game) {
            game.spawnSide = spawnSide;
            game.oppositeSide = this.getOppositeSide(spawnSide);

            // Store spawn zone coordinates for consistency
            const spawnZone = this.generateSpawnZoneForSide(map, spawnSide);
            game.spawnZoneCoords = spawnZone.coords;

            console.log(`🎲 Player spawn zone created on ${spawnSide} side. AI will spawn on ${game.oppositeSide} side.`);
            return spawnZone;
        }

        const spawnZone = this.generateSpawnZoneForSide(map, spawnSide);
        console.log(`🎲 Spawn zone created on ${spawnSide} side.`);
        return spawnZone;
    }

    regenerateExistingSpawnZone(map, game) {
        // Recreate spawn zone using stored coordinates
        if (game && game.spawnZoneCoords) {
            for (const coord of game.spawnZoneCoords) {
                if (map.has(coord)) {
                    map.set(coord, { type: 'spawn', occupant: null });
                }
            }
            console.log(`♻️ Recreated existing spawn zone on ${game.spawnSide} side.`);
        } else if (game && game.spawnSide) {
            // Fallback: regenerate spawn zone for the same side (but new random position)
            const spawnZone = this.generateSpawnZoneForSide(map, game.spawnSide);
            game.spawnZoneCoords = spawnZone.coords;
            console.log(`♻️ Regenerated spawn zone on ${game.spawnSide} side (fallback).`);
        }
    }

    getOppositeSide(side) {
        const opposites = {
            'left': 'right',
            'right': 'left',
            'top': 'bottom',
            'bottom': 'top'
        };
        return opposites[side];
    }

    generateSpawnZoneForSide(map, side) {
        // Dynamic dimensions: long side (12 squares) always against the edge
        let spawnWidth, spawnHeight;

        if (side === 'left' || side === 'right') {
            // Vertical edges: 4 wide, 12 tall (long side against edge)
            spawnWidth = 4;
            spawnHeight = 12;
        } else {
            // Horizontal edges (top/bottom): 12 wide, 4 tall (long side against edge)
            spawnWidth = 12;
            spawnHeight = 4;
        }

        let foundClearArea = false;
        let attempts = 0;
        let spawnCoords = [];

        while (!foundClearArea && attempts < 10) {
            foundClearArea = true;
            spawnCoords = this.getSpawnCoordinatesForSide(side, spawnWidth, spawnHeight);

            // Check if this area is clear of islands
            for (const coord of spawnCoords) {
                const cell = map.get(coord);
                if (cell && cell.type === 'island') {
                    foundClearArea = false;
                    break;
                }
            }
            attempts++;
        }

        // Create spawn zone (force creation if no clear area found)
        for (const coord of spawnCoords) {
            if (map.has(coord)) {
                map.set(coord, { type: 'spawn', occupant: null });
            }
        }

        return { side, coords: spawnCoords };
    }

    getSpawnCoordinatesForSide(side, width, height) {
        const coords = [];
        let startX, startY, maxX, maxY;
        const mapSize = 75; // Assuming 75x75 map

        switch (side) {
            case 'left':
                // Left edge: 4 wide, 12 tall (long side against left edge)
                startX = 0; // Against left edge
                startY = Math.floor(Math.random() * (mapSize - height + 1)) + 1; // Random Y, ensure it fits
                maxX = width;
                maxY = startY + height;
                break;
            case 'right':
                // Right edge: 4 wide, 12 tall (long side against right edge)
                startX = mapSize - width; // Against right edge
                startY = Math.floor(Math.random() * (mapSize - height + 1)) + 1; // Random Y, ensure it fits
                maxX = mapSize;
                maxY = startY + height;
                break;
            case 'top':
                // Top edge: 12 wide, 4 tall (long side against top edge)
                startX = Math.floor(Math.random() * (mapSize - width + 1)); // Random X, ensure it fits
                startY = 1; // Against top edge
                maxX = startX + width;
                maxY = startY + height;
                break;
            case 'bottom':
                // Bottom edge: 12 wide, 4 tall (long side against bottom edge)
                startX = Math.floor(Math.random() * (mapSize - width + 1)); // Random X, ensure it fits
                startY = mapSize - height + 1; // Against bottom edge
                maxX = startX + width;
                maxY = startY + height;
                break;
        }

        for (let x = startX; x < maxX; x++) {
            for (let y = startY; y < maxY; y++) {
                if (y >= 1 && y <= mapSize) {
                    coords.push(GameUtils.generateExtendedCoordinate(x, y));
                }
            }
        }

        return coords;
    }

    fillSurroundedAreas(map) {
        let filledCount = 0;
        
        // Fill any ocean squares completely surrounded by land
        for (let x = 1; x < 74; x++) {
            for (let y = 2; y <= 74; y++) {
                const coord = GameUtils.generateExtendedCoordinate(x, y);
                const cell = map.get(coord);
                
                if (cell && cell.type === 'ocean') {
                    let surroundedByLand = true;
                    
                    // Check all 8 surrounding squares
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            
                            const checkX = x + dx;
                            const checkY = y + dy;
                            
                            if (checkX >= 0 && checkX < 75 && checkY >= 1 && checkY <= 75) {
                                const checkCoord = GameUtils.generateExtendedCoordinate(checkX, checkY);
                                const checkCell = map.get(checkCoord);
                                
                                if (!checkCell || checkCell.type !== 'island') {
                                    surroundedByLand = false;
                                    break;
                                }
                            }
                        }
                        if (!surroundedByLand) break;
                    }
                    
                    if (surroundedByLand) {
                        map.set(coord, { type: 'island', occupant: null });
                        filledCount++;
                    }
                }
            }
        }
    }

    generateReefs(map) {
        let reefCount = 0;
        
        // Generate reefs around islands
        for (const [coord, cell] of map.entries()) {
            if (cell.type === 'island') {
                const coords = this.coordToNumbers(coord);
                
                // Check surrounding area for reef placement
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const reefX = coords.x + dx;
                        const reefY = coords.y + dy;
                        
                        if (reefX >= 0 && reefX < 75 && reefY >= 1 && reefY <= 75) {
                            const reefCoord = GameUtils.generateExtendedCoordinate(reefX, reefY);
                            const reefCell = map.get(reefCoord);
                            
                            if (reefCell && reefCell.type === 'ocean' && Math.random() < 0.25) {
                                map.set(reefCoord, { type: 'reef', occupant: null });
                                reefCount++;
                            }
                        }
                    }
                }
            }
        }
        
        // Add some scattered reef clusters
        const numReefClusters = 6 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < numReefClusters; i++) {
            const centerX = 15 + Math.floor(Math.random() * 45);
            const centerY = 15 + Math.floor(Math.random() * 45);
            const clusterSize = 1 + Math.floor(Math.random() * 3);
            
            for (let dx = -clusterSize; dx <= clusterSize; dx++) {
                for (let dy = -clusterSize; dy <= clusterSize; dy++) {
                    if (Math.random() < 0.3) {
                        const x = centerX + dx;
                        const y = centerY + dy;
                        
                        if (x >= 0 && x < 75 && y >= 1 && y <= 75) {
                            const coord = GameUtils.generateExtendedCoordinate(x, y);
                            const cell = map.get(coord);
                            
                            if (cell && cell.type === 'ocean') {
                                map.set(coord, { type: 'reef', occupant: null });
                                reefCount++;
                            }
                        }
                    }
                }
            }
        }
    }

    generateMinefield(map) {
        // Generate a single minefield cluster in a random ocean location
        // Minefield should be 5-8 cells in size (large enough to be a threat, small enough to navigate around)

        const minefieldSize = 5 + Math.floor(Math.random() * 4); // 5-8 mines

        // Find a suitable location away from spawn zones (center-ish area of map)
        let centerX, centerY;
        let attempts = 0;
        let validLocation = false;

        while (!validLocation && attempts < 100) {
            centerX = 25 + Math.floor(Math.random() * 25); // Center area (columns 25-50)
            centerY = 25 + Math.floor(Math.random() * 25); // Center area (rows 25-50)

            // Check if this area is clear (all ocean)
            let clearArea = true;
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const checkX = centerX + dx;
                    const checkY = centerY + dy;

                    if (checkX >= 0 && checkX < 75 && checkY >= 1 && checkY <= 75) {
                        const coord = GameUtils.generateExtendedCoordinate(checkX, checkY);
                        const cell = map.get(coord);

                        if (!cell || cell.type !== 'ocean') {
                            clearArea = false;
                            break;
                        }
                    }
                }
                if (!clearArea) break;
            }

            if (clearArea) {
                validLocation = true;
            }
            attempts++;
        }

        if (!validLocation) {
            console.log('⚠️ Could not find suitable location for minefield');
            return;
        }

        // Place mines in a scattered cluster pattern
        const mineLocations = [];
        mineLocations.push({ x: centerX, y: centerY }); // Center mine

        // Add remaining mines in a scattered pattern around center
        while (mineLocations.length < minefieldSize) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 1 + Math.random() * 2; // 1-3 cells from center
            const mineX = Math.round(centerX + Math.cos(angle) * distance);
            const mineY = Math.round(centerY + Math.sin(angle) * distance);

            // Check if location is valid and not already used
            if (mineX >= 0 && mineX < 75 && mineY >= 1 && mineY <= 75) {
                const coord = GameUtils.generateExtendedCoordinate(mineX, mineY);
                const cell = map.get(coord);

                if (cell && cell.type === 'ocean') {
                    const alreadyHasMine = mineLocations.some(loc => loc.x === mineX && loc.y === mineY);
                    if (!alreadyHasMine) {
                        mineLocations.push({ x: mineX, y: mineY });
                    }
                }
            }
        }

        // Place the mines on the map
        for (const loc of mineLocations) {
            const coord = GameUtils.generateExtendedCoordinate(loc.x, loc.y);
            map.set(coord, { type: 'mine', occupant: null });
        }

        console.log(`💣 Generated minefield with ${mineLocations.length} mines at center (${centerX}, ${centerY})`);
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               POSITION & MOVEMENT                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    getRandomSpawnPosition() {
        // Player spawn - in the spawn zone (left side)
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * 6); // Spawn zone width (8 cells)
            const y = 25 + Math.floor(Math.random() * 25); // Spawn zone area (rows 35-65)
            const coord = GameUtils.generateExtendedCoordinate(x, y);
            const cell = this.map.get(coord);
            
            if (cell && (cell.type === 'spawn' || cell.type === 'ocean') && !cell.occupant) {
                cell.occupant = 'player';
                return coord;
            }
            attempts++;
        }
        
        return 'A45'; // Fallback spawn position
    }

    getRandomAISpawnPosition() {
        // AI spawn - randomly in middle and on opposite side from players
        let attempts = 0;

        while (attempts < 200) {
            let x, y;

            // 60% chance to spawn on opposite side, 40% chance to spawn in middle
            if (Math.random() < 0.6) {
                // Spawn on opposite side from players
                const coords = GameUtils.getCoordinatesForSide(this.oppositeSide || 'right');
                x = coords.x;
                y = coords.y;
            } else {
                // Spawn in middle area
                const coords = GameUtils.getCoordinatesForSide('center');
                x = coords.x;
                y = coords.y;
            }

            const coord = GameUtils.generateExtendedCoordinate(x, y);
            const cell = this.map.get(coord);

            if (cell && cell.type === 'ocean' && !cell.occupant) {
                cell.occupant = 'ai';
                return coord;
            }
            attempts++;
        }

        // Fallback: try anywhere on the map that's not an island or spawn zone
        attempts = 0;
        while (attempts < 200) {
            const x = Math.floor(Math.random() * 75);
            const y = Math.floor(Math.random() * 75) + 1;
            const coord = GameUtils.generateExtendedCoordinate(x, y);
            const cell = this.map.get(coord);

            // Allow ocean and reef for AI spawn (they can navigate reefs)
            if (cell && (cell.type === 'ocean' || cell.type === 'reef') && !cell.occupant) {
                cell.occupant = 'ai';
                return coord;
            }
            attempts++;
        }

        // Final fallback - force spawn in ocean if no other option
        const fallbackCoord = 'CV50'; // Emergency position
        const fallbackCell = this.map.get(fallbackCoord);
        if (fallbackCell) {
            fallbackCell.occupant = 'ai';
        }
        return fallbackCoord;
    }

    generateExtendedCoordinate(x, y) {
        let columnLabel = '';
        
        if (x < 26) {
            // A-Z (0-25)
            columnLabel = String.fromCharCode(65 + x);
        } else if (x < 702) {
            // AA-ZZ (26-701)
            const adjustedX = x - 26;
            const firstLetter = String.fromCharCode(65 + Math.floor(adjustedX / 26));
            const secondLetter = String.fromCharCode(65 + (adjustedX % 26));
            columnLabel = firstLetter + secondLetter;
        } else {
            // AAA and beyond (702+)
            const adjustedX = x - 702;
            const firstLetter = String.fromCharCode(65 + Math.floor(adjustedX / 676));
            const remainder = adjustedX % 676;
            const secondLetter = String.fromCharCode(65 + Math.floor(remainder / 26));
            const thirdLetter = String.fromCharCode(65 + (remainder % 26));
            columnLabel = firstLetter + secondLetter + thirdLetter;
        }
        
        return columnLabel + y;
    }

    coordToNumbers(coord) {
        const match = coord.match(/^([A-Z]+)(\d+)$/);
        if (!match) return { x: 0, y: 0 };
        
        const letters = match[1];
        const numbers = parseInt(match[2]);
        
        let x = 0;
        
        if (letters.length === 1) {
            // Single letter (A-Z) = 0-25
            x = letters.charCodeAt(0) - 65;
        } else if (letters.length === 2) {
            // Double letter (AA-ZZ) = 26-701
            const firstLetter = letters.charCodeAt(0) - 65;
            const secondLetter = letters.charCodeAt(1) - 65;
            x = 26 + (firstLetter * 26) + secondLetter;
        } else if (letters.length === 3) {
            // Triple letter (AAA-ZZZ) = 702+
            const firstLetter = letters.charCodeAt(0) - 65;
            const secondLetter = letters.charCodeAt(1) - 65;
            const thirdLetter = letters.charCodeAt(2) - 65;
            x = 702 + (firstLetter * 676) + (secondLetter * 26) + thirdLetter;
        }
        
        return { x, y: numbers };
    }

    moveTowards(fromPos, toPos, speed) {
        const from = this.coordToNumbers(fromPos);
        const to = this.coordToNumbers(toPos);
        
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        
        // Use Chebyshev distance for consistent movement calculation
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        
        if (distance <= speed) return toPos;
        
        // Calculate the best direction to move using Chebyshev distance
        let bestX = from.x;
        let bestY = from.y;
        let bestDistance = distance;
        
        // Try moving in all 8 directions (including diagonals)
        const directions = [
            {dx: 0, dy: -1}, {dx: 0, dy: 1},     // North, South
            {dx: -1, dy: 0}, {dx: 1, dy: 0},     // West, East
            {dx: -1, dy: -1}, {dx: 1, dy: -1},   // NW, NE (diagonals)
            {dx: -1, dy: 1}, {dx: 1, dy: 1}      // SW, SE (diagonals)
        ];
        
        // Try each direction at the maximum speed
        for (const dir of directions) {
            const newX = from.x + (dir.dx * speed);
            const newY = from.y + (dir.dy * speed);
            
            // Check bounds
            if (newX < 0 || newX >= 75 || newY < 1 || newY > 75) continue;
            
            // Check if position is valid (not island, not occupied)
            const testCoord = GameUtils.generateExtendedCoordinate(newX, newY);
            const cell = this.getMapCell(testCoord);
            if (!cell || cell.type === 'island' || cell.occupant) continue;
            
            // Calculate Chebyshev distance to target from this position
            const testDistance = Math.max(Math.abs(newX - to.x), Math.abs(newY - to.y));
            
            if (testDistance < bestDistance) {
                bestX = newX;
                bestY = newY;
                bestDistance = testDistance;
            }
        }
        
        // If no valid move found, stay in place
        if (bestX === from.x && bestY === from.y) {
            return fromPos;
        }
        
        return GameUtils.generateExtendedCoordinate(bestX, bestY);
    }
    
    getMapCell(coord) {
        // Check if map exists
        if (!this.map) {
            console.warn(`⚠️ getMapCell called but map is null for coordinate ${coord}`);
            // Generate map if it doesn't exist
            this.map = this.generateMap(this);
            console.log('🗺️ Map regenerated due to null map in getMapCell');
        }

        const cell = this.map.get(coord);
        if (cell) {
            return cell;
        }

        // Return default ocean cell if coordinate doesn't exist
        return { type: 'ocean', occupant: null };
    }

    calculateDistance(pos1, pos2) {
        if (!pos1 || !pos2) return Infinity;
        
        const coords1 = this.coordToNumbers(pos1);
        const coords2 = this.coordToNumbers(pos2);
        
        return Math.sqrt(Math.pow(coords2.x - coords1.x, 2) + Math.pow(coords2.y - coords1.y, 2));
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                  AI MANAGEMENT                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    spawnRandomAI() {
        const customAI = this.getRandomCustomAI();
        
        const ai = {
            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: customAI.type,
            shipClass: customAI.shipClass,
            customName: customAI.name,
            position: this.getRandomAISpawnPosition(),
            alive: true,
            currentHealth: customAI.stats.health,
            maxHealth: customAI.stats.health,
            stats: customAI.stats,
            weapons: customAI.weapons,
            onFire: false,
            flooding: false,
            fireTimer: 0,
            floodTimer: 0,
            damageControlCooldown: 0,
            tonnage: customAI.tonnage,
            speedKnots: customAI.speedKnots,
            armorThickness: customAI.armorThickness,
            baseAccuracy: customAI.baseAccuracy,
            hangar: customAI.hangar || 0
        };

        // Generate AA system for AI
        const aaSystem = this.generateAAForAI(customAI);
        if (aaSystem) {
            ai.aaSystem = aaSystem;
        }

        // Set facing direction based on spawn side (face toward player side +-90°)
        if (ai.direction === undefined) {
            ai.direction = GameUtils.getSpawnFacingDirection(this.oppositeSide || 'right');
        }

        this.enemies.set(ai.id, ai);
        console.log(`🤖 Spawned ${ai.customName} at ${ai.position}${aaSystem ? ' with AA' : ''}`);
        return ai;
    }

    generateAAForAI(aiData) {
        // Don't give AA to all AI - make it based on ship type and random chance
        const shipType = aiData.shipClass.toLowerCase();
        
        let aaChance = 0;
        let caliberOptions = [];
        
        if (shipType.includes('destroyer')) {
            aaChance = 0.7;
            caliberOptions = ['20mm', '25mm', '40mm'];
        } else if (shipType.includes('cruiser')) {
            aaChance = 0.8;
            caliberOptions = ['25mm', '40mm', '76.2mm'];  // Changed from '76mm' to '76.2mm'
        } else if (shipType.includes('battleship')) {
            aaChance = 0.9;
            caliberOptions = ['40mm', '76.2mm', '127mm']; // Changed from '76mm' to '76.2mm'
        } else if (shipType.includes('carrier')) {
            aaChance = 0.95;
            caliberOptions = ['20mm', '25mm', '40mm'];
        } else {
            aaChance = 0.3;
            caliberOptions = ['20mm', '25mm'];
        }
        
        if (Math.random() < aaChance) {
            const caliber = caliberOptions[Math.floor(Math.random() * caliberOptions.length)];
            
            // Check if the caliber exists in AA_CALIBERS
            const caliberData = AA_CALIBERS[caliber];
            if (!caliberData) {
                console.error(`❌ Caliber ${caliber} not found in AA_CALIBERS. Available calibers:`, Object.keys(AA_CALIBERS));
                return null; // Return null if caliber doesn't exist
            }
            
            const barrels = Math.ceil(Math.random() * 6);
            const efficiency = 60 + Math.random() * 25; // 60-85% efficiency for AI
            
            const mountTypes = ['single', 'twin', 'quad'];
            const mountType = mountTypes[Math.floor(Math.random() * mountTypes.length)];
            const mountMultiplier = AA_MOUNT_MULTIPLIERS[mountType] || 1.0;
            
            return {
                name: `AI ${caliber} AA System`,
                caliber: caliber,
                barrels: barrels,
                mountType: mountType,
                experienceLevel: Math.ceil(efficiency / 10),
                experience: 0,
                efficiency: Math.round(efficiency),
                range: Math.round(caliberData.range * (efficiency / 100)),
                damage: Math.round(caliberData.damage * mountMultiplier * (efficiency / 100)),
                accuracy: caliberData.accuracy * (efficiency / 100),
                rateOfFire: Math.round(caliberData.rateOfFire * mountMultiplier),
                ammo: 300 + Math.floor(Math.random() * 200),
                maxAmmo: 500
            };
        }
        
        return null;
    }

    getRandomCustomAI() {
        // Get reference to the bot's AI config
        if (global.navalBot && global.navalBot.aiConfig) {
            return global.navalBot.aiConfig.getRandomAI();
        }
        return this.getFallbackAI();
    }

    findTarget(targetString) {
        // Remove Discord mention formatting
        const userId = targetString.replace(/[<@!>]/g, '');
        
        // Check players first
        for (const player of this.players.values()) {
            if (player.id === userId || 
                (player.username && player.username.toLowerCase().includes(targetString.toLowerCase()))) {
                return player;
            }
        }
        
        // Check AI enemies
        for (const enemy of this.enemies.values()) {
            if (enemy.id === targetString || 
                enemy.shipClass.toLowerCase().includes(targetString.toLowerCase())) {
                return enemy;
            }
        }
        
        return null;
    }

    getTargetsInRange(attacker, game, range) {
        const targets = [];
        
        if (attacker.id.startsWith('ai_')) {
            // AI targets players
            for (const player of game.players.values()) {
                if (player.alive && game.calculateDistance(attacker.position, player.position) <= range) {
                    targets.push(player);
                }
            }
            // AI also targets player aircraft
            for (const aircraft of game.aircraft?.values() || []) {
                if (aircraft.owner === 'player' && aircraft.alive && 
                    game.calculateDistance(attacker.position, aircraft.position) <= range) {
                    targets.push(aircraft);
                }
            }
        } else {
            // Players target enemies
            for (const enemy of game.enemies.values()) {
                if (enemy.alive && game.calculateDistance(attacker.position, enemy.position) <= range) {
                    targets.push(enemy);
                }
            }
            // Players also target enemy aircraft
            for (const aircraft of game.aircraft?.values() || []) {
                if (aircraft.owner === 'enemy' && aircraft.alive && 
                    game.calculateDistance(attacker.position, aircraft.position) <= range) {
                    targets.push(aircraft);
                }
            }
        }
        
        return targets;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                UTILITY METHODS                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    getDefaultTonnage(shipClass) {
        const defaultTonnages = {
            'Destroyer': 2500,
            'Light Cruiser': 6000,
            'Heavy Cruiser': 10000,
            'Battleship': 35000,
            'Aircraft Carrier': 25000,
            'Submarine': 1500,
            'Auxiliary': 8000
        };
        return defaultTonnages[shipClass] || 2500;
    }

    getDefaultSpeed(shipClass) {
        const defaultSpeeds = {
            'Destroyer': 35,
            'Light Cruiser': 32,
            'Heavy Cruiser': 28,
            'Battleship': 21,
            'Aircraft Carrier': 25,
            'Submarine': 20,
            'Auxiliary': 18
        };
        return defaultSpeeds[shipClass] || 25;
    }

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                   MVP SYSTEM                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

    initializeMVPTracking(playerId, username) {
        // Ensure mvpStats is initialized
        if (!this.mvpStats) {
            this.mvpStats = new Map();
        }

        if (!this.mvpStats.has(playerId)) {
            this.mvpStats.set(playerId, {
                playerId: playerId,
                username: username,
                damageDealt: 0,
                damageReceived: 0,
                kills: 0,
                hits: 0,
                shots: 0,
                survivalTime: 0,
                objectiveContributions: 0,
                criticalHits: 0,
                aircraftShot: 0,
                teamSupport: 0, // Supporting actions like repairs, etc.
                gameStartTime: Date.now()
            });
        }
    }

    updateMVPStats(playerId, statType, value = 1) {
        // Ensure mvpStats is initialized
        if (!this.mvpStats) {
            this.mvpStats = new Map();
        }

        const stats = this.mvpStats.get(playerId);
        if (stats) {
            switch (statType) {
                case 'damageDealt':
                    stats.damageDealt += value;
                    break;
                case 'damageReceived':
                    stats.damageReceived += value;
                    break;
                case 'kill':
                    stats.kills += 1;
                    break;
                case 'hit':
                    stats.hits += 1;
                    stats.shots += 1;
                    break;
                case 'miss':
                    stats.shots += 1;
                    break;
                case 'criticalHit':
                    stats.criticalHits += 1;
                    stats.hits += 1;
                    stats.shots += 1;
                    break;
                case 'aircraftKill':
                    stats.aircraftShot += 1;
                    break;
                case 'objectiveContribution':
                    stats.objectiveContributions += value;
                    break;
                case 'teamSupport':
                    stats.teamSupport += value;
                    break;
            }
        }
    }

    calculateMVPScore(playerId) {
        // Ensure mvpStats is initialized
        if (!this.mvpStats) {
            this.mvpStats = new Map();
        }

        const stats = this.mvpStats.get(playerId);
        if (!stats) return 0;

        let score = 0;

        // Damage dealt (primary scoring factor)
        score += stats.damageDealt * 0.5;

        // Kills (high impact)
        score += stats.kills * 100;

        // Accuracy bonus
        const accuracy = stats.shots > 0 ? stats.hits / stats.shots : 0;
        score += accuracy * 150;

        // Critical hits bonus
        score += stats.criticalHits * 50;

        // Aircraft kills (important for AA)
        score += stats.aircraftShot * 30;

        // Survival bonus (based on time alive vs total match time)
        const currentTime = Date.now();
        const timeAlive = currentTime - stats.gameStartTime;
        const survivalBonus = Math.min(timeAlive / 1000 / 60, 30) * 10; // Max 10 points per minute, cap at 30 minutes
        score += survivalBonus;

        // Objective contribution bonus
        score += stats.objectiveContributions * 75;

        // Team support bonus
        score += stats.teamSupport * 25;

        // Penalty for damage taken (reduces reckless play)
        score -= stats.damageReceived * 0.1;

        return Math.max(0, Math.round(score));
    }

    getMVPCandidate() {
        let mvpPlayer = null;
        let highestScore = 0;

        for (const [playerId, stats] of this.mvpStats) {
            const score = this.calculateMVPScore(playerId);
            if (score > highestScore) {
                highestScore = score;
                mvpPlayer = {
                    ...stats,
                    score: score
                };
            }
        }

        return mvpPlayer;
    }

    async createCrownedProfileImage(userId) {
        try {
            // Get user's avatar URL
            const user = await global.navalBot.client.users.fetch(userId);
            const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });

            // Download user's avatar using fetch (available in Node.js 18+)
            let avatarBuffer;
            if (typeof fetch !== 'undefined') {
                const response = await fetch(avatarURL);
                avatarBuffer = Buffer.from(await response.arrayBuffer());
            } else {
                // Fallback for older Node.js versions
                const https = require('https');
                avatarBuffer = await new Promise((resolve, reject) => {
                    https.get(avatarURL, (res) => {
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    }).on('error', reject);
                });
            }

            // Load crown image
            const fs = require('fs');
            const path = require('path');
            const crownPath = path.join(__dirname, 'icons', 'crown.png');

            // Check if crown image exists
            if (!fs.existsSync(crownPath)) {
                console.warn('Crown image not found at:', crownPath);
                // Fallback to simple avatar without crown
                return await sharp(avatarBuffer)
                    .resize(256, 256)
                    .png()
                    .toBuffer();
            }

            // Load and resize crown image
            const crownBuffer = await sharp(crownPath)
                .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();

            // Create MVP text ribbon as SVG
            const mvpRibbon = `
                <svg width="256" height="50" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="10" width="216" height="30" fill="#FFD700" stroke="#FFA500" stroke-width="2" opacity="0.95" rx="15"/>
                    <text x="128" y="30" text-anchor="middle" font-family="Arial Black, Arial" font-size="18" font-weight="bold" fill="#000000">MVP</text>
                </svg>
            `;
            const ribbonBuffer = Buffer.from(mvpRibbon);

            // Use sharp to composite the avatar with the crown and ribbon
            const crownedImage = await sharp(avatarBuffer)
                .resize(256, 256)
                .composite([
                    {
                        input: crownBuffer,
                        top: -20,
                        left: 38,
                        blend: 'over'
                    },
                    {
                        input: ribbonBuffer,
                        top: 206,
                        left: 0,
                        blend: 'over'
                    }
                ])
                .png()
                .toBuffer();

            return crownedImage;

        } catch (error) {
            console.error('Error creating crowned profile image:', error);
            console.error('This could be due to:');
            console.error('- Network issues downloading the profile picture');
            console.error('- Sharp image processing errors');
            console.error('- Discord API rate limiting');
            console.error('MVP announcement will continue without the custom image.');
            // Return null to trigger fallback behavior
            return null;
        }
    }

    async announceMVP(mvpCandidate, channel) {
        try {
            const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

            // Create crowned profile image
            const crownedImageBuffer = await this.createCrownedProfileImage(mvpCandidate.playerId);

            // Ensure mvpStats is initialized
            if (!this.mvpStats) {
                this.mvpStats = new Map();
            }

            const mvpStats = this.mvpStats.get(mvpCandidate.playerId);
            const accuracy = mvpStats.shots > 0 ? ((mvpStats.hits / mvpStats.shots) * 100).toFixed(1) : '0.0';
            const gameTimeMinutes = Math.round((Date.now() - mvpStats.gameStartTime) / 1000 / 60);

            // Create MVP announcement embed
            const mvpEmbed = new EmbedBuilder()
                .setTitle('👑 MATCH MVP 👑')
                .setDescription(`**${mvpCandidate.username}** dominated the battlefield!`)
                .setColor(0xFFD700)
                .addFields(
                    { name: '⚔️ Total Damage Dealt', value: mvpStats.damageDealt.toString(), inline: true },
                    { name: '💀 Kills', value: mvpStats.kills.toString(), inline: true },
                    { name: '🎯 Accuracy', value: `${accuracy}%`, inline: true },
                    { name: '💥 Critical Hits', value: mvpStats.criticalHits.toString(), inline: true },
                    { name: '✈️ Aircraft Shot Down', value: mvpStats.aircraftShot.toString(), inline: true },
                    { name: '🏆 MVP Score', value: mvpCandidate.score.toString(), inline: true },
                    { name: '⏱️ Battle Duration', value: `${gameTimeMinutes} minutes`, inline: false },
                    { name: '🎁 Rewards', value: '**Double XP and Currency!**', inline: false }
                )
                .setFooter({ text: 'Outstanding performance in naval combat!' });

            if (crownedImageBuffer) {
                // Create attachment and set as thumbnail
                const attachment = new AttachmentBuilder(crownedImageBuffer, { name: 'mvp-crowned.png' });
                mvpEmbed.setThumbnail('attachment://mvp-crowned.png');

                await channel.send({
                    embeds: [mvpEmbed],
                    files: [attachment]
                });
            } else {
                // Fallback without custom image
                mvpEmbed.setThumbnail('https://cdn.discordapp.com/emojis/123456789/crown.png'); // Placeholder
                await channel.send({ embeds: [mvpEmbed] });
            }

        } catch (error) {
            console.error('Error announcing MVP:', error);
            // Fallback simple message
            await channel.send(`👑 **MVP: ${mvpCandidate.username}** with ${mvpCandidate.score} points! (Earned 2x rewards)`);
        }
    }
}

const bot = new NavalWarfareBot();
bot.setupHTTPServer();
module.exports = { NavalWarfareBot, NavalBattle };

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               SETUP CHECKLIST                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

bot.client.login(process.env.DISCORD_TOKEN).then(() => {
}).catch(error => {
   console.error('❌ Failed to start:', error);
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                    SHUTDOWN                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');

    // Set status to offline
    await bot.statusManager.shutdown();

    for (const game of bot.games.values()) {
        bot.cleanupGameMaps(game);
    }

    bot.client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
   console.error('Unhandled promise rejection:', error);
});