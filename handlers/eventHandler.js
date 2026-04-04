// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              EVENT HANDLER                                   ║
// ║                     Discord interaction management                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const GameUtils = require('../utils/gameUtils');
const AIPersonality = require('../systems/aiPersonality');
const { MessageFlags } = require('discord.js');

class EventHandler {
    constructor(bot) {
        this.bot = bot;
    }

    setupEventListeners() {
        this.bot.client.on('ready', () => this.onReady());
        this.bot.client.on('interactionCreate', (interaction) => this.onInteractionCreate(interaction));
        this.bot.client.on('messageCreate', (message) => this.onMessageCreate(message));
    }

    onMessageCreate(message) {
        // Ignore bots and empty messages
        if (message.author.bot || !message.content?.trim()) return;

        // Find a game active in this channel
        const game = this.bot.games?.get(message.channelId);
        if (!game || !game.enemies || game.enemies.size === 0) return;

        // Only respond if the battle is in progress
        if (!game.turnOrder || game.isGameOver) return;

        // Only respond to players who are in the game (avoid reacting to GM/bystander chatter)
        if (!game.players.has(message.author.id)) return;

        // Check aiSpeakChance: 0 = disabled, 0–1 = probability, default 1.0 (global setting)
        const chance = this.bot.aiSpeakChance ?? 1.0;
        if (chance === 0 || Math.random() > chance) return;

        // Delay first so it feels like the AI is reading and thinking, then generate + send
        const delay = 1000 + Math.random() * 1500;
        setTimeout(() => {
            AIPersonality.respondToPlayer(message.content, game.enemies)
                .then(response => { if (response) message.channel.send(response).catch(() => {}); })
                .catch(() => {});
        }, delay);
    }

    onReady() {
        console.log(`✅ Logged in as ${this.bot.client.user.tag}!`);
        console.log(`🚢 Naval Command Bot is ready to serve!`);

        this.bot.client.user.setActivity('Naval Command - Type /help for commands', { type: 'PLAYING' });
    }

    async onInteractionCreate(interaction) {
        if (interaction.isAutocomplete()) {
            await this.handleAutocomplete(interaction);
        } else if (interaction.isCommand()) {
            await this.handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
            await this.handleButtonInteraction(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await this.handleSelectMenuInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await this.handleModalSubmit(interaction);
        }
    }

    async handleAutocomplete(interaction) {
        if (interaction.commandName !== 'speak') return interaction.respond([]);

        const focused = interaction.options.getFocused().toLowerCase();
        const game    = this.bot.games?.get(interaction.channelId);
        if (!game) return interaction.respond([]);

        const choices = Array.from(game.enemies.entries())
            .filter(([, e]) => e.alive)
            .map(([id, e]) => {
                const raw  = e.customName || e.name || 'Unknown';
                // Strip existing [XX] prefix for display, keep id as value
                const display = raw.replace(/^\[.*?\]\s*/, '').trim();
                const full    = raw; // full name including prefix if any
                return { name: full, value: String(id) };
            })
            .filter(c => c.name.toLowerCase().includes(focused))
            .slice(0, 25);

        await interaction.respond(choices);
    }

    async handleSlashCommand(interaction) {
        const { commandName } = interaction;

        try {
            // Check if it's a moderation command first
            const roleCommandNames = ['roles', 'listroles', 'embed', 'listembeds'];

            const messageLogCommandNames = [
                'setmsglogchannel', 'removemsglogchannel', 'msglogchannelinfo',
                'msgloggerstats', 'clearmsgcache'
            ];

            if (roleCommandNames.includes(commandName) || messageLogCommandNames.includes(commandName)) {
                await this.bot.moderationSystem.handleSlashCommand(interaction);
                return;
            }

            // Check if it's a character management command
            const characterCommandNames = ['editchar', 'deletechar', 'listchars'];

            if (characterCommandNames.includes(commandName)) {
                await this.bot.characterCommands.handleCharacterCommand(interaction);
                return;
            }

            // Check if it's a staff role command
            if (commandName === 'staffrole') {
                await this.bot.staffRoleCommands.handleStaffRole(interaction);
                return;
            }

            // Check if it's a custom map command
            const customMapCommandNames = ['listmaps', 'usemap', 'previewmap', 'deletemap'];
            if (customMapCommandNames.includes(commandName)) {
                await this.bot.customMapCommands.handleCustomMapCommand(interaction);
                return;
            }

            // Handle other commands
            switch (commandName) {
                case 'help':
                    await this.bot.showHelp(interaction);
                    break;
                case 'prepare':
                    await this.bot.prepareGame(interaction);
                    break;
                case 'join':
                    await this.bot.joinGame(interaction);
                    break;
                case 'start':
                    await this.bot.battleManager.startBattle(interaction);
                    break;
                case 'spawn':
                    await this.bot.spawnCommand(interaction);
                    break;
                case 'shop':
                    await this.bot.shopSystem.showShop(interaction);
                    break;
                case 'stats':
                    await this.bot.showPlayerStats(interaction);
                    break;
                case 'profile':
                    await this.bot.showPlayerProfile(interaction);
                    break;
                case 'leaderboard':
                    await this.bot.levelingSystem.showLeaderboard(interaction);
                    break;
                case 'move': {
                    const moveType = interaction.options.getString('type');
                    const coordinate = interaction.options.getString('coordinate');
                    if (moveType === 'aircraft') {
                        await this.bot.moveAircraft(interaction);
                    } else {
                        await this.bot.executeSlashMove(interaction, coordinate);
                    }
                    break;
                }
                case 'weather':
                    await this.bot.setWeather(interaction);
                    break;
                case 'end':
                    await this.bot.endBattle(interaction);
                    break;
                case 'equip':
                    await this.bot.equipItem(interaction);
                    break;
                case 'clearpins':
                    await this.bot.clearPins(interaction);
                    break;
                case 'kill':
                    await this.bot.killTarget(interaction);
                    break;
                case 'newchar':
                    await this.bot.createPlayers(interaction);
                    break;
                case 'fire':
                    await this.bot.setFire(interaction);
                    break;
                case 'flood':
                    await this.bot.setFlood(interaction);
                    break;
                case 'equipment':
                    await this.bot.showEquipmentStats(interaction);
                    break;
                case 'speak':
                    await this.bot.handleGMSpeak(interaction);
                    break;
                case 'aicanspeak':
                    await this.bot.handleAICanSpeak(interaction);
                    break;
                case 'setgm':
                    await this.bot.handleSetGM(interaction);
                    break;
                case 'roleplay':
                    await this.bot.setRoleplayMode(interaction);
                    break;
                case 'setlogchannel':
                    await this.bot.setLoggingChannelCommand(interaction);
                    break;
                case 'purge':
                    await this.bot.purgeMessages(interaction);
                    break;
                default:
                    await interaction.reply({ content: 'Unknown command!', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(`Error handling command ${commandName}:`, error);

            // Only try to respond if the interaction hasn't been handled yet
            try {
                const reply = { content: 'An error occurred while processing your command.', flags: MessageFlags.Ephemeral };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (responseError) {
                // If we can't respond, just log it and move on
                console.error(`Could not send error response for ${commandName}:`, responseError.message);
            }
        }
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        console.log(`🔍 BUTTON: Received button "${customId}"`);

        try {
            // Check if it's a moderation button first
            if (await this.bot.moderationSystem.handleButtonInteraction(interaction)) {
                return; // Handled by moderation system
            }

            // Check if it's a character management button
            if (await this.bot.characterManager.handleButtonInteraction(interaction)) {
                return; // Handled by character manager
            }

            // Check if it's a custom map button
            if (customId.startsWith('map_') || customId.startsWith('template_')) {
                await this.bot.customMapSystem.handleMapCreationButton(interaction);
                return;
            }

            // Handle other button interactions
            if (customId.startsWith('setup_') || customId.startsWith('custom_enemy_') || customId.startsWith('select_boss_')) {
                // Route setup buttons to bot's appropriate handlers
                const game = this.bot.games.get(interaction.channelId);
                if (game) {
                    if (customId.startsWith('setup_')) {
                        await this.bot.handleNewSetupFlow(interaction, game);
                    } else if (customId.startsWith('custom_enemy_')) {
                        await this.bot.handleCustomEnemyConfig(interaction, game);
                    } else if (customId.startsWith('select_boss_')) {
                        await this.bot.handleBossSelection(interaction, game);
                    }
                } else {
                    await interaction.reply({ content: '❌ No active game setup in this channel!', flags: MessageFlags.Ephemeral });
                }
            } else if (customId.startsWith('batch_spawn_')) {
                // batch_spawn buttons are handled by bot's internal logic, delegate to bot
                // Let the bot handle this through its main button interaction logic
                await this.bot.handleButton(interaction);
            } else if (customId.startsWith('prepare_')) {
                await this.bot.handlePrepareButton(interaction);
            } else if (customId.startsWith('join_')) {
                await this.bot.handleJoinButton(interaction);
            } else if (customId.startsWith('spawn_')) {
                const game = this.bot.games.get(interaction.channelId);
                if (game) {
                    if (customId.includes('spawn_select_')) {
                        await this.bot.handleSpawnSelection(interaction, game);
                    } else if (customId.includes('opfor_spawn_select_')) {
                        await this.bot.handleOPFORSpawnSelection(interaction, game);
                    } else if (customId.includes('spawn_next_') || customId.includes('spawn_prev_')) {
                        await this.bot.handleSpawnNavigation(interaction, game);
                    } else {
                        await interaction.reply({ content: 'Unknown spawn interaction!', flags: MessageFlags.Ephemeral });
                    }
                } else {
                    await interaction.reply({ content: '❌ No active game in this channel!', flags: MessageFlags.Ephemeral });
                }
            } else if (customId.startsWith('shop_')) {
                await this.bot.shopSystem.handleShopInteraction(interaction);
            } else if (customId.startsWith('aircraft_')) {
                await this.bot.handleAircraftButton(interaction);
            } else if (customId.startsWith('select_battle_squadron_')) {
                await this.bot.handleBattleSquadronSelection(interaction);
            } else if (customId.startsWith('continue_stats_')) {
                await this.bot.playerCreation.handleContinueStats(interaction);
            } else if (customId.startsWith('edit_player_info_')) {
                await this.bot.playerCreation.handleEditBasicInfo(interaction);
            } else if (customId.startsWith('continue_aircraft_')) {
                await this.bot.playerCreation.handleContinueAircraft(interaction);
            } else if (customId.startsWith('skip_aircraft_')) {
                await this.bot.playerCreation.handleSkipAircraft(interaction);
            } else if (customId.startsWith('continue_weapons_')) {
                await this.bot.playerCreation.handleContinueWeaponsButton(interaction);
            } else if (customId.startsWith('finish_weapons_')) {
                await this.bot.playerCreation.handleFinishWeaponsButton(interaction);
            } else if (customId.startsWith('continue_aa_setup_')) {
                await this.bot.playerCreation.handleContinueAASetup(interaction);
            } else if (customId.startsWith('skip_aa_setup_')) {
                await this.bot.playerCreation.handleSkipAASetup(interaction);
            } else if (customId.startsWith('continue_aa_')) {
                await this.bot.playerCreation.handleContinueAASetup(interaction);
            } else if (customId.startsWith('skip_aa_')) {
                await this.bot.playerCreation.handleSkipAASetup(interaction);
            } else if (customId.startsWith('configure_short_aa_') || customId.startsWith('configure_medium_aa_') || customId.startsWith('configure_long_aa_') || customId.startsWith('skip_all_aa_') || customId.startsWith('finish_aa_config_') || customId.startsWith('continue_next_aa_') || customId.startsWith('finish_aa_') || customId.startsWith('confirm_all_aa_') || customId.startsWith('reset_aa_')) {
                await this.bot.playerCreation.handleAAConfigButtons(interaction);
            } else if (customId.startsWith('gmai_')) {
                await this.bot.handleGMAIButton(interaction);
            } else if (customId.startsWith('finalize_')) {
                await this.bot.playerCreation.finalizeCharacterWithAA(interaction);
            } else if (customId.startsWith('opfor_convert_') || customId.startsWith('opfor_recover_')) {
                await this.bot.handleOPFORChoiceButton(interaction);
            } else {
                // Handle basic action buttons and game interaction buttons - route to bot's main handler
                const basicActionButtons = [
                    'move', 'shoot', 'end_turn', 'skills', 'dmg_control', 'move_aircraft', 'assign_cap',
                    'get_map', 'launch_aircraft'
                ];

                const gameInteractionPrefixes = [
                    'target_', 'weapon_', 'shell_', 'move_to_', 'move_aircraft_to_', 'select_squadron_',
                    'bomb_target_', 'torpedo_target_', 'dogfight_target_', 'aircraft_bomb_',
                    'aircraft_torpedo_', 'equip_', 'cancel_', 'land_aircraft_'
                ];

                // Check if it's a basic action button or game interaction button
                const isBasicAction = basicActionButtons.some(action =>
                    customId === action ||
                    customId.startsWith(`${action}_`) ||
                    customId.includes(`_${action}_`) ||
                    customId.endsWith(`_${action}`)
                );

                const isGameInteraction = gameInteractionPrefixes.some(prefix =>
                    customId.startsWith(prefix)
                );

                if (isBasicAction || isGameInteraction) {
                    console.log(`🔄 ROUTING: Button "${customId}" routed to main bot handler`);
                    // Route to bot's main button handler
                    await this.bot.handleButton(interaction);
                } else {
                    console.log(`❌ UNKNOWN: Button "${customId}" not recognized by any handler`);
                    await interaction.reply({ content: 'Unknown button interaction!', flags: MessageFlags.Ephemeral });
                }
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);

            try {
                const reply = { content: 'An error occurred while processing your interaction.', flags: MessageFlags.Ephemeral };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (responseError) {
                console.error(`Could not send error response for button interaction:`, responseError.message);
            }
        }
    }

    async handleSelectMenuInteraction(interaction) {
        const customId = interaction.customId;

        try {
            // Check if it's a moderation select menu first
            if (await this.bot.moderationSystem.handleSelectMenuInteraction(interaction)) {
                return; // Handled by moderation system
            }

            // Handle other select menu interactions
            if (customId.startsWith('spawn_location_')) {
                await this.bot.handleSpawnLocationSelect(interaction);
            } else if (customId.startsWith('ship_selection_')) {
                await this.bot.handleShipSelection(interaction);
            } else if (customId.startsWith('squadron_management_')) {
                await this.bot.handleSquadronManagement(interaction);
            } else if (customId.startsWith('setup_select_custom_map_')) {
                const game = this.bot.games.get(interaction.channelId);
                if (game) {
                    await this.bot.handleCustomMapSelection(interaction, game);
                } else {
                    await interaction.reply({ content: '❌ No active game setup in this channel!', flags: MessageFlags.Ephemeral });
                }
            } else if (customId.startsWith('gmai_attack_select_')) {
                await this.bot.handleGMAITargetSelect(interaction);
            } else {
                await interaction.reply({ content: 'Unknown select menu interaction!', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('Error handling select menu interaction:', error);

            try {
                const reply = { content: 'An error occurred while processing your selection.', flags: MessageFlags.Ephemeral };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (responseError) {
                console.error(`Could not send error response for select menu interaction:`, responseError.message);
            }
        }
    }

    async handleModalSubmit(interaction) {
        const customId = interaction.customId;

        try {
            // Check if it's a moderation modal first
            if (await this.bot.moderationSystem.handleModalSubmit(interaction)) {
                return; // Handled by moderation system
            }

            // Check if it's a character management modal
            if (await this.bot.characterManager.handleModalSubmit(interaction)) {
                return; // Handled by character manager
            }

            // Check if it's a custom map modal
            if (customId.startsWith('map_new_modal_')) {
                await this.bot.customMapSystem.handleNewMapModal(interaction);
                return;
            }

            // Check if it's a terrain addition modal
            if (customId.startsWith('terrain_add_')) {
                await this.bot.customMapSystem.handleTerrainModal(interaction);
                return;
            }

            // GM AI move modal
            if (customId.startsWith('gmai_move_submit_')) {
                await this.bot.handleGMAIModalSubmit(interaction);
                return;
            }

            // Handle other modal submissions
            if (customId.startsWith('custom_enemy_')) {
                await this.bot.handleCustomEnemyModal(interaction);
            } else if (customId.startsWith('ship_customization_')) {
                await this.bot.handleShipCustomization(interaction);
            } else if (customId.startsWith('create_player_')) {
                await this.bot.playerCreation.handlePlayerCreationSubmit(interaction);
            } else if (customId.startsWith('create_stats_')) {
                await this.bot.playerCreation.handleStatsCreationSubmit(interaction);
            } else if (customId.startsWith('edit_player_info_')) {
                await this.bot.playerCreation.handleEditBasicInfoSubmit(interaction);
            } else if (customId.startsWith('create_weapons_')) {
                await this.bot.playerCreation.handleWeaponsCreationSubmit(interaction);
            } else if (customId.startsWith('create_aa_')) {
                await this.bot.playerCreation.handleAACreationSubmit(interaction);
            } else if (customId.startsWith('finalize_character_')) {
                await this.bot.playerCreation.finalizeCharacterWithAA(interaction);
            } else if (customId.startsWith('aircraft_config_')) {
                await this.bot.playerCreation.handleAircraftConfigSubmit(interaction);
            } else if (customId.startsWith('assign_simple_aircraft_')) {
                await this.bot.playerCreation.handleAircraftAssignmentSubmit(interaction);
            } else {
                await interaction.reply({ content: 'Unknown modal submission!', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('Error handling modal submission:', error);

            try {
                const reply = { content: 'An error occurred while processing your submission.', flags: MessageFlags.Ephemeral };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (responseError) {
                console.error(`Could not send error response for modal submission:`, responseError.message);
            }
        }
    }
}

module.exports = EventHandler;