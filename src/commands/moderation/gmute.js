const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { discordTimestamp } = require('../../utils/time');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('gmute')
    .setDescription('Globally mute a user from Globy CV2 networks.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to mute.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Why this user is muted.').setRequired(true).setMaxLength(500)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Optional duration like 10m, 2h, or 7d.').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseGlobalModeration(interaction.member, interaction.guild)) {
      throw new Error('You need Administrator permission, server ownership, or developer access to use global moderation.');
    }

    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) throw new Error('You cannot globally mute yourself.');

    const record = await createRestriction({
      target,
      type: 'mute',
      reason: interaction.options.getString('reason'),
      duration: interaction.options.getString('duration'),
      moderator: interaction.user,
      guildId: interaction.guildId
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`${emojis.warn} Global Mute Added`)
      .setDescription(`${target} cannot send messages through Globy CV2 networks.`)
      .addFields(
        { name: 'Reason', value: record.reason, inline: false },
        { name: 'Expires', value: record.expiresAt ? discordTimestamp(record.expiresAt, 'R') : 'Never', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};
