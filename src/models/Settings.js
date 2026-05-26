const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    scopeType: {
      type: String,
      enum: ['global', 'guild', 'network'],
      default: 'global',
      index: true
    },
    scopeId: { type: String, default: 'global', index: true },
    key: { type: String, required: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

settingsSchema.index({ scopeType: 1, scopeId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Settings', settingsSchema);
