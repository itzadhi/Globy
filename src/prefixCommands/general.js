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
const { formatDuration, discordTimestamp } = require('../utils/time');
const { config } = require('../config/env');
const { panelPayload } = require('../utils/componentsV2');
const emojis = require('../config/emojis');
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
      const reply = await safeReply(message, buildHelpHomePayload(message.client));
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
        `${emojis.link} Command Prefix`,
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
      const sent = await safeReply(message, { content: `${emojis.ping} Checking Globy status...` });
      const apiLatency = sent.createdTimestamp - message.createdTimestamp;
      const database = await pingDatabase().catch((error) => ({
        ok: false,
        latency: null,
        message: error.message
      }));

      await sent.edit({
        content: null,
        ...panelPayload({
          title: `${emojis.ping} Globy Status`,
          description: 'Live runtime health for Globy CV2.',
          accentColor: database.ok ? config.colors.success : config.colors.warning,
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
        .setTitle(`${emojis.globe} Globy CV2 Stats`)
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
    name: 'userinfo',
    aliases: ['user', 'ui'],
    category: 'General',
    usage: 'userinfo [user]',
    description: 'Show information about a user.',
    async execute(message, args) {
      const user = args[0] ? await resolveUser(message, args[0]) : message.author;
      if (!user) throw new Error('I could not find that user.');

      const member = await message.guild.members.fetch(user.id).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(user.tag || user.username)
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
        .addFields(
          { name: 'User ID', value: user.id, inline: false },
          { name: 'Created', value: discordTimestamp(user.createdAt, 'D'), inline: true },
          { name: 'Joined', value: member?.joinedAt ? discordTimestamp(member.joinedAt, 'D') : 'Not in this server', inline: true },
          { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }
        );

      await safeReply(message, { embeds: [embed] });
    }
  },
  {
    name: 'serverinfo',
    aliases: ['server', 'si'],
    category: 'General',
    usage: 'serverinfo',
    description: 'Show information about this server.',
    async execute(message) {
      const guild = message.guild;
      const owner = await guild.fetchOwner().catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
          { name: 'Members', value: `${guild.memberCount}`, inline: true },
          { name: 'Created', value: discordTimestamp(guild.createdAt, 'D'), inline: true },
          { name: 'Server ID', value: guild.id, inline: false }
        );

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
        .setTitle(`${emojis.globe} Globy CV2`)
        .setDescription('A premium cross-server Discord communication platform powered by webhooks, synchronized profiles, global moderation, and recovery systems.')
        .addFields(
          { name: 'Sync Engine', value: 'Cross-server webhook sync with edits, deletes, attachments, replies, and recovery.', inline: false },
          { name: 'Profiles', value: 'Global XP, levels, reputation, ranks, leaderboards, and Canvas cards.', inline: false },
          { name: 'Safety', value: 'Mention protection, spam filters, scam checks, blacklist tools, and moderation logs.', inline: false }
        )
        .setTimestamp();

      await safeReply(message, { embeds: [embed] });
    }
  }
];
