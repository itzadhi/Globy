const path = require('path');
const ms = require('ms');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function list(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function duration(value, fallback) {
  const parsed = ms(value || fallback);
  return typeof parsed === 'number' ? parsed : ms(fallback);
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  guildId: process.env.GUILD_ID,
  mongoUri: process.env.MONGO_URI,
  devIds: list(process.env.DEV_IDS || process.env.DEV_ID),
  emojiGuildId: process.env.EMOJI_GUILD_ID,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: number(process.env.PORT, 3000),
  commands: {
    prefix: process.env.PREFIX || ',',
    noPrefixEnabled: process.env.NO_PREFIX_ENABLED !== 'false'
  },
  colors: {
    primary: process.env.EMBED_COLOR || '#00E5FF',
    success: process.env.SUCCESS_COLOR || '#35FF95',
    error: process.env.ERROR_COLOR || '#FF4D6D',
    warning: '#FFD166',
    dark: '#07111F'
  },
  sync: {
    webhookName: process.env.WEBHOOK_NAME || 'Globy CV2 Sync',
    defaultNetwork: process.env.DEFAULT_NETWORK || 'global',
    queueDelayMs: duration(process.env.SYNC_QUEUE_DELAY, '650ms'),
    recoveryDelayMs: duration(process.env.RECOVERY_BATCH_DELAY, '1200ms'),
    maxRecoveryLimit: number(process.env.MAX_RECOVERY_LIMIT, 100)
  },
  moderation: {
    toxicWords: list(process.env.TOXIC_WORDS).map((word) => word.toLowerCase()),
    spamWindowMs: duration(process.env.MESSAGE_SPAM_WINDOW, '8s'),
    spamLimit: number(process.env.MESSAGE_SPAM_LIMIT, 5)
  },
  xp: {
    cooldownMs: duration(process.env.XP_COOLDOWN, '60s'),
    reputationCooldownMs: duration(process.env.REPUTATION_COOLDOWN, '12h')
  },
  links: {
    supportServerUrl: process.env.SUPPORT_SERVER_URL,
    websiteUrl: process.env.WEBSITE_URL
  }
};

function requireRuntimeConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('CLIENT_ID');
  if (!config.mongoUri) missing.push('MONGO_URI');

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function requireCommandDeployConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('CLIENT_ID');

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  config,
  list,
  duration,
  requireRuntimeConfig,
  requireCommandDeployConfig
};
