const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    url: String,
    proxyUrl: String,
    contentType: String,
    size: Number
  },
  { _id: false }
);

const webhookMessageSchema = new mongoose.Schema(
  {
    guildId: { type: String, index: true },
    channelId: { type: String, index: true },
    webhookId: String,
    webhookMessageId: { type: String, index: true },
    status: {
      type: String,
      enum: ['sent', 'edited', 'deleted', 'failed', 'recovered'],
      default: 'sent',
      index: true
    },
    error: String,
    sentAt: Date,
    editedAt: Date,
    deletedAt: Date
  },
  { _id: false }
);

const messageLogSchema = new mongoose.Schema(
  {
    originalMessageId: { type: String, required: true, unique: true, index: true },
    network: { type: String, required: true, lowercase: true, trim: true, index: true },
    sourceGuildId: { type: String, required: true, index: true },
    sourceGuildName: { type: String },
    sourceChannelId: { type: String, required: true, index: true },
    sourceChannelName: { type: String },
    authorId: { type: String, required: true, index: true },
    authorUsername: { type: String, required: true },
    authorDisplayName: { type: String },
    authorAvatar: { type: String },
    content: { type: String, default: '' },
    sanitizedContent: { type: String, default: '' },
    reply: {
      messageId: String,
      authorId: String,
      authorName: String,
      contentPreview: String
    },
    attachments: [attachmentSchema],
    stickers: [
      {
        id: String,
        name: String,
        url: String
      }
    ],
    webhookMessages: [webhookMessageSchema],
    status: {
      type: String,
      enum: ['active', 'edited', 'deleted', 'blocked'],
      default: 'active',
      index: true
    },
    deletedAt: Date,
    editedAt: Date
  },
  { timestamps: true }
);

messageLogSchema.index({ network: 1, createdAt: 1 });
messageLogSchema.index({ sourceGuildId: 1, sourceChannelId: 1, createdAt: -1 });

module.exports = mongoose.model('MessageLog', messageLogSchema);
