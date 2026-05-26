const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const { recoverNetwork } = require('../../services/recoveryService');
const { logRecoverySession } = require('../../services/loggingService');
const { isOwnerOrAdmin } = require('../../middleware/permissions');
const { normalizeNetworkName, isValidNetworkName } = require('../../utils/text');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('recovermessages')
    .setDescription('Recover deleted or missing webhook messages from MongoDB logs.')
    .addStringOption((option) =>
      option.setName('network').setDescription('Network to recover.').setRequired(true)
    )
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

    const network = normalizeNetworkName(interaction.options.getString('network'));
    if (!isValidNetworkName(network)) throw new Error('Invalid network name.');

    const sourceChannel = interaction.options.getChannel('source_channel');
    const summary = await recoverNetwork(client, {
      network,
      limit: interaction.options.getInteger('limit') || 25,
      channelId: sourceChannel?.id,
      force: interaction.options.getBoolean('force') || false
    });

    await logRecoverySession(interaction, network, summary);

    const embed = new EmbedBuilder()
      .setColor(summary.failed ? config.colors.warning : config.colors.success)
      .setTitle(`${emojis.recover} Recovery Complete`)
      .setDescription(`Recovery session finished for **${network}**.`)
      .addFields(
        { name: 'Scanned', value: `${summary.scanned}`, inline: true },
        { name: 'Recovered', value: `${summary.recovered}`, inline: true },
        { name: 'Skipped', value: `${summary.skipped}`, inline: true },
        { name: 'Failed', value: `${summary.failed}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
