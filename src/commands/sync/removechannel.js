const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const SyncChannel = require('../../models/Channel');
const Network = require('../../models/Network');
const { isOwnerOrAdmin } = require('../../middleware/permissions');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Disconnect a channel from its Globy CV2 network.')
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
      throw new Error(`${channel} is not connected to any Globy CV2 network.`);
    }

    existing.active = false;
    await existing.save();

    const activeCount = await SyncChannel.countDocuments({ network: existing.network, active: true });
    await Network.updateOne({ name: existing.network }, { $set: { channelCount: activeCount } });

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${emojis.link} Channel Removed`)
      .setDescription(`${channel} was disconnected from **${existing.network}**.`)
      .addFields({ name: 'Remaining Connected Channels', value: `${activeCount}`, inline: true });

    await interaction.editReply({ embeds: [embed] });
  }
};
