const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { liftRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('gunban')
    .setDescription('Remove a global ban.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to unban.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Why this ban is being lifted.').setRequired(false).setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseGlobalModeration(interaction.member, interaction.guild)) {
      throw new Error('You need Administrator permission, server ownership, or developer access to use global moderation.');
    }

    const target = interaction.options.getUser('user');
    const modified = await liftRestriction({
      targetId: target.id,
      type: 'ban',
      moderator: interaction.user,
      reason: interaction.options.getString('reason'),
      guildId: interaction.guildId
    });

    if (!modified) throw new Error('That user does not have an active global ban.');

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${emojis.shield} Global Ban Removed`)
      .setDescription(`${target} can use Globy CV2 networks again.`);

    await interaction.editReply({ embeds: [embed] });
  }
};
