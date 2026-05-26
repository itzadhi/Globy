const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const SyncChannel = require('../models/Channel');
const Profile = require('../models/Profile');
const MessageLog = require('../models/MessageLog');
const Blacklist = require('../models/Blacklist');
const { pingDatabase } = require('../services/databaseService');
const { buildHelpHomePayload, wireHelpCollector } = require('../services/helpMenuService');
const { formatDuration } = require('../utils/time');
const { config } = require('../config/env');
const { panelPayload } = require('../utils/componentsV2');
const {
  commandEmbed,
  resolveUser,
  inviteUrl,
  safeReply
} = require('./helpers');

module.exports = [
  {
    name: 'help',
    aliases: ['commands', 'h'],
    category: 'General',
    usage: 'help',
    description: 'Open the interactive Globy CV2 help menu.',
    async execute(message) {
      const reply = await safeReply(message, buildHelpHomePayload(message.client, { viewerId: message.author.id }));
      wireHelpCollector(reply, message.author.id, message.client);
    }
  },
  {
    name: 'prefix',
    aliases: ['config'],
    category: 'General',
    usage: 'prefix',
    description: 'Show prefix and no-prefix status.',
    async execute(message, args, { prefix }) {
      const embed = commandEmbed(
        'Command Prefix',
        [
          `Current prefix: \`${prefix}\``,
          `Bot mention prefix: <@${message.client.user.id}>`,
          `No-prefix system: **${config.commands.noPrefixEnabled ? 'Enabled' : 'Disabled'}**`,
          'Developers and allowlisted users can run commands without the prefix.'
        ].join('\n')
      );

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'ping',
    aliases: ['latency'],
    category: 'General',
    usage: 'ping',
    description: 'Show latency, database status, websocket ping, and uptime.',
    async execute(message) {
      const sent = await safeReply(message, { content: 'Checking Globy status...' });
      const apiLatency = sent.createdTimestamp - message.createdTimestamp;
      const database = await pingDatabase().catch((error) => ({
        ok: false,
        latency: null,
        message: error.message
      }));

      await sent.edit({
        content: null,
        ...panelPayload({
          title: 'Globy Status',
          description: 'Live CV2 runtime.',
          fields: [
            { name: 'API Ping', value: `${apiLatency}ms` },
            { name: 'Database', value: database.ok ? `Connected (${database.latency}ms)` : `Offline: ${database.message}` },
            { name: 'WebSocket', value: `${message.client.ws.ping}ms` },
            { name: 'Uptime', value: formatDuration(message.client.uptime || 0) }
          ]
        })
      });
    }
  },
  {
    name: 'stats',
    aliases: ['botstats'],
    category: 'General',
    usage: 'stats',
    description: 'Show global Globy CV2 platform stats.',
    async execute(message) {
      const [channels, profiles, messages, restrictions] = await Promise.all([
        SyncChannel.countDocuments({ active: true }),
        Profile.countDocuments(),
        MessageLog.countDocuments(),
        Blacklist.countDocuments({ active: true })
      ]);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Globy Stats')
        .addFields(
          { name: 'Servers', value: `${message.client.guilds.cache.size}`, inline: true },
          { name: 'Connected Channels', value: `${channels}`, inline: true },
          { name: 'Profiles', value: `${profiles}`, inline: true },
          { name: 'Logged Messages', value: `${messages}`, inline: true },
          { name: 'Active Restrictions', value: `${restrictions}`, inline: true }
        )
        .setTimestamp();

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'avatar',
    aliases: ['av'],
    category: 'General',
    usage: 'avatar [user]',
    description: 'View a user avatar.',
    async execute(message, args) {
      const user = args[0] ? await resolveUser(message, args[0]) : message.author;
      if (!user) throw new Error('I could not find that user.');

      const avatar = user.displayAvatarURL({ extension: 'png', size: 1024, forceStatic: false });
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${user.username}'s avatar`)
        .setImage(avatar)
        .setDescription(`[Open avatar](${avatar})`);

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'invite',
    aliases: ['botinvite'],
    category: 'General',
    usage: 'invite',
    description: 'Get the invite link for Globy CV2.',
    async execute(message) {
      const url = inviteUrl(config.clientId);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setURL(url)
          .setLabel('Invite Globy CV2')
      );

      await safeReply(message, {
        embeds: [commandEmbed('Invite Globy CV2', 'Add the bot with webhook sync and slash command permissions.')],
        components: [row]
      });
    }
  },
  {
    name: 'about',
    aliases: ['info'],
    category: 'General',
    usage: 'about',
    description: 'Learn what Globy CV2 does.',
    async execute(message) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('Globy CV2')
        .setDescription('Cross-server chat, webhook sync, safety, and recovery in one clean system.')
        .addFields(
          { name: 'Sync', value: 'Webhook relay with edits, deletes, replies, and files.', inline: false },
          { name: 'Safety', value: 'Mention protection, spam checks, and dev moderation.', inline: false },
          { name: 'Recovery', value: 'MongoDB-backed message repair after outages.', inline: false }
        )
        .setTimestamp();

      await safeReply(message, { embeds: [embed] });
    }
  }
];
