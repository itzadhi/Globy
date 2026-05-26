const SyncChannel = require('../models/Channel');
const Network = require('../models/Network');
const MessageLog = require('../models/MessageLog');
const queue = require('./queueService');
const { buildPayloadFromLog, relayToTarget } = require('./syncService');
const { config } = require('../config/env');

function hasHealthyCopy(logRecord, targetChannelId) {
  return logRecord.webhookMessages.some((entry) => {
    return entry.channelId === targetChannelId && ['sent', 'edited', 'recovered'].includes(entry.status);
  });
}

async function recoverNetwork(client, options) {
  const network = options.network;
  const limit = Math.min(options.limit || 25, config.sync.maxRecoveryLimit);
  const force = Boolean(options.force);
  const filter = {
    network,
    status: { $in: ['active', 'edited', 'deleted'] }
  };

  if (options.channelId) {
    filter.sourceChannelId = options.channelId;
  }

  const logs = await MessageLog.find(filter).sort({ createdAt: 1 }).limit(limit);
  const targets = await SyncChannel.find({ network, active: true }).lean();
  const summary = {
    scanned: logs.length,
    recovered: 0,
    skipped: 0,
    failed: 0
  };

  for (const logRecord of logs) {
    const payload = buildPayloadFromLog(logRecord.toObject());
    for (const target of targets) {
      if (target.channelId === logRecord.sourceChannelId) {
        summary.skipped += 1;
        continue;
      }

      const healthy = hasHealthyCopy(logRecord, target.channelId);
      if (healthy || (!force && hasHealthyCopy(logRecord, target.channelId))) {
        summary.skipped += 1;
        continue;
      }

      try {
        await queue.enqueue(`recover:${network}:${target.channelId}`, async () => {
          await relayToTarget(client, target, logRecord, payload, 'recovered');
        }, config.sync.recoveryDelayMs);
        summary.recovered += 1;
      } catch (error) {
        summary.failed += 1;
      }
    }
  }

  if (summary.recovered > 0) {
    await Network.updateOne(
      { name: network },
      {
        $inc: { recoveredMessageCount: summary.recovered },
        $setOnInsert: {
          name: network,
          displayName: network
        }
      },
      { upsert: true }
    );
  }

  return summary;
}

module.exports = {
  recoverNetwork
};
