const { EmbedBuilder } = require('discord.js');
const {
  createRestriction,
  liftRestriction
} = require('../services/blacklistService');
const { canUseGlobalModeration } = require('../middleware/permissions');
const { discordTimestamp } = require('../utils/time');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
const {
  resolveUser,
  parseDurationAndReason,
  safeReply,
  usage
} = require('./helpers');

function assertModerator(message) {
  if (!canUseGlobalModeration(message.member, message.guild)) {
    throw new Error('You need Administrator permission, server ownership, or developer access to use global moderation.');
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
    .setTitle(type === 'ban' ? `${emojis.shield} Global Ban Added` : `${emojis.warn} Global Mute Added`)
    .setDescription(
      type === 'ban'
        ? `${target} can no longer sync messages, gain XP, or use Globy CV2 synced chat.`
        : `${target} cannot send messages through Globy CV2 synced chat.`
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
    .setTitle(type === 'ban' ? `${emojis.shield} Global Ban Removed` : `${emojis.shield} Global Mute Removed`)
    .setDescription(
      type === 'ban'
        ? `${target} can use Globy CV2 synced chat again.`
        : `${target} can send through Globy CV2 synced chat again.`
    );

  await safeReply(message, { embeds: [embed] });
}

module.exports = [
  {
    name: 'gban',
    aliases: ['globalban'],
    category: 'Moderation',
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
        .setTitle(`${emojis.warn} Global Warning Recorded`)
        .setDescription(`${target} now has a global warning on record.`)
        .addFields({ name: 'Reason', value: record.reason, inline: false });

      await safeReply(message, { embeds: [embed] });
    }
  }
];
