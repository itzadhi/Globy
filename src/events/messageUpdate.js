const { Events } = require('discord.js');
const syncService = require('../services/syncService');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    try {
      await syncService.handleMessageUpdate(oldMessage, newMessage);
    } catch (error) {
      logger.error('messageUpdate sync failure:', error);
    }
  }
};
