const { EmbedBuilder } = require('discord.js');
const SyncChannel = require('../models/Channel');
const Network = require('../models/Network');
const Guild = require('../models/Guild');
const MessageLog = require('../models/MessageLog');
const webhookService = require('../services/webhookService');
const { upsertGuild } = require('../services/guildService');
const { recoverNetwork } = require('../services/recoveryService');
const { logRecoverySession } = require('../services/loggingService');
const {
  isOwnerOrAdmin,
  isSupportedTextChannel,
  missingBotPermissions,
  permissionNames
} = require('../middleware/permissions');
const {
  normalizeNetworkName,
  isValidNetworkName
} = require('../utils/text');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
const { resolveChannel, safeReply, usage } = require('./helpers');

function assertSetupPermission(message) {
  if (!isOwnerOrAdmin(message.member, message.guild)) {
    throw new Error('Only the server owner or users with Administrator permission can configure synced channels.');
  }
}

function parseChannelAndNetwork(message, args) {
  let channel = resolveChannel(message, args[0]);
  let networkArg;

  if (channel) {
    networkArg = args[1];
  } else {
    channel = message.channel;
    networkArg = args[0];
  }

  return {
    channel,
    network: normalizeNetworkName(networkArg)
  };
}

module.exports = [
  {
    name: 'setchannel',
    aliases: ['setnet', 'connect'],
    category: 'Sync',
    usage: 'setchannel [#channel] <network>',
    description: 'Connect a text channel to a Globy CV2 network.',
    async execute(message, args, { prefix }) {
      assertSetupPermission(message);
      const { channel, network } = parseChannelAndNetwork(message, args);

      if (!channel || !network) throw new Error(`${usage(prefix, 'setchannel [#channel] <network>')}`);
      if (!isValidNetworkName(network)) {
        throw new Error('Network names must be 2-32 characters and only use lowercase letters, numbers, dashes, or underscores.');
      }
      if (!isSupportedTextChannel(channel)) throw new Error('Only regular text channels can be connected.');

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
        throw new Error(`${channel} is already connected to the **${existing.network}** network.`);
      }

      await upsertGuild(message.guild);
      const networkRecord = await Network.findOneAndUpdate(
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

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${emojis.link} Channel Connected`)
        .setDescription(`${channel} is now connected to **${networkRecord.displayName}**.`)
        .addFields(
          { name: 'Network', value: network, inline: true },
          { name: 'Connected Channels', value: `${activeCount}`, inline: true },
          { name: 'Webhook', value: 'Ready and cached', inline: true }
        );

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'removechannel',
    aliases: ['removenet', 'disconnect'],
    category: 'Sync',
    usage: 'removechannel [#channel]',
    description: 'Disconnect a channel from its Globy CV2 network.',
    async execute(message, args) {
      assertSetupPermission(message);
      const channel = resolveChannel(message, args[0]) || message.channel;
      const existing = await SyncChannel.findOne({
        guildId: message.guildId,
        channelId: channel.id,
        active: true
      });

      if (!existing) throw new Error(`${channel} is not connected to any Globy CV2 network.`);

      existing.active = false;
      await existing.save();
      const activeCount = await SyncChannel.countDocuments({ network: existing.network, active: true });
      await Network.updateOne({ name: existing.network }, { $set: { channelCount: activeCount } });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${emojis.link} Channel Removed`)
        .setDescription(`${channel} was disconnected from **${existing.network}**.`)
        .addFields({ name: 'Remaining Connected Channels', value: `${activeCount}`, inline: true });

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'networkinfo',
    aliases: ['netinfo', 'network'],
    category: 'Sync',
    usage: 'networkinfo <network>',
    description: 'Show information about a Globy CV2 network.',
    async execute(message, args, { prefix }) {
      const network = normalizeNetworkName(args[0]);
      if (!isValidNetworkName(network)) throw new Error(`${usage(prefix, 'networkinfo <network>')}`);

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

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'recovermessages',
    aliases: ['recover'],
    category: 'Sync',
    usage: 'recovermessages <network> [limit] [force]',
    description: 'Recover deleted or missing webhook messages from MongoDB logs.',
    cooldown: 10,
    async execute(message, args, { prefix }) {
      assertSetupPermission(message);
      const network = normalizeNetworkName(args[0]);
      if (!isValidNetworkName(network)) throw new Error(`${usage(prefix, 'recovermessages <network> [limit] [force]')}`);

      const limit = Math.min(Math.max(Number(args[1]) || 25, 1), config.sync.maxRecoveryLimit);
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
        .setDescription(`Recovery session finished for **${network}**.`)
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
