const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { config } = require('../config/env');

const inviteChannelTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice
]);

function botInviteUrl(clientId = config.clientId) {
  const permissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.CreateInstantInvite
  ].reduce((total, permission) => total | permission, 0n);

  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${permissions.toString()}`;
}

function cleanGuildId(value) {
  return String(value || '').match(/\d{17,22}/)?.[0] || null;
}

async function resolveBotGuild(client, guildId) {
  const id = cleanGuildId(guildId);
  if (!id) throw new Error('Provide a valid server ID.');

  const guild = client.guilds.cache.get(id) || await client.guilds.fetch(id).catch(() => null);
  if (!guild) throw new Error('I am not in that server, or Discord would not let me fetch it.');

  return guild;
}

function cachedGuilds(client) {
  return [...client.guilds.cache.values()].sort((a, b) => {
    const memberDiff = (b.memberCount || 0) - (a.memberCount || 0);
    return memberDiff || a.name.localeCompare(b.name);
  });
}

function listBotGuilds(client, limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  return cachedGuilds(client).slice(0, safeLimit);
}

function guildLine(guild, index) {
  return [
    `**${index + 1}. ${guild.name}**`,
    `ID: \`${guild.id}\``,
    `Members: **${guild.memberCount || 'Unknown'}**`
  ].join('\n');
}

async function guildDetails(guild) {
  const owner = await guild.fetchOwner().catch(() => null);
  const channels = await guild.channels.fetch().catch(() => null);
  const roles = await guild.roles.fetch().catch(() => null);

  return {
    name: guild.name,
    id: guild.id,
    owner: owner ? `${owner.user.tag || owner.user.username} (${owner.id})` : 'Unknown',
    members: guild.memberCount || 'Unknown',
    createdAt: guild.createdAt,
    joinedAt: guild.joinedAt,
    channels: channels?.size ?? guild.channels.cache.size,
    roles: roles?.size ?? guild.roles.cache.size,
    shardId: guild.shardId ?? 0
  };
}

async function findInviteChannel(guild) {
  const channels = await guild.channels.fetch().catch(() => null);
  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!channels || !me) return null;

  return [...channels.values()]
    .filter(Boolean)
    .filter((channel) => inviteChannelTypes.has(channel.type))
    .find((channel) => {
      const permissions = channel.permissionsFor(me);
      return permissions?.has(PermissionFlagsBits.ViewChannel)
        && permissions.has(PermissionFlagsBits.CreateInstantInvite);
    }) || null;
}

async function createServerInvite(guild, reason = 'Bot developer requested server invite') {
  if (guild.vanityURLCode) {
    return {
      url: `https://discord.gg/${guild.vanityURLCode}`,
      channel: null,
      vanity: true
    };
  }

  const channel = await findInviteChannel(guild);
  if (!channel) {
    throw new Error('I could not find a channel where I can create server invites.');
  }

  const invite = await channel.createInvite({
    maxAge: 0,
    maxUses: 0,
    unique: true,
    reason
  });

  return {
    url: invite.url,
    channel,
    vanity: false
  };
}

module.exports = {
  botInviteUrl,
  resolveBotGuild,
  listBotGuilds,
  guildLine,
  guildDetails,
  createServerInvite
};
