function emoji(name, fallback) {
  return process.env[`EMOJI_${name}`] || fallback;
}

module.exports = {
  globe: emoji('GLOBE', '🌍'),
  shield: emoji('SHIELD', '🛡️'),
  spark: emoji('SPARK', '✨'),
  warn: emoji('WARN', '⚠️'),
  xp: emoji('XP', '⚡'),
  rank: emoji('RANK', '🏆'),
  link: emoji('LINK', '🔗'),
  recover: emoji('RECOVER', '♻️'),
  ping: emoji('PING', '🏓'),
  profile: emoji('PROFILE', '👤')
};
