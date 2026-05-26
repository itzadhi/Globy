const { SlashCommandBuilder } = require('discord.js');
const { createRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { discordTimestamp } = require('../../utils/time');
const { config } = require('../../config/env');
const { panelPayload } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName('gmute')
    .setDescription('Globally mute a user from Globy CV2 synced chat.')
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
      throw new Error('Only configured bot developers can use global moderation.');
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

    await interaction.editReply(panelPayload({
      title: `${emojis.warn} Global Mute Added`,
      description: `${target} cannot send messages through Globy CV2 synced chat.`,
      accentColor: config.colors.warning,
      ephemeral: true,
      fields: [
        { name: 'Reason', value: record.reason },
        { name: 'Expires', value: record.expiresAt ? discordTimestamp(record.expiresAt, 'R') : 'Never' }
      ]
    }));
  }
};
