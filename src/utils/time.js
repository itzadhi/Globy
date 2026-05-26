function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length || seconds) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function discordTimestamp(date, style = 'R') {
  const value = date instanceof Date ? date : new Date(date);
  return `<t:${Math.floor(value.getTime() / 1000)}:${style}>`;
}

module.exports = {
  formatDuration,
  discordTimestamp
};
