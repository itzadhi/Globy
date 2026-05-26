const { SlashCommandBuilder } = require('discord.js');
const { assertPurgePermissions, purgeMessages } = require('../../services/purgeService');
const { panelPayload } = require('../../utils/componentsV2');
const { config } = require('../../config/env');

module.exports = {
  category: 'Moderation',
  devOnly: true,
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages from this channel.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many recent messages to delete.')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Only delete messages from this user.')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason for the purge log.')
        .setMaxLength(300)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await interaction.guild.members.fetchMe().catch(() => null);
    assertPurgePermissions(interaction.member, interaction.channel);

    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const result = await purgeMessages({
      channel: interaction.channel,
      amount,
      user,
      moderator: interaction.user,
      reason
    });

    await interaction.editReply(panelPayload({
      title: 'Purge Complete',
      description: `Deleted **${result.deleted}** recent message${result.deleted === 1 ? '' : 's'} from this channel.`,
      accentColor: config.colors.success,
      ephemeral: true,
      fields: [
        { name: 'Requested', value: `${result.requested}` },
        { name: 'Deleted', value: `${result.deleted}` },
        { name: 'Filter', value: user ? `${user.tag || user.username}` : 'All users' },
        { name: 'Reason', value: reason }
      ]
    }));
  }
};
