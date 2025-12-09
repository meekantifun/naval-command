const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weblink')
    .setDescription('Get the web interface link for this game'),

  async execute(interaction) {
    const channelId = interaction.channelId;
    const webUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Check if there's an active game in this channel
    const bot = interaction.client.navalBot;
    const game = bot.games.get(channelId);

    if (!game) {
      return interaction.reply({
        content: '❌ No active game in this channel. Start a game first!',
        ephemeral: true
      });
    }

    // Generate the direct link to this game
    const gameLink = `${webUrl}?game=${channelId}`;

    await interaction.reply({
      embeds: [{
        color: 0x4facfe,
        title: '🌐 Web Interface Link',
        description: 'Click the link below to access the interactive map interface!',
        fields: [
          {
            name: '🔗 Game Link',
            value: `[Click here to open the game](${gameLink})`,
            inline: false
          },
          {
            name: '📋 Features',
            value: '• Click-to-move ships\n• Visual map interface\n• Real-time updates\n• Attack from the map\n• Mobile-friendly',
            inline: false
          },
          {
            name: 'ℹ️ Note',
            value: 'You need to log in with your Discord account to access the game.',
            inline: false
          }
        ],
        footer: {
          text: 'Both Discord commands and the web interface work together!'
        }
      }],
      ephemeral: false
    });
  }
};
