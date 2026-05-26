const { EmbedBuilder } = require('discord.js');
const {
  addNoPrefixUser,
  removeNoPrefixUser,
  listNoPrefixUsers,
  isNoPrefixAllowed
} = require('../services/noPrefixService');
const {
  botInviteUrl,
  createServerInvite,
  guildDetails,
  guildLine,
  listBotGuilds,
  resolveBotGuild
} = require('../services/botGuildService');
const { isDeveloper } = require('../middleware/permissions');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
const { discordTimestamp } = require('../utils/time');
const { actionRow, linkButton } = require('../utils/componentsV2');
const { resolveUser, safeReply, usage } = require('./helpers');

async function assertDeveloper(message) {
  if (!isDeveloper(message.author.id)) {
    throw new Error('Only configured bot developers can manage the no-prefix allowlist.');
  }
}

module.exports = [
  {
    name: 'noprefix',
    aliases: ['np'],
    category: 'Admin',
    devOnly: true,
    usage: 'noprefix <status|add|remove|list> [user] [reason]',
    description: 'Manage users who can run commands without the comma prefix.',
    async execute(message, args, { prefix }) {
      const action = (args.shift() || 'status').toLowerCase();

      if (action === 'status') {
        const allowed = await isNoPrefixAllowed(message.author.id);
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`${emojis.spark} No-Prefix Status`)
          .setDescription([
            `System: **${config.commands.noPrefixEnabled ? 'Enabled' : 'Disabled'}**`,
            `You are allowed: **${allowed ? 'Yes' : 'No'}**`,
            `Manage: \`${prefix}noprefix add @user trusted helper\``
          ].join('\n'));

        await safeReply(message, { embeds: [embed] });
        return;
      }

      await assertDeveloper(message);

      if (action === 'add') {
        const user = await resolveUser(message, args.shift());
        if (!user) throw new Error(`${usage(prefix, 'noprefix add @user [reason]')}`);

        const reason = args.join(' ') || 'Trusted no-prefix user';
        const record = await addNoPrefixUser(user, message.author, reason);
        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${emojis.spark} No-Prefix Added`)
          .setDescription(`${user.tag || user.username} can now run prefix commands without \`${prefix}\`.`)
          .addFields({ name: 'Reason', value: record.reason, inline: false });

        await safeReply(message, { embeds: [embed] });
        return;
      }

      if (action === 'remove' || action === 'delete') {
        const user = await resolveUser(message, args.shift());
        if (!user) throw new Error(`${usage(prefix, 'noprefix remove @user [reason]')}`);

        const reason = args.join(' ') || 'Removed from no-prefix allowlist';
        const modified = await removeNoPrefixUser(user.id, message.author, reason);
        if (!modified) throw new Error('That user is not currently on the no-prefix allowlist.');

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${emojis.shield} No-Prefix Removed`)
          .setDescription(`${user.tag || user.username} must use \`${prefix}\` again.`);

        await safeReply(message, { embeds: [embed] });
        return;
      }

      if (action === 'list') {
        const records = await listNoPrefixUsers(15);
        const description = records.length
          ? records.map((record, index) => `${index + 1}. <@${record.userId}> - ${record.reason}`).join('\n')
          : 'No database allowlist users yet. Bot developers still work automatically.';

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`${emojis.spark} No-Prefix Allowlist`)
          .setDescription(description);

        await safeReply(message, { embeds: [embed] });
        return;
      }

      throw new Error(`${usage(prefix, 'noprefix <status|add|remove|list> [user] [reason]')}`);
    }
  },
  {
    name: 'botguild',
    aliases: ['botguilds', 'guilds', 'servers'],
    category: 'Admin',
    devOnly: true,
    usage: 'botguild <list|info|invite|leave|join> [server_id] [reason]',
    description: 'Manage servers the bot is in. Bot developers only.',
    async execute(message, args, { prefix }) {
      const action = (args.shift() || 'list').toLowerCase();

      if (action === 'list') {
        const limit = Math.min(Math.max(Number(args[0]) || 10, 1), 25);
        const guilds = listBotGuilds(message.client, limit);
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('Bot Servers')
          .setDescription(guilds.length ? guilds.map(guildLine).join('\n\n') : 'The bot is not currently cached in any servers.')
          .addFields({ name: 'Total Cached', value: `${message.client.guilds.cache.size}`, inline: true });

        await safeReply(message, { embeds: [embed] });
        return;
      }

      if (action === 'join' || action === 'joinlink') {
        const url = botInviteUrl(config.clientId);
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('Bot Join Link')
          .setDescription('Discord bots cannot self-join a server from a command. Use this OAuth link with an account that has permission to add bots.');

        await safeReply(message, {
          embeds: [embed],
          components: [actionRow(linkButton('Invite Bot', url))]
        });
        return;
      }

      const guildId = args.shift();
      if (!guildId) throw new Error(`${usage(prefix, 'botguild <info|invite|leave> <server_id>')}`);
      const guild = await resolveBotGuild(message.client, guildId);

      if (action === 'info') {
        const details = await guildDetails(guild);
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(details.name)
          .setDescription('Server details visible to the bot.')
          .addFields(
            { name: 'Server ID', value: details.id, inline: false },
            { name: 'Owner', value: details.owner, inline: false },
            { name: 'Members', value: `${details.members}`, inline: true },
            { name: 'Channels', value: `${details.channels}`, inline: true },
            { name: 'Roles', value: `${details.roles}`, inline: true },
            { name: 'Created', value: discordTimestamp(details.createdAt, 'D'), inline: true },
            { name: 'Bot Joined', value: details.joinedAt ? discordTimestamp(details.joinedAt, 'D') : 'Unknown', inline: true },
            { name: 'Shard', value: `${details.shardId}`, inline: true }
          );

        await safeReply(message, { embeds: [embed] });
        return;
      }

      if (action === 'invite') {
        const invite = await createServerInvite(guild, `Invite requested by ${message.author.tag || message.author.username}`);
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('Server Invite Created')
          .setDescription(`Invite for **${guild.name}**.`)
          .addFields(
            { name: 'Server ID', value: guild.id, inline: false },
            { name: 'Channel', value: invite.vanity ? 'Vanity URL' : invite.channel?.toString() || 'Unknown', inline: true }
          );

        await safeReply(message, {
          embeds: [embed],
          components: [actionRow(linkButton('Open Invite', invite.url))]
        });
        return;
      }

      if (action === 'leave') {
        const reason = args.join(' ') || `Bot developer ${message.author.tag || message.author.username} requested leave`;
        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(guild.id === message.guildId ? 'Leaving Current Server' : 'Server Left')
          .setDescription(`Leaving **${guild.name}** (\`${guild.id}\`).`)
          .addFields({ name: 'Reason', value: reason, inline: false });

        await safeReply(message, { embeds: [embed] });
        await guild.leave();
        return;
      }

      throw new Error(`${usage(prefix, 'botguild <list|info|invite|leave|join> [server_id] [reason]')}`);
    }
  }
];
