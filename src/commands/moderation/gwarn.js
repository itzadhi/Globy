const { SlashCommandBuilder } = require('discord.js');
const { createRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const { panelPayload } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  devOnly: true,
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
      throw new Error('Only configured bot developers can use global moderation.');
    }

    const target = interaction.options.getUser('user');
    const record = await createRestriction({
      target,
      type: 'warn',
      reason: interaction.options.getString('reason'),
      moderator: interaction.user,
      guildId: interaction.guildId
    });

    await interaction.editReply(panelPayload({
      title: `${emojis.warn} Global Warning Recorded`,
      description: `${target} now has a global warning on record.`,
      accentColor: config.colors.warning,
      ephemeral: true,
      fields: [{ name: 'Reason', value: record.reason }]
    }));
  }
};
