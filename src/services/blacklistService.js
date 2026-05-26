const ms = require('ms');
const Blacklist = require('../models/Blacklist');
const { createModerationLog } = require('./loggingService');

function activeFilter(targetId, types = ['ban', 'mute']) {
  return {
    targetId,
    type: { $in: types },
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  };
}

async function getActiveRestriction(userId) {
  return Blacklist.findOne(activeFilter(userId)).sort({ createdAt: -1 }).lean();
}

async function isBlocked(userId) {
  const restriction = await getActiveRestriction(userId);
  return Boolean(restriction && ['ban', 'mute'].includes(restriction.type));
}

async function createRestriction({ target, type, reason, moderator, duration, guildId, network, scope = 'global' }) {
  const expiresAt = duration ? new Date(Date.now() + ms(duration)) : null;
  if (duration && !expiresAt.getTime()) {
    throw new Error('Invalid duration. Try values like 10m, 2h, or 7d.');
  }

  const record = await Blacklist.create({
    targetId: target.id,
    targetTag: target.tag || target.username,
    type,
    scope,
    network,
    guildId,
    active: true,
    reason,
    moderatorId: moderator.id,
    expiresAt
  });

  await createModerationLog({
    guildId,
    network,
    userId: target.id,
    moderatorId: moderator.id,
    action: `global_${type}`,
    reason,
    severity: type === 'ban' ? 'critical' : 'high',
    metadata: {
      expiresAt,
      targetTag: target.tag || target.username
    }
  });

  return record;
}

async function liftRestriction({ targetId, type, moderator, reason, guildId }) {
  const updated = await Blacklist.updateMany(
    {
      targetId,
      type,
      active: true
    },
    {
      $set: {
        active: false,
        liftedAt: new Date(),
        liftedBy: moderator.id,
        liftReason: reason || 'No reason provided'
      }
    }
  );

  await createModerationLog({
    guildId,
    userId: targetId,
    moderatorId: moderator.id,
    action: `global_un${type}`,
    reason: reason || 'No reason provided',
    severity: 'medium',
    metadata: {
      modifiedCount: updated.modifiedCount
    }
  });

  return updated.modifiedCount;
}

module.exports = {
  getActiveRestriction,
  isBlocked,
  createRestriction,
  liftRestriction
};
