const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const SyncChannel = require('../../models/Channel');
const Network = require('../../models/Network');
const Guild = require('../../models/Guild');
const webhookService = require('../../services/webhookService');
const { upsertGuild } = require('../../services/guildService');
const {
  isOwnerOrAdmin,
  isSupportedTextChannel,
  missingBotPermissions,
  permissionNames
} = require('../../middleware/permissions');
const { normalizeNetworkName, isValidNetworkName } = require('../../utils/text');
const { config } = require('../../config/env');
const emojis = require('../../config/emojis');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Connect a text channel to a Globy CV2 network.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The text channel to connect.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('network')
        .setDescription('Network name, like global, gaming, anime, tamil, or coding.')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(32)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwnerOrAdmin(interaction.member, interaction.guild)) {
      throw new Error('Only the server owner or users with Administrator permission can configure synced channels.');
    }

    const channel = interaction.options.getChannel('channel');
    const network = normalizeNetworkName(interaction.options.getString('network'));

    if (!isValidNetworkName(network)) {
      throw new Error('Network names must be 2-32 characters and only use lowercase letters, numbers, dashes, or underscores.');
    }

    if (!isSupportedTextChannel(channel)) {
      throw new Error('Only regular text channels can be connected.');
    }

    const missing = missingBotPermissions(channel);
    if (missing.length) {
      throw new Error(`I need these permissions in ${channel}: ${permissionNames(missing).join(', ')}.`);
    }

    const existing = await SyncChannel.findOne({
      guildId: interaction.guildId,
      channelId: channel.id,
      active: true
    });

    if (existing) {
      throw new Error(`${channel} is already connected to the **${existing.network}** network.`);
    }

    await upsertGuild(interaction.guild);
    const networkRecord = await Network.findOneAndUpdate(
      { name: network },
      {
        $set: {
          active: true
        },
        $setOnInsert: {
          name: network,
          displayName: network,
          createdBy: interaction.user.id
        }
      },
      { upsert: true, new: true }
    );

    const syncChannel = await SyncChannel.findOneAndUpdate(
      { guildId: interaction.guildId, channelId: channel.id },
      {
        $set: {
          network,
          channelName: channel.name,
          guildName: interaction.guild.name,
          active: true,
          createdBy: interaction.user.id
        }
      },
      { upsert: true, new: true }
    );

    await webhookService.resolveWebhook(syncChannel.toObject(), channel);
    const activeCount = await SyncChannel.countDocuments({ network, active: true });
    await Network.updateOne({ name: network }, { $set: { channelCount: activeCount } });
    await Guild.updateOne({ guildId: interaction.guildId }, { $addToSet: { networks: network } });

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${emojis.link} Channel Connected`)
      .setDescription(`${channel} is now connected to **${networkRecord.displayName}**.`)
      .addFields(
        { name: 'Network', value: network, inline: true },
        { name: 'Connected Channels', value: `${activeCount}`, inline: true },
        { name: 'Webhook', value: 'Ready and cached', inline: true }
      )
      .setFooter({ text: 'Messages sent here will sync through Globy CV2.' });

    await interaction.editReply({ embeds: [embed] });
  }
};
