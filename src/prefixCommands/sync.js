const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const SyncChannel = require('../models/Channel');
const Network = require('../models/Network');
const Guild = require('../models/Guild');
const webhookService = require('../services/webhookService');
const { upsertGuild } = require('../services/guildService');
const { recoverNetwork } = require('../services/recoveryService');
const { logRecoverySession } = require('../services/loggingService');
const { getSyncHealth } = require('../services/syncHealthService');
const {
  isOwnerOrAdmin,
  isSupportedTextChannel,
  missingBotPermissions,
  permissionNames
} = require('../middleware/permissions');
const { createSetupBanner } = require('../canvas/cardRenderer');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
const {
  displayModeDescription,
  displayModeLabel,
  normalizeDisplayMode
} = require('../utils/syncDisplayMode');
const { resolveChannel, safeReply } = require('./helpers');

function assertSetupPermission(message) {
  if (!isOwnerOrAdmin(message.member, message.guild)) {
    throw new Error('Only the server owner or users with Administrator permission can configure synced channels.');
  }
}

function parseSetupChannel(message, args) {
  return resolveChannel(message, args[0]) || message.channel;
}

function parseDisplayMode(args, fallback = config.sync.defaultDisplayMode) {
  const mode = args.find((arg) => ['normal', 'cv2'].includes(String(arg).toLowerCase()));
  return normalizeDisplayMode(mode, fallback);
}

module.exports = [
  {
    name: 'setchannel',
    aliases: ['setnet', 'connect'],
    category: 'Sync',
    usage: 'setchannel [#channel] [normal|cv2]',
    description: 'Make a text channel ready for Globy CV2 sync.',
    async execute(message, args) {
      assertSetupPermission(message);
      const channel = parseSetupChannel(message, args);
      const network = config.sync.defaultNetwork;

      if (!channel) throw new Error('Use `,setchannel` or `,setchannel #channel`.');
      if (!isSupportedTextChannel(channel)) throw new Error('Only regular text channels can be connected.');

      await message.guild.members.fetchMe().catch(() => null);
      const missing = missingBotPermissions(channel);
      if (missing.length) {
        throw new Error(`I need these permissions in ${channel}: ${permissionNames(missing).join(', ')}.`);
      }

      const existing = await SyncChannel.findOne({
        guildId: message.guildId,
        channelId: channel.id,
        active: true
      });

      if (existing) {
        const displayMode = parseDisplayMode(args, existing.displayMode || config.sync.defaultDisplayMode);
        existing.displayMode = displayMode;
        existing.channelName = channel.name;
        existing.guildName = message.guild.name;
        await existing.save();

        const banner = await createSetupBanner(message.client, channel, displayModeLabel(displayMode));
        await safeReply(message, {
          content: `${channel} is already connected. Style updated to **${displayModeLabel(displayMode)}**.`,
          files: [new AttachmentBuilder(banner, { name: 'globy-sync-ready.png' })]
        });
        return;
      }

      const displayMode = parseDisplayMode(args);

      await upsertGuild(message.guild);
      await Network.findOneAndUpdate(
        { name: network },
        {
          $set: { active: true },
          $setOnInsert: {
            name: network,
            displayName: network,
            createdBy: message.author.id
          }
        },
        { upsert: true, new: true }
      );

      const syncChannel = await SyncChannel.findOneAndUpdate(
        { guildId: message.guildId, channelId: channel.id },
        {
          $set: {
            network,
            channelName: channel.name,
            guildName: message.guild.name,
            displayMode,
            active: true,
            createdBy: message.author.id
          }
        },
        { upsert: true, new: true }
      );

      await webhookService.resolveWebhook(syncChannel.toObject(), channel);
      const activeCount = await SyncChannel.countDocuments({ network, active: true });
      await Network.updateOne({ name: network }, { $set: { channelCount: activeCount } });
      await Guild.updateOne({ guildId: message.guildId }, { $addToSet: { networks: network } });

      const banner = await createSetupBanner(message.client, channel, displayModeLabel(displayMode));
      await safeReply(message, {
        content: `${channel} is ready with **${displayModeLabel(displayMode)}** style. ${displayModeDescription(displayMode)}`,
        files: [new AttachmentBuilder(banner, { name: 'globy-sync-ready.png' })]
      });
    }
  },
  {
    name: 'removechannel',
    aliases: ['removenet', 'disconnect'],
    category: 'Sync',
    usage: 'removechannel [#channel]',
    description: 'Disconnect a channel from Globy CV2 sync.',
    async execute(message, args) {
      assertSetupPermission(message);
      const channel = resolveChannel(message, args[0]) || message.channel;
      const existing = await SyncChannel.findOne({
        guildId: message.guildId,
        channelId: channel.id,
        active: true
      });

      if (!existing) throw new Error(`${channel} is not connected to Globy CV2 sync.`);

      existing.active = false;
      await existing.save();
      const activeCount = await SyncChannel.countDocuments({ network: existing.network, active: true });
      await Network.updateOne({ name: existing.network }, { $set: { channelCount: activeCount } });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${emojis.link} Channel Removed`)
        .setDescription(`${channel} was disconnected from Globy CV2 sync.`)
        .addFields({ name: 'Remaining Connected Channels', value: `${activeCount}`, inline: true });

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'synchealth',
    aliases: ['syncstatus', 'webhookcheck'],
    category: 'Sync',
    usage: 'synchealth [#channel] [repair]',
    description: 'Check and optionally repair sync/webhook health for a channel.',
    async execute(message, args) {
      assertSetupPermission(message);
      const channel = resolveChannel(message, args[0]) || message.channel;
      const repair = args.some((arg) => ['repair', '--repair', 'fix'].includes(String(arg).toLowerCase()));
      const health = await getSyncHealth(message.client, channel, { repair });

      const embed = new EmbedBuilder()
        .setColor(health.missing?.length ? config.colors.warning : config.colors.success)
        .setTitle(`${emojis.shield} Sync Health`)
        .setDescription(`Health report for ${channel}.`)
        .addFields(health.fields.map((field) => ({ ...field, inline: false })));

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'recovermessages',
    aliases: ['recover'],
    category: 'Sync',
    usage: 'recovermessages [limit] [force]',
    description: 'Recover deleted or missing webhook messages from MongoDB logs.',
    cooldown: 10,
    async execute(message, args) {
      assertSetupPermission(message);
      const network = config.sync.defaultNetwork;

      const limit = Math.min(Math.max(Number(args.find((arg) => /^\d+$/.test(arg))) || 25, 1), config.sync.maxRecoveryLimit);
      const force = args.some((arg) => ['force', '--force', 'true'].includes(String(arg).toLowerCase()));
      const summary = await recoverNetwork(message.client, { network, limit, force });
      await logRecoverySession(
        {
          guildId: message.guildId,
          channelId: message.channelId,
          user: message.author
        },
        network,
        summary
      );

      const embed = new EmbedBuilder()
        .setColor(summary.failed ? config.colors.warning : config.colors.success)
        .setTitle(`${emojis.recover} Recovery Complete`)
        .setDescription('Recovery session finished.')
        .addFields(
          { name: 'Scanned', value: `${summary.scanned}`, inline: true },
          { name: 'Recovered', value: `${summary.recovered}`, inline: true },
          { name: 'Skipped', value: `${summary.skipped}`, inline: true },
          { name: 'Failed', value: `${summary.failed}`, inline: true }
        );

      await safeReply(message, { embeds: [embed] });
    }
  }
];
