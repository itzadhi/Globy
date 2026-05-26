const { SlashCommandBuilder, ChannelType } = require('discord.js');
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
const { config } = require('../../config/env');
const { successPanel } = require('../../utils/componentsV2');
const {
  displayModeChoices,
  displayModeDescription,
  displayModeLabel,
  normalizeDisplayMode
} = require('../../utils/syncDisplayMode');

function setupPanel(channel, displayMode, existing = false) {
  return successPanel(existing ? 'Channel Updated' : 'Channel Connected', `${channel} is ready for Globy CV2 sync.`, {
    ephemeral: true,
    fields: [
      { name: 'Style', value: displayModeLabel(displayMode) },
      { name: 'Mode', value: displayModeDescription(displayMode) }
    ]
  });
}

module.exports = {
  category: 'Sync',
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Make a text channel ready for Globy CV2 sync.')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Required: choose plain user webhook style or CV2 card style.')
        .addChoices(...displayModeChoices())
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The text channel to connect. Defaults to this channel.')
        .addChannelTypes(ChannelType.GuildText)
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
      const displayMode = normalizeDisplayMode(requestedDisplayMode);
      existing.displayMode = displayMode;
      existing.channelName = channel.name;
      existing.guildName = interaction.guild.name;
      await existing.save();

      await interaction.editReply(setupPanel(channel, displayMode, true));
      return;
    }

    const displayMode = normalizeDisplayMode(requestedDisplayMode);

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

    await interaction.editReply(setupPanel(channel, displayMode));
  }
};
