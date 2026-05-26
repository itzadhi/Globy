const mongoose = require('mongoose');

const xpSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, index: true },
    network: { type: String, lowercase: true, trim: true, index: true },
    messageId: { type: String, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: 'message' }
  },
  { timestamps: true }
);

xpSchema.index({ userId: 1, createdAt: -1 });
xpSchema.index({ messageId: 1, reason: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('XP', xpSchema);
