const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { recoverNetwork } = require('../../services/recoveryService');
const { logRecoverySession } = require('../../services/loggingService');
const { isOwnerOrAdmin } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const { panelPayload } = require('../../utils/componentsV2');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('recovermessages')
    .setDescription('Recover deleted or missing webhook messages from MongoDB logs.')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('How many original messages to scan.')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName('source_channel')
        .setDescription('Recover only messages originally sent in this channel.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('force')
        .setDescription('Retry failed/deleted copies while still preventing healthy duplicates.')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwnerOrAdmin(interaction.member, interaction.guild)) {
      throw new Error('Only the server owner or users with Administrator permission can recover synced messages.');
    }

    const network = config.sync.defaultNetwork;

    const sourceChannel = interaction.options.getChannel('source_channel');
    const summary = await recoverNetwork(client, {
      network,
      limit: interaction.options.getInteger('limit') || 25,
      channelId: sourceChannel?.id,
      force: interaction.options.getBoolean('force') || false
    });

    await logRecoverySession(interaction, network, summary);

    await interaction.editReply(panelPayload({
      title: 'Recovery Complete',
      description: 'Message repair finished.',
      ephemeral: true,
      fields: [
        { name: 'Scanned', value: `${summary.scanned}` },
        { name: 'Recovered', value: `${summary.recovered}` },
        { name: 'Skipped', value: `${summary.skipped}` },
        { name: 'Failed', value: `${summary.failed}` }
      ]
    }));
  }
};
