const { WebhookClient } = require('discord.js');
const { config } = require('../config/env');
const { webhookCache } = require('../cache/runtimeCache');
const SyncChannel = require('../models/Channel');
const { logWebhookFailure } = require('./loggingService');
const { truncate } = require('../utils/text');

function cacheKey(channelId) {
  return `webhook:${channelId}`;
}

function makeClient(webhook) {
  return new WebhookClient({
    id: webhook.id || webhook.webhookId,
    token: webhook.token || webhook.webhookToken
  });
}

function isRecoverableWebhookError(error) {
  return [10015, 50027, 10008].includes(error?.code);
}

function safePayload(payload, options = {}) {
  const next = {
    ...payload,
    content: truncate(options.useFallbackContent ? payload.fallbackContent || payload.content || '' : payload.content || '', 1950),
    allowedMentions: {
      parse: [],
      users: [],
      roles: [],
      repliedUser: false
    }
  };

  if (options.dropFiles) {
    delete next.files;
  }

  if (options.useFallbackContent && payload.fallbackComponents) {
    next.components = payload.fallbackComponents;
  }

  delete next.fallbackContent;
  delete next.fallbackComponents;

  return next;
}

async function createWebhook(discordChannel) {
  return discordChannel.createWebhook({
    name: config.sync.webhookName,
    avatar: discordChannel.client.user.displayAvatarURL({ extension: 'png', size: 256 }),
    reason: 'Globy CV2 cross-server sync webhook'
  });
}

async function findReusableWebhook(syncChannel, discordChannel) {
  const webhooks = await discordChannel.fetchWebhooks();

  if (syncChannel.webhookId) {
    const existing = webhooks.get(syncChannel.webhookId);
    if (existing?.token) return existing;
  }

  return webhooks.find((webhook) => {
    return webhook.name === config.sync.webhookName && webhook.owner?.id === discordChannel.client.user.id && webhook.token;
  });
}

async function resolveWebhook(syncChannel, discordChannel) {
  const key = cacheKey(syncChannel.channelId);
  const cached = webhookCache.get(key);
  if (cached?.webhookToken) return makeClient(cached);

  let webhook = await findReusableWebhook(syncChannel, discordChannel).catch(() => null);
  if (!webhook) webhook = await createWebhook(discordChannel);

  const webhookData = {
    webhookId: webhook.id,
    webhookToken: webhook.token,
    webhookName: webhook.name
  };

  webhookCache.set(key, webhookData);
  await SyncChannel.updateOne({ channelId: syncChannel.channelId }, { $set: webhookData });

  return makeClient(webhookData);
}

async function recreateWebhook(syncChannel, discordChannel) {
  webhookCache.del(cacheKey(syncChannel.channelId));
  const webhook = await createWebhook(discordChannel);
  const webhookData = {
    webhookId: webhook.id,
    webhookToken: webhook.token,
    webhookName: webhook.name,
    failureCount: 0
  };

  webhookCache.set(cacheKey(syncChannel.channelId), webhookData);
  await SyncChannel.updateOne({ channelId: syncChannel.channelId }, { $set: webhookData });
  return makeClient(webhookData);
}

async function sendMessage(syncChannel, discordChannel, payload) {
  let client = await resolveWebhook(syncChannel, discordChannel);

  try {
    return await client.send(safePayload(payload));
  } catch (error) {
    await logWebhookFailure(syncChannel, error.message, { code: error.code });
    await SyncChannel.updateOne({ channelId: syncChannel.channelId }, { $inc: { failureCount: 1 } });

    if (payload.files?.length) {
      try {
        return await client.send(safePayload(payload, { dropFiles: true, useFallbackContent: true }));
      } catch (filelessError) {
        await logWebhookFailure(syncChannel, filelessError.message, {
          code: filelessError.code,
          fallback: 'fileless'
        });
      }
    }

    if (!isRecoverableWebhookError(error)) throw error;

    client = await recreateWebhook(syncChannel, discordChannel);
    return client.send(safePayload(payload));
  }
}

async function editMessage(syncChannel, discordChannel, webhookMessageId, payload) {
  let client = await resolveWebhook(syncChannel, discordChannel);

  try {
    return await client.editMessage(webhookMessageId, safePayload(payload, { dropFiles: true, useFallbackContent: true }));
  } catch (error) {
    await logWebhookFailure(syncChannel, error.message, { code: error.code, webhookMessageId });
    if (!isRecoverableWebhookError(error)) throw error;

    client = await recreateWebhook(syncChannel, discordChannel);
    throw Object.assign(new Error('Webhook message could not be edited after webhook recovery.'), {
      code: error.code
    });
  }
}

async function deleteMessage(syncChannel, discordChannel, webhookMessageId) {
  const client = await resolveWebhook(syncChannel, discordChannel);
  return client.deleteMessage(webhookMessageId).catch((error) => {
    if (error?.code === 10008) return null;
    throw error;
  });
}

module.exports = {
  resolveWebhook,
  recreateWebhook,
  sendMessage,
  editMessage,
  deleteMessage
};
