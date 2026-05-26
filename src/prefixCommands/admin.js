const { EmbedBuilder } = require('discord.js');
const {
  addNoPrefixUser,
  removeNoPrefixUser,
  listNoPrefixUsers,
  isNoPrefixAllowed
} = require('../services/noPrefixService');
const { isDeveloper } = require('../middleware/permissions');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
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
          : 'No database allowlist users yet. Developers and `NO_PREFIX_IDS` still work automatically.';

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`${emojis.spark} No-Prefix Allowlist`)
          .setDescription(description);

        await safeReply(message, { embeds: [embed] });
        return;
      }

      throw new Error(`${usage(prefix, 'noprefix <status|add|remove|list> [user] [reason]')}`);
    }
  }
];
