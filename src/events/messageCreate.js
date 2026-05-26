const { Events } = require('discord.js');
const syncService = require('../services/syncService');
const { handlePrefixCommand } = require('../services/prefixCommandService');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      const handled = await handlePrefixCommand(message, message.client);
      if (handled) return;

      await syncService.handleMessageCreate(message);
    } catch (error) {
      logger.error('messageCreate sync failure:', error);
    }
  }
};
