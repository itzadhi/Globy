const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { config } = require('../config/env');

const requiredSyncPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.AttachFiles
];

function isOwnerOrAdmin(member, guild) {
  if (!member || !guild) return false;
  return guild.ownerId === member.id || member.permissions.has(PermissionFlagsBits.Administrator);
}

function isDeveloper(userId) {
  return config.devIds.includes(userId);
}

function canUseGlobalModeration(member, guild) {
  return isDeveloper(member?.id) || isOwnerOrAdmin(member, guild);
}

function isSupportedTextChannel(channel) {
  return channel?.type === ChannelType.GuildText;
}

function missingBotPermissions(channel, permissions = requiredSyncPermissions) {
  const me = channel?.guild?.members?.me;
  if (!channel || !me) return permissions;
  const current = channel.permissionsFor(me);
  if (!current) return permissions;
  return permissions.filter((permission) => !current.has(permission));
}

function permissionNames(permissions) {
  const names = Object.entries(PermissionFlagsBits).reduce((map, [name, value]) => {
    map.set(value, name.replace(/([a-z])([A-Z])/g, '$1 $2'));
    return map;
  }, new Map());

  return permissions.map((permission) => names.get(permission) || String(permission));
}

module.exports = {
  requiredSyncPermissions,
  isOwnerOrAdmin,
  isDeveloper,
  canUseGlobalModeration,
  isSupportedTextChannel,
  missingBotPermissions,
  permissionNames
};
