const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SyncChannel = require('../../models/Channel');
const Network = require('../../models/Network');
const MessageLog = require('../../models/MessageLog');
const { normalizeNetworkName, isValidNetworkName } = require('../../utils/text');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('networkinfo')
    .setDescription('Show information about a Globy CV2 network.')
    .addStringOption((option) =>
      option.setName('network').setDescription('Network name.').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const network = normalizeNetworkName(interaction.options.getString('network'));
    if (!isValidNetworkName(network)) throw new Error('Invalid network name.');

    const [networkRecord, channels, messageCount] = await Promise.all([
      Network.findOne({ name: network }).lean(),
      SyncChannel.find({ network, active: true }).sort({ guildName: 1 }).limit(12).lean(),
      MessageLog.countDocuments({ network })
    ]);

    if (!networkRecord && !channels.length) {
      throw new Error(`No active network named **${network}** was found.`);
    }

    const channelList = channels.length
      ? channels.map((channel) => `• ${channel.guildName || channel.guildId} / #${channel.channelName || channel.channelId}`).join('\n')
      : 'No active channels.';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${emojis.globe} Network: ${network}`)
      .addFields(
        { name: 'Connected Channels', value: `${channels.length}`, inline: true },
        { name: 'Logged Messages', value: `${messageCount}`, inline: true },
        { name: 'Recovered Messages', value: `${networkRecord?.recoveredMessageCount || 0}`, inline: true },
        { name: 'Channels', value: channelList, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
