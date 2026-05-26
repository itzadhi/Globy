const mongoose = require('mongoose');

const noPrefixUserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    active: { type: Boolean, default: true, index: true },
    reason: { type: String, default: 'No reason provided' },
    addedBy: { type: String, required: true, index: true },
    removedBy: { type: String },
    removedAt: { type: Date },
    removeReason: { type: String }
  },
  { timestamps: true }
);

noPrefixUserSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model('NoPrefixUser', noPrefixUserSchema);
