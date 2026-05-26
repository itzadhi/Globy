const Guild = require('../models/Guild');
const User = require('../models/User');

async function upsertGuild(guild) {
  if (!guild) return null;

  return Guild.findOneAndUpdate(
    { guildId: guild.id },
    {
      $set: {
        name: guild.name,
        ownerId: guild.ownerId,
        icon: guild.iconURL?.({ size: 128 }) || guild.icon,
        memberCount: guild.memberCount || 0,
        active: true,
        leftAt: null
      },
      $setOnInsert: {
        joinedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}

async function markGuildLeft(guild) {
  if (!guild) return null;
  return Guild.findOneAndUpdate(
    { guildId: guild.id },
    {
      $set: {
        active: false,
        leftAt: new Date()
      }
    },
    { new: true }
  );
}

async function upsertUser(user) {
  if (!user) return null;

  return User.findOneAndUpdate(
    { userId: user.id },
    {
      $set: {
        username: user.username,
        globalName: user.globalName,
        avatar: user.displayAvatarURL?.({ extension: 'png', size: 256 }) || user.avatarURL?.(),
        bot: user.bot,
        lastSeenAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}

module.exports = {
  upsertGuild,
  markGuildLeft,
  upsertUser
};
