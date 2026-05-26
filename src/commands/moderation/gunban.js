const { SlashCommandBuilder } = require('discord.js');
const { liftRestriction } = require('../../services/blacklistService');
const { canUseGlobalModeration } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const { successPanel } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Moderation',
  devOnly: true,
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
      throw new Error('Only configured bot developers can use global moderation.');
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

    await interaction.editReply(successPanel(`${emojis.shield} Global Ban Removed`, `${target} can use Globy CV2 synced chat again.`, {
      ephemeral: true
    }));
  }
};
