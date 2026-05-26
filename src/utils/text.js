const NETWORK_PATTERN = /^[a-z0-9_-]{2,32}$/;

function truncate(value, max = 1900) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

function normalizeNetworkName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function isValidNetworkName(value) {
  return NETWORK_PATTERN.test(value);
}

function sanitizeMentions(content) {
  return String(content || '')
    .replace(/@everyone/gi, '`@everyone`')
    .replace(/@here/gi, '`@here`')
    .replace(/<@&(\d+)>/g, '[role mention]')
    .replace(/<@!?(\d+)>/g, '@user')
    .replace(/<#(\d+)>/g, '#channel');
}

function findDangerousMentions(message) {
  const reasons = [];
  const everyoneMentioned = message.mentions?.everyone;
  const userMentions = message.mentions?.users?.size || 0;
  const roleMentions = message.mentions?.roles?.size || 0;

  if (everyoneMentioned) reasons.push('global mention');
  if (roleMentions >= 3) reasons.push('mass role mentions');
  if (userMentions + roleMentions >= 7) reasons.push('mass mention spam');

  return reasons;
}

function buildWebhookUsername(member, user, globeEmoji) {
  const baseName = member?.displayName || user?.globalName || user?.username || 'Unknown User';
  return truncate(`${baseName} ${globeEmoji}`, 80);
}

function stripMarkdown(value) {
  return String(value || '').replace(/[*_~`>|#]/g, '').trim();
}

function compactWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

module.exports = {
  truncate,
  normalizeNetworkName,
  isValidNetworkName,
  sanitizeMentions,
  findDangerousMentions,
  buildWebhookUsername,
  stripMarkdown,
  compactWhitespace
};
