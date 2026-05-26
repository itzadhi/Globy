const SyncChannel = require('../models/Channel');
const MessageLog = require('../models/MessageLog');
const { missingBotPermissions, permissionNames } = require('../middleware/permissions');
const webhookService = require('./webhookService');

async function getSyncHealth(client, discordChannel, options = {}) {
  const syncChannel = await SyncChannel.findOne({
    guildId: discordChannel.guildId,
    channelId: discordChannel.id,
    active: true
  }).lean();

  if (!syncChannel) {
    return {
      connected: false,
      channel: discordChannel,
      fields: [
        { name: 'Connected', value: 'No' },
        { name: 'Fix', value: 'Run `/setchannel` or `,setchannel` in this channel.' }
      ]
    };
  }

  await discordChannel.guild.members.fetchMe().catch(() => null);
  const missing = missingBotPermissions(discordChannel);
  const [targets, failedCopies, loggedMessages] = await Promise.all([
    SyncChannel.countDocuments({
      network: syncChannel.network,
      active: true,
      channelId: { $ne: syncChannel.channelId }
    }),
    MessageLog.countDocuments({
      network: syncChannel.network,
      webhookMessages: {
        $elemMatch: {
          channelId: syncChannel.channelId,
          status: 'failed'
        }
      }
    }),
    MessageLog.countDocuments({ network: syncChannel.network })
  ]);

  let webhookStatus = syncChannel.webhookId && syncChannel.webhookToken ? 'Stored' : 'Missing';
  if (options.repair && !missing.length) {
    await webhookService.resolveWebhook(syncChannel, discordChannel);
    webhookStatus = 'Ready / repaired';
  }

  return {
    connected: true,
    channel: discordChannel,
    syncChannel,
    missing,
    fields: [
      { name: 'Connected', value: 'Yes' },
      { name: 'Target Channels', value: `${targets}` },
      { name: 'Webhook', value: webhookStatus },
      { name: 'Bot Permissions', value: missing.length ? `Missing: ${permissionNames(missing).join(', ')}` : 'OK' },
      { name: 'Logged Sync Messages', value: `${loggedMessages}` },
      { name: 'Failed Copies In This Channel', value: `${failedCopies}` },
      { name: 'Stored Failure Count', value: `${syncChannel.failureCount || 0}` }
    ]
  };
}

module.exports = {
  getSyncHealth
};
