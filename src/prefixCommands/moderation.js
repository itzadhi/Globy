const { EmbedBuilder } = require('discord.js');
const {
  createRestriction,
  liftRestriction
} = require('../services/blacklistService');
const { assertPurgePermissions, purgeMessages } = require('../services/purgeService');
const { canUseGlobalModeration } = require('../middleware/permissions');
const { discordTimestamp } = require('../utils/time');
const { config } = require('../config/env');
const {
  resolveUser,
  parseDurationAndReason,
  safeReply,
  usage
} = require('./helpers');

function assertModerator(message) {
  if (!canUseGlobalModeration(message.member, message.guild)) {
    throw new Error('Only configured bot developers can use global moderation.');
  }
}

async function restrictionCommand(message, args, context, type) {
  assertModerator(message);
  const target = await resolveUser(message, args.shift());
  if (!target) throw new Error(`${usage(context.prefix, `${type === 'ban' ? 'gban' : 'gmute'} @user [duration] <reason>`)}`);
  if (target.id === message.author.id) throw new Error(`You cannot globally ${type} yourself.`);

  const parsed = parseDurationAndReason(args);
  const record = await createRestriction({
    target,
    type,
    reason: parsed.reason,
    duration: parsed.duration,
    moderator: message.author,
    guildId: message.guildId
  });

  const embed = new EmbedBuilder()
    .setColor(type === 'ban' ? config.colors.error : config.colors.warning)
    .setTitle(type === 'ban' ? 'Global Ban Added' : 'Global Mute Added')
    .setDescription(
      type === 'ban'
        ? `${target} is blocked from CV2 sync.`
        : `${target} cannot send through CV2 sync.`
    )
    .addFields(
      { name: 'Reason', value: record.reason, inline: false },
      { name: 'Expires', value: record.expiresAt ? discordTimestamp(record.expiresAt, 'R') : 'Never', inline: true }
    );

  await safeReply(message, { embeds: [embed] });
}

async function liftCommand(message, args, context, type) {
  assertModerator(message);
  const target = await resolveUser(message, args.shift());
  if (!target) throw new Error(`${usage(context.prefix, `${type === 'ban' ? 'gunban' : 'gunmute'} @user [reason]`)}`);

  const modified = await liftRestriction({
    targetId: target.id,
    type,
    moderator: message.author,
    reason: args.join(' ') || 'No reason provided',
    guildId: message.guildId
  });

  if (!modified) throw new Error(`That user does not have an active global ${type}.`);

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(type === 'ban' ? 'Global Ban Removed' : 'Global Mute Removed')
    .setDescription(
      type === 'ban'
        ? `${target} can use CV2 sync again.`
        : `${target} can send through CV2 sync again.`
    );

  await safeReply(message, { embeds: [embed] });
}

module.exports = [
  {
    name: 'purge',
    aliases: ['clear', 'prune'],
    category: 'Moderation',
    devOnly: true,
    usage: 'purge <amount> [@user] [reason]',
    description: 'Bulk-delete recent messages from this channel.',
    async execute(message, args, { prefix }) {
      await message.guild.members.fetchMe().catch(() => null);
      assertPurgePermissions(message.member, message.channel);

      const amount = Number(args.shift());
      if (!Number.isFinite(amount) || amount < 1 || amount > 100) {
        throw new Error(`${usage(prefix, 'purge <1-100> [@user] [reason]')}`);
      }

      let user = null;
      if (args[0]) {
        const resolved = await resolveUser(message, args[0]);
        if (resolved) {
          user = resolved;
          args.shift();
        }
      }

      const reason = args.join(' ') || 'No reason provided';
      const result = await purgeMessages({
        channel: message.channel,
        amount,
        user,
        moderator: message.author,
        reason,
        excludeIds: [message.id]
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('Purge Complete')
        .setDescription(`Deleted **${result.deleted}** recent message${result.deleted === 1 ? '' : 's'} from this channel.`)
        .addFields(
          { name: 'Requested', value: `${result.requested}`, inline: true },
          { name: 'Deleted', value: `${result.deleted}`, inline: true },
          { name: 'Filter', value: user ? `${user.tag || user.username}` : 'All users', inline: true },
          { name: 'Reason', value: reason, inline: false }
        );

      const reply = await safeReply(message, { embeds: [embed] });
      setTimeout(() => reply.delete().catch(() => null), 8000);
    }
  },
  {
    name: 'gban',
    aliases: ['globalban'],
    category: 'Moderation',
    devOnly: true,
    usage: 'gban @user [duration] <reason>',
    description: 'Globally ban a user from Globy CV2 synced chat.',
    async execute(message, args, context) {
      await restrictionCommand(message, args, context, 'ban');
    }
  },
  {
    name: 'gunban',
    aliases: ['globalunban'],
    category: 'Moderation',
    devOnly: true,
    usage: 'gunban @user [reason]',
    description: 'Remove a global ban.',
    async execute(message, args, context) {
      await liftCommand(message, args, context, 'ban');
    }
  },
  {
    name: 'gmute',
    aliases: ['globalmute'],
    category: 'Moderation',
    devOnly: true,
    usage: 'gmute @user [duration] <reason>',
    description: 'Globally mute a user from Globy CV2 synced chat.',
    async execute(message, args, context) {
      await restrictionCommand(message, args, context, 'mute');
    }
  },
  {
    name: 'gunmute',
    aliases: ['globalunmute'],
    category: 'Moderation',
    devOnly: true,
    usage: 'gunmute @user [reason]',
    description: 'Remove a global mute.',
    async execute(message, args, context) {
      await liftCommand(message, args, context, 'mute');
    }
  },
  {
    name: 'gwarn',
    aliases: ['globalwarn'],
    category: 'Moderation',
    devOnly: true,
    usage: 'gwarn @user <reason>',
    description: 'Record a global warning for a user.',
    async execute(message, args, { prefix }) {
      assertModerator(message);
      const target = await resolveUser(message, args.shift());
      if (!target) throw new Error(`${usage(prefix, 'gwarn @user <reason>')}`);

      const record = await createRestriction({
        target,
        type: 'warn',
        reason: args.join(' ') || 'No reason provided',
        moderator: message.author,
        guildId: message.guildId
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('Global Warning Recorded')
        .setDescription(`${target} now has a CV2 warning record.`)
        .addFields({ name: 'Reason', value: record.reason, inline: false });

      await safeReply(message, { embeds: [embed] });
    }
  }
];
