const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerId: { type: String },
    icon: { type: String },
    memberCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    networks: [{ type: String, index: true }],
    settings: {
      deleteBlockedMessages: { type: Boolean, default: true },
      warnBlockedUsers: { type: Boolean, default: true },
      moderationEnabled: { type: Boolean, default: true },
      xpEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Guild', guildSchema);
