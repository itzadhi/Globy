const SyncChannel = require('../models/Channel');
const { webhookCache } = require('../cache/runtimeCache');
const logger = require('../utils/logger');

function uniquePrefixCommandCount(client) {
  return new Set([...client.prefixCommands.values()].map((command) => command.name)).size;
}

async function preloadWebhooks() {
  const channels = await SyncChannel.find({
    active: true,
    webhookId: { $exists: true, $ne: null },
    webhookToken: { $exists: true, $ne: null }
  })
    .select('channelId webhookId webhookToken webhookName')
    .lean();

  for (const channel of channels) {
    webhookCache.set(`webhook:${channel.channelId}`, {
      webhookId: channel.webhookId,
      webhookToken: channel.webhookToken,
      webhookName: channel.webhookName
    });
  }

  return channels.length;
}

async function preloadRuntime(client) {
  const slashCommands = client.commands?.size || 0;
  const prefixAliases = client.prefixCommands?.size || 0;
  const prefixCommands = uniquePrefixCommandCount(client);
  const webhooks = await preloadWebhooks();

  client.preload = {
    slashCommands,
    prefixCommands,
    prefixAliases,
    cachedWebhooks: webhooks,
    warmedAt: new Date()
  };

  logger.success(`Preloaded ${slashCommands} slash commands, ${prefixCommands} prefix commands, ${prefixAliases} prefix aliases, and ${webhooks} webhooks`);

  return client.preload;
}

module.exports = {
  preloadRuntime
};
