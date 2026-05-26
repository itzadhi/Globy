const ModerationLog = require('../models/ModerationLog');
const logger = require('../utils/logger');

async function createModerationLog(data) {
  try {
    return await ModerationLog.create(data);
  } catch (error) {
    logger.error('Failed to write moderation log:', error);
    return null;
  }
}

async function logBlockedMessage(message, network, reasons, metadata = {}) {
  return createModerationLog({
    guildId: message.guildId,
    channelId: message.channelId,
    network,
    userId: message.author?.id,
    action: 'message_blocked',
    reason: reasons.join(', '),
    severity: reasons.some((reason) => reason.includes('mention') || reason.includes('scam')) ? 'high' : 'medium',
    metadata
  });
}

async function logWebhookFailure(syncChannel, reason, metadata = {}) {
  return createModerationLog({
    guildId: syncChannel.guildId,
    channelId: syncChannel.channelId,
    network: syncChannel.network,
    action: 'webhook_failure',
    reason,
    severity: 'high',
    metadata
  });
}

async function logRecoverySession(interaction, network, summary) {
  return createModerationLog({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    network,
    userId: interaction.user.id,
    moderatorId: interaction.user.id,
    action: 'message_recovery',
    reason: `Recovered ${summary.recovered} messages`,
    severity: summary.failed ? 'medium' : 'low',
    metadata: summary
  });
}

module.exports = {
  createModerationLog,
  logBlockedMessage,
  logWebhookFailure,
  logRecoverySession
};
