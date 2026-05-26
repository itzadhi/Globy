const NETWORK_PATTERN = /^(?=.*[a-z])[a-z0-9_-]{2,32}$/;
const SNOWFLAKE_PATTERN = /^\d{17,22}$/;

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
  return NETWORK_PATTERN.test(value) && !SNOWFLAKE_PATTERN.test(value);
}

function sanitizeMentions(content) {
  return String(content || '')
    .replace(/@everyone/gi, '`@everyone`')
    .replace(/@here/gi, '`@here`')
    .replace(/<@&(\d+)>/g, '[role mention]')
    .replace(/<@!?(\d+)>/g, '@user')
    .replace(/<#(\d+)>/g, '#channel');
}

function safeDisplayName(value, fallback) {
  return truncate(String(value || fallback || 'user').replace(/[\r\n<>`]/g, ' ').replace(/\s+/g, ' ').trim(), 80) || fallback;
}

function sanitizeMessageMentions(message, content = message?.content || '') {
  let safe = String(content || '')
    .replace(/@everyone/gi, '`@everyone`')
    .replace(/@here/gi, '`@here`');

  for (const [id, user] of message.mentions?.users || []) {
    const member = message.mentions?.members?.get(id);
    const name = safeDisplayName(member?.displayName || user.globalName || user.username, 'user');
    safe = safe.replace(new RegExp(`<@!?${id}>`, 'g'), `@${name}`);
  }

  for (const [id, role] of message.mentions?.roles || []) {
    safe = safe.replace(new RegExp(`<@&${id}>`, 'g'), `@${safeDisplayName(role.name, 'role')}`);
  }

  for (const [id, channel] of message.mentions?.channels || []) {
    safe = safe.replace(new RegExp(`<#${id}>`, 'g'), `#${safeDisplayName(channel.name, 'channel')}`);
  }

  return safe
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
  return truncate(`${baseName}${globeEmoji ? ` ${globeEmoji}` : ''}`, 80);
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
  sanitizeMessageMentions,
  findDangerousMentions,
  buildWebhookUsername,
  stripMarkdown,
  compactWhitespace
};
