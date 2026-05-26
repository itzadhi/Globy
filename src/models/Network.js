const mongoose = require('mongoose');

const networkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    displayName: { type: String, required: true },
    createdBy: { type: String },
    channelCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    recoveredMessageCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    settings: {
      moderationEnabled: { type: Boolean, default: true },
      xpEnabled: { type: Boolean, default: true },
      allowAttachments: { type: Boolean, default: true },
      allowStickers: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

networkSchema.index({ active: 1, name: 1 });

module.exports = mongoose.model('Network', networkSchema);
