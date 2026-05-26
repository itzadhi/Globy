const SyncChannel = require('../models/Channel');
const Network = require('../models/Network');
const MessageLog = require('../models/MessageLog');
const { addMessageXp } = require('./profileService');
const { getActiveRestriction } = require('./blacklistService');
const { inspectMessage, warnAndMaybeDelete } = require('./moderationService');
const webhookService = require('./webhookService');
const queue = require('./queueService');
const { logBlockedMessage } = require('./loggingService');
const { upsertGuild, upsertUser } = require('./guildService');
const emojis = require('../config/emojis');
const { buildWebhookUsername, truncate, sanitizeMentions } = require('../utils/text');
const logger = require('../utils/logger');

function attachmentRecords(message) {
  return [...message.attachments.values()].map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    proxyUrl: attachment.proxyURL,
    contentType: attachment.contentType,
    size: attachment.size
  }));
}

function stickerRecords(message) {
  return [...message.stickers.values()].map((sticker) => ({
    id: sticker.id,
    name: sticker.name,
    url: sticker.url
  }));
}

function safeFileName(name) {
  return String(name || 'attachment')
    .replace(/[^\w.\-()[\] ]/g, '_')
    .slice(0, 80);
}

async function downloadAttachmentFile(attachment) {
  if (!attachment?.url) return null;
  if (attachment.size && attachment.size > 8 * 1024 * 1024) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(attachment.url, { signal: controller.signal });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null;

    return {
      attachment: buffer,
      name: safeFileName(attachment.name)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function filePayloads(messageOrLog) {
  const files = [];
  for (const attachment of (messageOrLog.attachments || []).slice(0, 5)) {
    const file = await downloadAttachmentFile(attachment);
    if (file) files.push(file);
  }

  return files;
}

function attachmentLines(log) {
  const attachments = log.attachments || [];
  if (!attachments.length) return [];

  return [
    `${emojis.link} Attachments:`,
    ...attachments.slice(0, 10).map((attachment) => {
      const name = sanitizeMentions(safeFileName(attachment.name));
      return attachment.url ? `- [${name}](${attachment.url})` : `- ${name}`;
    })
  ];
}

async function getReplyData(message) {
  if (!message.reference?.messageId) return null;

  const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
  if (!replied) {
    return {
      messageId: message.reference.messageId,
      contentPreview: 'Original message unavailable'
    };
  }

  return {
    messageId: replied.id,
    authorId: replied.author?.id,
    authorName: replied.member?.displayName || replied.author?.username || 'Unknown User',
    contentPreview: truncate(sanitizeMentions(replied.content || '[attachment]'), 120)
  };
}

function buildContentFromLog(log) {
  const lines = [];
  const pushBlock = (value) => {
    if (lines.length) lines.push('');
    lines.push(value);
  };

  if (log.reply?.messageId) {
    pushBlock(`> ↪ replying to **${sanitizeMentions(log.reply.authorName || 'someone')}**: ${truncate(log.reply.contentPreview || '', 100)}`);
  }

  if (log.sanitizedContent) {
    pushBlock(log.sanitizedContent);
  }

  if (log.stickers?.length) {
    pushBlock(log.stickers.map((sticker) => `${emojis.spark} Sticker: ${sanitizeMentions(sticker.name)}`).join('\n'));
  }

  const attachments = attachmentLines(log);
  if (attachments.length) {
    pushBlock(attachments.join('\n'));
  }

  if (!log.sanitizedContent && !log.attachments?.length && !log.stickers?.length) {
    pushBlock('*No text content*');
  }

  return truncate(lines.join('\n'), 1950);
}

async function buildPayloadFromLog(log) {
  return {
    username: buildWebhookUsername(
      { displayName: log.authorDisplayName || log.authorUsername },
      { username: log.authorUsername },
      ''
    ),
    avatarURL: log.authorAvatar,
    content: buildContentFromLog(log),
    files: await filePayloads(log)
  };
}

async function createMessageLog(message, sourceChannel, inspection, reply) {
  return MessageLog.create({
    originalMessageId: message.id,
    network: sourceChannel.network,
    sourceGuildId: message.guildId,
    sourceGuildName: message.guild.name,
    sourceChannelId: message.channelId,
    sourceChannelName: message.channel.name,
    authorId: message.author.id,
    authorUsername: message.author.username,
    authorDisplayName: message.member?.displayName || message.author.globalName || message.author.username,
    authorAvatar: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
    content: message.content || '',
    sanitizedContent: inspection.sanitizedContent,
    reply,
    attachments: attachmentRecords(message),
    stickers: stickerRecords(message)
  });
}

async function relayToTarget(client, targetChannelConfig, logRecord, payload, status = 'sent') {
  const existing = await MessageLog.exists({
    _id: logRecord._id,
    webhookMessages: {
      $elemMatch: {
        channelId: targetChannelConfig.channelId,
        status: { $in: ['sent', 'edited', 'recovered'] }
      }
    }
  });

  if (existing) return null;

  const discordChannel = await client.channels.fetch(targetChannelConfig.channelId).catch(() => null);
  if (!discordChannel?.isTextBased?.()) {
    await SyncChannel.updateOne({ channelId: targetChannelConfig.channelId }, { $set: { active: false } });
    return null;
  }

  try {
    const sent = await webhookService.sendMessage(targetChannelConfig, discordChannel, payload);
    await MessageLog.updateOne(
      { _id: logRecord._id },
      {
        $push: {
          webhookMessages: {
            guildId: targetChannelConfig.guildId,
            channelId: targetChannelConfig.channelId,
            webhookId: sent.webhookId || targetChannelConfig.webhookId,
            webhookMessageId: sent.id,
            status,
            sentAt: new Date()
          }
        }
      }
    );

    await SyncChannel.updateOne(
      { channelId: targetChannelConfig.channelId },
      {
        $inc: { 'stats.received': 1 },
        $set: { lastSyncAt: new Date(), failureCount: 0 }
      }
    );

    return sent;
  } catch (error) {
    await MessageLog.updateOne(
      { _id: logRecord._id },
      {
        $push: {
          webhookMessages: {
            guildId: targetChannelConfig.guildId,
            channelId: targetChannelConfig.channelId,
            webhookId: targetChannelConfig.webhookId,
            status: 'failed',
            error: truncate(error.message || 'Unknown webhook failure', 500),
            sentAt: new Date()
          }
        }
      }
    );
    throw error;
  }
}

async function handleMessageCreate(message) {
  if (!message.guild || message.author.bot || message.webhookId) return;

  const sourceChannel = await SyncChannel.findOne({
    guildId: message.guildId,
    channelId: message.channelId,
    active: true
  }).lean();

  if (!sourceChannel) return;

  await Promise.all([upsertGuild(message.guild), upsertUser(message.author)]);

  const restriction = await getActiveRestriction(message.author.id);
  if (restriction) {
    await logBlockedMessage(message, sourceChannel.network, [`global ${restriction.type}`], { restrictionId: restriction._id });
    return;
  }

  const inspection = await inspectMessage(message, sourceChannel.network);
  if (!inspection.allowed) {
    await logBlockedMessage(message, sourceChannel.network, inspection.reasons, {
      contentPreview: truncate(message.content || '', 250)
    });
    await warnAndMaybeDelete(message, inspection);
    return;
  }

  const alreadyLogged = await MessageLog.exists({ originalMessageId: message.id });
  if (alreadyLogged) return;

  await addMessageXp(message, sourceChannel.network);
  const reply = await getReplyData(message);
  const logRecord = await createMessageLog(message, sourceChannel, inspection, reply);
  const payload = await buildPayloadFromLog(logRecord.toObject());

  const targets = await SyncChannel.find({
    network: sourceChannel.network,
    active: true,
    channelId: { $ne: sourceChannel.channelId }
  }).lean();

  if (!targets.length) return;

  await Network.updateOne(
    { name: sourceChannel.network },
    {
      $inc: { messageCount: 1 },
      $setOnInsert: {
        name: sourceChannel.network,
        displayName: sourceChannel.network
      }
    },
    { upsert: true }
  );
  await SyncChannel.updateOne(
    { channelId: sourceChannel.channelId },
    {
      $inc: { 'stats.sent': 1 },
      $set: { lastSyncAt: new Date() }
    }
  );

  await Promise.allSettled(
    targets.map((target) =>
      queue.enqueue(`sync:${sourceChannel.network}:${target.channelId}`, () =>
        relayToTarget(message.client, target, logRecord, payload)
      )
    )
  );
}

async function handleMessageUpdate(oldMessage, newMessage) {
  const message = newMessage.partial ? await newMessage.fetch().catch(() => null) : newMessage;
  if (!message || !message.guild || message.author?.bot || message.webhookId) return;

  const sourceChannel = await SyncChannel.findOne({
    guildId: message.guildId,
    channelId: message.channelId,
    active: true
  }).lean();
  if (!sourceChannel) return;

  const logRecord = await MessageLog.findOne({ originalMessageId: message.id });
  if (!logRecord || logRecord.status === 'deleted') return;

  const inspection = await inspectMessage(message, sourceChannel.network, { countSpam: false });
  if (!inspection.allowed) {
    await logBlockedMessage(message, sourceChannel.network, inspection.reasons, {
      contentPreview: truncate(message.content || '', 250),
      edited: true
    });
    await deleteSyncedCopies(message.client, logRecord);
    logRecord.status = 'blocked';
    await logRecord.save();
    return;
  }

  logRecord.content = message.content || '';
  logRecord.sanitizedContent = inspection.sanitizedContent;
  logRecord.attachments = attachmentRecords(message);
  logRecord.stickers = stickerRecords(message);
  logRecord.status = 'edited';
  logRecord.editedAt = new Date();
  await logRecord.save();

  const payload = await buildPayloadFromLog(logRecord.toObject());

  await Promise.allSettled(
    logRecord.webhookMessages
      .filter((entry) => ['sent', 'edited', 'recovered'].includes(entry.status))
      .map((entry) =>
        queue.enqueue(`edit:${sourceChannel.network}:${entry.channelId}`, async () => {
          const target = await SyncChannel.findOne({ channelId: entry.channelId, active: true }).lean();
          if (!target) return;

          const discordChannel = await message.client.channels.fetch(entry.channelId).catch(() => null);
          if (!discordChannel?.isTextBased?.()) return;

          await webhookService.editMessage(target, discordChannel, entry.webhookMessageId, payload);
          await MessageLog.updateOne(
            { _id: logRecord._id, 'webhookMessages.webhookMessageId': entry.webhookMessageId },
            {
              $set: {
                'webhookMessages.$.status': 'edited',
                'webhookMessages.$.editedAt': new Date()
              }
            }
          );
        })
      )
  );
}

async function deleteSyncedCopies(client, logRecord) {
  await Promise.allSettled(
    logRecord.webhookMessages
      .filter((entry) => ['sent', 'edited', 'recovered'].includes(entry.status))
      .map((entry) =>
        queue.enqueue(`delete:${logRecord.network}:${entry.channelId}`, async () => {
          const target = await SyncChannel.findOne({ channelId: entry.channelId, active: true }).lean();
          if (!target) return;

          const discordChannel = await client.channels.fetch(entry.channelId).catch(() => null);
          if (!discordChannel?.isTextBased?.()) return;

          await webhookService.deleteMessage(target, discordChannel, entry.webhookMessageId);
          await MessageLog.updateOne(
            { _id: logRecord._id, 'webhookMessages.webhookMessageId': entry.webhookMessageId },
            {
              $set: {
                'webhookMessages.$.status': 'deleted',
                'webhookMessages.$.deletedAt': new Date()
              }
            }
          );
        })
      )
  );
}

async function handleMessageDelete(message) {
  if (!message?.id) return;

  const webhookCopy = await MessageLog.exists({ 'webhookMessages.webhookMessageId': message.id });
  if (webhookCopy) {
    await MessageLog.updateOne(
      { 'webhookMessages.webhookMessageId': message.id },
      {
        $set: {
          'webhookMessages.$.status': 'deleted',
          'webhookMessages.$.deletedAt': new Date()
        }
      }
    );
    return;
  }

  const logRecord = await MessageLog.findOne({ originalMessageId: message.id });
  if (!logRecord || logRecord.status === 'deleted') return;

  await deleteSyncedCopies(message.client, logRecord);
  await MessageLog.updateOne(
    { _id: logRecord._id },
    {
      $set: {
        status: 'deleted',
        deletedAt: new Date()
      }
    }
  );
}

module.exports = {
  buildPayloadFromLog,
  relayToTarget,
  handleMessageCreate,
  handleMessageUpdate,
  handleMessageDelete,
  deleteSyncedCopies
};
