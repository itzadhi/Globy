const MODES = {
  plain: {
    value: 'plain',
    label: 'Plain',
    description: 'Real user webhook: exact username, avatar, and plain message content.'
  },
  cv2: {
    value: 'cv2',
    label: 'CV2 Card',
    description: 'Bot-style card: Globy webhook with the user avatar, username, and message inside a premium card.'
  }
};

const MODE_ALIASES = {
  plain: 'plain',
  normal: 'plain',
  simple: 'plain',
  webhook: 'plain',
  cv2: 'cv2',
  card: 'cv2'
};

function parseDisplayModeInput(value) {
  const mode = String(value || '').toLowerCase().trim();
  return MODE_ALIASES[mode] || null;
}

function normalizeDisplayMode(value, fallback = 'plain') {
  return parseDisplayModeInput(value) || parseDisplayModeInput(fallback) || 'plain';
}

function displayModeLabel(value) {
  return MODES[normalizeDisplayMode(value)].label;
}

function displayModeDescription(value) {
  return MODES[normalizeDisplayMode(value)].description;
}

function displayModeChoices() {
  return Object.values(MODES).map((mode) => ({
    name: mode.value === 'cv2'
      ? 'CV2 Card - bot card with user avatar and username'
      : 'Plain - exact user webhook username and avatar',
    value: mode.value
  }));
}

module.exports = {
  MODES,
  normalizeDisplayMode,
  displayModeLabel,
  displayModeDescription,
  displayModeChoices,
  parseDisplayModeInput
};
