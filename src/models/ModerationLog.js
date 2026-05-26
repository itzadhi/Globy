const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema(
  {
    guildId: { type: String, index: true },
    channelId: { type: String, index: true },
    network: { type: String, lowercase: true, trim: true, index: true },
    userId: { type: String, index: true },
    moderatorId: { type: String, index: true },
    action: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

moderationLogSchema.index({ action: 1, createdAt: -1 });
moderationLogSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
