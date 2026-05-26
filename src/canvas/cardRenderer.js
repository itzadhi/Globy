const { createCanvas, loadImage } = require('canvas');
const { calculateProgress } = require('../services/profileService');

const WIDTH = 900;
const HEIGHT = 360;

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#07111F');
  gradient.addColorStop(0.45, '#101827');
  gradient.addColorStop(1, '#081B24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let x = -height; x < width; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
}

async function loadRemoteImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return loadImage(buffer);
  } catch {
    return null;
  }
}

function drawCircleAvatar(ctx, image, x, y, size, label) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image) {
    ctx.drawImage(image, x, y, size, size);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#00E5FF');
    gradient.addColorStop(1, '#35FF95');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#07111F';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label || '?').slice(0, 2).toUpperCase(), x + size / 2, y + size / 2 + 2);
  }

  ctx.restore();
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawProgressBar(ctx, x, y, width, height, percent) {
  fillRoundRect(ctx, x, y, width, height, height / 2, 'rgba(255, 255, 255, 0.12)');
  const fillWidth = Math.max(height, Math.floor(width * (percent / 100)));
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, '#00E5FF');
  gradient.addColorStop(1, '#35FF95');
  fillRoundRect(ctx, x, y, fillWidth, height, height / 2, gradient);
}

function drawMetric(ctx, label, value, x, y) {
  fillRoundRect(ctx, x, y, 150, 74, 10, 'rgba(255, 255, 255, 0.08)');
  ctx.fillStyle = '#93A4B8';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 75, y + 25);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(String(value), x + 75, y + 56);
}

function fitText(ctx, text, x, y, maxWidth, font, fallback = 'Unknown') {
  const value = String(text || fallback);
  ctx.font = font;
  if (ctx.measureText(value).width <= maxWidth) {
    ctx.fillText(value, x, y);
    return;
  }

  let trimmed = value;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  ctx.fillText(`${trimmed}...`, x, y);
}

async function createProfileCard(user, profile, rank = null) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const progress = calculateProgress(profile.totalXp || 0);
  const avatar = await loadRemoteImage(profile.avatar || user.displayAvatarURL?.({ extension: 'png', size: 256 }));

  drawBackground(ctx, WIDTH, HEIGHT);
  fillRoundRect(ctx, 34, 34, WIDTH - 68, HEIGHT - 68, 18, 'rgba(3, 9, 18, 0.72)');

  drawCircleAvatar(ctx, avatar, 76, 84, 156, profile.username);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(profile.globalName || profile.username, 270, 112);

  ctx.fillStyle = '#93A4B8';
  ctx.font = '20px Arial';
  ctx.fillText(`@${profile.username}`, 272, 148);
  ctx.fillText('Globy CV2 Global Profile', 272, 182);

  drawMetric(ctx, 'Level', profile.level || 0, 272, 214);
  drawMetric(ctx, 'Rank', rank ? `#${rank}` : 'New', 442, 214);
  drawMetric(ctx, 'Rep', profile.reputation || 0, 612, 214);

  ctx.fillStyle = '#D8F7FF';
  ctx.font = '18px Arial';
  ctx.fillText(`${progress.xp} / ${progress.required} XP`, 272, 319);
  drawProgressBar(ctx, 272, 328, 540, 18, progress.percent);

  ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${profile.messageCount || 0} synced messages`, 812, 318);

  return canvas.toBuffer('image/png');
}

async function createRankCard(user, rankInfo) {
  return createProfileCard(user, rankInfo.profile, rankInfo.rank);
}

async function createLeaderboardCard(entries) {
  const rowHeight = 82;
  const height = 190 + Math.max(1, entries.length) * rowHeight;
  const canvas = createCanvas(1000, height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, 1000, height);
  fillRoundRect(ctx, 34, 34, 932, height - 68, 18, 'rgba(3, 9, 18, 0.78)');

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Global Leaderboard', 70, 92);

  ctx.fillStyle = '#93A4B8';
  ctx.font = '18px Arial';
  ctx.fillText('Top synchronized profiles across every connected server', 72, 124);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#35FF95';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`${entries.length} ranked users`, 930, 94);

  const avatars = await Promise.all(entries.map((entry) => loadRemoteImage(entry.avatar)));
  let y = 180;
  for (const entry of entries) {
    const avatar = avatars[entry.rank - 1];
    const isTopThree = entry.rank <= 3;
    const rowColor = entry.rank === 1
      ? 'rgba(53, 255, 149, 0.18)'
      : isTopThree
        ? 'rgba(0, 229, 255, 0.13)'
        : 'rgba(255,255,255,0.075)';

    fillRoundRect(ctx, 70, y - 44, 860, 66, 10, rowColor);

    ctx.fillStyle = entry.rank === 1 ? '#35FF95' : '#00E5FF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`#${entry.rank}`, 112, y - 5);

    drawCircleAvatar(ctx, avatar, 156, y - 33, 48, entry.username);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    fitText(ctx, entry.globalName || entry.username, 220, y - 12, 300, 'bold 23px Arial', entry.username);

    ctx.fillStyle = '#93A4B8';
    ctx.font = '17px Arial';
    ctx.fillText(`@${entry.username}`, 220, y + 13);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#D8F7FF';
    ctx.font = 'bold 19px Arial';
    ctx.fillText(`Level ${entry.level || 0}`, 640, y - 13);
    ctx.fillText(`${entry.totalXp || 0} XP`, 795, y - 13);
    ctx.fillText(`${entry.reputation || 0} rep`, 900, y - 13);

    drawProgressBar(ctx, 535, y + 3, 365, 12, entry.progress?.percent || 0);
    y += rowHeight;
  }

  return canvas.toBuffer('image/png');
}

async function createSetupBanner(client, channel) {
  const canvas = createCanvas(1000, 300);
  const ctx = canvas.getContext('2d');
  const botAvatar = await loadRemoteImage(client.user.displayAvatarURL({ extension: 'png', size: 256 }));

  drawBackground(ctx, 1000, 300);
  fillRoundRect(ctx, 34, 34, 932, 232, 18, 'rgba(3, 9, 18, 0.78)');
  drawCircleAvatar(ctx, botAvatar, 70, 74, 150, client.user.username);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#35FF95';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('SYNC READY', 260, 92);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px Arial';
  fitText(ctx, `#${channel.name}`, 260, 142, 580, 'bold 42px Arial', channel.name);

  ctx.fillStyle = '#D8F7FF';
  ctx.font = '22px Arial';
  ctx.fillText('Globy CV2 will start syncing messages from this channel now.', 262, 184);

  ctx.fillStyle = '#93A4B8';
  ctx.font = '18px Arial';
  ctx.fillText('Ready to send and receive global chat messages.', 262, 222);

  drawProgressBar(ctx, 260, 240, 620, 12, 100);
  return canvas.toBuffer('image/png');
}

module.exports = {
  createProfileCard,
  createRankCard,
  createLeaderboardCard,
  createSetupBanner
};
