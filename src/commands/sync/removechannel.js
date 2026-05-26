const { SlashCommandBuilder, ChannelType } = require('discord.js');
const SyncChannel = require('../../models/Channel');
const Network = require('../../models/Network');
const { isOwnerOrAdmin } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const { successPanel } = require('../../utils/componentsV2');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Disconnect a channel from Globy CV2 sync.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to disconnect. Defaults to this channel.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwnerOrAdmin(interaction.member, interaction.guild)) {
      throw new Error('Only the server owner or users with Administrator permission can remove synced channels.');
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const existing = await SyncChannel.findOne({
      guildId: interaction.guildId,
      channelId: channel.id,
      active: true
    });

    if (!existing) {
      throw new Error(`${channel} is not connected to Globy CV2 sync.`);
    }

    existing.active = false;
    await existing.save();

    const activeCount = await SyncChannel.countDocuments({ network: existing.network, active: true });
    await Network.updateOne({ name: existing.network }, { $set: { channelCount: activeCount } });

    await interaction.editReply(successPanel(`${emojis.link} Channel Removed`, `${channel} was disconnected from Globy CV2 sync.`, {
      fields: [{ name: 'Remaining Connected Channels', value: `${activeCount}` }],
      ephemeral: true
    }));
  }
};
