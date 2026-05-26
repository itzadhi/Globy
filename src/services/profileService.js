const Profile = require('../models/Profile');
const XP = require('../models/XP');
const { cooldownCache } = require('../cache/runtimeCache');
const { config } = require('../config/env');

function xpRequiredForLevel(level) {
  return 100 + level * level * 60;
}

function calculateProgress(totalXp) {
  let remaining = Math.max(0, totalXp);
  let level = 0;

  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }

  return {
    level,
    xp: remaining,
    required: xpRequiredForLevel(level),
    percent: Math.min(100, Math.floor((remaining / xpRequiredForLevel(level)) * 100))
  };
}

function calculateMessageXp(content = '') {
  const lengthBonus = Math.min(8, Math.floor(content.trim().length / 40));
  return 10 + lengthBonus + Math.floor(Math.random() * 5);
}

async function ensureProfile(user) {
  return Profile.findOneAndUpdate(
    { userId: user.id },
    {
      $set: {
        username: user.username,
        globalName: user.globalName,
        avatar: user.displayAvatarURL?.({ extension: 'png', size: 256 }) || user.avatarURL?.()
      },
      $setOnInsert: {
        totalXp: 0,
        xp: 0,
        level: 0,
        reputation: 0,
        messageCount: 0
      }
    },
    { upsert: true, new: true }
  );
}

async function addMessageXp(message, network) {
  const cooldownKey = `xp:${message.author.id}`;
  const profile = await ensureProfile(message.author);
  const canGainXp = !cooldownCache.get(cooldownKey);
  const amount = canGainXp ? calculateMessageXp(message.content) : 0;

  const networkIndex = profile.networks.findIndex((item) => item.name === network);
  if (networkIndex === -1) {
    profile.networks.push({ name: network, messageCount: 1, xp: amount });
  } else {
    profile.networks[networkIndex].messageCount += 1;
    profile.networks[networkIndex].xp += amount;
  }

  profile.messageCount += 1;
  profile.lastMessageAt = new Date();

  if (amount > 0) {
    profile.totalXp += amount;
    const progress = calculateProgress(profile.totalXp);
    profile.level = progress.level;
    profile.xp = progress.xp;
    profile.lastXpAt = new Date();
    cooldownCache.set(cooldownKey, true, Math.ceil(config.xp.cooldownMs / 1000));

    await XP.create({
      userId: message.author.id,
      guildId: message.guildId,
      network,
      messageId: message.id,
      amount,
      reason: 'message'
    }).catch(() => null);
  }

  await profile.save();
  return { profile, amount };
}

async function getProfileRank(userId) {
  const profile = await Profile.findOne({ userId }).lean();
  if (!profile) return null;
  const higher = await Profile.countDocuments({
    $or: [
      { totalXp: { $gt: profile.totalXp } },
      { totalXp: profile.totalXp, messageCount: { $gt: profile.messageCount } }
    ]
  });

  return {
    profile,
    rank: higher + 1,
    progress: calculateProgress(profile.totalXp)
  };
}

async function getLeaderboard(limit = 10) {
  const profiles = await Profile.find({})
    .sort({ totalXp: -1, messageCount: -1 })
    .limit(limit)
    .lean();

  return profiles.map((profile, index) => ({
    ...profile,
    rank: index + 1,
    progress: calculateProgress(profile.totalXp)
  }));
}

async function giveReputation(giver, receiver) {
  if (giver.id === receiver.id) {
    throw new Error('You cannot give reputation to yourself.');
  }

  const key = `rep:${giver.id}:${receiver.id}`;
  if (cooldownCache.get(key)) {
    throw new Error('You already gave this user reputation recently.');
  }

  await ensureProfile(giver);
  const receiverProfile = await ensureProfile(receiver);
  receiverProfile.reputation += 1;
  await receiverProfile.save();

  cooldownCache.set(key, true, Math.ceil(config.xp.reputationCooldownMs / 1000));
  return receiverProfile;
}

module.exports = {
  xpRequiredForLevel,
  calculateProgress,
  ensureProfile,
  addMessageXp,
  getProfileRank,
  getLeaderboard,
  giveReputation
};
