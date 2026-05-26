const MODES = {
  normal: {
    value: 'normal',
    label: 'Normal',
    description: 'Real user webhook: exact username, avatar, and plain message content.'
  },
  cv2: {
    value: 'cv2',
    label: 'CV2 Card',
    description: 'Bot-style card: Globy webhook with the user avatar, username, and message inside a premium card.'
  }
};

function normalizeDisplayMode(value, fallback = 'normal') {
  const mode = String(value || fallback || 'normal').toLowerCase();
  return MODES[mode] ? mode : 'normal';
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
      : 'Normal - exact user webhook username and avatar',
    value: mode.value
  }));
}

module.exports = {
  MODES,
  normalizeDisplayMode,
  displayModeLabel,
  displayModeDescription,
  displayModeChoices
};
