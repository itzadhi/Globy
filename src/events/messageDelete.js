const { Events } = require('discord.js');
const syncService = require('../services/syncService');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      await syncService.handleMessageDelete(message);
    } catch (error) {
      logger.error('messageDelete sync failure:', error);
    }
  }
};
