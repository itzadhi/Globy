const { SlashCommandBuilder } = require('discord.js');
const { createRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { discordTimestamp } = require('../../utils/time');
const { config } = require('../../config/env');
const { panelPayload } = require('../../utils/componentsV2');

module.exports = {
  category: 'Moderation',
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName('gban')
    .setDescription('Globally ban a user from Globy CV2 synced chat.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Why this user is banned.').setRequired(true).setMaxLength(500)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Optional duration like 1h, 7d, or 30d.').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseGlobalModeration(interaction.member, interaction.guild)) {
      throw new Error('Only configured bot developers can use global moderation.');
    }

    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) throw new Error('You cannot globally ban yourself.');

    const record = await createRestriction({
      target,
      type: 'ban',
      reason: interaction.options.getString('reason'),
      duration: interaction.options.getString('duration'),
      moderator: interaction.user,
      guildId: interaction.guildId
    });

    await interaction.editReply(panelPayload({
      title: 'Global Ban Added',
      description: `${target} is blocked from CV2 sync.`,
      accentColor: config.colors.error,
      ephemeral: true,
      fields: [
        { name: 'Reason', value: record.reason },
        { name: 'Expires', value: record.expiresAt ? discordTimestamp(record.expiresAt, 'R') : 'Never' }
      ]
    }));
  }
};
