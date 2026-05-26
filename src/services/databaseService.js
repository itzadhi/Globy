const mongoose = require('mongoose');
const { config } = require('../config/env');
const logger = require('../utils/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(config.mongoUri, {
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  });

  logger.success('Connected to MongoDB');
}

async function pingDatabase() {
  if (!mongoose.connection.db) {
    return { ok: false, latency: null, message: 'Not connected' };
  }

  const startedAt = Date.now();
  await mongoose.connection.db.admin().ping();
  return {
    ok: true,
    latency: Date.now() - startedAt,
    message: 'Connected'
  };
}

module.exports = {
  connectDatabase,
  pingDatabase
};
