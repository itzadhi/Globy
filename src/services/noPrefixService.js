const NoPrefixUser = require('../models/NoPrefixUser');
const { config } = require('../config/env');
const { isDeveloper } = require('../middleware/permissions');

async function isNoPrefixAllowed(userId) {
  if (!config.commands.noPrefixEnabled) return false;
  if (isDeveloper(userId)) return true;

  const record = await NoPrefixUser.exists({
    userId,
    active: true
  });

  return Boolean(record);
}

async function addNoPrefixUser(user, moderator, reason = 'No reason provided') {
  return NoPrefixUser.findOneAndUpdate(
    { userId: user.id },
    {
      $set: {
        username: user.tag || user.username,
        active: true,
        reason,
        addedBy: moderator.id,
        removedBy: null,
        removedAt: null,
        removeReason: null
      }
    },
    { upsert: true, new: true }
  );
}

async function removeNoPrefixUser(userId, moderator, reason = 'No reason provided') {
  const updated = await NoPrefixUser.updateOne(
    { userId, active: true },
    {
      $set: {
        active: false,
        removedBy: moderator.id,
        removedAt: new Date(),
        removeReason: reason
      }
    }
  );

  return updated.modifiedCount;
}

async function listNoPrefixUsers(limit = 15) {
  if (NoPrefixUser.db.readyState !== 1) return [];

  return NoPrefixUser.find({ active: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  isNoPrefixAllowed,
  addNoPrefixUser,
  removeNoPrefixUser,
  listNoPrefixUsers
};
