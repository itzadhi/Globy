const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
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
const { createSetupBanner } = require('../../canvas/cardRenderer');
const { config } = require('../../config/env');
const {
  displayModeChoices,
  displayModeDescription,
  displayModeLabel,
  normalizeDisplayMode
} = require('../../utils/syncDisplayMode');

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Make a text channel ready for Globy CV2 sync.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The text channel to connect. Defaults to this channel.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('How synced messages should look in this channel.')
        .addChoices(...displayModeChoices())
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwnerOrAdmin(interaction.member, interaction.guild)) {
      throw new Error('Only the server owner or users with Administrator permission can configure synced channels.');
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const network = config.sync.defaultNetwork;
    const requestedDisplayMode = interaction.options.getString('type');

    if (!isSupportedTextChannel(channel)) {
      throw new Error('Only regular text channels can be connected.');
    }

    await interaction.guild.members.fetchMe().catch(() => null);
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
      const displayMode = normalizeDisplayMode(requestedDisplayMode, existing.displayMode || config.sync.defaultDisplayMode);
      existing.displayMode = displayMode;
      existing.channelName = channel.name;
      existing.guildName = interaction.guild.name;
      await existing.save();

      const banner = await createSetupBanner(client, channel, displayModeLabel(displayMode));
      await interaction.editReply({
        content: `${channel} is already connected. Style updated to **${displayModeLabel(displayMode)}**.`,
        files: [new AttachmentBuilder(banner, { name: 'globy-sync-ready.png' })],
        allowedMentions: { parse: [], users: [], roles: [] }
      });
      return;
    }

    const displayMode = normalizeDisplayMode(requestedDisplayMode, config.sync.defaultDisplayMode);

    await upsertGuild(interaction.guild);
    await Network.findOneAndUpdate(
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
          displayMode,
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

    const banner = await createSetupBanner(client, channel, displayModeLabel(displayMode));
    await interaction.editReply({
      content: `${channel} is ready with **${displayModeLabel(displayMode)}** style. ${displayModeDescription(displayMode)}`,
      files: [new AttachmentBuilder(banner, { name: 'globy-sync-ready.png' })],
      allowedMentions: { parse: [], users: [], roles: [] }
    });
  }
};
