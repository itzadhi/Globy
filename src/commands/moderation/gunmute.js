const { SlashCommandBuilder } = require('discord.js');
const { liftRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const { successPanel } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  data: new SlashCommandBuilder()
    .setName('gunmute')
    .setDescription('Remove a global mute.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to unmute.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Why this mute is being lifted.').setRequired(false).setMaxLength(500)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseGlobalModeration(interaction.member, interaction.guild)) {
      throw new Error('Only configured bot developers can use global moderation.');
    }

    const target = interaction.options.getUser('user');
    const modified = await liftRestriction({
      targetId: target.id,
      type: 'mute',
      moderator: interaction.user,
      reason: interaction.options.getString('reason'),
      guildId: interaction.guildId
    });

    if (!modified) throw new Error('That user does not have an active global mute.');

    await interaction.editReply(successPanel(`${emojis.shield} Global Mute Removed`, `${target} can send through Globy CV2 synced chat again.`, {
      ephemeral: true
    }));
  }
};
