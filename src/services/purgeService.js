const { PermissionFlagsBits } = require('discord.js');
const { createModerationLog } = require('./loggingService');

function assertPurgePermissions(member, channel) {
  if (!member?.permissions?.has(PermissionFlagsBits.ManageMessages)) {
    throw new Error('You need Manage Messages permission to purge messages.');
  }

  const botPermissions = channel.permissionsFor(channel.guild.members.me);
  if (!botPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    throw new Error('I need Manage Messages permission in this channel.');
  }

  if (!botPermissions?.has(PermissionFlagsBits.ReadMessageHistory)) {
    throw new Error('I need Read Message History permission in this channel.');
  }
}

async function purgeMessages({ channel, amount, user, moderator, reason, excludeIds = [] }) {
  const safeAmount = Math.min(Math.max(Number(amount) || 0, 1), 100);
  const fetchLimit = user ? 100 : safeAmount;
  const messages = await channel.messages.fetch({ limit: fetchLimit });
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const deletable = messages.filter((message) => {
    if (message.createdTimestamp < cutoff) return false;
    if (message.pinned) return false;
    if (excludeIds.includes(message.id)) return false;
    if (user && message.author.id !== user.id) return false;
    return true;
  });

  const selected = deletable.first(safeAmount);
  if (!selected.length) {
    throw new Error('No deletable messages found. Discord cannot bulk-delete messages older than 14 days.');
  }

  const deleted = await channel.bulkDelete(selected, true);

  await createModerationLog({
    guildId: channel.guildId,
    channelId: channel.id,
    userId: user?.id,
    moderatorId: moderator.id,
    action: 'purge',
    reason: reason || 'No reason provided',
    severity: 'medium',
    metadata: {
      requestedAmount: safeAmount,
      deletedCount: deleted.size,
      filteredUserId: user?.id
    }
  });

  return {
    requested: safeAmount,
    deleted: deleted.size,
    skipped: safeAmount - deleted.size
  };
}

module.exports = {
  assertPurgePermissions,
  purgeMessages
};
