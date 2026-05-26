const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getLeaderboard } = require('../../services/profileService');
const { createLeaderboardCard } = require('../../canvas/cardRenderer');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  category: 'Profile',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the global XP leaderboard.')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('How many users to show.')
        .setMinValue(3)
        .setMaxValue(15)
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();
    const limit = interaction.options.getInteger('limit') || 10;
    const entries = await getLeaderboard(limit);

    if (!entries.length) {
      await interaction.editReply({
        embeds: [infoEmbed('Leaderboard Empty', 'No profiles have earned XP yet.', client)]
      });
      return;
    }

    const buffer = await createLeaderboardCard(entries);
    const attachment = new AttachmentBuilder(buffer, { name: 'globy-leaderboard.png' });
    await interaction.editReply({ files: [attachment] });
  }
};
