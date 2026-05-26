const { createCanvas } = require('canvas');
const SyncChannel = require('../models/Channel');
const { webhookCache } = require('../cache/runtimeCache');
const { config } = require('../config/env');
const emojis = require('../config/emojis');
const logger = require('../utils/logger');

const emojiAliases = {
  globe: ['globe', 'world', 'earth'],
  shield: ['shield', 'mod', 'moderation'],
  spark: ['spark', 'star', 'glow'],
  warn: ['warn', 'warning', 'alert'],
  xp: ['xp', 'bolt', 'level'],
  rank: ['rank', 'trophy', 'leaderboard'],
  link: ['link', 'chain', 'sync'],
  recover: ['recover', 'restore', 'refresh'],
  ping: ['ping', 'pong', 'status'],
  profile: ['profile', 'user', 'member']
};

function uniquePrefixCommandCount(client) {
  return new Set([...client.prefixCommands.values()].map((command) => command.name)).size;
}

async function preloadWebhooks() {
  const channels = await SyncChannel.find({
    active: true,
    webhookId: { $exists: true, $ne: null },
    webhookToken: { $exists: true, $ne: null }
  })
    .select('channelId webhookId webhookToken webhookName')
    .lean();

  for (const channel of channels) {
    webhookCache.set(`webhook:${channel.channelId}`, {
      webhookId: channel.webhookId,
      webhookToken: channel.webhookToken,
      webhookName: channel.webhookName
    });
  }

  return channels.length;
}

function preloadCanvas() {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = config.colors.primary;
  ctx.fillRect(0, 0, 32, 32);
  return true;
}

function emojiMarkup(emoji) {
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

function applyCustomEmoji(fetched) {
  if (!fetched?.size) return 0;

  let applied = 0;
  const available = [...fetched.values()].map((emoji) => ({
    emoji,
    name: emoji.name.toLowerCase()
  }));

  for (const [key, aliases] of Object.entries(emojiAliases)) {
    if (process.env[`EMOJI_${key.toUpperCase()}`]) continue;

    const found = available.find(({ name }) =>
      aliases.some((alias) => name === alias || name.includes(alias))
    );

    if (found) {
      emojis[key] = emojiMarkup(found.emoji);
      applied += 1;
    }
  }

  return applied;
}

async function preloadCustomEmoji(client) {
  const configured = Object.values(emojis).filter(Boolean).length;
  if (!config.emojiGuildId) return { configured, fetched: 0 };

  const guild = await client.guilds.fetch(config.emojiGuildId).catch(() => null);
  if (!guild) return { configured, fetched: 0 };

  const fetched = await guild.emojis.fetch().catch(() => null);
  const applied = applyCustomEmoji(fetched);
  return {
    configured,
    fetched: fetched?.size || guild.emojis.cache.size || 0,
    applied
  };
}

async function preloadRuntime(client) {
  const slashCommands = client.commands?.size || 0;
  const prefixAliases = client.prefixCommands?.size || 0;
  const prefixCommands = uniquePrefixCommandCount(client);

  const [webhooks, emojiState] = await Promise.all([
    preloadWebhooks(),
    preloadCustomEmoji(client)
  ]);

  preloadCanvas();

  client.preload = {
    slashCommands,
    prefixCommands,
    prefixAliases,
    cachedWebhooks: webhooks,
    customEmoji: emojiState,
    canvas: true,
    warmedAt: new Date()
  };

  logger.success(
    `Preloaded ${slashCommands} slash commands, ${prefixCommands} prefix commands (${prefixAliases} aliases), ${webhooks} webhooks, ${emojiState.fetched || emojiState.configured} emoji entries (${emojiState.applied || 0} applied), and Canvas`
  );

  return client.preload;
}

module.exports = {
  preloadRuntime
};
