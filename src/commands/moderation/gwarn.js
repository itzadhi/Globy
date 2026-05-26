const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('gwarn')
    .setDescription('Record a global warning for a user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to warn.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Why this user is being warned.').setRequired(true).setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseGlobalModeration(interaction.member, interaction.guild)) {
      throw new Error('You need Administrator permission, server ownership, or developer access to use global moderation.');
    }

    const target = interaction.options.getUser('user');
    const record = await createRestriction({
      target,
      type: 'warn',
      reason: interaction.options.getString('reason'),
      moderator: interaction.user,
      guildId: interaction.guildId
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`${emojis.warn} Global Warning Recorded`)
      .setDescription(`${target} now has a global warning on record.`)
      .addFields({ name: 'Reason', value: record.reason, inline: false });

    await interaction.editReply({ embeds: [embed] });
  }
};
