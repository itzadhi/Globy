const { Events } = require('discord.js');
const SyncChannel = require('../models/Channel');
const { webhookCache } = require('../cache/runtimeCache');

module.exports = {
  name: Events.WebhooksUpdate,
  async execute(channel) {
    if (!channel?.id) return;
    webhookCache.del(`webhook:${channel.id}`);
    await SyncChannel.updateOne(
      { channelId: channel.id },
      {
        $inc: { failureCount: 0 }
      }
    );
  }
};
