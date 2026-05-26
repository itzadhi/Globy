const { SlashCommandBuilder } = require('discord.js');
const { buildHelpHomePayload, wireHelpCollector } = require('../../services/helpMenuService');

module.exports = {
  category: 'General',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the interactive Globy CV2 help menu.'),

  async execute(interaction) {
    const response = await interaction.reply({
      ...buildHelpHomePayload(interaction.client, { ephemeral: true }),
      fetchReply: true
    });

    wireHelpCollector(response, interaction.user.id, interaction.client, { ephemeral: true });
  }
};
