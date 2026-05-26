const { Events } = require('discord.js');
const syncService = require('../services/syncService');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      await syncService.handleMessageCreate(message);
    } catch (error) {
      logger.error('messageCreate sync failure:', error);
    }
  }
};
