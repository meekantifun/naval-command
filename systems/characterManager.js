// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CHARACTER MANAGER                                  ║
// ║                    Character editing and deletion system                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');

class CharacterManager {
    constructor(bot) {
        this.bot = bot;

        // Initialize temporary character data storage
        if (!this.bot.tempCharacterData) {
            this.bot.tempCharacterData = new Map();
        }
    }

    // Get guild-specific file path
    getGuildDataFilePath(guildId) {
        const path = require('path');
        const fs = require('fs');

        // Get guild folder name from bot
        const guildFolderName = this.bot.getGuildFolderName(guildId);
        const guildDir = path.join('./servers', guildFolderName);

        // Ensure directory exists
        if (!fs.existsSync(guildDir)) {
            fs.mkdirSync(guildDir, { recursive: true });
            // Save guild ID reference
            fs.writeFileSync(path.join(guildDir, 'guild_id.txt'), guildId);
        }

        return path.join(guildDir, 'playerData.json');
    }

    loadPlayerData(guildId) {
        try {
            const filePath = this.getGuildDataFilePath(guildId);
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            return {};
        } catch (error) {
            console.error(`Error loading player data for guild ${guildId}:`, error);
            return {};
        }
    }

    savePlayerData(guildId, data) {
        try {
            const filePath = this.getGuildDataFilePath(guildId);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error saving player data for guild ${guildId}:`, error);
            return false;
        }
    }

    // Get player data for a specific guild
    getGuildPlayerData(guildId, userId) {
        const guildData = this.loadPlayerData(guildId);
        return guildData[userId] || null;
    }

    // Set player data for a specific guild
    setGuildPlayerData(guildId, userId, userData) {
        const guildData = this.loadPlayerData(guildId);

        if (userData === null) {
            // Remove user entirely
            delete guildData[userId];
        } else {
            guildData[userId] = userData;
        }

        return this.savePlayerData(guildId, guildData);
    }

    syncInMemoryData(guildId, userId, userData) {
        try {
            if (!this.bot.playerData) {
                return;
            }

            // Ensure guild map exists
            if (!this.bot.playerData.has(guildId)) {
                this.bot.playerData.set(guildId, new Map());
            }
            const guildMap = this.bot.playerData.get(guildId);

            if (!userData) {
                // User was completely deleted, remove from in-memory data
                guildMap.delete(userId);
                console.log(`🔄 Removed user ${userId} from guild ${guildId} in-memory data`);
                return;
            }

            // Convert the file-based structure to the in-memory Map structure
            const memoryData = {
                characters: new Map(),
                activeCharacter: userData.activeCharacter || null,
                maxCharacters: userData.maxCharacters || 2
            };

            // Convert characters object to Map
            if (userData.characters) {
                for (const [charName, charData] of Object.entries(userData.characters)) {
                    memoryData.characters.set(charName, charData);
                }
            }

            // Fix invalid activeCharacter reference
            if (memoryData.activeCharacter && !memoryData.characters.has(memoryData.activeCharacter)) {
                console.warn(`⚠️ Invalid activeCharacter "${memoryData.activeCharacter}" for user ${userId} in guild ${guildId}, fixing...`);
                if (memoryData.characters.size > 0) {
                    // Set to first available character
                    memoryData.activeCharacter = Array.from(memoryData.characters.keys())[0];
                    console.log(`🔧 Set activeCharacter to "${memoryData.activeCharacter}"`);

                    // Update the file to fix the inconsistency
                    userData.activeCharacter = memoryData.activeCharacter;
                    this.setGuildPlayerData(guildId, userId, userData);
                } else {
                    memoryData.activeCharacter = null;
                }
            }

            guildMap.set(userId, memoryData);
            console.log(`🔄 Synced in-memory data for user ${userId} in guild ${guildId}, characters: ${memoryData.characters.size}, active: ${memoryData.activeCharacter}`);
        } catch (error) {
            console.error('Error syncing in-memory data:', error);
        }
    }

    forceSyncUserData(guildId, userId) {
        try {
            const userData = this.getGuildPlayerData(guildId, userId);
            if (userData) {
                console.log(`🔄 Force syncing data for user ${userId} in guild ${guildId}`);
                this.syncInMemoryData(guildId, userId, userData);
                return true;
            } else {
                console.log(`⚠️ No data found for user ${userId} in guild ${guildId}`);
                // Remove from memory if it exists
                if (this.bot.playerData && this.bot.playerData.has(guildId)) {
                    const guildMap = this.bot.playerData.get(guildId);
                    if (guildMap.has(userId)) {
                        guildMap.delete(userId);
                        console.log(`🗑️ Removed stale in-memory data for user ${userId} in guild ${guildId}`);
                    }
                }
                return false;
            }
        } catch (error) {
            console.error('Error force syncing user data:', error);
            return false;
        }
    }

    getPlayerCharacters(guildId, userId) {
        const userData = this.getGuildPlayerData(guildId, userId);
        if (!userData || !userData.characters) {
            return [];
        }

        return Object.entries(userData.characters).map(([charName, charData]) => ({
            name: charName,
            data: charData
        }));
    }

    async editCharacterCommand(interaction) {
        console.log(`✏️ editCharacterCommand called by ${interaction.user.tag}`);

        const targetUser = interaction.options.getUser('user');
        const targetUserId = targetUser.id;
        const guildId = interaction.guildId;

        console.log(`🎯 Target user: ${targetUser.tag} (${targetUserId}) in guild ${guildId}`);

        // Check if user has admin permissions
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            console.log(`❌ Permission denied for ${interaction.user.tag}`);
            return interaction.reply({
                content: '❌ You need Administrator permissions to edit characters!',
                flags: MessageFlags.Ephemeral
            });
        }

        const characters = this.getPlayerCharacters(guildId, targetUserId);

        console.log(`📊 Found ${characters.length} characters for ${targetUser.tag} in guild ${guildId}`);

        if (characters.length === 0) {
            return interaction.reply({
                content: `❌ ${targetUser.tag} has no characters to edit!`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (characters.length === 1) {
            // Single character, show edit options
            await this.showCharacterEditOptions(interaction, guildId, targetUserId, characters[0].name);
        } else {
            // Multiple characters, show selection
            await this.showCharacterSelection(interaction, guildId, targetUserId, characters, 'edit');
        }
    }

    async deleteCharacterCommand(interaction) {
        const targetUser = interaction.options.getUser('user');
        const targetUserId = targetUser.id;
        const guildId = interaction.guildId;

        // Check if user has admin permissions
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: '❌ You need Administrator permissions to delete characters!',
                flags: MessageFlags.Ephemeral
            });
        }

        const characters = this.getPlayerCharacters(guildId, targetUserId);

        if (characters.length === 0) {
            return interaction.reply({
                content: `❌ ${targetUser.tag} has no characters to delete!`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (characters.length === 1) {
            // Single character, show confirmation
            await this.showDeleteConfirmation(interaction, guildId, targetUserId, characters[0].name);
        } else {
            // Multiple characters, show selection
            await this.showCharacterSelection(interaction, guildId, targetUserId, characters, 'delete');
        }
    }

    async showCharacterSelection(interaction, guildId, targetUserId, characters, action) {
        const embed = new EmbedBuilder()
            .setTitle(`📋 Select Character to ${action === 'edit' ? 'Edit' : 'Delete'}`)
            .setColor(action === 'edit' ? 0x5865F2 : 0xFF0000)
            .setDescription(`Choose which character you want to ${action}:`)
            .setTimestamp();

        const buttons = [];
        const actionRows = [];

        for (let i = 0; i < characters.length && i < 25; i++) {
            const character = characters[i];
            const button = new ButtonBuilder()
                .setCustomId(`char_${action}_${guildId}_${targetUserId}_${i}`)
                .setLabel(character.name)
                .setStyle(action === 'edit' ? ButtonStyle.Primary : ButtonStyle.Danger)
                .setEmoji(action === 'edit' ? '✏️' : '🗑️');

            buttons.push(button);

            // Add to action row (max 5 buttons per row)
            if (buttons.length === 5 || i === characters.length - 1) {
                const row = new ActionRowBuilder().addComponents(...buttons);
                actionRows.push(row);
                buttons.length = 0; // Clear array
            }
        }

        // Store character data temporarily for this interaction with guild context
        if (!this.bot.tempCharacterData) {
            this.bot.tempCharacterData = new Map();
        }
        const interactionKey = `${guildId}_${interaction.user.id}`;
        this.bot.tempCharacterData.set(interactionKey, characters);

        console.log(`📋 Stored ${characters.length} characters for user ${interaction.user.id} in guild ${guildId}`);

        await interaction.reply({
            embeds: [embed],
            components: actionRows,
            flags: MessageFlags.Ephemeral
        });
    }

    async showCharacterEditOptions(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const embed = new EmbedBuilder()
            .setTitle(`✏️ Edit ${characterName}`)
            .setColor(0x5865F2)
            .setDescription('Choose what you want to edit:')
            .addFields(
                { name: '📝 Basic Info', value: `Name: ${character.username || characterName}\nClass: ${character.shipClass || 'Unknown'}\nTonnage: ${character.tonnage || 0}\nSpeed: ${character.speedKnots || 0} knots`, inline: true },
                { name: '🛡️ Armor', value: `Belt: ${character.armorThickness?.belt || 0}mm\nDeck: ${character.armorThickness?.deck || 0}mm\nTurret: ${character.armorThickness?.turret || 0}mm`, inline: true },
                { name: '📊 Stats & Currency', value: `Health: ${character.stats?.health || character.calculatedHP || 0}\nLevel: ${character.level || 1}\nXP: ${character.experience || 0}\nCurrency: ${character.currency || 0}`, inline: true }
            )
            .setTimestamp();

        const basicButton = new ButtonBuilder()
            .setCustomId(`edit_basic_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Edit Basic Info')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝');

        const armorButton = new ButtonBuilder()
            .setCustomId(`edit_armor_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Edit Armor')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🛡️');

        const statsButton = new ButtonBuilder()
            .setCustomId(`edit_stats_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Edit Stats & Currency')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📊');

        const weaponsButton = new ButtonBuilder()
            .setCustomId(`edit_weapons_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Edit Weapons')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚔️');

        const aaButton = new ButtonBuilder()
            .setCustomId(`edit_aa_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Edit AA Systems')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎯');

        const firstRow = new ActionRowBuilder().addComponents(basicButton, armorButton, statsButton);
        const secondRow = new ActionRowBuilder().addComponents(weaponsButton, aaButton);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                embeds: [embed],
                components: [firstRow, secondRow],
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: [firstRow, secondRow],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async showDeleteConfirmation(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Confirm Character Deletion')
            .setColor(0xFF0000)
            .setDescription(`Are you sure you want to delete **${characterName}**?`)
            .addFields(
                { name: '🚢 Ship Class', value: character.shipClass || 'Unknown', inline: true },
                { name: '⚖️ Tonnage', value: character.tonnage?.toString() || 'Unknown', inline: true },
                { name: '💰 Currency', value: character.currency?.toString() || '0', inline: true },
                { name: '⭐ Level', value: character.level?.toString() || '1', inline: true },
                { name: '🏆 Battles', value: character.battles?.toString() || '0', inline: true },
                { name: '✅ Victories', value: character.victories?.toString() || '0', inline: true }
            )
            .setFooter({ text: '⚠️ This action cannot be undone!' })
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm_delete_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Delete Character')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️');

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_delete')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌');

        const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({
            embeds: [embed],
            components: [actionRow],
            flags: MessageFlags.Ephemeral
        });
    }

    async showBasicEditModal(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const modal = new ModalBuilder()
            .setCustomId(`edit_char_basic_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setTitle(`📝 Edit Basic Info - ${characterName}`);

        const usernameInput = new TextInputBuilder()
            .setCustomId('character_username')
            .setLabel('Character Name')
            .setStyle(TextInputStyle.Short)
            .setValue(character.username || characterName)
            .setRequired(true)
            .setMaxLength(100);

        const shipClassInput = new TextInputBuilder()
            .setCustomId('character_shipclass')
            .setLabel('Ship Class')
            .setStyle(TextInputStyle.Short)
            .setValue(character.shipClass || '')
            .setRequired(true)
            .setMaxLength(50);

        const tonnageInput = new TextInputBuilder()
            .setCustomId('character_tonnage')
            .setLabel('Tonnage')
            .setStyle(TextInputStyle.Short)
            .setValue(character.tonnage?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const speedInput = new TextInputBuilder()
            .setCustomId('character_speed')
            .setLabel('Speed (Knots)')
            .setStyle(TextInputStyle.Short)
            .setValue(character.speedKnots?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const hangarInput = new TextInputBuilder()
            .setCustomId('character_hangar')
            .setLabel('Hangar Capacity')
            .setStyle(TextInputStyle.Short)
            .setValue(character.hangar?.toString() || '0')
            .setRequired(false)
            .setMaxLength(10);

        const firstRow = new ActionRowBuilder().addComponents(usernameInput);
        const secondRow = new ActionRowBuilder().addComponents(shipClassInput);
        const thirdRow = new ActionRowBuilder().addComponents(tonnageInput);
        const fourthRow = new ActionRowBuilder().addComponents(speedInput);
        const fifthRow = new ActionRowBuilder().addComponents(hangarInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async showArmorEditModal(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const modal = new ModalBuilder()
            .setCustomId(`edit_char_armor_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setTitle(`🛡️ Edit Armor - ${characterName}`);

        const beltArmorInput = new TextInputBuilder()
            .setCustomId('armor_belt')
            .setLabel('Belt Armor (mm)')
            .setStyle(TextInputStyle.Short)
            .setValue(character.armorThickness?.belt?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const deckArmorInput = new TextInputBuilder()
            .setCustomId('armor_deck')
            .setLabel('Deck Armor (mm)')
            .setStyle(TextInputStyle.Short)
            .setValue(character.armorThickness?.deck?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const turretArmorInput = new TextInputBuilder()
            .setCustomId('armor_turret')
            .setLabel('Turret Armor (mm)')
            .setStyle(TextInputStyle.Short)
            .setValue(character.armorThickness?.turret?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const calculatedArmorInput = new TextInputBuilder()
            .setCustomId('calculated_armor')
            .setLabel('Calculated Armor Rating')
            .setStyle(TextInputStyle.Short)
            .setValue(character.calculatedArmor?.toString() || '0')
            .setRequired(false)
            .setMaxLength(10);

        const firstRow = new ActionRowBuilder().addComponents(beltArmorInput);
        const secondRow = new ActionRowBuilder().addComponents(deckArmorInput);
        const thirdRow = new ActionRowBuilder().addComponents(turretArmorInput);
        const fourthRow = new ActionRowBuilder().addComponents(calculatedArmorInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        await interaction.showModal(modal);
    }

    async showStatsEditModal(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const modal = new ModalBuilder()
            .setCustomId(`edit_char_stats_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setTitle(`📊 Edit Stats - ${characterName}`);

        const levelInput = new TextInputBuilder()
            .setCustomId('character_level')
            .setLabel('Level')
            .setStyle(TextInputStyle.Short)
            .setValue(character.level?.toString() || '1')
            .setRequired(true)
            .setMaxLength(5);

        const experienceInput = new TextInputBuilder()
            .setCustomId('character_experience')
            .setLabel('Experience')
            .setStyle(TextInputStyle.Short)
            .setValue(character.experience?.toString() || '0')
            .setRequired(false)
            .setMaxLength(10);

        const currencyInput = new TextInputBuilder()
            .setCustomId('character_currency')
            .setLabel('Currency')
            .setStyle(TextInputStyle.Short)
            .setValue(character.currency?.toString() || '0')
            .setRequired(false)
            .setMaxLength(10);

        const battlesInput = new TextInputBuilder()
            .setCustomId('character_battles')
            .setLabel('Battles')
            .setStyle(TextInputStyle.Short)
            .setValue(character.battles?.toString() || '0')
            .setRequired(false)
            .setMaxLength(10);

        const victoriesInput = new TextInputBuilder()
            .setCustomId('character_victories')
            .setLabel('Victories')
            .setStyle(TextInputStyle.Short)
            .setValue(character.victories?.toString() || '0')
            .setRequired(false)
            .setMaxLength(10);

        const firstRow = new ActionRowBuilder().addComponents(levelInput);
        const secondRow = new ActionRowBuilder().addComponents(experienceInput);
        const thirdRow = new ActionRowBuilder().addComponents(currencyInput);
        const fourthRow = new ActionRowBuilder().addComponents(battlesInput);
        const fifthRow = new ActionRowBuilder().addComponents(victoriesInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async handleBasicCharacterEdit(interaction) {
        try {
            const [, , , guildId, targetUserId, encodedCharName] = interaction.customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const newUsername = interaction.fields.getTextInputValue('character_username');
            const newShipClass = interaction.fields.getTextInputValue('character_shipclass');
            const newTonnage = parseInt(interaction.fields.getTextInputValue('character_tonnage')) || 0;
            const newSpeed = parseInt(interaction.fields.getTextInputValue('character_speed')) || 0;
            const newHangar = parseInt(interaction.fields.getTextInputValue('character_hangar')) || 0;

            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const character = userData.characters[characterName];

            // Update basic character data
            const updatedCharacter = {
                ...character,
                username: newUsername,
                shipClass: newShipClass,
                tonnage: newTonnage,
                speedKnots: newSpeed,
                hangar: newHangar
            };

            // Recalculate stats based on new values
            this.recalculateCharacterStats(updatedCharacter);

            // If username changed, rename the character key
            if (newUsername !== characterName) {
                delete userData.characters[characterName];
                userData.characters[newUsername] = updatedCharacter;

                // Update activeCharacter if it was the renamed character
                if (userData.activeCharacter === characterName) {
                    userData.activeCharacter = newUsername;
                }
            } else {
                userData.characters[characterName] = updatedCharacter;
            }

            if (this.setGuildPlayerData(guildId, targetUserId, userData)) {
                // Update the bot's in-memory data to stay in sync
                this.syncInMemoryData(guildId, targetUserId, userData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Basic Info Updated Successfully')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '📝 Name', value: newUsername, inline: true },
                        { name: '🚢 Ship Class', value: newShipClass, inline: true },
                        { name: '⚖️ Tonnage', value: newTonnage.toString(), inline: true },
                        { name: '🚄 Speed', value: `${newSpeed} knots`, inline: true },
                        { name: '✈️ Hangar', value: newHangar.toString(), inline: true },
                        { name: '❤️ HP', value: updatedCharacter.calculatedHP.toString(), inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });

                console.log(`✏️ ${interaction.user.tag} updated basic info for character ${newUsername} (user ${targetUserId})`);
            } else {
                await interaction.reply({
                    content: '❌ Failed to save character data. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling basic character edit:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the character.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleArmorEdit(interaction) {
        try {
            const [, , , guildId, targetUserId, encodedCharName] = interaction.customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const newBeltArmor = parseInt(interaction.fields.getTextInputValue('armor_belt')) || 0;
            const newDeckArmor = parseInt(interaction.fields.getTextInputValue('armor_deck')) || 0;
            const newTurretArmor = parseInt(interaction.fields.getTextInputValue('armor_turret')) || 0;
            const newCalculatedArmor = parseInt(interaction.fields.getTextInputValue('calculated_armor')) || null;

            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const character = userData.characters[characterName];

            // Update armor data
            character.armorThickness = {
                belt: newBeltArmor,
                deck: newDeckArmor,
                turret: newTurretArmor
            };

            if (newCalculatedArmor !== null) {
                character.calculatedArmor = newCalculatedArmor;
            } else {
                // Auto-calculate armor rating
                character.calculatedArmor = Math.floor((newBeltArmor + newDeckArmor + newTurretArmor) / 15);
            }

            // Update stats object
            if (character.stats) {
                character.stats.armor = character.calculatedArmor;
            }

            userData.characters[characterName] = character;

            if (this.setGuildPlayerData(guildId, targetUserId, userData)) {
                // Update the bot's in-memory data to stay in sync
                this.syncInMemoryData(guildId, targetUserId, userData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Armor Updated Successfully')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '🛡️ Belt Armor', value: `${newBeltArmor}mm`, inline: true },
                        { name: '🛡️ Deck Armor', value: `${newDeckArmor}mm`, inline: true },
                        { name: '🛡️ Turret Armor', value: `${newTurretArmor}mm`, inline: true },
                        { name: '📊 Calculated Armor', value: character.calculatedArmor.toString(), inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });

                console.log(`🛡️ ${interaction.user.tag} updated armor for character ${characterName} (user ${targetUserId})`);
            } else {
                await interaction.reply({
                    content: '❌ Failed to save character data. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling armor edit:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the armor.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleStatsEdit(interaction) {
        try {
            const [, , , guildId, targetUserId, encodedCharName] = interaction.customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const newLevel = parseInt(interaction.fields.getTextInputValue('character_level')) || 1;
            const newExperience = parseInt(interaction.fields.getTextInputValue('character_experience')) || 0;
            const newCurrency = parseInt(interaction.fields.getTextInputValue('character_currency')) || 0;
            const newBattles = parseInt(interaction.fields.getTextInputValue('character_battles')) || 0;
            const newVictories = parseInt(interaction.fields.getTextInputValue('character_victories')) || 0;

            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const character = userData.characters[characterName];

            // Update stats data
            character.level = newLevel;
            character.experience = newExperience;
            character.currency = newCurrency;
            character.battles = newBattles;
            character.victories = newVictories;

            userData.characters[characterName] = character;

            if (this.setGuildPlayerData(guildId, targetUserId, userData)) {
                // Update the bot's in-memory data to stay in sync
                this.syncInMemoryData(guildId, targetUserId, userData);

                const winRate = newBattles > 0 ? ((newVictories / newBattles) * 100).toFixed(1) : '0.0';

                const embed = new EmbedBuilder()
                    .setTitle('✅ Stats Updated Successfully')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '⭐ Level', value: newLevel.toString(), inline: true },
                        { name: '📈 Experience', value: newExperience.toString(), inline: true },
                        { name: '💰 Currency', value: newCurrency.toString(), inline: true },
                        { name: '🏆 Battles', value: newBattles.toString(), inline: true },
                        { name: '✅ Victories', value: newVictories.toString(), inline: true },
                        { name: '📊 Win Rate', value: `${winRate}%`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });

                console.log(`📊 ${interaction.user.tag} updated stats for character ${characterName} (user ${targetUserId})`);
            } else {
                await interaction.reply({
                    content: '❌ Failed to save character data. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling stats edit:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the stats.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    recalculateCharacterStats(character) {
        // Recalculate HP
        character.calculatedHP = Math.floor(character.tonnage / 100) + 50;

        // Recalculate speed
        character.calculatedSpeed = Math.floor(character.speedKnots / 5);

        // Recalculate evasion
        const baseEvasion = 0.1;
        const referenceSpeed = 25;
        const referenceSize = 8000;
        const speedFactor = character.speedKnots / referenceSpeed;
        const sizeFactor = referenceSize / character.tonnage;
        const rawEvasion = baseEvasion * speedFactor * sizeFactor;
        const evasionPercentage = Math.min(rawEvasion * 100, 95);

        character.calculatedEvasion = {
            evasionPercentage: parseFloat(evasionPercentage.toFixed(1)),
            speedFactor: parseFloat(speedFactor.toFixed(2)),
            sizeFactor: parseFloat(sizeFactor.toFixed(2)),
            calculation: {
                baseEvasion,
                referenceSpeed,
                referenceSize,
                rawEvasion: parseFloat(rawEvasion.toFixed(3))
            }
        };

        // Update stats object
        if (character.stats) {
            character.stats.health = character.calculatedHP;
            character.stats.speed = character.calculatedSpeed;
            character.stats.evasion = character.calculatedEvasion.evasionPercentage;
        }
    }

    async showWeaponsList(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const weapons = character.weapons || {};
        const weaponCount = Object.keys(weapons).length;

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ Weapons - ${characterName}`)
            .setColor(0x5865F2)
            .setDescription(weaponCount > 0 ? 'Character weapons:' : 'This character has no weapons configured.')
            .setTimestamp();

        if (weaponCount > 0) {
            let weaponInfo = '';
            Object.entries(weapons).forEach(([weaponId, weapon], index) => {
                weaponInfo += `**${index + 1}. ${weapon.name || 'Unknown Weapon'}**\n`;
                weaponInfo += `Type: ${weapon.type || 'Unknown'} | Caliber: ${weapon.caliber || 'Unknown'}\n`;
                weaponInfo += `Damage: ${weapon.damage || 0} | Range: ${weapon.range || 0} | Accuracy: ${weapon.accuracy || 0}\n\n`;
            });

            embed.addFields({
                name: '🔫 Weapon Details',
                value: weaponInfo.slice(0, 1024), // Discord field limit
                inline: false
            });
        }

        embed.setFooter({ text: `Total weapons: ${weaponCount}` });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleCharacterEditSubmit(interaction) {
        try {
            const [, , guildId, targetUserId, encodedCharName] = interaction.customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const newUsername = interaction.fields.getTextInputValue('character_username');
            const newShipClass = interaction.fields.getTextInputValue('character_shipclass');
            const newTonnage = parseInt(interaction.fields.getTextInputValue('character_tonnage')) || 0;
            const newSpeed = parseInt(interaction.fields.getTextInputValue('character_speed')) || 0;
            const newCurrency = parseInt(interaction.fields.getTextInputValue('character_currency')) || 0;

            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const character = userData.characters[characterName];

            // Update character data
            const updatedCharacter = {
                ...character,
                username: newUsername,
                shipClass: newShipClass,
                tonnage: newTonnage,
                speedKnots: newSpeed,
                currency: newCurrency
            };

            // Recalculate stats based on new values
            updatedCharacter.calculatedHP = Math.floor(newTonnage / 100) + 50;
            updatedCharacter.calculatedSpeed = Math.floor(newSpeed / 5);

            // Update evasion calculation
            const baseEvasion = 0.1;
            const referenceSpeed = 25;
            const referenceSize = 8000;
            const speedFactor = newSpeed / referenceSpeed;
            const sizeFactor = referenceSize / newTonnage;
            const rawEvasion = baseEvasion * speedFactor * sizeFactor;
            const evasionPercentage = Math.min(rawEvasion * 100, 95);

            updatedCharacter.calculatedEvasion = {
                evasionPercentage: parseFloat(evasionPercentage.toFixed(1)),
                speedFactor: parseFloat(speedFactor.toFixed(2)),
                sizeFactor: parseFloat(sizeFactor.toFixed(2)),
                calculation: {
                    baseEvasion,
                    referenceSpeed,
                    referenceSize,
                    rawEvasion: parseFloat(rawEvasion.toFixed(3))
                }
            };

            // Update stats object
            if (updatedCharacter.stats) {
                updatedCharacter.stats.health = updatedCharacter.calculatedHP;
                updatedCharacter.stats.speed = updatedCharacter.calculatedSpeed;
                updatedCharacter.stats.evasion = updatedCharacter.calculatedEvasion.evasionPercentage;
            }

            // If username changed, we need to rename the character key
            if (newUsername !== characterName) {
                delete userData.characters[characterName];
                userData.characters[newUsername] = updatedCharacter;

                // Update activeCharacter if it was the renamed character
                if (userData.activeCharacter === characterName) {
                    userData.activeCharacter = newUsername;
                }
            } else {
                userData.characters[characterName] = updatedCharacter;
            }

            if (this.setGuildPlayerData(guildId, targetUserId, userData)) {
                // Update the bot's in-memory data to stay in sync
                this.syncInMemoryData(guildId, targetUserId, userData);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Character Updated Successfully')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '📝 Name', value: newUsername, inline: true },
                        { name: '🚢 Ship Class', value: newShipClass, inline: true },
                        { name: '⚖️ Tonnage', value: newTonnage.toString(), inline: true },
                        { name: '🚄 Speed', value: `${newSpeed} knots`, inline: true },
                        { name: '💰 Currency', value: newCurrency.toString(), inline: true },
                        { name: '❤️ HP', value: updatedCharacter.calculatedHP.toString(), inline: true },
                        { name: '🎯 Evasion', value: `${updatedCharacter.calculatedEvasion.evasionPercentage}%`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });

                console.log(`✏️ ${interaction.user.tag} edited character ${newUsername} for user ${targetUserId}`);
            } else {
                await interaction.reply({
                    content: '❌ Failed to save character data. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling character edit:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the character.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleCharacterDelete(interaction) {
        try {
            const [, , guildId, targetUserId, encodedCharName] = interaction.customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Remove the character
            delete userData.characters[characterName];

            // Clean up activeCharacter if it was the deleted character
            if (userData.activeCharacter === characterName) {
                const remainingCharacters = Object.keys(userData.characters);
                if (remainingCharacters.length > 0) {
                    userData.activeCharacter = remainingCharacters[0];
                    console.log(`🔧 Updated activeCharacter to ${remainingCharacters[0]} after deleting ${characterName} in guild ${guildId}`);
                } else {
                    userData.activeCharacter = null;
                    console.log(`🔧 Cleared activeCharacter after deleting last character ${characterName} in guild ${guildId}`);
                }
            }

            // If no characters left, clean up the player entry
            const saveResult = Object.keys(userData.characters).length === 0
                ? this.setGuildPlayerData(guildId, targetUserId, null)  // Remove user entirely
                : this.setGuildPlayerData(guildId, targetUserId, userData);

            if (saveResult) {
                // Update the bot's in-memory data to stay in sync
                const dataToSync = Object.keys(userData.characters).length === 0 ? null : userData;
                this.syncInMemoryData(guildId, targetUserId, dataToSync);

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ Character Deleted Successfully')
                    .setColor(0xFF0000)
                    .setDescription(`**${characterName}** has been permanently deleted.`)
                    .setTimestamp();

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

                console.log(`🗑️ ${interaction.user.tag} deleted character ${characterName} for user ${targetUserId}`);
            } else {
                await interaction.reply({
                    content: '❌ Failed to save changes. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error('Error handling character deletion:', error);
            await interaction.reply({
                content: '❌ An error occurred while deleting the character.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        const guildId = interaction.guildId;

        if (customId.startsWith('char_edit_')) {
            const [, , customGuildId, targetUserId, charIndex] = customId.split('_');
            const interactionKey = `${customGuildId}_${interaction.user.id}`;
            const characters = this.bot.tempCharacterData?.get(interactionKey);

            if (!characters || !characters[charIndex]) {
                return interaction.reply({
                    content: '❌ Character selection expired. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await this.showCharacterEditOptions(interaction, customGuildId, targetUserId, characters[charIndex].name);
            return true;
        }

        if (customId.startsWith('edit_basic_')) {
            // Check if this is a player creation edit button (format: edit_basic_info_userId)
            if (customId.startsWith('edit_basic_info_')) {
                // This is from player creation, delegate to player creation handler
                await this.bot.playerCreation.handleEditBasicInfo(interaction);
                return true;
            }

            // Otherwise, handle as character management edit button
            const [, , customGuildId, targetUserId, encodedCharName] = customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showBasicEditModal(interaction, customGuildId, targetUserId, characterName);
            return true;
        }

        if (customId.startsWith('edit_armor_')) {
            const [, , customGuildId, targetUserId, encodedCharName] = customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showArmorEditModal(interaction, customGuildId, targetUserId, characterName);
            return true;
        }

        if (customId.startsWith('edit_stats_')) {
            const [, , customGuildId, targetUserId, encodedCharName] = customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showStatsEditModal(interaction, customGuildId, targetUserId, characterName);
            return true;
        }

        if (customId.startsWith('edit_weapons_')) {
            const [, , customGuildId, targetUserId, encodedCharName] = customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showWeaponsEditInterface(interaction, customGuildId, targetUserId, characterName);
            return true;
        }

        if (customId.startsWith('edit_aa_')) {
            const [, , customGuildId, targetUserId, encodedCharName] = customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showAAEditInterface(interaction, customGuildId, targetUserId, characterName);
            return true;
        }

        if (customId.startsWith('back_to_edit_')) {
            const [, , , customGuildId, targetUserId, encodedCharName] = customId.split('_');
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showCharacterEditOptions(interaction, customGuildId, targetUserId, characterName);
            return true;
        }

        if (customId.startsWith('edit_weapon_')) {
            const parts = customId.split('_');
            const customGuildId = parts[2];
            const targetUserId = parts[3];
            const encodedCharName = parts[4];
            const weaponId = parts[5];
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showWeaponEditModal(interaction, customGuildId, targetUserId, characterName, weaponId);
            return true;
        }

        if (customId.startsWith('edit_aa_sys_')) {
            const parts = customId.split('_');
            const customGuildId = parts[3];
            const targetUserId = parts[4];
            const encodedCharName = parts[5];
            const aaIndex = parseInt(parts[6]);
            const characterName = Buffer.from(encodedCharName, 'base64').toString();
            await this.showAAEditModal(interaction, customGuildId, targetUserId, characterName, aaIndex);
            return true;
        }

        if (customId.startsWith('add_weapon_') || customId.startsWith('clear_weapons_') || customId.startsWith('add_aa_') || customId.startsWith('clear_aa_')) {
            await interaction.reply({
                content: '⚠️ This feature is not yet implemented. Adding/clearing all weapons and AA systems will be added in a future update.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        if (customId.startsWith('char_delete_')) {
            const [, , customGuildId, targetUserId, charIndex] = customId.split('_');
            const interactionKey = `${customGuildId}_${interaction.user.id}`;
            const characters = this.bot.tempCharacterData?.get(interactionKey);

            if (!characters || !characters[charIndex]) {
                return interaction.reply({
                    content: '❌ Character selection expired. Please try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await this.showDeleteConfirmation(interaction, customGuildId, targetUserId, characters[charIndex].name);
            return true;
        }

        if (customId.startsWith('confirm_delete_')) {
            await this.handleCharacterDelete(interaction);
            return true;
        }

        if (customId === 'cancel_delete') {
            await interaction.update({
                content: '❌ Character deletion cancelled.',
                embeds: [],
                components: []
            });
            return true;
        }

        return false;
    }

    async handleModalSubmit(interaction) {
        const customId = interaction.customId;

        if (customId.startsWith('edit_char_')) {
            await this.handleCharacterEditSubmit(interaction);
            return true;
        }

        if (customId.startsWith('edit_char_basic_')) {
            await this.handleBasicCharacterEdit(interaction);
            return true;
        }

        if (customId.startsWith('edit_char_armor_')) {
            await this.handleArmorEdit(interaction);
            return true;
        }

        if (customId.startsWith('edit_char_stats_')) {
            await this.handleStatsEdit(interaction);
            return true;
        }

        if (customId.startsWith('edit_weapon_modal_')) {
            await this.handleWeaponEdit(interaction);
            return true;
        }

        if (customId.startsWith('edit_aa_modal_')) {
            await this.handleAAEdit(interaction);
            return true;
        }

        return false; // Not handled by character manager
    }

    // List all characters for a user (utility function)
    async listCharacters(interaction, targetUser) {
        const targetUserId = targetUser.id;
        const guildId = interaction.guildId;
        const characters = this.getPlayerCharacters(guildId, targetUserId);

        if (characters.length === 0) {
            return interaction.reply({
                content: `📝 ${targetUser.tag} has no characters in this guild.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 ${targetUser.tag}'s Characters`)
            .setColor(0x5865F2)
            .setTimestamp();

        let description = '';
        characters.forEach((char, index) => {
            const data = char.data;
            description += `**${index + 1}. ${char.name}**\n`;
            description += `🚢 ${data.shipClass || 'Unknown'} | ⚖️ ${data.tonnage || 0}t | 🚄 ${data.speedKnots || 0}kn\n`;
            description += `❤️ ${data.calculatedHP || 0} HP | 💰 ${data.currency || 0} Currency | ⭐ Level ${data.level || 1}\n\n`;
        });

        embed.setDescription(description);
        embed.setFooter({ text: `Total characters: ${characters.length}` });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async showWeaponsEditInterface(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const weapons = character.weapons || {};
        const weaponCount = Object.keys(weapons).length;

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ Weapons - ${characterName}`)
            .setColor(0x5865F2)
            .setDescription(weaponCount > 0 ? 'Character weapons (click to edit):' : 'This character has no weapons configured.')
            .setTimestamp();

        const components = [];

        if (weaponCount > 0) {
            let weaponInfo = '';
            const weaponEntries = Object.entries(weapons);

            weaponEntries.forEach(([weaponId, weapon], index) => {
                weaponInfo += `**${index + 1}. ${weapon.name || 'Unknown Weapon'}**\n`;
                weaponInfo += `Type: ${weapon.type || 'Unknown'} | Caliber: ${weapon.caliber || 'Unknown'}\n`;
                weaponInfo += `Damage: ${weapon.damage || 0} | Range: ${weapon.range || 0} | Accuracy: ${weapon.accuracy || 0}\n\n`;
            });

            embed.addFields({
                name: '🔫 Weapon Details',
                value: weaponInfo.slice(0, 1024), // Discord field limit
                inline: false
            });

            // Create individual edit buttons for each weapon (up to 20 weapons to fit Discord's limits)
            const weaponButtons = [];
            weaponEntries.slice(0, 20).forEach(([weaponId, weapon], index) => {
                const weaponButton = new ButtonBuilder()
                    .setCustomId(`edit_weapon_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}_${weaponId}`)
                    .setLabel(`Edit ${weapon.name ? weapon.name.slice(0, 15) : `Weapon ${index + 1}`}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️');
                weaponButtons.push(weaponButton);
            });

            // Split weapons into rows of 5 buttons each (Discord's limit per row)
            for (let i = 0; i < weaponButtons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(weaponButtons.slice(i, i + 5));
                components.push(row);
            }
        }

        embed.setFooter({ text: `Total weapons: ${weaponCount}` });

        const addWeaponButton = new ButtonBuilder()
            .setCustomId(`add_weapon_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Add Weapon')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');

        const clearWeaponsButton = new ButtonBuilder()
            .setCustomId(`clear_weapons_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Clear All Weapons')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️');

        const backButton = new ButtonBuilder()
            .setCustomId(`back_to_edit_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Back to Character Edit')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️');

        const mainActionRow = new ActionRowBuilder().addComponents(addWeaponButton, clearWeaponsButton, backButton);
        components.push(mainActionRow);

        await interaction.reply({
            embeds: [embed],
            components: components,
            flags: MessageFlags.Ephemeral
        });
    }

    async showAAEditInterface(interaction, guildId, targetUserId, characterName) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];

        const aaSystems = character.aaSystems || [];
        const aaCount = aaSystems.length;

        const embed = new EmbedBuilder()
            .setTitle(`🎯 AA Systems - ${characterName}`)
            .setColor(0x5865F2)
            .setDescription(aaCount > 0 ? 'Character AA systems (click to edit):' : 'This character has no AA systems configured.')
            .setTimestamp();

        const components = [];

        if (aaCount > 0) {
            let aaInfo = '';
            aaSystems.forEach((aa, index) => {
                aaInfo += `**${index + 1}. ${aa.name || 'Unknown AA System'}**\n`;
                aaInfo += `Caliber: ${aa.caliber || 'Unknown'} | Mount: ${aa.mountType || 'Unknown'}\n`;
                aaInfo += `Damage: ${aa.damage || 0} | Range: ${aa.range || 0} | Accuracy: ${aa.accuracy || 0}\n\n`;
            });

            embed.addFields({
                name: '🎯 AA System Details',
                value: aaInfo.slice(0, 1024), // Discord field limit
                inline: false
            });

            // Create individual edit buttons for each AA system (up to 20 to fit Discord's limits)
            const aaButtons = [];
            aaSystems.slice(0, 20).forEach((aa, index) => {
                const aaButton = new ButtonBuilder()
                    .setCustomId(`edit_aa_sys_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}_${index}`)
                    .setLabel(`Edit ${aa.name ? aa.name.slice(0, 15) : `AA ${index + 1}`}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️');
                aaButtons.push(aaButton);
            });

            // Split AA systems into rows of 5 buttons each (Discord's limit per row)
            for (let i = 0; i < aaButtons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(aaButtons.slice(i, i + 5));
                components.push(row);
            }
        }

        embed.setFooter({ text: `Total AA systems: ${aaCount}` });

        const addAAButton = new ButtonBuilder()
            .setCustomId(`add_aa_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Add AA System')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');

        const clearAAButton = new ButtonBuilder()
            .setCustomId(`clear_aa_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Clear All AA')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️');

        const backButton = new ButtonBuilder()
            .setCustomId(`back_to_edit_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}`)
            .setLabel('Back to Character Edit')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️');

        const mainActionRow = new ActionRowBuilder().addComponents(addAAButton, clearAAButton, backButton);
        components.push(mainActionRow);

        await interaction.reply({
            embeds: [embed],
            components: components,
            flags: MessageFlags.Ephemeral
        });
    }

    async showWeaponEditModal(interaction, guildId, targetUserId, characterName, weaponId) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];
        const weapon = character.weapons?.[weaponId];

        if (!weapon) {
            return interaction.reply({
                content: '❌ Weapon not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit_weapon_modal_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}_${weaponId}`)
            .setTitle(`✏️ Edit Weapon - ${weapon.name || 'Unknown'}`);

        const nameInput = new TextInputBuilder()
            .setCustomId('weapon_name')
            .setLabel('Weapon Name')
            .setStyle(TextInputStyle.Short)
            .setValue(weapon.name || '')
            .setRequired(true)
            .setMaxLength(50);

        const typeInput = new TextInputBuilder()
            .setCustomId('weapon_type')
            .setLabel('Type (main/secondary/torpedo)')
            .setStyle(TextInputStyle.Short)
            .setValue(weapon.type || '')
            .setRequired(true)
            .setMaxLength(20);

        const caliberInput = new TextInputBuilder()
            .setCustomId('weapon_caliber')
            .setLabel('Caliber (e.g., 127mm, 533mm)')
            .setStyle(TextInputStyle.Short)
            .setValue(weapon.caliber || '')
            .setRequired(true)
            .setMaxLength(20);

        const damageInput = new TextInputBuilder()
            .setCustomId('weapon_damage')
            .setLabel('Damage')
            .setStyle(TextInputStyle.Short)
            .setValue(weapon.damage?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const rangeInput = new TextInputBuilder()
            .setCustomId('weapon_range')
            .setLabel('Range')
            .setStyle(TextInputStyle.Short)
            .setValue(weapon.range?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(caliberInput),
            new ActionRowBuilder().addComponents(damageInput),
            new ActionRowBuilder().addComponents(rangeInput)
        );

        await interaction.showModal(modal);
    }

    async showAAEditModal(interaction, guildId, targetUserId, characterName, aaIndex) {
        const userData = this.getGuildPlayerData(guildId, targetUserId);

        if (!userData || !userData.characters || !userData.characters[characterName]) {
            return interaction.reply({
                content: '❌ Character not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const character = userData.characters[characterName];
        const aaSystem = character.aaSystems?.[aaIndex];

        if (!aaSystem) {
            return interaction.reply({
                content: '❌ AA system not found!',
                flags: MessageFlags.Ephemeral
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit_aa_modal_${guildId}_${targetUserId}_${Buffer.from(characterName).toString('base64')}_${aaIndex}`)
            .setTitle(`✏️ Edit AA System - ${aaSystem.name || 'Unknown'}`);

        const nameInput = new TextInputBuilder()
            .setCustomId('aa_name')
            .setLabel('AA System Name')
            .setStyle(TextInputStyle.Short)
            .setValue(aaSystem.name || '')
            .setRequired(true)
            .setMaxLength(50);

        const caliberInput = new TextInputBuilder()
            .setCustomId('aa_caliber')
            .setLabel('Caliber (e.g., 127mm, 40mm)')
            .setStyle(TextInputStyle.Short)
            .setValue(aaSystem.caliber || '')
            .setRequired(true)
            .setMaxLength(20);

        const mountInput = new TextInputBuilder()
            .setCustomId('aa_mount')
            .setLabel('Mount Type (single/twin/triple/quad)')
            .setStyle(TextInputStyle.Short)
            .setValue(aaSystem.mountType || '')
            .setRequired(true)
            .setMaxLength(20);

        const damageInput = new TextInputBuilder()
            .setCustomId('aa_damage')
            .setLabel('Damage')
            .setStyle(TextInputStyle.Short)
            .setValue(aaSystem.damage?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        const rangeInput = new TextInputBuilder()
            .setCustomId('aa_range')
            .setLabel('Range')
            .setStyle(TextInputStyle.Short)
            .setValue(aaSystem.range?.toString() || '0')
            .setRequired(true)
            .setMaxLength(10);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(caliberInput),
            new ActionRowBuilder().addComponents(mountInput),
            new ActionRowBuilder().addComponents(damageInput),
            new ActionRowBuilder().addComponents(rangeInput)
        );

        await interaction.showModal(modal);
    }

    async handleWeaponEdit(interaction) {
        try {
            const parts = interaction.customId.split('_');
            const guildId = parts[3];
            const targetUserId = parts[4];
            const encodedCharName = parts[5];
            const weaponId = parts[6];
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const newName = interaction.fields.getTextInputValue('weapon_name');
            const newType = interaction.fields.getTextInputValue('weapon_type').toLowerCase();
            const newCaliber = interaction.fields.getTextInputValue('weapon_caliber');
            const newDamage = parseInt(interaction.fields.getTextInputValue('weapon_damage'));
            const newRange = parseInt(interaction.fields.getTextInputValue('weapon_range'));

            // Validate inputs
            const validTypes = ['main', 'secondary', 'torpedo'];
            if (!validTypes.includes(newType)) {
                return interaction.reply({
                    content: `❌ Invalid weapon type! Must be one of: ${validTypes.join(', ')}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (isNaN(newDamage) || isNaN(newRange) || newDamage < 0 || newRange < 0) {
                return interaction.reply({
                    content: '❌ Damage and Range must be valid numbers!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Load and update data
            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const character = userData.characters[characterName];

            if (!character.weapons || !character.weapons[weaponId]) {
                return interaction.reply({
                    content: '❌ Weapon not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Update weapon
            character.weapons[weaponId] = {
                ...character.weapons[weaponId],
                name: newName,
                type: newType,
                caliber: newCaliber,
                damage: newDamage,
                range: newRange
            };

            // Save changes
            if (!this.setGuildPlayerData(guildId, targetUserId, userData)) {
                return interaction.reply({
                    content: '❌ Failed to save weapon changes!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Update the bot's in-memory data to stay in sync
            this.syncInMemoryData(guildId, targetUserId, userData);

            await interaction.reply({
                content: `✅ Successfully updated weapon "${newName}"!`,
                flags: MessageFlags.Ephemeral
            });

            console.log(`✏️ ${interaction.user.tag} edited weapon ${newName} for character ${characterName} (user ${targetUserId})`);

        } catch (error) {
            console.error('Error in handleWeaponEdit:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the weapon.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleAAEdit(interaction) {
        try {
            const parts = interaction.customId.split('_');
            const guildId = parts[3];
            const targetUserId = parts[4];
            const encodedCharName = parts[5];
            const aaIndex = parseInt(parts[6]);
            const characterName = Buffer.from(encodedCharName, 'base64').toString();

            const newName = interaction.fields.getTextInputValue('aa_name');
            const newCaliber = interaction.fields.getTextInputValue('aa_caliber');
            const newMount = interaction.fields.getTextInputValue('aa_mount').toLowerCase();
            const newDamage = parseInt(interaction.fields.getTextInputValue('aa_damage'));
            const newRange = parseInt(interaction.fields.getTextInputValue('aa_range'));

            // Validate inputs
            const validMounts = ['single', 'twin', 'triple', 'quad', 'sextuple', 'octuple'];
            if (!validMounts.includes(newMount)) {
                return interaction.reply({
                    content: `❌ Invalid mount type! Must be one of: ${validMounts.join(', ')}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (isNaN(newDamage) || isNaN(newRange) || newDamage < 0 || newRange < 0) {
                return interaction.reply({
                    content: '❌ Damage and Range must be valid numbers!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Load and update data
            const userData = this.getGuildPlayerData(guildId, targetUserId);

            if (!userData || !userData.characters || !userData.characters[characterName]) {
                return interaction.reply({
                    content: '❌ Character not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const character = userData.characters[characterName];

            if (!character.aaSystems || !character.aaSystems[aaIndex]) {
                return interaction.reply({
                    content: '❌ AA system not found!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Update AA system
            character.aaSystems[aaIndex] = {
                ...character.aaSystems[aaIndex],
                name: newName,
                caliber: newCaliber,
                mountType: newMount,
                damage: newDamage,
                range: newRange
            };

            // Save changes
            if (!this.setGuildPlayerData(guildId, targetUserId, userData)) {
                return interaction.reply({
                    content: '❌ Failed to save AA system changes!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Update the bot's in-memory data to stay in sync
            this.syncInMemoryData(guildId, targetUserId, userData);

            await interaction.reply({
                content: `✅ Successfully updated AA system "${newName}"!`,
                flags: MessageFlags.Ephemeral
            });

            console.log(`✏️ ${interaction.user.tag} edited AA system ${newName} for character ${characterName} (user ${targetUserId})`);

        } catch (error) {
            console.error('Error in handleAAEdit:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the AA system.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

module.exports = CharacterManager;