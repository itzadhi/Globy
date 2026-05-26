const { PermissionFlagsBits } = require('discord.js');
const { config } = require('../config/env');
const { cooldownCache, fingerprintCache } = require('../cache/runtimeCache');
const { findDangerousMentions, sanitizeMentions, compactWhitespace, truncate } = require('../utils/text');

const INVITE_PATTERN = /(discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;
const SCAM_PATTERNS = [
  /free\s+nitro/i,
  /steamcommunity\.(?!com)/i,
  /discord(?:-)?gift/i,
  /airdrop\s+claim/i,
  /wallet\s+verify/i
];
const CUSTOM_EMOJI_PATTERN = /<a?:\w{2,32}:\d{17,22}>/g;
const UNICODE_EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;

function spamCheck(message, network) {
  const key = `spam:${network}:${message.author.id}`;
  const current = cooldownCache.get(key) || { count: 0 };
  current.count += 1;
  cooldownCache.set(key, current, Math.ceil(config.moderation.spamWindowMs / 1000));
  return current.count > config.moderation.spamLimit;
}

function repeatedMessageCheck(message, network) {
  const fingerprint = compactWhitespace(message.content.toLowerCase()).slice(0, 180);
  if (!fingerprint || fingerprint.length < 4) return false;

  const key = `repeat:${network}:${message.author.id}`;
  const current = fingerprintCache.get(key) || { fingerprint, count: 0 };

  if (current.fingerprint === fingerprint) {
    current.count += 1;
  } else {
    current.fingerprint = fingerprint;
    current.count = 1;
  }

  fingerprintCache.set(key, current, 20);
  return current.count >= 3;
}

function hasExcessiveCaps(content) {
  const letters = content.replace(/[^a-z]/gi, '');
  if (letters.length < 18) return false;
  const caps = letters.replace(/[^A-Z]/g, '').length;
  return caps / letters.length >= 0.75;
}

function hasEmojiSpam(content) {
  const customCount = (content.match(CUSTOM_EMOJI_PATTERN) || []).length;
  const unicodeCount = (content.match(UNICODE_EMOJI_PATTERN) || []).length;
  const total = customCount + unicodeCount;
  const compact = content.replace(/\s/g, '');
  return total >= 12 || (total >= 8 && compact.length > 0 && total / compact.length > 0.35);
}

function hasToxicWords(content) {
  const lowered = content.toLowerCase();
  return config.moderation.toxicWords.some((word) => word && lowered.includes(word));
}

async function inspectMessage(message, network, options = {}) {
  const countSpam = options.countSpam !== false;
  const reasons = [];
  const content = message.content || '';
  const dangerousMentions = findDangerousMentions(message);

  if (dangerousMentions.length) reasons.push(...dangerousMentions);
  if (INVITE_PATTERN.test(content)) reasons.push('invite link');
  if (SCAM_PATTERNS.some((pattern) => pattern.test(content))) reasons.push('scam pattern');
  if (hasToxicWords(content)) reasons.push('toxic word');
  if (hasExcessiveCaps(content)) reasons.push('excessive caps');
  if (hasEmojiSpam(content)) reasons.push('emoji spam');
  if (countSpam && spamCheck(message, network)) reasons.push('rapid message spam');
  if (countSpam && repeatedMessageCheck(message, network)) reasons.push('repeated message');

  const allowed = reasons.length === 0;
  const sanitizedContent = truncate(sanitizeMentions(content), 1700);

  return {
    allowed,
    reasons,
    sanitizedContent,
    deleteMessage: reasons.some((reason) => ['global mention', 'scam pattern', 'invite link'].includes(reason)),
    warnUser: true
  };
}

async function warnAndMaybeDelete(message, inspection) {
  const me = message.guild?.members?.me;
  const channelPermissions = me ? message.channel?.permissionsFor(me) : null;

  if (inspection.deleteMessage && channelPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await message.delete().catch(() => null);
  }

  if (!inspection.warnUser || !channelPermissions?.has(PermissionFlagsBits.SendMessages)) return;

  const warning = await message.channel
    .send({
      content: `${message.author}, your message was not synced because it triggered: ${inspection.reasons.join(', ')}.`,
      allowedMentions: { users: [message.author.id], roles: [], parse: [] }
    })
    .catch(() => null);

  if (warning) {
    setTimeout(() => warning.delete().catch(() => null), 8000);
  }
}

module.exports = {
  inspectMessage,
  warnAndMaybeDelete
};
