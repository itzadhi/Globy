const ID_PREFIX = 'globy';

function safePart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function ownedCustomId(scope, action, ownerId) {
  const cleanScope = safePart(scope);
  const cleanAction = safePart(action);
  const cleanOwner = String(ownerId || '').replace(/\D/g, '');

  if (!cleanScope || !cleanAction || !cleanOwner) {
    throw new Error('Owned component IDs require scope, action, and owner ID.');
  }

  return `${ID_PREFIX}:${cleanScope}:${cleanAction}:${cleanOwner}`;
}

function parseOwnedCustomId(customId) {
  const parts = String(customId || '').split(':');
  if (parts.length !== 4 || parts[0] !== ID_PREFIX) return null;

  const [, scope, action, ownerId] = parts;
  if (!scope || !action || !/^\d{17,22}$/.test(ownerId)) return null;

  return { scope, action, ownerId };
}

function isOwnedBy(customId, userId) {
  const parsed = parseOwnedCustomId(customId);
  return Boolean(parsed && parsed.ownerId === String(userId));
}

module.exports = {
  ownedCustomId,
  parseOwnedCustomId,
  isOwnedBy
};
