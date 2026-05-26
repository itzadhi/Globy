const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, index: true },
    network: { type: String, required: true, lowercase: true, trim: true, index: true },
    channelName: { type: String },
    guildName: { type: String },
    webhookId: { type: String },
    webhookToken: { type: String },
    webhookName: { type: String },
    displayMode: { type: String, enum: ['normal', 'cv2'], default: 'normal', index: true },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String },
    lastSyncAt: { type: Date },
    failureCount: { type: Number, default: 0 },
    stats: {
      sent: { type: Number, default: 0 },
      received: { type: Number, default: 0 },
      recovered: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

channelSchema.index({ guildId: 1, channelId: 1, active: 1 });
channelSchema.index({ network: 1, active: 1 });
channelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('Channel', channelSchema);
