const { EmbedBuilder } = require('discord.js');
const {
  addNoPrefixUser,
  removeNoPrefixUser,
  isNoPrefixAllowed
} = require('../services/noPrefixService');
const {
  botInviteUrl,
  createServerInvite,
  resolveBotGuild
} = require('../services/botGuildService');
const {
  buildBotGuildDetailPayload,
  buildBotGuildHomePayload,
  buildNoPrefixHomePayload,
  wireBotGuildCollector,
  wireNoPrefixCollector
} = require('../services/devPanelService');
const { isDeveloper } = require('../middleware/permissions');
const { config } = require('../config/env');
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
    category: 'Dev',
    devOnly: true,
    usage: 'noprefix <status|add|remove|list> [user] [reason]',
    description: 'Manage users who can run commands without the comma prefix.',
    async execute(message, args, { prefix }) {
      const action = (args.shift() || 'status').toLowerCase();

      if (action === 'status') {
        const allowed = await isNoPrefixAllowed(message.author.id);
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('No-Prefix Status')
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
          .setTitle('No-Prefix Added')
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
          .setTitle('No-Prefix Removed')
          .setDescription(`${user.tag || user.username} must use \`${prefix}\` again.`);

        await safeReply(message, { embeds: [embed] });
        return;
      }

      if (action === 'list') {
        const reply = await safeReply(message, await buildNoPrefixHomePayload(message.author.id));
        wireNoPrefixCollector(reply, message.author.id);
        return;
      }

      throw new Error(`${usage(prefix, 'noprefix <status|add|remove|list> [user] [reason]')}`);
    }
  },
  {
    name: 'botguild',
    aliases: ['botguilds', 'guilds', 'servers'],
    category: 'Dev',
    devOnly: true,
    usage: 'botguild <list|info|invite|leave|join> [server_id] [reason]',
    description: 'Manage servers the bot is in. Bot developers only.',
    async execute(message, args, { prefix }) {
      const action = (args.shift() || 'list').toLowerCase();

      if (action === 'list') {
        const limit = Math.min(Math.max(Number(args[0]) || 25, 1), 25);
        const reply = await safeReply(message, buildBotGuildHomePayload(message.client, message.author.id, { limit }));
        wireBotGuildCollector(reply, message.author.id, message.client, { limit });
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
        const reply = await safeReply(message, await buildBotGuildDetailPayload(message.client, guild, message.author.id));
        wireBotGuildCollector(reply, message.author.id, message.client);
        return;
      }

      if (action === 'invite') {
        const invite = await createServerInvite(guild, `Invite requested by ${message.author.tag || message.author.username}`);
        const reply = await safeReply(message, await buildBotGuildDetailPayload(message.client, guild, message.author.id, {
          inviteUrl: invite.url,
          notice: `Invite created from ${invite.vanity ? 'Vanity URL' : invite.channel?.toString() || 'Unknown'}.`
        }));
        wireBotGuildCollector(reply, message.author.id, message.client);
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
