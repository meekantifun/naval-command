// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CHARACTER COMMANDS                                 ║
// ║                   Slash commands for character management                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

class CharacterCommands {
    constructor(bot) {
        this.bot = bot;
    }

    getCommands() {
        return [
            new SlashCommandBuilder()
                .setName('editchar')
                .setDescription('Edit a player\'s character')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose character you want to edit')
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('deletechar')
                .setDescription('Delete a player\'s character')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose character you want to delete')
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .setDMPermission(false),

            new SlashCommandBuilder()
                .setName('listchars')
                .setDescription('List all characters for a player')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose characters you want to list')
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .setDMPermission(false)
        ];
    }

    async handleCharacterCommand(interaction) {
        const { commandName } = interaction;

        console.log(`🎮 Handling character command: ${commandName} by ${interaction.user.tag}`);

        try {
            // Check staff permissions for all character management commands
            if (!this.bot.hasStaffPermission(interaction.member)) {
                return interaction.reply({
                    content: '❌ You need staff permissions to use character management commands.\n\n' +
                             'Contact an administrator to:\n' +
                             '• Give you the configured staff role, or\n' +
                             '• Give you Manage Messages permission',
                    flags: MessageFlags.Ephemeral
                });
            }

            switch (commandName) {
                case 'editchar':
                    console.log(`✏️ Processing editchar command`);
                    await this.bot.characterManager.editCharacterCommand(interaction);
                    break;

                case 'deletechar':
                    await this.bot.characterManager.deleteCharacterCommand(interaction);
                    break;

                case 'listchars':
                    const targetUser = interaction.options.getUser('user');
                    await this.bot.characterManager.listCharacters(interaction, targetUser);
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Unknown character command!',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error(`Error handling character command ${commandName}:`, error);
            const reply = { content: 'An error occurred while processing the character command.', flags: MessageFlags.Ephemeral };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
}

module.exports = CharacterCommands;