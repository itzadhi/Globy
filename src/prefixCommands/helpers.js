const { EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const { config } = require('../config/env');

function usage(prefix, commandUsage) {
  return `Usage: \`${prefix}${commandUsage}\``;
}

function commandEmbed(title, description, color = config.colors.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function parseSnowflake(value) {
  return String(value || '').match(/\d{17,22}/)?.[0] || null;
}

async function resolveUser(message, value) {
  const id = parseSnowflake(value);
  if (!id) return null;

  return message.client.users.fetch(id).catch(() => null);
}

function resolveChannel(message, value) {
  const id = parseSnowflake(value);
  if (!id) return null;

  return message.guild.channels.cache.get(id) || null;
}

function parseDurationAndReason(args) {
  if (!args.length) return { duration: null, reason: 'No reason provided' };

  const possibleDuration = args[0];
  if (ms(possibleDuration)) {
    return {
      duration: possibleDuration,
      reason: args.slice(1).join(' ') || 'No reason provided'
    };
  }

  return {
    duration: null,
    reason: args.join(' ') || 'No reason provided'
  };
}

function inviteUrl(clientId) {
  const permissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages
  ].reduce((total, permission) => total | permission, 0n);

  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${permissions.toString()}`;
}

function attachment(buffer, name) {
  return new AttachmentBuilder(buffer, { name });
}

function replyOptions(payload) {
  return {
    ...payload,
    allowedMentions: {
      repliedUser: false,
      users: [],
      roles: [],
      parse: []
    }
  };
}

async function safeReply(message, payload) {
  return message.reply(replyOptions(payload));
}

module.exports = {
  usage,
  commandEmbed,
  resolveUser,
  resolveChannel,
  parseDurationAndReason,
  inviteUrl,
  attachment,
  safeReply
};
