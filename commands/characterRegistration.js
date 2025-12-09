// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      CHARACTER REGISTRATION COMMANDS                         ║
// ║                  Register characters from Google Sheets                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

class CharacterRegistration {
    constructor(bot) {
        this.bot = bot;
    }

    getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('register')
                .setDescription('Register a character from a Google Sheets template')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to register the character for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('sheet_url')
                        .setDescription('Google Sheets URL containing the character data')
                        .setRequired(true)),

            new SlashCommandBuilder()
                .setName('setmastersheet')
                .setDescription('Set the master character sheet for this server')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addStringOption(option =>
                    option.setName('sheet_url')
                        .setDescription('Google Sheets URL for the master character log')
                        .setRequired(true)),

            new SlashCommandBuilder()
                .setName('template')
                .setDescription('Get the link to the character sheet template')
        ];
    }

    async handleRegister(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Check staff permissions
            if (!this.bot.hasStaffPermission(interaction.member)) {
                return interaction.editReply({
                    content: '❌ You need staff permissions to register characters.\n\n' +
                             'Contact an administrator to:\n' +
                             '• Give you the configured staff role, or\n' +
                             '• Give you Manage Messages permission'
                });
            }

            const targetUser = interaction.options.getUser('user');
            const sheetUrl = interaction.options.getString('sheet_url');
            const guildId = interaction.guildId;

            // Check if Google Sheets is initialized
            if (!this.bot.sheetsManager || !this.bot.sheetsManager.initialized) {
                return interaction.editReply({
                    content: '❌ Google Sheets integration is not set up. Please contact the bot administrator.\n\n' +
                             '**Setup Instructions:**\n' +
                             '1. Create a Google Cloud Project\n' +
                             '2. Enable Google Sheets API\n' +
                             '3. Create a service account and download credentials\n' +
                             '4. Place credentials at `config/google-credentials.json`\n' +
                             '5. Restart the bot'
                });
            }

            // Read character data from sheet
            await interaction.editReply({ content: '📊 Reading character sheet...' });
            const characterData = await this.bot.sheetsManager.readCharacterSheet(guildId, sheetUrl);

            // Add user ID to character data
            characterData.id = targetUser.id;

            // Check if user already has characters
            const existingPlayer = this.bot.getGuildPlayerData(guildId, targetUser.id);
            if (existingPlayer && existingPlayer.characters) {
                if (existingPlayer.characters.size >= (existingPlayer.maxCharacters || 2)) {
                    return interaction.editReply({
                        content: `❌ ${targetUser.tag} already has the maximum number of characters (${existingPlayer.maxCharacters || 2}).\n` +
                                 'Delete an existing character first using `/deletechar`.'
                    });
                }

                // Check for duplicate character name
                if (existingPlayer.characters.has(characterData.username)) {
                    return interaction.editReply({
                        content: `❌ ${targetUser.tag} already has a character named "${characterData.username}".\n` +
                                 'Please use a different character name or delete the existing one.'
                    });
                }
            }

            // Save to playerData
            await interaction.editReply({ content: '💾 Saving character data...' });
            let playerEntry = existingPlayer || {
                characters: new Map(),
                activeCharacter: null,
                maxCharacters: 2
            };

            playerEntry.characters.set(characterData.username, characterData);
            if (!playerEntry.activeCharacter) {
                playerEntry.activeCharacter = characterData.username;
            }

            this.bot.setGuildPlayerData(guildId, targetUser.id, playerEntry);
            this.bot.savePlayerData();

            // Write to master sheet
            await interaction.editReply({ content: '📝 Updating master sheet...' });
            await this.bot.sheetsManager.writeToMasterSheet(guildId, characterData);

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Character Registered Successfully')
                .setColor(0x00FF00)
                .setDescription(`Character **${characterData.username}** has been registered for ${targetUser}`)
                .addFields(
                    { name: '🚢 Ship Class', value: characterData.shipClass, inline: true },
                    { name: '⚖️ Tonnage', value: characterData.tonnage.toLocaleString() + ' tons', inline: true },
                    { name: '🚄 Speed', value: characterData.speedKnots + ' knots', inline: true },
                    { name: '❤️ HP', value: characterData.calculatedHP.toString(), inline: true },
                    { name: '🛡️ Armor', value: characterData.calculatedArmor.toString(), inline: true },
                    { name: '🎯 Evasion', value: characterData.calculatedEvasion.evasionPercentage + '%', inline: true },
                    { name: '⚔️ Weapons', value: Object.keys(characterData.weapons).length.toString(), inline: true },
                    { name: '🎯 AA Systems', value: characterData.aaSystems.length.toString(), inline: true },
                    { name: '⭐ Level', value: characterData.level.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Registered by ${interaction.user.tag}` });

            // Add aircraft info if carrier
            if (characterData.availableAircraft.size > 0) {
                embed.addFields({
                    name: '✈️ Aircraft Types',
                    value: Array.from(characterData.availableAircraft.keys()).join(', ')
                });
            }

            await interaction.editReply({ content: null, embeds: [embed] });

            console.log(`✅ Character ${characterData.username} registered for ${targetUser.tag} in guild ${guildId}`);

        } catch (error) {
            console.error('Error in handleRegister:', error);
            await interaction.editReply({
                content: `❌ Failed to register character: ${error.message}\n\n` +
                         '**Common Issues:**\n' +
                         '• Sheet is not shared with the service account\n' +
                         '• Sheet structure doesn\'t match the template\n' +
                         '• Invalid Google Sheets URL\n' +
                         '• Missing required fields in the sheet'
            });
        }
    }

    async handleSetMasterSheet(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const sheetUrl = interaction.options.getString('sheet_url');
            const guildId = interaction.guildId;

            if (!this.bot.sheetsManager || !this.bot.sheetsManager.initialized) {
                return interaction.editReply({
                    content: '❌ Google Sheets integration is not set up.'
                });
            }

            const spreadsheetId = await this.bot.sheetsManager.setMasterSheetId(guildId, sheetUrl);

            await interaction.editReply({
                content: `✅ Master character sheet has been set for this server!\n\n` +
                         `📊 Sheet ID: \`${spreadsheetId}\`\n\n` +
                         `All registered characters will now be logged to this sheet.`
            });

            console.log(`✅ Master sheet set for guild ${guildId}: ${spreadsheetId}`);

        } catch (error) {
            console.error('Error in handleSetMasterSheet:', error);
            await interaction.editReply({
                content: `❌ Failed to set master sheet: ${error.message}`
            });
        }
    }

    async handleTemplate(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📋 Character Sheet Template')
            .setColor(0x5865F2)
            .setDescription('Use this template to create your character sheet:')
            .addFields(
                {
                    name: '📄 Template Link',
                    value: '[Click here to make a copy of the template](https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_ID/copy)\n\n' +
                           '*Replace `YOUR_TEMPLATE_ID` with your actual template spreadsheet ID*'
                },
                {
                    name: '📝 Instructions',
                    value: '1. **Make a copy** of the template (File → Make a copy)\n' +
                           '2. **Fill in your character data** in the template\n' +
                           '3. **Share the sheet** with view access to the service account email\n' +
                           '4. **Copy the sheet URL** and give it to a GM\n' +
                           '5. GM runs `/register @you [sheet_url]`'
                },
                {
                    name: '🔧 Required Sheets',
                    value: '• **Character Info** - Basic stats and information\n' +
                           '• **Weapons** - Main guns, secondaries, torpedoes\n' +
                           '• **AA Systems** - Anti-aircraft defenses\n' +
                           '• **Aircraft** - For carriers only'
                },
                {
                    name: '⚠️ Important',
                    value: '• Do NOT change sheet names\n' +
                           '• Do NOT move required cells\n' +
                           '• Fill in ALL required fields\n' +
                           '• Make sure sheet is shared properly'
                }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

module.exports = CharacterRegistration;
