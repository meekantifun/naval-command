// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             BATTLE MANAGER                                   ║
// ║                      Battle startup and management                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { MessageFlags } = require('discord.js');

class BattleManager {
    constructor(bot) {
        this.bot = bot;
    }

    async startBattle(interaction) {
        // Check staff permissions
        if (!this.bot.hasStaffPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ You need staff permissions to start battles.\n\n' +
                         'Contact an administrator to:\n' +
                         '• Give you the configured staff role, or\n' +
                         '• Give you Manage Messages permission',
                flags: MessageFlags.Ephemeral
            });
        }

        const channelId = interaction.channelId;
        const game = this.bot.games.get(channelId);

        if (!game) {
            return interaction.reply({ content: 'No active game in this channel!', flags: MessageFlags.Ephemeral });
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

        await interaction.reply({
            content: '🚢 **Battle is starting!** Generating map and setting up mission...'
        });

        try {
            await game.initializeBattle();
            await this.bot.spawnConfiguredEnemies(game);

            const objectiveType = game.setupState.objectiveConfig.type;
            const objective = this.bot.missions.getObjective(objectiveType);

            let objectiveSetupMessage = null;

            if (objective) {
                game.currentObjective = objective;
                if (objective.setup) {
                    const setupResult = objective.setup(game);
                    if (setupResult && setupResult.message) {
                        objectiveSetupMessage = setupResult.message;
                    }
                }
                console.log(`🎯 Mission started: ${this.bot.getMissionSummary(objectiveType)}`);
            }

            if (objectiveSetupMessage) {
                await interaction.followUp({
                    content: objectiveSetupMessage
                });
            }

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

            await interaction.editReply({
                content: '✅ **Battle has begun!** Check the pinned map above and mission briefing below.'
            });

        } catch (error) {
            console.error('Error setting up battle:', error);
            await interaction.editReply({
                content: '❌ Error setting up battle. Check console for details.'
            });
            return;
        }

        try {
            await this.bot.updateGameDisplay(game, interaction.channel);
            this.bot.startPlayerMonitoring(game, interaction.channel);
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

            if (alivePlayers.length === 0) {
                if (!game.qrfWaitingStartTime) {
                    game.qrfWaitingStartTime = Date.now();
                    await channel.send('⏸️ **GAME PAUSED - WAITING FOR QRF REINFORCEMENTS**\n' +
                                     '🕐 **10 minutes until automatic mission failure**\n' +
                                     '🚁 Use `/join` to deploy as QRF backup!');
                }

                const waitTime = Date.now() - game.qrfWaitingStartTime;
                const timeRemaining = 600000 - waitTime;

                if (waitTime >= 600000) {
                    await channel.send('💀 **MISSION FAILED - QRF TIMEOUT**\n' +
                                     '⏰ No reinforcements arrived within 10 minutes.\n' +
                                     '🏁 Sortie automatically ended.');
                    await this.endBattle(game, channel);
                    return;
                }

                const minutesRemaining = Math.ceil(timeRemaining / 60000);
                if (game.turnNumber % 30 === 0) {
                    await channel.send(`⏰ **${minutesRemaining} minutes remaining** until mission failure. QRF reinforcements needed!`);
                }

                await new Promise(resolve => setTimeout(resolve, 10000));
                game.turnNumber++;
                continue;
            } else {
                if (game.qrfWaitingStartTime) {
                    game.qrfWaitingStartTime = null;
                    await channel.send('▶️ **GAME RESUMED - QRF REINFORCEMENTS DEPLOYED**\n' +
                                     '⚔️ Battle continues with backup forces!');
                }
            }

            const weatherMessages = this.bot.processWeatherEvents(game);
            for (const message of weatherMessages) await channel.send(message);

            const formationMessages = this.bot.checkFormationIntegrity(game);
            for (const message of formationMessages) await channel.send(message);

            for (let i = 0; i < game.turnOrder.length; i++) {
                const playerId = game.turnOrder[i];
                if (game.phase !== 'battle') break;

                const currentPlayer = game.players.get(playerId);
                if (!currentPlayer || !currentPlayer.alive) continue;

                await this.bot.playerTurn(currentPlayer, game, channel, game.lastInteraction);

                if (game.lastInteraction) {
                    game.lastInteraction = null;
                }

                await this.bot.playerTurn(currentPlayer, game, channel);

                if (game.currentObjective && game.currentObjective.check && game.currentObjective.check(game)) {
                    game.objectiveComplete = true;
                    await channel.send(`🎯 Objective "${game.currentObjective.name}" completed!`);
                }

                if (this.bot.checkWinConditions(game)) {
                    await this.endBattle(game, channel);
                    return;
                }
            }

            await this.bot.aiTurn(game, channel);

            const recoveryMessages = this.bot.processAircraftRecovery(game);
            for (const message of recoveryMessages) await channel.send(message);

            game.turnNumber++;

            if (game.turnNumber % 3 === 0) {
                await this.bot.updateGameDisplay(game, channel);
            }

            if (this.bot.checkWinConditions(game)) {
                await this.endBattle(game, channel);
                return;
            }
        }
    }

    async endBattle(game, channel) {
        console.log(`🏁 Ending battle for game ${game.channelId}...`);

        this.bot.stopPlayerMonitoring(game);

        game.qrfWaitingStartTime = null;
        game.qrfRequestSent = false;

        await this.bot.cleanupGameMessages(game, channel);

        if (game.aircraft && game.aircraft.size > 0) {
            await this.recoverAircraft(game, channel);
        }

        for (const player of game.players.values()) {
            const playerData = this.bot.playerData.get(player.id);
            if (playerData) {
                playerData.experience += 100;
                playerData.currency += 200;
                playerData.battles++;

                if (game.objectiveComplete) {
                    playerData.experience += 200;
                    playerData.currency += 500;
                    playerData.victories++;
                }
            }
        }

        this.bot.savePlayerData();
        this.bot.games.delete(game.channelId);

        await channel.send('🏁 Battle ended! Players have been awarded XP and currency.');
    }

    async recoverAircraft(game, channel) {
        const survivingAircraft = Array.from(game.aircraft.values()).filter(a => a.alive);

        for (const aircraft of survivingAircraft) {
            const carrier = game.players.get(aircraft.carrierID) || game.enemies.get(aircraft.carrierID);

            if (carrier && carrier.alive) {
                const cost = this.bot.carrierSystem.aircraftTypes[aircraft.type]?.cost || 1;
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

        game.aircraft.clear();
    }
}

module.exports = BattleManager;