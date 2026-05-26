const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    globalName: { type: String },
    avatar: { type: String },
    totalXp: { type: Number, default: 0, index: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0, index: true },
    reputation: { type: Number, default: 0, index: true },
    messageCount: { type: Number, default: 0, index: true },
    networks: [
      {
        name: { type: String, index: true },
        messageCount: { type: Number, default: 0 },
        xp: { type: Number, default: 0 }
      }
    ],
    lastXpAt: { type: Date },
    lastMessageAt: { type: Date }
  },
  { timestamps: true }
);

profileSchema.index({ totalXp: -1, messageCount: -1 });
profileSchema.index({ level: -1, totalXp: -1 });

module.exports = mongoose.model('Profile', profileSchema);
