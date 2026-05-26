const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema(
  {
    targetId: { type: String, required: true, index: true },
    targetTag: { type: String },
    type: { type: String, enum: ['ban', 'mute', 'warn'], required: true, index: true },
    scope: { type: String, enum: ['global', 'network', 'guild'], default: 'global', index: true },
    network: { type: String, lowercase: true, trim: true, index: true },
    guildId: { type: String, index: true },
    active: { type: Boolean, default: true, index: true },
    reason: { type: String, required: true },
    moderatorId: { type: String, required: true, index: true },
    expiresAt: { type: Date, index: true },
    liftedAt: { type: Date },
    liftedBy: { type: String },
    liftReason: { type: String }
  },
  { timestamps: true }
);

blacklistSchema.index({ targetId: 1, type: 1, active: 1 });
blacklistSchema.index({ scope: 1, network: 1, guildId: 1, active: 1 });

module.exports = mongoose.model('Blacklist', blacklistSchema);
